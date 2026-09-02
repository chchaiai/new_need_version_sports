package edu.bnbu.student.mvp.core.network.v1

import edu.bnbu.student.mvp.BuildConfig
import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.network.SharedHttpClient
import java.time.Instant
import okhttp3.OkHttpClient

internal enum class AccountDeletionChallengeMode {
    STUDENT_EMAIL_OTP,
    STAFF_PASSWORD
}

internal data class AccountDeletionChallenge(
    val challengeId: String,
    val mode: AccountDeletionChallengeMode,
    val expiresAt: Instant,
    val version: Long,
    val requestId: String
)

internal data class AccountDeletionConfirmation(
    val deletedAt: Instant,
    val allSessionsRevoked: Boolean,
    val newRegistrationRequired: Boolean,
    val requestId: String
)

private data class StudentAccountDeletionChallengeRequest(
    val expectedVersion: Long,
    val locale: String
)

private data class StudentAccountDeletionConfirmationRequest(
    val expectedVersion: Long,
    val verificationCode: String
)

private data class AccountDeletionChallengeTransport(
    val challengeId: String,
    val mode: String,
    val expiresAt: String,
    val version: Long
)

private data class AccountDeletionConfirmationTransport(
    val status: String,
    val deletedAt: String,
    val allSessionsRevoked: Boolean,
    val newRegistrationRequired: Boolean
)

