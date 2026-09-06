package edu.bnbu.student.mvp.feature.courses

import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.Saver
import edu.bnbu.student.mvp.core.error.ClientErrorContext
import edu.bnbu.student.mvp.core.error.ClientErrorMapper
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import edu.bnbu.student.mvp.core.network.v1.V1ProtocolException
import edu.bnbu.student.mvp.core.network.v1.generated.CourseInvitePreview
import edu.bnbu.student.mvp.core.network.v1.generated.CurrentUserData
import java.time.OffsetDateTime

/** Course facts returned by the authoritative invitation preview. */
data class CourseJoinInfo(
    val id: String,
    val name: String,
    val teacher: String,
    val semester: String,
    val enrollmentOpen: Boolean = true,
    val invitationExpiresAt: OffsetDateTime? = null
)

internal val CourseJoinInfoStateSaver = Saver<MutableState<CourseJoinInfo?>, List<String>>(
    save = { state -> state.value?.toSavedList().orEmpty() },
    restore = { saved -> mutableStateOf(saved.toCourseJoinInfoOrNull()) }
)

internal fun CourseInvitePreview.toCourseJoinInfo(): CourseJoinInfo = CourseJoinInfo(
    id = classSectionId,
    name = courseName,
    teacher = teacherDisplayName,
    semester = semesterDisplayName,
    enrollmentOpen = enrollmentOpen,
    invitationExpiresAt = expiresAt
)

sealed interface CourseJoinCompletion {
    val alreadyJoined: Boolean

    data class Authoritative(
        val currentUser: CurrentUserData,
        override val alreadyJoined: Boolean = false
    ) : CourseJoinCompletion
}

/**
 * UI-only result vocabulary for PAGE-STU-035.
 *
 * These values never create membership facts. A formal result reaches this model only after
 * the server response (or a mapped transport failure) has been received.
 */
enum class CourseJoinResultKind {
    Success,
    AlreadyEnrolled,
    SemesterConflict,
    InvitationExpired,
    GracePeriodExhausted,
    InvitationRevoked,
    CourseClosed,
    Forbidden,
    TechnicalFailure,
    ResultUnknown
}

data class CourseJoinResultUiModel(
    val kind: CourseJoinResultKind,
    val course: CourseJoinInfo,
    val diagnosticId: String? = null
)

internal val CourseJoinResultUiModelStateSaver =
    Saver<MutableState<CourseJoinResultUiModel?>, List<String>>(
        save = { state ->
            state.value?.let { result ->
                listOf(result.kind.name) + result.course.toSavedList() + result.diagnosticId.orEmpty()
            }.orEmpty()
        },
        restore = { saved ->
            val result = if (saved.size == 8) {
                CourseJoinResultUiModel(
                    kind = runCatching { CourseJoinResultKind.valueOf(saved[0]) }
                        .getOrDefault(CourseJoinResultKind.ResultUnknown),
                    course = saved.subList(1, 7).toCourseJoinInfoOrNull()
                        ?: return@Saver mutableStateOf(null),
                    diagnosticId = saved[7].takeIf(String::isNotBlank)
                )
            } else {
                null
            }
            mutableStateOf(result)
        }
    )

private fun CourseJoinInfo.toSavedList(): List<String> = listOf(
    id,
    name,
    teacher,
    semester,
    enrollmentOpen.toString(),
    invitationExpiresAt?.toString().orEmpty()
)

private fun List<String>.toCourseJoinInfoOrNull(): CourseJoinInfo? {
    if (size != 6) return null
    return CourseJoinInfo(
        id = this[0],
        name = this[1],
        teacher = this[2],
        semester = this[3],
        enrollmentOpen = this[4].toBooleanStrictOrNull() ?: false,
        invitationExpiresAt = this[5].takeIf(String::isNotBlank)?.let { value ->
            runCatching { OffsetDateTime.parse(value) }.getOrNull()
        }
    )
}

internal fun successfulCourseJoinResult(
    course: CourseJoinInfo,
    alreadyJoined: Boolean
): CourseJoinResultUiModel = CourseJoinResultUiModel(
    kind = if (alreadyJoined) {
        CourseJoinResultKind.AlreadyEnrolled
    } else {
        CourseJoinResultKind.Success
    },
    course = course
)

/** Maps only stable server/client error codes; unknown responses remain explicitly unknown. */
internal fun courseJoinResultFromFailure(
    error: Throwable,
    course: CourseJoinInfo
): CourseJoinResultUiModel {
    val mapped = ClientErrorMapper.map(error, ClientErrorContext.JOIN)
    val status = when (error) {
        is V1HttpException -> error.statusCode
        is ApiHttpException -> error.statusCode
        else -> null
    }
    val kind = when (mapped.code) {
        "ENROLLMENT_ALREADY_ACTIVE" -> CourseJoinResultKind.AlreadyEnrolled
        "ENROLLMENT_SEMESTER_CONFLICT" -> CourseJoinResultKind.SemesterConflict
        "COURSE_INVITE_EXPIRED" -> CourseJoinResultKind.InvitationExpired
        "AUTH_JOIN_CAPABILITY_EXPIRED" -> CourseJoinResultKind.GracePeriodExhausted
        "COURSE_INVITE_REVOKED" -> CourseJoinResultKind.InvitationRevoked
        "COURSE_CLASS_SECTION_NOT_JOINABLE",
        "COURSE_SEMESTER_ARCHIVED" -> CourseJoinResultKind.CourseClosed
        "CONTACT_BINDING_REQUIRED",
        "USER_IDENTITY_CONFLICT" -> CourseJoinResultKind.Forbidden
        else -> when {
            status == 401 || status == 403 -> CourseJoinResultKind.Forbidden
            error is V1ProtocolException -> CourseJoinResultKind.ResultUnknown
            mapped.retryable -> CourseJoinResultKind.TechnicalFailure
            else -> CourseJoinResultKind.ResultUnknown
        }
    }
    return CourseJoinResultUiModel(
        kind = kind,
        course = course,
        diagnosticId = mapped.requestId
    )
}
