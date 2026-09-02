package edu.bnbu.student.mvp.feature.checkin.session

import edu.bnbu.student.mvp.core.exercise.ExerciseSessionPhase
import edu.bnbu.student.mvp.core.exercise.ExerciseSessionRecord
import edu.bnbu.student.mvp.core.model.CreditType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseSessionContractMapperTest {
    private val details = ExerciseSessionDetails(CreditType.General, "running")

    @Test
    fun serverPausedStateReplacesLocalTimingWithServerDuration() {
        val server = ExerciseSessionRecord(
            sessionId = "session-1",
            phase = ExerciseSessionPhase.PAUSED,
            version = 7L,
            creditType = CreditType.General,
            sportType = "running",
            startedAtEpochMillis = 1_000L,
            activeDurationSeconds = 900L
        )

        val local = server.toLocalState(nowEpochMillis = 2_000_000L)

        assertTrue(local is ExerciseSessionState.Paused)
        local as ExerciseSessionState.Paused
        assertEquals(900_000L, local.accumulatedActiveMillis)
        assertEquals(2_000_000L, local.pausedAtEpochMillis)
    }

    @Test
    fun completedStateUsesServerFinalDurationAndEndTime() {
        val server = ExerciseSessionRecord(
            sessionId = "session-1",
            phase = ExerciseSessionPhase.COMPLETED,
            version = 8L,
            creditType = CreditType.General,
            sportType = "running",
            startedAtEpochMillis = 1_000L,
            activeDurationSeconds = 4_321L,
            endedAtEpochMillis = 5_000_000L
        )

        val local = server.toLocalState(nowEpochMillis = 9_000_000L)

        assertTrue(local is ExerciseSessionState.Finished)
        local as ExerciseSessionState.Finished
        assertEquals(4_321_000L, local.activeDurationMillis)
        assertEquals(5_000_000L, local.endedAtEpochMillis)
        assertEquals(1, local.creditedHours)
    }

    @Test
    fun localActiveStateCanSeedOfflineRecoveryMirror() {
        val local = ExerciseSessionState.Active(
            sessionId = "session-1",
            details = details,
            startedAtEpochMillis = 1_000L,
            activeSegmentStartedAtEpochMillis = 10_000L,
            accumulatedActiveMillis = 600_000L
        )

        val mirror = local.toContractMirrorOrNull(version = 0L, nowEpochMillis = 20_000L)

        assertEquals(ExerciseSessionPhase.ACTIVE, mirror?.phase)
        assertEquals(610L, mirror?.activeDurationSeconds)
        assertEquals(0L, mirror?.version)
    }

    @Test
    fun serverActiveStateRemainsPersistableWhenDeviceClockLagsServer() {
        val server = ExerciseSessionRecord(
            sessionId = "session-clock-skew",
            phase = ExerciseSessionPhase.ACTIVE,
            version = 1L,
            creditType = CreditType.General,
            sportType = "running",
            startedAtEpochMillis = 10_000L,
            activeDurationSeconds = 0L
        )

        val local = server.toLocalState(nowEpochMillis = 9_000L)

        assertTrue(local is ExerciseSessionState.Active)
        local as ExerciseSessionState.Active
        assertEquals(10_000L, local.activeSegmentStartedAtEpochMillis)
        assertNotNull(local.toSnapshot().toExerciseSessionStateOrNull())
    }
}
