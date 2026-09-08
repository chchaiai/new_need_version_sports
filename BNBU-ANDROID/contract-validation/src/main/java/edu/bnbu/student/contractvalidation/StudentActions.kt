package edu.bnbu.student.contractvalidation

import bnbu.cr005.review.*
import java.util.UUID

enum class ModeSignal { NORMAL, MAINTENANCE, UNKNOWN }
enum class ViewSource { LIVE, CACHED, ARCHIVED }
/** LIVE means a freshly read owned object, including a continuing pre-closure/removal chain.
 * ARCHIVED is an immutable historical view, not merely a course missing from the active list.
 * This context controls UI attempts only; it cannot authorize a server command. */
data class StudentViewContext(val mode: ModeSignal, val source: ViewSource) {
    val canAttemptWrite: Boolean get() = mode == ModeSignal.NORMAL && source == ViewSource.LIVE
}
fun SystemMode?.toModeSignal(fresh: Boolean): ModeSignal = when {
    !fresh || this == null -> ModeSignal.UNKNOWN
    mode == SystemMode.Mode.NORMAL -> ModeSignal.NORMAL
    else -> ModeSignal.MAINTENANCE
}
data class MaintenancePage(val signal: ModeSignal, val title: Pair<String, String>?, val body: Pair<String, String>?,
    val estimatedRecoveryAt: StudentInstant?, val cached: Boolean)
fun SystemMode?.toMaintenancePage(fresh: Boolean): MaintenancePage = MaintenancePage(toModeSignal(fresh),
    this?.announcement?.let { it.titleZh to it.titleEn }, this?.announcement?.let { it.bodyZh to it.bodyEn },
    this?.announcement?.estimatedRecoveryAt?.let(StudentInstant::fromWire), !fresh)

data class FirstMaterialPage(val sessionId: UUID, val deadline: StudentInstant, val serverNow: StudentInstant,
    val historicalChainEligible: Boolean, val canAttemptFirst: Boolean, val canAttemptLockedTransfer: Boolean,
    val lockedBatchId: UUID?, val recordId: UUID?, val needsMaterialRefresh: Boolean)
fun FirstMaterialEligibility.toFirstMaterialPage(route: FirstMaterialAcceptance.SubmissionRoute,
    context: StudentViewContext, currentMaterial: MaterialVersion? = null): FirstMaterialPage {
    val now = StudentInstant.fromWire(serverNow)
    val due = StudentInstant.fromWire(when (route) {
        FirstMaterialAcceptance.SubmissionRoute.ORDINARY -> ordinaryFirstDueAt
        FirstMaterialAcceptance.SubmissionRoute.SWIMMING_TIMELY -> swimmingTimelyDueAt
        FirstMaterialAcceptance.SubmissionRoute.SWIMMING_OFFLINE -> swimmingOfflineDueAt
    })
    val receipt = firstReceipt
    require(receipt == null || receipt.sessionId == sessionId) { "Receipt belongs to another session" }
    require(currentMaterial == null || (receipt != null && currentMaterial.recordId == receipt.recordId &&
        currentMaterial.materialVersionId == receipt.material.materialVersionId &&
        currentMaterial.batchId == receipt.material.batchId && currentMaterial.items == receipt.material.items)) {
        "Locked material identity or manifest mismatch"
    }
    val resume = currentMaterial != null && receipt?.submissionRoute == route &&
        route != FirstMaterialAcceptance.SubmissionRoute.SWIMMING_OFFLINE &&
        currentMaterial.readiness == MaterialVersion.Readiness.PENDING_TRANSFER &&
        currentMaterial.transferDueAt?.let { now < StudentInstant.fromWire(it) } == true
    return FirstMaterialPage(sessionId, due, now, eligibleHistoricalChain,
        context.canAttemptWrite && eligibleHistoricalChain && receipt == null && now < due,
        context.canAttemptWrite && eligibleHistoricalChain && resume,
        receipt?.material?.batchId, receipt?.recordId, receipt != null && currentMaterial == null)
}

data class SupplementPage(val timer: StudentTimer?, val canAttemptSubmit: Boolean,
    val returnUsed: Boolean, val reason: PublicReason?, val originalComment: String?)
fun RecordReviewSummary.toSupplementPage(context: StudentViewContext): SupplementPage {
    val timer = supplementTimer?.toStudentTimer()
    return SupplementPage(timer, context.canAttemptWrite && processingStage == ReviewProcessingStage.SUPPLEMENT_REQUIRED &&
        timer?.state == SupplementTimerView.State.ACTIVE && timer.remainingSeconds?.signum() == 1,
        supplementReturnUsed, publicReason.toStudentReason(publicComment), publicComment)
}

data class InvitationPage(val status: CourseInvitationPreview.Status, val courseId: UUID,
    val expiresAt: StudentInstant, val canAttemptNewRegistration: Boolean, val unavailableReason: String?)
fun CourseInvitationPreview.toInvitationPage(context: StudentViewContext): InvitationPage = InvitationPage(status,
    course.courseId, StudentInstant.fromWire(expiresAt), context.canAttemptWrite &&
        status == CourseInvitationPreview.Status.ACTIVE && newRegistrationAllowed, unavailableReason)

data class InvitationFlowPage(val id: UUID, val state: InvitationRegistrationFlow.Status,
    val originalExpiresAt: StudentInstant, val fixedGraceEndsAt: StudentInstant,
    val canAttemptContinue: Boolean, val version: Long)
fun InvitationRegistrationFlow.toInvitationFlowPage(context: StudentViewContext): InvitationFlowPage =
    InvitationFlowPage(flowId, status, StudentInstant.fromWire(originalExpiresAt), StudentInstant.fromWire(graceEndsAt),
        context.canAttemptWrite && status == InvitationRegistrationFlow.Status.REGISTERED, version)

enum class StudentFailureKind { SIGN_IN, FORBIDDEN, MAINTENANCE, REFRESH_REQUIRED, DEPENDENCY, REQUEST_ERROR, TRANSPORT }
data class StudentFailure(val kind: StudentFailureKind, val code: String?, val requestId: String?,
    val retryAfterSeconds: Int?, val currentVersion: Long?)
fun ErrorEnvelope.toStudentFailure(): StudentFailure {
    val kind = when (code) {
        ErrorCode.TOKEN_EXPIRED, ErrorCode.AUTHENTICATION_REQUIRED -> StudentFailureKind.SIGN_IN
        ErrorCode.FORBIDDEN -> StudentFailureKind.FORBIDDEN
        ErrorCode.SYSTEM_MAINTENANCE -> StudentFailureKind.MAINTENANCE
        ErrorCode.VERSION_CONFLICT -> StudentFailureKind.REFRESH_REQUIRED
        ErrorCode.DEPENDENCY_UNAVAILABLE -> StudentFailureKind.DEPENDENCY
        else -> StudentFailureKind.REQUEST_ERROR
    }
    // No raw/localized server text is used to infer permission or business state.
    return StudentFailure(kind, code.value, requestId, details?.retryAfterSeconds, details?.currentVersion)
}
fun studentTransportFailure(): StudentFailure = StudentFailure(StudentFailureKind.TRANSPORT, null, null, null, null)
