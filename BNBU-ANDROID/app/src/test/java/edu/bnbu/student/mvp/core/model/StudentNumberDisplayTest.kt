package edu.bnbu.student.mvp.core.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class StudentNumberDisplayTest {
    @Test
    fun longPublicStudentNumberIsKeptVerbatim() {
        val longNumber = "BNBU-2026-INTERNATIONAL-00000001"
        val student = student(studentNumber = longNumber)

        assertEquals(longNumber, student.safeStudentNumberOrNull())
        assertEquals(longNumber, student.studentNumberForDisplay())
    }

    @Test
    fun internalIdAndUuidNeverBecomeStudentNumberCopy() {
        val uuid = "123e4567-e89b-12d3-a456-426614174000"
        val sameAsId = student(id = "internal-123", studentNumber = "internal-123")
        val uuidValue = student(id = "profile-1", studentNumber = uuid)

        assertNull(sameAsId.safeStudentNumberOrNull())
        assertNull(uuidValue.safeStudentNumberOrNull())
        assertFalse(sameAsId.studentNumberForDisplay().contains("internal-123"))
        assertFalse(uuidValue.studentNumberForDisplay().contains(uuid))
        assertTrue(sameAsId.studentNumberForDisplay().isNotBlank())
    }

    private fun student(
        id: String = "profile-1",
        studentNumber: String
    ) = StudentProfile(
        id = id,
        name = "Student",
        studentNumber = studentNumber,
        email = "",
        college = "",
        className = "",
        status = "ACTIVE",
        gender = "",
        gradeLevel = ""
    )
}
