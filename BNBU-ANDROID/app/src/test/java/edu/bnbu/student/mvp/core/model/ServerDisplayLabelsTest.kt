package edu.bnbu.student.mvp.core.model

import org.junit.Assert.assertEquals
import org.junit.Test

class ServerDisplayLabelsTest {
    @Test
    fun dashboardOnlyShowsInProgressForActiveStudents() {
        assertEquals("进行中", dashboardProgressStatusLabel("ACTIVE", "IN_PROGRESS"))
        assertEquals("进行中", dashboardProgressStatusLabel("ACTIVE", "本地测试"))
        assertEquals("已退班", dashboardProgressStatusLabel("PENDING", "IN_PROGRESS"))
    }

    @Test
    fun dashboardKeepsCompletedProgressForActiveStudents() {
        assertEquals("已达标", dashboardProgressStatusLabel("ACTIVE", "QUALIFIED"))
    }
}
