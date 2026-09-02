package edu.bnbu.student.mvp.core.network.v1

import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.local.AuthSessionCredentials
import edu.bnbu.student.mvp.core.network.v1.generated.Gender
import edu.bnbu.student.mvp.core.network.v1.generated.StudentSignInCodeRequest
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class V1StudentApiTest {
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
    fun studentCodeRequestUsesOrganizationScopeAndReturnsChallenge() = runBlocking {
        server.enqueue(
            success(
                202,
                "req-challenge",
                """{"challengeId":"challenge-1","expiresAt":"2026-08-06T12:10:00Z"}"""
            )
        )
        val api = api(FakeStore(null))
        val intent = intent(
            operationId = "requestStudentSignInCode",
            canonicalInput = "organization=BNBU&account=student@example.edu&channel=EMAIL"
        )

        val challenge = api.requestSignInCode(
            organizationCode = "BNBU",
            account = "student@example.edu",
            locale = StudentSignInCodeRequest.Locale.zhMinusCN,
            intent = intent
        )

        assertEquals("challenge-1", challenge.challengeId)
        assertEquals(Instant.parse("2026-08-06T12:10:00Z"), challenge.expiresAt)
        assertEquals("req-challenge", challenge.requestId)
        val request = server.takeRequest(1, TimeUnit.SECONDS)!!
        assertEquals("/api/v1/auth/student-sign-in-codes", request.path)
        assertEquals("intent-key", request.getHeader("Idempotency-Key"))
        assertNull(request.getHeader("Authorization"))
        val body = request.body.readUtf8()
        assertTrue(body.contains("\"organizationCode\":\"BNBU\""))
        assertTrue(body.contains("student@example.edu"))
    }

    @Test
    fun studentCodeRequestKeepsTypedRequestCorrelationWithoutRenderingServerSecrets() {
        val serverSecret = "OTP 123456 challengeId=challenge-secret"
        server.enqueue(
            MockResponse()
                .setResponseCode(429)
                .setHeader("X-Request-ID", "req-email-rate-limit")
                .setBody(
                    """{"code":"AUTH_RATE_LIMITED","message":"$serverSecret","details":{"resourceId":"challenge-secret","migrationReference":"OTP 123456"},"requestId":"req-email-rate-limit","timestamp":"2026-08-24T00:00:00Z"}"""
                )
        )
        val api = api(FakeStore(null))

        val error = assertThrows(V1HttpException::class.java) {
            runBlocking {
                api.requestSignInCode(
                    organizationCode = "BNBU",
                    account = "student@example.edu",
                    locale = StudentSignInCodeRequest.Locale.zhMinusCN,
                    intent = intent("requestStudentSignInCode", "rate-limited")
                )
            }
        }

        assertEquals(429, error.statusCode)
        assertEquals("AUTH_RATE_LIMITED", error.error.code.value)
        assertEquals("req-email-rate-limit", error.error.requestId)
        assertFalse(error.message.orEmpty().contains(serverSecret))
        assertFalse(error.message.orEmpty().contains("challenge-secret"))
        assertFalse(error.message.orEmpty().contains("123456"))
    }

    @Test
    fun invalidOrganizationCodeFailsBeforeNetworkRequest() {
        val api = api(FakeStore(null))

        assertThrows(IllegalArgumentException::class.java) {
            runBlocking {
                api.requestSignInCode(
                    organizationCode = "bnbu",
                    account = "student@example.edu",
                    locale = StudentSignInCodeRequest.Locale.zhMinusCN,
                    intent = intent("requestStudentSignInCode", "invalid-organization")
                )
            }
        }

        assertEquals(0, server.requestCount)
    }

    @Test
    fun reservedVerificationSuccessInstallsBothTokensWithoutAuthorizationHeader() = runBlocking {
        server.enqueue(
            success(
                200,
                "req-verify",
                authSessionJson(sessionId = null, enrollmentId = "enrollment-1")
            )
        )
        val store = FakeStore(null)
        val api = api(store)

        val authenticated = api.verifySignInCode(
            challengeId = "challenge-1",
            code = "123456",
            deviceId = "android-installation-1",
            intent = intent("verifyStudentSignInCode", "challenge=challenge-1")
        )

        assertEquals("user-1", authenticated.user.id)
        assertNull(store.session?.sessionId)
        assertEquals("enrollment-1", store.session?.enrollmentId)
        assertEquals("access-new", store.session?.accessToken)
        assertEquals("refresh-new", store.session?.refreshToken)
        val request = server.takeRequest(1, TimeUnit.SECONDS)!!
        assertEquals("/api/v1/auth/student-sign-in-codes/verify", request.path)
        assertNull(request.getHeader("Authorization"))
        assertEquals("intent-key", request.getHeader("Idempotency-Key"))
        val requestBody = request.body.readUtf8()
        assertTrue(requestBody.contains("android-installation-1"))
        assertTrue(requestBody.contains("123456"))
    }

    @Test
    fun inviteTokenIsEncodedAsOnePathSegmentAndNeverRenderedInRequestLogs() = runBlocking {
        val inviteToken = "invite-token-1234/secret"
        server.enqueue(
            success(
                200,
                "req-preview",
                """{
                    "classSectionId":"section-1",
                    "displayName":"Section One",
                    "courseCode":"PE101",
                    "courseName":"Physical Education",
                    "semesterDisplayName":"2026 Fall",
                    "teacherDisplayName":"Teacher",
                    "enrollmentOpen":true,
                    "expiresAt":"2026-08-07T12:00:00Z"
                }""".trimIndent()
            )
        )
        val api = api(FakeStore(null))

        val preview = api.previewCourseInvite(inviteToken)

        assertEquals("section-1", preview.data?.classSectionId)
        val request = server.takeRequest(1, TimeUnit.SECONDS)!!
        assertEquals("/api/v1/course-invites/invite-token-1234%2Fsecret/preview", request.path)
        val requestDescription = V1ApiRequest(
            operationId = "previewCourseInvite",
            method = V1HttpMethod.GET,
            relativePath = "course-invites/{inviteToken}/preview",
            pathSegments = listOf("course-invites", inviteToken, "preview")
        ).toString()
        assertFalse(requestDescription.contains(inviteToken))
    }

    @Test
    fun qrJoinUsesCapabilityHeaderAndPersistsReturnedSessionAtomically() = runBlocking {
        val capabilitySecret = "capability-secret-value-1234567890"
        server.enqueue(
            success(
                201,
                "req-capability",
                """{
                    "joinCapability":"$capabilitySecret",
                    "classSectionId":"section-1",
                    "expiresAt":"2026-08-07T12:00:00Z"
                }""".trimIndent()
            )
        )
        server.enqueue(success(201, "req-join", joinResultJson()))
        val store = FakeStore(null)
        val api = api(store)
        val inviteToken = "invite-token-1234"

        val capability = api.issueJoinCapability(
            inviteToken = inviteToken,
            fullName = "Student Name",
            studentNumber = "20260001",
            gender = Gender.FEMALE,
            gradeYear = 2026,
            intent = intent("issueJoinCapability", "student=20260001")
        )
        val completed = api.joinClassSection(
            inviteToken = inviteToken,
            capability = capability,
            intent = intent("joinClassSectionWithInvite", "invite=$inviteToken")
        )

        assertEquals("section-1", completed.classSection.id)
        assertEquals("PENDING_CONTACT_BINDING", completed.currentUser.user.status.value)
        assertEquals("user-1", store.session?.principalUserId)
        assertEquals("enrollment-1", store.session?.enrollmentId)
        assertEquals("access-new", store.session?.accessToken)
        assertFalse(capability.toString().contains(capabilitySecret))
        assertFalse(completed.toString().contains("access-new"))
        assertFalse(completed.toString().contains("refresh-new"))

        val capabilityRequest = server.takeRequest(1, TimeUnit.SECONDS)!!
        val joinRequest = server.takeRequest(1, TimeUnit.SECONDS)!!
        assertEquals("/api/v1/course-invites/invite-token-1234/join-capabilities", capabilityRequest.path)
        assertEquals("/api/v1/course-invites/invite-token-1234/join", joinRequest.path)
        assertEquals(capabilitySecret, joinRequest.getHeader("X-Join-Capability"))
        assertNull(joinRequest.getHeader("Authorization"))
        assertEquals("intent-key", joinRequest.getHeader("Idempotency-Key"))
    }

    @Test
    fun qrJoinRejectsOtherGenderBeforeSendingARequest() = runBlocking {
        val api = api(FakeStore(null))

        val failure = runCatching {
            api.issueJoinCapability(
                inviteToken = "invite-token-1234",
                fullName = "Student Name",
                studentNumber = "20260001",
                gender = Gender.OTHER,
                gradeYear = 2026,
                intent = intent("issueJoinCapability", "student=unsupported-gender")
            )
        }.exceptionOrNull()

        assertTrue(failure is IllegalArgumentException)
        assertEquals(0, server.requestCount)
    }

    @Test
    fun qrJoinRejectsUnsupportedAccountStatusBeforePersistingSession() {
        val store = FakeStore(null)
        val api = api(store)
        server.enqueue(
            success(
                201,
                "req-capability-locked",
                """{
                    "joinCapability":"capability-secret-value-1234567890",
                    "classSectionId":"section-1",
                    "expiresAt":"2026-08-07T12:00:00Z"
                }""".trimIndent()
            )
        )
        server.enqueue(success(201, "req-join-locked", joinResultJson("LOCKED")))

        assertThrows(IllegalArgumentException::class.java) {
            runBlocking {
                val capability = api.issueJoinCapability(
                    inviteToken = "invite-token-1234",
                    fullName = "Student Name",
                    studentNumber = "20260001",
                    gender = Gender.FEMALE,
                    gradeYear = 2026,
                    intent = intent("issueJoinCapability", "student=locked")
                )
                api.joinClassSection(
                    inviteToken = "invite-token-1234",
                    capability = capability,
                    intent = intent("joinClassSectionWithInvite", "invite=locked")
                )
            }
        }

        assertNull(store.session)
    }

    @Test
    fun courseCursorIsOpaqueAndBoundToOriginalFilters() = runBlocking {
        server.enqueue(
            pagedSuccess(
                requestId = "req-courses-1",
                data = "[$courseJson]",
                nextCursor = "opaque-next-cursor",
                hasMore = true
            )
        )
        server.enqueue(
            pagedSuccess(
                requestId = "req-courses-2",
                data = "[]",
                nextCursor = null,
                hasMore = false
            )
        )
        val api = api(FakeStore(oldSession()))

        val first = api.listCourses()
        val cursor = first.nextCursor!!
        val second = api.listCourses(cursor = cursor)

        assertEquals(1, first.items.size)
        assertEquals("PE101", first.items.single().courseCode)
        assertEquals("[opaque cursor]", cursor.toString())
        assertTrue(second.items.isEmpty())
        assertEquals("/api/v1/courses?limit=20", server.takeRequest().path)
        assertEquals(
            "/api/v1/courses?limit=20&cursor=opaque-next-cursor",
            server.takeRequest().path
        )

        assertThrows(IllegalArgumentException::class.java) {
            runBlocking {
                api.listCourses(
                    query = V1CourseListQuery(limit = 10),
                    cursor = cursor
                )
            }
        }
        assertEquals(2, server.requestCount)
    }

    @Test
    fun classSectionAndEnrollmentListsUseStudentScopedContractPaths() = runBlocking {
        server.enqueue(pagedSuccess("req-sections", "[]", null, false))
        server.enqueue(pagedSuccess("req-enrollments", "[]", null, false))
        val api = api(FakeStore(oldSession()))

        api.listClassSections(V1ClassSectionListQuery(semesterId = "semester-1"))
        api.listEnrollments(V1EnrollmentListQuery(semesterId = "semester-1"))

        assertEquals(
            "/api/v1/class-sections?limit=20&semesterId=semester-1",
            server.takeRequest().path
        )
        assertEquals(
            "/api/v1/enrollments?limit=20&semesterId=semester-1",
            server.takeRequest().path
        )
    }

    @Test
    fun unknownGeneratedEnumFailsClosed() = runBlocking {
        server.enqueue(
            pagedSuccess(
                requestId = "req-unknown-enum",
                data = "[${courseJson.replace("\"ACTIVE\"", "\"FUTURE_STATUS\"")}]",
                nextCursor = null,
                hasMore = false
            )
        )
        val api = api(FakeStore(oldSession()))

        val failure = assertThrows(V1ProtocolException::class.java) {
            runBlocking { api.listCourses() }
        }

        assertEquals("listCourses", failure.operationId)
        assertTrue(failure.message.orEmpty().contains("expected response type"))
    }

    @Test
    fun studentAdapterDoesNotExposePasswordRecoveryOperations() {
        val methodNames = V1StudentApi::class.java.declaredMethods.map { it.name }.toSet()

        assertFalse("requestAccountRecovery" in methodNames)
        assertFalse("completeAccountRecovery" in methodNames)
    }

    private fun api(store: FakeStore): V1StudentApi = V1StudentApi.create(
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
        idempotencyKeyProvider = { IdempotencyKey.fromGenerated("intent-key") }
    )

    private fun intent(operationId: String, canonicalInput: String): MutationIntent =
        MutationIntentRegistry(keyFactory = { "intent-key" }).acquire(
            MutationIntentScope(
                accountScope = "pre-auth-device",
                operationId = operationId,
                actionSlot = "test-action"
            ),
            IntentFingerprint.fromCanonicalInput(operationId, canonicalInput)
        )

    private fun oldSession(): AuthSessionCredentials =
        AuthSessionCredentials.fromContract(
            sessionId = "session-old",
            accessToken = "access-old",
            refreshToken = "refresh-old",
            tokenType = "Bearer",
            accessTokenExpiresAt = "2026-08-06T13:00:00Z",
            refreshTokenExpiresAt = "2026-08-13T12:00:00Z",
            principalUserId = "user-1"
        )

    private fun success(status: Int, requestId: String, data: String): MockResponse =
        MockResponse()
            .setResponseCode(status)
            .setHeader("X-Request-ID", requestId)
            .setBody("""{"data":$data,"meta":{"requestId":"$requestId"}}""")

    private fun pagedSuccess(
        requestId: String,
        data: String,
        nextCursor: String?,
        hasMore: Boolean
    ): MockResponse {
        val cursorJson = nextCursor?.let { "\"$it\"" } ?: "null"
        return MockResponse()
            .setResponseCode(200)
            .setHeader("X-Request-ID", requestId)
            .setBody(
                """{"data":$data,"meta":{"requestId":"$requestId","pagination":{"nextCursor":$cursorJson,"hasMore":$hasMore,"limit":20}}}"""
            )
    }

    private fun joinResultJson(userStatus: String = "PENDING_CONTACT_BINDING"): String =
        """{
            "studentProfile":$studentProfileJson,
            "enrollment":$enrollmentJson,
            "course":$courseJson,
            "classSection":$classSectionJson,
            "authSession":${authSessionJson(userStatus = userStatus)}
        }""".trimIndent()

    private fun authSessionJson(
        sessionId: String? = "session-new",
        enrollmentId: String? = null,
        userStatus: String = "ACTIVE"
    ): String {
        val sessionIdJson = sessionId?.let { "\"$it\"" } ?: "null"
        val enrollmentIdJson = enrollmentId?.let { "\"$it\"" } ?: "null"
        return """{
            "sessionId":$sessionIdJson,
            "enrollmentId":$enrollmentIdJson,
            "accessToken":"access-new",
            "refreshToken":"refresh-new",
            "tokenType":"Bearer",
            "accessTokenExpiresAt":"2026-08-06T13:00:00Z",
            "refreshTokenExpiresAt":"2026-08-13T12:00:00Z",
            "user":${userJson(userStatus)}
        }""".trimIndent()
    }

    private fun userJson(status: String): String = """{
            "id":"user-1",
            "organizationId":"org-1",
            "role":"STUDENT",
            "status":"$status",
            "primaryEmailMasked":null,
            "emailVerified":false,
            "version":1
        }""".trimIndent()

    private val studentProfileJson: String
        get() = """{
            "id":"student-1",
            "organizationId":"org-1",
            "userId":"user-1",
            "studentNumber":"20260001",
            "fullName":"Student Name",
            "gender":"OTHER",
            "gradeYear":2026,
            "collegeName":null,
            "majorName":null,
            "administrativeClassName":null,
            "status":"ACTIVE",
            "createdAt":"2026-08-06T12:00:00Z",
            "updatedAt":"2026-08-06T12:00:00Z",
            "deletedAt":null,
            "version":1
        }""".trimIndent()

    private val courseJson: String
        get() = """{
            "id":"course-1",
            "organizationId":"org-1",
            "courseCode":"PE101",
            "courseName":"Physical Education",
            "status":"ACTIVE",
            "createdBy":null,
            "createdAt":"2026-08-06T12:00:00Z",
            "updatedAt":"2026-08-06T12:00:00Z",
            "deletedAt":null,
            "version":1,
            "description":null
        }""".trimIndent()

    private val classSectionJson: String
        get() = """{
            "id":"section-1",
            "organizationId":"org-1",
            "courseId":"course-1",
            "semesterId":"semester-1",
            "teacherId":"teacher-1",
            "classCode":"PE101-A",
            "displayName":"Section One",
            "status":"ACTIVE",
            "isEnrollmentOpen":true,
            "checkInWindowMode":"AVAILABLE",
            "excludedDates":[],
            "createdAt":"2026-08-06T12:00:00Z",
            "updatedAt":"2026-08-06T12:00:00Z",
            "version":1,
            "checkInStartDate":null,
            "checkInEndDate":null,
            "dailyStartTime":null,
            "dailyEndTime":null,
            "submissionDeadlineAt":null
        }""".trimIndent()

    private val enrollmentJson: String
        get() = """{
            "id":"enrollment-1",
            "organizationId":"org-1",
            "semesterId":"semester-1",
            "classSectionId":"section-1",
            "studentId":"student-1",
            "source":"QR_CODE",
            "sourceReferenceId":null,
            "status":"ACTIVE",
            "joinedAt":"2026-08-06T12:00:00Z",
            "endedAt":null,
            "endReason":null,
            "createdBy":null,
            "createdAt":"2026-08-06T12:00:00Z",
            "updatedAt":"2026-08-06T12:00:00Z",
            "version":1
        }""".trimIndent()

    private class FakeStore(initial: AuthSessionCredentials?) : AuthSessionCredentialStore {
        @Volatile
        var session: AuthSessionCredentials? = initial

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
