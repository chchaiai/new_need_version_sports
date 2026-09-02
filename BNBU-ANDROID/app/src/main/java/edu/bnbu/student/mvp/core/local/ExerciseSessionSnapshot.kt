package edu.bnbu.student.mvp.core.local

data class ExerciseSessionSnapshot(
    val schemaVersion: Int,
    val phase: String,
    val sessionId: String,
    val creditType: String = "",
    val sportType: String = "",
    val customSportName: String? = null,
    val description: String? = null,
    val startedAtEpochMillis: Long,
    val activeSegmentStartedAtEpochMillis: Long? = null,
    val pausedAtEpochMillis: Long? = null,
    val endedAtEpochMillis: Long? = null,
    val accumulatedActiveMillis: Long = 0L,
    val activeDurationMillis: Long? = null,
    val creditedHours: Int? = null
) {
    companion object {
        const val CurrentSchemaVersion = 2
        const val PhaseActive = "active"
        const val PhasePaused = "paused"
        const val PhaseFinished = "finished"
    }
}

interface ExerciseSessionSnapshotStorage {
    fun readExerciseSessionSnapshot(accountId: String): LocalStoreReadResult<ExerciseSessionSnapshot>

    fun saveExerciseSessionSnapshot(
        accountId: String,
        snapshot: ExerciseSessionSnapshot
    ): Boolean

    fun clearExerciseSessionSnapshot(accountId: String)
}
