package edu.bnbu.student.mvp.phase5a

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import edu.bnbu.student.mvp.core.network.v1.V1Json
import edu.bnbu.student.mvp.phase5ga.generated.CourseInvitationPreview
import edu.bnbu.student.mvp.phase5ga.generated.DirectUploadHttpMethod
import edu.bnbu.student.mvp.phase5ga.generated.ErrorCode
import edu.bnbu.student.mvp.phase5ga.generated.ErrorEnvelope
import edu.bnbu.student.mvp.phase5ga.generated.ExerciseSession
import edu.bnbu.student.mvp.phase5ga.generated.MediaAllocation
import edu.bnbu.student.mvp.phase5ga.generated.MediaFinalizationRejectionCode
import edu.bnbu.student.mvp.phase5ga.generated.MediaFinalizationResult
import edu.bnbu.student.mvp.phase5ga.generated.SemesterSummary
import edu.bnbu.student.mvp.phase5ga.generated.StudentDashboard
import java.io.File
import java.time.OffsetDateTime
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class Phase5aContractRevalidationTest {
    @Test
    fun acceptedCrOperationsExposeOneStrictContractShape() {
        val contract = phase5aContract.readText(Charsets.UTF_8)

        val activeSession = operationBlock(contract, "getOwnActiveExerciseSession")
        assertTrue(activeSession.contains("- RESOURCE_NOT_FOUND"))
        assertTrue(activeSession.contains("'404':"))
        assertTrue(activeSession.contains("\$ref: '#/components/schemas/ExerciseSession'"))

        val invitation = operationBlock(contract, "previewCourseInvitation")
        assertTrue(invitation.contains("ACTIVE, EXPIRED, REVOKED, COURSE_CLOSED, or NOT_CURRENT"))
        assertTrue(invitation.contains("'200':"))
        assertTrue(invitation.contains("'422':"))
        assertTrue(invitation.contains("- INVITATION_INVALID"))

        val finalization = operationBlock(contract, "finalizeMediaAsset")
        assertTrue(finalization.contains("\$ref: '#/components/schemas/MediaFinalizationResult'"))
        assertFalse(finalization.contains("- MEDIA_ALLOCATION_EXPIRED"))
        assertFalse(finalization.contains("- MEDIA_CONTENT_INVALID"))
        assertFalse(finalization.contains("- MEDIA_LIMIT_EXCEEDED"))
        assertFalse(finalization.contains("- PAYLOAD_TOO_LARGE"))
        assertFalse(finalization.contains("- UNSUPPORTED_MEDIA_TYPE"))

        assertTrue(contract.contains("DirectUploadHttpMethod:\n      type: string"))
        assertTrue(contract.contains("DirectUploadHttpMethod:\n      type: string\n      description:"))
        assertTrue(contract.contains("      enum:\n      - PUT\n    FieldViolation:"))
        assertTrue(contract.contains("- student\n      - studentStatus"))
        assertTrue(contract.contains("student is present"))
        assertTrue(contract.contains("for both ACTIVE and PENDING students"))
    }

    @Test
    fun activeSessionContentIdleStartAndFailuresStayDistinct() {
        val content = decodeActiveSession(200, activeSessionJson)
        assertTrue(content is SessionOutcome.Content)
        assertEquals(ExerciseSession.Status.ACTIVE, (content as SessionOutcome.Content).session.status)

        val idle = decodeActiveSession(404, errorJson("RESOURCE_NOT_FOUND"))
        assertEquals(SessionOutcome.Idle, idle)

        val started = decodeStartedSession(201, activeSessionJson)
        assertEquals("00000000-0000-4000-8000-000000000101", started.session.sessionId.toString())

        listOf("AUTHENTICATION_REQUIRED", "SYSTEM_MAINTENANCE", "DEPENDENCY_UNAVAILABLE").forEach { code ->
            val status = if (code == "AUTHENTICATION_REQUIRED") 401 else 503
            val failure = decodeActiveSession(status, errorJson(code))
            assertTrue(failure is SessionOutcome.Failure)
            assertEquals(code, (failure as SessionOutcome.Failure).code.value)
        }

        assertTrue(
            runCatching {
                decodeActiveSession(200, activeSessionJson.replace("\n}", ",\n  \"legacyFallback\": true\n}"))
            }.isFailure
        )
    }

    @Test
    fun activeAndPendingDashboardsKeepTheCompleteStudentProjection() {
        val active = decodeDashboard(dashboardJson("ACTIVE"))
        assertEquals(StudentDashboard.StudentStatus.ACTIVE, active.studentStatus)
        assertEquals("Ada Student", active.student.name)
        assertNull(active.course)
        assertNull(active.progress)

        val pending = decodeDashboard(dashboardJson("PENDING"))
        assertEquals(StudentDashboard.StudentStatus.PENDING, pending.studentStatus)
        assertEquals("S20260001", pending.student.studentNumber)
        assertNull(pending.course)
        assertNull(pending.progress)

        val mismatched = dashboardJson("PENDING")
            .replaceFirst("\"studentStatus\": \"PENDING\"", "\"studentStatus\": \"ACTIVE\"")
        assertTrue(runCatching { decodeDashboard(mismatched) }.isFailure)

        val extraStudentField = JsonParser.parseString(dashboardJson("ACTIVE")).asJsonObject.apply {
            getAsJsonObject("student").addProperty("legacyProfile", true)
        }
        assertTrue(runCatching { decodeDashboard(extraStudentField.toString()) }.isFailure)
    }

    @Test
    fun invitationFiveContentStatesAndInvalidCodeUseOnePathForScanAndManualEntry() {
        val states = listOf("ACTIVE", "EXPIRED", "REVOKED", "COURSE_CLOSED", "NOT_CURRENT")
        states.forEach { state ->
            val scan = decodeInvitation(InvitationEntry.Scan, 200, invitationJson(state))
            val manual = decodeInvitation(InvitationEntry.Manual, 200, invitationJson(state))
            assertTrue(scan is InvitationOutcome.Content)
            assertEquals((scan as InvitationOutcome.Content).preview, (manual as InvitationOutcome.Content).preview)
            assertEquals(state, scan.preview.status.value)
            assertEquals("Phase 5A Course", scan.preview.course.name)
        }

        listOf(InvitationEntry.Scan, InvitationEntry.Manual).forEach { entry ->
            assertEquals(
                InvitationOutcome.Invalid,
                decodeInvitation(entry, 422, errorJson("INVITATION_INVALID"))
            )
        }
        assertTrue(
            runCatching {
                decodeInvitation(
                    InvitationEntry.Scan,
                    200,
                    invitationJson("ACTIVE").replace("\n}", ",\n  \"fallbackCourseName\": \"legacy\"\n}")
                )
            }.isFailure
        )
    }

    @Test
    fun mediaAllocationUsesPutExactHeadersAndByteBodiesForImageAndVideo() {
        MockWebServer().use { server ->
            server.start()
            server.enqueue(MockResponse().setResponseCode(200))
            server.enqueue(MockResponse().setResponseCode(200))

            val imageBytes = byteArrayOf(0x01, 0x02, 0x03, 0x04)
            val image = decodeAllocation(
                allocationJson(
                    mediaId = "00000000-0000-4000-8000-000000000301",
                    uploadUrl = server.url("/image").toString(),
                    contentType = "image/jpeg"
                )
            )
            uploadBytes(image, imageBytes)
            val imageRequest = server.takeRequest()
            assertEquals("PUT", imageRequest.method)
            assertEquals("/image", imageRequest.path)
            assertEquals("image/jpeg", imageRequest.getHeader("Content-Type"))
            assertEquals("fixture-token", imageRequest.getHeader("x-upload-token"))
            assertArrayEquals(imageBytes, imageRequest.body.readByteArray())

            val videoBytes = byteArrayOf(0x11, 0x12, 0x13, 0x14, 0x15)
            val video = decodeAllocation(
                allocationJson(
                    mediaId = "00000000-0000-4000-8000-000000000302",
                    uploadUrl = server.url("/video").toString(),
                    contentType = "video/mp4"
                )
            )
            uploadBytes(video, videoBytes)
            val videoRequest = server.takeRequest()
            assertEquals("PUT", videoRequest.method)
            assertEquals("/video", videoRequest.path)
            assertEquals("video/mp4", videoRequest.getHeader("Content-Type"))
            assertArrayEquals(videoBytes, videoRequest.body.readByteArray())
        }
    }

    @Test
    fun expiredAllocationRequiresAReplacementBeforeUpload() {
        MockWebServer().use { server ->
            server.start()
            server.enqueue(MockResponse().setResponseCode(200))
            val expired = decodeAllocation(
                allocationJson(
                    mediaId = "00000000-0000-4000-8000-000000000303",
                    uploadUrl = server.url("/expired").toString(),
                    contentType = "image/png",
                    expiresAt = "2026-08-31T23:59:59Z"
                )
            )
            val replacement = decodeAllocation(
                allocationJson(
                    mediaId = "00000000-0000-4000-8000-000000000304",
                    uploadUrl = server.url("/replacement").toString(),
                    contentType = "image/png",
                    expiresAt = "2026-09-01T01:00:00Z"
                )
            )
            val selected = selectUsableAllocation(
                current = expired,
                replacement = replacement,
                now = OffsetDateTime.parse("2026-09-01T00:00:00Z")
            )
            uploadBytes(selected, byteArrayOf(0x21, 0x22))
            assertEquals("/replacement", server.takeRequest().path)
            assertEquals(replacement.mediaAssetId, selected.mediaAssetId)
        }
    }

    @Test
    fun mediaFinalizationHasOneTerminalChannelAndNoErrorFallback() {
        val image = decodeFinalization(200, verifiedImageFinalizationJson)
        val video = decodeFinalization(200, verifiedVideoFinalizationJson)
        assertEquals(MediaOutcome.Terminal("VERIFIED", null, "IMAGE"), image)
        assertEquals(MediaOutcome.Terminal("VERIFIED", null, "VIDEO"), video)

        val rejected = decodeFinalization(200, rejectedFinalizationJson)
        val expired = decodeFinalization(200, expiredFinalizationJson)
        assertEquals(MediaOutcome.Terminal("REJECTED", "MEDIA_CONTENT_INVALID", "IMAGE"), rejected)
        assertEquals(MediaOutcome.Terminal("EXPIRED", "MEDIA_ALLOCATION_EXPIRED", "IMAGE"), expired)

        val dependency = decodeFinalization(503, errorJson("DEPENDENCY_UNAVAILABLE"))
        assertEquals(MediaOutcome.Failure(ErrorCode.DEPENDENCY_UNAVAILABLE), dependency)

        val firstReplay = decodeFinalization(200, verifiedImageFinalizationJson)
        val secondReplay = decodeFinalization(200, verifiedImageFinalizationJson)
        assertEquals(firstReplay, secondReplay)

        val invalidVerifiedCode = verifiedImageFinalizationJson.replace(
            "\"rejectionCode\": null",
            "\"rejectionCode\": \"MEDIA_CONTENT_INVALID\""
        )
        assertTrue(runCatching { decodeFinalization(200, invalidVerifiedCode) }.isFailure)
        assertTrue(
            runCatching {
                decodeFinalization(
                    200,
                    verifiedImageFinalizationJson.replace(
                        "\"status\": \"VERIFIED\"",
                        "\"status\": \"UPLOADED\""
                    )
                )
            }.isFailure
        )
        assertTrue(
            runCatching {
                decodeFinalization(
                    200,
                    rejectedFinalizationJson.replace(
                        "\"rejectionCode\": \"MEDIA_CONTENT_INVALID\"",
                        "\"rejectionCode\": null"
                    )
                )
            }.isFailure
        )
        assertTrue(
            runCatching {
                decodeFinalization(
                    200,
                    expiredFinalizationJson.replace(
                        "\"rejectionCode\": \"MEDIA_ALLOCATION_EXPIRED\"",
                        "\"rejectionCode\": \"MEDIA_CONTENT_INVALID\""
                    )
                )
            }.isFailure
        )
        assertTrue(
            runCatching { decodeFinalization(409, errorJson("MEDIA_CONTENT_INVALID")) }.isFailure
        )
        assertTrue(
            runCatching {
                decodeFinalization(
                    200,
                    verifiedImageFinalizationJson.replace("\n}", ",\n  \"legacyError\": null\n}")
                )
            }.isFailure
        )
    }

    @Test
    fun generatedMediaFinalizationModelDecodesTheFourValidTerminalFixtures() {
        val image = decodeGeneratedFinalization(verifiedImageFinalizationJson)
        assertEquals(MediaFinalizationResult.Status.VERIFIED, image.status)
        assertEquals(MediaFinalizationResult.MediaKind.IMAGE, image.mediaKind)
        assertEquals("image/jpeg", image.contentType)
        assertEquals(4L, image.byteSize)
        assertEquals("a".repeat(64), image.checksumSha256)
        assertNull(image.durationMilliseconds)
        assertNull(image.hasAudio)
        assertEquals(100, image.widthPixels)
        assertEquals(100, image.heightPixels)
        assertNull(image.rejectionCode)

        val video = decodeGeneratedFinalization(verifiedVideoFinalizationJson)
        assertEquals(MediaFinalizationResult.Status.VERIFIED, video.status)
        assertEquals(MediaFinalizationResult.MediaKind.VIDEO, video.mediaKind)
        assertEquals("video/mp4", video.contentType)
        assertEquals(5L, video.byteSize)
        assertEquals("b".repeat(64), video.checksumSha256)
        assertEquals(5000L, video.durationMilliseconds)
        assertEquals(true, video.hasAudio)
        assertEquals(1920, video.widthPixels)
        assertEquals(1080, video.heightPixels)
        assertNull(video.rejectionCode)

        val rejected = decodeGeneratedFinalization(rejectedFinalizationJson)
        assertEquals(MediaFinalizationResult.Status.REJECTED, rejected.status)
        assertNull(rejected.contentType)
        assertNull(rejected.byteSize)
        assertNull(rejected.checksumSha256)
        assertNull(rejected.durationMilliseconds)
        assertNull(rejected.hasAudio)
        assertNull(rejected.widthPixels)
        assertNull(rejected.heightPixels)
        assertEquals(
            MediaFinalizationRejectionCode.MEDIA_CONTENT_INVALID,
            rejected.rejectionCode
        )

        val expired = decodeGeneratedFinalization(expiredFinalizationJson)
        assertEquals(MediaFinalizationResult.Status.EXPIRED, expired.status)
        assertNull(expired.contentType)
        assertNull(expired.byteSize)
        assertNull(expired.checksumSha256)
        assertNull(expired.durationMilliseconds)
        assertNull(expired.hasAudio)
        assertNull(expired.widthPixels)
        assertNull(expired.heightPixels)
        assertEquals(
            MediaFinalizationRejectionCode.MEDIA_ALLOCATION_EXPIRED,
            expired.rejectionCode
        )
    }

    @Test
    fun currentSemesterAbsenceAndDependencyFailureStayDistinct() {
        val content = decodeCurrentSemester(200, semesterJson)
        assertTrue(content is SemesterOutcome.Content)
        assertEquals("2026-2027", (content as SemesterOutcome.Content).semester.academicYear)

        assertEquals(
            SemesterOutcome.Absent,
            decodeCurrentSemester(404, errorJson("RESOURCE_NOT_FOUND"))
        )
        assertEquals(
            SemesterOutcome.Failure(ErrorCode.DEPENDENCY_UNAVAILABLE),
            decodeCurrentSemester(503, errorJson("DEPENDENCY_UNAVAILABLE"))
        )
    }

    private fun decodeActiveSession(status: Int, body: String): SessionOutcome = when (status) {
        200 -> SessionOutcome.Content(decodeSession(body))
        else -> {
            val error = decodeError(body)
            if (status == 404 && error.code == ErrorCode.RESOURCE_NOT_FOUND) {
                SessionOutcome.Idle
            } else {
                SessionOutcome.Failure(error.code)
            }
        }
    }

    private fun decodeStartedSession(status: Int, body: String): SessionOutcome.Content {
        require(status == 201) { "startExerciseSession must use its declared 201 response." }
        return SessionOutcome.Content(decodeSession(body))
    }

    private fun decodeSession(body: String): ExerciseSession {
        val root = strictObject(body, SESSION_KEYS)
        return V1Json.gson.fromJson(root, ExerciseSession::class.java)
    }

    private fun decodeDashboard(body: String): StudentDashboard {
        val root = strictObject(body, DASHBOARD_KEYS)
        strictObject(root.getAsJsonObject("actor"), ACTOR_KEYS)
        val student = strictObject(root.getAsJsonObject("student"), STUDENT_KEYS)
        strictObject(root.getAsJsonObject("currentSemester"), SEMESTER_KEYS)
        require(root.get("studentStatus").asString == student.get("studentStatus").asString) {
            "studentStatus must match student.studentStatus."
        }
        root.get("progress").takeUnless { it.isJsonNull }?.asJsonObject?.let { progress ->
            val progressStudent = progress.getAsJsonObject("student")
            require(progressStudent.get("studentId").asString == student.get("studentId").asString) {
                "progress.student must identify the dashboard student."
            }
        }
        return V1Json.gson.fromJson(root, StudentDashboard::class.java)
    }

    @Suppress("UNUSED_PARAMETER")
    private fun decodeInvitation(entry: InvitationEntry, status: Int, body: String): InvitationOutcome = when (status) {
        200 -> {
            val root = strictObject(body, INVITATION_KEYS)
            val course = strictObject(root.getAsJsonObject("course"), INVITATION_COURSE_KEYS)
            strictObject(course.getAsJsonObject("semester"), SEMESTER_KEYS)
            strictObject(course.getAsJsonObject("responsibleTeacher"), TEACHER_KEYS)
            InvitationOutcome.Content(
                V1Json.gson.fromJson(root, CourseInvitationPreview::class.java)
            )
        }
        422 -> {
            val error = decodeError(body)
            require(error.code == ErrorCode.INVITATION_INVALID)
            InvitationOutcome.Invalid
        }
        else -> InvitationOutcome.Failure(decodeError(body).code)
    }

    private fun decodeAllocation(body: String): MediaAllocation {
        val root = strictObject(body, ALLOCATION_KEYS)
        val allocation = V1Json.gson.fromJson(root, MediaAllocation::class.java)
        require(allocation.uploadMethod == DirectUploadHttpMethod.PUT)
        return allocation
    }

    private fun uploadBytes(allocation: MediaAllocation, bytes: ByteArray) {
        val request = Request.Builder()
            .url(allocation.uploadUrl.toURL())
            .method(allocation.uploadMethod.value, bytes.toRequestBody())
            .apply {
                allocation.requiredHeaders.forEach { (name, value) -> header(name, value) }
            }
            .build()
        OkHttpClient().newCall(request).execute().use { response ->
            require(response.isSuccessful)
        }
    }

    private fun selectUsableAllocation(
        current: MediaAllocation,
        replacement: MediaAllocation,
        now: OffsetDateTime
    ): MediaAllocation = if (current.expiresAt.isAfter(now)) current else replacement

    private fun decodeFinalization(status: Int, body: String): MediaOutcome = when (status) {
        200 -> {
            val root = strictObject(body, FINALIZATION_KEYS)
            val terminalStatus = root.get("status").asString
            val rejectionCode = root.get("rejectionCode")
                .takeUnless { it.isJsonNull }
                ?.asString
            when (terminalStatus) {
                "VERIFIED" -> require(rejectionCode == null)
                "REJECTED" -> require(rejectionCode in REJECTION_CODES)
                "EXPIRED" -> require(rejectionCode == "MEDIA_ALLOCATION_EXPIRED")
                else -> error("Unexpected finalization status: $terminalStatus")
            }
            val generated = decodeGeneratedFinalization(root)
            MediaOutcome.Terminal(
                status = generated.status.value,
                rejectionCode = generated.rejectionCode?.value,
                mediaKind = generated.mediaKind.value
            )
        }
        else -> {
            val error = decodeError(body)
            require(error.code in FINALIZATION_ERROR_CODES) {
                "Expected media outcomes must not use an ErrorEnvelope fallback."
            }
            MediaOutcome.Failure(error.code)
        }
    }

    private fun decodeGeneratedFinalization(body: String): MediaFinalizationResult =
        decodeGeneratedFinalization(JsonParser.parseString(body).asJsonObject)

    private fun decodeGeneratedFinalization(root: JsonObject): MediaFinalizationResult =
        V1Json.gson.fromJson(root, MediaFinalizationResult::class.java)

    private fun decodeCurrentSemester(status: Int, body: String): SemesterOutcome = when (status) {
        200 -> SemesterOutcome.Content(
            V1Json.gson.fromJson(strictObject(body, SEMESTER_KEYS), SemesterSummary::class.java)
        )
        else -> {
            val error = decodeError(body)
            if (status == 404 && error.code == ErrorCode.RESOURCE_NOT_FOUND) {
                SemesterOutcome.Absent
            } else {
                SemesterOutcome.Failure(error.code)
            }
        }
    }

    private fun decodeError(body: String): ErrorEnvelope = V1Json.gson.fromJson(
        strictObject(body, ERROR_KEYS),
        ErrorEnvelope::class.java
    )

    private fun strictObject(body: String, expectedKeys: Set<String>): JsonObject =
        strictObject(JsonParser.parseString(body).asJsonObject, expectedKeys)

    private fun strictObject(value: JsonObject, expectedKeys: Set<String>): JsonObject {
        require(value.keySet() == expectedKeys) {
            "Fixture fields differ from the locked Contract: expected=$expectedKeys actual=${value.keySet()}"
        }
        return value
    }

    private fun operationBlock(contract: String, operationId: String): String {
        val operationIndex = contract.indexOf("operationId: $operationId")
        require(operationIndex >= 0) { "Missing operationId $operationId" }
        val pathStart = contract.lastIndexOf("\n  /", operationIndex).let { if (it >= 0) it + 1 else 0 }
        val nextPath = contract.indexOf("\n  /", operationIndex + 1)
        return contract.substring(pathStart, if (nextPath >= 0) nextPath else contract.length)
    }

    private val androidRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    private val phase5aContract: File by lazy {
        File(requireNotNull(androidRoot.parentFile), "contracts/openapi.yaml").also {
            require(it.isFile) { "Phase 5A contract is missing: ${it.absolutePath}" }
        }
    }

    private sealed interface SessionOutcome {
        data class Content(val session: ExerciseSession) : SessionOutcome
        data object Idle : SessionOutcome
        data class Failure(val code: ErrorCode) : SessionOutcome
    }

    private enum class InvitationEntry { Scan, Manual }

    private sealed interface InvitationOutcome {
        data class Content(val preview: CourseInvitationPreview) : InvitationOutcome
        data object Invalid : InvitationOutcome
        data class Failure(val code: ErrorCode) : InvitationOutcome
    }

    private sealed interface MediaOutcome {
        data class Terminal(
            val status: String,
            val rejectionCode: String?,
            val mediaKind: String
        ) : MediaOutcome

        data class Failure(val code: ErrorCode) : MediaOutcome
    }

    private sealed interface SemesterOutcome {
        data class Content(val semester: SemesterSummary) : SemesterOutcome
        data object Absent : SemesterOutcome
        data class Failure(val code: ErrorCode) : SemesterOutcome
    }

    private companion object {
        val SESSION_KEYS = setOf(
            "sessionId",
            "courseId",
            "enrollmentId",
            "status",
            "businessDate",
            "startedAt",
            "pausedAt",
            "completedAt",
            "elapsedActiveSeconds",
            "actualDurationSeconds",
            "stateVersion"
        )
        val DASHBOARD_KEYS = setOf(
            "actor",
            "student",
            "studentStatus",
            "currentSemester",
            "course",
            "progress",
            "enduranceOutcome",
            "finalGrade",
            "unreadNotificationCount",
            "generatedAt"
        )
        val ACTOR_KEYS = setOf(
            "userId",
            "organizationId",
            "role",
            "displayName",
            "verifiedEmail",
            "accountState",
            "adminKind",
            "adminPermissions",
            "mustChangePassword",
            "version"
        )
        val STUDENT_KEYS = setOf(
            "studentId",
            "studentNumber",
            "name",
            "gender",
            "gradeYear",
            "college",
            "major",
            "administrativeClass",
            "studentStatus"
        )
        val SEMESTER_KEYS = setOf(
            "semesterId",
            "academicYear",
            "termType",
            "displayName",
            "startDate",
            "endDate",
            "status"
        )
        val INVITATION_KEYS = setOf("status", "course", "expiresAt")
        val INVITATION_COURSE_KEYS = setOf("courseId", "name", "semester", "responsibleTeacher")
        val TEACHER_KEYS = setOf("teacherId", "name")
        val ALLOCATION_KEYS = setOf(
            "mediaAssetId",
            "purpose",
            "status",
            "uploadUrl",
            "uploadMethod",
            "requiredHeaders",
            "expiresAt"
        )
        val FINALIZATION_KEYS = setOf(
            "mediaAssetId",
            "purpose",
            "mediaKind",
            "contentType",
            "byteSize",
            "checksumSha256",
            "durationMilliseconds",
            "hasAudio",
            "widthPixels",
            "heightPixels",
            "status",
            "rejectionCode",
            "version"
        )
        val ERROR_KEYS = setOf("code", "message", "requestId", "details")
        val REJECTION_CODES = setOf(
            "MEDIA_CONTENT_INVALID",
            "MEDIA_LIMIT_EXCEEDED",
            "PAYLOAD_TOO_LARGE",
            "UNSUPPORTED_MEDIA_TYPE"
        )
        val FINALIZATION_ERROR_CODES = setOf(
            ErrorCode.DEPENDENCY_UNAVAILABLE,
            ErrorCode.INVALID_REQUEST,
            ErrorCode.RESOURCE_NOT_FOUND,
            ErrorCode.AUTHENTICATION_REQUIRED,
            ErrorCode.FORBIDDEN,
            ErrorCode.SYSTEM_MAINTENANCE,
            ErrorCode.IDEMPOTENCY_KEY_REUSED,
            ErrorCode.RATE_LIMITED,
            ErrorCode.INTERNAL_ERROR
        )

        val activeSessionJson = """
            {
              "sessionId": "00000000-0000-4000-8000-000000000101",
              "courseId": "00000000-0000-4000-8000-000000000102",
              "enrollmentId": "00000000-0000-4000-8000-000000000103",
              "status": "ACTIVE",
              "businessDate": "2026-09-01",
              "startedAt": "2026-09-01T00:00:00Z",
              "pausedAt": null,
              "completedAt": null,
              "elapsedActiveSeconds": 60,
              "actualDurationSeconds": null,
              "stateVersion": 1
            }
        """.trimIndent()

        val semesterJson = """
            {
              "semesterId": "00000000-0000-4000-8000-000000000201",
              "academicYear": "2026-2027",
              "termType": "FIRST",
              "displayName": "2026-2027 第一学期",
              "startDate": "2026-09-01",
              "endDate": "2027-01-31",
              "status": "CURRENT"
            }
        """.trimIndent()

        fun dashboardJson(status: String): String = """
            {
              "actor": {
                "userId": "00000000-0000-4000-8000-000000000202",
                "organizationId": "00000000-0000-4000-8000-000000000203",
                "role": "STUDENT",
                "displayName": "Ada Student",
                "verifiedEmail": "ada@bnbu.edu.cn",
                "accountState": "ACTIVE",
                "adminKind": null,
                "adminPermissions": [],
                "mustChangePassword": false,
                "version": 2
              },
              "student": {
                "studentId": "00000000-0000-4000-8000-000000000204",
                "studentNumber": "S20260001",
                "name": "Ada Student",
                "gender": "FEMALE",
                "gradeYear": 1,
                "college": "School of AI",
                "major": "Computer Science",
                "administrativeClass": "CS-01",
                "studentStatus": "$status"
              },
              "studentStatus": "$status",
              "currentSemester": $semesterJson,
              "course": null,
              "progress": null,
              "enduranceOutcome": null,
              "finalGrade": null,
              "unreadNotificationCount": 0,
              "generatedAt": "2026-09-01T00:00:00Z"
            }
        """.trimIndent()

        fun invitationJson(status: String): String = """
            {
              "status": "$status",
              "course": {
                "courseId": "00000000-0000-4000-8000-000000000211",
                "name": "Phase 5A Course",
                "semester": $semesterJson,
                "responsibleTeacher": {
                  "teacherId": "00000000-0000-4000-8000-000000000212",
                  "name": "Teacher One"
                }
              },
              "expiresAt": "2026-09-30T00:00:00Z"
            }
        """.trimIndent()

        fun allocationJson(
            mediaId: String,
            uploadUrl: String,
            contentType: String,
            expiresAt: String = "2026-09-02T00:00:00Z"
        ): String = """
            {
              "mediaAssetId": "$mediaId",
              "purpose": "RECORD_EVIDENCE",
              "status": "ALLOCATED",
              "uploadUrl": "$uploadUrl",
              "uploadMethod": "PUT",
              "requiredHeaders": {
                "Content-Type": "$contentType",
                "x-upload-token": "fixture-token"
              },
              "expiresAt": "$expiresAt"
            }
        """.trimIndent()

        val verifiedImageFinalizationJson = finalizationJson(
            mediaId = "00000000-0000-4000-8000-000000000401",
            mediaKind = "IMAGE",
            contentType = "\"image/jpeg\"",
            byteSize = "4",
            checksum = "\"${"a".repeat(64)}\"",
            duration = "null",
            hasAudio = "null",
            width = "100",
            height = "100",
            status = "VERIFIED",
            rejectionCode = "null"
        )

        val verifiedVideoFinalizationJson = finalizationJson(
            mediaId = "00000000-0000-4000-8000-000000000402",
            mediaKind = "VIDEO",
            contentType = "\"video/mp4\"",
            byteSize = "5",
            checksum = "\"${"b".repeat(64)}\"",
            duration = "5000",
            hasAudio = "true",
            width = "1920",
            height = "1080",
            status = "VERIFIED",
            rejectionCode = "null"
        )

        val rejectedFinalizationJson = finalizationJson(
            mediaId = "00000000-0000-4000-8000-000000000403",
            mediaKind = "IMAGE",
            contentType = "null",
            byteSize = "null",
            checksum = "null",
            duration = "null",
            hasAudio = "null",
            width = "null",
            height = "null",
            status = "REJECTED",
            rejectionCode = "\"MEDIA_CONTENT_INVALID\""
        )

        val expiredFinalizationJson = finalizationJson(
            mediaId = "00000000-0000-4000-8000-000000000404",
            mediaKind = "IMAGE",
            contentType = "null",
            byteSize = "null",
            checksum = "null",
            duration = "null",
            hasAudio = "null",
            width = "null",
            height = "null",
            status = "EXPIRED",
            rejectionCode = "\"MEDIA_ALLOCATION_EXPIRED\""
        )

        fun finalizationJson(
            mediaId: String,
            mediaKind: String,
            contentType: String,
            byteSize: String,
            checksum: String,
            duration: String,
            hasAudio: String,
            width: String,
            height: String,
            status: String,
            rejectionCode: String
        ): String = """
            {
              "mediaAssetId": "$mediaId",
              "purpose": "RECORD_EVIDENCE",
              "mediaKind": "$mediaKind",
              "contentType": $contentType,
              "byteSize": $byteSize,
              "checksumSha256": $checksum,
              "durationMilliseconds": $duration,
              "hasAudio": $hasAudio,
              "widthPixels": $width,
              "heightPixels": $height,
              "status": "$status",
              "rejectionCode": $rejectionCode,
              "version": 1
            }
        """.trimIndent()

        fun errorJson(code: String): String = """
            {
              "code": "$code",
              "message": "Fixture error",
              "requestId": "phase5a-request",
              "details": null
            }
        """.trimIndent()
    }
}
