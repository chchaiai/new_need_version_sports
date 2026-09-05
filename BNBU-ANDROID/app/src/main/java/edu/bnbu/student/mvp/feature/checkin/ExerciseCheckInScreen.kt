package edu.bnbu.student.mvp.feature.checkin

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import androidx.annotation.DrawableRes
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.AlertDialog
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import edu.bnbu.student.mvp.core.designsystem.AppleIconButton as IconButton
import androidx.compose.material3.MaterialTheme
import edu.bnbu.student.mvp.core.designsystem.AppleOutlinedButton as OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import androidx.core.content.ContextCompat
import coil3.ImageLoader
import coil3.video.VideoFrameDecoder
import edu.bnbu.student.mvp.R
import edu.bnbu.student.mvp.core.designsystem.EmptyPlaceholder
import edu.bnbu.student.mvp.core.designsystem.BNBUErrorPanel
import edu.bnbu.student.mvp.core.designsystem.BNBUFormField
import edu.bnbu.student.mvp.core.designsystem.SectionTitle
import edu.bnbu.student.mvp.core.designsystem.SwissPanel
import edu.bnbu.student.mvp.core.designsystem.ValidationPanel
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.error.ClientErrorContext
import edu.bnbu.student.mvp.core.error.ClientErrorMapper
import edu.bnbu.student.mvp.core.error.SafeClientLogger
import edu.bnbu.student.mvp.core.error.UserFacingError
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.exercise.MaxOtherSportNameLength
import edu.bnbu.student.mvp.core.exercise.ExistingRemoteExerciseSession
import edu.bnbu.student.mvp.core.model.CreditType
import edu.bnbu.student.mvp.core.model.CheckInTimeWindow
import edu.bnbu.student.mvp.core.model.ProofAttachment
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.model.ProofUploadRule
import edu.bnbu.student.mvp.core.network.UploadProgress
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import edu.bnbu.student.mvp.core.state.StudentAppState
import edu.bnbu.student.mvp.core.time.BeijingCheckInZoneId
import edu.bnbu.student.mvp.feature.checkin.session.ExerciseSessionController
import edu.bnbu.student.mvp.feature.checkin.session.ExerciseSessionDetails
import edu.bnbu.student.mvp.feature.checkin.session.ExerciseSessionState
import edu.bnbu.student.mvp.feature.checkin.session.MaxExerciseDescriptionLength
import edu.bnbu.student.mvp.feature.checkin.session.MaximumExerciseMillis
import edu.bnbu.student.mvp.feature.checkin.session.SessionCaptureTarget
import edu.bnbu.student.mvp.feature.checkin.session.SessionDraftKey
import edu.bnbu.student.mvp.feature.checkin.session.SessionMediaDraft
import edu.bnbu.student.mvp.feature.checkin.session.SubmissionSummary
import edu.bnbu.student.mvp.feature.checkin.session.courseSportSelection
import edu.bnbu.student.mvp.feature.checkin.session.effectiveDurationMillis
import edu.bnbu.student.mvp.feature.dashboard.CourseJoinEntryPanel
import java.io.File
import java.text.DateFormat
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZonedDateTime
import java.util.Date
import kotlinx.coroutines.delay

private enum class ExerciseCheckInTab {
    Exercise,
    Records;

    fun label(): String = when (this) {
        Exercise -> interfaceText("运动", "Exercise")
        Records -> interfaceText("记录", "Records")
    }
}

private data class ExerciseSportOption(
    val value: String,
    val label: String,
    val englishLabel: String = label,
    @DrawableRes val iconResource: Int
)

internal const val ExerciseSportGridColumnCount = 3

/** The result of the checks that must pass before a new exercise session starts. */
internal data class CheckInReadiness(
    val canStart: Boolean,
    val blockedReason: String? = null
)

/**
 * Evaluates the client-side prerequisites currently available in [StudentAppState].
 *
 * The server supplies course lifecycle state and time-window policy. The client
 * applies the same policy before starting, and the server repeats it on submission.
 */
internal fun evaluateCheckInReadiness(
    appState: StudentAppState,
    now: ZonedDateTime = ZonedDateTime.now(BeijingCheckInZoneId)
): CheckInReadiness {
    if (!appState.workspace.student.accountStatus.equals("ACTIVE", ignoreCase = true)) {
        return CheckInReadiness(false, interfaceText("账号状态异常，无法打卡", "Account status prevents check-in."))
    }
    if (!appState.hasActiveEnrollment) {
        return CheckInReadiness(false, interfaceText("你尚未加入本学期体育课程，请先扫码或输入邀请码加入", "You have not joined a sports course this semester. Scan a QR code or enter an invitation code first."))
    }

    if (!appState.hasOpenCurrentCourse) {
        return CheckInReadiness(false, interfaceText("当前课程尚未开放打卡，请联系任课教师", "Check-in is not open for the current course. Contact your instructor."))
    }
    appState.checkInTimeWindow.canStartExercise(now)?.let { reason ->
        return CheckInReadiness(false, reason)
    }
    return CheckInReadiness(canStart = true)
}

private val ExerciseSportOptions = listOf(
    ExerciseSportOption("running", "跑步", "Running", R.drawable.ic_sports_running),
    ExerciseSportOption("basketball", "篮球", "Basketball", R.drawable.ic_sports_basketball),
    ExerciseSportOption("football", "足球", "Football", R.drawable.ic_sports_football),
    ExerciseSportOption(
        value = "badminton",
        label = "羽毛球",
        englishLabel = "Badminton",
        iconResource = R.drawable.ic_sports_badminton
    ),
    ExerciseSportOption(
        value = "table_tennis",
        label = "乒乓球",
        englishLabel = "Table tennis",
        iconResource = R.drawable.ic_sports_table_tennis
    ),
    ExerciseSportOption("swimming", "游泳", "Swimming", R.drawable.ic_sports_swimming),
    ExerciseSportOption("fitness", "健身", "Fitness", R.drawable.ic_sports_fitness),
    ExerciseSportOption("cycling", "骑行", "Cycling", R.drawable.ic_sports_cycling),
    ExerciseSportOption(ExerciseSessionDetails.OtherSportType, "其他", "Other", R.drawable.ic_sports_other)
)

private fun CreditType.displayLabel(): String = when (this) {
    CreditType.CourseRelated -> interfaceText("课程相关", "Course-related")
    CreditType.General -> interfaceText("其他运动", "Other exercise")
    CreditType.OrganizationOffset -> interfaceText("系统抵扣", "System offset")
}

