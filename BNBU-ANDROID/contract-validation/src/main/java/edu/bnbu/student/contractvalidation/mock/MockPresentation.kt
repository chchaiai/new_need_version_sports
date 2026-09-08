package edu.bnbu.student.contractvalidation.mock

import bnbu.cr005.review.*
import edu.bnbu.student.contractvalidation.*

enum class PageState { NORMAL, LOADING, EMPTY, ERROR, FORBIDDEN, MAINTENANCE, RESUME }
enum class PageAction { RETRY, SIGN_IN, FIRST_MATERIAL, CONTINUE_BATCH, SUPPLEMENT, REGISTER }
data class DisplayRow(val key: String, val label: String, val value: String)
data class ValidationPage(val state: PageState, val title: String, val rows: List<DisplayRow> = emptyList(),
    val actions: Set<PageAction> = emptySet(), val readOnly: Boolean = false, val problem: String? = null,
    val nextCursor: String? = null, val notificationTargets: List<StudentNotice> = emptyList())

/** No DTO.toString or raw response body is ever put on a student page. */
object MockPresentation {
    fun data(value: Any, context: StudentViewContext, english: Boolean = false): ValidationPage {
        val rows = mutableListOf<DisplayRow>()
        fun row(key: String, label: String, v: Any?) { rows += DisplayRow(key, label, v?.toString() ?: "—") }
        fun page(title: String, state: PageState = PageState.NORMAL, actions: Set<PageAction> = emptySet(),
            historical: Boolean = false, cursor: String? = null) = ValidationPage(state, title, rows,
                if (context.canAttemptWrite) actions else emptySet(), historical || context.source != ViewSource.LIVE,
                nextCursor = cursor)
        fun recordRows(record: StudentRecord, prefix: String = "record") {
            row("$prefix.stage", "审核状态", if (english) record.stage.en else record.stage.zh)
            row("$prefix.actual", "实际分钟", record.actualMinutes)
            row("$prefix.eligible", "可计分钟", record.eligibleMinutes)
            row("$prefix.counted", "计入分钟", record.countedMinutes)
            row("$prefix.date", "原运动日期", record.date)
            row("$prefix.submitted", "提交时间", record.submittedAt.shanghaiLabel())
            record.reason?.let { row("$prefix.reason", "公开原因", if (english) it.en else it.zh) }
            record.originalComment?.let { row("$prefix.comment", "公开说明（原文）", it) }
            row("$prefix.material", "历史材料", "只读")
        }
        return when (value) {
            is StudentCourseProgress -> {
                val p = value.toStudentProgress(context.source); val display = p.toPresentation(english)
                row("progress.minutes", "完成分钟", display.minutes); row("progress.percent", "完成比例", display.percent)
                row("progress.status", "目标状态", display.status)
                p.numbers?.let { n -> n.categories.forEach { c ->
                    row("progress.${c.category}.completed", c.category.value, "${c.completed}/${c.target} min")
                } }
                page(display.heading, if (p.freshness == ProgressFreshness.UNAVAILABLE) PageState.ERROR else PageState.NORMAL,
                    historical = p.freshness == ProgressFreshness.HISTORICAL)
            }
            is StudentDashboard -> {
                val p = value.toStudentHome(context)
                row("home.name", "学生", p.name); row("home.membership", "成员状态", p.status.value)
                row("home.course", "课程", p.course?.name ?: "未加入课程")
                p.progress?.toPresentation(english)?.let { row("home.progress", it.heading, it.minutes); row("home.status", "目标状态", it.status) }
                page("首页", historical = p.progress?.freshness == ProgressFreshness.HISTORICAL)
            }
            is ExerciseRecord -> {
                val p = value.toStudentRecord(source = context.source); recordRows(p)
                val supplement = value.currentReview.toSupplementPage(context)
                supplement.timer?.let {
                    row("supplement.state", "补证计时", it.state.value)
                    row("supplement.remaining", "剩余秒数（服务器）", it.remainingSeconds?.toPlainString())
                    row("supplement.deadline", "有效截止", it.effectiveDueAt?.shanghaiLabel())
                }
                value.currentReview.teacherSla?.toStudentSla()?.let {
                    row("sla.state", "教师复核计时", it.state.value)
                    row("sla.remaining", "剩余学校工作秒数", it.remainingSchoolSeconds?.toPlainString())
                }
                page("打卡记录与补证", actions = if (supplement.canAttemptSubmit) setOf(PageAction.SUPPLEMENT) else emptySet())
            }
            is ExerciseRecordPage -> {
                value.items.forEachIndexed { i, dto -> recordRows(dto.toStudentRecord(source = context.source), "records.$i") }
                page("打卡记录", if (value.items.isEmpty()) PageState.EMPTY else PageState.NORMAL, cursor = value.page.nextCursor)
            }
            is FirstMaterialEligibility -> {
                val p = value.toFirstMaterialPage(FirstMaterialAcceptance.SubmissionRoute.ORDINARY, context)
                row("first.deadline", "普通首次材料截止", p.deadline.shanghaiLabel())
                row("first.batch", "原锁定批次", p.lockedBatchId)
                row("first.refresh", "材料状态", if (p.needsMaterialRefresh) "须读取当前材料状态" else "尚无受理回执")
                page("首次材料", if (p.needsMaterialRefresh) PageState.RESUME else PageState.NORMAL,
                    if (p.canAttemptFirst) setOf(PageAction.FIRST_MATERIAL) else emptySet())
            }
            is CourseInvitationPreview -> {
                val p = value.toInvitationPage(context)
                row("invitation.course", "课程", value.course.name); row("invitation.state", "邀请状态", p.status.value)
                row("invitation.reason", "受理边界", p.unavailableReason)
                page("入班邀请", actions = if (p.canAttemptNewRegistration) setOf(PageAction.REGISTER) else emptySet())
            }
            is StudentCourse -> {
                val p = value.toStudentCoursePage(context)
                row("course.name", "课程", p.name); row("course.teacher", "责任教师", p.teacherName)
                row("course.targets", "分类目标", "${p.courseTarget}/${p.otherTarget} min")
                row("course.cutoff", "常规截止", p.regularCutoffAt.shanghaiLabel())
                page("课程", historical = p.readOnly)
            }
            is ExerciseSession -> {
                val p = value.toStudentSession()
                row("session.state", "会话状态", p.state.value); row("session.elapsed", "服务器累计秒数", p.elapsedSeconds)
                row("session.date", "原运动日期", p.businessDate)
                page("运动会话恢复", PageState.RESUME)
            }
            is StudentEnduranceOutcome -> {
                val p = value.toStudentEndurance()
                row("endurance.state", "体测状态", p.state.value); row("endurance.distance", "项目（米）", p.distanceMeters)
                row("endurance.duration", "原始用时（秒）", p.durationSeconds); row("endurance.date", "测试日期", p.testedOn)
                page("原始耐力结果")
            }
            is StudentApplication -> {
                val p = value.toStudentApplicationPage(context)
                row("application.status", "申请状态", p.status.value); row("application.type", "申请类型", p.type.value)
                row("application.images", "累计图片数", p.evidenceIds.size)
                row("application.kind", "认证类别", p.certification?.kind?.value)
                row("application.credit", "认可分钟状态", p.creditState?.value)
                p.decisions.forEach { row("application.decision.${it.sequence}", "历史决定", it.message) }
                page("免测与认证", actions = if (p.canAttemptSupplement) setOf(PageAction.SUPPLEMENT) else emptySet())
            }
            is bnbu.cr005.review.StudentApplicationPage -> {
                value.items.forEachIndexed { i, item -> row("applications.$i", item.applicationNumber, item.status.value) }
                page("申请列表", if (value.items.isEmpty()) PageState.EMPTY else PageState.NORMAL, cursor = value.page.nextCursor)
            }
            is StudentNotificationPage -> {
                val notices = value.items.map { it.toStudentNotice() }
                notices.forEachIndexed { i, n -> row("notification.$i.title", "通知", n.title); row("notification.$i.body", "内容", n.body) }
                page("站内通知", if (notices.isEmpty()) PageState.EMPTY else PageState.NORMAL, cursor = value.page.nextCursor)
                    .copy(notificationTargets = notices)
            }
            is CurrentActor -> {
                val p = value.toStudentAccountPage()
                row("account.name", "姓名", p.name); row("account.email", "已验证邮箱", p.verifiedEmail)
                page("账户信息", if (p.disabled) PageState.FORBIDDEN else PageState.NORMAL)
            }
            is AuthChallenge -> {
                val p = value.toOtpPage(); row("otp.expiry", "验证码有效期", p.expiresAt.shanghaiLabel())
                row("otp.retry", "重发等待秒数", p.retryAfterSeconds); page("邮箱验证码登录")
            }
            is AccountDeletionImpact -> {
                val p = value.toDeletionPage(context)
                row("deletion.allowed", "可申请注销", p.canAttemptDelete)
                row("deletion.retained", "保留事实", p.retained.joinToString("、")); page("账户注销")
            }
            is HelpArticlePublic -> {
                val p = value.toHelpPage(context.source)
                row("help.body", if (p.cached) "缓存内容" else "正式帮助内容", p.bodyMarkdown)
                page(p.title, historical = p.cached)
            }
            is FeedbackTicket -> {
                val p = value.toStudentFeedback(); row("feedback.status", "反馈状态", p.status.value)
                p.history.forEach { row("feedback.reply.${it.sequence}", "公开回复", it.text) }; page("问题反馈")
            }
            is FeedbackPage -> {
                value.items.forEachIndexed { i, dto -> row("feedback.$i", dto.feedbackNumber, dto.toStudentFeedback().status.value) }
                page("反馈列表", if (value.items.isEmpty()) PageState.EMPTY else PageState.NORMAL, cursor = value.page.nextCursor)
            }
            is AppReleasePolicy -> {
                val p = requireNotNull(androidReleasePage(value))
                row("release.force", "需要更新", p.forceUpgrade); row("release.latest", "最新构建", p.latestBuild); page("版本信息")
            }
            is MediaAsset -> {
                val p = value.toStudentMedia(); row("media.state", "媒体状态", p.state.value)
                row("media.ready", "可用于正式绑定", p.readyForBinding); page("材料校验")
            }
            is SupplementAcceptanceReceipt -> {
                require(value.material.materialVersionId == value.review.materialVersionId)
                row("receipt.status", "补证状态", "补证已接收 · 待教师复核")
                row("receipt.at", "服务器受理时间", StudentInstant.fromWire(value.acceptedAt).shanghaiLabel())
                page("补证已接收")
            }
            else -> throw IllegalArgumentException("No student projection for this response")
        }
    }
    fun maintenance(mode: SystemMode, fresh: Boolean): ValidationPage {
        val p = mode.toMaintenancePage(fresh)
        val rows = listOf(DisplayRow("maintenance.title.en", "English", p.title?.second ?: "—"),
            DisplayRow("maintenance.body", "公告", p.body?.first ?: "—"),
            DisplayRow("maintenance.body.en", "English", p.body?.second ?: "—"),
            DisplayRow("maintenance.estimate", "预计恢复时间", p.estimatedRecoveryAt?.shanghaiLabel() ?: "—"))
        return ValidationPage(PageState.MAINTENANCE, p.title?.first ?: "系统维护", rows, readOnly = true)
    }
    fun failure(result: HttpResult): ValidationPage = when (result) {
        is HttpResult.ApiError -> when (result.error.kind) {
            StudentFailureKind.MAINTENANCE -> ValidationPage(PageState.MAINTENANCE, "系统维护", readOnly = true, problem = result.error.code)
            StudentFailureKind.FORBIDDEN -> ValidationPage(PageState.FORBIDDEN, "暂无权限", readOnly = true, problem = result.error.code)
            StudentFailureKind.SIGN_IN -> ValidationPage(PageState.ERROR, "请重新通过邮箱验证码登录", actions = setOf(PageAction.SIGN_IN), problem = result.error.code)
            else -> ValidationPage(PageState.ERROR, "暂时无法完成，请刷新后重试", actions = setOf(PageAction.RETRY), problem = result.error.code)
        }
        HttpResult.TransportError -> ValidationPage(PageState.ERROR, "连接失败，请重试", actions = setOf(PageAction.RETRY), problem = "TRANSPORT")
        HttpResult.InvalidRequest -> ValidationPage(PageState.ERROR, "材料或请求不符合要求，请检查后重试", problem = "LOCAL_INVALID_REQUEST")
        else -> ValidationPage(PageState.ERROR, "数据暂不可用，请重试", actions = setOf(PageAction.RETRY), problem = "INVALID_RESPONSE")
    }
}
