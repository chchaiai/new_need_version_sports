package edu.bnbu.student.contractvalidation

import bnbu.cr005.review.*
import java.math.BigDecimal
import java.util.UUID

enum class ProgressFreshness { CURRENT, HISTORICAL, RECOMPUTING, UNAVAILABLE }
data class CategoryProgress(val category: ExerciseCategory, val completed: Long, val target: Long,
    val remaining: Long, val recordMinutes: Long, val certificationMinutes: Long)
data class ProgressNumbers(val completed: Long, val target: Int, val displayPercent: Long,
    val completionRatio: BigDecimal, val targetMet: Boolean, val categories: List<CategoryProgress>,
    val actualSeconds: BigDecimal, val recordMinutes: Long, val certificationMinutes: Long,
    val invalidMinutes: Long, val validUncountedMinutes: Long, val formulaExcludedMinutes: Long,
    val pendingRecords: Long)
data class StudentProgress(val freshness: ProgressFreshness, val checkpointId: UUID?,
    val numbers: ProgressNumbers?, val observedAt: StudentInstant, val computedAt: StudentInstant?,
    val unavailableReason: String?, val isRecomputing: Boolean = false)

fun StudentCourseProgress.toStudentProgress(source: ViewSource = ViewSource.LIVE): StudentProgress {
    val cp = checkpoint
    require(cp == null || (cp.courseId == courseId && cp.enrollmentId == enrollmentId)) {
        "Checkpoint belongs to another course or enrollment"
    }
    require(state != StudentCourseProgress.State.CURRENT || cp != null) { "Current progress lacks checkpoint" }
    require(state != StudentCourseProgress.State.UNAVAILABLE || cp == null) { "Unavailable progress contains numeric fallback" }
    val freshness = if (source != ViewSource.LIVE) {
        if (cp == null) ProgressFreshness.UNAVAILABLE else ProgressFreshness.HISTORICAL
    } else when (state) {
        StudentCourseProgress.State.CURRENT -> ProgressFreshness.CURRENT
        StudentCourseProgress.State.RECOMPUTING -> if (cp == null) ProgressFreshness.RECOMPUTING else ProgressFreshness.HISTORICAL
        StudentCourseProgress.State.UNAVAILABLE -> ProgressFreshness.UNAVAILABLE
    }
    return StudentProgress(freshness, cp?.checkpointId, cp?.totals?.toStudentNumbers(),
        StudentInstant.fromWire(observedAt), cp?.computedAt?.let(StudentInstant::fromWire), unavailableReason,
        isRecomputing = source == ViewSource.LIVE && state == StudentCourseProgress.State.RECOMPUTING)
}

private fun ProgressTotals.toStudentNumbers(): ProgressNumbers {
    require(targetMet == (totalCompletedMinutes == 1200L)) { "Target flag contradicts raw minutes" }
    val rows = categories.sortedBy { it.category.ordinal }.map {
        require(it.cappedCompletedMinutes == it.countedRecordMinutes + it.countedCertificationMinutes &&
            it.remainingMinutes == it.targetMinutes - it.cappedCompletedMinutes) { "Inconsistent category totals" }
        CategoryProgress(it.category, it.cappedCompletedMinutes, it.targetMinutes, it.remainingMinutes,
            it.countedRecordMinutes, it.countedCertificationMinutes)
    }
    require(rows.map { it.category }.toSet() == ExerciseCategory.entries.toSet() && rows.size == 2 &&
        rows.sumOf { it.target } == 1200L && rows.sumOf { it.completed } == totalCompletedMinutes &&
        rows.sumOf { it.recordMinutes } == countedRecordMinutes &&
        rows.sumOf { it.certificationMinutes } == countedCertificationMinutes) { "Inconsistent progress sources" }
    return ProgressNumbers(totalCompletedMinutes, totalTargetMinutes, displayPercent, completionRatio, targetMet,
        rows, actualDurationSeconds, countedRecordMinutes, countedCertificationMinutes, invalidActualMinutes,
        validUncountedEligibleMinutes, validFormulaExcludedMinutes, pendingRecordCount)
}

data class ProgressPresentation(val heading: String, val minutes: String?, val percent: String?, val status: String)
fun StudentProgress.toPresentation(english: Boolean = false): ProgressPresentation {
    val title = when (freshness) {
        ProgressFreshness.CURRENT -> if (english) "Current progress" else "当前进度"
        ProgressFreshness.HISTORICAL -> if (isRecomputing) {
            if (english) "Previous checkpoint · Recomputing" else "历史检查点 · 重算中"
        } else if (english) "Previous checkpoint" else "历史检查点"
        ProgressFreshness.RECOMPUTING -> if (english) "Recomputing" else "重算中"
        ProgressFreshness.UNAVAILABLE -> if (english) "Progress unavailable" else "进度暂不可用"
    }
    val n = numbers
    return ProgressPresentation(title, n?.let { "${it.completed} / ${it.target} min" },
        n?.let { "${it.displayPercent}%" }, when {
            n == null -> if (english) "Awaiting source data" else "等待来源数据"
            freshness != ProgressFreshness.CURRENT -> if (english) "Historical result only" else "仅为历史结果"
            n.targetMet -> if (english) "Target met" else "目标已完成"
            else -> if (english) "Target not yet met" else "目标尚未完成"
        })
}
