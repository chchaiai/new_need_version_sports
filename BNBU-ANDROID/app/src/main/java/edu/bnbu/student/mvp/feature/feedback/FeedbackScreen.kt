package edu.bnbu.student.mvp.feature.feedback

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import edu.bnbu.student.mvp.core.designsystem.AppleIconButton as IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.BuildConfig
import edu.bnbu.student.mvp.core.data.ApiStudentRepository
import edu.bnbu.student.mvp.core.designsystem.ActionButton
import edu.bnbu.student.mvp.core.designsystem.BNBUFormField
import edu.bnbu.student.mvp.core.designsystem.EmptyPlaceholder
import edu.bnbu.student.mvp.core.designsystem.PrimaryActionButton
import edu.bnbu.student.mvp.core.designsystem.SectionTitle
import edu.bnbu.student.mvp.core.designsystem.SegmentedControl
import edu.bnbu.student.mvp.core.designsystem.StatusBadge
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.ValidationPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.model.feedbackCategoryLabel
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.core.network.FeedbackTicketResponse
import edu.bnbu.student.mvp.core.network.SubmitFeedbackRequest
import edu.bnbu.student.mvp.core.state.StudentAppState
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import java.util.UUID

private const val MaxDescriptionLength = 2_000

private enum class FeedbackTab { New, Tickets }

