package edu.bnbu.student.mvp.core.network.v1

import com.google.gson.JsonParser
import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.local.AuthSessionCredentials
import edu.bnbu.student.mvp.testing.TestHttps
import java.time.Instant
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class V1AccountDeletionGatewayTest {
    private lateinit var server: MockWebServer
    private lateinit var store: AccountCredentialStore
    private lateinit var gateway: V1AccountDeletionGateway

    @Before
    fun setUp() {
        server = TestHttps.newServer()
        server.start()
        store = AccountCredentialStore(authSession())
        val authorized = V1AuthorizedApiClient.create(
            credentialStore = store,
            baseUrl = server.url("/api/v1").toString().trimEnd('/'),
            httpClient = TestHttps.clientBuilder()
                .retryOnConnectionFailure(false)
                .connectTimeout(2, TimeUnit.SECONDS)
                .readTimeout(2, TimeUnit.SECONDS)
                .writeTimeout(2, TimeUnit.SECONDS)
                .build(),
            clock = { FixedNow },
            requestIdProvider = { "req-client" },
            idempotencyKeyProvider = { IdempotencyKey.fromGenerated("auth-intent") }
        )
        gateway = V1AccountDeletionGateway(
            authorizedClient = authorized,
            mutationRegistry = MutationIntentRegistry { "account-deletion-intent" }
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun studentChallengeUsesVersionLocaleAndIdempotency() = runBlocking {
        server.enqueue(
            success(
                202,
                "req-challenge",
                """{
                    "challengeId":"challenge-1",
                    "mode":"STUDENT_EMAIL_OTP",
                    "expiresAt":"2026-08-07T12:10:00Z",
                    "version":9
                }""".trimIndent()
            )
        )

        val challenge = gateway.createStudentChallenge(expectedVersion = 7L, locale = "zh-CN")

        assertEquals("challenge-1", challenge.challengeId)
        assertEquals(AccountDeletionChallengeMode.STUDENT_EMAIL_OTP, challenge.mode)
        assertEquals(9L, challenge.version)
        assertEquals("req-challenge", challenge.requestId)
        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/me/account-deletion-challenges", request.path)
        assertEquals("account-deletion-intent", request.getHeader("Idempotency-Key"))
        val body = JsonParser.parseString(request.body.readUtf8()).asJsonObject
        assertEquals(setOf("expectedVersion", "locale"), body.keySet())
        assertEquals(7L, body["expectedVersion"].asLong)
        assertEquals("zh-CN", body["locale"].asString)
    }

    @Test
    fun confirmationUsesChallengeVersionAndExactOtpContract() = runBlocking {
        server.enqueue(
            success(
                200,
                "req-confirm",
                """{
                    "status":"DELETED",
                    "deletedAt":"2026-08-07T12:05:00Z",
                    "allSessionsRevoked":true,
                    "newRegistrationRequired":true
                }""".trimIndent()
            )
        )

        val result = gateway.confirmStudentDeletion(challenge(version = 9L), "123456")

        assertTrue(result.allSessionsRevoked)
        assertTrue(result.newRegistrationRequired)
        assertEquals("req-confirm", result.requestId)
        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals(
            "/api/v1/me/account-deletion-challenges/challenge-1/confirm",
            request.path
        )
        assertEquals("account-deletion-intent", request.getHeader("Idempotency-Key"))
        val body = JsonParser.parseString(request.body.readUtf8()).asJsonObject
        assertEquals(setOf("expectedVersion", "verificationCode"), body.keySet())
        assertEquals(9L, body["expectedVersion"].asLong)
        assertEquals("123456", body["verificationCode"].asString)
    }

    @Test
    fun incompleteDeletionProofFailsClosedAndKeepsLocalCredentials() {
        server.enqueue(
            success(
                200,
                "req-incomplete",
                """{
                    "status":"DELETED",
                    "deletedAt":"2026-08-07T12:05:00Z",
                    "allSessionsRevoked":false,
                    "newRegistrationRequired":true
                }""".trimIndent()
            )
        )

        assertThrows(V1ProtocolException::class.java) {
            runBlocking { gateway.confirmStudentDeletion(challenge(), "123456") }
        }
        assertNotNull(store.session)
    }

    @Test
    fun studentClientRejectsStaffPasswordChallenge() {
        server.enqueue(
            success(
                202,
                "req-staff-mode",
                """{
                    "challengeId":"challenge-1",
                    "mode":"STAFF_PASSWORD",
                    "expiresAt":"2026-08-07T12:10:00Z",
                    "version":9
                }""".trimIndent()
            )
        )

        assertThrows(V1ProtocolException::class.java) {
            runBlocking { gateway.createStudentChallenge(expectedVersion = 7L, locale = "en") }
        }
        assertNotNull(store.session)
    }

    private fun challenge(version: Long = 9L) = AccountDeletionChallenge(
        challengeId = "challenge-1",
        mode = AccountDeletionChallengeMode.STUDENT_EMAIL_OTP,
        expiresAt = Instant.parse("2026-08-07T12:10:00Z"),
        version = version,
        requestId = "req-challenge"
    )

    private fun authSession(): AuthSessionCredentials = AuthSessionCredentials.fromContract(
        sessionId = "auth-session-1",
        enrollmentId = "enrollment-1",
        accessToken = "access-token",
        refreshToken = "refresh-token",
        tokenType = "Bearer",
        accessTokenExpiresAt = "2026-08-07T13:00:00Z",
        refreshTokenExpiresAt = "2026-08-14T12:00:00Z",
        principalUserId = "user-1"
    )

    private fun success(status: Int, requestId: String, data: String): MockResponse =
        MockResponse()
            .setResponseCode(status)
            .setHeader("X-Request-ID", requestId)
            .setBody("""{"data":$data,"meta":{"requestId":"$requestId"}}""")

    private class AccountCredentialStore(
        var session: AuthSessionCredentials?
    ) : AuthSessionCredentialStore {
        override fun saveAuthSession(session: AuthSessionCredentials): Boolean {
            this.session = session
            return true
        }

        override fun loadAuthSession(): AuthSessionCredentials? = session

        override fun clearAuth() {
            session = null
        }
    }

    private companion object {
        val FixedNow: Instant = Instant.parse("2026-08-07T12:00:00Z")
    }
}
