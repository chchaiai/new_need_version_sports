package edu.bnbu.student.mvp.core.local

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import java.time.Instant
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AuthSessionSecureStorageTest {
    private lateinit var context: Context
    private lateinit var store: AndroidAppLocalStore

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        store = AndroidAppLocalStore(context)
        store.clearAll()
    }

    @After
    fun tearDown() {
        store.clearAll()
    }

    @Test
    fun contractTokensRoundTripOnlyAsCiphertext() {
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

        assertEquals(true, store.saveAuthSession(session))
        val restored = store.loadAuthSession()!!
        assertEquals("access-secret", restored.accessToken)
        assertNull(restored.sessionId)
        assertEquals("enrollment-secret", restored.enrollmentId)
        assertEquals("user-1", restored.principalUserId)
        assertEquals("refresh-secret", restored.usableRefreshToken(Instant.parse("2026-08-03T00:00:00Z")))

        val ordinaryPrefs = context.getSharedPreferences(
            AndroidAppLocalStore.StoreName,
            Context.MODE_PRIVATE
        )
        assertFalse(ordinaryPrefs.contains(AndroidAppLocalStore.AuthSessionStorageKey))

        val securePrefs = context.getSharedPreferences(SecureStoreName, Context.MODE_PRIVATE)
        val serializedCiphertext = securePrefs.all.values.joinToString(separator = "|")
        assertFalse(serializedCiphertext.contains("access-secret"))
        assertFalse(serializedCiphertext.contains("refresh-secret"))
        assertFalse(serializedCiphertext.contains("enrollment-secret"))
    }

    @Test
    fun plaintextLegacyTokenMigratesOnceAndIsRemoved() {
        val ordinaryPrefs = context.getSharedPreferences(
            AndroidAppLocalStore.StoreName,
            Context.MODE_PRIVATE
        )
        ordinaryPrefs.edit()
            .putString(AndroidAppLocalStore.AuthTokenKey, "legacy-access")
            .commit()

        val migrated = store.loadAuthSession()!!

        assertEquals("legacy-access", migrated.accessToken)
        assertEquals(true, migrated.isLegacyAccessOnly)
        assertFalse(ordinaryPrefs.contains(AndroidAppLocalStore.AuthTokenKey))
    }

    @Test
    fun clearAuthRemovesBothTokens() {
        val session = AuthSessionCredentials.fromContract(
            sessionId = "session-secret",
            accessToken = "access-secret",
            refreshToken = "refresh-secret",
            tokenType = "Bearer",
            accessTokenExpiresAt = "2026-08-02T02:20:00Z",
            refreshTokenExpiresAt = "2026-08-09T02:05:00Z"
        )
        store.saveAuthSession(session)

        store.clearAuth()

        assertNull(store.loadAuthSession())
        assertNull(store.loadAuthToken())
    }

    private companion object {
        const val SecureStoreName = "bnbu.student.secure.v1"
    }
}
