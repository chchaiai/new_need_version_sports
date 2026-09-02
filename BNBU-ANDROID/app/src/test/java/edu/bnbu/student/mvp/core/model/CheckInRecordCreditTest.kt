package edu.bnbu.student.mvp.core.model

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CheckInRecordCreditTest {
    @Test
    fun onlyAuthoritativeValidRecordContributesToCreditedHours() {
        assertTrue(record(reviewStatus = "VALID").contributesToCreditedHours)
        assertTrue(record(reviewStatus = "valid").contributesToCreditedHours)
        assertFalse(record(reviewStatus = "INVALID").contributesToCreditedHours)
        assertFalse(record(reviewStatus = null).contributesToCreditedHours)
        assertFalse(record(reviewStatus = "").contributesToCreditedHours)
    }

    private fun record(reviewStatus: String?): CheckInRecord = CheckInRecord(
        id = "record-1",
        courseId = null,
        taskTitle = "运动打卡",
        creditType = CreditType.General,
        hours = 2.0,
        submittedAt = "2026-08-24T18:30:00+08:00",
        proofSummary = "1 张图片",
        proofPhotoCount = 1,
        proofVideoCount = 0,
        proofFiles = emptyList(),
        teacherPublicFeedback = null,
        teacherInternalNote = null,
        note = "测试记录",
        reviewStatus = reviewStatus
    )
}
