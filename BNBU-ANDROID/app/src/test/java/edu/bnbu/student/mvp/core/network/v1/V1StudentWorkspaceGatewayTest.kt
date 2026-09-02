package edu.bnbu.student.mvp.core.network.v1

import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.local.AuthSessionCredentials
import edu.bnbu.student.mvp.testing.TestHttps
import java.io.File
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class V1StudentWorkspaceGatewayTest {
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
    fun workspaceUsesOnlyCurrentV1StudentProjectionRoutes() = runBlocking {
        server.enqueue(success("me", currentUserJson))
        server.enqueue(paged("enrollments", "[]"))
        server.enqueue(success("semester", semesterJson))
        repeat(3) { index -> server.enqueue(paged("list-$index", "[]")) }
        val gateway = V1StudentWorkspaceGateway.create(
            credentialStore = FakeStore(credentials()),
            baseUrl = server.url("/api/v1").toString(),
            httpClient = TestHttps.clientBuilder().retryOnConnectionFailure(false).build()
        )

        val snapshot = gateway.loadWorkspace()

        assertEquals("user-1", snapshot.currentUser.user.id)
        assertTrue(snapshot.enrollments.isEmpty())
        assertTrue(snapshot.records.isEmpty())
        assertTrue(snapshot.scores.isEmpty())
        assertTrue(snapshot.notifications.isEmpty())
        assertEquals("2026-2027 秋季学期", snapshot.currentSemester?.displayName)
        val requests = (0 until 6).map { server.takeRequest(1, TimeUnit.SECONDS)!! }
        assertEquals("/api/v1/me", requests[0].path)
        assertTrue(requests[1].path!!.startsWith("/api/v1/enrollments?"))
        assertEquals(null, requests[1].requestUrl!!.queryParameter("studentId"))
        assertEquals("/api/v1/semesters/current", requests[2].path)
        assertTrue(requests[3].path!!.startsWith("/api/v1/exercise-records?"))
        assertTrue(requests[4].path!!.startsWith("/api/v1/student-scores?"))
        assertTrue(requests[5].path!!.startsWith("/api/v1/notifications?"))
        requests.forEach { request ->
            assertEquals("Bearer access-token", request.getHeader("Authorization"))
            assertEquals("application/json", request.getHeader("Accept"))
        }
    }

    @Test
    fun workspacePaginationFollowsContractCursorWithoutLegacyFallback() = runBlocking {
        server.enqueue(success("me", currentUserJson))
        server.enqueue(paged("enrollments-1", "[]", nextCursor = "next-page", hasMore = true))
        server.enqueue(paged("enrollments-2", "[]"))
        server.enqueue(success("semester", semesterJson))
        repeat(3) { index -> server.enqueue(paged("rest-$index", "[]")) }
        val gateway = V1StudentWorkspaceGateway.create(
            credentialStore = FakeStore(credentials()),
            baseUrl = server.url("/api/v1").toString(),
            httpClient = TestHttps.clientBuilder().retryOnConnectionFailure(false).build()
        )

        gateway.loadWorkspace()

        server.takeRequest(1, TimeUnit.SECONDS)
        val first = server.takeRequest(1, TimeUnit.SECONDS)!!
        val second = server.takeRequest(1, TimeUnit.SECONDS)!!
        assertEquals(null, first.requestUrl!!.queryParameter("cursor"))
        assertEquals("next-page", second.requestUrl!!.queryParameter("cursor"))
        assertEquals("100", second.requestUrl!!.queryParameter("limit"))
    }

    @Test
    fun missingCurrentSemesterMapsOnlyThatNotFoundResponseToNull() = runBlocking {
        server.enqueue(success("me", currentUserJson))
        server.enqueue(paged("enrollments", "[]"))
        server.enqueue(error(404, "COURSE_NOT_FOUND", "semester-missing"))
        repeat(3) { index -> server.enqueue(paged("rest-$index", "[]")) }
        val gateway = V1StudentWorkspaceGateway.create(
            credentialStore = FakeStore(credentials()),
            baseUrl = server.url("/api/v1").toString(),
            httpClient = TestHttps.clientBuilder().retryOnConnectionFailure(false).build()
        )

        val snapshot = gateway.loadWorkspace()

        assertEquals(null, snapshot.currentSemester)
        assertEquals(6, server.requestCount)
    }

    @Test
    fun workspaceRejectsPagedResponseWithoutContractPagination() {
        server.enqueue(success("me", currentUserJson))
        server.enqueue(success("enrollments-without-pagination", "[]"))
        val gateway = V1StudentWorkspaceGateway.create(
            credentialStore = FakeStore(credentials()),
            baseUrl = server.url("/api/v1").toString(),
            httpClient = TestHttps.clientBuilder().retryOnConnectionFailure(false).build()
        )

        val error = org.junit.Assert.assertThrows(V1ProtocolException::class.java) {
            runBlocking { gateway.loadWorkspace() }
        }

        assertTrue(error.message.orEmpty().contains("missing meta.pagination"))
        assertEquals(2, server.requestCount)
    }

    @Test
    fun exemptionProofAccessUsesAuthorizedShortLivedOriginalUrl() = runBlocking {
        server.enqueue(success(
            "media-access",
            """{"mediaId":"media-1","accessUrl":"https://storage.example.invalid/proof.jpg?signature=opaque","expiresAt":"2099-01-01T00:05:00Z"}"""
        ))
        val gateway = gateway()

        val accessUrl = gateway.createExemptionMediaAccessUrl("media-1")

        assertEquals("https://storage.example.invalid/proof.jpg?signature=opaque", accessUrl)
        val request = server.takeRequest(1, TimeUnit.SECONDS)!!
        assertEquals("POST", request.method)
        assertEquals("/api/v1/media/media-1/access-url", request.path)
        assertEquals("Bearer access-token", request.getHeader("Authorization"))
        assertTrue(request.getHeader("Idempotency-Key").orEmpty().isNotBlank())
        assertTrue(request.body.readUtf8().contains("\"purpose\":\"VIEW_ORIGINAL\""))
    }

    @Test
    fun exemptionMediaRejectsVideoBeforeAnyNetworkRequest() {
        val video = File.createTempFile("exemption-video-", ".mp4")
        try {
            video.writeBytes(byteArrayOf(1, 2, 3, 4))
            org.junit.Assert.assertThrows(IllegalArgumentException::class.java) {
                runBlocking {
                    gateway().uploadExemptionMedia(
                        enrollmentId = "enrollment-1",
                        file = video,
                        mimeType = "video/mp4",
                        durationSeconds = 5,
                        captureSource = "FILE_PICKER",
                        intentId = "video-proof"
                    )
                }
            }
            assertEquals(0, server.requestCount)
        } finally {
            video.delete()
        }
    }

    private fun gateway(): V1StudentWorkspaceGateway = V1StudentWorkspaceGateway.create(
        credentialStore = FakeStore(credentials()),
        baseUrl = server.url("/api/v1").toString(),
        httpClient = TestHttps.clientBuilder().retryOnConnectionFailure(false).build()
    )

    private fun success(requestId: String, data: String): MockResponse = MockResponse()
        .setResponseCode(200)
        .setHeader("X-Request-ID", requestId)
        .setBody("""{"data":$data,"meta":{"requestId":"$requestId"}}""")

    private fun paged(
        requestId: String,
        data: String,
        nextCursor: String? = null,
        hasMore: Boolean = false
    ): MockResponse {
        val cursor = nextCursor?.let { "\"$it\"" } ?: "null"
        return MockResponse()
            .setResponseCode(200)
            .setHeader("X-Request-ID", requestId)
            .setBody(
                """{"data":$data,"meta":{"requestId":"$requestId","pagination":{"nextCursor":$cursor,"hasMore":$hasMore,"limit":100}}}"""
            )
    }

    private fun error(status: Int, code: String, requestId: String): MockResponse = MockResponse()
        .setResponseCode(status)
        .setHeader("X-Request-ID", requestId)
        .setBody(
            """{"code":"$code","message":"safe error","details":{},"requestId":"$requestId","timestamp":"2026-08-06T12:00:00Z"}"""
        )

    private fun credentials(): AuthSessionCredentials = AuthSessionCredentials.fromContract(
        sessionId = "session-1",
        enrollmentId = "enrollment-1",
        principalUserId = "user-1",
        accessToken = "access-token",
        refreshToken = "refresh-token",
        tokenType = "Bearer",
        accessTokenExpiresAt = "2099-01-01T00:00:00Z",
        refreshTokenExpiresAt = "2099-02-01T00:00:00Z"
    )

    private val currentUserJson: String
        get() = """{
            "user":{
                "id":"user-1","organizationId":"org-1","role":"STUDENT",
                "status":"ACTIVE","primaryEmailMasked":"s***@example.edu",
                "emailVerified":true,"version":1
            },
            "studentProfile":{
                "id":"student-1","organizationId":"org-1","userId":"user-1",
                "studentNumber":"20260001","fullName":"Synthetic Student",
                "gender":"OTHER","gradeYear":2026,"collegeName":null,"majorName":null,
                "administrativeClassName":null,"status":"ACTIVE",
                "createdAt":"2026-08-06T12:00:00Z","updatedAt":"2026-08-06T12:00:00Z",
                "deletedAt":null,"version":1
            },
            "teacherProfile":null,"adminProfile":null
        }""".trimIndent()

    private val semesterJson: String
        get() = """{
            "id":"semester-1","organizationId":"org-1","academicYear":"2026-2027",
            "termCode":"FIRST","displayName":"2026-2027 秋季学期","startDate":"2026-08-01",
            "endDate":"2026-12-31","status":"CURRENT","isCurrent":true,"createdBy":null,
            "createdAt":"2026-08-01T00:00:00Z","updatedAt":"2026-08-01T00:00:00Z","version":1
        }""".trimIndent()

    private class FakeStore(initial: AuthSessionCredentials?) : AuthSessionCredentialStore {
        private var session = initial
        override fun saveAuthSession(session: AuthSessionCredentials): Boolean {
            this.session = session
            return true
        }
        override fun loadAuthSession(): AuthSessionCredentials? = session
        override fun clearAuth() {
            session = null
        }
    }
}
