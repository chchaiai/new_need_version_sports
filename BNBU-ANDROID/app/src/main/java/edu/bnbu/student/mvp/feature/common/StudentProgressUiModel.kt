package edu.bnbu.student.mvp.feature.common

import edu.bnbu.student.mvp.core.state.StudentAppState
import kotlin.math.roundToInt

/** Fixed total from the v8.0 business truth. Category targets remain course-owned. */
internal const val StudentSemesterTargetMinutes = 1_200

/**
 * UI-only bridge while the shared Contract still exposes the legacy hour projection.
 *
 * This adapter converts an already-credited aggregate to whole minutes for display. It must not
 * decide whether an individual record is eligible, valid or selected by the server algorithm.
 */
internal data class StudentProgressUiModel(
    val creditedTotalMinutes: Int,
    val totalTargetMinutes: Int,
    val remainingTotalMinutes: Int,
    val creditedCourseMinutes: Int,
    val creditedGeneralMinutes: Int,
    val courseTargetMinutes: Int?,
    val generalTargetMinutes: Int?
) {
    val completionRatio: Float
        get() = if (totalTargetMinutes <= 0) {
            0f
        } else {
            (creditedTotalMinutes.toFloat() / totalTargetMinutes).coerceIn(0f, 1f)
        }

    val completionPercent: Int
        get() = (completionRatio * 100).roundToInt()

    val isQualified: Boolean
        get() = creditedTotalMinutes >= totalTargetMinutes

    val categoryTargetsAvailable: Boolean
        get() = courseTargetMinutes != null && generalTargetMinutes != null
}

internal fun StudentAppState.studentProgressUiModel(): StudentProgressUiModel {
    val rawCourseMinutes = workspace.progress.course.legacyHoursToWholeMinutes()
    val rawGeneralMinutes = workspace.progress.general.legacyHoursToWholeMinutes()
    val configuredCourseTarget = hourRule.courseRequired.legacyHoursToWholeMinutes()
    val configuredGeneralTarget = hourRule.generalRequired.legacyHoursToWholeMinutes()
    val hasV8CompatibleTargets = hourRule.isAvailable &&
        configuredCourseTarget >= 0 &&
        configuredGeneralTarget >= 0 &&
        configuredCourseTarget + configuredGeneralTarget == StudentSemesterTargetMinutes

    val courseTarget = configuredCourseTarget.takeIf { hasV8CompatibleTargets }
    val generalTarget = configuredGeneralTarget.takeIf { hasV8CompatibleTargets }
    val creditedCourse = courseTarget?.let(rawCourseMinutes::coerceAtMost) ?: rawCourseMinutes
    val creditedGeneral = generalTarget?.let(rawGeneralMinutes::coerceAtMost) ?: rawGeneralMinutes
    val authoritativeTotal = workspace.progress.authoritativeTotalHours
        ?.legacyHoursToWholeMinutes()
        ?.takeIf { !hasV8CompatibleTargets }
    val creditedTotal = (authoritativeTotal ?: (creditedCourse + creditedGeneral))
        .coerceIn(0, StudentSemesterTargetMinutes)

    return StudentProgressUiModel(
        creditedTotalMinutes = creditedTotal,
        totalTargetMinutes = StudentSemesterTargetMinutes,
        remainingTotalMinutes = (StudentSemesterTargetMinutes - creditedTotal).coerceAtLeast(0),
        creditedCourseMinutes = creditedCourse.coerceAtLeast(0),
        creditedGeneralMinutes = creditedGeneral.coerceAtLeast(0),
        courseTargetMinutes = courseTarget,
        generalTargetMinutes = generalTarget
    )
}

internal fun Double.legacyHoursToWholeMinutes(): Int =
    (coerceAtLeast(0.0) * 60.0).roundToInt()
