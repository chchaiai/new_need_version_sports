package edu.bnbu.student.mvp.core.network.v1

import com.google.gson.JsonParser
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaPolicy
import edu.bnbu.student.mvp.core.exercise.BindExerciseMediaCommand
import edu.bnbu.student.mvp.core.exercise.ConfirmExerciseMediaUploadCommand
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaServerStatus
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadMethod
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaVersionConflictException
import edu.bnbu.student.mvp.core.exercise.InitiateExerciseMediaUploadCommand
import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.local.AuthSessionCredentials
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.testing.TestHttps
import java.time.Instant
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class V1ExerciseMediaUploadGatewayTest {
    private lateinit var server: MockWebServer
    private lateinit var client: V1AuthorizedApiClient
    private lateinit var gateway: V1ExerciseMediaUploadGateway

    @Before
    fun setUp() {
        server = TestHttps.newServer()
        server.start()
        val store = MediaCredentialStore(authSession())
        client = V1AuthorizedApiClient.create(
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
        gateway = V1ExerciseMediaUploadGateway(
            authorizedClient = client,
            clock = { FixedNow },
            mutationRegistry = MutationIntentRegistry { "media-intent" }
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun imageInitiationUsesExercisePurposeAndCameraWithoutEnrollmentFields() = runBlocking {
        server.enqueue(uploadSessionResponse())

        val result = gateway.initiateUpload(imageCommand())

        assertEquals("upload-1", result.uploadSessionId)
        assertEquals("media-1", result.mediaId)
        assertEquals(ExerciseMediaUploadMethod.PUT, result.uploadMethod)
        assertEquals("image/jpeg", result.requiredHeaders["Content-Type"])
        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/media-uploads", request.path)
        assertEquals("media-intent", request.getHeader("Idempotency-Key"))
        val body = JsonParser.parseString(request.body.readUtf8()).asJsonObject
        assertEquals("session-1", body["sessionId"].asString)
        assertEquals("EXERCISE_RECORD", body["businessPurpose"].asString)
        assertEquals("IMAGE", body["mediaType"].asString)
        assertEquals("image/jpeg", body["mimeType"].asString)
        assertEquals(1024L, body["fileSizeBytes"].asLong)
        assertEquals("IN_APP_CAMERA", body["captureSource"].asString)
        assertFalse(body.has("enrollmentId"))
        assertFalse(body.has("durationSeconds"))
        assertFalse(body.has("declaredContentSha256"))
    }

    @Test
    fun videoInitiationSendsIntegerDurationAndNormalizedOptionalHash() = runBlocking {
        server.enqueue(uploadSessionResponse())
        val uppercaseHash = "AB".repeat(32)

        gateway.initiateUpload(
            InitiateExerciseMediaUploadCommand(
                uploadIntentId = "draft-video-1",
                sessionId = "session-1",
                mediaType = ProofMediaType.Video,
                mimeType = " VIDEO/MP4 ",
                fileSizeBytes = 250L * 1_024L * 1_024L,
                durationSeconds = 15L,
                declaredContentSha256 = uppercaseHash
            )
        )

        val body = JsonParser.parseString(server.takeRequest().body.readUtf8()).asJsonObject
        assertEquals("VIDEO", body["mediaType"].asString)
        assertEquals("video/mp4", body["mimeType"].asString)
        assertEquals(15L, body["durationSeconds"].asLong)
        assertEquals(uppercaseHash.lowercase(), body["declaredContentSha256"].asString)
    }

    @Test
    fun invalidMediaFactsAreRejectedBeforeAnyNetworkRequest() {
        assertThrows(IllegalArgumentException::class.java) {
            imageCommand().copy(mimeType = "video/mp4")
        }
        assertThrows(IllegalArgumentException::class.java) {
            imageCommand().copy(fileSizeBytes = ExerciseMediaPolicy.MaxImageBytes + 1L)
        }
        assertThrows(IllegalArgumentException::class.java) {
            InitiateExerciseMediaUploadCommand(
                uploadIntentId = "draft-video-1",
                sessionId = "session-1",
                mediaType = ProofMediaType.Video,
                mimeType = "video/mp4",
                fileSizeBytes = 1024L,
                durationSeconds = null
            )
        }
        assertEquals(0, server.requestCount)
    }

    @Test
    fun explicitRetryOfTheSameUploadIntentReusesItsIdempotencyKey() = runBlocking {
        server.enqueue(errorResponse(503, "SYSTEM_SERVICE_UNAVAILABLE", "req-failed"))
        server.enqueue(uploadSessionResponse())
        val command = imageCommand()

        runCatching { gateway.initiateUpload(command) }
        val result = gateway.initiateUpload(command)

        assertEquals("media-1", result.mediaId)
        val first = server.takeRequest()
        val second = server.takeRequest()
        assertEquals(first.getHeader("Idempotency-Key"), second.getHeader("Idempotency-Key"))
    }

    @Test
    fun downstreamRetryAfterSuccessfulInitiationReplaysTheSameUploadIntent() = runBlocking {
        server.enqueue(uploadSessionResponse())
        server.enqueue(uploadSessionResponse())
        val command = imageCommand()

        gateway.initiateUpload(command)
        gateway.initiateUpload(command)

        val first = server.takeRequest()
        val second = server.takeRequest()
        assertEquals(first.getHeader("Idempotency-Key"), second.getHeader("Idempotency-Key"))
    }

    @Test
    fun expiredSuccessfulInitiationIsAbandonedBeforeTheNextRetry() = runBlocking {
        var generated = 0
        val expiringGateway = V1ExerciseMediaUploadGateway(
            authorizedClient = client,
            clock = { FixedNow },
            mutationRegistry = MutationIntentRegistry { "media-expiry-${++generated}" }
        )
        server.enqueue(uploadSessionResponse(expiresAt = "2026-08-07T12:00:00Z"))
        server.enqueue(uploadSessionResponse())

        assertTrue(runCatching { expiringGateway.initiateUpload(imageCommand()) }.isFailure)
        assertEquals("media-1", expiringGateway.initiateUpload(imageCommand()).mediaId)

        val expired = server.takeRequest()
        val refreshed = server.takeRequest()
        assertNotEquals(
            expired.getHeader("Idempotency-Key"),
            refreshed.getHeader("Idempotency-Key")
        )
    }

    @Test
    fun signedUploadValuesAreRedactedFromSessionStringRepresentation() = runBlocking {
        server.enqueue(uploadSessionResponse())

        val text = gateway.initiateUpload(imageCommand()).toString()

        assertFalse(text.contains("signature-secret"))
        assertFalse(text.contains("header-secret"))
        assertTrue(text.contains("[redacted]"))
    }

    @Test
    fun confirmUsesAllocatedUploadSessionAndReturnsUploadedEvidence() = runBlocking {
        server.enqueue(mediaResponse("UPLOADED", 2L))

        val result = gateway.confirmUpload(
            ConfirmExerciseMediaUploadCommand("upload-1", "media-1", "\"etag-1\"")
        )

        assertEquals(ExerciseMediaServerStatus.UPLOADED, result.status)
        assertEquals(2L, result.version)
        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/media-uploads/upload-1/confirm", request.path)
        assertEquals("etag-1", JsonParser.parseString(request.body.readUtf8())
            .asJsonObject["etag"].asString)
        assertEquals("media-intent", request.getHeader("Idempotency-Key"))
    }

    @Test
    fun getMediaReturnsAuthoritativeAvailableStateWithoutMutationHeader() = runBlocking {
        server.enqueue(mediaResponse("AVAILABLE", 4L))

        val result = gateway.getMedia("media-1")

        assertEquals(ExerciseMediaServerStatus.AVAILABLE, result.status)
        assertEquals(4L, result.version)
        val request = server.takeRequest()
        assertEquals("GET", request.method)
        assertEquals("/api/v1/media/media-1", request.path)
        assertEquals(null, request.getHeader("Idempotency-Key"))
    }

    @Test
    fun bindSendsSameSessionAndCurrentMediaVersion() = runBlocking {
        server.enqueue(mediaResponse("BOUND", 3L))

        val result = gateway.bindMedia(BindExerciseMediaCommand("media-1", "session-1", 2L))

        assertEquals(ExerciseMediaServerStatus.BOUND, result.status)
        assertEquals(3L, result.version)
        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/media/media-1/bind", request.path)
        val body = JsonParser.parseString(request.body.readUtf8()).asJsonObject
        assertEquals("session-1", body["sessionId"].asString)
        assertEquals(2L, body["expectedVersion"].asLong)
    }

    @Test
    fun bindVersionConflictIsTyped() {
        server.enqueue(errorResponse(409, "CONFLICT_VERSION_MISMATCH", "req-conflict"))

        assertThrows(ExerciseMediaVersionConflictException::class.java) {
            runBlocking {
                gateway.bindMedia(BindExerciseMediaCommand("media-1", "session-1", 2L))
            }
        }
    }

    private fun imageCommand() = InitiateExerciseMediaUploadCommand(
        uploadIntentId = "draft-image-1",
        sessionId = "session-1",
        mediaType = ProofMediaType.Image,
        mimeType = "image/jpeg",
        fileSizeBytes = 1024L
    )

    private fun uploadSessionResponse(
        expiresAt: String = "2026-08-07T12:05:00Z"
    ): MockResponse = MockResponse()
        .setResponseCode(201)
        .setHeader("X-Request-ID", "req-upload")
        .setBody(
            """{
                "data":{
                    "uploadSessionId":"upload-1",
                    "mediaId":"media-1",
                    "uploadUrl":"https://storage.example.test/private?signature=signature-secret",
                    "uploadMethod":"PUT",
                    "requiredHeaders":{"Content-Type":"image/jpeg","x-upload-token":"header-secret"},
                    "expiresAt":"$expiresAt"
                },
                "meta":{"requestId":"req-upload"}
            }""".trimIndent()
        )

    private fun errorResponse(status: Int, code: String, requestId: String): MockResponse =
        MockResponse()
            .setResponseCode(status)
            .setHeader("X-Request-ID", requestId)
            .setBody(
                """{"code":"$code","message":"safe message","details":{},"requestId":"$requestId","timestamp":"2026-08-07T12:00:00Z"}"""
            )

    private fun mediaResponse(status: String, version: Long): MockResponse = MockResponse()
        .setResponseCode(200)
        .setHeader("X-Request-ID", "req-media")
        .setBody(
            """{
                "data":{
                    "id":"media-1",
                    "organizationId":"org-1",
                    "ownerStudentId":"student-1",
                    "sessionId":"session-1",
                    "enrollmentId":null,
                    "recordId":null,
                    "businessPurpose":"EXERCISE_RECORD",
                    "mediaType":"IMAGE",
                    "declaredMimeType":"image/jpeg",
                    "verifiedMimeType":"image/jpeg",
                    "declaredFileSizeBytes":1024,
                    "verifiedFileSizeBytes":1024,
                    "captureSource":"IN_APP_CAMERA",
                    "uploadStatus":"$status",
                    "uploadedAt":"2026-08-07T12:01:00Z",
                    "boundAt":null,
                    "declaredContentSha256":null,
                    "verifiedContentSha256":"${"ab".repeat(32)}",
                    "declaredDurationSeconds":null,
                    "verifiedDurationSeconds":null,
                    "version":$version
                },
                "meta":{"requestId":"req-media"}
            }""".trimIndent()
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

    private class MediaCredentialStore(
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
