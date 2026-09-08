package edu.bnbu.student.contractvalidation

import bnbu.cr005.review.*
import java.util.UUID

data class StudentAccountPage(val id: UUID, val name: String, val verifiedEmail: String, val disabled: Boolean)
fun CurrentActor.toStudentAccountPage(): StudentAccountPage {
    require(role == ActorRole.STUDENT && !mustChangePassword && adminPermissions.isEmpty() && adminKind == null) {
        "Invalid student actor projection"
    }
    return StudentAccountPage(userId, displayName, verifiedEmail, accountState == CurrentActor.AccountState.DISABLED)
}
data class OtpPage(val challengeId: UUID, val expiresAt: StudentInstant, val retryAfterSeconds: Int)
fun AuthChallenge.toOtpPage(): OtpPage = OtpPage(challengeId, StudentInstant.fromWire(expiresAt), retryAfterSeconds)
data class DeletionPage(val canAttemptDelete: Boolean, val blockers: List<Pair<String, Int>>,
    val deleted: List<String>, val retained: List<String>)
fun AccountDeletionImpact.toDeletionPage(context: StudentViewContext): DeletionPage = DeletionPage(
    context.canAttemptWrite && allowed && blockers.isEmpty(), blockers.map { it.code.value to it.count },
    dataDeleted.toList(), factsRetained.toList())

data class StudentMedia(val id: UUID, val state: MediaAsset.Status, val readyForBinding: Boolean,
    val rejectionCode: MediaFinalizationRejectionCode?, val version: Long)
fun MediaAsset.toStudentMedia(): StudentMedia = StudentMedia(mediaAssetId, status,
    status == MediaAsset.Status.VERIFIED, rejectionCode, version)

data class HelpPage(val id: UUID, val title: String, val bodyMarkdown: String, val locale: String,
    val cached: Boolean, val updatedAt: StudentInstant)
fun HelpArticlePublic.toHelpPage(source: ViewSource): HelpPage = HelpPage(articleId, title, bodyMarkdown,
    locale.value, source != ViewSource.LIVE, StudentInstant.fromWire(updatedAt))
data class FeedbackHistoryRow(val id: UUID, val sequence: Long, val text: String, val at: StudentInstant)
data class FeedbackPageProjection(val id: UUID, val status: FeedbackStatus, val currentEmail: String?,
    val history: List<FeedbackHistoryRow>, val version: Long)
fun FeedbackTicket.toStudentFeedback(): FeedbackPageProjection {
    require(replies.map { it.sequenceNumber }.distinct().size == replies.size) { "Duplicate feedback sequence" }
    return FeedbackPageProjection(feedbackId, status, currentVerifiedEmail, replies.sortedBy { it.sequenceNumber }.map {
        FeedbackHistoryRow(it.replyId, it.sequenceNumber, it.publicReply, StudentInstant.fromWire(it.repliedAt))
    }, version)
}
data class AndroidReleasePage(val forceUpgrade: Boolean, val latestBuild: Long, val downloadUrl: java.net.URI?,
    val checkedAt: StudentInstant, val cached: Boolean)
/** A failed check retains an existing forced-update result; it never invents a successful policy. */
fun androidReleasePage(current: AppReleasePolicy?, previous: AndroidReleasePage? = null): AndroidReleasePage? {
    if (current == null) return previous?.copy(cached = true)
    require(current.platform == AppReleasePolicy.Platform.ANDROID) { "Wrong platform release policy" }
    return AndroidReleasePage(current.forceUpgrade, current.latestBuildNumber, current.downloadUrl,
        StudentInstant.fromWire(current.evaluatedAt), false)
}
