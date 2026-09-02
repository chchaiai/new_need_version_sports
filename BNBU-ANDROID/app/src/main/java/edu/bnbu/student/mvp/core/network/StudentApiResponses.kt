package edu.bnbu.student.mvp.core.network

import com.google.gson.annotations.SerializedName

// ── Response DTOs mirroring backend JSON shapes ──────────────────

data class UserDto(
    val id: String,
    val name: String,
    @SerializedName(value = "studentNumber", alternate = ["student_number"])
    val studentNumber: String = "",
    val email: String,
    val role: String,
    val college: String = "",
    val scope: String = "",
    val status: String = "正常",
    val gender: String? = null,
    val gradeLevel: String? = null,
    val className: String = "",
    @SerializedName("account_status")
    val accountStatus: String = "ACTIVE",
    val contacts: ContactStatusResponse = ContactStatusResponse()
)

/** Only masked contact values are ever returned to the client after verification. */
data class ContactMethodResponse(
    val masked: String? = null,
    val verified: Boolean = false
)

data class ContactStatusResponse(
    val email: ContactMethodResponse = ContactMethodResponse()
)

/** Response from GET /api/v1/config/minimum-app-version. */
data class MinimumAppVersionResponse(
    val minimumVersion: String = "",
    val downloadUrl: String = "",
    val updateMessage: String = ""
)

/**
 * Backwards-compatible response for GET /api/health. The mode fields are
 * optional until the server-side maintenance-control rollout is complete.
 */
data class SystemHealthResponse(
    val ok: Boolean = true,
    @SerializedName("system_mode") val systemMode: String = "NORMAL",
    @SerializedName("maintenance_message") val maintenanceMessage: String = "",
    @SerializedName("estimated_recovery_time") val estimatedRecoveryTime: String? = null,
    @SerializedName("planned_maintenance_at") val plannedMaintenanceAt: String? = null
)

data class LoginResponse(
    val token: String,
    val user: UserDto,
    val defaultRoute: String
)

/**
 * Direct-enrollment result. Both a flat response and a conventional `data`
 * wrapper are accepted while the backend contract is being unified.
 */
data class CourseJoinResponse(
    val student: CourseJoinStudentResponse? = null,
    val course: CourseJoinCourseResponse? = null,
    val membership: CourseJoinMembershipResponse? = null,
    val session: CourseJoinSessionResponse? = null,
    val token: String = "",
    val result: String = "",
    @SerializedName(value = "alreadyJoined", alternate = ["already_joined"])
    val alreadyJoined: Boolean = false,
    val data: CourseJoinResultResponse? = null
) {
    fun resolvedStudent(): CourseJoinStudentResponse? = student ?: data?.student
    fun resolvedCourse(): CourseJoinCourseResponse? = course ?: data?.course
    fun resolvedMembership(): CourseJoinMembershipResponse? = membership ?: data?.membership
    fun resolvedToken(): String = token.ifBlank {
        session?.resolvedToken().orEmpty()
    }.ifBlank {
        data?.token.orEmpty()
    }.ifBlank {
        data?.session?.resolvedToken().orEmpty()
    }
    fun resolvedResult(): String = result.ifBlank { data?.result.orEmpty() }
    fun isAlreadyJoined(): Boolean = alreadyJoined || data?.alreadyJoined == true
}

data class CourseJoinResultResponse(
    val student: CourseJoinStudentResponse? = null,
    val course: CourseJoinCourseResponse? = null,
    val membership: CourseJoinMembershipResponse? = null,
    val session: CourseJoinSessionResponse? = null,
    val token: String = "",
    val result: String = "",
    @SerializedName(value = "alreadyJoined", alternate = ["already_joined"])
    val alreadyJoined: Boolean = false
)

data class CourseJoinStudentResponse(
    val id: String = "",
    val name: String = "",
    @SerializedName(value = "studentNumber", alternate = ["student_number"])
    val studentNumber: String = "",
    val email: String = "",
    val college: String = "",
    val className: String = "",
    val gender: String = "",
    @SerializedName(value = "grade", alternate = ["gradeLevel", "grade_level"])
    val grade: String = "",
    val status: String = "正常",
    @SerializedName(value = "accountStatus", alternate = ["account_status"])
    val accountStatus: String = "",
    val contacts: ContactStatusResponse = ContactStatusResponse()
)

data class CourseJoinCourseResponse(
    val id: String = "",
    val name: String = "",
    val teacherId: String = "",
    val teacherName: String = "",
    val semesterId: String = "",
    val semester: String = "",
    val academicYear: String = "",
    val term: String = "",
    val status: String = "active"
)