/** Problem-feedback form backed by the privacy-bounded V1 feedback contract. */
@Composable
fun FeedbackScreen(
    appState: StudentAppState,
    repository: ApiStudentRepository?,
    onUnauthorized: () -> Unit,
    onBack: () -> Unit
) {
    val focusManager = LocalFocusManager.current
    // Categories and transient messages are presentation copy. Keep their
    // remembered state scoped to the active app language so an in-place
    // recomposition can never keep a value translated for the old locale.
    val appLanguage = AppLanguagePreferences.currentLanguage
    var tab by remember { mutableStateOf(FeedbackTab.New) }
    var tickets by remember { mutableStateOf<List<FeedbackTicketResponse>>(emptyList()) }
    var isLoadingTickets by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var errorMessage by remember(appLanguage) { mutableStateOf<String?>(null) }
    var submittedTicket by remember { mutableStateOf<FeedbackTicketResponse?>(null) }
    val requestJob = remember { mutableStateOf<Job?>(null) }

    val categories = listOf(
        interfaceText("功能异常", "Feature issue"),
        interfaceText("功能建议", "Feature suggestion"),
        interfaceText("无障碍问题", "Accessibility issue"),
        interfaceText("隐私问题", "Privacy issue"),
        interfaceText("其他", "Other")
    )
    var selectedCategory by remember(appLanguage) { mutableStateOf(categories.first()) }
    var description by remember { mutableStateOf("") }
    var descriptionFocusedOnce by remember { mutableStateOf(false) }
    var descriptionTouched by remember { mutableStateOf(false) }
    var submitAttempted by remember { mutableStateOf(false) }
    val descriptionFocusRequester = remember { FocusRequester() }
    var submissionIntentId by rememberSaveable { mutableStateOf(UUID.randomUUID().toString()) }
    val currentPage = interfaceText("我的 / 问题反馈", "Profile / Report a problem")

    fun loadTickets() {
        if (isLoadingTickets || isSubmitting) return
        val availableRepository = repository ?: run {
            errorMessage = interfaceText(
                "尚未连接服务器，无法加载反馈记录。",
                "The server is not connected, so feedback history cannot be loaded."
            )
            return
        }
        isLoadingTickets = true; errorMessage = null
        val job = appState.launchAuthenticatedRequest {
            try { tickets = availableRepository.listFeedbackTickets() }
            catch (e: CancellationException) { throw e }
            catch (e: Exception) {
                if (e is ApiHttpException && e.statusCode == 401) { onUnauthorized(); return@launchAuthenticatedRequest }
                errorMessage = interfaceText(
                    "加载反馈记录失败，请检查网络后重试。",
                    "Could not load feedback history. Check your connection and try again."
                )
            } finally { isLoadingTickets = false }
        }
        requestJob.value = job
        if (job == null) { isLoadingTickets = false; onUnauthorized() }
    }

    fun submit() {
        submitAttempted = true
        val availableRepository = repository ?: run {
            errorMessage = interfaceText(
                "尚未连接服务器，无法提交反馈；请重新登录后重试。",
                "The server is not connected, so feedback cannot be submitted. Sign in again and retry."
            )
            return
        }
        if (!appState.isWriteAllowed) {
            errorMessage = interfaceText(
                "系统当前为维护模式，暂时无法提交反馈。",
                "The system is under maintenance; feedback cannot be submitted."
            )
            return
        }
        val note = description.trim()
        when {
            isSubmitting -> return
            note.isEmpty() -> {
                errorMessage = null
                descriptionFocusRequester.requestFocus()
                return
            }
            note.length > MaxDescriptionLength -> {
                errorMessage = interfaceText(
                    "问题描述最多 $MaxDescriptionLength 字。",
                    "The description can contain up to $MaxDescriptionLength characters."
                )
                return
            }
        }
        isSubmitting = true; errorMessage = null
        val job = appState.launchAuthenticatedRequest {
            try {
                val ticket = availableRepository.submitFeedback(SubmitFeedbackRequest(
                    category = selectedCategory, description = note, currentPage = currentPage,
                    clientVersion = BuildConfig.VERSION_NAME,
                    intentId = submissionIntentId
                ))
                submittedTicket = ticket
                tickets = listOf(ticket) + tickets.filterNot { it.id == ticket.id }
                submissionIntentId = UUID.randomUUID().toString()
                submitAttempted = false
                descriptionTouched = false
                descriptionFocusedOnce = false
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) {
                if (e is ApiHttpException && e.statusCode == 401) { onUnauthorized(); return@launchAuthenticatedRequest }
                errorMessage = interfaceText(
                    "提交失败，请检查网络或稍后重试。",
                    "Submission failed. Check your connection or try again later."
                )
            } finally { isSubmitting = false }
        }
        requestJob.value = job
        if (job == null) { isSubmitting = false; onUnauthorized() }
    }

    DisposableEffect(Unit) { onDispose { requestJob.value?.cancel() } }
    BackHandler {
        focusManager.clearFocus(force = true)
        when {
            isSubmitting -> errorMessage = interfaceText(
                "问题正在提交，请稍候。",
                "Your report is being submitted. Please wait."
            )
            submittedTicket != null -> submittedTicket = null
            else -> onBack()
        }
    }

    submittedTicket?.let { ticket ->
        FeedbackSubmittedScreen(ticket, onViewTickets = { submittedTicket = null; tab = FeedbackTab.Tickets; loadTickets() }, onBack = { submittedTicket = null })
        return
    }

    LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.fillMaxWidth()) {
        item { BackTitle(onBack) }
        item { SectionTitle(title = interfaceText("问题反馈", "Report a problem")) }
        item {
            SegmentedControl(
                FeedbackTab.entries,
                tab,
                {
                    when (it) {
                        FeedbackTab.New -> interfaceText("提交问题", "New report")
                        FeedbackTab.Tickets -> interfaceText("我的反馈", "My reports")
                    }
                },
                { tab = it; if (it == FeedbackTab.Tickets && tickets.isEmpty()) loadTickets() }
            )
        }
        errorMessage?.let { message -> item { ValidationPanel(message) } }
        when (tab) {
            FeedbackTab.New -> item { FeedbackForm(
                categories, selectedCategory, { selectedCategory = it }, description, {
                    description = it.take(MaxDescriptionLength)
                    errorMessage = null
                },
                isSubmitting,
                writeEnabled = appState.isWriteAllowed && repository != null,
                serviceUnavailable = repository == null,
                descriptionError = if ((descriptionTouched || submitAttempted) && description.isBlank()) {
                    interfaceText("请填写问题描述。", "Describe the problem.")
                } else null,
                descriptionFocusRequester = descriptionFocusRequester,
                onDescriptionFocusChanged = { focused ->
                    if (focused) descriptionFocusedOnce = true
                    else if (descriptionFocusedOnce) descriptionTouched = true
                },
                onSubmit = ::submit
            ) }
            FeedbackTab.Tickets -> {
                if (isLoadingTickets) item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { CircularProgressIndicator(Modifier.size(28.dp)) } }
                else if (tickets.isEmpty()) item {
                    EmptyPlaceholder(
                        interfaceText("暂无已提交问题", "No reports yet"),
                        interfaceText(
                            "提交问题后，可在这里查看处理状态。",
                            "After submitting a report, you can track its status here."
                        )
                    )
                }
                else items(tickets, key = { it.id.ifBlank { it.ticketNumber } }) { FeedbackTicketCard(it) }
                item {
                    ActionButton(
                        interfaceText("刷新处理状态", "Refresh status"),
                        Icons.Filled.Refresh,
                        false,
                        enabled = !isLoadingTickets && repository != null,
                        onClick = ::loadTickets
                    )
                }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable private fun BackTitle(onBack: () -> Unit) = Row(
    Modifier.fillMaxWidth().height(48.dp).bnbuClickable(onClick = onBack), verticalAlignment = Alignment.CenterVertically
) {
    val backLabel = interfaceText("返回", "Back")
    Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, backLabel)
    Text(backLabel, Modifier.padding(start = 4.dp))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FeedbackForm(
    categories: List<String>, selectedCategory: String, onCategoryChanged: (String) -> Unit,
    description: String, onDescriptionChanged: (String) -> Unit,
    isSubmitting: Boolean, writeEnabled: Boolean, serviceUnavailable: Boolean,
    descriptionError: String?,
    descriptionFocusRequester: FocusRequester,
    onDescriptionFocusChanged: (Boolean) -> Unit,
    onSubmit: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val formEnabled = writeEnabled && !isSubmitting
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (!writeEnabled) {
            ValidationPanel(
                if (serviceUnavailable) {
                    interfaceText(
                        "当前尚未连接服务器。你仍可查看反馈表单，但重新登录并连接后才能提交。",
                        "The server is not connected. You can view the form, but submission requires signing in again."
                    )
                } else {
                    interfaceText(
                        "系统当前为维护模式，暂时无法提交反馈。",
                        "The system is under maintenance; feedback submission is unavailable."
                    )
                }
            )
        }
        SwissPanel { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(interfaceText("问题内容", "Problem details"), style = MaterialTheme.typography.titleMedium)
            Text(
                interfaceText(
                    "请选择问题类型并描述你遇到的情况。",
                    "Choose a category and describe what happened."
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
            val categoryLabel = interfaceText("问题类型", "Category")
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { if (formEnabled) expanded = it },
                modifier = Modifier.semantics(mergeDescendants = true) {
                    contentDescription = categoryLabel
                    stateDescription = listOf(
                        selectedCategory,
                        interfaceText("必填", "Required"),
                        if (expanded) interfaceText("已展开", "Expanded") else interfaceText("已收起", "Collapsed")
                    ).joinToString(". ")
                }
            ) {
                OutlinedTextField(selectedCategory, {}, readOnly = true, label = { Text(interfaceText("问题类型（必填）", "Category (required)")) }, enabled = formEnabled,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) }, modifier = Modifier.menuAnchor().fillMaxWidth().testTag("feedback.category"))
                ExposedDropdownMenu(expanded, { expanded = false }) { categories.forEach { category -> DropdownMenuItem({ Text(category) }, { onCategoryChanged(category); expanded = false }) } }
            }
            BNBUFormField(
                value = description,
                onValueChange = onDescriptionChanged,
                label = interfaceText("问题描述", "Description"),
                testTag = "feedback.description",
                required = true,
                placeholder = interfaceText(
                    "例如：操作步骤、预期结果和实际情况",
                    "Include the steps, expected result, and actual result"
                ),
                supportingText = interfaceText(
                    "请勿填写密码、验证码、访问令牌、完整身份资料或媒体内容。",
                    "Do not include passwords, verification codes, access tokens, complete identity details, or media content."
                ),
                errorText = descriptionError,
                counter = description.length to MaxDescriptionLength,
                singleLine = false,
                minLines = 5,
                maxLines = 10,
                enabled = formEnabled,
                loading = isSubmitting,
                inputModifier = Modifier.focusRequester(descriptionFocusRequester),
                onFocusChanged = onDescriptionFocusChanged,
            )
        } }
        PrimaryActionButton(
            interfaceText("提交问题", "Submit report"),
            Icons.Filled.Send,
            enabled = writeEnabled,
            loading = isSubmitting,
            onClick = onSubmit
        )
    }
}

