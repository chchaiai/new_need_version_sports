package edu.bnbu.student.mvp.core.model

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CourseJoinPolicyTest {
    @Test
    fun allowsANewJoinWhenThereIsNoActiveCurrentMembership() {
        assertTrue(StudentWorkspace.empty().canStartNewCourseJoin())
    }

    @Test
    fun activeAndLegacyEnrolledMembershipsBlockASecondCourse() {
        listOf("active", "enrolled").forEach { status ->
            val workspace = StudentWorkspace.empty().copy(
                courses = listOf(currentCourse().copy(enrollmentStatus = status))
            )

            assertFalse(workspace.canStartNewCourseJoin())
        }
    }

    @Test
    fun inactiveMembershipsDoNotBlockAReplacementCourse() {
        listOf("removed", "exited", "disabled", "completed", "withdrawn").forEach { status ->
            val workspace = StudentWorkspace.empty().copy(
                courses = listOf(currentCourse().copy(enrollmentStatus = status))
            )

            assertTrue(workspace.canStartNewCourseJoin())
        }
    }

    @Test
    fun historicalEnrollmentDoesNotBlockANewSemester() {
        val workspace = StudentWorkspace.empty().copy(
            courses = listOf(currentCourse().copy(isCurrent = false, enrollmentStatus = "active"))
        )

        assertTrue(workspace.canStartNewCourseJoin())
    }

    private fun currentCourse() = Course(
        id = "course-1",
        name = "Physical Education",
        semester = "2026 Fall",
        students = 0,
        completion = 0,
        missing = 0,
        deadline = "",
        teacher = "Teacher"
    )
}
