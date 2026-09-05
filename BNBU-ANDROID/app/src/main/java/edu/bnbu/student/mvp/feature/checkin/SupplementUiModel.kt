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
    val reviewReason: ExerciseReviewPublicReasonUiModel.TeacherDecision,
    val deadlineLabel: String,
    val windowHours: Int,
    val originalEvidenceLabels: List<String>,
    val state: SupplementTaskState,
    val formalSubmissionAvailable: Boolean,
    val isReviewSample: Boolean = false
) {
    init {
        require(reviewReason.action == ExerciseReviewTeacherActionUi.ReturnForSupplement) {
            "A supplement task must originate from the teacher's return-for-supplement action."
        }
    }
}

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
