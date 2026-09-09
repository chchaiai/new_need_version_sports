package edu.bnbu.student.contractvalidation

import bnbu.cr005.review.*
import java.util.UUID

data class HistoricalStudentDisplay(val id: UUID, val zh: String, val en: String, val readOnly: Boolean)

/** Requires strict wire validation first. No fallback from missing/unknown data to deleted. */
fun StudentReference.toIdentityDisplay(): HistoricalStudentDisplay = when (val value = actualInstance) {
    is CurrentStudentReference -> HistoricalStudentDisplay(value.student.studentId, value.student.name, value.student.name, false)
    is DeletedStudentReference -> HistoricalStudentDisplay(value.studentId, "已注销学生", "Deleted student", true)
    else -> throw IllegalArgumentException("Unknown student reference")
}

fun StudentReference.currentStudent(): StudentSummary =
    (actualInstance as? CurrentStudentReference)?.student
        ?: throw IllegalArgumentException("Current student endpoint cannot return a deleted identity")

fun StudentReference.subjectId(): UUID = toIdentityDisplay().id
