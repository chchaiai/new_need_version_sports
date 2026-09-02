package edu.bnbu.student.mvp.feature.checkin.session

import edu.bnbu.student.mvp.core.exercise.ExerciseSessionPhase
import edu.bnbu.student.mvp.core.exercise.MaxOtherSportNameLength
import edu.bnbu.student.mvp.core.exercise.requiresExerciseDescription
import edu.bnbu.student.mvp.core.model.CreditType
import edu.bnbu.student.mvp.core.designsystem.interfaceText

internal const val MinimumValidExerciseMillis = 60L * 60L * 1_000L
internal const val MaximumExerciseMillis = 2L * 60L * 60L * 1_000L
internal const val MaxExerciseDescriptionLength = 200
internal val ExerciseTooShortMessage: String
    get() = interfaceText(
        "运动时长未满 1 小时，本次不会计入打卡时长，计时已清零，本地草稿已清除。",
        "This exercise is under 1 hour and will not count toward check-in hours. The timer and local drafts were cleared."
    )

internal fun truncateExerciseDescription(value: String): String =
    value.take(MaxExerciseDescriptionLength)

/** Trims the required user-provided description before submission. */
internal fun ExerciseSessionDetails.descriptionForSubmission(): String {
    return description.trim()
}

internal data class CourseSportSelection(
    val sportType: String,
    val displayName: String,
    val customSportName: String? = null
)

/**
 * Resolves the single sport shown for a course-related check-in.
 *
 * The courses API currently exposes the course name rather than a dedicated
 * sport field, so known sports are matched from that name. Unknown sports use
 * the existing custom-sport path and remain valid.
 */
internal fun courseSportSelection(courseName: String): CourseSportSelection {
    val normalizedName = courseName.trim()
    val knownSports = listOf(
        Triple("table_tennis", "乒乓球", listOf("乒乓球", "table tennis", "ping pong", "ping-pong")),
        Triple("badminton", "羽毛球", listOf("羽毛球", "badminton")),
        Triple("basketball", "篮球", listOf("篮球", "basketball")),
        Triple("football", "足球", listOf("足球", "football", "soccer")),
        Triple("swimming", "游泳", listOf("游泳", "swimming")),
        Triple("running", "跑步", listOf("跑步", "长跑", "running")),
        Triple("cycling", "骑行", listOf("骑行", "cycling")),
        Triple("fitness", "健身", listOf("健身", "体能", "力量训练", "fitness"))
    )
    val matched = knownSports.firstOrNull { (_, _, keywords) ->
        keywords.any { normalizedName.contains(it, ignoreCase = true) }
    }
    if (matched != null) {
        return CourseSportSelection(
            sportType = matched.first,
            displayName = matched.second
        )
    }

    val parenthesizedName = Regex("[（(]([^（）()]+)[）)]")
        .findAll(normalizedName)
        .lastOrNull()
        ?.groupValues
        ?.getOrNull(1)
        ?.trim()
    val displayName = parenthesizedName
        ?.takeIf { it.isNotBlank() }
        ?: normalizedName.ifBlank { "课程运动" }
    return CourseSportSelection(
        sportType = ExerciseSessionDetails.OtherSportType,
        displayName = displayName,
        customSportName = displayName
    )
}

internal data class ExerciseSessionDetails(
    val creditType: CreditType,
    val sportType: String,
    val customSportName: String? = null,
    val description: String = ""
) {
    val isValid: Boolean
        get() = creditType in setOf(CreditType.CourseRelated, CreditType.General) &&
            sportType in SupportedSportTypes &&
            if (sportType == OtherSportType) {
                !customSportName.isNullOrBlank() &&
                    customSportName.length <= MaxOtherSportNameLength
            } else {
                customSportName.isNullOrBlank()
            }

    companion object {
        const val OtherSportType = "other"
        val SupportedSportTypes = setOf(
            "running",
            "basketball",
            "football",
            "badminton",
            "table_tennis",
            "swimming",
            "fitness",
            "cycling",
            OtherSportType
        )
    }
}

