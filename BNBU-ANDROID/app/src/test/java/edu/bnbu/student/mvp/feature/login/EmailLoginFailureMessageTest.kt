package edu.bnbu.student.mvp.feature.login

import com.google.gson.JsonObject
import edu.bnbu.student.mvp.core.network.v1.V1ApiError
import edu.bnbu.student.mvp.core.network.v1.V1ErrorCode
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import edu.bnbu.student.mvp.core.network.v1.V1NetworkException
import edu.bnbu.student.mvp.core.network.v1.V1ProtocolException
import java.io.IOException
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EmailLoginFailureMessageTest {
    @Test
    fun invalidVerificationCodeKeepsStableNonEnumeratingCopy() {
        val message = emailSignInErrorMessage(
            httpError(
                code = "AUTH_VERIFICATION_CODE_INVALID",
                requestId = "req-email-invalid",
                serverMessage = "OTP 123456 for challengeId challenge-secret"
            )
        )

        assertTrue(message.contains("错误、过期或已使用"))
        assertTrue(message.contains("req-email-invalid"))
        assertFalse(message.contains("123456"))
        assertFalse(message.contains("challenge-secret"))
    }

    @Test
    fun accountSpecificHttpDetailsRemainHidden() {
        val secretAccount = "student-secret@example.invalid"
        val message = emailSignInErrorMessage(
            httpError(
                code = "AUTH_ACCOUNT_NOT_FOUND",
                requestId = "req-email-generic",
                serverMessage = "$secretAccount does not exist"
            )
        )

        assertTrue(message.contains("登录服务未能处理请求"))
        assertTrue(message.contains("req-email-generic"))
        assertFalse(message.contains("AUTH_ACCOUNT_NOT_FOUND"))
        assertFalse(message.contains(secretAccount))
    }

    @Test
    fun networkAndProtocolFailuresAreSeparatedWithoutLeakingExceptionDetails() {
        val network = emailSignInErrorMessage(
            V1NetworkException(
                operationId = "verifyStudentSignInCode",
                cause = IOException("challengeId=network-secret"),
                requestId = "req-email-network"
            )
        )
        val protocol = emailSignInErrorMessage(
            V1ProtocolException(
                operationId = "verifyStudentSignInCode",
                statusCode = 200,
                requestId = "unsafe request id\nOTP=protocol-secret",
                reason = "challengeId=protocol-secret"
            )
        )

        assertTrue(network.contains("网络连接失败"))
        assertTrue(network.contains("req-email-network"))
        assertFalse(network.contains("network-secret"))
        assertTrue(protocol.contains("不符合接口约定"))
        assertTrue(protocol.contains("诊断编号：暂不可用"))
        assertFalse(protocol.contains("protocol-secret"))
        assertFalse(protocol.contains("OTP="))
    }

    private fun httpError(
        code: String,
        requestId: String,
        serverMessage: String
    ) = V1HttpException(
        operationId = "verifyStudentSignInCode",
        statusCode = 400,
        error = V1ApiError(
            code = V1ErrorCode(code),
            serverMessage = serverMessage,
            details = JsonObject().apply {
                addProperty("challengeId", "details-secret")
                addProperty("otp", "654321")
            },
            requestId = requestId,
            timestamp = "2026-08-24T00:00:00Z"
        )
    )
}
