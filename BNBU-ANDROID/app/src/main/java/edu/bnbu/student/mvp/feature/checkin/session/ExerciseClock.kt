package edu.bnbu.student.mvp.feature.checkin.session

internal fun interface ExerciseClock {
    fun nowEpochMillis(): Long
}

internal object SystemExerciseClock : ExerciseClock {
    override fun nowEpochMillis(): Long = System.currentTimeMillis()
}
