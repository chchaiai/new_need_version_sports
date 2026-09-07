package edu.bnbu.student.mvp.feature.checkin

import edu.bnbu.student.mvp.core.model.CheckInRecord
import kotlin.math.roundToInt

/**
 * UI-only v8 projection for exercise records.
 *
 * The accepted Android Contract does not expose eligible minutes or the full review
 * pipeline. Its record projection only identifies final VALID/INVALID results. Missing
 * intermediate-stage facts therefore remain unavailable instead of being guessed from
 * a null/free-form legacy status, the device clock, or legacy hour fields.
 */
internal data class ExerciseRecordReviewUiModel(
    val actualWholeMinutes: Int?,
    val eligibleWholeMinutes: Int?,
    val creditedWholeMinutes: Int?,
    val stage: ExerciseRecordReviewStage
) {
    init {
        require(actualWholeMinutes == null || actualWholeMinutes >= 0)
        require(eligibleWholeMinutes == null || eligibleWholeMinutes >= 0)
        when (stage) {
            ExerciseRecordReviewStage.ValidCredited ->
                require(creditedWholeMinutes != null && creditedWholeMinutes > 0)

            ExerciseRecordReviewStage.ValidNotCredited,
            ExerciseRecordReviewStage.Invalid -> require(creditedWholeMinutes == 0)

            ExerciseRecordReviewStage.PendingAiCheck,
            ExerciseRecordReviewStage.PendingTeacherReview,
            ExerciseRecordReviewStage.PendingStudentSupplement,
            ExerciseRecordReviewStage.SupplementReceivedPendingTeacherReview,
            ExerciseRecordReviewStage.TechnicalProcessing,
            ExerciseRecordReviewStage.StageUnavailable -> require(creditedWholeMinutes == null)
        }
    }
}

internal enum class ExerciseRecordReviewStage(
    val chineseLabel: String,
    val englishLabel: String,
    val isFinalResult: Boolean
) {
    PendingAiCheck("待 AI 检查", "Awaiting AI check", false),
    PendingTeacherReview("待教师复核", "Awaiting teacher review", false),
    PendingStudentSupplement("待补证", "Awaiting supplementary evidence", false),
    SupplementReceivedPendingTeacherReview(
        "补证已接收 · 待教师复核",
        "Supplement received · Awaiting teacher review",
        false
    ),
    TechnicalProcessing("技术处理中", "Technical processing", false),
    ValidCredited("有效 · 已计入", "Valid · Credited", true),
    ValidNotCredited("有效 · 未计入", "Valid · Not credited", true),
    Invalid("无效", "Invalid", true),
    StageUnavailable("审核阶段暂不可用", "Review stage unavailable", false)
}

internal object ExerciseReviewStageUiPolicy {
    val V81ReviewStages = listOf(
        ExerciseRecordReviewStage.PendingAiCheck,
        ExerciseRecordReviewStage.PendingTeacherReview,
        ExerciseRecordReviewStage.PendingStudentSupplement,
        ExerciseRecordReviewStage.SupplementReceivedPendingTeacherReview,
        ExerciseRecordReviewStage.TechnicalProcessing,
        ExerciseRecordReviewStage.ValidCredited,
        ExerciseRecordReviewStage.ValidNotCredited,
        ExerciseRecordReviewStage.Invalid
    )
}

internal object ExerciseEvidenceUiPolicy {
    const val MaxPhotoCount = 6
    const val MaxVideoCount = 1
    const val MaxPhotoMegabytes = 10
    const val MaxVideoMegabytes = 100
    const val MaxVersionMegabytes = 250
    const val MinVideoSeconds = 1
    const val MaxVideoSeconds = 15
    const val SwimmingInitialAcceptanceMinutes = 15
    const val SwimmingLockedBatchResumeMinutes = 30
    const val SwimmingDelayExplanationHours = 24
}

internal object ExerciseCreditUiPolicy {
    val SupportedThresholdMinutes = listOf(30, 45, 60)
    const val DefaultThresholdMinutes = 30
    const val MaxCreditedMinutesPerRecord = 60
}

internal fun CheckInRecord.toExerciseRecordReviewUiModel(): ExerciseRecordReviewUiModel {
    val actualMinutes = actualDurationSeconds
        ?.coerceAtLeast(0L)
        ?.div(60L)
        ?.coerceAtMost(Int.MAX_VALUE.toLong())
        ?.toInt()
    val legacyCreditedMinutes = (hours.coerceAtLeast(0.0) * 60.0).roundToInt()
    val normalizedStatus = reviewStatus?.trim()?.uppercase()
    val stage = when (normalizedStatus) {
        "VALID" -> if (legacyCreditedMinutes > 0) {
            ExerciseRecordReviewStage.ValidCredited
        } else {
            ExerciseRecordReviewStage.ValidNotCredited
        }
        "INVALID" -> ExerciseRecordReviewStage.Invalid
        else -> ExerciseRecordReviewStage.StageUnavailable
    }
    val creditedMinutes = when (stage) {
        ExerciseRecordReviewStage.ValidCredited -> legacyCreditedMinutes
        ExerciseRecordReviewStage.ValidNotCredited,
        ExerciseRecordReviewStage.Invalid -> 0
        ExerciseRecordReviewStage.PendingAiCheck,
        ExerciseRecordReviewStage.PendingTeacherReview,
        ExerciseRecordReviewStage.PendingStudentSupplement,
        ExerciseRecordReviewStage.SupplementReceivedPendingTeacherReview,
        ExerciseRecordReviewStage.TechnicalProcessing,
        ExerciseRecordReviewStage.StageUnavailable -> null
    }
    return ExerciseRecordReviewUiModel(
        actualWholeMinutes = actualMinutes,
        // No accepted field currently carries the server-calculated eligible minutes.
        eligibleWholeMinutes = null,
        creditedWholeMinutes = creditedMinutes,
        stage = stage
    )
}

internal fun wholeActiveMinutes(durationMillis: Long): Long =
    durationMillis.coerceAtLeast(0L) / 60_000L
