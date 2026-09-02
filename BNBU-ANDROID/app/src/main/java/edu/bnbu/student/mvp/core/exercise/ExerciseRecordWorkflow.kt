package edu.bnbu.student.mvp.core.exercise

import edu.bnbu.student.mvp.core.model.CreditType
import edu.bnbu.student.mvp.core.model.ProofMediaType
import java.util.concurrent.CancellationException
import java.util.UUID
import kotlinx.coroutines.sync.Mutex

internal enum class ExerciseMediaAvailability {
    PROCESSING,
    AVAILABLE,
    FAILED
}

/** Every student-submitted exercise record requires a nonblank description. */
internal val CreditType.requiresExerciseDescription: Boolean
    get() = this == CreditType.CourseRelated || this == CreditType.General

internal data class ExerciseMediaReference(
    val mediaId: String,
    val sessionId: String,
    val type: ProofMediaType,
    val availability: ExerciseMediaAvailability
) {
    init {
        require(mediaId.isNotBlank()) { "Media ID cannot be empty." }
        require(sessionId.isNotBlank()) { "Media session ID cannot be empty." }
    }
}

internal data class ExerciseRecordForm(
    val description: String = "",
    val sportType: String = "",
    val otherSportName: String? = null,
    val media: List<ExerciseMediaReference> = emptyList()
) {
    fun normalizedForDraft(creditType: CreditType = CreditType.General): ExerciseRecordForm {
        val normalizedDescription = description.trim()
        val normalizedSportType = sportType.trim()
        val normalizedOtherSportName = otherSportName?.trim()?.takeIf { it.isNotEmpty() }
        if (creditType.requiresExerciseDescription) {
            require(normalizedDescription.length in 1..MaxExerciseRecordDescriptionLength) {
                "Exercise description must contain 1 to $MaxExerciseRecordDescriptionLength characters."
            }
        } else {
            require(normalizedDescription.length <= MaxExerciseRecordDescriptionLength) {
                "Exercise description cannot exceed $MaxExerciseRecordDescriptionLength characters."
            }
        }
        require(normalizedSportType.isNotEmpty()) { "Sport type cannot be empty." }
        if (normalizedSportType.equals(OtherSportType, ignoreCase = true)) {
            require(
                normalizedOtherSportName != null &&
                    normalizedOtherSportName.length in 1..MaxOtherSportNameLength
            ) {
                "Other sport name must contain 1 to $MaxOtherSportNameLength characters."
            }
        } else {
            require(normalizedOtherSportName == null) {
                "Other sport name is only valid when sport type is OTHER."
            }
        }
        return copy(
            description = normalizedDescription,
            sportType = normalizedSportType,
            otherSportName = normalizedOtherSportName
        )
    }

    fun normalizedForSubmission(creditType: CreditType = CreditType.General): ExerciseRecordForm {
        val normalized = normalizedForDraft(creditType)
        require(media.isNotEmpty()) { "At least one AVAILABLE media item is required." }
        require(media.all { it.availability == ExerciseMediaAvailability.AVAILABLE }) {
            "Only AVAILABLE media can be attached to an exercise record."
        }
        require(media.count { it.type == ProofMediaType.Image } <= ExerciseMediaPolicy.MaxImageCount) {
            "At most ${ExerciseMediaPolicy.MaxImageCount} images can be attached."
        }
        require(media.count { it.type == ProofMediaType.Video } <= ExerciseMediaPolicy.MaxVideoCount) {
            "At most ${ExerciseMediaPolicy.MaxVideoCount} video can be attached."
        }
        require(media.map { it.mediaId }.distinct().size == media.size) {
            "The same media item cannot be attached more than once."
        }
        return normalized
    }

    companion object {
        const val OtherSportType = "other"
    }
}

internal data class CreateExerciseRecordDraftCommand(
    val sessionId: String,
    val creditType: CreditType,
    val clientRequestId: String,
    val form: ExerciseRecordForm
) {
    init {
        require(sessionId.isNotBlank()) { "Session ID cannot be empty." }
        require(creditType == CreditType.CourseRelated || creditType == CreditType.General) {
            "Exercise record credit type is invalid."
        }
        require(clientRequestId.length in 1..MaxClientRequestIdLength) {
            "Client request ID must contain 1 to $MaxClientRequestIdLength characters."
        }
        form.normalizedForDraft(creditType)
    }
}

