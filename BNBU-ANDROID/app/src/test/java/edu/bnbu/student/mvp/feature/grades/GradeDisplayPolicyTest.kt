package edu.bnbu.student.mvp.feature.grades

import edu.bnbu.student.mvp.core.model.GradeRow
import org.junit.Assert.assertTrue
import org.junit.Test

class GradeDisplayPolicyTest {
    @Test
    fun blocksEveryLegacyGradePayloadRegardlessOfPublicationState() {
        val calculated = gradeRow(
            totalScore = 5,
            totalDisplay = "5.00",
            isPassed = false,
            courseGradeStatus = "calculated"
        )
        val published = gradeRow(
            totalScore = 5,
            totalDisplay = "5.00",
            isPassed = false,
            courseGradeStatus = "published"
        )

        assertTrue(calculated.isStudentGradeDisclosureBlocked())
        assertTrue(published.isStudentGradeDisclosureBlocked())
    }

    private fun gradeRow(
        totalScore: Int? = null,
        totalDisplay: String = "Not published",
        isPassed: Boolean? = null,
        courseGradeStatus: String = "in_progress"
    ) = GradeRow(
        studentId = "student-1",
        studentName = "Student",
        visibleBlocks = emptyList(),
        totalScore = totalScore,
        totalDisplay = totalDisplay,
        isPassed = isPassed,
        courseGradeStatus = courseGradeStatus,
        displayConfigVersion = 1,
        sourceTrace = "test"
    )
}
