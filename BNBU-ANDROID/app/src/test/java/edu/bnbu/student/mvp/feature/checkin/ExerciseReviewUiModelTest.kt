package edu.bnbu.student.mvp.feature.checkin

import edu.bnbu.student.mvp.core.model.CheckInRecord
import edu.bnbu.student.mvp.core.model.CreditType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ExerciseReviewUiModelTest {
    @Test
    fun pendingRecordKeepsCreditFactsUnknown() {
        val ui = record(reviewStatus = null, hours = 1.0).toExerciseRecordReviewUiModel()

        assertEquals(65, ui.actualWholeMinutes)
        assertNull(ui.eligibleWholeMinutes)
        assertNull(ui.creditedWholeMinutes)
        assertEquals(ExerciseRecordReviewStage.PendingChecks, ui.stage)
    }

    @Test
    fun validZeroCreditIsNotPresentedAsInvalid() {
        val ui = record(reviewStatus = "VALID", hours = 0.0).toExerciseRecordReviewUiModel()

        assertEquals(ExerciseRecordReviewStage.ValidNotCredited, ui.stage)
        assertEquals(0, ui.creditedWholeMinutes)
    }

    @Test
    fun invalidRecordNeverReusesAStaleLegacyHourValue() {
        val ui = record(reviewStatus = "INVALID", hours = 1.0).toExerciseRecordReviewUiModel()

        assertEquals(ExerciseRecordReviewStage.Invalid, ui.stage)
        assertEquals(0, ui.creditedWholeMinutes)
    }

    @Test
    fun activeMinutesUseWholeMinutesWithoutRoundingAcrossTheBoundary() {
        mapOf(
            -1L to 0L,
            0L to 0L,
            59_999L to 0L,
            60_000L to 1L,
            119_999L to 1L,
            3_900_000L to 65L,
            Long.MAX_VALUE to Long.MAX_VALUE / 60_000L
        ).forEach { (millis, expected) ->
            assertEquals("Duration $millis", expected, wholeActiveMinutes(millis))
        }
    }

    @Test
    fun anUnrecognizedReviewStateCannotInventCreditedOrEligibleMinutes() {
        val ui = record(reviewStatus = "FUTURE_SERVER_STATE", hours = 1.0)
            .toExerciseRecordReviewUiModel()
        assertEquals(ExerciseRecordReviewStage.Unknown, ui.stage)
        assertNull(ui.creditedWholeMinutes)
        assertNull(ui.eligibleWholeMinutes)
    }

    @Test
    fun absentOrPartialActualDurationDoesNotBecomeAFullMinute() {
        val original = record(reviewStatus = "VALID", hours = 1.0)
        assertNull(original.copy(actualDurationSeconds = null)
            .toExerciseRecordReviewUiModel().actualWholeMinutes)
        assertEquals(0, original.copy(actualDurationSeconds = 59)
            .toExerciseRecordReviewUiModel().actualWholeMinutes)
        assertEquals(1, original.copy(actualDurationSeconds = 60)
            .toExerciseRecordReviewUiModel().actualWholeMinutes)
    }

    @Test
    fun uiPolicyMatchesTheV8EvidenceAndThresholdMatrix() {
        assertEquals(listOf(30, 45, 60), ExerciseCreditUiPolicy.SupportedThresholdMinutes)
        assertEquals(60, ExerciseCreditUiPolicy.MaxCreditedMinutesPerRecord)
        assertEquals(6, ExerciseEvidenceUiPolicy.MaxPhotoCount)
        assertEquals(1, ExerciseEvidenceUiPolicy.MaxVideoCount)
        assertEquals(10, ExerciseEvidenceUiPolicy.MaxPhotoMegabytes)
        assertEquals(100, ExerciseEvidenceUiPolicy.MaxVideoMegabytes)
        assertEquals(250, ExerciseEvidenceUiPolicy.MaxVersionMegabytes)
        assertEquals(15, ExerciseEvidenceUiPolicy.SwimmingInitialAcceptanceMinutes)
        assertEquals(30, ExerciseEvidenceUiPolicy.SwimmingLockedBatchResumeMinutes)
        assertEquals(24, ExerciseEvidenceUiPolicy.SwimmingDelayExplanationHours)
    }

    private fun record(reviewStatus: String?, hours: Double) = CheckInRecord(
        id = "record-ui-test",
        courseId = "course-ui-test",
        taskTitle = "Exercise check-in",
        creditType = CreditType.General,
        hours = hours,
        submittedAt = "2026-09-04T10:00:00Z",
        proofSummary = "1 photo",
        proofPhotoCount = 1,
        proofVideoCount = 0,
        proofFiles = emptyList(),
        teacherPublicFeedback = null,
        teacherInternalNote = null,
        note = "UI test",
        sportType = "running",
        startTime = "2026-09-04T09:00:00Z",
        endTime = "2026-09-04T10:05:00Z",
        actualDurationSeconds = 3_900,
        reviewStatus = reviewStatus,
        businessDate = "2026-09-04",
        version = 1
    )
}