/** A non-persisted snapshot shown after the server has accepted a check-in. */
internal data class SubmissionSummary(
    val date: String,
    val startTime: String,
    val endTime: String,
    val duration: String,
    val creditedHours: Int,
    val creditType: String,
    val sportType: String,
    val proofCount: Int
)

internal sealed interface ExerciseSessionState {
    data object Idle : ExerciseSessionState

    data class Active(
        val sessionId: String,
        val details: ExerciseSessionDetails,
        val startedAtEpochMillis: Long,
        val activeSegmentStartedAtEpochMillis: Long,
        val accumulatedActiveMillis: Long = 0L
    ) : ExerciseSessionState

    data class Paused(
        val sessionId: String,
        val details: ExerciseSessionDetails,
        val startedAtEpochMillis: Long,
        val pausedAtEpochMillis: Long,
        val accumulatedActiveMillis: Long
    ) : ExerciseSessionState

    data class Finished(
        val sessionId: String,
        val details: ExerciseSessionDetails,
        val startedAtEpochMillis: Long,
        val endedAtEpochMillis: Long,
        val activeDurationMillis: Long,
        val creditedHours: Int
    ) : ExerciseSessionState

    /** Submitted sessions are intentionally never persisted or restored. */
    data class Submitted(
        val creditedHours: Int,
        val summary: SubmissionSummary
    ) : ExerciseSessionState
}

internal sealed interface ExerciseSessionTransition {
    val state: ExerciseSessionState

    data class Changed(
        override val state: ExerciseSessionState
    ) : ExerciseSessionTransition

    data class Discarded(
        override val state: ExerciseSessionState.Idle = ExerciseSessionState.Idle,
        val message: String = ExerciseTooShortMessage
    ) : ExerciseSessionTransition

    data class Rejected(
        override val state: ExerciseSessionState,
        val reason: String
    ) : ExerciseSessionTransition
}