/** Student account lifecycle mutations backed by the frozen `/api/v1/me` contract. */
internal class V1AccountDeletionGateway(
    private val authorizedClient: V1AuthorizedApiClient,
    private val mutationRegistry: MutationIntentRegistry = MutationIntentRegistry()
) {
    suspend fun createStudentChallenge(
        expectedVersion: Long,
        locale: String
    ): AccountDeletionChallenge {
        require(expectedVersion > 0L) { "expectedVersion must be positive" }
        require(locale in SupportedLocales) { "locale must be zh-CN or en" }
        val operationId = "requestCurrentUserAccountDeletionChallenge"
        val intent = mutationIntent(
            operationId = operationId,
            actionSlot = "account-deletion-challenge:version:$expectedVersion",
            canonicalInput = "expectedVersion=$expectedVersion\nlocale=$locale"
        )
        val response = authorizedClient.executeCancellable<AccountDeletionChallengeTransport>(
            V1ApiRequest(
                operationId = operationId,
                method = V1HttpMethod.POST,
                relativePath = "me/account-deletion-challenges",
                body = StudentAccountDeletionChallengeRequest(expectedVersion, locale)
            ).withMutationIntent(intent),
            AccountDeletionChallengeTransport::class.java
        )
        if (response.statusCode != 202) {
            throw V1ProtocolException(
                operationId,
                response.statusCode,
                response.meta.requestId,
                "unexpected success status"
            )
        }
        val data = response.data ?: throw V1ProtocolException(
            operationId,
            response.statusCode,
            response.meta.requestId,
            "challenge data is null"
        )
        val mode = runCatching { AccountDeletionChallengeMode.valueOf(data.mode) }
            .getOrElse {
                throw V1ProtocolException(
                    operationId,
                    response.statusCode,
                    response.meta.requestId,
                    "challenge mode is unsupported"
                )
            }
        if (mode != AccountDeletionChallengeMode.STUDENT_EMAIL_OTP) {
            throw V1ProtocolException(
                operationId,
                response.statusCode,
                response.meta.requestId,
                "student client received a staff challenge"
            )
        }
        val challenge = AccountDeletionChallenge(
            challengeId = data.challengeId.requireAccountDeletionId("challengeId"),
            mode = mode,
            expiresAt = data.expiresAt.requireAccountDeletionInstant("expiresAt"),
            version = data.version.requirePositiveVersion("version"),
            requestId = response.meta.requestId
        )
        mutationRegistry.complete(intent)
        return challenge
    }

    suspend fun confirmStudentDeletion(
        challenge: AccountDeletionChallenge,
        verificationCode: String
    ): AccountDeletionConfirmation {
        val challengeId = challenge.challengeId.requireAccountDeletionId("challengeId")
        require(challenge.mode == AccountDeletionChallengeMode.STUDENT_EMAIL_OTP) {
            "student deletion requires an email OTP challenge"
        }
        require(challenge.version > 0L) { "expectedVersion must be positive" }
        require(VerificationCode.matches(verificationCode)) {
            "verificationCode must contain 4..10 digits"
        }
        val operationId = "confirmCurrentUserAccountDeletion"
        val verificationFingerprint = IntentFingerprint.fromCanonicalInput(
            "accountDeletionVerificationCode",
            verificationCode
        ).stableValue
        val intent = mutationIntent(
            operationId = operationId,
            actionSlot = "account-deletion-confirm:$challengeId:version:${challenge.version}",
            canonicalInput = "challengeId=$challengeId\nexpectedVersion=${challenge.version}" +
                "\nverificationFingerprint=$verificationFingerprint"
        )
        val response = authorizedClient.executeCancellable<AccountDeletionConfirmationTransport>(
            V1ApiRequest(
                operationId = operationId,
                method = V1HttpMethod.POST,
                relativePath = "me/account-deletion-challenges/{challengeId}/confirm",
                pathSegments = listOf(
                    "me",
                    "account-deletion-challenges",
                    challengeId,
                    "confirm"
                ),
                body = StudentAccountDeletionConfirmationRequest(
                    expectedVersion = challenge.version,
                    verificationCode = verificationCode
                )
            ).withMutationIntent(intent),
            AccountDeletionConfirmationTransport::class.java
        )
        if (response.statusCode != 200) {
            throw V1ProtocolException(
                operationId,
                response.statusCode,
                response.meta.requestId,
                "unexpected success status"
            )
        }
        val data = response.data ?: throw V1ProtocolException(
            operationId,
            response.statusCode,
            response.meta.requestId,
            "deletion confirmation data is null"
        )
        if (
            data.status != "DELETED" ||
            !data.allSessionsRevoked ||
            !data.newRegistrationRequired
        ) {
            throw V1ProtocolException(
                operationId,
                response.statusCode,
                response.meta.requestId,
                "deletion confirmation did not prove terminal revocation"
            )
        }
        val confirmed = AccountDeletionConfirmation(
            deletedAt = data.deletedAt.requireAccountDeletionInstant("deletedAt"),
            allSessionsRevoked = data.allSessionsRevoked,
            newRegistrationRequired = data.newRegistrationRequired,
            requestId = response.meta.requestId
        )
        mutationRegistry.complete(intent)
        return confirmed
    }

    private fun mutationIntent(
        operationId: String,
        actionSlot: String,
        canonicalInput: String
    ): MutationIntent {
        val accountScope = authorizedClient.currentAccountScope()
            ?.takeIf(String::isNotBlank)
            ?: throw IllegalStateException("Authenticated account scope is unavailable.")
        return mutationRegistry.acquire(
            MutationIntentScope(accountScope, operationId, actionSlot),
            IntentFingerprint.fromCanonicalInput(operationId, canonicalInput)
        )
    }

    companion object {
        fun create(
            credentialStore: AuthSessionCredentialStore,
            baseUrl: String = BuildConfig.BNBU_API_BASE_URL,
            httpClient: OkHttpClient = SharedHttpClient.instance
        ): V1AccountDeletionGateway = V1AccountDeletionGateway(
            authorizedClient = V1AuthorizedApiClient.create(
                credentialStore = credentialStore,
                baseUrl = baseUrl,
                httpClient = httpClient
            )
        )

        private val SupportedLocales = setOf("zh-CN", "en")
        private val VerificationCode = Regex("^\\d{4,10}$")
    }
}

private fun String.requireAccountDeletionId(field: String): String = trim().also {
    require(it.length in 1..128 && it.none(Char::isWhitespace)) {
        "$field must be a bounded opaque identifier"
    }
}

private fun String.requireAccountDeletionInstant(field: String): Instant = runCatching {
    Instant.parse(this)
}.getOrElse {
    throw IllegalArgumentException("$field must be RFC3339", it)
}

private fun Long.requirePositiveVersion(field: String): Long = also {
    require(it > 0L) { "$field must be positive" }
}
