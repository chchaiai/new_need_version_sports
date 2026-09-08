package edu.bnbu.student.contractvalidation

import bnbu.cr005.review.*
import java.util.UUID

data class StudentEndurance(val state: StudentEnduranceOutcome.Outcome, val distanceMeters: Long?,
    val durationSeconds: Int?, val testedOn: String?, val exemptionId: UUID?, val updatedAt: StudentInstant)
fun StudentEnduranceOutcome.toStudentEndurance(): StudentEndurance {
    require(outcome != StudentEnduranceOutcome.Outcome.MEASURED ||
        (distanceMeters != null && durationSeconds != null)) { "Measured result lacks raw values" }
    require(outcome == StudentEnduranceOutcome.Outcome.MEASURED ||
        (durationSeconds == null && testedOn == null)) { "Non-measured outcome contains raw result" }
    return StudentEndurance(outcome, distanceMeters, durationSeconds, testedOn?.let(::studentDate),
        approvedExemptionApplicationId, StudentInstant.fromWire(updatedAt))
}

data class StudentCoursePage(val id: UUID, val name: String, val description: String?, val teacherName: String,
    val semesterStatus: SemesterStatus, val readOnly: Boolean, val courseTarget: Int, val otherTarget: Int,
    val checkinOpensAt: StudentInstant, val checkinClosesAt: StudentInstant,
    val regularCutoffAt: StudentInstant, val closeoutEndsAt: StudentInstant)
fun StudentCourse.toStudentCoursePage(context: StudentViewContext): StudentCoursePage {
    require(publishedRule.courseId == courseId && publishedRule.semesterId == semester.semesterId &&
        targets.courseRelatedTargetMinutes + targets.otherTargetMinutes == 1200 &&
        publishedRule.courseRelatedTargetMinutes == targets.courseRelatedTargetMinutes.toLong() &&
        publishedRule.otherTargetMinutes == targets.otherTargetMinutes.toLong()) { "Course rule identity/target mismatch" }
    return StudentCoursePage(courseId, name, description, responsibleTeacher.name, semester.status,
        context.source != ViewSource.LIVE || semester.status == SemesterStatus.ARCHIVED,
        targets.courseRelatedTargetMinutes, targets.otherTargetMinutes,
        StudentInstant.fromWire(checkinOpensAt), StudentInstant.fromWire(checkinClosesAt),
        StudentInstant.fromWire(publishedRule.regularCutoffAt), StudentInstant.fromWire(publishedRule.closeoutEndsAt))
    // A course projection alone never grants Session start or teacher operations.
}

data class StudentHome(val name: String, val status: StudentDashboard.StudentStatus, val course: StudentCoursePage?,
    val progress: StudentProgress?, val endurance: StudentEndurance?, val unreadCount: Long)
fun StudentDashboard.toStudentHome(context: StudentViewContext): StudentHome {
    actor.toStudentAccountPage()
    require(progress == null || (progress.student.studentId == student.studentId && progress.courseId == course?.courseId)) {
        "Dashboard progress identity mismatch"
    }
    return StudentHome(student.name, studentStatus, course?.toStudentCoursePage(context), progress?.toStudentProgress(context.source),
        enduranceOutcome?.toStudentEndurance(), unreadNotificationCount)
}

data class ApplicationHistoryRow(val id: UUID, val sequence: Long, val status: ApplicationStatus,
    val message: String, val occurredAt: StudentInstant)
data class CertificationInfo(val kind: CertificationKind, val organization: String, val validFrom: String, val validTo: String)
data class StudentApplicationPage(val id: UUID, val type: ApplicationType, val status: ApplicationStatus,
    val canAttemptSupplement: Boolean, val remainingImageSlots: Int, val evidenceIds: List<UUID>,
    val decisions: List<ApplicationHistoryRow>, val creditState: CertificationCredit.State?,
    val activeCourseMinutes: Int?, val activeOtherMinutes: Int?, val version: Long,
    val certification: CertificationInfo?, val creditReason: String?)
fun StudentApplication.toStudentApplicationPage(context: StudentViewContext): StudentApplicationPage {
    require(evidence.size in 1..3) { "Application evidence count exceeds cumulative limit" }
    require(decisions.map { it.sequenceNumber }.distinct().size == decisions.size) { "Duplicate decision sequence" }
    val credit = certificationCredit
    return StudentApplicationPage(applicationId, applicationType, status,
        context.canAttemptWrite && status == ApplicationStatus.SUPPLEMENT_REQUIRED && evidence.size < 3,
        3 - evidence.size, evidence.map { it.mediaAssetId }, decisions.sortedBy { it.sequenceNumber }.map {
            ApplicationHistoryRow(it.decisionId, it.sequenceNumber, it.toStatus, it.studentVisibleMessage,
                StudentInstant.fromWire(it.occurredAt))
        }, credit?.state, credit?.let { if (it.state == CertificationCredit.State.ACTIVE) it.courseRelatedMinutes else 0 },
        credit?.let { if (it.state == CertificationCredit.State.ACTIVE) it.otherMinutes else 0 }, version,
        certification?.let { CertificationInfo(it.certificationKind, it.organizationOrTeamName,
            studentDate(it.validFrom), studentDate(it.validTo)) }, credit?.studentVisibleReason)
}

data class StudentNotice(val id: UUID, val title: String, val body: String, val route: StudentNotification.TargetRoute?,
    val targetId: UUID?, val unread: Boolean, val createdAt: StudentInstant, val eventStage: ReviewProcessingStage?,
    val reason: PublicReason?, val originalComment: String?, val reloadTargetOnOpen: Boolean)

/** Defense in depth for explicit result disclosures, based on the existing Phase2 UI guard.
 * It cannot prove natural-language safety. Server allowlisted templates and Phase7/9 tests remain mandatory. */
object StudentNoticeTextGuard {
    private val blocked = listOf(
        Regex("成绩|得分|分数|换算分|等级|排名|名次|绩点|及格|不及格|优秀|良好|历史备注"),
        Regex("\\b(?:score|grade|rank|ranking|gpa)\\b", RegexOption.IGNORE_CASE),
        Regex("(?:\\b(?:final|course|endurance|fitness|performance|result)\\s+(?:level|tier)\\b|\\b(?:level|tier)\\s*(?::|is)?\\s*(?:[a-e]|[1-9]\\d*)\\b)", RegexOption.IGNORE_CASE),
        Regex("(?:\\b\\d+(?:\\.\\d+)?\\s*(?:points?|pts?)\\b|\\b(?:points?|pts?)\\s*[:：]?\\s*\\d+\\b|historical\\s+remark)", RegexOption.IGNORE_CASE)
    )
    fun permits(text: String): Boolean = blocked.none { it.containsMatchIn(text) }
}
fun StudentNotification.toStudentNotice(): StudentNotice {
    val ctx = reviewContext
    val text = listOfNotNull(title, body, notificationType, ctx?.publicComment,
        ctx?.publicReason?.label?.zh, ctx?.publicReason?.label?.en).joinToString("\n")
    require(StudentNoticeTextGuard.permits(text)) { "Prohibited student notification: discard the entire item" }
    return StudentNotice(notificationId, title, body, targetRoute, targetId, readAt == null,
        StudentInstant.fromWire(createdAt), ctx?.processingStage, ctx?.publicReason.toStudentReason(ctx?.publicComment),
        ctx?.publicComment, targetRoute != null)
}
