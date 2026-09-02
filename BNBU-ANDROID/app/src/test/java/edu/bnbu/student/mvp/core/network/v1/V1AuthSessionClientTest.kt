package edu.bnbu.student.mvp.core.network.v1

import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.local.AuthSessionCredentials
import edu.bnbu.student.mvp.core.local.PendingRefreshIntent
import edu.bnbu.student.mvp.testing.TestHttps
import java.time.Instant
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class V1AuthSessionClientTest {
    private lateinit var server: MockWebServer

    @Before
    fun setUp() {
        server = TestHttps.newServer()
        server.start()
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun expiredAccessTokenRefreshesOnceAndRetriesOriginalRequestOnce() {
        server.enqueue(authError("AUTH_TOKEN_EXPIRED", "req-expired"))
        server.enqueue(authSuccess("req-refresh"))
        server.enqueue(success("req-me", """{"value":"ok"}"""))
        val store = FakeCredentialStore(oldSession())
        val client = client(store)

        val result = client.execute<Map<String, String>>(meRequest(), Map::class.java)

        assertEquals("ok", result.data?.get("value"))
        assertEquals("access-new", store.session?.accessToken)
        assertEquals("refresh-new", store.session?.refreshToken)
        assertEquals("enrollment-1", store.session?.enrollmentId)

        val first = server.takeRequest(1, TimeUnit.SECONDS)!!
        val refresh = server.takeRequest(1, TimeUnit.SECONDS)!!
        val retried = server.takeRequest(1, TimeUnit.SECONDS)!!
        assertEquals("Bearer access-old", first.getHeader("Authorization"))
        assertEquals("/api/v1/auth/refresh", refresh.path)
        assertEquals(null, refresh.getHeader("Authorization"))
        assertEquals("auth-intent", refresh.getHeader("Idempotency-Key"))
        assertTrue(refresh.body.readUtf8().contains("refresh-old"))
        assertEquals("Bearer access-new", retried.getHeader("Authorization"))
    }

    @Test
    fun cancellableRequestUsesTheSameSingleRefreshPolicy() = runBlocking {
        server.enqueue(authError("AUTH_TOKEN_EXPIRED", "req-expired-async"))
        server.enqueue(authSuccess("req-refresh-async"))
        server.enqueue(success("req-me-async", """{"value":"ok"}"""))
        val store = FakeCredentialStore(oldSession())
        val client = client(store)

        val result = client.executeCancellable<Map<String, String>>(
            meRequest(),
            Map::class.java
        )

        assertEquals("ok", result.data?.get("value"))
        assertEquals("access-new", store.session?.accessToken)
        assertEquals(3, server.requestCount)
    }

    @Test
    fun concurrentExpiredResponsesShareOneRefreshRotation() {
        val refreshCount = AtomicInteger()
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                return when {
                    request.path == "/api/v1/auth/refresh" -> {
                        refreshCount.incrementAndGet()
                        Thread.sleep(100)
                        authSuccess("req-refresh-concurrent")
                    }
                    request.getHeader("Authorization") == "Bearer access-old" ->
                        authError("AUTH_TOKEN_EXPIRED", "req-old-${server.requestCount}")
                    request.getHeader("Authorization") == "Bearer access-new" ->
                        success("req-new-${server.requestCount}", """{"value":"ok"}""")
                    else -> authError("AUTH_REQUIRED", "req-missing")
                }
            }
        }
        val store = FakeCredentialStore(oldSession())
        val client = client(store)
        val executor = Executors.newFixedThreadPool(2)

        try {
            val first = executor.submit<String> {
                client.execute<Map<String, String>>(meRequest(), Map::class.java).data?.get("value")
            }
            val second = executor.submit<String> {
                client.execute<Map<String, String>>(meRequest(), Map::class.java).data?.get("value")
            }

            assertEquals("ok", first.get(5, TimeUnit.SECONDS))
            assertEquals("ok", second.get(5, TimeUnit.SECONDS))
            assertEquals(1, refreshCount.get())
            assertEquals("access-new", store.session?.accessToken)
        } finally {
            executor.shutdownNow()
        }
    }

    @Test
    fun separateApiFacadesSharingOneStoreReuseTheSameRefreshRotation() {
        val refreshCount = AtomicInteger()
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                return when {
                    request.path == "/api/v1/auth/refresh" -> {
                        refreshCount.incrementAndGet()
                        Thread.sleep(100)
                        authSuccess("req-refresh-shared-store")
                    }
                    request.getHeader("Authorization") == "Bearer access-old" ->
                        authError("AUTH_TOKEN_EXPIRED", "req-old-shared-${server.requestCount}")
                    request.getHeader("Authorization") == "Bearer access-new" ->
                        success("req-new-shared-${server.requestCount}", """{"value":"ok"}""")
                    else -> authError("AUTH_REQUIRED", "req-missing-shared")
                }
            }
        }
        val store = FakeCredentialStore(oldSession())
        val firstClient = client(store)
        val secondClient = client(store)
        val executor = Executors.newFixedThreadPool(2)

        try {
            val first = executor.submit<String> {
                firstClient.execute<Map<String, String>>(meRequest(), Map::class.java)
                    .data?.get("value")
            }
            val second = executor.submit<String> {
                secondClient.execute<Map<String, String>>(meRequest(), Map::class.java)
                    .data?.get("value")
            }

            assertEquals("ok", first.get(5, TimeUnit.SECONDS))
            assertEquals("ok", second.get(5, TimeUnit.SECONDS))
            assertEquals(1, refreshCount.get())
            assertEquals("access-new", store.session?.accessToken)
        } finally {
            executor.shutdownNow()
        }
    }

    @Test
    fun invalidAccessTokenDoesNotRefreshAndClearsSession() {
        server.enqueue(authError("AUTH_TOKEN_INVALID", "req-invalid"))
        val store = FakeCredentialStore(oldSession())
        val client = client(store)

        val error = assertThrows(V1SessionInvalidatedException::class.java) {
            client.execute<Map<String, String>>(meRequest(), Map::class.java)
        }

        assertEquals("req-invalid", error.requestId)
        assertEquals(null, store.session)
        assertEquals(1, store.clearCount)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun disabledAccountClearsSessionWithoutAttemptingRefresh() {
        server.enqueue(authError("AUTH_ACCOUNT_DISABLED", "req-disabled", status = 403))
        val store = FakeCredentialStore(oldSession())
        val client = client(store)

        val error = assertThrows(V1SessionInvalidatedException::class.java) {
            client.execute<Map<String, String>>(meRequest(), Map::class.java)
        }

        assertEquals("req-disabled", error.requestId)
        assertEquals(null, store.session)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun refreshRejectionClearsSessionWithoutRetryLoop() {
        server.enqueue(authError("AUTH_TOKEN_EXPIRED", "req-expired"))
        server.enqueue(authError("AUTH_SESSION_REVOKED", "req-refresh-revoked"))
        val store = FakeCredentialStore(oldSession())
        val client = client(store)

        val error = assertThrows(V1SessionInvalidatedException::class.java) {
            client.execute<Map<String, String>>(meRequest(), Map::class.java)
        }

        assertEquals("req-refresh-revoked", error.requestId)
        assertEquals(null, store.session)
        assertEquals(null, store.pendingRefreshIntent)
        assertEquals(2, server.requestCount)
    }

    @Test
    fun transientRefreshFailureKeepsSessionAndReusesDurableIntentOnRetry() {
        server.enqueue(authError("AUTH_TOKEN_EXPIRED", "req-expired-first"))
        server.enqueue(authError("SYSTEM_SERVICE_UNAVAILABLE", "req-refresh-temporary", 503))
        server.enqueue(authError("AUTH_TOKEN_EXPIRED", "req-expired-second"))
        server.enqueue(authSuccess("req-refresh-replayed"))
        server.enqueue(success("req-me-replayed", """{"value":"ok"}"""))
        val store = FakeCredentialStore(oldSession())
        val keySequence = AtomicInteger()
        val keyProvider = {
            IdempotencyKey.fromGenerated("refresh-intent-${keySequence.incrementAndGet()}")
        }

        val firstError = assertThrows(V1HttpException::class.java) {
            client(store, keyProvider).execute<Map<String, String>>(meRequest(), Map::class.java)
        }

        assertEquals(503, firstError.statusCode)
        assertEquals("access-old", store.session?.accessToken)
        assertNotNull(store.pendingRefreshIntent)
        assertEquals(0, store.clearCount)

        val result = client(store, keyProvider)
            .execute<Map<String, String>>(meRequest(), Map::class.java)

        assertEquals("ok", result.data?.get("value"))
        assertEquals("access-new", store.session?.accessToken)
        assertEquals(null, store.pendingRefreshIntent)
        val requests = (1..5).map { server.takeRequest(1, TimeUnit.SECONDS)!! }
        val refreshRequests = requests.filter { it.path == "/api/v1/auth/refresh" }
        assertEquals(2, refreshRequests.size)
        assertEquals(
            refreshRequests[0].getHeader("Idempotency-Key"),
            refreshRequests[1].getHeader("Idempotency-Key")
        )
        assertEquals("refresh-intent-1", refreshRequests[0].getHeader("Idempotency-Key"))
        assertEquals(1, keySequence.get())
    }

    @Test
    fun secondUnauthorizedAfterRotationIsNotRefreshedAgain() {
        server.enqueue(authError("AUTH_TOKEN_EXPIRED", "req-expired"))
        server.enqueue(authSuccess("req-refresh"))
        server.enqueue(authError("AUTH_TOKEN_EXPIRED", "req-expired-again"))
        val store = FakeCredentialStore(oldSession())
        val client = client(store)

        val error = assertThrows(V1SessionInvalidatedException::class.java) {
            client.execute<Map<String, String>>(meRequest(), Map::class.java)
        }

        assertEquals("req-expired-again", error.requestId)
        assertEquals(null, store.session)
        assertEquals(3, server.requestCount)
    }

    @Test
    fun logoutSuccessRevokesServerThenClearsBothLocalTokens() {
        server.enqueue(success("req-logout", "null"))
        val store = FakeCredentialStore(activeSession())
        val client = client(store)

        val outcome = client.logoutSafely()

        assertTrue(outcome.serverRevoked)
        assertEquals("req-logout", outcome.requestId)
        assertEquals(null, store.session)
        val request = server.takeRequest(1, TimeUnit.SECONDS)
        assertNotNull(request)
        assertEquals("/api/v1/auth/logout", request!!.path)
        assertEquals("Bearer access-old", request.getHeader("Authorization"))
        assertEquals("auth-intent", request.getHeader("Idempotency-Key"))
        assertTrue(request.body.readUtf8().contains("refresh-old"))
    }

    @Test
    fun logoutNetworkOrServerFailureStillClearsLocalTokens() {
        server.enqueue(authError("SYSTEM_INTERNAL_ERROR", "req-logout-failed", status = 500))
        val store = FakeCredentialStore(activeSession())
        val client = client(store)

        val outcome = client.logoutSafely()

        assertFalse(outcome.serverRevoked)
        assertEquals("req-logout-failed", outcome.requestId)
        assertEquals(null, store.session)
        assertEquals(1, store.clearCount)
    }

    @Test
    fun logoutRefreshesLocallyExpiredAccessBeforeRemoteRevocation() {
        server.enqueue(authSuccess("req-refresh-for-logout"))
        server.enqueue(success("req-logout-after-refresh", "null"))
        val store = FakeCredentialStore(oldSession())
        val client = client(store)

        val outcome = client.logoutSafely()

        assertTrue(outcome.serverRevoked)
        assertEquals("req-logout-after-refresh", outcome.requestId)
        assertEquals(null, store.session)
        val refresh = server.takeRequest(1, TimeUnit.SECONDS)!!
        val logout = server.takeRequest(1, TimeUnit.SECONDS)!!
        assertEquals("/api/v1/auth/refresh", refresh.path)
        assertEquals(null, refresh.getHeader("Authorization"))
        assertEquals("/api/v1/auth/logout", logout.path)
        assertEquals("Bearer access-new", logout.getHeader("Authorization"))
        assertTrue(logout.body.readUtf8().contains("refresh-new"))
    }

    private fun client(
        store: FakeCredentialStore,
        keyProvider: () -> IdempotencyKey = {
            IdempotencyKey.fromGenerated("auth-intent")
        }
    ): V1AuthorizedApiClient =
        V1AuthorizedApiClient.create(
            credentialStore = store,
            baseUrl = server.url("/api/v1").toString().trimEnd('/'),
            httpClient = TestHttps.clientBuilder()
                .retryOnConnectionFailure(false)
                .connectTimeout(2, TimeUnit.SECONDS)
                .readTimeout(2, TimeUnit.SECONDS)
                .writeTimeout(2, TimeUnit.SECONDS)
                .build(),
            clock = { Instant.parse("2026-08-06T12:00:00Z") },
            requestIdProvider = { "req-client" },
            idempotencyKeyProvider = keyProvider
        )

    private fun meRequest(): V1ApiRequest =
        V1ApiRequest("getCurrentUser", V1HttpMethod.GET, "me")

    private fun oldSession(): AuthSessionCredentials =
        AuthSessionCredentials.fromContract(
            sessionId = "session-old",
            enrollmentId = "enrollment-1",
            accessToken = "access-old",
            refreshToken = "refresh-old",
            tokenType = "Bearer",
            accessTokenExpiresAt = "2026-08-06T11:59:00Z",
            refreshTokenExpiresAt = "2026-08-13T12:00:00Z"
        )

    private fun activeSession(): AuthSessionCredentials =
        AuthSessionCredentials.fromContract(
            sessionId = "session-old",
            enrollmentId = "enrollment-1",
            accessToken = "access-old",
            refreshToken = "refresh-old",
            tokenType = "Bearer",
            accessTokenExpiresAt = "2026-08-06T13:00:00Z",
            refreshTokenExpiresAt = "2026-08-13T12:00:00Z"
        )

    private fun authSuccess(requestId: String): MockResponse =
        success(
            requestId,
            """{
                "sessionId":"session-old",
                "enrollmentId":null,
                "accessToken":"access-new",
                "refreshToken":"refresh-new",
                "tokenType":"Bearer",
                "accessTokenExpiresAt":"2026-08-06T13:00:00Z",
                "refreshTokenExpiresAt":"2026-08-13T12:00:00Z",
                "user":{
                    "id":"user-1",
                    "organizationId":"org-1",
                    "role":"STUDENT",
                    "status":"ACTIVE",
                    "primaryEmailMasked":null,
                    "emailVerified":false,
                    "version":1
                }
            }""".trimIndent()
        )

    private fun success(requestId: String, data: String): MockResponse =
        MockResponse()
            .setResponseCode(200)
            .setHeader("X-Request-ID", requestId)
            .setBody("""{"data":$data,"meta":{"requestId":"$requestId"}}""")

    private fun authError(
        code: String,
        requestId: String,
        status: Int = 401
    ): MockResponse = MockResponse()
        .setResponseCode(status)
        .setHeader("X-Request-ID", requestId)
        .setBody(
            """{"code":"$code","message":"safe message","details":{},"requestId":"$requestId","timestamp":"2026-08-06T12:00:00Z"}"""
        )

    private class FakeCredentialStore(initial: AuthSessionCredentials?) :
        AuthSessionCredentialStore {
        @Volatile
        var session: AuthSessionCredentials? = initial

        @Volatile
        var clearCount: Int = 0

        @Volatile
        var pendingRefreshIntent: PendingRefreshIntent? = null

        override fun saveAuthSession(session: AuthSessionCredentials): Boolean {
            this.session = session
            return true
        }

        override fun loadAuthSession(): AuthSessionCredentials? = session

        override fun savePendingRefreshIntent(intent: PendingRefreshIntent): Boolean {
            pendingRefreshIntent = intent
            return true
        }

        override fun loadPendingRefreshIntent(): PendingRefreshIntent? = pendingRefreshIntent

        override fun clearPendingRefreshIntent() {
            pendingRefreshIntent = null
        }

        override fun clearAuth() {
            session = null
            pendingRefreshIntent = null
            clearCount += 1
        }
    }
}
