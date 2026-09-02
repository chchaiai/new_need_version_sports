package edu.bnbu.student.mvp.core.network.v1

import com.google.gson.JsonParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class V1MutationSafetyTest {
    @Test
    fun repeatedTapAndRetryReuseOneKeyForTheSameIntent() {
        var generated = 0
        val registry = MutationIntentRegistry { "intent-${++generated}" }
        val scope = MutationIntentScope("account-a", "submitExerciseRecord", "submit-button")
        val fingerprint = IntentFingerprint.fromCanonicalInput(
            "submitExerciseRecord",
            "{\"recordId\":\"record-1\",\"expectedVersion\":1}"
        )

        val first = registry.acquire(scope, fingerprint)
        val repeatedTap = registry.acquire(scope, fingerprint)

        assertEquals(first.idempotencyKey, repeatedTap.idempotencyKey)
        assertEquals(1, generated)
    }

    @Test
    fun changedInputOrCompletedActionGetsANewKey() {
        var generated = 0
        val registry = MutationIntentRegistry { "intent-${++generated}" }
        val scope = MutationIntentScope("account-a", "submitExerciseRecord", "submit-button")
        val first = registry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput("submitExerciseRecord", "version=1")
        )
        val changedInput = registry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput("submitExerciseRecord", "version=2")
        )
        registry.complete(changedInput)
        val explicitNewAction = registry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput("submitExerciseRecord", "version=2")
        )

        assertNotEquals(first.idempotencyKey, changedInput.idempotencyKey)
        assertNotEquals(changedInput.idempotencyKey, explicitNewAction.idempotencyKey)
        assertEquals(3, generated)
    }

    @Test
    fun accountClearPreventsCrossSessionIntentReuse() {
        var generated = 0
        val registry = MutationIntentRegistry { "intent-${++generated}" }
        val scope = MutationIntentScope("account-a", "pauseExerciseSession", "pause")
        val fingerprint = IntentFingerprint.fromCanonicalInput("pauseExerciseSession", "session-1:v1")
        val beforeLogout = registry.acquire(scope, fingerprint)

        registry.clearAccount("account-a")
        val afterLogin = registry.acquire(scope, fingerprint)

        assertNotEquals(beforeLogout.idempotencyKey, afterLogin.idempotencyKey)
    }

    @Test
    fun typedIntentAddsHeaderAndRejectsWrongOperationOrReadRequest() {
        val intent = MutationIntentRegistry { "intent-key" }.acquire(
            MutationIntentScope("account-a", "finishExerciseSession", "finish"),
            IntentFingerprint.fromCanonicalInput("finishExerciseSession", "session-1:v2")
        )
        val request = V1ApiRequest(
            operationId = "finishExerciseSession",
            method = V1HttpMethod.POST,
            relativePath = "exercise-sessions/session-1/finish",
            body = mapOf("expectedVersion" to 2)
        ).withMutationIntent(intent)

        assertEquals("intent-key", request.headers["Idempotency-Key"])
        assertThrows(IllegalArgumentException::class.java) {
            V1ApiRequest("getActiveSession", V1HttpMethod.GET, "exercise-sessions/active")
                .withMutationIntent(intent)
        }
        assertThrows(IllegalArgumentException::class.java) {
            V1ApiRequest("pauseExerciseSession", V1HttpMethod.POST, "pause", body = emptyMap<String, String>())
                .withMutationIntent(intent)
        }
    }

    @Test
    fun versionsRejectNegativeValuesAndConflictIsTyped() {
        assertThrows(IllegalArgumentException::class.java) { ExpectedVersion(0L) }
        assertThrows(IllegalArgumentException::class.java) { ExpectedReviewVersion(-1) }
        assertEquals(1L, ExpectedVersion(1L).wireValue)
        assertEquals(0, ExpectedReviewVersion(0).wireValue)

        val exception = V1HttpException(
            operationId = "submitExerciseRecord",
            statusCode = 409,
            error = V1ApiError(
                code = V1ErrorCode("CONFLICT_VERSION_MISMATCH"),
                serverMessage = "changed",
                details = JsonParser.parseString(
                    """{"resourceType":"EXERCISE_RECORD","resourceId":"record-1","expectedVersion":3,"actualVersion":4}"""
                ),
                requestId = "req-version",
                timestamp = "2026-08-06T12:00:00Z"
            )
        )

        val conflict = exception.asVersionConflictOrNull()!!
        assertEquals("EXERCISE_RECORD", conflict.resourceType)
        assertEquals("record-1", conflict.resourceId)
        assertEquals(3L, conflict.expectedVersion?.wireValue)
        assertEquals(4L, conflict.actualVersion?.wireValue)
        assertEquals("req-version", conflict.requestId)
        assertNull(
            V1HttpException(
                "submitExerciseRecord",
                409,
                exception.error.copy(code = V1ErrorCode("CONFLICT_STATE_TRANSITION"))
            ).asVersionConflictOrNull()
        )
    }

    @Test
    fun keyAndFingerprintToStringAreRedacted() {
        val key = IdempotencyKey.fromGenerated("secret-key-value")
        val fingerprint = IntentFingerprint.fromCanonicalInput("operation", "sensitive-input")

        assertEquals("[redacted idempotency key]", key.toString())
        assertEquals("[redacted intent fingerprint]", fingerprint.toString())
        assertTrue(key.wireValue != key.toString())
    }
}
