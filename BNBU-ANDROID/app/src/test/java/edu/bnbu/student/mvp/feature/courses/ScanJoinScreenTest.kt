package edu.bnbu.student.mvp.feature.courses

import com.google.gson.JsonObject
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.core.network.v1.V1ApiError
import edu.bnbu.student.mvp.core.network.v1.V1ErrorCode
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import edu.bnbu.student.mvp.core.network.v1.V1NetworkException
import edu.bnbu.student.mvp.core.network.v1.V1ProtocolException
import edu.bnbu.student.mvp.core.network.v1.generated.CourseInvitePreview
import java.io.IOException
import java.time.OffsetDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ScanJoinScreenTest {
    @Test
    fun extractsInviteCodeFromExpectedQrUrl() {
        val opaqueToken = "019ff95a-84ad-cd03-f69b34d4.wKlhxS_lbM"
        assertEquals(
            opaqueToken,
            inviteCodeFromQr("https://sports.example.com/join/$opaqueToken")
        )
    }

    @Test
    fun rejectsUrlsOutsideTheCourseJoinFormat() {
        assertNull(inviteCodeFromQr("https://sports.example.com/course/BNBU-7K3P9Q"))
        assertNull(inviteCodeFromQr("http://sports.example.com/join/BNBU-7K3P9Q"))
        assertNull(inviteCodeFromQr("BNBU-7K3P9Q"))
    }

    @Test
    fun validatesManualInviteCodes() {
        assertTrue(isInviteCode("019ff95a-84ad-cd03-f69b34d4.wKlhxS_lbM"))
        assertTrue(isInviteCode("  0123456789abcdef  "))
        assertFalse(isInviteCode("bad code"))
        assertFalse(isInviteCode("x".repeat(513)))
    }

    @Test
    fun simulatedScanResultIsClearlyMarkedAsPreviewOnly() {
        val course = simulatedCourseJoinInfo()

        assertTrue(course.isDemoScanResult)
        assertEquals("大学体育（一）", course.name)
        assertEquals("陈若宁", course.teacher)
        assertFalse(CourseJoinInfo::class.java.declaredFields.any { it.name in setOf("courseNumber", "section") })
    }

    @Test
    fun recognizesExpiredAndRevokedInvitations() {
        assertTrue(isInviteUnavailableError(ApiHttpException(410, "INVITE_EXPIRED")))
        assertFalse(isInviteUnavailableError(ApiHttpException(404, "invite revoked")))
        assertFalse(isInviteUnavailableError(ApiHttpException(404, "not found")))
        assertFalse(isInviteUnavailableError(ApiHttpException(500, "server error")))
    }

    @Test
    fun mapsTheGeneratedV1PreviewWithoutLegacyCourseDtos() {
        val course = CourseInvitePreview(
            classSectionId = "section-1",
            displayName = "Section One",
            courseCode = "PE-101",
            courseName = "Physical Education",
            semesterDisplayName = "2026 Fall",
            teacherDisplayName = "Teacher",
            enrollmentOpen = true,
            expiresAt = OffsetDateTime.parse("2026-12-01T00:00:00Z")
        ).toCourseJoinInfo()

        assertEquals("section-1", course.id)
        assertEquals("Physical Education", course.name)
    }

    @Test
    fun previewMappingKeepsOnlyStudentBusinessDisplayFields() {
        val course = CourseInvitePreview(
            classSectionId = "server-section",
            displayName = "Server Section",
            courseCode = "PE-SERVER",
            courseName = "Server Course",
            semesterDisplayName = "Server Semester",
            teacherDisplayName = "Server Teacher",
            enrollmentOpen = true,
            expiresAt = OffsetDateTime.parse("2026-12-01T00:00:00Z")
        ).toCourseJoinInfo()

        assertEquals("server-section", course.id)
        assertEquals("Server Course", course.name)
        assertEquals("Server Teacher", course.teacher)
        assertEquals("Server Semester", course.semester)
    }

    @Test
    fun separatesV1NetworkHttpAndProtocolFailuresWithSafeDiagnostics() {
        val network = inviteLookupErrorMessage(
            V1NetworkException(
                operationId = "previewCourseInvite",
                cause = IOException("invite-token-secret"),
                requestId = "req-invite-network"
            )
        )
        val http = inviteLookupErrorMessage(
            v1HttpError(
                status = 403,
                code = "COURSE_CLASS_SECTION_NOT_JOINABLE",
                requestId = "req-invite-http"
            )
        )
        val protocol = inviteLookupErrorMessage(
            V1ProtocolException(
                operationId = "previewCourseInvite",
                statusCode = 200,
                requestId = "req-invite-protocol",
                reason = "invite-token-secret"
            )
        )

        assertTrue(network.contains("网络连接失败"))
        assertTrue(network.contains("req-invite-network"))
        assertTrue(http.contains("关闭加入"))
        assertTrue(http.contains("req-invite-http"))
        assertTrue(protocol.contains("不符合接口约定"))
        assertTrue(protocol.contains("req-invite-protocol"))
        assertFalse(network.contains("invite-token-secret"))
        assertFalse(protocol.contains("invite-token-secret"))
    }

    private fun v1HttpError(
        status: Int,
        code: String,
        requestId: String
    ) = V1HttpException(
        operationId = "previewCourseInvite",
        statusCode = status,
        error = V1ApiError(
            code = V1ErrorCode(code),
            serverMessage = "invite-token-secret",
            details = JsonObject().apply { addProperty("inviteToken", "invite-token-secret") },
            requestId = requestId,
            timestamp = "2026-08-24T00:00:00Z"
        )
    )
}
