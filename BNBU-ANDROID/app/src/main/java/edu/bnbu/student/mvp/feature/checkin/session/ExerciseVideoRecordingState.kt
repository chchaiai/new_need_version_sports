package edu.bnbu.student.mvp.feature.checkin.session

internal enum class ExerciseVideoRecordingPhase {
    READY,
    RECORDING,
    PAUSED,
    FINALIZING,
    FINISHED
}

/** Pure recording clock: CameraX reports active encoded time, so pauses never consume the limit. */
internal class ExerciseVideoRecordingState(
    private val maximumDurationNanos: Long = MaximumVideoRecordingDurationNanos
) {
    init {
        require(maximumDurationNanos > 0L) { "Maximum recording duration must be positive." }
    }

    var phase: ExerciseVideoRecordingPhase = ExerciseVideoRecordingPhase.READY
        private set

    var recordedDurationNanos: Long = 0L
        private set

    val remainingDurationNanos: Long
        get() = (maximumDurationNanos - recordedDurationNanos).coerceAtLeast(0L)

    fun start() {
        check(phase == ExerciseVideoRecordingPhase.READY)
        phase = ExerciseVideoRecordingPhase.RECORDING
    }

    fun pause() {
        check(phase == ExerciseVideoRecordingPhase.RECORDING)
        phase = ExerciseVideoRecordingPhase.PAUSED
    }

    fun resume() {
        check(phase == ExerciseVideoRecordingPhase.PAUSED)
        phase = ExerciseVideoRecordingPhase.RECORDING
    }

    /** Returns true once, when CameraX active recording time reaches the 15-second limit. */
    fun updateDuration(durationNanos: Long): Boolean {
        if (phase == ExerciseVideoRecordingPhase.FINISHED) return false
        recordedDurationNanos = maxOf(recordedDurationNanos, durationNanos.coerceAtLeast(0L))
            .coerceAtMost(maximumDurationNanos)
        if (
            recordedDurationNanos >= maximumDurationNanos &&
            phase != ExerciseVideoRecordingPhase.FINALIZING
        ) {
            phase = ExerciseVideoRecordingPhase.FINALIZING
            return true
        }
        return false
    }

    fun stop() {
        if (phase == ExerciseVideoRecordingPhase.RECORDING || phase == ExerciseVideoRecordingPhase.PAUSED) {
            phase = ExerciseVideoRecordingPhase.FINALIZING
        }
    }

    fun finish() {
        phase = ExerciseVideoRecordingPhase.FINISHED
    }
}

internal const val MaximumVideoRecordingDurationNanos = 15_000_000_000L
