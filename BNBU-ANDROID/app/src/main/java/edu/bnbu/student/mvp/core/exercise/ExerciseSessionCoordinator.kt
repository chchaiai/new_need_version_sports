package edu.bnbu.student.mvp.core.exercise

import java.util.concurrent.CancellationException
import kotlinx.coroutines.sync.Mutex

internal enum class ExerciseSessionAction {
    RESTORE,
    START,
    PAUSE,
    RESUME,
    ADD_SIXTY_MINUTES,
    FINISH,
    CANCEL
}

internal enum class ExerciseOperationRejection {
    OPERATION_IN_PROGRESS,
    INVALID_STATE
}

internal data class ExerciseRecoverableFailure(
    val action: ExerciseSessionAction,
    val cause: Throwable
)

internal data class ExerciseSessionCoordinatorState(
    val session: ExerciseSessionRecord? = null,
    val existingRemoteSession: ExistingRemoteExerciseSession? = null,
    val inFlightAction: ExerciseSessionAction? = null,
    val recoverableFailure: ExerciseRecoverableFailure? = null
)

internal sealed interface ExerciseSessionOperationResult {
    data class Success(val session: ExerciseSessionRecord?) : ExerciseSessionOperationResult

    data class Rejected(
        val reason: ExerciseOperationRejection
    ) : ExerciseSessionOperationResult

    data class Failed(
        val retainedSession: ExerciseSessionRecord?,
        val cause: Throwable
    ) : ExerciseSessionOperationResult

    data class AlreadyActive(
        val existingRemoteSession: ExistingRemoteExerciseSession
    ) : ExerciseSessionOperationResult
}

internal class ExerciseVersionConflictException(
    message: String = "Exercise session version conflict."
) : IllegalStateException(message)

internal class ExerciseCheckInNotRequiredException(
    message: String = "The required valid exercise duration has already been reached."
) : IllegalStateException(message)

/**
 * Coordinates the server-authoritative session mirror without depending on HTTP.
 * Failed mutations retain the last confirmed state and are always safe to retry.
 */
