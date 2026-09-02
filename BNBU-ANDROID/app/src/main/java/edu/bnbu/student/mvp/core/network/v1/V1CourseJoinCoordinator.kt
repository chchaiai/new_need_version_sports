package edu.bnbu.student.mvp.core.network.v1

import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.network.v1.generated.CourseInvitePreview
import edu.bnbu.student.mvp.core.network.v1.generated.CurrentUserData
import edu.bnbu.student.mvp.core.network.v1.generated.Gender

data class V1CourseJoinIdentity(
    val fullName: String,
    val studentNumber: String,
    val gender: Gender,
    val gradeYear: Int
)

/**
 * Owns the public v1 course-join sequence and its idempotency scopes.
 *
 * The authenticated [CurrentUserData] returned from the atomic join response is
 * the only account-status fact passed to the application state. No legacy DTO
 * default may promote a newly created student to ACTIVE.
 */
class V1CourseJoinCoordinator(
    private val api: V1StudentApi,
    private val intents: MutationIntentRegistry = MutationIntentRegistry()
) {
    suspend fun preview(inviteToken: String): CourseInvitePreview =
        api.previewCourseInvite(inviteToken).data
            ?: throw IllegalStateException("COURSE_INVITE_PREVIEW_MISSING")

    suspend fun join(
        inviteToken: String,
        expectedClassSectionId: String,
        identity: V1CourseJoinIdentity
    ): CurrentUserData {
        val canonicalIdentity = buildString {
            append(identity.fullName)
            append('\n')
            append(identity.studentNumber)
            append('\n')
            append(identity.gender.value)
            append('\n')
            append(identity.gradeYear)
        }
        val capabilityIntent = intents.acquire(
            MutationIntentScope(
                accountScope = PRE_AUTH_ACCOUNT_SCOPE,
                operationId = "issueJoinCapability",
                actionSlot = expectedClassSectionId
            ),
            IntentFingerprint.fromCanonicalInput(
                "issueJoinCapability",
                "$expectedClassSectionId\n$canonicalIdentity"
            )
        )
        val capability = try {
            api.issueJoinCapability(
                inviteToken = inviteToken,
                fullName = identity.fullName,
                studentNumber = identity.studentNumber,
                gender = identity.gender,
                gradeYear = identity.gradeYear,
                intent = capabilityIntent
            ).also { intents.complete(capabilityIntent) }
        } catch (error: Throwable) {
            intents.abandon(capabilityIntent)
            throw error
        }
        require(capability.classSectionId == expectedClassSectionId) {
            "JOIN_CAPABILITY_CLASS_SECTION_MISMATCH"
        }

        val joinIntent = intents.acquire(
            MutationIntentScope(
                accountScope = PRE_AUTH_ACCOUNT_SCOPE,
                operationId = "joinClassSectionWithInvite",
                actionSlot = expectedClassSectionId
            ),
            IntentFingerprint.fromCanonicalInput(
                "joinClassSectionWithInvite",
                "$expectedClassSectionId\n$canonicalIdentity"
            )
        )
        return try {
            api.joinClassSection(
                inviteToken = inviteToken,
                capability = capability,
                intent = joinIntent
            ).currentUser.also { intents.complete(joinIntent) }
        } catch (error: Throwable) {
            intents.abandon(joinIntent)
            throw error
        }
    }

    companion object {
        private const val PRE_AUTH_ACCOUNT_SCOPE = "pre-auth-course-join"

        fun create(credentialStore: AuthSessionCredentialStore): V1CourseJoinCoordinator =
            V1CourseJoinCoordinator(V1StudentApi.create(credentialStore))
    }
}
