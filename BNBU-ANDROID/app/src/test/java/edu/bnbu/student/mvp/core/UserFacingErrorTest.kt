package edu.bnbu.student.mvp.core.error

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import edu.bnbu.student.mvp.core.network.v1.V1ApiError
import edu.bnbu.student.mvp.core.network.v1.V1ErrorCode
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import edu.bnbu.student.mvp.core.network.v1.V1NetworkException
import java.io.IOException
import java.net.SocketTimeoutException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UserFacingErrorTest {
    @Test
    fun backendMessageAndInvalidIdentifiersNeverReachUserCopyOrLogger() {
        val secret = "otp=123456 token=secret-token"
        val mapped = ClientErrorMapper.map(
            httpError(
                status = 500,
                code = "INVALID\n$secret",
                requestId = "request-id\n$secret",
                serverMessage = "SQL failed: $secret"
            ),
            ClientErrorContext.RECORD
        )

        assertEquals("UNKNOWN", mapped.code)
        assertNull(mapped.requestId)
        assertFalse(mapped.legacySafeText().contains(secret))

        val logLine = SafeClientLogger.formatEvent(
            mapped.copy(code = "BAD\n$secret", requestId = "req\n$secret"),
            ClientErrorContext.RECORD,
            httpStatus = 500
        )
        assertTrue(logLine.contains("code=UNKNOWN"))
        assertTrue(logLine.contains("requestId=unavailable"))
        assertFalse(logLine.contains(secret))
        assertFalse(logLine.contains("SQL"))
    }

    @Test
    fun requestIdUsesContractBoundOfOneToSixtyFourCharacters() {
        val sixtyFour = "r".repeat(64)
        val accepted = ClientErrorMapper.map(
            httpError(409, "CONFLICT_VERSION_MISMATCH", sixtyFour),
            ClientErrorContext.SESSION
        )
        val rejected = ClientErrorMapper.map(
            httpError(409, "CONFLICT_VERSION_MISMATCH", "r".repeat(65)),
            ClientErrorContext.SESSION
        )

        assertEquals(sixtyFour, accepted.requestId)
        assertNull(rejected.requestId)
    }

    @Test
    fun typedDetailsRetainOnlySafeFieldAndStateAllowlist() {
        val details = JsonObject().apply {
            addProperty("retryable", true)
            addProperty("retryAfterSeconds", 30)
            addProperty("currentState", "ACTIVE")
            addProperty("expectedVersion", 3)
            addProperty("actualVersion", 4)
            addProperty("startedAt", "2026-08-24T01:02:03Z")
            addProperty("status", "PAUSED")
            addProperty("startedOnCurrentAuthSession", false)
            addProperty("rawMessage", "password=never-retain")
            add("fieldErrors", JsonArray().apply {
                add(JsonObject().apply {
                    addProperty("field", "email")
                    addProperty("code", "VALIDATION_FORMAT_INVALID")
                    addProperty("i18nKey", "secret.internal.key")
                    addProperty("params", "otp=654321")
                })
                add(JsonObject().apply {
                    addProperty("field", "bad\nfield")
                    addProperty("code", "VALIDATION_FIELD_REQUIRED")
                })
            })
        }

        val safe = SafeErrorDetails.from(details)

        assertEquals(true, safe.retryable)
        assertEquals(30L, safe.retryAfterSeconds)
        assertEquals("ACTIVE", safe.currentState)
        assertEquals(3L, safe.expectedVersion)
        assertEquals(4L, safe.actualVersion)
        assertEquals("PAUSED", safe.status)
        assertEquals(false, safe.startedOnCurrentAuthSession)
        assertEquals(1, safe.fieldErrors.size)
        assertEquals("email", safe.fieldErrors.single().field)
        assertFalse(safe.toString().contains("password"))
        assertFalse(safe.toString().contains("654321"))
        assertFalse(safe.toString().contains("i18n"))
    }

    @Test
    fun commonHttpClassesMapToStableActions() {
        val unauthorized = ClientErrorMapper.map(
            httpError(401, "AUTH_TOKEN_EXPIRED", "req-401"),
            ClientErrorContext.SESSION
        )
        val forbidden = ClientErrorMapper.map(
            httpError(403, "PERMISSION_DENIED", "req-403"),
            ClientErrorContext.RECORD
        )
        val conflict = ClientErrorMapper.map(
            httpError(409, "CONFLICT_VERSION_MISMATCH", "req-409"),
            ClientErrorContext.SESSION
        )
        val validation = ClientErrorMapper.map(
            httpError(422, "VALIDATION_FAILED", "req-422"),
            ClientErrorContext.JOIN
        )
        val rateLimited = ClientErrorMapper.map(
            httpError(429, "AUTH_RATE_LIMITED", "req-429"),
            ClientErrorContext.OTP
        )
        val unavailable = ClientErrorMapper.map(
            httpError(503, "SYSTEM_SERVICE_UNAVAILABLE", "req-503"),
            ClientErrorContext.EXEMPTION
        )

        assertFalse(unauthorized.retryable)
        assertFalse(forbidden.retryable)
        assertTrue(conflict.retryable)
        assertFalse(validation.retryable)
        assertTrue(rateLimited.retryable)
        assertTrue(unavailable.retryable)
    }

    @Test
    fun timeoutAndOrdinaryNetworkFailureAreSeparatedWithoutCauseLeakage() {
        val timeout = ClientErrorMapper.map(
            V1NetworkException(
                operationId = "submitExerciseRecord",
                cause = SocketTimeoutException("token=timeout-secret"),
                requestId = "req-timeout"
            ),
            ClientErrorContext.RECORD
        )
        val offline = ClientErrorMapper.map(
            V1NetworkException(
                operationId = "submitExerciseRecord",
                cause = IOException("password=offline-secret"),
                requestId = "req-offline"
            ),
            ClientErrorContext.RECORD
        )

        assertEquals("CLIENT_TIMEOUT", timeout.code)
        assertEquals("CLIENT_NETWORK_UNAVAILABLE", offline.code)
        assertFalse(timeout.legacySafeText().contains("timeout-secret"))
        assertFalse(offline.legacySafeText().contains("offline-secret"))
    }

    @Test
    fun accountDeletionBlockersHaveSpecificSafeRecoveryActions() {
        val active = ClientErrorMapper.map(
            httpError(
                409,
                "ACCOUNT_DELETION_ACTIVE_SESSION",
                "req-active",
                "SQL session secret=never-show"
            ),
            ClientErrorContext.ACCOUNT_DELETION
        )
        val review = ClientErrorMapper.map(
            httpError(409, "ACCOUNT_DELETION_PENDING_REVIEW", "req-review"),
            ClientErrorContext.ACCOUNT_DELETION
        )
        val reauth = ClientErrorMapper.map(
            httpError(401, "ACCOUNT_DELETION_REAUTH_REQUIRED", "req-reauth"),
            ClientErrorContext.ACCOUNT_DELETION
        )

        assertEquals("ACCOUNT_DELETION_ACTIVE_SESSION", active.code)
        assertTrue(active.action.contains("运动") || active.action.contains("exercise"))
        assertFalse(active.legacySafeText().contains("SQL"))
        assertTrue(review.action.contains("审核") || review.action.contains("review"))
        assertTrue(reauth.action.contains("登录") || reauth.action.contains("Sign in"))
        assertFalse(active.retryable)
        assertFalse(review.retryable)
        assertFalse(reauth.retryable)
    }

    @Test
    fun resubmissionFailuresExplainThatHistoryWasNotMutated() {
        val notAllowed = ClientErrorMapper.map(
            httpError(409, "EXERCISE_RECORD_RESUBMISSION_NOT_ALLOWED", "req-resubmit"),
            ClientErrorContext.RECORD
        )
        val duplicate = ClientErrorMapper.map(
            httpError(409, "EXERCISE_RECORD_ALREADY_EXISTS_FOR_SESSION", "req-duplicate"),
            ClientErrorContext.RECORD
        )
        val deadline = ClientErrorMapper.map(
            httpError(409, "COURSE_DEADLINE_PASSED", "req-deadline"),
            ClientErrorContext.RECORD
        )

        assertEquals("EXERCISE_RECORD_RESUBMISSION_NOT_ALLOWED", notAllowed.code)
        assertTrue(notAllowed.message.contains("没有被修改") || notAllowed.message.contains("not changed"))
        assertFalse(notAllowed.retryable)
        assertTrue(duplicate.action.contains("新的运动") || duplicate.action.contains("new exercise"))
        assertTrue(deadline.title.contains("窗口") || deadline.title.contains("window"))
    }

    private fun httpError(
        status: Int,
        code: String,
        requestId: String,
        serverMessage: String = "raw backend message"
    ) = V1HttpException(
        operationId = "testOperation",
        statusCode = status,
        error = V1ApiError(
            code = V1ErrorCode(code),
            serverMessage = serverMessage,
            details = JsonObject(),
            requestId = requestId,
            timestamp = "2026-08-24T00:00:00Z"
        )
    )
}
