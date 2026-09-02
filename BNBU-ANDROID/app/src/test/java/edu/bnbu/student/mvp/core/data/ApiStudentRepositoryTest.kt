package edu.bnbu.student.mvp.core.data

import edu.bnbu.student.mvp.core.model.ProofAttachment
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.model.Exemption
import edu.bnbu.student.mvp.core.model.ExemptionApplication
import edu.bnbu.student.mvp.core.model.AppLanguage
import edu.bnbu.student.mvp.core.network.UserDto
import edu.bnbu.student.mvp.core.network.SubmitSportRecordRequest
import edu.bnbu.student.mvp.core.network.SubmitFeedbackRequest
import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.local.AuthSessionCredentials
import edu.bnbu.student.mvp.core.exercise.StartExerciseCommand
import edu.bnbu.student.mvp.core.model.CreditType
import edu.bnbu.student.mvp.core.network.v1.IdempotencyKey
import edu.bnbu.student.mvp.core.network.v1.MutationIntentRegistry
import edu.bnbu.student.mvp.core.network.v1.V1AuthorizedApiClient
import edu.bnbu.student.mvp.core.network.v1.V1ExerciseSessionGateway
import edu.bnbu.student.mvp.core.network.v1.V1StudentWorkspaceGateway
import edu.bnbu.student.mvp.testing.TestHttps
import java.io.File
import java.io.IOException
import java.time.Instant
import java.util.concurrent.CopyOnWriteArrayList
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
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class ApiStudentRepositoryTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

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
    fun helpArticlesUseTheNonPaginatedContractQuery() = runBlocking {
        server.enqueue(
            success(
                "help-list",
                """[{"id":"help-1","category":"check-in","locale":"zh-CN","title":"帮助","bodyMarkdown":"正文","publishedAt":"2026-08-11T00:00:00Z","version":1}]"""
            )
        )

        val articles = repository().fetchHelpArticles()

        assertEquals(1, articles.size)
        assertEquals("help-1", articles.single().id)
        assertEquals("check-in", articles.single().categoryCode)
        assertEquals("zh-CN", articles.single().locale)
        assertEquals("正文", articles.single().bodyMarkdown)
        assertEquals(1L, articles.single().version)
        val request = server.takeRequest(2, TimeUnit.SECONDS)!!
        assertEquals("/api/v1/help-articles", request.requestUrl!!.encodedPath)
        assertTrue(request.requestUrl!!.queryParameterNames.contains("locale"))
        assertFalse(request.requestUrl!!.queryParameterNames.contains("limit"))
        assertFalse(request.requestUrl!!.queryParameterNames.contains("cursor"))
    }

    @Test
    fun checkInPolicyLoadsOnlyEnrollmentAndActiveClassSection() = runBlocking {
        server.enqueue(paged("enrollments", "[${enrollmentJson()}]"))
        server.enqueue(success("section", classSectionJson()))

        val window = repository().fetchCheckInTimeWindow()

        assertEquals("available", window.windowMode)
        assertEquals("2026-08-01", window.dateRangeStart)
        assertEquals("06:00", window.dailyStartTime)
        assertEquals(2, server.requestCount)
        assertTrue(server.takeRequest(2, TimeUnit.SECONDS)!!.path!!.startsWith("/api/v1/enrollments"))
        assertEquals(
            "/api/v1/class-sections/section-1",
            server.takeRequest(2, TimeUnit.SECONDS)!!.path
        )
    }

    @Test
    fun v1ExerciseMutationUsesAuthoritativeSessionRouteAndRunsOffCallerThread() = runBlocking {
        server.enqueue(success("session-start", sessionJson(), status = 201))
        val networkThreads = CopyOnWriteArrayList<String>()
        val httpClient = TestHttps.clientBuilder()
            .retryOnConnectionFailure(false)
            .addInterceptor { chain ->
                networkThreads += Thread.currentThread().name
                chain.proceed(chain.request())
            }
            .build()
        val callerThread = Thread.currentThread().name

        val session = exerciseGateway(httpClient).start(
            StartExerciseCommand(
                creditType = CreditType.General,
                sportType = "OTHER",
                customSportName = "Climbing"
            )
        )

        assertEquals("session-1", session.sessionId)
        assertEquals(1, networkThreads.size)
        assertNotEquals(callerThread, networkThreads.single())
        val request = server.takeRequest(2, TimeUnit.SECONDS)!!
        assertEquals("POST", request.method)
        assertEquals("/api/v1/exercise-sessions", request.path)
        assertEquals("exercise-intent", request.getHeader("Idempotency-Key"))
        assertTrue(request.body.readUtf8().contains("\"enrollmentId\":\"enrollment-1\""))
    }

    @Test
    fun repositoryV1MutationsRunBlockingHttpOnIoDispatcher() = runBlocking {
        server.enqueue(success("record-create", recordJson("DRAFT", 1), status = 201))
        server.enqueue(success("record-submit", recordJson("REVIEWED", 2)))
        server.enqueue(success("notice-read", notificationJson(readAt = "2026-08-11T00:01:00Z")))

        val networkThreads = CopyOnWriteArrayList<String>()
        val httpClient = TestHttps.clientBuilder()
            .retryOnConnectionFailure(false)
            .addInterceptor { chain ->
                networkThreads += Thread.currentThread().name
                chain.proceed(chain.request())
            }
            .build()
        val repository = repository(httpClient = httpClient)
        val callerThread = Thread.currentThread().name

        val submit = repository.submitRecord(
            SubmitSportRecordRequest(
                creditType = "其他运动",
                courseId = null,
                hours = 1.0,
                description = "run",
                proofFiles = listOf(
                    edu.bnbu.student.mvp.core.network.ProofFileReference(
                        cosKey = "media-1",
                        mediaType = "image",
                        mimeType = "image/jpeg",
                        size = 4
                    )
                ),
                sportType = "RUNNING",
                sessionId = "session-1",
                clientRequestId = "android-record-1"
            )
        )
        val markRead = repository.markNotificationRead("notice-1")

        assertTrue(submit.isSuccess)
        assertEquals("2026-08-11", submit.getOrThrow().businessDate)
        assertEquals(3600L, submit.getOrThrow().creditedDurationSeconds)
        assertEquals("VALID", submit.getOrThrow().reviewStatus)
        assertTrue(markRead.isSuccess)
        assertEquals(3, networkThreads.size)
        networkThreads.forEach { assertNotEquals(callerThread, it) }
        assertEquals("POST", server.takeRequest().method)
        assertEquals("POST", server.takeRequest().method)
        assertEquals("POST", server.takeRequest().method)
    }

    @Test
    fun workspaceUsesRemoteV1ProfileCourseScoreAndFailsClosedWhenScoresAreUnavailable() = runBlocking {
        enqueueWorkspace()

        val staleUser = UserDto(
            id = "stale-id",
            name = "Stale Name",
            email = "stale@bnbu.edu.cn",
            role = "student",
            college = "Stale College",
            className = "Stale Class"
        )
        val workspace = repository(userProfile = staleUser).loadWorkspaceAsync()

        assertEquals("student-remote", workspace.student.id)
        assertEquals("Remote Name", workspace.student.name)
        assertEquals("r***@bnbu.edu.cn", workspace.student.email)
        assertEquals("Remote College", workspace.student.college)
        assertEquals("Remote Class", workspace.student.className)
        assertEquals("20260001", workspace.student.studentNumber)
        assertEquals(1, workspace.courses.size)
        assertEquals("Physical Education", workspace.courses.single().name)
        assertEquals("2026-2027 秋季学期", workspace.courses.single().semester)
        assertEquals("2026-2027", workspace.courses.single().academicYear)
        assertEquals("FIRST", workspace.courses.single().term)
        assertEquals("current", workspace.courses.single().semesterStatus)
        assertEquals("Teacher Chen", workspace.courses.single().teacher)
        assertEquals(0.0, workspace.progress.course, 0.0)
        assertEquals(0.0, workspace.progress.general, 0.0)
        assertEquals("80.0", workspace.grades.totalDisplay)
        assertEquals("06:00", workspace.checkInTimeWindow.dailyStartTime)
        assertEquals("22:00", workspace.checkInTimeWindow.dailyEndTime)
        assertFalse(workspace.hourRule.isAvailable)

        server.enqueue(success("me-failure", currentUserJson()))
        server.enqueue(paged("enrollments-failure", "[]"))
        server.enqueue(success("semester-failure", semesterJson()))
        server.enqueue(paged("records-failure", "[]"))
        server.enqueue(error(503, "SYSTEM_MAINTENANCE", "scores-failure"))
        val failure = assertThrows(Exception::class.java) {
            runBlocking { repository(userProfile = staleUser).loadWorkspaceAsync() }
        }
        assertTrue(failure.message.orEmpty().contains("SYSTEM_MAINTENANCE"))
    }

    @Test
    fun workspaceDoesNotGuessSemesterMetadataWhenCurrentSemesterDoesNotMatch() = runBlocking {
        enqueueWorkspace(currentSemesterId = "semester-other")

        val course = repository().loadWorkspaceAsync().courses.single()

        assertEquals("", course.semester)
        assertEquals("", course.academicYear)
        assertEquals("", course.term)
        assertEquals("", course.semesterStatus)
    }

    @Test
    fun workspaceUsesOnlyTheCurrentSessionEnrollmentScoreAcrossHistoricalTerms() = runBlocking {
        server.enqueue(success("me", currentUserJson()))
        server.enqueue(
            paged(
                "enrollments",
                "[${enrollmentJson()},${enrollmentJson(id = "enrollment-old", semesterId = "semester-old", sectionId = "section-old")}]"
            )
        )
        server.enqueue(success("section-current", classSectionJson()))
        server.enqueue(success("section-old", classSectionJson(id = "section-old", semesterId = "semester-old")))
        server.enqueue(success("course", courseJson()))
        server.enqueue(success("teacher", teacherJson()))
        server.enqueue(success("semester", semesterJson()))
        server.enqueue(paged("records", "[]"))
        server.enqueue(
            paged(
                "scores",
                "[${scoreJson()},${scoreJson(id = "score-old", enrollmentId = "enrollment-old", courseSeconds = 360000, generalSeconds = 360000, totalSeconds = 720000)}]"
            )
        )
        server.enqueue(paged("notifications", "[]"))

        val workspace = repository().loadWorkspaceAsync()

        assertEquals(0.0, workspace.progress.course, 0.0)
        assertEquals(0.0, workspace.progress.general, 0.0)
        assertEquals(0.0, workspace.progress.authoritativeTotalHours ?: -1.0, 0.0)
        assertEquals("v1:exercise-records:valid-current-enrollment", workspace.progress.source)
        assertEquals("80.0", workspace.grades.totalDisplay)
    }

    @Test
    fun unreadableUploadFailsWithoutCallingServer() = runBlocking {
        val missing = File(temporaryFolder.root, "missing.jpg")
        val attachment = imageAttachment(missing)

        val result = repository().uploadProofFiles(
            proofAttachments = listOf(attachment),
            cacheDir = temporaryFolder.newFolder("cache-unreadable")
        )

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull()?.message.orEmpty().contains("not readable"))
        assertEquals(0, server.requestCount)
    }

    @Test
    fun confirmedMediaIdentityMismatchIsAnExplicitFailure() = runBlocking {
        val source = temporaryFolder.newFile("proof.jpg").apply {
            writeBytes(byteArrayOf(1, 2, 3, 4))
        }
        val repository = repository()
        enqueueWorkspace()
        repository.loadWorkspaceAsync()
        val uploadUrl = server.url("/private-object/media-1").toString()
        server.enqueue(
            success(
                "media-initiate",
                """{"uploadSessionId":"upload-1","mediaId":"media-1","uploadUrl":"$uploadUrl","uploadMethod":"PUT","requiredHeaders":{},"expiresAt":"2099-01-01T00:00:00Z"}""",
                status = 201
            )
        )
        server.enqueue(MockResponse().setResponseCode(200).setHeader("ETag", "etag-1"))
        server.enqueue(success("media-confirm", mediaJson(id = "media-other")))

        val result = repository.uploadProofFiles(
            proofAttachments = listOf(imageAttachment(source)),
            cacheDir = temporaryFolder.newFolder("cache-mismatch")
        )

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull()?.message.orEmpty().contains("does not match initiation"))
        repeat(9) { server.takeRequest() }
        assertEquals(12, server.requestCount)
        assertEquals("/api/v1/media-uploads", server.takeRequest().path)
        assertEquals("/private-object/media-1", server.takeRequest().path)
        assertEquals("/api/v1/media-uploads/upload-1/confirm", server.takeRequest().path)
    }

    @Test
    fun exemptionUploadRetryReusesInitiationIntentAcrossPutAndConfirmWorkflow() = runBlocking {
        val source = temporaryFolder.newFile("stable-proof.jpg").apply {
            writeBytes(byteArrayOf(1, 2, 3, 4))
        }
        val repository = repository()
        enqueueWorkspace()
        repository.loadWorkspaceAsync()
        val uploadUrl = server.url("/private-object/media-stable").toString()
        val initiation = """{
            "uploadSessionId":"upload-stable","mediaId":"media-stable",
            "uploadUrl":"$uploadUrl","uploadMethod":"PUT","requiredHeaders":{},
            "expiresAt":"2099-01-01T00:00:00Z"
        }""".trimIndent()
        server.enqueue(success("media-initiate-first", initiation, status = 201))
        server.enqueue(MockResponse().setResponseCode(503))
        server.enqueue(success("media-initiate-replay", initiation, status = 201))
        server.enqueue(MockResponse().setResponseCode(200).setHeader("ETag", "etag-stable"))
        server.enqueue(success("media-confirm", mediaJson(id = "media-stable")))

        val attachment = imageAttachment(source)
        val first = repository.uploadProofFiles(
            proofAttachments = listOf(attachment),
            cacheDir = temporaryFolder.newFolder("cache-stable-first")
        )
        val second = repository.uploadProofFiles(
            proofAttachments = listOf(attachment),
            cacheDir = temporaryFolder.newFolder("cache-stable-second")
        )

        assertTrue(first.isFailure)
        assertTrue(second.isSuccess)
        repeat(9) { server.takeRequest() }
        val firstInitiation = server.takeRequest()
        server.takeRequest()
        val secondInitiation = server.takeRequest()
        assertEquals("/api/v1/media-uploads", firstInitiation.path)
        assertEquals("/api/v1/media-uploads", secondInitiation.path)
        assertEquals(
            firstInitiation.getHeader("Idempotency-Key"),
            secondInitiation.getHeader("Idempotency-Key")
        )
        assertTrue(firstInitiation.getHeader("Idempotency-Key").orEmpty().isNotBlank())
        assertEquals("/private-object/media-stable", server.takeRequest().path)
        assertEquals("/api/v1/media-uploads/upload-stable/confirm", server.takeRequest().path)
    }

    @Test
    fun exemptionSupplementUsesVersionedV1LifecycleAndPayload() = runBlocking {
        server.enqueue(paged("exemption-list", "[${exemptionJson("SUPPLEMENT_REQUIRED", 2)}]"))
        server.enqueue(success("exemption-update", exemptionJson("SUPPLEMENT_REQUIRED", 3)))
        server.enqueue(success("media-available", mediaJson("media-existing")))
        server.enqueue(success("exemption-submit", exemptionJson("SUBMITTED", 4)))
        val exemption = Exemption(
            id = "exemption-1",
            studentId = "student-1",
            type = "exercise_check_in",
            category = "exercise_check_in",
            organization = "Track Team",
            reason = "original reason",
            status = "supplement_required",
            createdAt = "2026-07-13T00:00:00Z"
        )

        val response = repository().supplementExemption(
            exemption = exemption,
            payload = ExemptionApplication(
                type = "school_team",
                reason = "new supporting document",
                proofFiles = listOf("proofs/student-1/new.jpg"),
                organization = "Track Team"
            )
        )

        assertEquals("exemption-1", response.id)
        val listRequest = server.takeRequest()
        assertTrue(listRequest.path!!.startsWith("/api/v1/exemption-application-details?"))
        val request = server.takeRequest()
        assertEquals(
            "/api/v1/exemption-applications/exemption-1",
            request.path
        )
        assertEquals("PATCH", request.method)
        val body = request.body.readUtf8()
        assertTrue(body.contains("\"reason\":\"new supporting document\""))
        assertTrue(body.contains("\"expectedVersion\":2"))
        assertTrue(body.contains("proofs/student-1/new.jpg"))
        assertFalse(body.contains("\"applicationType\""))
        val media = server.takeRequest()
        assertEquals("/api/v1/media/media-existing", media.path)
        assertEquals("GET", media.method)
        val submit = server.takeRequest()
        assertEquals("/api/v1/exemption-applications/exemption-1/submit", submit.path)
        assertTrue(submit.body.readUtf8().contains("\"expectedVersion\":3"))
    }

    @Test
    fun exemptionCreateWaitsForAllMediaToBecomeAvailableBeforeSubmit() = runBlocking {
        val repository = repository()
        enqueueWorkspace()
        repository.loadWorkspaceAsync()
        server.enqueue(
            success(
                "exemption-create",
                exemptionJson("DRAFT", 1, listOf("media-1")),
                status = 201
            )
        )
        server.enqueue(success("media-bound", mediaJson("media-1", "BOUND")))
        server.enqueue(success("media-processing", mediaJson("media-1", "PROCESSING")))
        server.enqueue(success("media-available", mediaJson("media-1", "AVAILABLE")))
        server.enqueue(
            success(
                "exemption-submit",
                exemptionJson("SUBMITTED", 2, listOf("media-1"))
            )
        )

        val response = repository.submitExemption(
            ExemptionApplication(
                type = "school_team",
                reason = "medical evidence",
                proofFiles = listOf("media-1"),
                organization = "Track Team"
            )
        )

        assertEquals("exemption-1", response.id)
        repeat(9) { server.takeRequest() }
        val requests = (0 until 5).map { server.takeRequest() }
        assertEquals("/api/v1/exemption-applications", requests[0].path)
        assertEquals("/api/v1/media/media-1", requests[1].path)
        assertEquals("/api/v1/media/media-1", requests[2].path)
        assertEquals("/api/v1/media/media-1", requests[3].path)
        assertEquals("/api/v1/exemption-applications/exemption-1/submit", requests[4].path)
    }

    @Test
    fun failedExemptionMediaStopsBeforeSubmit() = runBlocking {
        val repository = repository()
        enqueueWorkspace()
        repository.loadWorkspaceAsync()
        server.enqueue(
            success(
                "exemption-create",
                exemptionJson("DRAFT", 1, listOf("media-failed")),
                status = 201
            )
        )
        server.enqueue(success("media-failed", mediaJson("media-failed", "FAILED")))

        val error = runCatching {
            repository.submitExemption(
                ExemptionApplication(
                    type = "school_team",
                    reason = "medical evidence",
                    proofFiles = listOf("media-failed"),
                    organization = "Track Team"
                )
            )
        }.exceptionOrNull()

        assertTrue(error is IOException)
        assertTrue(error?.message.orEmpty().contains("status=FAILED"))
        assertEquals(11, server.requestCount)
        repeat(9) { server.takeRequest() }
        assertEquals("/api/v1/exemption-applications", server.takeRequest().path)
        assertEquals("/api/v1/media/media-failed", server.takeRequest().path)
    }

    @Test
    fun exemptionCreateRetryReusesUserSubmissionIntent() = runBlocking {
        val repository = repository()
        enqueueWorkspace()
        repository.loadWorkspaceAsync()
        server.enqueue(error(503, "SYSTEM_SERVICE_UNAVAILABLE", "exemption-temporary"))
        server.enqueue(
            success(
                "exemption-create-replay",
                exemptionJson("DRAFT", 1, emptyList()),
                status = 201
            )
        )
        server.enqueue(
            success(
                "exemption-submit",
                exemptionJson("SUBMITTED", 2, emptyList())
            )
        )
        val payload = ExemptionApplication(
            type = "school_team",
            reason = "stable retry",
            proofFiles = emptyList(),
            organization = "Track Team",
            intentId = "exemption-user-intent"
        )

        val first = runCatching { repository.submitExemption(payload) }.exceptionOrNull()
        val second = repository.submitExemption(payload)

        assertTrue(first is edu.bnbu.student.mvp.core.network.v1.V1HttpException)
        assertEquals("exemption-1", second.id)
        repeat(9) { server.takeRequest() }
        val firstCreate = server.takeRequest()
        val replayedCreate = server.takeRequest()
        assertEquals(
            firstCreate.getHeader("Idempotency-Key"),
            replayedCreate.getHeader("Idempotency-Key")
        )
        assertEquals("/api/v1/exemption-applications/exemption-1/submit", server.takeRequest().path)
    }

    @Test
    fun feedbackRetryReusesUserSubmissionIntent() = runBlocking {
        server.enqueue(error(503, "SYSTEM_SERVICE_UNAVAILABLE", "feedback-temporary"))
        server.enqueue(success("feedback-replay", feedbackJson(), status = 201))
        val repository = repository()
        val payload = SubmitFeedbackRequest(
            category = "功能异常",
            description = "retry this report",
            currentPage = "Profile / Report",
            clientVersion = "test",
            intentId = "feedback-user-intent"
        )

        val first = runCatching { repository.submitFeedback(payload) }.exceptionOrNull()
        val second = repository.submitFeedback(payload)

        assertTrue(first is edu.bnbu.student.mvp.core.network.v1.V1HttpException)
        assertEquals("feedback-1", second.id)
        val firstCreate = server.takeRequest()
        val replayedCreate = server.takeRequest()
        assertEquals("/api/v1/feedback", firstCreate.path)
        assertEquals("/api/v1/feedback", replayedCreate.path)
        assertEquals(
            firstCreate.getHeader("Idempotency-Key"),
            replayedCreate.getHeader("Idempotency-Key")
        )
    }

    @Test
    fun studentFeedbackCategoriesMapToTheSharedContractValues() = runBlocking {
        val categories = listOf(
            "功能异常" to "BUG",
            "功能建议" to "SUGGESTION",
            "无障碍问题" to "ACCESSIBILITY",
            "隐私问题" to "PRIVACY",
            "其他" to "OTHER"
        )
        categories.forEachIndexed { index, (label, _) ->
            server.enqueue(success("feedback-category-$index", feedbackJson(), status = 201))
            repository().submitFeedback(
                SubmitFeedbackRequest(
                    category = label,
                    description = "category mapping check",
                    currentPage = "Profile / Report",
                    clientVersion = "test",
                    intentId = "feedback-category-$index"
                )
            )
        }

        categories.forEach { (_, contractValue) ->
            val request = server.takeRequest()
            assertEquals("/api/v1/feedback", request.path)
            assertTrue(request.body.readUtf8().contains("\"category\":\"$contractValue\""))
        }
    }

    @Test
    fun languagePreferencePreservesOtherFieldsAndUsesExpectedVersion() = runBlocking {
        server.enqueue(success("preferences-get", preferencesJson("zh-CN", version = 7)))
        server.enqueue(success("preferences-patch", preferencesJson("en", version = 8)))

        val response = repository().updateLanguagePreference(AppLanguage.English)

        val read = server.takeRequest()
        assertEquals("GET", read.method)
        assertEquals("/api/v1/me/preferences", read.path)
        val request = server.takeRequest()
        assertEquals("PATCH", request.method)
        assertEquals("/api/v1/me/preferences", request.path)
        val body = request.body.readUtf8()
        assertTrue(body.contains("\"locale\":\"en\""))
        assertTrue(body.contains("\"pushEnabled\":true"))
        assertTrue(body.contains("\"emailEnabled\":true"))
        assertTrue(body.contains("\"expectedVersion\":7"))
        assertEquals("en", response.language)
    }

    private fun imageAttachment(file: File): ProofAttachment {
        return ProofAttachment(
            id = file.name,
            type = ProofMediaType.Image,
            fileName = file.name,
            byteCount = file.length().takeIf { it > 0 } ?: 1,
            source = file.toURI().toString()
        )
    }

    private fun repository(
        httpClient: OkHttpClient = TestHttps.clientBuilder()
            .retryOnConnectionFailure(false)
            .build(),
        userProfile: UserDto? = null
    ): ApiStudentRepository {
        val gateway = V1StudentWorkspaceGateway.create(
            credentialStore = FakeStore(credentials()),
            baseUrl = server.url("/api/v1").toString(),
            httpClient = httpClient,
            mediaPollDelayMillis = 0L
        )
        return ApiStudentRepository(
            initialBearerToken = "access-token",
            userProfile = userProfile,
            v1Gateway = gateway
        ).attachExerciseGateway(exerciseGateway(httpClient))
    }

    private fun exerciseGateway(httpClient: OkHttpClient): V1ExerciseSessionGateway {
        val store = FakeStore(credentials())
        val client = V1AuthorizedApiClient.create(
            credentialStore = store,
            baseUrl = server.url("/api/v1").toString().trimEnd('/'),
            httpClient = httpClient,
            clock = { FixedNow },
            requestIdProvider = { "req-client" },
            idempotencyKeyProvider = { IdempotencyKey.fromGenerated("auth-intent") }
        )
        return V1ExerciseSessionGateway(
            authorizedClient = client,
            enrollmentIdProvider = { store.loadAuthSession()?.enrollmentId },
            clock = { FixedNow },
            mutationRegistry = MutationIntentRegistry { "exercise-intent" }
        )
    }

    private fun success(requestId: String, data: String, status: Int = 200): MockResponse =
        MockResponse()
            .setResponseCode(status)
            .setHeader("X-Request-ID", requestId)
            .setBody("""{"data":$data,"meta":{"requestId":"$requestId"}}""")

    private fun paged(requestId: String, data: String): MockResponse = MockResponse()
        .setResponseCode(200)
        .setHeader("X-Request-ID", requestId)
        .setBody(
            """{"data":$data,"meta":{"requestId":"$requestId","pagination":{"nextCursor":null,"hasMore":false,"limit":100}}}"""
        )

    private fun error(status: Int, code: String, requestId: String): MockResponse = MockResponse()
        .setResponseCode(status)
        .setHeader("X-Request-ID", requestId)
        .setBody(
            """{"code":"$code","message":"safe error","details":{},"requestId":"$requestId","timestamp":"2026-08-11T00:00:00Z"}"""
        )

    private fun sessionJson(): String = """{
        "id":"session-1","organizationId":"org-1","semesterId":"semester-1",
        "studentId":"student-remote","enrollmentId":"enrollment-1","classSectionId":"section-1",
        "status":"IN_PROGRESS","startedAt":"2026-08-11T00:00:00Z","endedAt":null,
        "actualDurationSeconds":0,"pausedDurationSeconds":0,"businessDate":"2026-08-11",
        "lastHeartbeatAt":"2026-08-11T00:00:00Z","endReason":null,"version":1
    }""".trimIndent()

    private fun recordJson(status: String, version: Long): String {
        val submittedAt = if (status == "DRAFT") "null" else "\"2026-08-11T00:10:00Z\""
        val currentReview = if (status == "REVIEWED") {
            """{"result":"VALID","reasonCode":null,"publicComment":null}"""
        } else {
            "null"
        }
        return """{
            "id":"record-1","organizationId":"org-1","semesterId":"semester-1",
            "studentId":"student-remote","enrollmentId":"enrollment-1","classSectionId":"section-1",
            "courseId":"course-1","teacherId":"teacher-1","sessionId":"session-1",
            "businessDate":"2026-08-11","creditType":"GENERAL","sportType":"RUNNING",
            "sportName":null,"description":"run","actualDurationSeconds":3600,
            "pausedDurationSeconds":0,"creditedDurationSeconds":3600,"status":"$status",
            "submittedAt":$submittedAt,"cancelledAt":null,"clientRequestId":"android-record-1",
            "currentReview":$currentReview,"version":$version
        }""".trimIndent()
    }

    private fun notificationJson(readAt: String?): String {
        val read = readAt?.let { "\"$it\"" } ?: "null"
        return """{
            "id":"notice-1","recipientUserId":"user-1","notificationType":"SYSTEM_NOTICE",
            "title":"Notice","body":"Body","targetType":null,"targetId":null,
            "createdAt":"2026-08-11T00:00:00Z","readAt":$read
        }""".trimIndent()
    }

    private fun preferencesJson(locale: String, version: Long): String =
        """{"locale":"$locale","pushEnabled":true,"emailEnabled":true,"version":$version}"""

    private fun currentUserJson(): String = """{
        "user":{"id":"user-1","organizationId":"org-1","role":"STUDENT","status":"ACTIVE",
            "primaryEmailMasked":"r***@bnbu.edu.cn","emailVerified":true,"version":1},
        "studentProfile":{"id":"student-remote","organizationId":"org-1","userId":"user-1",
            "studentNumber":"20260001","fullName":"Remote Name","gender":"OTHER","gradeYear":2026,
            "collegeName":"Remote College","majorName":null,"administrativeClassName":"Remote Class",
            "status":"ACTIVE","createdAt":"2026-08-11T00:00:00Z","updatedAt":"2026-08-11T00:00:00Z",
            "deletedAt":null,"version":1},"teacherProfile":null,"adminProfile":null
    }""".trimIndent()

    private fun enrollmentJson(
        id: String = "enrollment-1",
        semesterId: String = "semester-1",
        sectionId: String = "section-1"
    ): String = """{
        "id":"$id","organizationId":"org-1","semesterId":"$semesterId",
        "classSectionId":"$sectionId","studentId":"student-remote","source":"QR_CODE",
        "sourceReferenceId":null,"status":"ACTIVE","joinedAt":"2026-08-01T00:00:00Z",
        "endedAt":null,"endReason":null,"createdBy":null,"createdAt":"2026-08-01T00:00:00Z",
        "updatedAt":"2026-08-01T00:00:00Z","version":1
    }""".trimIndent()

    private fun classSectionJson(
        id: String = "section-1",
        semesterId: String = "semester-1"
    ): String = """{
        "id":"$id","organizationId":"org-1","courseId":"course-1","semesterId":"$semesterId",
        "teacherId":"teacher-1","classCode":"PE-01","displayName":"Physical Education 01",
        "status":"ACTIVE","isEnrollmentOpen":true,"checkInWindowMode":"AVAILABLE",
        "checkInStartDate":"2026-08-01","checkInEndDate":"2026-12-31",
        "dailyStartTime":"06:00:00","dailyEndTime":"22:00:00",
        "submissionDeadlineAt":"2026-12-31T15:59:59Z","excludedDates":[],
        "createdAt":"2026-08-01T00:00:00Z","updatedAt":"2026-08-01T00:00:00Z","version":1
    }""".trimIndent()

    private fun courseJson(): String = """{
        "id":"course-1","organizationId":"org-1","courseCode":"PE101","courseName":"Physical Education",
        "description":null,"status":"ACTIVE","createdBy":null,"createdAt":"2026-08-01T00:00:00Z",
        "updatedAt":"2026-08-01T00:00:00Z","deletedAt":null,"version":1
    }""".trimIndent()

    private fun teacherJson(): String = """{
        "id":"teacher-1","organizationId":"org-1","userId":"teacher-user-1",
        "employeeNumber":"T0001","fullName":"Teacher Chen","status":"ACTIVE",
        "createdAt":"2026-08-01T00:00:00Z","updatedAt":"2026-08-01T00:00:00Z",
        "deletedAt":null,"version":1,"collegeName":"Remote College",
        "departmentName":"Physical Education","title":"Lecturer"
    }""".trimIndent()

    private fun semesterJson(id: String = "semester-1"): String = """{
        "id":"$id","organizationId":"org-1","academicYear":"2026-2027",
        "termCode":"FIRST","displayName":"2026-2027 秋季学期","startDate":"2026-08-01",
        "endDate":"2026-12-31","status":"CURRENT","isCurrent":true,"createdBy":null,
        "createdAt":"2026-08-01T00:00:00Z","updatedAt":"2026-08-01T00:00:00Z","version":1
    }""".trimIndent()

    private fun scoreJson(
        id: String = "score-1",
        enrollmentId: String = "enrollment-1",
        courseSeconds: Long = 50400,
        generalSeconds: Long = 79200,
        totalSeconds: Long = 129600
    ): String = """{
        "id":"$id","organizationId":"org-1","enrollmentId":"$enrollmentId","scoreRuleId":"rule-1",
        "calculationRevision":1,"validCourseDurationSeconds":$courseSeconds,"validGeneralDurationSeconds":$generalSeconds,
        "totalValidDurationSeconds":$totalSeconds,"scoringSeconds":$totalSeconds,"excessSeconds":0,
        "qualificationStatus":"QUALIFIED","baseScore":80.0,"adjustmentTotal":0.0,"finalScore":80.0,
        "status":"PUBLISHED","calculatedAt":"2026-08-11T00:00:00Z","publishedAt":"2026-08-11T00:00:00Z",
        "lockedAt":null,"sourceFingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","version":1
    }""".trimIndent()

    private fun mediaJson(id: String, status: String = "AVAILABLE"): String = """{
        "id":"$id","organizationId":"org-1","ownerStudentId":"student-remote","sessionId":null,
        "enrollmentId":"enrollment-1","recordId":null,"businessPurpose":"EXEMPTION_APPLICATION",
        "mediaType":"IMAGE","declaredMimeType":"image/jpeg","verifiedMimeType":"image/jpeg",
        "declaredFileSizeBytes":4,"verifiedFileSizeBytes":4,"captureSource":"FILE_PICKER",
        "uploadStatus":"$status","uploadedAt":"2026-08-11T00:00:00Z","boundAt":null,
        "declaredContentSha256":null,"verifiedContentSha256":null,"declaredDurationSeconds":null,
        "verifiedDurationSeconds":null,"version":1
    }""".trimIndent()

    private fun exemptionJson(
        status: String,
        version: Long,
        mediaIds: List<String> = listOf("media-existing")
    ): String {
        val mediaJson = mediaIds.joinToString(prefix = "[", postfix = "]") { "\"$it\"" }
        return """{
        "id":"exemption-1","studentId":"student-remote","enrollmentId":"enrollment-1",
        "classSectionId":"section-1","applicationType":"EXERCISE_CHECK_IN","reason":"original reason",
        "mediaIds":$mediaJson,"status":"$status","publicComment":"Add documents",
        "submittedAt":"2026-08-10T00:00:00Z","decidedAt":null,"version":$version
    }""".trimIndent()
    }

    private fun feedbackJson(): String = """{
        "id":"feedback-1","category":"BUG","content":"retry this report",
        "status":"OPEN","publicReply":null,"createdAt":"2026-08-11T00:00:00Z",
        "updatedAt":"2026-08-11T00:00:00Z","version":1
    }""".trimIndent()

    private fun enqueueWorkspace(currentSemesterId: String = "semester-1") {
        server.enqueue(success("me", currentUserJson()))
        server.enqueue(paged("enrollments", "[${enrollmentJson()}]"))
        server.enqueue(success("section", classSectionJson()))
        server.enqueue(success("course", courseJson()))
        server.enqueue(success("teacher", teacherJson()))
        server.enqueue(success("semester", semesterJson(currentSemesterId)))
        server.enqueue(paged("records", "[]"))
        server.enqueue(paged("scores", "[${scoreJson()}]"))
        server.enqueue(paged("notifications", "[]"))
    }

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

    private fun credentials(): AuthSessionCredentials = AuthSessionCredentials.fromContract(
        sessionId = "session-auth-1",
        enrollmentId = "enrollment-1",
        principalUserId = "user-1",
        accessToken = "access-token",
        refreshToken = "refresh-token",
        tokenType = "Bearer",
        accessTokenExpiresAt = "2099-01-01T00:00:00Z",
        refreshTokenExpiresAt = "2099-02-01T00:00:00Z"
    )

    private companion object {
        val FixedNow: Instant = Instant.parse("2026-08-11T00:00:00Z")
    }
}
