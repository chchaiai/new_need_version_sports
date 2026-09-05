package edu.bnbu.student.mvp.feature.checkin

import edu.bnbu.student.mvp.core.model.CheckInRecord
import kotlin.math.roundToInt

/**
 * UI-only v8 projection for exercise records.
 *
 * The accepted Android Contract does not expose eligible minutes, the full review
 * pipeline, or a locked upload-batch identity yet. Missing facts therefore remain
 * unknown instead of being recomputed from the device clock or legacy hour fields.
 */
internal data class ExerciseRecordReviewUiModel(
    val actualWholeMinutes: Int?,
    val eligibleWholeMinutes: Int?,
    val creditedWholeMinutes: Int?,
    val stage: ExerciseRecordReviewStage
)

internal enum class ExerciseRecordReviewStage {
    PendingChecks,
    ValidCredited,
    ValidNotCredited,
    Invalid,
    Unknown
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
        null, "" -> ExerciseRecordReviewStage.PendingChecks
        else -> ExerciseRecordReviewStage.Unknown
    }
    val creditedMinutes = when (stage) {
        ExerciseRecordReviewStage.ValidCredited -> legacyCreditedMinutes
        ExerciseRecordReviewStage.ValidNotCredited,
        ExerciseRecordReviewStage.Invalid -> 0
        ExerciseRecordReviewStage.PendingChecks,
        ExerciseRecordReviewStage.Unknown -> null
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
