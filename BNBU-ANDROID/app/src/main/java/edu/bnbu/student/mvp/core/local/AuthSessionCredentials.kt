package edu.bnbu.student.mvp.core.local

import java.time.Duration
import java.time.Instant
import java.time.OffsetDateTime

interface AuthSessionCredentialStore {
    fun saveAuthSession(session: AuthSessionCredentials): Boolean
    fun loadAuthSession(): AuthSessionCredentials?
    fun savePendingRefreshIntent(intent: PendingRefreshIntent): Boolean = true
    fun loadPendingRefreshIntent(): PendingRefreshIntent? = null
    fun clearPendingRefreshIntent() = Unit
    fun clearAuth()
}

/**
 * Durable identity for one in-flight refresh-token rotation.
 *
 * Only a SHA-256 fingerprint of the refresh token is stored. The raw token
 * remains exclusively inside [AuthSessionCredentials].
 */
data class PendingRefreshIntent(
    val sessionId: String,
    val refreshTokenFingerprint: String,
    val idempotencyKey: String
) {
    init {
        require(sessionId.isNotBlank()) { "Pending refresh sessionId must not be blank" }
        require(refreshTokenFingerprint.matches(Sha256Pattern)) {
            "Pending refresh token fingerprint must be SHA-256"
        }
        require(idempotencyKey.length in 1..128 && idempotencyKey.all { it.code in 0x21..0x7e }) {
            "Pending refresh Idempotency-Key is invalid"
        }
    }

    private companion object {
        val Sha256Pattern = Regex("^[a-f0-9]{64}$")
    }
}

/**
 * Access/refresh credentials issued by the unified backend.
 *
 * Token values remain intentionally absent from [toString]. The refresh token
 * may be absent only for a one-time migration from the legacy single-token
 * Android session; newly issued contract sessions always contain both tokens.
 */
class AuthSessionCredentials private constructor(
    val sessionId: String?,
    val enrollmentId: String?,
    val principalUserId: String?,
    val accessToken: String,
    val refreshToken: String?,
    val accessTokenExpiresAt: Instant?,
    val refreshTokenExpiresAt: Instant?,
    val isLegacyAccessOnly: Boolean
) {
    val canRefresh: Boolean
        get() = !refreshToken.isNullOrEmpty() && refreshTokenExpiresAt != null

    fun usableAccessToken(
        now: Instant,
        expirySkew: Duration = Duration.ofSeconds(30)
    ): String? {
        require(!expirySkew.isNegative) { "expirySkew must not be negative" }
        val expiresAt = accessTokenExpiresAt ?: return accessToken
        return accessToken.takeIf { now.plus(expirySkew).isBefore(expiresAt) }
    }

    fun usableRefreshToken(now: Instant): String? {
        val token = refreshToken ?: return null
        val expiresAt = refreshTokenExpiresAt ?: return null
        return token.takeIf { now.isBefore(expiresAt) }
    }

    /**
     * Keeps the server-issued session intact while filling the optional course
     * context from a contract response that owns the canonical Enrollment.
     */
    fun withEnrollmentIdIfMissing(fallbackEnrollmentId: String?): AuthSessionCredentials {
        val normalizedFallback = fallbackEnrollmentId?.trim()?.takeIf(String::isNotEmpty)
        if (enrollmentId != null || normalizedFallback == null) return this
        return AuthSessionCredentials(
            sessionId = sessionId,
            enrollmentId = normalizedFallback,
            principalUserId = principalUserId,
            accessToken = accessToken,
            refreshToken = refreshToken,
            accessTokenExpiresAt = accessTokenExpiresAt,
            refreshTokenExpiresAt = refreshTokenExpiresAt,
            isLegacyAccessOnly = isLegacyAccessOnly
        )
    }

    override fun toString(): String =
        "AuthSessionCredentials(sessionId=<redacted>, enrollmentId=<redacted>, " +
            "accessToken=<redacted>, " +
            "principalUserId=<redacted>, refreshToken=<redacted>, " +
            "accessTokenExpiresAt=$accessTokenExpiresAt, " +
            "refreshTokenExpiresAt=$refreshTokenExpiresAt, isLegacyAccessOnly=$isLegacyAccessOnly)"

    companion object {
        fun fromContract(
            sessionId: String?,
            accessToken: String,
            refreshToken: String,
            tokenType: String,
            accessTokenExpiresAt: String,
            refreshTokenExpiresAt: String,
            principalUserId: String? = null,
            enrollmentId: String? = null
        ): AuthSessionCredentials {
            require(sessionId == null || sessionId.isNotBlank()) { "sessionId must not be blank" }
            require(enrollmentId == null || enrollmentId.isNotBlank()) {
                "enrollmentId must not be blank"
            }
            require(sessionId != null || !principalUserId.isNullOrBlank()) {
                "principalUserId is required when sessionId is null"
            }
            require(accessToken.isNotBlank()) { "accessToken must not be blank" }
            require(refreshToken.isNotBlank()) { "refreshToken must not be blank" }
            require(tokenType.equals("Bearer", ignoreCase = true)) {
                "Unsupported token type"
            }
            val accessExpiry = parseContractDateTime(accessTokenExpiresAt)
            val refreshExpiry = parseContractDateTime(refreshTokenExpiresAt)
            return AuthSessionCredentials(
                sessionId = sessionId,
                enrollmentId = enrollmentId,
                principalUserId = principalUserId?.takeIf(String::isNotBlank),
                accessToken = accessToken,
                refreshToken = refreshToken,
                accessTokenExpiresAt = accessExpiry,
                refreshTokenExpiresAt = refreshExpiry,
                isLegacyAccessOnly = false
            )
        }

        internal fun fromStored(
            sessionId: String?,
            enrollmentId: String?,
            principalUserId: String?,
            accessToken: String,
            refreshToken: String?,
            accessTokenExpiresAt: String?,
            refreshTokenExpiresAt: String?,
            isLegacyAccessOnly: Boolean
        ): AuthSessionCredentials? {
            if (accessToken.isBlank()) return null
            if (isLegacyAccessOnly) return legacyAccessOnly(accessToken)
            if (
                (sessionId.isNullOrBlank() && principalUserId.isNullOrBlank()) ||
                refreshToken.isNullOrBlank() ||
                accessTokenExpiresAt.isNullOrBlank() ||
                refreshTokenExpiresAt.isNullOrBlank()
            ) {
                return null
            }
            return runCatching {
                fromContract(
                    sessionId = sessionId,
                    enrollmentId = enrollmentId,
                    accessToken = accessToken,
                    refreshToken = refreshToken,
                    tokenType = "Bearer",
                    accessTokenExpiresAt = accessTokenExpiresAt,
                    refreshTokenExpiresAt = refreshTokenExpiresAt,
                    principalUserId = principalUserId
                )
            }.getOrNull()
        }

        internal fun legacyAccessOnly(accessToken: String): AuthSessionCredentials? {
            if (accessToken.isBlank()) return null
            return AuthSessionCredentials(
                sessionId = null,
                enrollmentId = null,
                principalUserId = null,
                accessToken = accessToken,
                refreshToken = null,
                accessTokenExpiresAt = null,
                refreshTokenExpiresAt = null,
                isLegacyAccessOnly = true
            )
        }

        private fun parseContractDateTime(value: String): Instant =
            OffsetDateTime.parse(value).toInstant()
    }
}
