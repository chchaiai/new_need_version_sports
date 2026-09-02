package edu.bnbu.student.mvp.core.network

import java.util.UUID

data class StudentLoginRequest(
    val account: String,
    val password: String,
    val role: String = "student",
    val clientType: String = "mobile"
)

/**
 * FCM tokens are opaque device addresses, never notification content. The
 * authenticated backend associates this token with the current student.
 */
data class PushDeviceRegistrationRequest(
    val token: String,
    val platform: String = "android",
    val appVersion: String
)

/** Language preference consumed by server-originated communication such as email. */
data class UpdateLanguagePreferenceRequest(
    val language: String
)

/** Request body for direct enrollment through POST /courses/{courseId}/join. */
data class CourseJoinRequestBody(
    val studentName: String,
    val studentNumber: String,
    val gender: String,
    val grade: String,
    /** Opaque QR/invitation credential; the client never derives permissions from it. */
    val inviteCode: String,
    val email: String? = null
)

data class ProofFileReference(
    val cosKey: String,
    val mediaType: String,
    val mimeType: String,
    val size: Long
)

data class SubmitSportRecordRequest(
    val creditType: String,
    val courseId: String?,
    val hours: Double,
    val description: String,
    val proofFiles: List<ProofFileReference>,
    val sportType: String? = null,
    val startTime: String? = null,
    val endTime: String? = null,
    val actualDurationSeconds: Long? = null,
    /** Required by the V1 ExerciseRecord lifecycle; legacy callers fail closed. */
    val sessionId: String? = null,
    val clientRequestId: String? = null
)

data class EnduranceConversionRequest(
    val timeSeconds: Int,
    val gender: String,
    val gradeLevel: String
)

data class ExemptionSupplementRequest(
    val reason: String,
    val proofFiles: List<String>,
    val organization: String? = null
)

/** UI input adapted to the privacy-bounded POST /api/v1/feedback contract. */
data class SubmitFeedbackRequest(
    val category: String,
    val description: String,
    val currentPage: String,
    val clientVersion: String,
    /** Stable identity for retries of one user-confirmed report. */
    val intentId: String = UUID.randomUUID().toString()
)
