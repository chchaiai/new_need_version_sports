package edu.bnbu.student.mvp.feature.checkin

import edu.bnbu.student.mvp.core.model.CheckInRecord
import edu.bnbu.student.mvp.core.model.CreditType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseReviewUiModelTest {
    @Test
    fun missingStageDoesNotGetGuessedAsPendingAiAndKeepsCreditFactsUnknown() {
        val ui = record(reviewStatus = null, hours = 1.0).toExerciseRecordReviewUiModel()

        assertEquals(65, ui.actualWholeMinutes)
        assertNull(ui.eligibleWholeMinutes)
        assertNull(ui.creditedWholeMinutes)
        assertEquals(ExerciseRecordReviewStage.StageUnavailable, ui.stage)
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
    fun legacyStringsCannotInventOneOfTheStructuredIntermediateStages() {
        listOf(null, "", "PENDING_AI", "PENDING_TEACHER", "TECHNICAL", "FUTURE_SERVER_STATE")
            .forEach { rawStatus ->
                val ui = record(reviewStatus = rawStatus, hours = 1.0)
                    .toExerciseRecordReviewUiModel()
                assertEquals(rawStatus, ExerciseRecordReviewStage.StageUnavailable, ui.stage)
                assertNull(ui.creditedWholeMinutes)
                assertNull(ui.eligibleWholeMinutes)
            }
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

    @Test
    fun v81ReviewStageMatrixKeepsEveryProcessingAndFinalMeaningSeparate() {
        val expectedLabels = listOf(
            "待 AI 检查" to "Awaiting AI check",
            "待教师复核" to "Awaiting teacher review",
            "待补证" to "Awaiting supplementary evidence",
            "补证已接收 · 待教师复核" to "Supplement received · Awaiting teacher review",
            "技术处理中" to "Technical processing",
            "有效 · 已计入" to "Valid · Credited",
            "有效 · 未计入" to "Valid · Not credited",
            "无效" to "Invalid"
        )

        assertEquals(
            expectedLabels,
            ExerciseReviewStageUiPolicy.V81ReviewStages.map {
                it.chineseLabel to it.englishLabel
            }
        )
        assertEquals(
            expectedLabels.size,
            ExerciseReviewStageUiPolicy.V81ReviewStages.distinct().size
        )
    }

    @Test
    fun processingStagesNeverClaimACompletedResultOrCreditedMinutes() {
        val processingStages = ExerciseReviewStageUiPolicy.V81ReviewStages
            .filterNot(ExerciseRecordReviewStage::isFinalResult)

        assertEquals(
            listOf(
                ExerciseRecordReviewStage.PendingAiCheck,
                ExerciseRecordReviewStage.PendingTeacherReview,
                ExerciseRecordReviewStage.PendingStudentSupplement,
                ExerciseRecordReviewStage.SupplementReceivedPendingTeacherReview,
                ExerciseRecordReviewStage.TechnicalProcessing
            ),
            processingStages
        )
        processingStages.forEach { stage ->
            val ui = ExerciseRecordReviewUiModel(
                actualWholeMinutes = 65,
                eligibleWholeMinutes = null,
                creditedWholeMinutes = null,
                stage = stage
            )
            assertFalse(ui.stage.isFinalResult)
            assertNull(ui.creditedWholeMinutes)
        }
        assertTrue(ExerciseRecordReviewStage.ValidCredited.isFinalResult)
        assertTrue(ExerciseRecordReviewStage.ValidNotCredited.isFinalResult)
        assertTrue(ExerciseRecordReviewStage.Invalid.isFinalResult)
        assertFalse(ExerciseRecordReviewStage.StageUnavailable.isFinalResult)
    }

    @Test
    fun reviewModelRejectsCreditClaimsThatContradictTheStage() {
        assertTrue(
            runCatching {
                ExerciseRecordReviewUiModel(
                    actualWholeMinutes = 65,
                    eligibleWholeMinutes = null,
                    creditedWholeMinutes = 60,
                    stage = ExerciseRecordReviewStage.TechnicalProcessing
                )
            }.isFailure
        )
        assertTrue(
            runCatching {
                ExerciseRecordReviewUiModel(
                    actualWholeMinutes = 65,
                    eligibleWholeMinutes = null,
                    creditedWholeMinutes = null,
                    stage = ExerciseRecordReviewStage.ValidCredited
                )
            }.isFailure
        )
        assertTrue(
            runCatching {
                ExerciseRecordReviewUiModel(
                    actualWholeMinutes = 65,
                    eligibleWholeMinutes = null,
                    creditedWholeMinutes = 30,
                    stage = ExerciseRecordReviewStage.Invalid
                )
            }.isFailure
        )
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
