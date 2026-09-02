package edu.bnbu.student.mvp.feature.grades

import edu.bnbu.student.mvp.core.model.GradeBlock
import edu.bnbu.student.mvp.core.model.GradeRow

/**
 * The grade API is the source of truth for student-facing grade content.  Do
 * not classify blocks by type here: teachers can configure arbitrary blocks,
 * and every visible block must be shown in the order supplied by the API.
 */
internal data class GradeDisplayContent(
    val total: TotalGrade?,
    val blocks: List<GradeBlock>
)

internal data class TotalGrade(
    val score: Int?,
    val display: String,
    val isPassed: Boolean?
)

internal fun GradeRow.gradeDisplayContent(): GradeDisplayContent = GradeDisplayContent(
    // A populated score or pass state indicates that the teacher opened the
    // total-grade block. totalDisplay alone is not sufficient because the API
    // uses it to carry the "not published" placeholder.
    total = if (totalScore != null || isPassed != null) {
        TotalGrade(
            score = totalScore,
            display = totalDisplay,
            // The total score defines pass/fail whenever it is available.
            // isPassed remains a fallback for a server response that exposes a
            // state but intentionally masks the numeric score.
            isPassed = totalScore?.let { it >= PASSING_SCORE } ?: isPassed
        )
    } else {
        null
    },
    blocks = visibleBlocks
        .asSequence()
        .filter(GradeBlock::isVisible)
        .sortedWith(compareBy<GradeBlock> { it.displayOrder }.thenBy { it.id })
        .toList()
)

/** Only a server-published revision may expose a numeric student score. */
internal fun GradeRow.publishedTotalGrade(): TotalGrade? {
    if (courseGradeStatus.lowercase() !in setOf("published", "locked")) return null
    return gradeDisplayContent().total
}

private const val PASSING_SCORE = 60
