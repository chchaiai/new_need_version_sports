package edu.bnbu.student.mvp.feature.checkin.session

import edu.bnbu.student.mvp.core.local.ExerciseSessionSnapshot
import edu.bnbu.student.mvp.core.local.ExerciseSessionSnapshotStorage
import edu.bnbu.student.mvp.core.local.LocalStoreReadStatus
import edu.bnbu.student.mvp.core.model.CreditType

internal data class ExerciseSessionRestoreResult(
    val state: ExerciseSessionState,
    val status: LocalStoreReadStatus
)

internal class ExerciseSessionStore(
    private val storage: ExerciseSessionSnapshotStorage
) {
    fun save(accountId: String, state: ExerciseSessionState): Boolean {
        if (accountId.isBlank()) return false
        if (state == ExerciseSessionState.Idle || state is ExerciseSessionState.Submitted) {
            storage.clearExerciseSessionSnapshot(accountId)
            return true
        }
        val snapshot = state.toSnapshot()
        if (snapshot.toExerciseSessionStateOrNull() == null) return false
        return storage.saveExerciseSessionSnapshot(accountId, snapshot)
    }

    fun restore(accountId: String): ExerciseSessionRestoreResult {
        if (accountId.isBlank()) {
            return ExerciseSessionRestoreResult(
                state = ExerciseSessionState.Idle,
                status = LocalStoreReadStatus.Discarded
            )
        }
        val stored = storage.readExerciseSessionSnapshot(accountId)
        val snapshot = stored.value
        if (snapshot == null) {
            if (stored.status == LocalStoreReadStatus.DecodeFailed) {
                storage.clearExerciseSessionSnapshot(accountId)
                return ExerciseSessionRestoreResult(
                    state = ExerciseSessionState.Idle,
                    status = LocalStoreReadStatus.Discarded
                )
            }
            return ExerciseSessionRestoreResult(ExerciseSessionState.Idle, stored.status)
        }
        val restored = snapshot.toExerciseSessionStateOrNull()
        if (restored == null) {
            storage.clearExerciseSessionSnapshot(accountId)
            return ExerciseSessionRestoreResult(
                state = ExerciseSessionState.Idle,
                status = LocalStoreReadStatus.Discarded
            )
        }
        return ExerciseSessionRestoreResult(restored, LocalStoreReadStatus.Loaded)
    }

    fun clear(accountId: String) {
        if (accountId.isNotBlank()) storage.clearExerciseSessionSnapshot(accountId)
    }
}

internal fun ExerciseSessionState.toSnapshot(): ExerciseSessionSnapshot {
    return when (this) {
        ExerciseSessionState.Idle -> error("Idle sessions are cleared instead of persisted")
        is ExerciseSessionState.Active -> ExerciseSessionSnapshot(
            schemaVersion = ExerciseSessionSnapshot.CurrentSchemaVersion,
            phase = ExerciseSessionSnapshot.PhaseActive,
            sessionId = sessionId,
            creditType = details.creditType.name,
            sportType = details.sportType,
            customSportName = details.customSportName,
            description = details.description,
            startedAtEpochMillis = startedAtEpochMillis,
            activeSegmentStartedAtEpochMillis = activeSegmentStartedAtEpochMillis,
            accumulatedActiveMillis = accumulatedActiveMillis
        )

        is ExerciseSessionState.Paused -> ExerciseSessionSnapshot(
            schemaVersion = ExerciseSessionSnapshot.CurrentSchemaVersion,
            phase = ExerciseSessionSnapshot.PhasePaused,
            sessionId = sessionId,
            creditType = details.creditType.name,
            sportType = details.sportType,
            customSportName = details.customSportName,
            description = details.description,
            startedAtEpochMillis = startedAtEpochMillis,
            pausedAtEpochMillis = pausedAtEpochMillis,
            accumulatedActiveMillis = accumulatedActiveMillis
        )

        is ExerciseSessionState.Finished -> ExerciseSessionSnapshot(
            schemaVersion = ExerciseSessionSnapshot.CurrentSchemaVersion,
            phase = ExerciseSessionSnapshot.PhaseFinished,
            sessionId = sessionId,
            creditType = details.creditType.name,
            sportType = details.sportType,
            customSportName = details.customSportName,
            description = details.description,
            startedAtEpochMillis = startedAtEpochMillis,
            endedAtEpochMillis = endedAtEpochMillis,
            activeDurationMillis = activeDurationMillis,
            creditedHours = creditedHours
        )

        is ExerciseSessionState.Submitted -> error("Submitted sessions are cleared instead of persisted")
    }
}

internal fun ExerciseSessionSnapshot.toExerciseSessionStateOrNull(): ExerciseSessionState? {
    if (schemaVersion != ExerciseSessionSnapshot.CurrentSchemaVersion) return null
    if (sessionId.isBlank() || startedAtEpochMillis < 0L) return null
    val details = ExerciseSessionDetails(
        creditType = CreditType.entries.firstOrNull { it.name == creditType } ?: return null,
        sportType = sportType,
        customSportName = customSportName,
        description = description.orEmpty()
    )
    if (!details.isValid) return null
    return when (phase) {
        ExerciseSessionSnapshot.PhaseActive -> {
            val segmentStartedAt = activeSegmentStartedAtEpochMillis ?: return null
            if (segmentStartedAt < startedAtEpochMillis) return null
            if (accumulatedActiveMillis !in 0L until MaximumExerciseMillis) return null
            ExerciseSessionState.Active(
                sessionId = sessionId,
                details = details,
                startedAtEpochMillis = startedAtEpochMillis,
                activeSegmentStartedAtEpochMillis = segmentStartedAt,
                accumulatedActiveMillis = accumulatedActiveMillis
            )
        }

        ExerciseSessionSnapshot.PhasePaused -> {
            val pausedAt = pausedAtEpochMillis ?: return null
            if (pausedAt < startedAtEpochMillis) return null
            if (accumulatedActiveMillis !in 0L..MaximumExerciseMillis) return null
            if (accumulatedActiveMillis == MaximumExerciseMillis) {
                ExerciseSessionState.Finished(
                    sessionId = sessionId,
                    details = details,
                    startedAtEpochMillis = startedAtEpochMillis,
                    endedAtEpochMillis = pausedAt,
                    activeDurationMillis = MaximumExerciseMillis,
                    creditedHours = 2
                )
            } else {
                ExerciseSessionState.Paused(
                    sessionId = sessionId,
                    details = details,
                    startedAtEpochMillis = startedAtEpochMillis,
                    pausedAtEpochMillis = pausedAt,
                    accumulatedActiveMillis = accumulatedActiveMillis
                )
            }
        }

        ExerciseSessionSnapshot.PhaseFinished -> {
            val endedAt = endedAtEpochMillis ?: return null
            val duration = activeDurationMillis ?: return null
            if (endedAt < startedAtEpochMillis) return null
            if (duration !in MinimumValidExerciseMillis..MaximumExerciseMillis) return null
            val derivedCredits = creditedExerciseHours(duration)
            if (creditedHours != derivedCredits) return null
            ExerciseSessionState.Finished(
                sessionId = sessionId,
                details = details,
                startedAtEpochMillis = startedAtEpochMillis,
                endedAtEpochMillis = endedAt,
                activeDurationMillis = duration,
                creditedHours = derivedCredits
            )
        }

        else -> null
    }
}
