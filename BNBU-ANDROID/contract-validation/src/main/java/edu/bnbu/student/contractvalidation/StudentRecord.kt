package edu.bnbu.student.contractvalidation

import bnbu.cr005.review.*
import java.math.BigDecimal
import java.util.UUID

enum class StudentRecordStage(val zh: String, val en: String) {
    MATERIAL_PROCESSING("材料处理中", "Material processing"),
    SYSTEM_CHECK_PENDING("待系统检查", "Awaiting system check"),
    AI_REVIEW_PENDING("待 AI 检查", "Awaiting AI check"),
    TECHNICAL_PROCESSING("技术处理中", "Technical processing"),
    TEACHER_REVIEW_REQUIRED("待教师复核", "Awaiting teacher review"),
    SUPPLEMENT_REQUIRED("待补证", "Awaiting supplementary evidence"),
    SUPPLEMENT_REVIEW_REQUIRED("补证已接收 · 待教师复核", "Supplement received · Awaiting teacher review"),
    VALID_CREDITED("有效 · 已计入", "Valid · Credited"),
    VALID_UNCOUNTED("有效 · 未计入", "Valid · Not credited"),
    VALID_STATS_UNAVAILABLE("有效 · 计入结果待更新", "Valid · Credit statistics unavailable"),
    INVALID("无效", "Invalid")
}
data class PublicReason(val code: String, val zh: String, val en: String, val originalComment: String?,
    val systemDeadline: Boolean)
fun PublicReviewReason?.toStudentReason(comment: String?): PublicReason? = this?.let {
    PublicReason(it.code.value, it.label.zh, it.label.en, comment,
        it.code == PublicReviewReason.Code.SUPPLEMENT_DEADLINE_MISSED)
}
data class StudentRecord(val id: UUID, val date: String, val actualSeconds: Long, val actualMinutes: Long,
    val eligibleMinutes: Long?, val countedMinutes: Long?, val stage: StudentRecordStage,
    val reason: PublicReason?, val originalComment: String?, val submittedAt: StudentInstant,
    val materialId: UUID, val materialReadOnly: Boolean, val explanationLabels: List<Pair<String, String>>)

/** Join only a matching current checkpoint; stale or missing statistics cannot relabel a review. */
fun ExerciseRecord.toStudentRecord(detail: RecordCreditDetail? = null, progress: StudentCourseProgress? = null,
    source: ViewSource = ViewSource.LIVE): StudentRecord {
    student.currentStudent()
    require(currentMaterial.recordId == recordId && currentMaterial.materialVersionId == currentReview.materialVersionId) {
        "Material/review identity mismatch"
    }
    val live = progress?.toStudentProgress(source)?.freshness == ProgressFreshness.CURRENT
    val credit = detail?.takeIf { live && it.checkpointId == progress?.checkpoint?.checkpointId }
    if (credit != null) {
        require(progress!!.courseId == courseId && progress.enrollmentId == enrollmentId &&
            progress.student.currentStudent().studentId == student.currentStudent().studentId && credit.recordId == recordId &&
            credit.sessionId == sessionId && credit.ruleVersionId == ruleVersionId &&
            credit.category == category && credit.businessDate == businessDate &&
            credit.actualDurationSeconds.compareTo(BigDecimal.valueOf(actualDurationSeconds)) == 0 &&
            credit.actualWholeMinutes == actualDurationSeconds / 60L &&
            credit.reviewResult == currentReview.result && credit.countedMinutes <= credit.eligibleMinutes &&
            (credit.reviewResult == ReviewResult.VALID || credit.countedMinutes == 0L)) { "Record statistics source mismatch" }
    }
    val stage = when (currentReview.processingStage) {
        ReviewProcessingStage.MATERIAL_PROCESSING -> StudentRecordStage.MATERIAL_PROCESSING
        ReviewProcessingStage.SYSTEM_CHECK_PENDING -> StudentRecordStage.SYSTEM_CHECK_PENDING
        ReviewProcessingStage.AI_REVIEW_PENDING -> StudentRecordStage.AI_REVIEW_PENDING
        ReviewProcessingStage.TECHNICAL_PROCESSING -> StudentRecordStage.TECHNICAL_PROCESSING
        ReviewProcessingStage.TEACHER_REVIEW_REQUIRED -> StudentRecordStage.TEACHER_REVIEW_REQUIRED
        ReviewProcessingStage.SUPPLEMENT_REQUIRED -> StudentRecordStage.SUPPLEMENT_REQUIRED
        ReviewProcessingStage.SUPPLEMENT_REVIEW_REQUIRED -> StudentRecordStage.SUPPLEMENT_REVIEW_REQUIRED
        ReviewProcessingStage.VALID -> when {
            credit == null -> StudentRecordStage.VALID_STATS_UNAVAILABLE
            credit.countedMinutes > 0 -> StudentRecordStage.VALID_CREDITED
            else -> StudentRecordStage.VALID_UNCOUNTED
        }
        ReviewProcessingStage.INVALID -> StudentRecordStage.INVALID
    }
    return StudentRecord(recordId, studentDate(businessDate), actualDurationSeconds, actualDurationSeconds / 60L,
        credit?.eligibleMinutes, credit?.countedMinutes, stage,
        currentReview.publicReason.toStudentReason(currentReview.publicComment), currentReview.publicComment,
        StudentInstant.fromWire(submittedAt), currentMaterial.materialVersionId, true,
        credit?.explanations?.map { it.message.zh to it.message.en }.orEmpty())
}

data class StudentTimer(val state: SupplementTimerView.State, val budgetHours: Int,
    val remainingSeconds: BigDecimal?, val originalDueAt: StudentInstant, val effectiveDueAt: StudentInstant?,
    val acceptedMaterialId: UUID?, val sourceRevision: Long, val version: Long)
fun SupplementTimerView.toStudentTimer(): StudentTimer = StudentTimer(state, budgetHours.value,
    remainingSeconds, StudentInstant.fromWire(originalDueAt), effectiveDueAt?.let(StudentInstant::fromWire),
    acceptedMaterialVersionId, sourceRevision, version)

data class StudentSla(val state: TeacherReviewSla.CalculationStatus, val remainingSchoolSeconds: BigDecimal?,
    val dueAt: StudentInstant?, val overdue: Boolean?, val calendarVersion: Long?, val unavailableReason: String?)
fun TeacherReviewSla.toStudentSla(): StudentSla = StudentSla(calculationStatus, remainingSeconds,
    effectiveDueAt?.let(StudentInstant::fromWire), overdue, calendar?.revision, unavailableReason)

data class StudentSession(val id: UUID, val state: ExerciseSession.Status, val businessDate: String,
    val elapsedSeconds: Long, val actualSeconds: Long?, val version: Long, val completedAt: StudentInstant?)
fun ExerciseSession.toStudentSession(): StudentSession = StudentSession(sessionId, status, studentDate(businessDate),
    elapsedActiveSeconds, actualDurationSeconds, stateVersion, completedAt?.let(StudentInstant::fromWire))
