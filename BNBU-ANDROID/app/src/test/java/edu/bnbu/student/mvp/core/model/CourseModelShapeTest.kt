package edu.bnbu.student.mvp.core.model

import edu.bnbu.student.mvp.core.network.CourseJoinCourseResponse
import edu.bnbu.student.mvp.core.network.StudentCourseDetailResponse
import edu.bnbu.student.mvp.core.network.StudentCourseDto
import edu.bnbu.student.mvp.core.network.StudentGradeResponse
import edu.bnbu.student.mvp.feature.courses.CourseJoinInfo
import org.junit.Assert.assertFalse
import org.junit.Test

class CourseModelShapeTest {
    @Test
    fun courseCodeAndSectionNumberAreAbsentFromStudentModels() {
        assertFieldsAbsent(Course::class.java, "code", "section")
        assertFieldsAbsent(CourseJoinInfo::class.java, "courseNumber", "section")
        assertFieldsAbsent(CourseJoinCourseResponse::class.java, "code", "section")
        assertFieldsAbsent(StudentCourseDto::class.java, "courseCode", "courseSection")
        assertFieldsAbsent(StudentCourseDetailResponse::class.java, "code", "section")
        assertFieldsAbsent(StudentGradeResponse::class.java, "courseCode")
    }

    private fun assertFieldsAbsent(type: Class<*>, vararg forbiddenFields: String) {
        val actualFields = type.declaredFields.mapTo(mutableSetOf()) { it.name }
        forbiddenFields.forEach { forbidden ->
            assertFalse("${type.simpleName} must not expose $forbidden", forbidden in actualFields)
        }
    }
}