@Composable private fun FeedbackSubmittedScreen(ticket: FeedbackTicketResponse, onViewTickets: () -> Unit, onBack: () -> Unit) = Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
    BackTitle(onBack); SectionTitle(title = interfaceText("问题已提交", "Report submitted"))
    SwissPanel { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(Icons.Filled.CheckCircle, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(32.dp)); Text(interfaceText("我们已收到你的问题。", "We received your report."), style = MaterialTheme.typography.titleMedium)
        Text(interfaceText("工单编号：", "Ticket: ") + ticket.ticketNumber.ifBlank { ticket.id })
        Row(verticalAlignment = Alignment.CenterVertically) { Text(interfaceText("当前状态：", "Status: ")); StatusBadge(ticket.status.feedbackStatusLabel(), filled = true) }
    } }
    PrimaryActionButton(interfaceText("查看处理状态", "View status"), Icons.Filled.SupportAgent, onClick = onViewTickets)
}

@Composable private fun FeedbackTicketCard(ticket: FeedbackTicketResponse) = SwissPanel { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
    Row(verticalAlignment = Alignment.CenterVertically) { Text(ticket.ticketNumber.ifBlank { ticket.id }, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f)); StatusBadge(ticket.status.feedbackStatusLabel(), filled = true) }
    Text(feedbackCategoryLabel(ticket.category), color = MaterialTheme.colorScheme.primary); Text(ticket.description, maxLines = 3)
    if (ticket.createdAt.isNotBlank()) Text(interfaceText("提交时间：", "Submitted: ") + ticket.createdAt, color = MaterialTheme.colorScheme.onSurfaceVariant)
    ticket.reply?.takeIf { it.isNotBlank() }?.let { Text(interfaceText("管理员公开回复：", "Public administrator response: ") + it, color = MaterialTheme.colorScheme.onSurfaceVariant) }
} }

internal fun String.feedbackStatusLabel(): String = when (trim().lowercase()) {
    "pending", "open", "submitted", "pending_acceptance", "待处理", "待受理" ->
        interfaceText("待受理", "Pending acceptance")
    "processing", "in_progress", "accepted", "处理中", "受理中" ->
        interfaceText("受理中", "In progress")
    "pending_technical", "technical_pending", "awaiting_technical", "待技术团队处理" ->
        interfaceText("待技术团队处理", "Waiting for technical team")
    "resolved", "completed", "已解决", "处理完成" ->
        interfaceText("处理完成", "Completed")
    "closed", "已关闭" -> interfaceText("已关闭", "Closed")
    else -> trim().ifBlank { interfaceText("状态待确认", "Status unavailable") }
}
