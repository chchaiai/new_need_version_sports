package edu.bnbu.student.mvp.core.network.v1

import com.google.gson.JsonParser
import edu.bnbu.student.mvp.core.exercise.CreateExerciseRecordDraftCommand
import edu.bnbu.student.mvp.core.exercise.CreateExerciseRecordResubmissionCommand
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaAvailability
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaReference
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordForm
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordVersionConflictException
import edu.bnbu.student.mvp.core.exercise.SubmitExerciseRecordCommand
import edu.bnbu.student.mvp.core.exercise.UpdateExerciseRecordDraftCommand
import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.local.AuthSessionCredentials
import edu.bnbu.student.mvp.core.model.CreditType
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
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class V1ExerciseRecordGatewayTest {
    private lateinit var server: MockWebServer
    private lateinit var gateway: V1ExerciseSessionGateway

    @Before
    fun setUp() {
        server = TestHttps.newServer()
        server.start()
        val store = RecordCredentialStore(authSession())
        val client = V1AuthorizedApiClient.create(
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
        gateway = V1ExerciseSessionGateway(
            authorizedClient = client,
            enrollmentIdProvider = { store.session?.enrollmentId },
            clock = { FixedNow },
            mutationRegistry = MutationIntentRegistry { "record-intent" }
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun createDraftSendsCompleteFormButNeverSendsLocalMediaObjects() = runBlocking {
        server.enqueue(success(201, "req-create", recordJson("DRAFT", 1L)))

        val result = gateway.createRecordDraft(
            CreateExerciseRecordDraftCommand(
                sessionId = "session-1",
                creditType = CreditType.General,
                clientRequestId = "android-record-1",
                form = form()
            )
        )

        assertEquals("record-1", result.recordId)
        assertEquals("session-1", result.sessionId)
        assertEquals(1L, result.version)
        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/exercise-records", request.path)
        assertEquals("record-intent", request.getHeader("Idempotency-Key"))
        val body = JsonParser.parseString(request.body.readUtf8()).asJsonObject
        assertEquals("GENERAL", body["creditType"].asString)
        assertEquals("OTHER", body["sportType"].asString)
        assertEquals("Climbing", body["sportName"].asString)
        assertEquals("Morning climbing", body["description"].asString)
        assertFalse(body.has("studentRemark"))
        assertEquals("android-record-1", body["clientRequestId"].asString)
        assertFalse(body.has("media"))
        assertFalse(body.has("mediaIds"))
    }

    @Test
    fun updateDraftSendsEditableFieldsAndPositiveVersionOnly() = runBlocking {
        server.enqueue(success(200, "req-update", recordJson("DRAFT", 2L)))

        val result = gateway.updateRecordDraft(
            UpdateExerciseRecordDraftCommand(
                recordId = "record-1",
                expectedVersion = 1L,
                creditType = CreditType.General,
                form = form().copy(
                    description = "Updated running",
                    sportType = "running",
                    otherSportName = null
                )
            )
        )

        assertEquals(2L, result.version)
        val request = server.takeRequest()
        assertEquals("PATCH", request.method)
        assertEquals("/api/v1/exercise-records/record-1", request.path)
        val body = JsonParser.parseString(request.body.readUtf8()).asJsonObject
        assertEquals(1L, body["expectedVersion"].asLong)
        assertEquals("RUNNING", body["sportType"].asString)
        assertEquals("Updated running", body["description"].asString)
        assertTrue(body["sportName"].isJsonNull)
        assertFalse(body.has("studentRemark"))
        assertFalse(body.has("media"))
        assertFalse(body.has("mediaIds"))
        assertFalse(body.has("creditType"))
    }

    @Test
    fun submitBindsOnlyUniqueAvailableMediaIdsAtTheCurrentVersion() = runBlocking {
        server.enqueue(success(200, "req-submit", recordJson("REVIEWED", 3L)))

        val result = gateway.submitRecord(
            SubmitExerciseRecordCommand(
                recordId = "record-1",
                expectedVersion = 2L,
                mediaIds = listOf("media-image-1", "media-video-1")
            )
        )

        assertEquals(3L, result.version)
        assertEquals(1_786_104_000_000L, result.submittedAtEpochMillis)
        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/exercise-records/record-1/submit", request.path)
        val body = JsonParser.parseString(request.body.readUtf8()).asJsonObject
        assertEquals(2L, body["expectedVersion"].asLong)
        val mediaIds = body["mediaIds"].asJsonArray.map { it.asString }
        assertEquals(listOf("media-image-1", "media-video-1"), mediaIds)
        assertEquals(setOf("mediaIds", "expectedVersion"), body.keySet())
    }

    @Test
    fun recordVersionConflictIsTypedAndNeverReportedAsSuccess() {
        server.enqueue(error(409, "CONFLICT_VERSION_MISMATCH", "req-conflict"))

        val thrown = assertThrows(ExerciseRecordVersionConflictException::class.java) {
            runBlocking {
                gateway.updateRecordDraft(
                    UpdateExerciseRecordDraftCommand(
                        recordId = "record-1",
                        expectedVersion = 1L,
                        creditType = CreditType.General,
                        form = form()
                    )
                )
            }
        }

        assertTrue(thrown.cause is V1HttpException)
    }

    @Test
    fun courseRelatedDraftSerializesRequiredTrimmedDescription() = runBlocking {
        server.enqueue(success(201, "req-course", recordJson("DRAFT", 1L)))

        gateway.createRecordDraft(
            CreateExerciseRecordDraftCommand(
                sessionId = "session-1",
                creditType = CreditType.CourseRelated,
                clientRequestId = "android-course-record-1",
                form = form().copy(description = "  badminton drills  ")
            )
        )

        val body = JsonParser.parseString(server.takeRequest().body.readUtf8()).asJsonObject
        assertEquals("badminton drills", body["description"].asString)
    }

    @Test
    fun attemptContextUsesExactReadOnlyRouteAndPreservesHistoryLink() = runBlocking {
        server.enqueue(
            success(
                200,
                "req-attempt-context",
                """{
                    "recordId":"record-invalid-1",
                    "previousAttemptId":null,
                    "rootAttemptId":"record-invalid-1",
                    "attemptNumber":1
                }""".trimIndent()
            )
        )

        val context = gateway.getRecordAttemptContext("record-invalid-1")

        assertEquals("record-invalid-1", context.recordId)
        assertEquals(null, context.previousAttemptId)
        assertEquals("record-invalid-1", context.rootAttemptId)
        assertEquals(1, context.attemptNumber)
        val request = server.takeRequest()
        assertEquals("GET", request.method)
        assertEquals(
            "/api/v1/exercise-records/record-invalid-1/attempt-context",
            request.path
        )
        assertEquals(null, request.getHeader("Idempotency-Key"))
    }

    @Test
    fun resubmissionCreatesLinkedDraftWithExactBodyAndIdempotency() = runBlocking {
        val newRecord = recordJson(
            status = "DRAFT",
            version = 1L,
            recordId = "record-attempt-2",
            sessionId = "session-new-2"
        )
        server.enqueue(
            success(
                201,
                "req-resubmit",
                """{
                    "record":$newRecord,
                    "attemptContext":{
                        "recordId":"record-attempt-2",
                        "previousAttemptId":"record-invalid-1",
                        "rootAttemptId":"record-invalid-1",
                        "attemptNumber":2
                    }
                }""".trimIndent()
            )
        )

        val result = gateway.createRecordResubmission(
            CreateExerciseRecordResubmissionCommand(
                previousRecordId = "record-invalid-1",
                sessionId = "session-new-2",
                expectedVersion = 7L,
                creditType = CreditType.General,
                clientRequestId = "android-resubmit-2",
                form = form().copy(media = emptyList())
            )
        )

        assertEquals("record-attempt-2", result.draft.recordId)
        assertEquals("session-new-2", result.draft.sessionId)
        assertEquals("record-invalid-1", result.attemptContext.previousAttemptId)
        assertEquals(2, result.attemptContext.attemptNumber)
        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals(
            "/api/v1/exercise-records/record-invalid-1/resubmissions",
            request.path
        )
        assertEquals("record-intent", request.getHeader("Idempotency-Key"))
        val body = JsonParser.parseString(request.body.readUtf8()).asJsonObject
        assertEquals(
            setOf(
                "sessionId",
                "creditType",
                "sportType",
                "sportName",
                "description",
                "clientRequestId",
                "expectedVersion"
            ),
            body.keySet()
        )
        assertEquals("session-new-2", body["sessionId"].asString)
        assertEquals("GENERAL", body["creditType"].asString)
        assertEquals("OTHER", body["sportType"].asString)
        assertEquals("Climbing", body["sportName"].asString)
        assertEquals("Morning climbing", body["description"].asString)
        assertEquals("android-resubmit-2", body["clientRequestId"].asString)
        assertEquals(7L, body["expectedVersion"].asLong)
        assertFalse(body.has("mediaIds"))
    }

    @Test
    fun resubmissionRejectsBlankGeneralDescriptionBeforeNetwork() {
        assertThrows(IllegalArgumentException::class.java) {
            CreateExerciseRecordResubmissionCommand(
                previousRecordId = "record-invalid-1",
                sessionId = "session-new-2",
                expectedVersion = 7L,
                creditType = CreditType.General,
                clientRequestId = "android-resubmit-2",
                form = form().copy(description = "   ", media = emptyList())
            )
        }
        assertEquals(0, server.requestCount)
    }

    private fun form(): ExerciseRecordForm = ExerciseRecordForm(
        description = " Morning climbing ",
        sportType = "other",
        otherSportName = "Climbing",
        media = listOf(
            ExerciseMediaReference(
                mediaId = "media-image-1",
                sessionId = "session-1",
                type = ProofMediaType.Image,
                availability = ExerciseMediaAvailability.AVAILABLE
            )
        )
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

    private fun error(status: Int, code: String, requestId: String): MockResponse =
        MockResponse()
            .setResponseCode(status)
            .setHeader("X-Request-ID", requestId)
            .setBody(
                """{"code":"$code","message":"safe message","details":{},"requestId":"$requestId","timestamp":"2026-08-07T12:00:00Z"}"""
            )

    private fun recordJson(
        status: String,
        version: Long,
        recordId: String = "record-1",
        sessionId: String = "session-1"
    ): String {
        val submittedAt = if (status == "DRAFT") "null" else "\"2026-08-07T12:00:00Z\""
        val currentReview = if (status == "REVIEWED") {
            """{"result":"VALID","reasonCode":null,"publicComment":null}"""
        } else {
            "null"
        }
        return """{
            "id":"$recordId",
            "organizationId":"org-1",
            "semesterId":"semester-1",
            "studentId":"student-1",
            "enrollmentId":"enrollment-1",
            "classSectionId":"section-1",
            "courseId":"course-1",
            "teacherId":"teacher-1",
            "sessionId":"$sessionId",
            "businessDate":"2026-08-07",
            "creditType":"GENERAL",
            "sportType":"OTHER",
            "sportName":"Climbing",
            "description":"Morning climbing",
            "actualDurationSeconds":3600,
            "pausedDurationSeconds":0,
            "creditedDurationSeconds":3600,
            "status":"$status",
            "submittedAt":$submittedAt,
            "cancelledAt":null,
            "clientRequestId":"android-record-1",
            "currentReview":$currentReview,
            "version":$version
        }""".trimIndent()
    }

    private class RecordCredentialStore(
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
