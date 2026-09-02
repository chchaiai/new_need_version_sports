package edu.bnbu.student.mvp.feature.checkin.session

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseVideoRecordingStateTest {
    @Test
    fun `eight seconds pause and seven seconds recording auto stops at fifteen`() {
        val state = ExerciseVideoRecordingState()

        state.start()
        assertFalse(state.updateDuration(8_000_000_000L))
        state.pause()
        assertEquals(7_000_000_000L, state.remainingDurationNanos)
        state.resume()

        assertTrue(state.updateDuration(15_000_000_000L))
        assertEquals(ExerciseVideoRecordingPhase.FINALIZING, state.phase)
        assertEquals(0L, state.remainingDurationNanos)
        assertFalse(state.updateDuration(16_000_000_000L))
    }

    @Test
    fun `manual early stop enters finalizing`() {
        val state = ExerciseVideoRecordingState()
        state.start()
        state.updateDuration(4_200_000_000L)

        state.stop()

        assertEquals(ExerciseVideoRecordingPhase.FINALIZING, state.phase)
        assertEquals(10_800_000_000L, state.remainingDurationNanos)
    }
}
