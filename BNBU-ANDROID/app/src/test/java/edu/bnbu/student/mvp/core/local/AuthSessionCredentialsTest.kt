package edu.bnbu.student.mvp.core.local

import java.time.Duration
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthSessionCredentialsTest {
    @Test
    fun contractSessionSeparatesAccessAndRefreshTokens() {
        val session = contractSession()

        assertEquals("access-secret", session.accessToken)
        assertEquals("refresh-secret", session.refreshToken)
        assertTrue(session.canRefresh)
        assertFalse(session.isLegacyAccessOnly)
    }

    @Test
    fun tokenValuesNeverAppearInStringRepresentation() {
        val rendered = contractSession().toString()

        assertFalse(rendered.contains("access-secret"))
        assertFalse(rendered.contains("refresh-secret"))
        assertFalse(rendered.contains("session-secret"))
        assertFalse(rendered.contains("enrollment-secret"))
        assertTrue(rendered.contains("<redacted>"))
    }

    @Test
    fun contractSessionAllowsNullSessionIdWhenPrincipalIsAvailable() {
        val session = AuthSessionCredentials.fromContract(
            sessionId = null,
            enrollmentId = "enrollment-secret",
            accessToken = "access-secret",
            refreshToken = "refresh-secret",
            tokenType = "Bearer",
            accessTokenExpiresAt = "2026-08-02T02:20:00Z",
            refreshTokenExpiresAt = "2026-08-09T02:05:00Z",
            principalUserId = "user-1"
        )

        assertNull(session.sessionId)
        assertEquals("enrollment-secret", session.enrollmentId)
        assertEquals("user-1", session.principalUserId)
    }

    @Test(expected = IllegalArgumentException::class)
    fun nullSessionIdWithoutPrincipalFailsClosed() {
        AuthSessionCredentials.fromContract(
            sessionId = null,
            enrollmentId = "enrollment-secret",
            accessToken = "access-secret",
            refreshToken = "refresh-secret",
            tokenType = "Bearer",
            accessTokenExpiresAt = "2026-08-02T02:20:00Z",
            refreshTokenExpiresAt = "2026-08-09T02:05:00Z"
        )
    }

    @Test
    fun accessTokenHonorsExpirySkew() {
        val session = contractSession()

        assertEquals(
            "access-secret",
            session.usableAccessToken(
                now = Instant.parse("2026-08-02T02:19:29Z"),
                expirySkew = Duration.ofSeconds(30)
            )
        )
        assertNull(
            session.usableAccessToken(
                now = Instant.parse("2026-08-02T02:19:30Z"),
                expirySkew = Duration.ofSeconds(30)
            )
        )
    }

    @Test
    fun refreshTokenIsUnavailableAtExpiry() {
        val session = contractSession()

        assertEquals(
            "refresh-secret",
            session.usableRefreshToken(Instant.parse("2026-08-09T02:04:59Z"))
        )
        assertNull(session.usableRefreshToken(Instant.parse("2026-08-09T02:05:00Z")))
    }

    @Test
    fun legacyTokenCannotPretendToSupportRefresh() {
        val session = AuthSessionCredentials.legacyAccessOnly("legacy-access")!!

        assertTrue(session.isLegacyAccessOnly)
        assertFalse(session.canRefresh)
        assertNull(session.refreshToken)
        assertEquals(
            "legacy-access",
            session.usableAccessToken(Instant.parse("2030-01-01T00:00:00Z"))
        )
    }

    @Test(expected = IllegalArgumentException::class)
    fun rejectsUnsupportedTokenType() {
        AuthSessionCredentials.fromContract(
            sessionId = "session-secret",
            accessToken = "access-secret",
            refreshToken = "refresh-secret",
            tokenType = "Basic",
            accessTokenExpiresAt = "2026-08-02T02:20:00Z",
            refreshTokenExpiresAt = "2026-08-09T02:05:00Z"
        )
    }

    @Test
    fun corruptStoredSessionFailsClosed() {
        assertNull(
            AuthSessionCredentials.fromStored(
                sessionId = "session-secret",
                enrollmentId = "enrollment-secret",
                principalUserId = "user-1",
                accessToken = "access-secret",
                refreshToken = null,
                accessTokenExpiresAt = "2026-08-02T02:20:00Z",
                refreshTokenExpiresAt = "2026-08-09T02:05:00Z",
                isLegacyAccessOnly = false
            )
        )
    }

    private fun contractSession(): AuthSessionCredentials =
        AuthSessionCredentials.fromContract(
            sessionId = "session-secret",
            enrollmentId = "enrollment-secret",
            accessToken = "access-secret",
            refreshToken = "refresh-secret",
            tokenType = "Bearer",
            accessTokenExpiresAt = "2026-08-02T02:20:00Z",
            refreshTokenExpiresAt = "2026-08-09T02:05:00Z"
        )
}
