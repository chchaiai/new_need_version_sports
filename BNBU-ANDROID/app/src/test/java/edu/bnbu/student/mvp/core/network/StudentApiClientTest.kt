package edu.bnbu.student.mvp.core.network

import edu.bnbu.student.mvp.BuildConfig
import edu.bnbu.student.mvp.core.network.v1.IntentFingerprint
import edu.bnbu.student.mvp.core.network.v1.MutationIntentRegistry
import edu.bnbu.student.mvp.core.network.v1.MutationIntentScope
import edu.bnbu.student.mvp.core.network.v1.V1ApiRequest
import edu.bnbu.student.mvp.core.network.v1.V1ApiTransport
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import edu.bnbu.student.mvp.core.network.v1.V1HttpMethod
import edu.bnbu.student.mvp.core.network.v1.V1NetworkException
import edu.bnbu.student.mvp.core.network.v1.withMutationIntent
import edu.bnbu.student.mvp.testing.TestHttps
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.async
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.delay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class StudentApiClientTest {
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
    fun defaultBaseUrlComesFromBuildConfig() {
        val request = V1ApiTransport(requestIdProvider = { "req-default" }).buildRequest(
            V1ApiRequest("getCurrentUser", V1HttpMethod.GET, "me")
        )
        assertEquals(
            "${BuildConfig.BNBU_API_BASE_URL.trimEnd('/')}/me",
            request.url.toString()
        )
    }

    @Test
    fun rejectsAmbiguousOrCredentialedBaseUrls() {
        assertThrows(IllegalArgumentException::class.java) {
            V1ApiTransport(baseUrl = "https://api.example.test")
        }
        assertThrows(IllegalArgumentException::class.java) {
            V1ApiTransport(baseUrl = "https://api.example.test/api/v1?tenant=other")
        }
        assertThrows(IllegalArgumentException::class.java) {
            V1ApiTransport(baseUrl = "https://user:secret@api.example.test/api/v1")
        }
    }

    @Test
    fun requestAddsJsonAndBearerHeaders() {
        val transport = transport(accessToken = "token-123")
        val get = transport.buildRequest(
            V1ApiRequest("getCurrentUser", V1HttpMethod.GET, "me")
        )
        val post = transport.buildRequest(
            V1ApiRequest(
                "createFeedback",
                V1HttpMethod.POST,
                "feedback",
                body = mapOf("content" to "test")
            )
        )

        assertEquals("application/json", get.header("Accept"))
        assertEquals("Bearer token-123", get.header("Authorization"))
        assertEquals(null, get.header("Content-Type"))
        assertEquals("application", post.body?.contentType()?.type)
        assertEquals("json", post.body?.contentType()?.subtype)
        assertEquals(null, post.header("Idempotency-Key"))
        assertEquals("${server.url("/api/v1").toString().trimEnd('/')}/feedback", post.url.toString())
    }

    @Test
    fun mutationsGetOneStableIdempotencyKeyPerLogicalRequest() {
        var generatedKeys = 0
        val registry = MutationIntentRegistry(
            keyFactory = {
                generatedKeys += 1
                "request-key-$generatedKeys"
            }
        )
        val scope = MutationIntentScope("account-1", "createFeedback", "feedback-form")
        val fingerprint = IntentFingerprint.fromCanonicalInput("createFeedback", "content=test")
        val firstIntent = registry.acquire(scope, fingerprint)
        val repeatedIntent = registry.acquire(scope, fingerprint)
        val changedIntent = registry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput("createFeedback", "content=changed")
        )
        val mutation = V1ApiRequest(
            "createFeedback",
            V1HttpMethod.POST,
            "feedback",
            body = mapOf("content" to "test")
        )

        assertEquals("request-key-1", firstIntent.idempotencyKey.wireValue)
        assertEquals(firstIntent.idempotencyKey, repeatedIntent.idempotencyKey)
        assertEquals("request-key-2", changedIntent.idempotencyKey.wireValue)
        assertEquals(
            "request-key-1",
            mutation.withMutationIntent(firstIntent).headers["Idempotency-Key"]
        )
        assertEquals(2, generatedKeys)
    }

    @Test
    fun executeParsesEnvelopeAndClosesErrorResponsesForReuse() {
        server.enqueue(
            MockResponse()
                .setResponseCode(500)
                .setHeader("X-Request-ID", "req-failed")
                .setBody(
                    """{"code":"SYSTEM_INTERNAL_ERROR","message":"failed","details":{},"requestId":"req-failed","timestamp":"2026-08-11T00:00:00Z"}"""
                )
        )
        server.enqueue(
            MockResponse()
                .setHeader("X-Request-ID", "req-success")
                .setBody("""{"data":{"id":"student-remote","className":"Class 2"},"meta":{"requestId":"req-success"}}""")
        )
        val transport = transport()
        val request = V1ApiRequest("getCurrentUser", V1HttpMethod.GET, "me")

        assertThrows(V1HttpException::class.java) {
            transport.execute<Map<String, String>>(request, Map::class.java)
        }
        val profile = transport.execute<Map<String, String>>(request, Map::class.java)

        val first = server.takeRequest()
        val second = server.takeRequest()
        assertEquals("/api/v1/me", first.path)
        assertEquals("/api/v1/me", second.path)
        assertEquals(1, second.sequenceNumber)
        assertEquals("student-remote", profile.data?.get("id"))
        assertEquals("Class 2", profile.data?.get("className"))
    }

    @Test
    fun nonIdempotentWritesAreNotRetriedAfterConnectionLoss() {
        server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AFTER_REQUEST))
        server.enqueue(
            MockResponse().setBody(
                "{\"id\":\"record-2\",\"status\":\"待审核\",\"submittedAt\":\"2026-07-14T00:00:00Z\"}"
            )
        )
        val transport = transport(
            httpClient = TestHttps.clientBuilder(SharedHttpClient.instance).build()
        )
        val request = V1ApiRequest(
            "createExerciseRecordDraft",
            V1HttpMethod.POST,
            "exercise-records",
            body = mapOf("sessionId" to "session-1")
        )

        assertThrows(V1NetworkException::class.java) {
            transport.execute<Map<String, String>>(request, Map::class.java)
        }
        assertEquals(1, server.requestCount)
        assertFalse(SharedHttpClient.isRetryableHttpMethod("POST"))
        assertFalse(SharedHttpClient.isRetryableHttpMethod("PUT"))
        assertTrue(SharedHttpClient.isRetryableHttpMethod("GET"))
    }

    @Test
    fun cancellableExecutionCancelsTheUnderlyingOkHttpCall() = runBlocking {
        server.enqueue(
            MockResponse()
                .setSocketPolicy(SocketPolicy.NO_RESPONSE)
        )
        val httpClient = TestHttps.clientBuilder()
            .retryOnConnectionFailure(false)
            .build()
        val transport = transport(httpClient = httpClient)

        val requestJob = async(Dispatchers.IO) {
            transport.executeCancellable<Map<String, String>>(
                V1ApiRequest("getCurrentUser", V1HttpMethod.GET, "me"),
                Map::class.java
            )
        }
        assertNotNull(server.takeRequest(2, TimeUnit.SECONDS))
        requestJob.cancelAndJoin()

        repeat(20) {
            if (httpClient.dispatcher.runningCallsCount() == 0) return@repeat
            delay(25)
        }
        assertEquals(0, httpClient.dispatcher.runningCallsCount())
    }

    @Test
    fun privateObjectUploadReportsMonotonicActualRequestBodyProgress() {
        server.enqueue(MockResponse().setResponseCode(200).setHeader("ETag", "etag-1"))
        val source = ByteArray(128 * 1_024) { index -> (index % 251).toByte() }
        val events = mutableListOf<UploadProgress>()
        val body = ProgressRequestBody(
            source.toRequestBody("image/jpeg".toMediaType()),
            events::add
        )
        val request = Request.Builder()
            .url(server.url("/private-upload/object-1"))
            .put(body)
            .build()

        TestHttps.clientBuilder().retryOnConnectionFailure(false).build()
            .newCall(request).execute().use { response -> assertTrue(response.isSuccessful) }

        val recorded = server.takeRequest(2, TimeUnit.SECONDS)!!
        assertEquals("PUT", recorded.method)
        assertEquals("/private-upload/object-1", recorded.path)
        assertEquals(source.size.toLong(), recorded.bodySize)
        assertTrue(events.isNotEmpty())
        assertEquals(0L, events.first().bytesSent)
        assertEquals(100, events.last().percent)
        assertEquals(events.last().totalBytes, events.last().bytesSent)
        assertEquals(recorded.bodySize, events.last().totalBytes)
        assertTrue(events.zipWithNext().all { (left, right) ->
            left.bytesSent <= right.bytesSent && left.totalBytes == right.totalBytes
        })
    }

    private fun transport(
        accessToken: String? = null,
        httpClient: OkHttpClient = TestHttps.clientBuilder()
            .retryOnConnectionFailure(false)
            .build()
    ): V1ApiTransport {
        return V1ApiTransport(
            baseUrl = server.url("/api/v1").toString(),
            accessTokenProvider = { accessToken },
            httpClient = httpClient,
            requestIdProvider = { "req-client" }
        )
    }
}