@Composable
internal fun ExerciseCheckInRoot(
    appState: StudentAppState,
    controller: ExerciseSessionController,
    onReturnHome: () -> Unit = {}
) {
    val accountId = appState.workspace.student.id
    var selectedTab by rememberSaveable { mutableStateOf(ExerciseCheckInTab.Exercise) }
    var selectedRecordId by rememberSaveable { mutableStateOf<String?>(null) }
    var showLeaveSessionConfirm by rememberSaveable { mutableStateOf(false) }
    val context = LocalContext.current
    val imageLoader = remember(context) {
        ImageLoader.Builder(context)
            .components { add(VideoFrameDecoder.Factory()) }
            .build()
    }

    LaunchedEffect(
        accountId,
        appState.isAuthenticated,
        appState.requiresContactBinding
    ) {
        controller.bindAccount(
            accountId = if (appState.isAuthenticated && !appState.requiresContactBinding) accountId else "",
            preserveExistingDrafts = appState.isAuthenticated && appState.requiresContactBinding
        )
        if (appState.isAuthenticated && !appState.requiresContactBinding) {
            appState.refreshCheckInTimeWindow()
        }
    }

    val selectedRecord = selectedRecordId?.let { id ->
        appState.workspace.records.firstOrNull { it.id == id }
    }
    if (selectedRecord != null) {
        CheckInRecordDetail(
            appState = appState,
            record = selectedRecord,
            imageLoader = imageLoader,
            onBack = { selectedRecordId = null }
        )
        return
    }

    val isFocusedSession = controller.state is ExerciseSessionState.Active ||
        controller.state is ExerciseSessionState.Paused ||
        controller.state is ExerciseSessionState.Finished
    val hasOngoingSession = controller.state is ExerciseSessionState.Active ||
        controller.state is ExerciseSessionState.Paused
    LaunchedEffect(hasOngoingSession) {
        if (!hasOngoingSession) showLeaveSessionConfirm = false
    }
    BackHandler(enabled = hasOngoingSession && selectedTab == ExerciseCheckInTab.Exercise) {
        showLeaveSessionConfirm = true
    }
    if (showLeaveSessionConfirm && hasOngoingSession) {
        AlertDialog(
            onDismissRequest = { showLeaveSessionConfirm = false },
            title = { Text(interfaceText("返回首页？", "Return to Home?")) },
            text = {
                Text(interfaceText(
                    "返回不会结束或提交本次运动。你可以从首页继续查看运动状态。",
                    "Returning does not end or submit this session. You can reopen its status from Home."
                ))
            },
            confirmButton = {
                TextButton(onClick = {
                    showLeaveSessionConfirm = false
                    onReturnHome()
                }) { Text(interfaceText("返回首页", "Return to Home")) }
            },
            dismissButton = {
                TextButton(onClick = { showLeaveSessionConfirm = false }) {
                    Text(interfaceText("留在此页", "Stay here"))
                }
            }
        )
    }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .testTag("screen.checkIn")
    ) {
        if (!isFocusedSession) {
            Text(
                text = interfaceText("运动打卡", "Exercise check-in"),
                color = MaterialTheme.colorScheme.onBackground,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.height(14.dp))
            CheckInTabBar(
                selected = selectedTab,
                onSelected = { selectedTab = it }
            )
            Spacer(Modifier.height(16.dp))
        }
        when (selectedTab) {
            ExerciseCheckInTab.Exercise -> ExerciseFlowContent(
                appState = appState,
                controller = controller,
                onViewRecords = { selectedTab = ExerciseCheckInTab.Records },
                onReturnHome = onReturnHome
            )
            ExerciseCheckInTab.Records -> {
                val records = appState.workspace.records.filter {
                    it.creditType != CreditType.OrganizationOffset
                }
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 28.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    item { RecordListIntro(records) }
                    if (records.isEmpty()) {
                        item {
                            EmptyPlaceholder(
                                title = interfaceText("暂无记录", "No records"),
                                message = interfaceText("当前账号还没有可展示的打卡记录。", "There are no check-in records to show for this account.")
                            )
                        }
                    } else {
                        item { RecordListSectionTitle(records.size) }
                        items(records, key = { it.id }) { record ->
                            val courseDisplayName = record.courseId
                                ?.let { courseId ->
                                    appState.workspace.courses.firstOrNull { it.id == courseId }
                                }
                                ?.name
                                ?.takeIf { it.isNotBlank() }
                                ?: interfaceText("自主运动", "Independent exercise")
                            RecordCard(
                                record = record,
                                courseDisplayName = courseDisplayName,
                                onOpenDetail = { selectedRecordId = record.id }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ExerciseFlowContent(
    appState: StudentAppState,
    controller: ExerciseSessionController,
    onViewRecords: () -> Unit,
    onReturnHome: () -> Unit
) {
    if (controller.shouldShowHealthReminder) {
        AlertDialog(
            onDismissRequest = {},
            confirmButton = {
                TextButton(onClick = controller::dismissHealthReminder) { Text(interfaceText("我知道了", "Got it")) }
            },
            title = { Text(interfaceText("健康安全提醒", "Health and safety reminder")) },
            text = { Text(interfaceText("请根据自身身体状况适量运动。如感不适应立即停止，必要时及时就医。", "Exercise within your limits. Stop immediately if you feel unwell and seek medical help when necessary.")) }
        )
    }
    val message = controller.message
    if (message != null) {
        AlertDialog(
            onDismissRequest = controller::consumeMessage,
            confirmButton = {
                TextButton(onClick = controller::consumeMessage) { Text(interfaceText("我知道了", "Got it")) }
            },
            title = { Text(interfaceText("运动提示", "Exercise notice")) },
            text = { Text(message) }
        )
    }

    controller.userFacingError?.let { error ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 28.dp)
        ) {
            item {
                BNBUErrorPanel(
                    error = error,
                    onDismiss = controller::consumeUserFacingError
                )
            }
        }
        return
    }

    if (controller.isRestoring) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(
                modifier = Modifier.padding(horizontal = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CircularProgressIndicator()
                Spacer(Modifier.height(12.dp))
                Text(
                    text = interfaceText("正在核对可恢复内容…", "Checking recoverable content…"),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = interfaceText(
                        "正在交叉核对服务器会话与本地媒体草稿；恢复完成前不会把草稿显示为已提交。",
                        "Cross-checking the server session and local media drafts. Drafts are not treated as submitted while recovery is in progress."
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center
                )
            }
        }
        return
    }

    controller.existingRemoteSession?.let { existing ->
        ExistingRemoteSessionPanel(
            existing = existing,
            isRefreshing = controller.isSessionBusy,
            onRefresh = controller::refreshExistingRemoteSession,
            onReturnHome = onReturnHome
        )
        return
    }

    when (val state = controller.state) {
        ExerciseSessionState.Idle -> ExercisePreparationContent(appState, controller)
        is ExerciseSessionState.Active -> ExerciseRunningContent(
            controller = controller,
            state = state,
            paused = false
        )
        is ExerciseSessionState.Paused -> ExerciseRunningContent(
            controller = controller,
            state = state,
            paused = true
        )
        is ExerciseSessionState.Finished -> ExerciseFinishedContent(appState, controller, state)
        is ExerciseSessionState.Submitted -> LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(top = 18.dp, bottom = 28.dp)
        ) {
            item {
                ExerciseSubmissionAcceptedScreen(
                    summary = state.summary,
                    onViewRecords = onViewRecords,
                    onReturnHome = controller::resetAfterSubmission
                )
            }
        }
    }
}

@Composable
private fun ExistingRemoteSessionPanel(
    existing: ExistingRemoteExerciseSession,
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    onReturnHome: () -> Unit
) {
    val status = when (existing.phase) {
        edu.bnbu.student.mvp.core.exercise.ExerciseSessionPhase.ACTIVE ->
            interfaceText("进行中", "In progress")
        edu.bnbu.student.mvp.core.exercise.ExerciseSessionPhase.PAUSED ->
            interfaceText("已暂停", "Paused")
        else -> interfaceText("未知", "Unknown")
    }
    val startedAt = DateFormat.getDateTimeInstance(
        DateFormat.MEDIUM,
        DateFormat.SHORT
    ).format(Date(existing.startedAtEpochMillis))

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            SwissPanel {
                Text(
                    text = interfaceText("已有运动正在进行", "An exercise is already in progress"),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(Modifier.height(10.dp))
                Text(
                    text = interfaceText(
                        "后端检测到当前账号已有一条活动 Session，可能由另一台设备创建。此设备不会接管、结束、丢弃或覆盖它。",
                        "The backend found an active Session for this account, possibly created on another device. This device will not take over, end, discard, or overwrite it."
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(Modifier.height(16.dp))
                SessionConflictFact(interfaceText("开始时间", "Started"), startedAt)
                SessionConflictFact(interfaceText("当前状态", "Status"), status)
                SessionConflictFact(
                    interfaceText("来源设备", "Source device"),
                    interfaceText("后端未提供安全设备信息", "Not safely provided by the backend")
                )
                SessionConflictFact(
                    interfaceText("诊断编号", "Diagnostic ID"),
                    existing.requestId
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    text = interfaceText(
                        "请回到原设备继续或主动结束运动；也可以稍后刷新状态。若暂时不处理，可先返回首页。",
                        "Continue or explicitly end the exercise on the original device, or refresh later. You can return home in the meantime."
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = onRefresh,
                    enabled = !isRefreshing,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (isRefreshing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp
                        )
                        Spacer(Modifier.width(8.dp))
                    }
                    Text(interfaceText("刷新 Session 状态", "Refresh Session status"))
                }
                Spacer(Modifier.height(8.dp))
                OutlinedButton(
                    onClick = onReturnHome,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(interfaceText("返回首页", "Return home"))
                }
            }
        }
    }
}

@Composable
private fun SessionConflictFact(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = label,
            modifier = Modifier.weight(0.36f),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
        Text(
            text = value,
            modifier = Modifier.weight(0.64f),
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun CheckInTabBar(
    selected: ExerciseCheckInTab,
    onSelected: (ExerciseCheckInTab) -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = colors.surfaceVariant.copy(alpha = 0.72f),
        shape = MaterialTheme.shapes.small
    ) {
        Row(modifier = Modifier.padding(3.dp)) {
            ExerciseCheckInTab.entries.forEach { tab ->
                val isSelected = selected == tab
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 40.dp)
                        .bnbuClickable(onClick = { onSelected(tab) }),
                    color = if (isSelected) colors.surface else Color.Transparent,
                    shape = MaterialTheme.shapes.small,
                    shadowElevation = 0.dp
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = tab.label(),
                            color = if (isSelected) colors.onSurface else colors.onSurfaceVariant,
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ExercisePreparationContent(
    appState: StudentAppState,
    controller: ExerciseSessionController
) {
    // Do not present an enrollment failure as a generic check-in warning. This is the
    // B1 course-joining entry point instead.
    if (!appState.hasActiveEnrollment) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { SectionTitle(eyebrow = "COURSE JOIN", title = interfaceText("加入体育课程", "Join a sports course")) }
            item {
                CourseJoinEntryPanel(
                    onScanJoin = {},
                    onEnterCode = {}
                )
            }
        }
        return
    }

    var creditTypeName by rememberSaveable { mutableStateOf(CreditType.General.name) }
    var generalSportType by rememberSaveable { mutableStateOf("running") }
    var generalCustomSportName by rememberSaveable { mutableStateOf("") }
    val selectedCreditType = CreditType.entries.firstOrNull { it.name == creditTypeName }
        ?: CreditType.General
    val currentCourse = appState.workspace.courses.firstOrNull {
        it.isCurrent && it.hasActiveMembership && it.isOpenForCheckIn
    }
    val selectedCourseSport = currentCourse?.let { courseSportSelection(it.name) }
    val sportType = if (selectedCreditType == CreditType.CourseRelated) {
        selectedCourseSport?.sportType.orEmpty()
    } else {
        generalSportType
    }
    val customSportName = if (selectedCreditType == CreditType.CourseRelated) {
        selectedCourseSport?.customSportName.orEmpty()
    } else {
        generalCustomSportName
    }
    val displayedSportOptions = if (selectedCreditType == CreditType.CourseRelated) {
        selectedCourseSport?.let { courseSport ->
            listOf(
                ExerciseSportOptions.firstOrNull { it.value == courseSport.sportType }
                    ?.copy(label = courseSport.displayName, englishLabel = courseSport.displayName)
                    ?: ExerciseSportOption(
                        value = ExerciseSessionDetails.OtherSportType,
                        label = courseSport.displayName,
                        iconResource = R.drawable.ic_sports_other
                    )
            )
        }.orEmpty()
    } else {
        ExerciseSportOptions
    }
    val details = ExerciseSessionDetails(
        creditType = selectedCreditType,
        sportType = sportType,
        customSportName = customSportName.trim().takeIf {
            sportType == ExerciseSessionDetails.OtherSportType
        }
    )
    var currentShanghaiTime by remember { mutableStateOf(ZonedDateTime.now(BeijingCheckInZoneId)) }
    val today = currentShanghaiTime.toLocalDate()
    // A device-local date is only a demo observation. The V1 Backend derives
    // businessDate from the organization timezone and authoritatively rejects
    // a second daily submission.
    val hasSubmittedToday = !appState.isV1ContractBacked && appState.hasSubmittedCheckInToday(today)
    val timeWindow = appState.checkInTimeWindow
    val readiness = evaluateCheckInReadiness(appState, currentShanghaiTime)
    val startBlockedReason = readiness.blockedReason
    LaunchedEffect(Unit) {
        while (true) {
            currentShanghaiTime = ZonedDateTime.now(BeijingCheckInZoneId)
            delay(60_000L)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 104.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            item {
                ExerciseReadinessHeader(
                    timeWindow = timeWindow,
                    currentCourseName = currentCourse?.name,
                    teacherName = currentCourse?.teacher,
                    blockedReason = startBlockedReason,
                    hasSubmittedToday = hasSubmittedToday
                )
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    CheckInSectionHeader(
                        title = interfaceText("本次运动", "This exercise"),
                        supportingText = interfaceText("选择打卡类别与运动项目", "Choose a check-in category and exercise type")
                    )
                    ExerciseSetupCard(
                        selectedCreditType = selectedCreditType,
                        onCreditTypeSelected = { creditTypeName = it.name },
                        sportOptions = displayedSportOptions,
                        currentCourseName = currentCourse?.name,
                        sportType = sportType,
                        onSportTypeSelected = { option ->
                            if (selectedCreditType == CreditType.General) {
                                generalSportType = option.value
                                if (option.value != ExerciseSessionDetails.OtherSportType) {
                                    generalCustomSportName = ""
                                }
                            }
                        },
                        customSportName = customSportName,
                        onCustomSportNameChanged = {
                            if (selectedCreditType == CreditType.General) {
                                generalCustomSportName = it.take(MaxOtherSportNameLength)
                            }
                        }
                    )
                }
            }
            item { ExerciseCaptureNotice() }
        }

        StartExerciseBar(
            enabled = details.isValid && startBlockedReason == null,
            blockedReason = startBlockedReason,
            onClick = {
                currentShanghaiTime = ZonedDateTime.now(BeijingCheckInZoneId)
                if (evaluateCheckInReadiness(appState, currentShanghaiTime).canStart) {
                    controller.start(details)
                }
            },
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

@Composable
private fun ExerciseReadinessHeader(
    timeWindow: CheckInTimeWindow,
    currentCourseName: String?,
    teacherName: String?,
    blockedReason: String?,
    hasSubmittedToday: Boolean
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = colors.surface,
        shape = MaterialTheme.shapes.large
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (blockedReason == null) interfaceText("准备开始", "Ready to start") else interfaceText("暂时无法开始", "Unable to start"),
                        color = colors.onSurface,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(Modifier.height(5.dp))
                    Text(
                        text = if (blockedReason == null) {
                            interfaceText("选择运动项目，开始记录有效时长", "Choose an exercise to start recording active time.")
                        } else {
                            blockedReason
                        },
                        color = colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                StatusPill(
                    label = if (blockedReason == null) interfaceText("可打卡", "Available") else interfaceText("不可打卡", "Unavailable"),
                    color = if (blockedReason == null) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.secondary
                )
            }

            Spacer(Modifier.height(18.dp))
            HorizontalDivider(color = colors.outlineVariant.copy(alpha = 0.55f))
            Spacer(Modifier.height(14.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Filled.Timer,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = interfaceText("每日 ${timeWindow.dailyStartTime}–${timeWindow.dailyEndTime}", "Daily ${timeWindow.dailyStartTime}–${timeWindow.dailyEndTime}"),
                        color = colors.onSurface,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    if (!timeWindow.dateRangeStart.isNullOrBlank() ||
                        !timeWindow.dateRangeEnd.isNullOrBlank()
                    ) {
                        Text(
                            text = interfaceText("${timeWindow.dateRangeStart.orEmpty()} 至 ${timeWindow.dateRangeEnd.orEmpty()}", "${timeWindow.dateRangeStart.orEmpty()} to ${timeWindow.dateRangeEnd.orEmpty()}"),
                            color = colors.onSurfaceVariant,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }

            if (currentCourseName != null) {
                Spacer(Modifier.height(14.dp))
                Row(verticalAlignment = Alignment.Top) {
                    Box(
                        modifier = Modifier
                            .size(20.dp)
                            .background(
                                MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                                MaterialTheme.shapes.extraSmall
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(MaterialTheme.colorScheme.primary, MaterialTheme.shapes.extraSmall)
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = currentCourseName,
                            color = colors.onSurface,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                        teacherName?.takeIf { it.isNotBlank() }?.let {
                            Text(
                                text = interfaceText("任课教师 $it", "Instructor: $it"),
                                color = colors.onSurfaceVariant,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
            }

            if (timeWindow.excludedDates.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                Text(
                    text = interfaceText("排除日期：${formatExcludedDates(timeWindow.excludedDates)}", "Excluded dates: ${formatExcludedDates(timeWindow.excludedDates)}"),
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            if (hasSubmittedToday) {
                Spacer(Modifier.height(12.dp))
                Text(
                    text = interfaceText(
                        "今日已有记录进入审核；你仍可继续真实运动，本次可能不计入考核进度。",
                        "A record is already under review today. You may keep exercising; this session may not be credited."
                    ),
                    color = MaterialTheme.colorScheme.secondary,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun StatusPill(label: String, color: Color) {
    Surface(
        color = color.copy(alpha = 0.12f),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .background(color, MaterialTheme.shapes.extraLarge)
            )
            Spacer(Modifier.width(6.dp))
            Text(
                text = label,
                color = color,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun CheckInSectionHeader(title: String, supportingText: String) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = title,
            color = MaterialTheme.colorScheme.onBackground,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = supportingText,
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
private fun ExerciseSetupCard(
    selectedCreditType: CreditType,
    onCreditTypeSelected: (CreditType) -> Unit,
    sportOptions: List<ExerciseSportOption>,
    currentCourseName: String?,
    sportType: String,
    onSportTypeSelected: (ExerciseSportOption) -> Unit,
    customSportName: String,
    onCustomSportNameChanged: (String) -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = colors.surface,
        shape = MaterialTheme.shapes.large
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = interfaceText("打卡类别", "Check-in category"),
                color = colors.onSurface,
                style = MaterialTheme.typography.titleSmall
            )
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier.selectableGroup(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CategoryButton(
                    label = interfaceText("课程相关", "Course-related"),
                    selected = selectedCreditType == CreditType.CourseRelated,
                    modifier = Modifier.weight(1f),
                    onClick = { onCreditTypeSelected(CreditType.CourseRelated) }
                )
                CategoryButton(
                    label = interfaceText("其他运动", "Other exercise"),
                    selected = selectedCreditType == CreditType.General,
                    modifier = Modifier.weight(1f),
                    onClick = { onCreditTypeSelected(CreditType.General) }
                )
            }

            Spacer(Modifier.height(18.dp))
            HorizontalDivider(color = colors.outlineVariant.copy(alpha = 0.55f))
            Spacer(Modifier.height(16.dp))

            Text(
                text = if (selectedCreditType == CreditType.CourseRelated) {
                    interfaceText("课程运动", "Course exercise")
                } else {
                    interfaceText("运动项目", "Exercise type")
                },
                color = colors.onSurface,
                style = MaterialTheme.typography.titleSmall
            )
            Spacer(Modifier.height(10.dp))
            val optionRows = sportOptions.chunked(ExerciseSportGridColumnCount)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                optionRows.forEach { rowOptions ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        rowOptions.forEach { option ->
                            SportOptionButton(
                                option = option,
                                selected = sportType == option.value,
                                modifier = Modifier.weight(1f),
                                onClick = { onSportTypeSelected(option) }
                            )
                        }
                    }
                }
            }

            if (selectedCreditType == CreditType.CourseRelated && currentCourseName != null) {
                Spacer(Modifier.height(10.dp))
                Text(
                    text = interfaceText("已根据当前课程“$currentCourseName”自动选择", "Automatically selected for the current course “$currentCourseName”."),
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            if (
                selectedCreditType == CreditType.General &&
                sportType == ExerciseSessionDetails.OtherSportType
            ) {
                Spacer(Modifier.height(12.dp))
                BNBUFormField(
                    value = customSportName,
                    onValueChange = onCustomSportNameChanged,
                    label = interfaceText("具体运动名称", "Exercise name"),
                    testTag = "checkIn.customSportName",
                    required = true,
                    placeholder = interfaceText("例如：瑜伽", "For example: yoga"),
                    supportingText = interfaceText("请填写具体运动项目。", "Enter the specific exercise."),
                    counter = customSportName.length to 32
                )
            }
        }
    }
}

@Composable
private fun SportOptionButton(
    option: ExerciseSportOption,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    val containerColor = if (selected) colors.primary.copy(alpha = 0.10f) else colors.surfaceVariant.copy(alpha = 0.6f)
    val contentColor = if (selected) colors.primary else colors.onSurfaceVariant
    Surface(
        modifier = modifier
            .heightIn(min = 88.dp)
            .testTag("checkIn.sport.${option.value}")
            .semantics { this.selected = selected }
            .bnbuClickable(
                onClickLabel = interfaceText("选择${option.label}", "Select ${option.englishLabel}"),
                role = Role.RadioButton,
                onClick = onClick
            ),
        color = containerColor,
        shape = MaterialTheme.shapes.medium
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 9.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .background(
                        color = if (selected) colors.primary.copy(alpha = 0.14f) else colors.surface,
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    painter = painterResource(option.iconResource),
                    contentDescription = null,
                    tint = contentColor,
                    modifier = Modifier.size(25.dp)
                )
            }
            Spacer(Modifier.height(5.dp))
            Text(
                text = interfaceText(option.label, option.englishLabel),
                color = contentColor,
                style = MaterialTheme.typography.labelMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun ExerciseCaptureNotice() {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 2.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            imageVector = Icons.Filled.CameraAlt,
            contentDescription = null,
            tint = colors.onSurfaceVariant,
            modifier = Modifier.size(18.dp)
        )
        Spacer(Modifier.width(10.dp))
        Text(
            text = interfaceText(
                "运动中可随时现场拍照或录像。凭证仅保存在本机，结束运动并确认后才会提交。提交后仍需审核，达到计入上限或目标也不影响继续记录真实运动。",
                "You can take photos or videos while exercising. Evidence stays on this device until you finish and submit. Submission still requires review, and a credit limit or completed goal does not stop you recording real exercise."
            ),
            color = colors.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
private fun StartExerciseBar(
    enabled: Boolean,
    blockedReason: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = colors.background.copy(alpha = 0.98f)
    ) {
        Column {
            HorizontalDivider(color = colors.outlineVariant.copy(alpha = 0.45f))
            blockedReason?.let {
                Text(
                    text = it,
                    modifier = Modifier.padding(top = 8.dp),
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center
                )
            }
            Button(
                onClick = onClick,
                enabled = enabled,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = if (blockedReason == null) 12.dp else 8.dp)
                    .heightIn(min = 54.dp)
                    .testTag("checkIn.startExercise"),
                shape = MaterialTheme.shapes.extraLarge,
                colors = ButtonDefaults.buttonColors(
                    containerColor = colors.primary,
                    contentColor = colors.onPrimary,
                    disabledContainerColor = colors.surfaceVariant,
                    disabledContentColor = colors.onSurfaceVariant
                )
            ) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text(
                    text = if (enabled) interfaceText("开始运动", "Start exercise") else interfaceText("当前不可开始", "Cannot start now"),
                    style = MaterialTheme.typography.titleSmall
                )
            }
        }
    }
}

private fun formatExcludedDates(excludedDates: List<String>): String {
    val uniqueDates = excludedDates.distinct()
    val displayedDates = uniqueDates.take(3)
    return displayedDates.joinToString(
        if (AppLanguagePreferences.currentLanguage.languageTag == "en") ", " else "、"
    ) +
        if (uniqueDates.size > displayedDates.size) interfaceText(" 等", " etc.") else ""
}

/** Returns a user-facing reason when an exercise session may not be started. */
internal fun CheckInTimeWindow.canStartExercise(
    now: ZonedDateTime = ZonedDateTime.now(BeijingCheckInZoneId)
): String? {
    if (windowMode == "unavailable") {
        return interfaceText("打卡规则尚未从服务器加载，请刷新后重试", "Check-in rules have not loaded from the server. Refresh and try again.")
    }
    val today = now.toLocalDate()
    val currentTime = now.toLocalTime()
    val hasDailyStart = dailyStartTime.isNotBlank()
    val hasDailyEnd = dailyEndTime.isNotBlank()
    if (hasDailyStart != hasDailyEnd) {
        return interfaceText("打卡时间配置无效，请联系管理员", "The check-in time configuration is invalid. Contact an administrator.")
    }
    if (hasDailyStart) {
        val configuredDailyStart = runCatching { LocalTime.parse(dailyStartTime) }.getOrNull()
            ?: return interfaceText("打卡时间配置无效，请联系管理员", "The check-in time configuration is invalid. Contact an administrator.")
        val configuredDailyEnd = runCatching { LocalTime.parse(dailyEndTime) }.getOrNull()
            ?: return interfaceText("打卡时间配置无效，请联系管理员", "The check-in time configuration is invalid. Contact an administrator.")
        val dailyStart = configuredDailyStart
        val dailyEnd = configuredDailyEnd
        if (dailyStart >= dailyEnd) {
            return interfaceText("打卡时间配置无效，请联系管理员", "The check-in time configuration is invalid. Contact an administrator.")
        }
        val isWithinDailyWindow = currentTime >= dailyStart && currentTime <= dailyEnd
        if (!isWithinDailyWindow) {
            return interfaceText("当前不在可运动时段（$dailyStart - $dailyEnd，北京时间）", "Exercise is unavailable now ($dailyStart - $dailyEnd, Beijing time).")
        }
    }
    if (today.toString() in excludedDates) {
        return interfaceText("今日为特殊排除日，不可开始运动", "Today is an excluded date; exercise cannot be started.")
    }

    val rangeStart = dateRangeStart?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
    val rangeEnd = dateRangeEnd?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
    if ((dateRangeStart != null && rangeStart == null) ||
        (dateRangeEnd != null && rangeEnd == null)
    ) {
            return interfaceText("打卡日期范围配置无效，请联系管理员", "The check-in date range is invalid. Contact an administrator.")
        }
    if ((rangeStart != null && today < rangeStart) ||
        (rangeEnd != null && today > rangeEnd)
    ) {
            return interfaceText("当前不在开放日期（${dateRangeStart.orEmpty()} 至 ${dateRangeEnd.orEmpty()}）", "Check-in is unavailable outside ${dateRangeStart.orEmpty()} to ${dateRangeEnd.orEmpty()}.")
    }

    val deadline = semesterDeadline?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
    if (semesterDeadline != null && deadline == null) {
        return interfaceText("学期截止日期配置无效，请联系管理员", "The semester deadline configuration is invalid. Contact an administrator.")
    }
    if (deadline != null && today > deadline) {
        return interfaceText("已超过本学期打卡截止日期（$semesterDeadline）", "The semester check-in deadline ($semesterDeadline) has passed.")
    }
    return null
}

@Composable
private fun CategoryButton(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        modifier = modifier
            .heightIn(min = 52.dp)
            .selectable(selected = selected, role = Role.RadioButton, onClick = onClick),
        color = if (selected) colors.primary.copy(alpha = 0.10f) else colors.surfaceVariant.copy(alpha = 0.6f),
        shape = MaterialTheme.shapes.small
    ) {
        Box(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = label,
                color = if (selected) colors.primary else colors.onSurfaceVariant,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun ExerciseRunningContent(
    controller: ExerciseSessionController,
    state: ExerciseSessionState,
    paused: Boolean
) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var showFinishConfirm by remember { mutableStateOf(false) }
    val duration = state.effectiveDurationMillis(now)
    val limitReached = duration >= MaximumExerciseMillis
    val details = state.detailsOrNull() ?: return
    val draftCount = controller.drafts.size
    LaunchedEffect(state) {
        while (state is ExerciseSessionState.Active) {
            now = System.currentTimeMillis()
            controller.autoFinishIfNeeded()
            delay(1_000L)
        }
    }

    if (showFinishConfirm || limitReached) {
        AlertDialog(
            onDismissRequest = {
                if (!limitReached) showFinishConfirm = false
            },
            confirmButton = {
                TextButton(onClick = {
                    showFinishConfirm = false
                    controller.requestFinish()
                }) {
                    Text(
                        if (limitReached) {
                            interfaceText("去核对说明和凭证", "Review description and proof")
                        } else {
                            interfaceText("确认结束", "End exercise")
                        }
                    )
                }
            },
            dismissButton = if (limitReached) {
                null
            } else {
                {
                    TextButton(onClick = { showFinishConfirm = false }) {
                        Text(interfaceText("取消", "Cancel"))
                    }
                }
            },
            title = {
                Text(
                    if (limitReached) {
                        interfaceText("本次计时已停止", "This session timer has stopped")
                    } else {
                        interfaceText("你确定要结束本次运动吗？", "End this exercise session?")
                    }
                )
            },
            text = if (limitReached) {
                {
                    Text(
                        interfaceText(
                            "请进入下一步核对实际运动时长、运动说明和现场证据。是否可计及最终计入分钟由服务器规则与审核结果确认。",
                            "Continue to review the active duration, notes, and on-site evidence. Eligible and credited minutes are confirmed by server rules and review."
                        )
                    )
                }
            } else {
                {
                    Text(
                        interfaceText(
                            "结束后不能恢复为进行中。实际运动事实会保留；是否达到课程设置的 30/45/60 分钟门槛以及最终计入多少分钟，均以服务器确认结果为准。",
                            "After ending, this session cannot return to active. The actual exercise fact remains; the server confirms whether the 30/45/60-minute course threshold is met and how many minutes are credited."
                        )
                    )
                }
            }
        )
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = sportLabel(details),
                        color = MaterialTheme.colorScheme.onBackground,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = details.creditType.displayLabel(),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                StatusPill(
                    label = if (paused) interfaceText("已暂停", "Paused") else interfaceText("记录中", "Recording"),
                    color = if (paused) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.tertiary
                )
            }

            Spacer(Modifier.height(18.dp))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surface,
                shape = MaterialTheme.shapes.large
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Filled.Timer,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        text = formatDuration(duration),
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 52.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = (-1).sp
                    )
                    Text(
                        text = if (paused) interfaceText("计时已暂停", "Timer paused") else interfaceText("有效运动时长", "Active exercise time"),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyMedium
                    )

                    Spacer(Modifier.height(24.dp))
                    HorizontalDivider(
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f)
                    )
                    Spacer(Modifier.height(18.dp))
                    Row(modifier = Modifier.fillMaxWidth()) {
                        SessionMetric(
                            label = interfaceText("开始", "Started"),
                            value = formatStartTime(state),
                            modifier = Modifier.weight(1f)
                        )
                        SessionMetric(
                            label = interfaceText("完整分钟", "Whole minutes"),
                            value = wholeActiveMinutes(duration).toString(),
                            modifier = Modifier.weight(1f)
                        )
                        SessionMetric(
                            label = interfaceText("现场凭证", "On-site proof"),
                            value = "$draftCount",
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            Spacer(Modifier.height(14.dp))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                shape = MaterialTheme.shapes.large
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = interfaceText("分钟计入规则", "Minute credit rules"),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = interfaceText(
                            "课程门槛由教师在开课前设为 30、45 或 60 分钟；达到门槛后按完整实际分钟计算，单次最多计入 60 分钟。",
                            "The teacher sets a 30, 45, or 60-minute threshold before the course opens. Once met, whole active minutes are eligible, capped at 60 minutes per record."
                        ),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        text = interfaceText(
                            "日、周与目标上限只限制考核计入，不限制继续记录真实运动。",
                            "Daily, weekly, and target limits affect credit only; they do not stop you recording real exercise."
                        ),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            Spacer(Modifier.height(14.dp))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surface,
                shape = MaterialTheme.shapes.large
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Column {
                        Text(
                            text = interfaceText("现场凭证", "On-site proof"),
                            color = MaterialTheme.colorScheme.onSurface,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = if (details.sportType == "swimming") {
                                interfaceText(
                                    "游泳需要运动前、运动后照片各 1 张。请先在安全、允许拍摄的区域保留运动前照片；当前草稿仅保存在本机。",
                                    "Swimming needs one before and one after photo. Capture the before photo first in a safe area where photography is allowed; the current draft stays on this device."
                                )
                            } else {
                                interfaceText(
                                    "仅保存在本机，结束后再确认提交",
                                    "Saved only on this device until you confirm submission after ending."
                                )
                            },
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    Spacer(Modifier.height(14.dp))
                    MediaCaptureActions(
                        controller = controller,
                        allowVideo = true,
                        lightContent = false
                    )
                    Spacer(Modifier.height(14.dp))
                    SessionMediaManager(
                        controller = controller,
                        submissionRequired = false
                    )
                }
            }

            Spacer(Modifier.height(20.dp))
            if (paused) {
                Button(
                    onClick = controller::resume,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 54.dp),
                    shape = MaterialTheme.shapes.extraLarge,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Icon(Icons.Filled.PlayArrow, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(interfaceText("继续运动", "Continue exercise"))
                }
            } else {
                Button(
                    onClick = controller::pause,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 54.dp),
                    shape = MaterialTheme.shapes.extraLarge,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Icon(Icons.Filled.Pause, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text(interfaceText("暂停运动", "Pause exercise"))
                }
            }
            Spacer(Modifier.height(10.dp))
            OutlinedButton(
                onClick = { showFinishConfirm = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 50.dp),
                shape = MaterialTheme.shapes.extraLarge,
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface),
                border = BorderStroke(
                    1.dp,
                    MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f)
                )
            ) {
                Icon(Icons.Filled.Stop, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text(interfaceText("结束运动", "End exercise"))
            }

        }
    }
}

@Composable
private fun SessionMetric(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            value,
            color = MaterialTheme.colorScheme.onSurface,
            fontSize = 19.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(4.dp))
        Text(
            label,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
private fun ExerciseFinishedContent(
    appState: StudentAppState,
    controller: ExerciseSessionController,
    state: ExerciseSessionState.Finished
) {
    var localMessage by remember { mutableStateOf<String?>(null) }
    var submissionError by remember { mutableStateOf<UserFacingError?>(null) }
    var showAbandonConfirm by remember { mutableStateOf(false) }
    var descriptionValidationRequested by remember { mutableStateOf(false) }
    var descriptionFocusedOnce by remember { mutableStateOf(false) }
    var descriptionTouched by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var uploadProgress by remember { mutableStateOf<UploadProgress?>(null) }
    var showSwimmingDelayExplanation by rememberSaveable { mutableStateOf(false) }
    var swimmingDelayExplanation by rememberSaveable { mutableStateOf("") }
    val descriptionFocusRequester = remember { FocusRequester() }
    val capturedImageCount = controller.drafts.count { it.type == ProofMediaType.Image }
    val capturedVideoCount = controller.drafts.count { it.type == ProofMediaType.Video }
    val capturedTotalBytes = controller.drafts.sumOf { it.byteCount }
    val hasLockedMedia = controller.drafts.any { it.serverMediaId != null }
    val isSwimming = state.details.sportType == "swimming"
    localMessage?.let { text ->
        AlertDialog(
            onDismissRequest = { localMessage = null },
            confirmButton = { TextButton(onClick = { localMessage = null }) { Text(interfaceText("确定", "OK")) } },
            title = { Text(interfaceText("凭证检查", "Proof check")) },
            text = { Text(text) }
        )
    }
    if (showAbandonConfirm) {
        AlertDialog(
            onDismissRequest = { showAbandonConfirm = false },
            confirmButton = {
                TextButton(onClick = {
                    showAbandonConfirm = false
                    controller.abandon()
                }) { Text(interfaceText("确认放弃", "Discard")) }
            },
            dismissButton = {
                TextButton(onClick = { showAbandonConfirm = false }) { Text(interfaceText("取消", "Cancel")) }
            },
            title = { Text(interfaceText("放弃待提交记录？", "Discard pending record?")) },
            text = { Text(interfaceText("本次运动时长和所有本地媒体草稿都会被删除。", "The exercise duration and all local media drafts will be deleted.")) }
        )
    }

    if (showSwimmingDelayExplanation) {
        SwimmingDelayExplanationScreen(
            explanation = swimmingDelayExplanation,
            onExplanationChanged = { swimmingDelayExplanation = it },
            canSubmit = false,
            isSubmitting = false,
            unavailableReason = interfaceText(
                "当前 Android 基线没有延迟说明接口，也无法核验完全离线资格和服务器截止时间；此页仅保存本地 UI 草稿，不会形成正式提交。",
                "The current Android baseline has no delay-explanation endpoint and cannot verify fully-offline eligibility or the server deadline. This page keeps a local UI draft only and does not create a formal submission."
            ),
            onBack = { showSwimmingDelayExplanation = false },
            onSubmit = {}
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            CheckInStageHeader(
                title = interfaceText("完成记录", "Complete record"),
                supportingText = interfaceText(
                    "填写运动说明并提交全部现场凭证",
                    "Describe the exercise and submit all on-site proof"
                )
            )
        }
        submissionError?.let { error ->
            item {
                BNBUErrorPanel(
                    error = error,
                    onDismiss = { submissionError = null }
                )
            }
        }
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surface,
                shape = MaterialTheme.shapes.large
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                Text(
                    formatDuration(state.activeDurationMillis),
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    interfaceText(
                        "实际 ACTIVE 时长 · ${wholeActiveMinutes(state.activeDurationMillis)} 个完整分钟",
                        "Actual ACTIVE duration · ${wholeActiveMinutes(state.activeDurationMillis)} whole minutes"
                    )
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "${state.details.creditType.displayLabel()} · ${sportLabel(state.details)}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = interfaceText(
                        "可计分钟和实际计入分钟须等待服务器规则与审核结果，当前不在本机估算。",
                        "Eligible and credited minutes wait for server rules and review and are not estimated on this device."
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
                }
            }
        }
        item {
            val descriptionError =
                (descriptionTouched || descriptionValidationRequested) &&
                    state.details.description.isBlank()
            SwissPanel {
                BNBUFormField(
                    value = state.details.description,
                    onValueChange = {
                        controller.updateDescription(it.take(MaxExerciseDescriptionLength))
                    },
                    label = interfaceText("运动说明", "Exercise description"),
                    testTag = "checkIn.exerciseDescription",
                    placeholder = interfaceText(
                        "例如：完成 5 公里跑步和拉伸",
                        "For example: completed a 5 km run and stretching"
                    ),
                    supportingText = interfaceText(
                        "请简要说明本次完成的运动内容 · 1～$MaxExerciseDescriptionLength 字",
                        "Briefly describe this exercise · 1–$MaxExerciseDescriptionLength characters"
                    ),
                    errorText = if (descriptionError) {
                        interfaceText("请填写运动说明", "Exercise description is required")
                    } else {
                        null
                    },
                    required = true,
                    enabled = !isSubmitting,
                    loading = isSubmitting,
                    singleLine = false,
                    minLines = 4,
                    maxLines = 6,
                    counter = state.details.description.length to MaxExerciseDescriptionLength,
                    inputModifier = Modifier.focusRequester(descriptionFocusRequester),
                    onFocusChanged = { focused ->
                        if (focused) {
                            descriptionFocusedOnce = true
                        } else if (descriptionFocusedOnce) {
                            descriptionTouched = true
                        }
                    }
                )
            }
        }
        item {
            ExerciseEvidenceScreen(
                isSwimming = isSwimming,
                photoCount = capturedImageCount,
                videoCount = capturedVideoCount,
                totalBytes = capturedTotalBytes,
                hasLockedMedia = hasLockedMedia,
                captureActions = {
                    MediaCaptureActions(
                        controller = controller,
                        allowVideo = true,
                        lightContent = false
                    )
                },
                mediaManager = {
                    SessionMediaManager(
                        controller = controller,
                        submissionRequired = true
                    )
                },
                onOpenSwimmingDelayExplanation = if (isSwimming) {
                    { showSwimmingDelayExplanation = true }
                } else {
                    null
                }
            )
        }
        item {
            CheckInSectionHeader(
                title = interfaceText("提交确认", "Confirm submission"),
                supportingText = interfaceText("请核对以下信息", "Review the following information")
            )
        }
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surface,
                shape = MaterialTheme.shapes.large
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SummaryRow(interfaceText("打卡类别", "Check-in category"), state.details.creditType.displayLabel())
                    SummaryRow(interfaceText("运动项目", "Exercise type"), sportLabel(state.details))
                    SummaryRow(interfaceText("开始时间", "Start time"), formatDateTime(state.startedAtEpochMillis))
                    SummaryRow(interfaceText("结束时间", "End time"), formatDateTime(state.endedAtEpochMillis))
                    SummaryRow(interfaceText("实际运动时长", "Active duration"), formatDuration(state.activeDurationMillis))
                    SummaryRow(
                        interfaceText("可计分钟", "Eligible minutes"),
                        interfaceText("待服务器确认", "Pending server confirmation")
                    )
                    SummaryRow(
                        interfaceText("实际计入分钟", "Credited minutes"),
                        interfaceText("待审核与计入选择", "Pending review and allocation")
                    )
                    SummaryRow(interfaceText("本机显示开始日期", "Device display start date"), formatDate(state.startedAtEpochMillis))
                    SummaryRow(
                        interfaceText("服务器业务日期", "Server business date"),
                        interfaceText("提交后读取", "Read after submission")
                    )
                    SummaryRow(interfaceText("材料版本", "Evidence version"), interfaceText("首版", "Initial"))
                    SummaryRow(
                        interfaceText("凭证数量", "Proof count"),
                        interfaceText(
                            interfaceText("${capturedImageCount} 张照片", "${capturedImageCount} photos") +
                                if (capturedVideoCount > 0) interfaceText(" + ${capturedVideoCount} 个视频", " + ${capturedVideoCount} videos") else "",
                            "${capturedImageCount} photos" + if (capturedVideoCount > 0) " + ${capturedVideoCount} videos" else ""
                        )
                    )
                }
                }
            }
        }
        item {
            val blockedReason = when {
                isSwimming -> interfaceText(
                    "当前接口不能标记游泳前照/后照，也不能核验服务器 15 分钟首次受理期限，因此暂不开放正式提交。",
                    "The current interface cannot tag before/after swimming photos or verify the server's 15-minute initial-acceptance deadline, so formal submission is unavailable."
                )
                !appState.isWriteAllowed -> interfaceText(
                    "当前环境不允许写入；本地草稿会继续保留。",
                    "Writes are unavailable in the current environment. Local drafts remain saved."
                )
                else -> null
            }
            ExerciseSubmissionScreen(
                isSubmitting = isSubmitting,
                uploadProgress = uploadProgress,
                hasLockedMedia = hasLockedMedia,
                submitEnabled = blockedReason == null,
                blockedReason = blockedReason,
                summaryContent = {
                    SummaryRow(
                        interfaceText("材料", "Evidence"),
                        interfaceText(
                            "$capturedImageCount 张照片 + $capturedVideoCount 个视频",
                            "$capturedImageCount photos + $capturedVideoCount video"
                        )
                    )
                    SummaryRow(
                        interfaceText("受理后阶段", "Stage after acceptance"),
                        interfaceText("待系统检查或教师审核", "Pending system checks or teacher review")
                    )
                    if (isSwimming) {
                        SummaryRow(
                            interfaceText("首次受理期限", "Initial acceptance deadline"),
                            interfaceText(
                                "服务器结束后 ${ExerciseEvidenceUiPolicy.SwimmingInitialAcceptanceMinutes} 分钟内",
                                "Within ${ExerciseEvidenceUiPolicy.SwimmingInitialAcceptanceMinutes} minutes of server finish"
                            )
                        )
                        SummaryRow(
                            interfaceText("同批续传", "Same-batch resume"),
                            interfaceText(
                                "锁定后 ${ExerciseEvidenceUiPolicy.SwimmingLockedBatchResumeMinutes} 分钟内",
                                "Within ${ExerciseEvidenceUiPolicy.SwimmingLockedBatchResumeMinutes} minutes after lock"
                            )
                        )
                    }
                },
                onSubmit = {
                    if (!isSubmitting) {
                        descriptionValidationRequested = true
                        if (state.details.description.isBlank()) {
                            descriptionFocusRequester.requestFocus()
                        } else {
                            isSubmitting = true
                            uploadProgress = null
                            submissionError = null
                            controller.submitReadyProofs(
                                onProgress = { uploadProgress = it }
                            ) { result ->
                                isSubmitting = false
                                uploadProgress = null
                                result.fold(
                                    onSuccess = { proofCount ->
                                        controller.markSubmitted(
                                            SubmissionSummary(
                                                date = formatDate(state.startedAtEpochMillis),
                                                startTime = formatTime(state.startedAtEpochMillis),
                                                endTime = formatTime(state.endedAtEpochMillis),
                                                duration = formatDuration(state.activeDurationMillis),
                                                // The accepted response is not an authoritative credit result.
                                                creditedHours = 0,
                                                creditType = state.details.creditType.displayLabel(),
                                                sportType = sportLabel(state.details),
                                                proofCount = proofCount
                                            )
                                        )
                                        appState.refreshWorkspace()
                                    },
                                    onFailure = { error ->
                                        val mapped = ClientErrorMapper.map(
                                            error,
                                            ClientErrorContext.RECORD
                                        )
                                        submissionError = mapped
                                        SafeClientLogger.log(
                                            error = mapped,
                                            context = ClientErrorContext.RECORD,
                                            httpStatus = (error as? V1HttpException)?.statusCode
                                        )
                                    }
                                )
                            }
                        }
                    }
                },
                onDiscard = { showAbandonConfirm = true }
            )
        }
    }
}

internal fun exerciseProofSubmissionErrorMessage(error: Throwable): String {
    return ClientErrorMapper.map(error, ClientErrorContext.RECORD).legacySafeText()
}

@Composable
private fun CheckInStageHeader(title: String, supportingText: String) {
    Column {
        Text(
            text = title,
            color = MaterialTheme.colorScheme.onBackground,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = supportingText,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

private fun SessionCaptureTarget.toSavedState(): Bundle = Bundle().apply {
    putString("accountId", key.accountId)
    putString("sessionId", key.sessionId)
    putString("draftId", draftId)
    putString("mediaType", type.name)
    putString("file", file.absolutePath)
}

private fun Bundle.toCaptureTarget(): SessionCaptureTarget? = runCatching {
    SessionCaptureTarget(
        key = SessionDraftKey(
            accountId = requireNotNull(getString("accountId")),
            sessionId = requireNotNull(getString("sessionId"))
        ),
        draftId = requireNotNull(getString("draftId")),
        type = ProofMediaType.valueOf(requireNotNull(getString("mediaType"))),
        file = File(requireNotNull(getString("file")))
    )
}.getOrNull()

@Composable
private fun MediaCaptureActions(
    controller: ExerciseSessionController,
    allowVideo: Boolean,
    lightContent: Boolean
) {
    val context = LocalContext.current
    var pendingPhotoState by rememberSaveable { mutableStateOf<Bundle?>(null) }
    var pendingVideoState by rememberSaveable { mutableStateOf<Bundle?>(null) }
    val pendingPhoto = pendingPhotoState?.toCaptureTarget()
    val pendingVideo = pendingVideoState?.toCaptureTarget()
    var newPhotoAwaitingPermission by rememberSaveable { mutableStateOf(false) }
    var newVideoAwaitingPermission by rememberSaveable { mutableStateOf(false) }
    var launchError by remember { mutableStateOf<String?>(null) }
    var showVideoRecordingNotice by rememberSaveable { mutableStateOf(false) }
    var isVideoProcessing by remember { mutableStateOf(false) }
    lateinit var launchPhotoCapture: () -> Unit
    lateinit var launchVideoRecorder: () -> Unit

    val photoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        val target = pendingPhoto
        if (target == null) {
            launchError = interfaceText(
                "无法确认本次拍照，请重新拍摄。",
                "This photo capture could not be confirmed. Capture it again."
            )
        } else if (success && target.file.isFile && target.file.length() > 0L) {
            // The system camera has already let the student confirm the photo.
            // Save it directly as a local draft; it can still be previewed and
            // deleted before formal submission starts.
            pendingPhotoState = null
            controller.completeCapture(target, success = true)
        } else {
            pendingPhotoState = null
            controller.completeCapture(target, success = false)
        }
    }

    fun hasCameraPermission(): Boolean = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.CAMERA
    ) == PackageManager.PERMISSION_GRANTED

    fun hasVideoPermissions(): Boolean = listOf(
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO
    ).all { permission ->
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }

    val photoPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        val captureNewPhoto = newPhotoAwaitingPermission
        newPhotoAwaitingPermission = false
        if (!granted) {
            launchError = interfaceText(
                "现场拍照需要相机权限。麦克风权限不会影响拍照。",
                "On-site photos require camera permission. Microphone permission does not affect photos."
            )
        } else if (captureNewPhoto) {
            launchPhotoCapture()
        }
    }

    val videoPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        val captureNewVideo = newVideoAwaitingPermission
        newVideoAwaitingPermission = false
        if (!hasVideoPermissions()) {
            launchError = if (!hasCameraPermission()) {
                interfaceText(
                    "现场拍照和录像都需要相机权限。",
                    "On-site photos and videos require camera permission."
                )
            } else {
                interfaceText(
                    "录像还需要麦克风权限；现场拍照仍可正常使用。",
                    "Video recording also requires microphone permission. On-site photos remain available."
                )
            }
        } else if (captureNewVideo) {
            launchVideoRecorder()
        }
    }

    launchPhotoCapture = {
        controller.prepareCapture(ProofMediaType.Image) { result ->
            result.fold(
                onSuccess = { target ->
                    runCatching {
                        FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.fileprovider",
                            target.file
                        )
                    }.fold(
                        onSuccess = { uri: Uri ->
                            pendingPhotoState = target.toSavedState()
                            photoLauncher.launch(uri)
                        },
                        onFailure = {
                            controller.completeCapture(target, success = false)
                            launchError = interfaceText(
                                "无法打开系统相机",
                                "Unable to open the system camera."
                            )
                        }
                    )
                },
                onFailure = {
                    launchError = interfaceText(
                        "无法准备现场拍照，请稍后重试。",
                        "Unable to prepare on-site photo capture. Try again later."
                    )
                }
            )
        }
    }

    launchVideoRecorder = {
        controller.prepareCapture(ProofMediaType.Video) { result ->
            result.fold(
                onSuccess = { target ->
                    pendingVideoState = target.toSavedState()
                },
                onFailure = {
                    launchError = interfaceText(
                        "无法准备现场录像，请稍后重试。",
                        "Unable to prepare on-site video recording. Try again later."
                    )
                }
            )
        }
    }

    if (showVideoRecordingNotice) {
        SystemCameraVideoRecordingNotice(
            onContinue = {
                showVideoRecordingNotice = false
                if (hasVideoPermissions()) {
                    launchVideoRecorder()
                } else {
                    newVideoAwaitingPermission = true
                    videoPermissionLauncher.launch(
                        arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
                    )
                }
            },
            onDismiss = { showVideoRecordingNotice = false }
        )
    }

    if (isVideoProcessing) {
        AlertDialog(
            onDismissRequest = {},
            confirmButton = {},
            title = { Text(interfaceText("正在处理视频", "Processing video")) },
            text = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(28.dp), strokeWidth = 3.dp)
                    Text(
                        text = interfaceText(
                            "正在保存并压缩视频，请稍候…",
                            "Saving and compressing the video. Please wait…"
                        ),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        )
    }

    pendingVideo?.let { target ->
        ExerciseVideoRecorderDialog(
            outputFile = target.file,
            onCompleted = { duration ->
                // Stopping and accepting the in-app recording is the capture
                // confirmation boundary. Save the local draft immediately.
                pendingVideoState = null
                isVideoProcessing = true
                controller.completeVideoCapture(
                    target = target,
                    success = true,
                    recordedDurationSeconds = duration,
                    onFinished = { isVideoProcessing = false }
                )
            },
            onCancelled = {
                pendingVideoState = null
                controller.completeVideoCapture(
                    target,
                    success = false,
                    recordedDurationSeconds = 0.0
                )
            },
            onError = {
                pendingVideoState = null
                controller.completeVideoCapture(
                    target,
                    success = false,
                    recordedDurationSeconds = 0.0
                )
                launchError = interfaceText("录像失败，请重试。", "Video recording failed. Try again.")
            }
        )
    }

    launchError?.let { ValidationPanel(message = it) }
    val isCaptureInProgress = pendingPhoto != null ||
        pendingVideo != null ||
        showVideoRecordingNotice ||
        isVideoProcessing
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        CaptureButton(
            label = interfaceText("现场拍照", "Take photo"),
            icon = { Icon(Icons.Filled.CameraAlt, contentDescription = null) },
            enabled = !controller.isMediaBusy &&
                !isCaptureInProgress &&
                controller.drafts.count { it.type == ProofMediaType.Image } <
                    ProofUploadRule.maxImageCount,
            lightContent = lightContent,
            modifier = Modifier.weight(1f),
            onClick = {
                if (hasCameraPermission()) {
                    launchPhotoCapture()
                } else {
                    newPhotoAwaitingPermission = true
                    photoPermissionLauncher.launch(Manifest.permission.CAMERA)
                }
            }
        )
        if (allowVideo) {
            CaptureButton(
                label = interfaceText("现场录像", "Record video"),
                icon = { Icon(Icons.Filled.Videocam, contentDescription = null) },
                enabled = !controller.isMediaBusy &&
                    !isCaptureInProgress &&
                    controller.drafts.none { it.type == ProofMediaType.Video },
                lightContent = lightContent,
                modifier = Modifier.weight(1f),
                onClick = { showVideoRecordingNotice = true }
            )
        }
    }

    val photoLimitReached =
        controller.drafts.count { it.type == ProofMediaType.Image } >= ProofUploadRule.maxImageCount
    val videoLimitReached =
        controller.drafts.count { it.type == ProofMediaType.Video } >= ProofUploadRule.maxVideoCount
    if (photoLimitReached || (allowVideo && videoLimitReached)) {
        Spacer(Modifier.height(8.dp))
        Text(
            text = when {
                photoLimitReached && allowVideo && videoLimitReached -> interfaceText(
                    "照片和视频均已达到本次 Session 的证据上限；可点击凭证预览并在提交前删除。",
                    "Photo and video evidence limits are reached; open an item to preview or delete it before submission."
                )
                photoLimitReached -> interfaceText(
                    "照片已达到 ${ProofUploadRule.maxImageCount} 张上限；可点击照片并在提交前删除。",
                    "The ${ProofUploadRule.maxImageCount}-photo limit is reached; open a photo to delete it before submission."
                )
                else -> interfaceText(
                    "视频已达到 ${ProofUploadRule.maxVideoCount} 个上限；可点击视频并在提交前删除。",
                    "The ${ProofUploadRule.maxVideoCount}-video limit is reached; open the video to delete it before submission."
                )
            },
            color = MaterialTheme.colorScheme.secondary,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
private fun CaptureButton(
    label: String,
    icon: @Composable () -> Unit,
    enabled: Boolean,
    lightContent: Boolean,
    modifier: Modifier,
    onClick: () -> Unit
) {
    val colors = MaterialTheme.colorScheme
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = 48.dp),
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(
            1.dp,
            if (lightContent) Color.White.copy(alpha = 0.35f)
            else colors.outlineVariant.copy(alpha = 0.7f)
        ),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = if (lightContent) Color.White else colors.primary,
            disabledContentColor = if (lightContent) {
                Color.White.copy(alpha = 0.4f)
            } else {
                colors.onSurfaceVariant.copy(alpha = 0.45f)
            }
        )
    ) {
        icon()
        Spacer(Modifier.width(6.dp))
        Text(label)
    }
}

private fun ExerciseSessionState.detailsOrNull(): ExerciseSessionDetails? {
    return when (this) {
        ExerciseSessionState.Idle -> null
        is ExerciseSessionState.Active -> details
        is ExerciseSessionState.Paused -> details
        is ExerciseSessionState.Finished -> details
        is ExerciseSessionState.Submitted -> null
    }
}

private fun formatDuration(durationMillis: Long): String {
    val totalSeconds = (durationMillis / 1_000L).coerceAtLeast(0L)
    val hours = totalSeconds / 3_600L
    val minutes = (totalSeconds % 3_600L) / 60L
    val seconds = totalSeconds % 60L
    return "%02d:%02d:%02d".format(hours, minutes, seconds)
}

private fun formatStartTime(state: ExerciseSessionState): String {
    val timestamp = when (state) {
        ExerciseSessionState.Idle -> return "--:--"
        is ExerciseSessionState.Active -> state.startedAtEpochMillis
        is ExerciseSessionState.Paused -> state.startedAtEpochMillis
        is ExerciseSessionState.Finished -> state.startedAtEpochMillis
        is ExerciseSessionState.Submitted -> return "--:--"
    }
    return DateFormat.getTimeInstance(
        DateFormat.SHORT,
        AppLanguagePreferences.currentLocale
    ).format(Date(timestamp))
}

private fun formatDateTime(timestamp: Long): String {
    return DateFormat.getDateTimeInstance(
        DateFormat.MEDIUM,
        DateFormat.SHORT,
        AppLanguagePreferences.currentLocale
    ).format(Date(timestamp))
}

private fun formatDate(timestamp: Long): String {
    return DateFormat.getDateInstance(
        DateFormat.MEDIUM,
        AppLanguagePreferences.currentLocale
    ).format(Date(timestamp))
}

private fun formatTime(timestamp: Long): String {
    return DateFormat.getTimeInstance(
        DateFormat.SHORT,
        AppLanguagePreferences.currentLocale
    ).format(Date(timestamp))
}

private fun SessionMediaDraft.toProofAttachment(file: java.io.File): ProofAttachment {
    return ProofAttachment(
        id = id,
        type = type,
        fileName = fileName,
        byteCount = file.length(),
        durationSeconds = durationSeconds,
        source = file.toURI().toString()
    )
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Text(
            label,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(Modifier.weight(1f))
        Text(
            value,
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

private fun sportLabel(details: ExerciseSessionDetails): String {
    return if (details.sportType == ExerciseSessionDetails.OtherSportType) {
        details.customSportName.orEmpty()
    } else {
        ExerciseSportOptions.firstOrNull { it.value == details.sportType }?.let {
            interfaceText(it.label, it.englishLabel)
        }
            ?: details.sportType
    }
}
