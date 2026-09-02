package edu.bnbu.student.mvp.core.model

import org.junit.Assert.assertEquals
import org.junit.Test

class StudentProgressTest {
    private val progress = StudentProgress(
        id = "student-1",
        name = "Test Student",
        college = "College",
        className = "Class",
        course = 3.0,
        general = 4.0,
        rawCourse = 2.0,
        rawGeneral = 4.0,
        exam = 0,
        attendance = 0,
        physical = 0,
        status = "In progress",
        source = "test",
        organizationCredit = null
    )

    @Test
    fun courseCheckInUpdatesCourseProgressAndRawHours() {
        val updated = progress.withRecordedCheckIn(CreditType.CourseRelated, 2.0)

        assertEquals(5.0, updated.course, 0.0)
        assertEquals(4.0, updated.rawCourse, 0.0)
        assertEquals(4.0, updated.general, 0.0)
        assertEquals(4.0, updated.rawGeneral, 0.0)
    }

    @Test
    fun generalCheckInUpdatesOnlyGeneralProgress() {
        val updated = progress.withRecordedCheckIn(CreditType.General, 1.0)

        assertEquals(3.0, updated.course, 0.0)
        assertEquals(2.0, updated.rawCourse, 0.0)
        assertEquals(5.0, updated.general, 0.0)
        assertEquals(5.0, updated.rawGeneral, 0.0)
    }

    @Test
    fun organizationOffsetAndNegativeHoursDoNotChangeCheckInProgress() {
        assertEquals(progress, progress.withRecordedCheckIn(CreditType.OrganizationOffset, 2.0))
        assertEquals(progress, progress.withRecordedCheckIn(CreditType.General, -1.0))
    }
}