data class CourseJoinMembershipResponse(
    val id: String = "",
    val courseId: String = "",
    val studentId: String = "",
    val status: String = "active",
    @SerializedName(value = "joinedAt", alternate = ["joined_at"])
    val joinedAt: String = "",
    @SerializedName(value = "joinMethod", alternate = ["join_method"])
    val joinMethod: String = "qr"
)

data class CourseJoinSessionResponse(
    val token: String = "",
    @SerializedName(value = "accessToken", alternate = ["access_token"])
    val accessToken: String = ""
) {
    fun resolvedToken(): String = accessToken.ifBlank { token }
}

data class SportSummaryResponse(
    val courseHours: Double = 0.0,
    val generalHours: Double = 0.0,
    val totalCompleted: Double = 0.0,
    val totalRequired: Double = 20.0,
    val totalRemaining: Double = 20.0,
    val courseRemaining: Double = 10.0,
    val generalRemaining: Double = 10.0,
    val completed: Boolean = false,
    val rule: SportRuleDto? = null,
    val teachers: List<TeacherDto> = emptyList(),
    val courses: List<StudentCourseDto> = emptyList()
)

data class TeacherDto(
    val teacherId: String = "",
    val teacherName: String = ""
)

data class StudentCourseDto(
    val courseId: String = "",
    val courseName: String = "",
    val teacherId: String = "",
    val teacherName: String = "",
    val courseHours: Double = 0.0,
    val generalHours: Double = 0.0
)

data class StudentCoursesResponse(
    val courses: List<StudentCourseDetailResponse> = emptyList(),
    val scope: String = "all"
)

data class StudentCourseDetailResponse(
    val id: String = "",
    val name: String = "",
    val teacherId: String = "",
    val teacherName: String = "",
    val status: String = "",
    val enrollmentStatus: String = "enrolled",
    val isCurrent: Boolean = false,
    @SerializedName(value = "finalGrade", alternate = ["final_grade"])
    val finalGrade: Int? = null,
    @SerializedName(value = "gradeStatus", alternate = ["grade_status"])
    val gradeStatus: String? = null,
    val semester: StudentSemesterResponse = StudentSemesterResponse()
)

/** Response from GET /student/checkin-time-window. All values are server policy. */
data class CheckInTimeWindowResponse(
    val windowMode: String = "unavailable",
    val dateRangeStart: String? = null,
    val dateRangeEnd: String? = null,
    val dailyStartTime: String = "",
    val dailyEndTime: String = "",
    val excludedDates: List<String> = emptyList(),
    val semesterDeadline: String? = null
)

data class StudentSemesterResponse(
    val id: String = "",
    val name: String = "",
    val academicYear: String = "",
    val term: String = "",
    val startDate: String? = null,
    val endDate: String? = null,
    val status: String = "archived"
)

data class SportRuleDto(
    val total: Double = 20.0,
    val courseRequired: Double = 10.0,
    val generalRequired: Double = 10.0,
    val dailyLimit: Double = 2.0
)

data class SportRecordResponse(
    val id: String,
    val courseId: String? = null,
    val taskTitle: String? = null,
    val creditType: String = "",
    val hours: Double = 0.0,
    val description: String? = null,
    val proofFiles: List<ProofFileResponse> = emptyList(),
    val sportType: String? = null,
    val teacherPublicFeedback: String? = null,
    val teacherInternalNote: String? = null,
    val submittedAt: String? = null,
    val startTime: String? = null,
    val endTime: String? = null,
    val actualDurationSeconds: Long? = null
)

data class ProofFileResponse(
    val url: String = "",
    val cosKey: String = "",
    val mediaType: String = "image",
    val mimeType: String = "",
    val size: Long = 0
)

data class SubmitRecordResponse(
    val id: String,
    val submittedAt: String,
    val businessDate: String? = null,
    val creditedDurationSeconds: Long = 0L,
    val reviewStatus: String? = null
)

data class MembershipResponse(
    val id: String,
    val type: String,
    val organization: String,
    val studentId: String,
    val studentName: String = "",
    val status: String = "待确认",
    val validUntil: String? = null,
    val offset: String = "待确认",
    val comment: String? = null,
    val updatedBy: String? = null,
    val updatedAt: String? = null
)

data class NotificationResponse(
    val id: String,
    val title: String,
    val message: String,
    val time: String,
    val category: String = "系统通知",
    val isUnread: Boolean = true,
    val targetType: String? = null,
    val targetId: String? = null
)

data class MarkReadResponse(
    val id: String,
    val read: Boolean
)

// ── Endurance Scoring ──────────────────────────────────────────────

