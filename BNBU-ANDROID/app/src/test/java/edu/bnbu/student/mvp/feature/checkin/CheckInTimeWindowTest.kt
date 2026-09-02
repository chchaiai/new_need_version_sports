package edu.bnbu.student.mvp.feature.checkin

import edu.bnbu.student.mvp.core.model.CheckInTimeWindow
import java.time.ZoneId
import java.time.ZonedDateTime
import org.junit.Assert.assertNull
import org.junit.Assert.assertNotNull
import org.junit.Test

class CheckInTimeWindowTest {
    private val shanghai = ZoneId.of("Asia/Shanghai")

    @Test
    fun unavailablePolicyBlocksInsteadOfFallingBackToHardCodedHours() {
        assertNotNull(
            CheckInTimeWindow.unavailable().canStartExercise(
                ZonedDateTime.of(2026, 7, 27, 12, 0, 0, 0, shanghai)
            )
        )
    }

    @Test
    fun serverExcludedDateBlocksAnOtherwiseOpenWindow() {
        val window = CheckInTimeWindow(
            windowMode = "available",
            dateRangeStart = "2026-07-01",
            dateRangeEnd = "2026-07-31",
            dailyStartTime = "00:00",
            dailyEndTime = "23:59",
            excludedDates = listOf("2026-07-27"),
            semesterDeadline = null
        )
        assertNull(
            window.canStartExercise(
                ZonedDateTime.of(2026, 7, 26, 12, 0, 0, 0, shanghai)
            )
        )
        assertNotNull(
            window.canStartExercise(
                ZonedDateTime.of(2026, 7, 27, 12, 0, 0, 0, shanghai)
            )
        )
    }

    @Test
    fun serverDateAndDailyWindowAreBothApplied() {
        val window = CheckInTimeWindow(
            windowMode = "specified_range",
            dateRangeStart = "2026-07-20",
            dateRangeEnd = "2026-07-31",
            dailyStartTime = "08:00",
            dailyEndTime = "20:00",
            excludedDates = emptyList(),
            semesterDeadline = "2026-08-01"
        )

        assertNull(window.canStartExercise(ZonedDateTime.of(2026, 7, 27, 12, 0, 0, 0, shanghai)))
        assertNotNull(window.canStartExercise(ZonedDateTime.of(2026, 7, 27, 21, 0, 0, 0, shanghai)))
        assertNotNull(window.canStartExercise(ZonedDateTime.of(2026, 8, 1, 12, 0, 0, 0, shanghai)))
    }

    @Test
    fun serverDateWindowWithoutOptionalDailyHoursAllowsTheWholeDate() {
        val window = CheckInTimeWindow(
            windowMode = "available",
            dateRangeStart = "2026-08-01",
            dateRangeEnd = "2026-08-31",
            dailyStartTime = "",
            dailyEndTime = "",
            excludedDates = emptyList(),
            semesterDeadline = "2026-09-01"
        )

        assertNull(window.canStartExercise(ZonedDateTime.of(2026, 8, 13, 19, 0, 0, 0, shanghai)))
    }

    @Test
    fun incompleteDailyWindowIsRejected() {
        val window = CheckInTimeWindow(
            windowMode = "available",
            dateRangeStart = "2026-08-01",
            dateRangeEnd = "2026-08-31",
            dailyStartTime = "08:00",
            dailyEndTime = "",
            excludedDates = emptyList(),
            semesterDeadline = null
        )

        assertNotNull(window.canStartExercise(ZonedDateTime.of(2026, 8, 13, 19, 0, 0, 0, shanghai)))
    }

    @Test
    fun semesterWidePolicyStillEnforcesTheServerSuppliedSemesterDates() {
        val window = CheckInTimeWindow(
            windowMode = "semester_wide",
            dateRangeStart = "2026-02-23",
            dateRangeEnd = "2026-06-28",
            dailyStartTime = "06:00",
            dailyEndTime = "22:00",
            excludedDates = emptyList(),
            semesterDeadline = null
        )

        assertNotNull(window.canStartExercise(ZonedDateTime.of(2026, 2, 22, 12, 0, 0, 0, shanghai)))
        assertNull(window.canStartExercise(ZonedDateTime.of(2026, 5, 1, 12, 0, 0, 0, shanghai)))
        assertNotNull(window.canStartExercise(ZonedDateTime.of(2026, 6, 29, 12, 0, 0, 0, shanghai)))
    }
}
