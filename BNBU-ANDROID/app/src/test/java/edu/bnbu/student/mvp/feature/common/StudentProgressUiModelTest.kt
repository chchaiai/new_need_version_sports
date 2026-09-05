package edu.bnbu.student.mvp.feature.common

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StudentProgressUiModelTest {
    @Test
    fun convertsLegacyAggregateHoursToWholeMinutesForUiOnly() {
        assertEquals(0, (-1.0).legacyHoursToWholeMinutes())
        assertEquals(30, 0.5.legacyHoursToWholeMinutes())
        assertEquals(1_170, 19.5.legacyHoursToWholeMinutes())
    }

    @Test
    fun totalProgressUsesTheFixedV8SemesterTarget() {
        val progress = StudentProgressUiModel(
            creditedTotalMinutes = 900,
            totalTargetMinutes = StudentSemesterTargetMinutes,
            remainingTotalMinutes = 300,
            creditedCourseMinutes = 600,
            creditedGeneralMinutes = 300,
            courseTargetMinutes = null,
            generalTargetMinutes = null
        )

        assertEquals(75, progress.completionPercent)
        assertFalse(progress.isQualified)
        assertFalse(progress.categoryTargetsAvailable)
    }

    @Test
    fun qualificationDoesNotPreventProgressBeyondTheGoalFromBeingRepresented() {
        val progress = StudentProgressUiModel(
            creditedTotalMinutes = 1_200,
            totalTargetMinutes = StudentSemesterTargetMinutes,
            remainingTotalMinutes = 0,
            creditedCourseMinutes = 800,
            creditedGeneralMinutes = 400,
            courseTargetMinutes = 800,
            generalTargetMinutes = 400
        )

        assertEquals(100, progress.completionPercent)
        assertTrue(progress.isQualified)
        assertTrue(progress.categoryTargetsAvailable)
    }
}
