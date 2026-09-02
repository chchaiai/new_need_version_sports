package edu.bnbu.student.mvp.feature.courses

import edu.bnbu.student.mvp.core.model.Course
import org.junit.Assert.assertFalse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SemesterTermLabelTest {
    @Test
    fun contractTermCodesAreRenderedAsUserFacingLabels() {
        assertTrue("FIRST".semesterTermLabel() in setOf("第一学期", "First semester"))
        assertTrue("SECOND".semesterTermLabel() in setOf("第二学期", "Second semester"))
        assertTrue("SUMMER".semesterTermLabel() in setOf("暑期学期", "Summer term"))
    }

    @Test
    fun legacyDisplayTermsRemainUnchanged() {
        assertTrue("Autumn term".semesterTermLabel() == "Autumn term")
    }

    @Test
    fun semesterDisplayNeverFallsBackToInternalIdOrUuid() {
        val internalId = "5c0a7bc6-a421-4adf-9488-2344eea1f22a"
        val course = course(
            semester = internalId,
            semesterId = internalId,
            academicYear = "2026-2027",
            term = "FIRST"
        )

        val label = course.safeSemesterDisplayLabel()

        assertFalse(label.contains(internalId))
        assertTrue(label.contains("2026-2027"))
        assertTrue(label.contains("第一学期") || label.contains("First semester"))
    }

    @Test
    fun authoritativeLongDisplayNameIsPreservedForWrappingByTheUi() {
        val longName = "2026-2027 Academic Year International Sports Programme First Semester"
        assertEquals(longName, course(semester = longName).safeSemesterDisplayLabel())
    }

    @Test
    fun administratorManagedDisplayNameWinsOverStructuredFallbackFields() {
        val managedName = "2025-2026 暑期学期"
        val course = course(
            semester = managedName,
            academicYear = "2025-2026",
            term = "SUMMER"
        )

        assertEquals(managedName, course.safeSemesterDisplayLabel())
    }

    private fun course(
        semester: String,
        semesterId: String = "semester-internal",
        academicYear: String = "",
        term: String = ""
    ) = Course(
        id = "course-1",
        name = "Physical Education",
        semester = semester,
        students = 0,
        completion = 0,
        missing = 0,
        deadline = "",
        teacher = "Teacher",
        semesterId = semesterId,
        academicYear = academicYear,
        term = term
    )
}
