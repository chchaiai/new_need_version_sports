package edu.bnbu.student.mvp.core.exercise

import edu.bnbu.student.mvp.core.model.CreditType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class ExerciseGatewayContractTest {
    @Test
    fun completedSessionUsesTheBackendCompletedPhase() {
        val session = ExerciseSessionRecord(
            sessionId = "session-1",
            phase = ExerciseSessionPhase.COMPLETED,
            version = 3L,
            creditType = CreditType.General,
            sportType = "running",
            startedAtEpochMillis = 1_000L,
            activeDurationSeconds = MaximumExerciseDurationSeconds,
            endedAtEpochMillis = 1_000L + MaximumExerciseDurationSeconds * 1_000L
        )

        assertEquals(ExerciseSessionPhase.COMPLETED, session.phase)
    }

    @Test
    fun sessionContractRejectsDurationAboveTwoHours() {
        assertThrows(IllegalArgumentException::class.java) {
            ExerciseSessionRecord(
                sessionId = "session-1",
                phase = ExerciseSessionPhase.ACTIVE,
                version = 1L,
                creditType = CreditType.General,
                sportType = "running",
                startedAtEpochMillis = 1_000L,
                activeDurationSeconds = MaximumExerciseDurationSeconds + 1L
            )
        }
    }

    @Test
    fun sessionAtTwoHoursMustAlreadyBeCompleted() {
        assertThrows(IllegalArgumentException::class.java) {
            ExerciseSessionRecord(
                sessionId = "session-1",
                phase = ExerciseSessionPhase.PAUSED,
                version = 2L,
                creditType = CreditType.General,
                sportType = "running",
                startedAtEpochMillis = 1_000L,
                activeDurationSeconds = MaximumExerciseDurationSeconds
            )
        }
    }
}