internal data class UpdateExerciseRecordDraftCommand(
    val recordId: String,
    val expectedVersion: Long,
    val creditType: CreditType,
    val form: ExerciseRecordForm
) {
    init {
        require(recordId.isNotBlank()) { "Record ID cannot be empty." }
        require(expectedVersion >= 1L) { "Record version must be positive." }
        require(creditType == CreditType.CourseRelated || creditType == CreditType.General) {
            "Exercise record credit type is invalid."
        }
        form.normalizedForDraft(creditType)
    }
}

internal data class SubmitExerciseRecordCommand(
    val recordId: String,
    val expectedVersion: Long,
    val mediaIds: List<String>
) {
    init {
        require(recordId.isNotBlank()) { "Record ID cannot be empty." }
        require(expectedVersion >= 1L) { "Record version must be positive." }
        require(mediaIds.isNotEmpty()) { "At least one media ID is required." }
        require(mediaIds.all(String::isNotBlank)) { "Media IDs cannot be blank." }
        require(mediaIds.distinct().size == mediaIds.size) {
            "Media IDs cannot contain duplicates."
        }
    }
}

internal data class CreateExerciseRecordResubmissionCommand(
    val previousRecordId: String,
    val sessionId: String,
    val expectedVersion: Long,
    val creditType: CreditType,
    val clientRequestId: String,
    val form: ExerciseRecordForm
) {
    init {
        require(previousRecordId.isNotBlank()) { "Previous record ID cannot be empty." }
        require(sessionId.isNotBlank()) { "Session ID cannot be empty." }
        require(expectedVersion >= 1L) { "Previous record version must be positive." }
        require(creditType == CreditType.CourseRelated || creditType == CreditType.General) {
            "Exercise record credit type is invalid."
        }
        require(clientRequestId.length in 1..MaxClientRequestIdLength) {
            "Client request ID must contain 1 to $MaxClientRequestIdLength characters."
        }
        require(clientRequestId.matches(Regex("^[A-Za-z0-9._:-]{1,64}$"))) {
            "Client request ID contains unsupported characters."
        }
        form.normalizedForDraft(creditType)
    }
}

/** Public-safe chain metadata returned separately from the frozen record projection. */
internal data class ExerciseRecordAttemptContext(
    val recordId: String,
    val previousAttemptId: String?,
    val rootAttemptId: String,
    val attemptNumber: Int
) {
    init {
        require(recordId.isNotBlank()) { "Record ID cannot be empty." }
        require(previousAttemptId == null || previousAttemptId.isNotBlank()) {
            "Previous attempt ID cannot be blank."
        }
        require(rootAttemptId.isNotBlank()) { "Root attempt ID cannot be empty." }
        require(attemptNumber >= 1) { "Attempt number must be positive." }
    }
}

internal data class ExerciseRecordResubmissionDraft(
    val draft: ExerciseRecordDraft,
    val attemptContext: ExerciseRecordAttemptContext
) {
    init {
        require(draft.recordId == attemptContext.recordId) {
            "Attempt context must describe the new draft."
        }
        require(attemptContext.previousAttemptId != null) {
            "A resubmission must link to the preceding attempt."
        }
        require(attemptContext.attemptNumber >= 2) {
            "A resubmission must be attempt two or later."
        }
    }
}

internal data class ExerciseRecordDraft(
    val recordId: String,
    val sessionId: String,
    val version: Long
) {
    init {
        require(recordId.isNotBlank()) { "Record ID cannot be empty." }
        require(sessionId.isNotBlank()) { "Session ID cannot be empty." }
        require(version >= 1L) { "Record version must be positive." }
    }
}

internal data class ExerciseRecord(
    val recordId: String,
    val sessionId: String,
    val version: Long,
    val submittedAtEpochMillis: Long,
    val businessDate: java.time.LocalDate,
    val creditedDurationSeconds: Long,
    val reviewStatus: String
) {
    init {
        require(recordId.isNotBlank()) { "Record ID cannot be empty." }
        require(sessionId.isNotBlank()) { "Session ID cannot be empty." }
        require(version >= 1L) { "Record version must be positive." }
        require(submittedAtEpochMillis >= 0L) { "Submission time cannot be negative." }
        require(creditedDurationSeconds >= 0L) { "Credited duration cannot be negative." }
        require(reviewStatus.isNotBlank()) { "Review status cannot be empty." }
    }
}

internal class ExerciseRecordVersionConflictException(
    message: String = "Exercise record version conflict."
) : IllegalStateException(message)

internal enum class ExerciseRecordAction {
    CREATE,
    UPDATE,
    SUBMIT
}

internal enum class ExerciseRecordRejection {
    OPERATION_IN_PROGRESS,
    INVALID_STATE,
    INVALID_FORM
}

