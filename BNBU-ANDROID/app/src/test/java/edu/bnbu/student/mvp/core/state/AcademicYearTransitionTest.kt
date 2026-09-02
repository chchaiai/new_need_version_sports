package edu.bnbu.student.mvp.core.state

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AcademicYearTransitionTest {
    @Test
    fun academicYearChangeRequiresTwoNonBlankDifferentValues() {
        assertTrue(hasAcademicYearChanged("2025-2026", "2026-2027"))
        assertTrue(hasAcademicYearChanged(" 2025-2026 ", "2026-2027 "))

        assertFalse(hasAcademicYearChanged("", "2026-2027"))
        assertFalse(hasAcademicYearChanged("2025-2026", ""))
        assertFalse(hasAcademicYearChanged("2025-2026", " 2025-2026 "))
    }
}
