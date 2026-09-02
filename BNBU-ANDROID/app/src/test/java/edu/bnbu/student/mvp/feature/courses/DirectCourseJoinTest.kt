package edu.bnbu.student.mvp.feature.courses

import com.google.gson.JsonObject
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.core.network.v1.V1ApiError
import edu.bnbu.student.mvp.core.network.v1.V1ErrorCode
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import edu.bnbu.student.mvp.core.network.v1.V1NetworkException
import edu.bnbu.student.mvp.core.network.v1.V1ProtocolException
import java.io.IOException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DirectCourseJoinTest {
    @Test
    fun validatesRequiredIdentityFields() {
        assertNotNull(validateDirectCourseJoin("", "20260001", "male", "2026"))
        assertNotNull(validateDirectCourseJoin("Student", "bad", "male", "2026"))
        assertNotNull(validateDirectCourseJoin("Student", "20260001", "", "2026"))
        assertNotNull(validateDirectCourseJoin("Student", "20260001", "female", ""))
        assertNotNull(validateDirectCourseJoin("Student", "20260001", "female", "freshman"))
        assertNotNull(validateDirectCourseJoin("Student", "20260001", "female", "999"))
        assertNotNull(validateDirectCourseJoin("Student", "20260001", "female", "10000"))
        assertNotNull(validateDirectCourseJoin("Student", "20260001", "other", "2026"))
        assertNull(validateDirectCourseJoin("Student", "20260001", "male", "2021"))
        assertNull(validateDirectCourseJoin("Student", "20260001", "female", "2028"))
        assertNull(validateDirectCourseJoin("Student", "20260001", "female", "9999"))
    }

    @Test
    fun enforcesContractFieldBoundaries() {
        assertNull(validateDirectCourseJoin("S".repeat(64), "A".repeat(32), "male", "2026"))
        assertNotNull(validateDirectCourseJoin("S".repeat(65), "20260001", "male", "2026"))
        assertNotNull(validateDirectCourseJoin("Student", "A".repeat(33), "male", "2026"))
    }

    @Test
    fun mapsContractJoinFailuresWithoutParsingRawExceptionMessages() {
        assertTrue(
            directJoinErrorMessage(
                ApiHttpException(409, "{\"code\":\"ENROLLMENT_ALREADY_ACTIVE\"}")
            )
                .contains("已经加入")
        )
        assertTrue(directJoinErrorMessage(IOException("offline")).contains("网络"))
        assertTrue(
            directJoinErrorMessage(
                ApiHttpException(409, "{\"code\":\"ENROLLMENT_SEMESTER_CONFLICT\"}")
            )
                .contains("其他体育课程")
        )
        val raw = directJoinErrorMessage(
            IllegalArgumentException("JOIN_RESPONSE_COURSE_MISMATCH token=secret")
        )
        assertTrue(raw.contains("课程服务未能完成入班"))
        assertTrue(!raw.contains("JOIN_RESPONSE_COURSE_MISMATCH"))
        assertTrue(!raw.contains("token=secret"))
    }

    @Test
    fun separatesV1TransportFailuresAndKeepsDiagnosticCorrelation() {
        val network = directJoinErrorMessage(
            V1NetworkException(
                operationId = "joinClassSectionWithInvite",
                cause = IOException("joinCapability=secret"),
                requestId = "req-join-network"
            )
        )
        val http = directJoinErrorMessage(
            v1HttpError("ENROLLMENT_SEMESTER_CONFLICT", "req-join-http")
        )
        val protocol = directJoinErrorMessage(
            V1ProtocolException(
                operationId = "joinClassSectionWithInvite",
                statusCode = 201,
                requestId = "req-join-protocol",
                reason = "joinCapability=secret"
            )
        )

        assertTrue(network.contains("网络连接失败"))
        assertTrue(network.contains("req-join-network"))
        assertTrue(http.contains("其他体育课程"))
        assertTrue(http.contains("req-join-http"))
        assertTrue(protocol.contains("不符合接口约定"))
        assertTrue(protocol.contains("req-join-protocol"))
        assertTrue(!network.contains("joinCapability=secret"))
        assertTrue(!protocol.contains("joinCapability=secret"))
    }

    private fun v1HttpError(code: String, requestId: String) = V1HttpException(
        operationId = "joinClassSectionWithInvite",
        statusCode = 409,
        error = V1ApiError(
            code = V1ErrorCode(code),
            serverMessage = "invite-token-secret",
            details = JsonObject().apply { addProperty("joinCapability", "secret") },
            requestId = requestId,
            timestamp = "2026-08-24T00:00:00Z"
        )
    )
}
