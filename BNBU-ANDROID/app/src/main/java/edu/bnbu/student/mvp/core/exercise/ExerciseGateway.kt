package edu.bnbu.student.mvp.core.exercise

import edu.bnbu.student.mvp.core.model.CreditType

/**
 * Business boundary implemented by the OpenAPI v1 adapter.
 *
 * The backend ExerciseSession projection deliberately does not contain the
 * client-selected credit/sport presentation fields.  The current local mirror
 * is therefore passed to reads and mutations so an authoritative server
 * response can be combined with those client-only fields without pretending
 * that the backend returned them.
 */
internal interface ExerciseGateway {
    suspend fun start(command: StartExerciseCommand): ExerciseSessionRecord

    suspend fun getActive(localMirror: ExerciseSessionRecord? = null): ExerciseSessionRecord?

    suspend fun get(
        sessionId: String,
        localMirror: ExerciseSessionRecord? = null
    ): ExerciseSessionRecord

    suspend fun pause(current: ExerciseSessionRecord): ExerciseSessionRecord

    suspend fun resume(current: ExerciseSessionRecord): ExerciseSessionRecord

    /** Adds one formal 60-minute block through the authoritative Backend. */
    suspend fun addSixtyMinutes(current: ExerciseSessionRecord): ExerciseSessionRecord

    suspend fun finish(current: ExerciseSessionRecord): ExerciseSessionRecord

    suspend fun cancel(current: ExerciseSessionRecord): ExerciseSessionRecord

    suspend fun createRecordDraft(
        command: CreateExerciseRecordDraftCommand
    ): ExerciseRecordDraft

    suspend fun findRecordDraft(sessionId: String): ExerciseRecordDraft?

    suspend fun updateRecordDraft(
        command: UpdateExerciseRecordDraftCommand
    ): ExerciseRecordDraft

    suspend fun submitRecord(command: SubmitExerciseRecordCommand): ExerciseRecord
}

/** Isolated client adapter for the Backend's guarded test-tool endpoints. */
internal interface ExerciseTestToolsGateway {
    /** Returns only stable capability identifiers; 404 and missing identifiers fail closed. */
    suspend fun capabilities(): Set<String>

    /** Advances exactly 3,600 synthetic seconds; the amount is not caller-controlled. */
    suspend fun advanceDurationOneHour(sessionId: String, expectedVersion: Long)
}

/**
 * Additive boundary for INVALID record attempts.
 *
 * A resubmission creates a new DRAFT record from a newly completed Session. It
 * never re-opens or mutates the preceding INVALID record.
 */
internal interface ExerciseRecordResubmissionGateway {
    suspend fun getRecordAttemptContext(recordId: String): ExerciseRecordAttemptContext

    suspend fun createRecordResubmission(
        command: CreateExerciseRecordResubmissionCommand
    ): ExerciseRecordResubmissionDraft
}

internal enum class ExerciseSessionPhase {
    ACTIVE,
    PAUSED,
    COMPLETED,
    CANCELLED,
    EXPIRED
}

internal data class StartExerciseCommand(
    val creditType: CreditType,
    val sportType: String,
    val customSportName: String? = null
) {
    init {
        require(creditType == CreditType.CourseRelated || creditType == CreditType.General) {
            "Exercise session credit type is invalid."
        }
        require(sportType.isNotBlank()) { "Sport type cannot be empty." }
        if (sportType.equals(ExerciseRecordForm.OtherSportType, ignoreCase = true)) {
            val normalizedCustomSportName = customSportName?.trim()
            require(
                normalizedCustomSportName != null &&
                    normalizedCustomSportName.length in 1..MaxOtherSportNameLength
            ) {
                "Other sport name must contain 1 to $MaxOtherSportNameLength characters."
            }
        } else {
            require(customSportName.isNullOrBlank()) {
                "Custom sport name is only valid when sport type is OTHER."
            }
        }
    }
}

internal data class ExerciseSessionRecord(
    val sessionId: String,
    val phase: ExerciseSessionPhase,
    val version: Long,
    val enrollmentId: String? = null,
    /** Client-only selection; it is not part of the ExerciseSession response. */
    val creditType: CreditType,
    /** Client-only selection; it is not part of the ExerciseSession response. */
    val sportType: String,
    /** Client-only selection; it is not part of the ExerciseSession response. */
    val customSportName: String? = null,
    val startedAtEpochMillis: Long,
    val activeDurationSeconds: Long,
    val endedAtEpochMillis: Long? = null
) {
    init {
        require(sessionId.isNotBlank()) { "Session ID cannot be empty." }
        require(enrollmentId == null || enrollmentId.isNotBlank()) {
            "Enrollment ID cannot be blank."
        }
        require(version >= 0L) { "Session version cannot be negative." }
        require(creditType == CreditType.CourseRelated || creditType == CreditType.General) {
            "Exercise session credit type is invalid."
        }
        require(sportType.isNotBlank()) { "Sport type cannot be empty." }
        require(startedAtEpochMillis >= 0L) { "Start time cannot be negative." }
        require(activeDurationSeconds in 0L..MaximumExerciseDurationSeconds) {
            "Active duration must be between 0 and $MaximumExerciseDurationSeconds seconds."
        }
        require(
            activeDurationSeconds < MaximumExerciseDurationSeconds ||
                phase == ExerciseSessionPhase.COMPLETED
        ) { "A session at the two-hour limit must be COMPLETED." }
        require(endedAtEpochMillis == null || endedAtEpochMillis >= startedAtEpochMillis) {
            "End time cannot be earlier than start time."
        }
        require(phase != ExerciseSessionPhase.COMPLETED || endedAtEpochMillis != null) {
            "Completed sessions require an end time."
        }
    }
}

/**
 * Safe, presentation-only projection for an authoritative active Session that
 * this device cannot prove it owns. It deliberately omits control context.
 */
internal data class ExistingRemoteExerciseSession(
    val sessionId: String,
    val phase: ExerciseSessionPhase,
    val startedAtEpochMillis: Long,
    val requestId: String
) {
    init {
        require(sessionId.isNotBlank()) { "Session ID cannot be empty." }
        require(phase == ExerciseSessionPhase.ACTIVE || phase == ExerciseSessionPhase.PAUSED) {
            "Only an active or paused Session can block another device."
        }
        require(startedAtEpochMillis >= 0L) { "Start time cannot be negative." }
        require(requestId.isNotBlank()) { "Request ID cannot be empty." }
    }
}

internal class ExerciseSessionAlreadyActiveOnAnotherDeviceException(
    val existing: ExistingRemoteExerciseSession
) : IllegalStateException(
    "An authoritative exercise session is already active on another device " +
        "(requestId=${existing.requestId})."
)

internal const val MinimumValidExerciseDurationSeconds = 60L * 60L
internal const val MaximumExerciseDurationSeconds = 2L * 60L * 60L
