package edu.bnbu.student.mvp.feature.checkin

internal enum class SupplementTaskState {
    Open,
    Submitting,
    Received,
    Expired,
    OpportunityUsed,
    Forbidden,
    Maintenance,
    Error,
    Resuming
}

internal data class SupplementTaskUiModel(
    val recordId: String,
    val sportLabel: String,
    val originalSubmittedAt: String,
    val publicReason: String,
    val deadlineLabel: String,
    val windowHours: Int,
    val originalEvidenceLabels: List<String>,
    val state: SupplementTaskState,
    val formalSubmissionAvailable: Boolean,
    val isReviewSample: Boolean = false
)

internal object SupplementUiPolicy {
    val AllowedWindowHours = setOf(24, 72)
    const val MaximumSupplementVersions = 1
}

internal fun SupplementTaskUiModel.canSubmit(
    writeEnabled: Boolean,
    photoCount: Int,
    videoCount: Int,
    note: String
): Boolean =
    formalSubmissionAvailable &&
        writeEnabled &&
        state == SupplementTaskState.Open &&
        windowHours in SupplementUiPolicy.AllowedWindowHours &&
        photoCount in 0..ExerciseEvidenceUiPolicy.MaxPhotoCount &&
        videoCount in 0..ExerciseEvidenceUiPolicy.MaxVideoCount &&
        photoCount + videoCount > 0 &&
        note.isNotBlank()

internal fun localReviewSupplementTask(): SupplementTaskUiModel = SupplementTaskUiModel(
    recordId = "LOCAL-REVIEW-RECORD",
    sportLabel = "羽毛球",
    originalSubmittedAt = "2026-09-04 18:30",
    publicReason = "请补充能够说明本次运动现场与时间连续性的材料。",
    deadlineLabel = "2026-09-05 18:30（Asia/Shanghai）",
    windowHours = 24,
    originalEvidenceLabels = listOf(
        "原始照片 1 · 只读引用",
        "原始有声视频 · 只读引用"
    ),
    state = SupplementTaskState.Open,
    formalSubmissionAvailable = false,
    isReviewSample = true
)
