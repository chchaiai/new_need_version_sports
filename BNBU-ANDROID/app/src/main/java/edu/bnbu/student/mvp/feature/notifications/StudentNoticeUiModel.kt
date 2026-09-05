package edu.bnbu.student.mvp.feature.notifications

import edu.bnbu.student.mvp.core.model.NoticeCategory
import edu.bnbu.student.mvp.core.model.StudentNotice

/** Student-facing notification kinds allowed by the v8.0 business boundary. */
internal enum class StudentNoticeKind {
    Membership,
    Review,
    Deadline,
    Progress,
    Feedback,
    Maintenance
}

internal data class StudentNoticeUiModel(
    val id: String,
    val title: String,
    val message: String,
    val time: String,
    val kind: StudentNoticeKind,
    val isUnread: Boolean,
    val targetId: String?,
    val opensExemption: Boolean
)

/**
 * Applies a deny-first result-data guard followed by the student notification whitelist.
 * Unsafe content is omitted in full rather than partially redacted into a misleading message.
 */
internal fun Iterable<StudentNotice>.toStudentNoticeUiModels(): List<StudentNoticeUiModel> =
    mapNotNull(StudentNotice::toStudentNoticeUiModel)

private fun StudentNotice.toStudentNoticeUiModel(): StudentNoticeUiModel? {
    val safeTitle = title.trim()
    val safeMessage = message.trim()
    if (safeTitle.isBlank() || safeMessage.isBlank()) return null
    val searchable = "$safeTitle\n$safeMessage"
    if (ForbiddenChineseResultTerms.containsMatchIn(searchable) ||
        ForbiddenEnglishResultTerms.containsMatchIn(searchable)
    ) {
        return null
    }

    val normalizedTarget = targetType.orEmpty().trim().lowercase()
    val kind = when {
        normalizedTarget.containsAny("maintenance", "system_mode") -> StudentNoticeKind.Maintenance
        normalizedTarget.contains("feedback") -> StudentNoticeKind.Feedback
        normalizedTarget.containsAny("membership", "enrollment", "course_invite", "invitation") ->
            StudentNoticeKind.Membership
        normalizedTarget.containsAny("exercise", "record", "supplement", "exemption", "certification", "application") ->
            StudentNoticeKind.Review
        category == NoticeCategory.Deadline -> StudentNoticeKind.Deadline
        category == NoticeCategory.Review -> StudentNoticeKind.Review
        category == NoticeCategory.Organization -> StudentNoticeKind.Membership
        MaintenanceTerms.containsMatchIn(searchable) -> StudentNoticeKind.Maintenance
        FeedbackTerms.containsMatchIn(searchable) -> StudentNoticeKind.Feedback
        DeadlineTerms.containsMatchIn(searchable) -> StudentNoticeKind.Deadline
        ReviewTerms.containsMatchIn(searchable) -> StudentNoticeKind.Review
        MembershipTerms.containsMatchIn(searchable) -> StudentNoticeKind.Membership
        ProgressTerms.containsMatchIn(searchable) -> StudentNoticeKind.Progress
        else -> null
    } ?: return null

    val opensExemption = normalizedTarget in setOf(
        "exemption",
        "physical_test_exemption",
        "checkin_exemption",
        "certification",
        "application"
    ) && (
        normalizedTarget != "application" ||
            ExemptionTerms.containsMatchIn(searchable)
        )

    return StudentNoticeUiModel(
        id = id,
        title = safeTitle,
        message = safeMessage,
        time = time,
        kind = kind,
        isUnread = isUnread,
        targetId = targetId,
        opensExemption = opensExemption
    )
}

private fun String.containsAny(vararg values: String): Boolean =
    values.any { value -> contains(value) }

private val ForbiddenChineseResultTerms = Regex(
    "成绩|得分|分数|换算分|等级|排名|名次|绩点|及格|不及格|优秀|良好"
)

private val ForbiddenEnglishResultTerms = Regex(
    "\\b(final\\s+grade|grades?|scores?|points?|rank(?:ing)?|levels?|gpa|passed?|failed?)\\b",
    RegexOption.IGNORE_CASE
)

private val MaintenanceTerms = Regex(
    "维护|服务恢复|系统模式|maintenance|service restoration",
    RegexOption.IGNORE_CASE
)
private val FeedbackTerms = Regex("反馈|工单|feedback|support ticket", RegexOption.IGNORE_CASE)
private val DeadlineTerms = Regex(
    "截止|到期|剩余时间|deadline|expires?|time remaining",
    RegexOption.IGNORE_CASE
)
private val ReviewTerms = Regex(
    "审核|材料|补充|补证|复核|有效|无效|免测|认证|review|material|supplement|evidence|valid|invalid|exemption|certification",
    RegexOption.IGNORE_CASE
)
private val MembershipTerms = Regex(
    "入班|退班|课程成员|邀请|enrol|enroll|membership|invitation",
    RegexOption.IGNORE_CASE
)
private val ProgressTerms = Regex(
    "分钟|运动进度|原始用时|minutes?|activity progress|raw time",
    RegexOption.IGNORE_CASE
)
private val ExemptionTerms = Regex("免测|认证|exemption|certification", RegexOption.IGNORE_CASE)
