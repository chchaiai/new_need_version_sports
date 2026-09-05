package edu.bnbu.student.mvp.feature.feedback

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FeedbackStatusPresentationTest {
    @Test
    fun acceptedWireVariantsMapToTheFiveV8StudentStages() {
        assertLocalized("pending".feedbackStatusLabel(), "待受理", "Pending acceptance")
        assertLocalized("processing".feedbackStatusLabel(), "受理中", "In progress")
        assertLocalized(
            "pending_technical".feedbackStatusLabel(),
            "待技术团队处理",
            "Waiting for technical team"
        )
        assertLocalized("completed".feedbackStatusLabel(), "处理完成", "Completed")
        assertLocalized("closed".feedbackStatusLabel(), "已关闭", "Closed")
    }

    @Test
    fun unknownStatusIsNotMisreportedAsPendingOrCompleted() {
        assertEquals("future_stage", "future_stage".feedbackStatusLabel())
        assertLocalized("".feedbackStatusLabel(), "状态待确认", "Status unavailable")
    }

    private fun assertLocalized(actual: String, chinese: String, english: String) {
        assertTrue("Unexpected localized label: $actual", actual == chinese || actual == english)
    }
}