internal class ExerciseSessionCoordinator(
    private val gateway: ExerciseGateway
) {
    private val operationMutex = Mutex()

    var state: ExerciseSessionCoordinatorState = ExerciseSessionCoordinatorState()
        private set

    suspend fun restore(
        localMirror: ExerciseSessionRecord?
    ): ExerciseSessionOperationResult = execute(ExerciseSessionAction.RESTORE) {
        state = state.copy(session = localMirror, existingRemoteSession = null)
        val serverActive = try {
            gateway.getActive(localMirror)
        } catch (conflict: ExerciseSessionAlreadyActiveOnAnotherDeviceException) {
            return@execute completeRemoteConflict(conflict.existing)
        }
        val authoritative = serverActive ?: localMirror?.takeIf {
            it.phase == ExerciseSessionPhase.COMPLETED
        }
        complete(authoritative)
    }

    suspend fun start(command: StartExerciseCommand): ExerciseSessionOperationResult {
        if (state.session != null || state.existingRemoteSession != null) return invalidState()
        return execute(ExerciseSessionAction.START) {
            val started = try {
                gateway.start(command)
            } catch (conflict: ExerciseSessionAlreadyActiveOnAnotherDeviceException) {
                return@execute completeRemoteConflict(conflict.existing)
            }
            require(started.phase == ExerciseSessionPhase.ACTIVE) {
                "Start must return an ACTIVE session."
            }
            complete(started)
        }
    }

    suspend fun pause(): ExerciseSessionOperationResult {
        val current = state.session?.takeIf { it.phase == ExerciseSessionPhase.ACTIVE }
            ?: return invalidState()
        return mutate(ExerciseSessionAction.PAUSE, current) {
            gateway.pause(current)
        }
    }

    suspend fun resume(): ExerciseSessionOperationResult {
        val current = state.session?.takeIf { it.phase == ExerciseSessionPhase.PAUSED }
            ?: return invalidState()
        return mutate(ExerciseSessionAction.RESUME, current) {
            gateway.resume(current)
        }
    }

    suspend fun addSixtyMinutes(): ExerciseSessionOperationResult {
        val current = state.session?.takeIf {
            it.phase == ExerciseSessionPhase.ACTIVE || it.phase == ExerciseSessionPhase.PAUSED
        } ?: return invalidState()
        return mutate(ExerciseSessionAction.ADD_SIXTY_MINUTES, current) {
            gateway.addSixtyMinutes(current)
        }
    }

    suspend fun finish(): ExerciseSessionOperationResult {
        val current = state.session?.takeIf {
            it.phase == ExerciseSessionPhase.ACTIVE || it.phase == ExerciseSessionPhase.PAUSED
        } ?: return invalidState()
        return mutate(ExerciseSessionAction.FINISH, current) {
            gateway.finish(current)
        }
    }

    suspend fun cancel(): ExerciseSessionOperationResult {
        val current = state.session?.takeIf {
            it.phase == ExerciseSessionPhase.ACTIVE || it.phase == ExerciseSessionPhase.PAUSED
        } ?: return invalidState()
        return mutate(ExerciseSessionAction.CANCEL, current) {
            gateway.cancel(current)
        }
    }

    /** Re-reads the current Session by id after an out-of-band local/test tool. */
    suspend fun refreshCurrent(): ExerciseSessionOperationResult {
        val current = state.session ?: return invalidState()
        return execute(ExerciseSessionAction.RESTORE) {
            val refreshed = gateway.get(current.sessionId, current)
            require(refreshed.sessionId == current.sessionId) {
                "Server returned a different exercise session."
            }
            complete(refreshed)
        }
    }

    fun clearCompletedSession(): Boolean {
        if (state.inFlightAction != null || state.session?.phase != ExerciseSessionPhase.COMPLETED) {
            return false
        }
        state = ExerciseSessionCoordinatorState()
        return true
    }

    private suspend fun mutate(
        action: ExerciseSessionAction,
        previous: ExerciseSessionRecord,
        request: suspend () -> ExerciseSessionRecord
    ): ExerciseSessionOperationResult = execute(action) {
        val updated = request()
        require(updated.sessionId == previous.sessionId) {
            "Server returned a different exercise session."
        }
        val expectedPhase = when (action) {
            ExerciseSessionAction.PAUSE -> ExerciseSessionPhase.PAUSED
            ExerciseSessionAction.RESUME -> ExerciseSessionPhase.ACTIVE
            ExerciseSessionAction.FINISH -> ExerciseSessionPhase.COMPLETED
            ExerciseSessionAction.CANCEL -> ExerciseSessionPhase.CANCELLED
            else -> error("Unsupported mutation action: $action")
        }
        require(updated.phase == expectedPhase) {
            "$action returned ${updated.phase}, expected $expectedPhase."
        }
        require(updated.version > previous.version) {
            "$action did not advance the server version."
        }
        complete(updated)
    }

    private suspend fun execute(
        action: ExerciseSessionAction,
        operation: suspend () -> ExerciseSessionOperationResult
    ): ExerciseSessionOperationResult {
        if (!operationMutex.tryLock()) {
            return ExerciseSessionOperationResult.Rejected(
                ExerciseOperationRejection.OPERATION_IN_PROGRESS
            )
        }
        val previous = state.session
        val previousRemoteConflict = state.existingRemoteSession
        state = state.copy(inFlightAction = action, recoverableFailure = null)
        return try {
            operation()
        } catch (error: Exception) {
            if (error is CancellationException) throw error
            val fallback = state.session ?: previous
            val retained = if (error is ExerciseVersionConflictException) {
                val refreshed = fallback?.let { current ->
                    runCatching { gateway.get(current.sessionId, current) }
                }
                if (refreshed?.isSuccess == true) refreshed.getOrNull() else fallback
            } else {
                fallback
            }
            state = ExerciseSessionCoordinatorState(
                session = retained,
                existingRemoteSession = previousRemoteConflict,
                recoverableFailure = ExerciseRecoverableFailure(action, error)
            )
            ExerciseSessionOperationResult.Failed(retained, error)
        } finally {
            if (state.inFlightAction != null) {
                state = state.copy(inFlightAction = null)
            }
            operationMutex.unlock()
        }
    }

    private fun complete(
        session: ExerciseSessionRecord?
    ): ExerciseSessionOperationResult.Success {
        state = ExerciseSessionCoordinatorState(session = session)
        return ExerciseSessionOperationResult.Success(session)
    }

    private fun completeRemoteConflict(
        existing: ExistingRemoteExerciseSession
    ): ExerciseSessionOperationResult.AlreadyActive {
        // Never install another device's Session as a controllable local mirror.
        state = ExerciseSessionCoordinatorState(existingRemoteSession = existing)
        return ExerciseSessionOperationResult.AlreadyActive(existing)
    }

    private fun invalidState() = ExerciseSessionOperationResult.Rejected(
        ExerciseOperationRejection.INVALID_STATE
    )
}
