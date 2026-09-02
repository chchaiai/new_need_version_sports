package edu.bnbu.student.mvp.core.network.v1

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class V1PaginationTest {
    @Test
    fun cursorIsForwardedOnlyForItsOriginalScope() {
        val scope = CursorScope.forQuery(
            accountScope = "account-a",
            operationId = "listExerciseRecords",
            canonicalQuery = "status=SUBMITTED&sort=-createdAt&limit=20"
        )
        val cursor = ScopedCursor.fromServer(scope, "opaque-server-token")
        val request = V1ApiRequest(
            operationId = "listExerciseRecords",
            method = V1HttpMethod.GET,
            relativePath = "exercise-records",
            query = mapOf("status" to "SUBMITTED", "limit" to "20")
        ).withCursor(cursor, scope)

        assertEquals("opaque-server-token", request.query["cursor"])
        assertEquals("[opaque cursor]", cursor.toString())
    }

    @Test
    fun cursorCannotCrossAccountOperationOrFilterScope() {
        val original = CursorScope.forQuery("account-a", "listExerciseRecords", "status=SUBMITTED")
        val cursor = ScopedCursor.fromServer(original, "opaque-server-token")
        val differentAccount = CursorScope.forQuery("account-b", "listExerciseRecords", "status=SUBMITTED")
        val differentFilter = CursorScope.forQuery("account-a", "listExerciseRecords", "status=DRAFT")

        assertThrows(IllegalArgumentException::class.java) { cursor.queryValueFor(differentAccount) }
        assertThrows(IllegalArgumentException::class.java) { cursor.queryValueFor(differentFilter) }
        assertThrows(IllegalArgumentException::class.java) {
            V1ApiRequest("listCourses", V1HttpMethod.GET, "courses")
                .withCursor(cursor, original)
        }
    }

    @Test
    fun cursorLengthAndManualQueryInjectionFailClosed() {
        val scope = CursorScope.forQuery("account-a", "listExerciseRecords", "all")
        assertThrows(IllegalArgumentException::class.java) { ScopedCursor.fromServer(scope, "") }
        assertThrows(IllegalArgumentException::class.java) {
            ScopedCursor.fromServer(scope, "x".repeat(2049))
        }
        assertThrows(IllegalArgumentException::class.java) {
            V1ApiRequest(
                "listExerciseRecords",
                V1HttpMethod.GET,
                "exercise-records",
                query = mapOf("cursor" to "manual-token")
            ).withCursor(ScopedCursor.fromServer(scope, "opaque"), scope)
        }
        assertTrue(ScopedCursor.fromServer(scope, "x".repeat(2048)).toString().contains("opaque"))
    }
}
