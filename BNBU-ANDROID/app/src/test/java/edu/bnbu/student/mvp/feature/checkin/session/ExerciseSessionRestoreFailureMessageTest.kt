package edu.bnbu.student.mvp.feature.checkin.session

import com.google.gson.JsonObject
import edu.bnbu.student.mvp.core.network.v1.ExerciseSessionClientContextMissingException
import edu.bnbu.student.mvp.core.network.v1.V1ApiError
import edu.bnbu.student.mvp.core.network.v1.V1ErrorCode
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import edu.bnbu.student.mvp.core.network.v1.V1NetworkException
import edu.bnbu.student.mvp.core.network.v1.V1ProtocolException
import java.io.IOException
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseSessionRestoreFailureMessageTest {
    @Test
    fun missingClientContextIsNotReportedAsANetworkFailureAndKeepsRequestId() {
        val message = exerciseSessionRestoreFailureMessage(
            ExerciseSessionClientContextMissingException(
                sessionId = "session-from-another-installation",
                requestId = "req-active-restore"
            )
        )

        assertTrue(message.contains("req-active-restore"))
        assertFalse(message.contains("网络请求失败"))
    }

    @Test
    fun actualTransportFailureKeepsTheSafeNetworkMessage() {
        val message = exerciseSessionRestoreFailureMessage(
            V1NetworkException(
                operationId = "getActiveExerciseSession",
                cause = IOException("offline"),
                requestId = "req-client-network"
            )
        )

        assertTrue(message.contains("网络连接失败"))
        assertTrue(message.contains("req-client-network"))
    }

    @Test
    fun httpFailureUsesSafeCopyAndRequestIdWithoutServerMessageOrRawCode() {
        val message = exerciseSessionRestoreFailureMessage(
            V1HttpException(
                operationId = "getActiveExerciseSession",
                statusCode = 503,
                error = V1ApiError(
                    code = V1ErrorCode("SYSTEM_SERVICE_UNAVAILABLE"),
                    serverMessage = "sensitive server detail",
                    details = JsonObject(),
                    requestId = "req-http-restore",
                    timestamp = "2026-08-24T00:00:00Z"
                )
            )
        )

        assertTrue(message.contains("服务暂时不可用"))
        assertTrue(message.contains("req-http-restore"))
        assertFalse(message.contains("SYSTEM_SERVICE_UNAVAILABLE"))
        assertFalse(message.contains("sensitive server detail"))
        assertFalse(message.contains("网络请求失败"))
    }

    @Test
    fun missingProtocolRequestIdUsesASafeFallback() {
        val message = exerciseSessionRestoreFailureMessage(
            V1ProtocolException(
                operationId = "getActiveExerciseSession",
                statusCode = 200,
                requestId = " ",
                reason = "unexpected response"
            )
        )

        assertTrue(message.contains("暂不可用") || message.contains("unavailable"))
        assertFalse(message.contains("网络请求失败"))
    }

    @Test
    fun unsafeRequestIdsNeverReachTheRestoreMessage() {
        val secret = "unsafe request id\nAuthorization: Bearer secret"
        val message = exerciseSessionRestoreFailureMessage(
            ExerciseSessionClientContextMissingException(
                sessionId = "session-from-another-installation",
                requestId = secret
            )
        )

        assertTrue(message.contains("暂不可用") || message.contains("unavailable"))
        assertFalse(message.contains(secret))
        assertFalse(message.contains("Bearer secret"))
    }
}
