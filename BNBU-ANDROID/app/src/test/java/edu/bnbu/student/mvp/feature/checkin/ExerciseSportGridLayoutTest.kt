package edu.bnbu.student.mvp.feature.checkin

import org.junit.Assert.assertEquals
import org.junit.Test

class ExerciseSportGridLayoutTest {
    @Test
    fun independentExerciseUsesTheWebFourColumnGrid() {
        assertEquals(4, ExerciseSportGridColumnCount)
    }
}