internal class ExerciseSessionMachine(
    private val clock: ExerciseClock = SystemExerciseClock
) {
    fun start(
        state: ExerciseSessionState,
        sessionId: String,
        details: ExerciseSessionDetails
    ): ExerciseSessionTransition {
        if (state != ExerciseSessionState.Idle) {
            return ExerciseSessionTransition.Rejected(state, interfaceText("已有进行中的运动会话", "An exercise session is already in progress."))
        }
        if (sessionId.isBlank()) {
            return ExerciseSessionTransition.Rejected(state, interfaceText("运动会话编号不能为空", "Exercise session ID cannot be empty."))
        }
        if (!details.isValid) {
            return ExerciseSessionTransition.Rejected(state, interfaceText("打卡类别或运动项目无效", "The check-in category or exercise type is invalid."))
        }
        val now = clock.nowEpochMillis()
        return ExerciseSessionTransition.Changed(
            ExerciseSessionState.Active(
                sessionId = sessionId,
                details = details,
                startedAtEpochMillis = now,
                activeSegmentStartedAtEpochMillis = now
            )
        )
    }

    fun pause(state: ExerciseSessionState): ExerciseSessionTransition {
        if (state !is ExerciseSessionState.Active) {
            return ExerciseSessionTransition.Rejected(state, interfaceText("只有运动中的会话可以暂停", "Only an active exercise session can be paused."))
        }
        val now = clock.nowEpochMillis()
        if (state.effectiveDurationMillis(now) >= MaximumExerciseMillis) {
            return ExerciseSessionTransition.Changed(state.finishedAtLimit())
        }
        return ExerciseSessionTransition.Changed(
            ExerciseSessionState.Paused(
                sessionId = state.sessionId,
                details = state.details,
                startedAtEpochMillis = state.startedAtEpochMillis,
                pausedAtEpochMillis = now,
                accumulatedActiveMillis = state.effectiveDurationMillis(now)
            )
        )
    }

    fun resume(state: ExerciseSessionState): ExerciseSessionTransition {
        if (state !is ExerciseSessionState.Paused) {
            return ExerciseSessionTransition.Rejected(state, interfaceText("只有已暂停的会话可以继续", "Only a paused exercise session can be resumed."))
        }
        if (state.accumulatedActiveMillis >= MaximumExerciseMillis) {
            return ExerciseSessionTransition.Rejected(state, interfaceText("已达到 2 小时运动上限，请确认结束本次运动", "The 2-hour exercise limit has been reached. End this exercise session."))
        }
        val now = clock.nowEpochMillis()
        return ExerciseSessionTransition.Changed(
            ExerciseSessionState.Active(
                sessionId = state.sessionId,
                details = state.details,
                startedAtEpochMillis = state.startedAtEpochMillis,
                activeSegmentStartedAtEpochMillis = now,
                accumulatedActiveMillis = state.accumulatedActiveMillis
            )
        )
    }

    fun requestFinish(state: ExerciseSessionState): ExerciseSessionTransition {
        val now = clock.nowEpochMillis()
        val duration = state.effectiveDurationMillis(now)
        return when (state) {
            ExerciseSessionState.Idle,
            is ExerciseSessionState.Finished,
            is ExerciseSessionState.Submitted -> {
                ExerciseSessionTransition.Rejected(state, interfaceText("当前没有可以结束的运动会话", "There is no exercise session to end."))
            }

            is ExerciseSessionState.Active -> {
                when {
                    duration >= MaximumExerciseMillis -> {
                        ExerciseSessionTransition.Changed(state.finishedAtLimit())
                    }

                    duration < MinimumValidExerciseMillis -> ExerciseSessionTransition.Discarded()

                    else -> ExerciseSessionTransition.Changed(
                        state.finished(now, duration)
                    )
                }
            }

            is ExerciseSessionState.Paused -> {
                when {
                    duration >= MaximumExerciseMillis -> {
                        ExerciseSessionTransition.Changed(state.finishedAtLimit())
                    }

                    duration < MinimumValidExerciseMillis -> ExerciseSessionTransition.Discarded()

                    else -> ExerciseSessionTransition.Changed(state.finished(now, duration))
                }
            }
        }
    }

    fun autoFinishIfNeeded(state: ExerciseSessionState): ExerciseSessionTransition {
        return when (state) {
            is ExerciseSessionState.Active -> {
                if (state.effectiveDurationMillis(clock.nowEpochMillis()) >= MaximumExerciseMillis) {
                    ExerciseSessionTransition.Changed(state.finishedAtLimit())
                } else {
                    ExerciseSessionTransition.Changed(state)
                }
            }

            is ExerciseSessionState.Paused -> {
                if (state.accumulatedActiveMillis >= MaximumExerciseMillis) {
                    ExerciseSessionTransition.Changed(state.finishedAtLimit())
                } else {
                    ExerciseSessionTransition.Changed(state)
                }
            }

            else -> ExerciseSessionTransition.Changed(state)
        }
    }

    /**
     * Advances only a local synthetic-review session to the two-hour threshold.
     * The controller rejects this path whenever an authoritative server session exists.
     */
    fun advanceToTwoHoursForLocalReview(
        state: ExerciseSessionState
    ): ExerciseSessionTransition {
        val now = clock.nowEpochMillis()
        return when (state) {
            is ExerciseSessionState.Active -> ExerciseSessionTransition.Changed(
                ExerciseSessionState.Paused(
                    sessionId = state.sessionId,
                    details = state.details,
                    startedAtEpochMillis = state.startedAtEpochMillis,
                    pausedAtEpochMillis = now,
                    accumulatedActiveMillis = MaximumExerciseMillis
                )
            )

            is ExerciseSessionState.Paused -> ExerciseSessionTransition.Changed(
                state.copy(
                    pausedAtEpochMillis = now,
                    accumulatedActiveMillis = MaximumExerciseMillis
                )
            )

            ExerciseSessionState.Idle,
            is ExerciseSessionState.Finished,
            is ExerciseSessionState.Submitted -> ExerciseSessionTransition.Rejected(
                state,
                interfaceText(
                    "当前没有可直达 2 小时的测试运动。",
                    "There is no local review exercise that can jump to two hours."
                )
            )
        }
    }
}

