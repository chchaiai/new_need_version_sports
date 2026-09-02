package edu.bnbu.student.mvp.core.network.v1

import edu.bnbu.student.mvp.core.network.SharedHttpClient
import edu.bnbu.student.mvp.testing.TestHttps
import java.io.IOException
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class V1ApiTransportTest {
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
    fun parsesSuccessEnvelopeAndUsesServerRequestId() {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("X-Request-ID", "req-server-1")
                .setBody("""{"data":{"value":"ok"},"meta":{"requestId":"req-server-1"}}""")
        )
        val transport = transport(requestId = "req-client-1")

        val result = transport.execute<Map<String, String>>(
            request = V1ApiRequest(
                operationId = "getHealth",
                method = V1HttpMethod.GET,
                relativePath = "health/live",
                query = mapOf("probe" to "android")
            ),
            responseType = Map::class.java
        )

        assertEquals("ok", result.data?.get("value"))
        assertEquals("req-server-1", result.meta.requestId)
        val recorded = server.takeRequest(1, TimeUnit.SECONDS)!!
        assertEquals("/api/v1/health/live?probe=android", recorded.path)
        assertEquals("req-client-1", recorded.getHeader("X-Request-ID"))
        assertEquals("application/json", recorded.getHeader("Accept"))
    }

    @Test
    fun parsesTypedErrorWithoutPuttingServerBodyInExceptionMessage() {
        server.enqueue(
            MockResponse()
                .setResponseCode(409)
                .setHeader("X-Request-ID", "req-conflict")
                .setBody(
                    """{"code":"CONFLICT_VERSION_MISMATCH","message":"sensitive fallback text","details":{"actualVersion":4},"requestId":"req-conflict","timestamp":"2026-08-06T12:00:00Z"}"""
                )
        )

        val error = assertThrows(V1HttpException::class.java) {
            transport().execute<Map<String, String>>(
                V1ApiRequest(
                    operationId = "updateRecord",
                    method = V1HttpMethod.PATCH,
                    relativePath = "exercise-records/record-1",
                    body = mapOf("expectedVersion" to 3)
                ),
                Map::class.java
            )
        }

        assertEquals(409, error.statusCode)
        assertEquals("CONFLICT_VERSION_MISMATCH", error.error.code.value)
        assertEquals("req-conflict", error.error.requestId)
        assertEquals("sensitive fallback text", error.error.serverMessage)
        assertFalse(error.message.orEmpty().contains("sensitive fallback text"))
        assertFalse(error.message.orEmpty().contains("actualVersion"))
    }

    @Test
    fun failsClosedWhenHeaderAndEnvelopeRequestIdsDiffer() {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("X-Request-ID", "req-header")
                .setBody("""{"data":{"value":"ok"},"meta":{"requestId":"req-body"}}""")
        )

        val error = assertThrows(V1ProtocolException::class.java) {
            transport().execute<Map<String, String>>(
                V1ApiRequest("getHealth", V1HttpMethod.GET, "health/live"),
                Map::class.java
            )
        }

        assertEquals("req-header", error.requestId)
        assertTrue(error.message.orEmpty().contains("requestId values differ"))
    }

    @Test
    fun rejectsSuccessEnvelopeWithoutRequiredMeta() {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("X-Request-ID", "req-missing-meta")
                .setBody("""{"data":{"value":"ok"}}""")
        )

        val error = assertThrows(V1ProtocolException::class.java) {
            transport().execute<Map<String, String>>(
                V1ApiRequest("getHealth", V1HttpMethod.GET, "health/live"),
                Map::class.java
            )
        }

        assertTrue(error.message.orEmpty().contains("exactly data and meta"))
    }

    @Test
    fun rejectsUnknownErrorCodeAndInvalidErrorDetailsShape() {
        server.enqueue(
            MockResponse()
                .setResponseCode(500)
                .setHeader("X-Request-ID", "req-unknown-code")
                .setBody(
                    """{"code":"UNKNOWN_ERROR","message":"safe","details":{},"requestId":"req-unknown-code","timestamp":"2026-08-06T12:00:00Z"}"""
                )
        )
        server.enqueue(
            MockResponse()
                .setResponseCode(500)
                .setHeader("X-Request-ID", "req-invalid-details")
                .setBody(
                    """{"code":"SYSTEM_INTERNAL_ERROR","message":"safe","details":[],"requestId":"req-invalid-details","timestamp":"2026-08-06T12:00:00Z"}"""
                )
        )

        val unknownCode = assertThrows(V1ProtocolException::class.java) {
            transport().execute<Map<String, String>>(
                V1ApiRequest("getHealth", V1HttpMethod.GET, "health/live"),
                Map::class.java
            )
        }
        val invalidDetails = assertThrows(V1ProtocolException::class.java) {
            transport().execute<Map<String, String>>(
                V1ApiRequest("getHealth", V1HttpMethod.GET, "health/live"),
                Map::class.java
            )
        }

        assertTrue(unknownCode.message.orEmpty().contains("not in the contract"))
        assertTrue(invalidDetails.message.orEmpty().contains("details fields"))
    }

    @Test
    fun rejectsMalformedPaginationMetadata() {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("X-Request-ID", "req-pagination")
                .setBody(
                    """{"data":[],"meta":{"requestId":"req-pagination","pagination":{"nextCursor":"next","hasMore":"true","limit":100}}}"""
                )
        )

        val error = assertThrows(V1ProtocolException::class.java) {
            transport().execute<List<Map<String, String>>>(
                V1ApiRequest("listFeedback", V1HttpMethod.GET, "feedback"),
                List::class.java
            )
        }

        assertTrue(error.message.orEmpty().contains("hasMore must be a boolean"))
    }

    @Test
    fun mutationIsNotRetriedAfterConnectionLoss() {
        server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AFTER_REQUEST))
        server.enqueue(
            MockResponse()
                .setHeader("X-Request-ID", "req-unexpected-second")
                .setBody("""{"data":{},"meta":{"requestId":"req-unexpected-second"}}""")
        )
        val transport = transport(
            httpClient = TestHttps.clientBuilder(SharedHttpClient.instance).build()
        )

        val error = assertThrows(V1NetworkException::class.java) {
            transport.execute<Map<String, String>>(
                V1ApiRequest(
                    operationId = "createRecord",
                    method = V1HttpMethod.POST,
                    relativePath = "exercise-records",
                    body = mapOf("expectedVersion" to 1)
                ),
                Map::class.java
            )
        }
        assertEquals("req-client", error.requestId)
        assertEquals(1, server.requestCount)
    }

    @Test
    fun readOnlyRequestHasBoundedTransportRetry() {
        server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AFTER_REQUEST))
        server.enqueue(
            MockResponse()
                .setHeader("X-Request-ID", "req-retried")
                .setBody("""{"data":{"value":"ok"},"meta":{"requestId":"req-retried"}}""")
        )

        val result = transport(
            httpClient = TestHttps.clientBuilder(SharedHttpClient.instance).build()
        )
            .execute<Map<String, String>>(
                V1ApiRequest("getHealth", V1HttpMethod.GET, "health/live"),
                Map::class.java
            )

        assertEquals("ok", result.data?.get("value"))
        assertEquals(2, server.requestCount)
    }

    @Test
    fun sharedClientUsesBoundedFoundationTimeouts() {
        assertEquals(10_000, SharedHttpClient.instance.connectTimeoutMillis)
        assertEquals(15_000, SharedHttpClient.instance.readTimeoutMillis)
        assertEquals(15_000, SharedHttpClient.instance.writeTimeoutMillis)
        assertFalse(SharedHttpClient.instance.retryOnConnectionFailure)
    }

    @Test
    fun supportsPatchAndKeepsAuthorizationOwnedByTokenProvider() {
        server.enqueue(
            MockResponse()
                .setHeader("X-Request-ID", "req-patch")
                .setBody("""{"data":{"version":2},"meta":{"requestId":"req-patch"}}""")
        )
        val transport = transport(accessToken = "access-token")

        transport.execute<Map<String, Number>>(
            V1ApiRequest(
                operationId = "updateRecord",
                method = V1HttpMethod.PATCH,
                relativePath = "exercise-records/record-1",
                body = mapOf("expectedVersion" to 1),
                headers = mapOf("Idempotency-Key" to "intent-1")
            ),
            Map::class.java
        )

        val recorded = server.takeRequest(1, TimeUnit.SECONDS)!!
        assertEquals("PATCH", recorded.method)
        assertEquals("Bearer access-token", recorded.getHeader("Authorization"))
        assertEquals("intent-1", recorded.getHeader("Idempotency-Key"))
        assertTrue(recorded.body.readUtf8().contains("expectedVersion"))
    }

    @Test
    fun rejectsUnsafePathsBodiesAndReservedHeadersBeforeNetwork() {
        assertThrows(IllegalArgumentException::class.java) {
            V1ApiRequest("unsafe", V1HttpMethod.GET, "https://example.test/api/v1/me")
        }
        assertThrows(IllegalArgumentException::class.java) {
            V1ApiRequest("unsafe", V1HttpMethod.GET, "../me")
        }
        assertThrows(IllegalArgumentException::class.java) {
            V1ApiRequest("unsafe", V1HttpMethod.GET, "me", body = emptyMap<String, String>())
        }
        assertThrows(IllegalArgumentException::class.java) {
            V1ApiRequest(
                "unsafe",
                V1HttpMethod.GET,
                "me",
                headers = mapOf("Authorization" to "Bearer caller-owned")
            )
        }
    }

    private fun transport(
        requestId: String = "req-client",
        accessToken: String? = null,
        httpClient: OkHttpClient = TestHttps.clientBuilder()
            .retryOnConnectionFailure(false)
            .connectTimeout(2, TimeUnit.SECONDS)
            .readTimeout(2, TimeUnit.SECONDS)
            .writeTimeout(2, TimeUnit.SECONDS)
            .build()
    ): V1ApiTransport = V1ApiTransport(
        baseUrl = server.url("/api/v1").toString().trimEnd('/'),
        httpClient = httpClient,
        accessTokenProvider = { accessToken },
        requestIdProvider = { requestId }
    )
}