internal data class ExerciseRecordRecoverableFailure(
    val action: ExerciseRecordAction,
    val cause: Throwable
)

internal data class ExerciseRecordWorkflowState(
    val completedSession: ExerciseSessionRecord? = null,
    val clientRequestId: String? = null,
    val remoteDraft: ExerciseRecordDraft? = null,
    val form: ExerciseRecordForm = ExerciseRecordForm(),
    val isFormSynced: Boolean = false,
    val submittedRecord: ExerciseRecord? = null,
    val inFlightAction: ExerciseRecordAction? = null,
    val recoverableFailure: ExerciseRecordRecoverableFailure? = null
)

internal sealed interface ExerciseRecordOperationResult {
    data class Success(
        val state: ExerciseRecordWorkflowState
    ) : ExerciseRecordOperationResult

    data class Rejected(
        val reason: ExerciseRecordRejection
    ) : ExerciseRecordOperationResult

    data class Failed(
        val retainedState: ExerciseRecordWorkflowState,
        val cause: Throwable
    ) : ExerciseRecordOperationResult
}

/** Record orchestration only; media upload and transport remain outside this class. */
internal class ExerciseRecordCoordinator(
    private val gateway: ExerciseGateway,
    private val clientRequestIdProvider: () -> String = {
        "android-record-${UUID.randomUUID()}"
    }
) {
    private val operationMutex = Mutex()

    var state: ExerciseRecordWorkflowState = ExerciseRecordWorkflowState()
        private set

    suspend fun begin(
        completedSession: ExerciseSessionRecord
    ): ExerciseRecordOperationResult {
        if (
            completedSession.phase != ExerciseSessionPhase.COMPLETED ||
            completedSession.activeDurationSeconds < MinimumValidExerciseDurationSeconds ||
            state.inFlightAction != null ||
            state.submittedRecord != null
        ) {
            return invalidState()
        }
        val clientRequestId = runCatching { clientRequestIdProvider().trim() }
            .getOrNull()
            ?.takeIf { it.length in 1..MaxClientRequestIdLength }
            ?: return ExerciseRecordOperationResult.Rejected(
                ExerciseRecordRejection.INVALID_STATE
            )
        state = ExerciseRecordWorkflowState(
            completedSession = completedSession,
            clientRequestId = clientRequestId
        )
        return success()
    }

    fun edit(form: ExerciseRecordForm): ExerciseRecordOperationResult {
        if (
            state.inFlightAction != null ||
            state.completedSession == null ||
            state.submittedRecord != null
        ) {
            return invalidState()
        }
        state = state.copy(
            form = form,
            isFormSynced = false,
            recoverableFailure = null
        )
        return success()
    }

    fun attachAvailableMedia(
        evidence: List<ExerciseMediaEvidence>
    ): ExerciseRecordOperationResult {
        val sessionId = state.completedSession?.sessionId ?: return invalidState()
        if (state.inFlightAction != null || state.submittedRecord != null) return invalidState()
        val references = runCatching {
            require(evidence.isNotEmpty()) { "At least one media item is required." }
            require(evidence.all { it.sessionId == sessionId }) {
                "Media belongs to a different exercise session."
            }
            require(evidence.all { it.status == ExerciseMediaServerStatus.AVAILABLE }) {
                "Only AVAILABLE media can be attached to an exercise record."
            }
            require(evidence.map { it.mediaId }.distinct().size == evidence.size) {
                "The same media item cannot be attached more than once."
            }
            require(evidence.count { it.mediaType == ProofMediaType.Image } <=
                ExerciseMediaPolicy.MaxImageCount) {
                "Too many exercise images are attached."
            }
            require(evidence.count { it.mediaType == ProofMediaType.Video } <=
                ExerciseMediaPolicy.MaxVideoCount) {
                "Too many exercise videos are attached."
            }
            evidence.map(ExerciseMediaEvidence::toRecordReference)
        }.getOrElse {
            return ExerciseRecordOperationResult.Rejected(ExerciseRecordRejection.INVALID_FORM)
        }
        state = state.copy(
            form = state.form.copy(media = references),
            isFormSynced = false,
            recoverableFailure = null
        )
        return success()
    }

    suspend fun updateDraft(): ExerciseRecordOperationResult {
        if (state.submittedRecord != null) return invalidState()
        val completedSession = state.completedSession ?: return invalidState()
        val normalizedForm = runCatching {
            state.form.normalizedForDraft(completedSession.creditType)
        }
            .getOrElse {
                return ExerciseRecordOperationResult.Rejected(
                    ExerciseRecordRejection.INVALID_FORM
                )
            }
        val draft = state.remoteDraft
        if (draft == null) {
            val clientRequestId = state.clientRequestId ?: return invalidState()
            return execute(ExerciseRecordAction.CREATE) {
                val recovered = gateway.findRecordDraft(completedSession.sessionId)
                val created = if (recovered == null) {
                    gateway.createRecordDraft(
                        CreateExerciseRecordDraftCommand(
                            sessionId = completedSession.sessionId,
                            creditType = completedSession.creditType,
                            clientRequestId = clientRequestId,
                            form = normalizedForm
                        )
                    )
                } else {
                    gateway.updateRecordDraft(
                        UpdateExerciseRecordDraftCommand(
                            recordId = recovered.recordId,
                            expectedVersion = recovered.version,
                            creditType = completedSession.creditType,
                            form = normalizedForm
                        )
                    )
                }
                require(created.sessionId == completedSession.sessionId) {
                    "Record draft belongs to a different exercise session."
                }
                state = state.copy(
                    remoteDraft = created,
                    form = normalizedForm,
                    isFormSynced = true
                )
                success()
            }
        }
        return execute(ExerciseRecordAction.UPDATE) {
            val updated = gateway.updateRecordDraft(
                UpdateExerciseRecordDraftCommand(
                    recordId = draft.recordId,
                    expectedVersion = draft.version,
                    creditType = completedSession.creditType,
                    form = normalizedForm
                )
            )
            require(updated.recordId == draft.recordId && updated.sessionId == draft.sessionId) {
                "Server returned a different exercise record draft."
            }
            require(updated.version > draft.version) {
                "Record update did not advance the server version."
            }
            state = state.copy(
                remoteDraft = updated,
                form = normalizedForm,
                isFormSynced = true
            )
            success()
        }
    }

    suspend fun submit(): ExerciseRecordOperationResult {
        val draft = state.remoteDraft ?: return invalidState()
        if (!state.isFormSynced || state.submittedRecord != null) return invalidState()
        val completedSession = state.completedSession ?: return invalidState()
        val sessionId = completedSession.sessionId
        val normalizedForm = runCatching {
            state.form.normalizedForSubmission(completedSession.creditType)
        }
            .getOrElse {
                return ExerciseRecordOperationResult.Rejected(
                    ExerciseRecordRejection.INVALID_FORM
                )
            }
        if (normalizedForm.media.any { it.sessionId != sessionId }) {
            return ExerciseRecordOperationResult.Rejected(
                ExerciseRecordRejection.INVALID_FORM
            )
        }
        return execute(ExerciseRecordAction.SUBMIT) {
            val submitted = gateway.submitRecord(
                SubmitExerciseRecordCommand(
                    recordId = draft.recordId,
                    expectedVersion = draft.version,
                    mediaIds = normalizedForm.media.map(ExerciseMediaReference::mediaId)
                )
            )
            require(
                submitted.recordId == draft.recordId &&
                    submitted.sessionId == draft.sessionId
            ) { "Server returned a different submitted exercise record." }
            require(submitted.version > draft.version) {
                "Record submission did not advance the server version."
            }
            state = state.copy(submittedRecord = submitted)
            success()
        }
    }

    private suspend fun execute(
        action: ExerciseRecordAction,
        operation: suspend () -> ExerciseRecordOperationResult
    ): ExerciseRecordOperationResult {
        if (!operationMutex.tryLock()) {
            return ExerciseRecordOperationResult.Rejected(
                ExerciseRecordRejection.OPERATION_IN_PROGRESS
            )
        }
        state = state.copy(inFlightAction = action, recoverableFailure = null)
        return try {
            operation()
        } catch (error: Exception) {
            if (error is CancellationException) throw error
            state = state.copy(
                inFlightAction = null,
                recoverableFailure = ExerciseRecordRecoverableFailure(action, error)
            )
            ExerciseRecordOperationResult.Failed(state, error)
        } finally {
            if (state.inFlightAction != null) {
                state = state.copy(inFlightAction = null)
            }
            operationMutex.unlock()
        }
    }

    private fun success(): ExerciseRecordOperationResult.Success {
        state = state.copy(inFlightAction = null, recoverableFailure = null)
        return ExerciseRecordOperationResult.Success(state)
    }

    private fun invalidState() = ExerciseRecordOperationResult.Rejected(
        ExerciseRecordRejection.INVALID_STATE
    )
}

internal const val MaxExerciseRecordDescriptionLength = 200
internal const val MaxOtherSportNameLength = 100
internal const val MaxClientRequestIdLength = 64
