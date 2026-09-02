package edu.bnbu.student.mvp.core.model

import edu.bnbu.student.mvp.core.designsystem.interfaceText

/** Localizes stable server enums without changing their authoritative values. */
fun progressStatusLabel(value: String): String = when (value.trim().uppercase()) {
    "COMPLETED", "QUALIFIED" -> interfaceText("已达标", "Completed")
    "IN_PROGRESS", "RUNNING", "ACTIVE" -> interfaceText("进行中", "In progress")
    "NOT_STARTED", "PENDING" -> interfaceText("尚未开始", "Not started")
    else -> interfaceText("状态未知", "Status unavailable")
}

/**
 * The dashboard's semester-progress badge is gated by the student's current
 * course membership. A withdrawn student must never be presented as ongoing,
 * even when a cached progress projection still carries an in-progress value.
 */
fun dashboardProgressStatusLabel(studentStatus: String, progressStatus: String): String =
    when (studentStatus.trim().uppercase()) {
        "ACTIVE" -> when (progressStatus.trim().uppercase()) {
            "COMPLETED", "QUALIFIED", "已达标" -> interfaceText("已达标", "Completed")
            else -> interfaceText("进行中", "In progress")
        }
        "PENDING" -> interfaceText("已退班", "Withdrawn")
        else -> interfaceText("状态未知", "Status unavailable")
    }

fun studentStatusLabel(value: String): String = when (value.trim().uppercase()) {
    "ACTIVE" -> interfaceText("已进班", "Enrolled")
    "PENDING" -> interfaceText("已退班", "Withdrawn")
    else -> interfaceText("状态未知", "Status unavailable")
}

fun feedbackCategoryLabel(value: String): String = when (value.trim().uppercase()) {
    "BUG" -> interfaceText("功能异常", "Feature issue")
    "ACCESSIBILITY" -> interfaceText("无障碍问题", "Accessibility")
    "PRIVACY" -> interfaceText("隐私问题", "Privacy")
    "SUGGESTION" -> interfaceText("功能建议", "Suggestion")
    "OTHER" -> interfaceText("其他", "Other")
    else -> interfaceText("其他", "Other")
}

/** Internal IDs and UUIDs are never a fallback for the public student number. */
internal fun StudentProfile.safeStudentNumberOrNull(): String? {
    val value = studentNumber.trim()
    return value.takeIf {
        it.isNotEmpty() &&
            !it.equals(id.trim(), ignoreCase = true) &&
            !UUID_LIKE_VALUE.matches(it)
    }
}

internal fun StudentProfile.studentNumberForDisplay(): String =
    safeStudentNumberOrNull()
        ?: interfaceText("学号未提供", "Student number unavailable")

private val UUID_LIKE_VALUE = Regex(
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
)