internal fun ExerciseSessionState.effectiveDurationMillis(nowEpochMillis: Long): Long {
    return when (this) {
        ExerciseSessionState.Idle -> 0L
        is ExerciseSessionState.Active -> {
            val currentSegment = (nowEpochMillis - activeSegmentStartedAtEpochMillis)
                .coerceAtLeast(0L)
            (accumulatedActiveMillis + currentSegment).coerceIn(0L, MaximumExerciseMillis)
        }

        is ExerciseSessionState.Paused -> accumulatedActiveMillis.coerceIn(0L, MaximumExerciseMillis)
        is ExerciseSessionState.Finished -> activeDurationMillis.coerceIn(0L, MaximumExerciseMillis)
        is ExerciseSessionState.Submitted -> 0L
    }
}

internal fun creditedExerciseHours(activeDurationMillis: Long): Int {
    return when {
        activeDurationMillis >= MaximumExerciseMillis -> 2
        activeDurationMillis >= MinimumValidExerciseMillis -> 1
        else -> 0
    }
}

internal fun ExerciseSessionState.toExerciseSessionPhaseOrNull(): ExerciseSessionPhase? {
    return when (this) {
        ExerciseSessionState.Idle,
        is ExerciseSessionState.Submitted -> null
        is ExerciseSessionState.Active -> ExerciseSessionPhase.ACTIVE
        is ExerciseSessionState.Paused -> ExerciseSessionPhase.PAUSED
        is ExerciseSessionState.Finished -> ExerciseSessionPhase.COMPLETED
    }
}

private fun ExerciseSessionState.Active.finishedAtLimit(): ExerciseSessionState.Finished {
    val remainingActiveMillis = (MaximumExerciseMillis - accumulatedActiveMillis).coerceAtLeast(0L)
    val exactEndEpochMillis = activeSegmentStartedAtEpochMillis + remainingActiveMillis
    return ExerciseSessionState.Finished(
        sessionId = sessionId,
        details = details,
        startedAtEpochMillis = startedAtEpochMillis,
        endedAtEpochMillis = exactEndEpochMillis,
        activeDurationMillis = MaximumExerciseMillis,
        creditedHours = 2
    )
}

private fun ExerciseSessionState.Active.finished(
    endedAtEpochMillis: Long,
    durationMillis: Long
): ExerciseSessionState.Finished {
    return ExerciseSessionState.Finished(
        sessionId = sessionId,
        details = details,
        startedAtEpochMillis = startedAtEpochMillis,
        endedAtEpochMillis = endedAtEpochMillis,
        activeDurationMillis = durationMillis,
        creditedHours = creditedExerciseHours(durationMillis)
    )
}

private fun ExerciseSessionState.Paused.finished(
    endedAtEpochMillis: Long,
    durationMillis: Long
): ExerciseSessionState.Finished {
    return ExerciseSessionState.Finished(
        sessionId = sessionId,
        details = details,
        startedAtEpochMillis = startedAtEpochMillis,
        endedAtEpochMillis = endedAtEpochMillis,
        activeDurationMillis = durationMillis,
        creditedHours = creditedExerciseHours(durationMillis)
    )
}

private fun ExerciseSessionState.Paused.finishedAtLimit(): ExerciseSessionState.Finished {
    return ExerciseSessionState.Finished(
        sessionId = sessionId,
        details = details,
        startedAtEpochMillis = startedAtEpochMillis,
        endedAtEpochMillis = pausedAtEpochMillis,
        activeDurationMillis = MaximumExerciseMillis,
        creditedHours = 2
    )
}
