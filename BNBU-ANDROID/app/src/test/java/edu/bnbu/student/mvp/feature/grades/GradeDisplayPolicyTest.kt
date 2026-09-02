package edu.bnbu.student.mvp.feature.grades

import edu.bnbu.student.mvp.core.model.GradeBlock
import edu.bnbu.student.mvp.core.model.GradeRow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GradeDisplayPolicyTest {
    @Test
    fun keepsEveryVisibleBlockInApiDisplayOrder() {
        val content = gradeRow(
            block("attendance", "Attendance", "attendance", 20, displayOrder = 30),
            block("hidden", "Hidden", "custom", 10, isVisible = false, displayOrder = 10),
            block("exam", "Exam", "exam", 40, displayOrder = 20),
            block("checkin", "Check-in", "checkin", 40, displayOrder = 10)
        ).gradeDisplayContent()

        assertEquals(listOf("checkin", "exam", "attendance"), content.blocks.map { it.id })
    }

    @Test
    fun exposesOpenedTotalAndDerivesPassStateFromScoreWhenNeeded() {
        val content = gradeRow(totalScore = 60, totalDisplay = "60", isPassed = null)
            .gradeDisplayContent()

        assertEquals(60, content.total?.score)
        assertEquals("60", content.total?.display)
        assertTrue(content.total?.isPassed == true)
    }

    @Test
    fun usesPassStateWhenScoreIsMaskedAndDoesNotRenderAnUnopenedTotal() {
        val failed = gradeRow(totalScore = null, totalDisplay = "Not passed", isPassed = false)
            .gradeDisplayContent()
        val unopened = gradeRow(totalScore = null, totalDisplay = "Not published", isPassed = null)
            .gradeDisplayContent()

        assertEquals(false, failed.total?.isPassed)
        assertNull(unopened.total)
    }

    @Test
    fun exposesOnlyServerPublishedTotalToStudentUi() {
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

        assertNull(calculated.publishedTotalGrade())
        assertEquals("5.00", published.publishedTotalGrade()?.display)
    }

    private fun gradeRow(
        vararg blocks: GradeBlock,
        totalScore: Int? = null,
        totalDisplay: String = "Not published",
        isPassed: Boolean? = null,
        courseGradeStatus: String = "in_progress"
    ) = GradeRow(
        studentId = "student-1",
        studentName = "Student",
        visibleBlocks = blocks.toList(),
        totalScore = totalScore,
        totalDisplay = totalDisplay,
        isPassed = isPassed,
        courseGradeStatus = courseGradeStatus,
        displayConfigVersion = 1,
        sourceTrace = "test"
    )

    private fun block(
        id: String,
        name: String,
        type: String,
        score: Int,
        isVisible: Boolean = true,
        displayOrder: Int
    ) = GradeBlock(
        id = id,
        name = name,
        weight = 0.5,
        score = score,
        scoreDisplay = score.toString(),
        isVisible = isVisible,
        displayOrder = displayOrder,
        blockType = type,
        description = null,
        subItems = null
    )
}