data class EnduranceScoreResponse(
    val score: Int,
    val tier: String,
    val timeSeconds: Int,
    val gender: String,
    val gradeLevel: String,
    val gradeGroup: String,
    val range: TimeRange? = null,
    val note: String? = null
)

data class TimeRange(
    val min: Int,
    val max: Int
)

// ── Exemptions ─────────────────────────────────────────────────────

data class ExemptionResponse(
    val id: String,
    val studentId: String,
    val studentName: String? = null,
    val type: String,
    val category: String = "physical_test",
    val organization: String? = null,
    val reason: String? = null,
    val status: String,
    val proofFiles: List<ProofFileResponse> = emptyList(),
    val reviewComment: String? = null,
    val reviewerId: String? = null,
    val reviewerName: String? = null,
    val createdAt: String,
    val updatedAt: String? = null
)

data class ExemptionSubmitResponse(
    val id: String,
    val status: String,
    val createdAt: String
)

// ── Student Profile ────────────────────────────────────────────────

data class StudentProfileResponse(
    val id: String,
    val name: String,
    @SerializedName(value = "studentNumber", alternate = ["student_number"])
    val studentNumber: String = "",
    val email: String,
    val role: String,
    val college: String = "",
    val className: String = "",
    val gender: String? = null,
    val preferredLanguage: String = "zh-CN",
    val gradeLevel: String? = null,
    val admissionYear: Int? = null,
    val currentGradeLevel: String? = null,
    val currentAcademicYear: String? = null,
    val gradeCalculatedAt: String? = null,
    val status: String = "正常",
    val enrolledCourses: Int = 0,
    @SerializedName("account_status")
    val accountStatus: String = "ACTIVE",
    val contacts: ContactStatusResponse = ContactStatusResponse()
)

/** A student-visible service-feedback work order. */
data class FeedbackTicketResponse(
    val id: String = "",
    val ticketNumber: String = "",
    val category: String = "",
    val description: String = "",
    val currentPage: String = "",
    val status: String = "pending",
    val createdAt: String = "",
    val updatedAt: String? = null,
    val reply: String? = null
)

/** UI projection adapted from GET /api/v1/feedback. */
data class FeedbackTicketListResponse(
    val tickets: List<FeedbackTicketResponse> = emptyList()
)

data class StudentProfileUpdateRequest(
    val gender: String? = null
)

/** Response from PUT /api/v1/student/preferences/language. */
data class LanguagePreferenceResponse(
    val language: String = "zh-CN"
)

// ── Student Tasks ──────────────────────────────────────────────────

// ── Student Grades ─────────────────────────────────────────────────

data class StudentGradeResponse(
    val studentId: String,
    val studentName: String,
    val courseId: String = "",
    val courseName: String = "",
    val courseHours: Double = 0.0,
    val generalHours: Double = 0.0,
    val checkin: Int = 0,
    val checkinScore: Int = 0,
    val exam: Int = 0,
    val attendance: Int = 0,
    val physical: Int = 0,
    val enduranceRunTimeSeconds: Int? = null,
    /** recorded | exempt | absent | not_recorded */
    val enduranceRunStatus: String? = null,
    /** The score assigned by the teacher for the endurance-run item. */
    val enduranceRunScore: Int? = null,
    val overallTotal: Int = 0,
    val total: Int = 0,
    val sourceTrace: String? = null,
    val visibleBlocks: List<StudentGradeBlockResponse> = emptyList(),
    val totalScore: Int? = null,
    val totalDisplay: String = "未开放",
    val isPassed: Boolean? = null,
    val courseGradeStatus: String = "rules_not_published",
    val displayConfigVersion: Int = 0
) {
    val resolvedCheckinScore: Int
        get() = if (checkinScore != 0) checkinScore else checkin

    val resolvedTotal: Int
        get() = if (total != 0) total else overallTotal
}

data class StudentGradeBlockResponse(
    val id: String,
    val name: String,
    val weight: Double,
    val score: Int? = null,
    val scoreDisplay: String = "未录入",
    val isVisible: Boolean = true,
    val displayOrder: Int = 0,
    val blockType: String = "custom",
    val description: String? = null,
    val subItems: List<StudentGradeSubItemResponse>? = null
)

data class StudentGradeSubItemResponse(
    val name: String,
    val score: Int? = null,
    val scoreDisplay: String = "未录入"
)

data class StudentGradesResponse(
    val grades: List<StudentGradeResponse> = emptyList(),
    val summary: StudentGradesSummary = StudentGradesSummary()
)

data class StudentGradesSummary(
    val overallCheckinScore: Int = 0,
    val overallExam: Int = 0,
    val overallAttendance: Int = 0,
    val overallPhysical: Int = 0,
    val overallTotal: Int = 0,
    val totalPossible: Int = 100
)
