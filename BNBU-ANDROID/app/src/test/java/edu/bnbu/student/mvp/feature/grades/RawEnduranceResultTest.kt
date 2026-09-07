package edu.bnbu.student.mvp.feature.grades

import edu.bnbu.student.mvp.core.model.EnduranceRunStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RawEnduranceResultTest {
    @Test
    fun confirmedDurationMapsToGenderSpecificRawFact() {
        val result = rawEnduranceResultUiModel(
            gender = "female",
            status = EnduranceRunStatus.Recorded,
            durationSeconds = 287,
            testDate = "2026-08-29"
        )

        assertEquals(RawEnduranceResultState.Measured, result.state)
        assertEquals(800, result.eventMeters)
        assertEquals(287, result.durationSeconds)
        assertEquals("2026-08-29", result.testDate)
    }

    @Test
    fun missingOrNonPositiveDurationNeverBecomesAZeroResult() {
        listOf(null, 0, -1).forEach { duration ->
            val result = rawEnduranceResultUiModel(
                gender = "male",
                status = EnduranceRunStatus.Recorded,
                durationSeconds = duration
            )

            assertEquals(RawEnduranceResultState.Unconfirmed, result.state)
            assertNull(result.durationSeconds)
            assertNull(result.testDate)
        }
    }

    @Test
    fun internalAbsenceStateIsCollapsedToTheStudentEmptyState() {
        val result = rawEnduranceResultUiModel(
            gender = "female",
            status = EnduranceRunStatus.Absent,
            durationSeconds = null
        )

        assertEquals(RawEnduranceResultState.Unconfirmed, result.state)
    }

    @Test
    fun exemptionNeverCarriesAStudentTimeOrDate() {
        val result = rawEnduranceResultUiModel(
            gender = "male",
            status = EnduranceRunStatus.Exempt,
            durationSeconds = 300,
            testDate = "2026-08-29"
        )

        assertEquals(RawEnduranceResultState.Exempt, result.state)
        assertNull(result.durationSeconds)
        assertNull(result.testDate)
    }
}
