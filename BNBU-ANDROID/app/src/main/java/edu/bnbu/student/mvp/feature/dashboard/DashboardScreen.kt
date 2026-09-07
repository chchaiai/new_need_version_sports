package edu.bnbu.student.mvp.feature.dashboard

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddBox
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.TextFields
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import edu.bnbu.student.mvp.core.designsystem.AppleIconButton as IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import edu.bnbu.student.mvp.R
import edu.bnbu.student.mvp.core.designsystem.BNBULayout
import edu.bnbu.student.mvp.core.designsystem.BNBUMotion
import edu.bnbu.student.mvp.core.designsystem.PrimaryActionButton
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.designsystem.pressScale
import edu.bnbu.student.mvp.core.model.studentNumberForDisplay
import edu.bnbu.student.mvp.core.model.dashboardProgressStatusLabel
import edu.bnbu.student.mvp.core.state.StudentAppState
import edu.bnbu.student.mvp.feature.checkin.canStartExercise
import edu.bnbu.student.mvp.feature.checkin.session.ExerciseSessionController
import edu.bnbu.student.mvp.feature.checkin.session.ExerciseSessionState
import edu.bnbu.student.mvp.feature.checkin.session.effectiveDurationMillis
import edu.bnbu.student.mvp.feature.common.studentProgressUiModel
import edu.bnbu.student.mvp.feature.notifications.toStudentNoticeUiModels
import androidx.compose.runtime.mutableLongStateOf
import java.text.SimpleDateFormat
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.Date
import kotlinx.coroutines.delay

/**
 * The dashboard is deliberately organized around one question:
 * "What do I still need to do this semester?"
 *
 * Data and callbacks stay owned by [StudentAppState] and the root navigator.
 * This file only changes hierarchy and presentation.
 */
@Composable
internal fun DashboardScreen(
    appState: StudentAppState,
    exerciseSessionController: ExerciseSessionController,
    onOpenNotificationSheet: () -> Unit = {},
    onOpenCheckIn: () -> Unit = {},
    onScanJoin: () -> Unit = {},
    onEnterCode: () -> Unit = {}
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(top = 4.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(28.dp)
    ) {
        item { DashboardHeader(appState, onOpenNotificationSheet) }

        if (appState.hasActiveEnrollment) {
            item {
                TodayCheckInPanel(
                    appState = appState,
                    // Remote businessDate is Backend-owned; never hide the
                    // action from a device-local calendar guess.
                    hasSubmittedToday = !appState.isV1ContractBacked && appState.hasSubmittedCheckInToday(),
                    onOpenCheckIn = onOpenCheckIn
                )
            }
        }

        appState.newSemesterWelcomeAcademicYear?.let { academicYear ->
            item {
                NewSemesterWelcomePanel(
                    academicYear = academicYear,
                    onDismiss = appState::dismissNewSemesterWelcome
                )
            }
        }

        if (!appState.hasActiveEnrollment) {
            item {
                CourseJoinEntryPanel(
                    onScanJoin = onScanJoin,
                    onEnterCode = onEnterCode
                )
            }
        }

        val ongoingSession = exerciseSessionController.state.takeIf {
            it is ExerciseSessionState.Active || it is ExerciseSessionState.Paused
        }
        if (ongoingSession != null) {
            item {
                ExerciseResumePanel(
                    state = ongoingSession,
                    onResumeExercise = onOpenCheckIn
                )
            }
        }

        item { ProgressOverview(appState) }
        item { ProgressBreakdown(appState) }
    }
}

/** Keeps an interrupted real exercise visible above longer-term progress. */
@Composable
private fun ExerciseResumePanel(
    state: ExerciseSessionState,
    onResumeExercise: () -> Unit
) {
    val startedAtEpochMillis = when (state) {
        is ExerciseSessionState.Active -> state.startedAtEpochMillis
        is ExerciseSessionState.Paused -> state.startedAtEpochMillis
        else -> return
    }
    var now by remember(state) { mutableLongStateOf(System.currentTimeMillis()) }
    val duration = state.effectiveDurationMillis(now)

    LaunchedEffect(state) {
        while (state is ExerciseSessionState.Active) {
            now = System.currentTimeMillis()
            delay(1_000L)
        }
    }

    HomeCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.Timer,
                contentDescription = null,
                tint = homeAccentColor(),
                modifier = Modifier.size(22.dp)
            )
            Spacer(Modifier.width(10.dp))
            Text(
                text = stringResource(R.string.dashboard_exercise_in_progress),
                color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
        }
        Spacer(Modifier.height(16.dp))
        ResumeExerciseFact(
            label = stringResource(R.string.dashboard_exercise_start_time),
            value = SimpleDateFormat("HH:mm", AppLanguagePreferences.currentLocale)
                .format(Date(startedAtEpochMillis))
        )
        Spacer(Modifier.height(10.dp))
        ResumeExerciseFact(
            label = stringResource(R.string.dashboard_exercise_duration),
            value = formatResumeDuration(duration)
        )
        Spacer(Modifier.height(20.dp))
        PrimaryActionButton(
            title = stringResource(R.string.dashboard_exercise_continue),
            icon = Icons.Filled.Timer,
            onClick = onResumeExercise
        )
    }
}

@Composable
private fun ResumeExerciseFact(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(Modifier.weight(1f))
        Text(
            text = value,
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

private fun formatResumeDuration(durationMillis: Long): String {
    val totalSeconds = (durationMillis / 1_000L).coerceAtLeast(0L)
    return "%02d:%02d:%02d".format(
        totalSeconds / 3_600L,
        (totalSeconds % 3_600L) / 60L,
        totalSeconds % 60L
    )
}

/**
 * Keeps the student's immediate daily decision ahead of longer-term progress.
 * A submission starts review; it neither proves credit nor blocks another real exercise.
 */
@Composable
private fun TodayCheckInPanel(
    appState: StudentAppState,
    hasSubmittedToday: Boolean,
    onOpenCheckIn: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val accent = homeAccentColor()
    var currentShanghaiTime by remember { mutableStateOf(ZonedDateTime.now(DashboardShanghaiZoneId)) }
    val timeWindow = appState.checkInTimeWindow
    val isLoadingPolicy = timeWindow.windowMode == "unavailable"
    val blockedReason = if (isLoadingPolicy) null else timeWindow.canStartExercise(currentShanghaiTime)
    val canStart = !isLoadingPolicy && blockedReason == null

    LaunchedEffect(Unit) {
        while (true) {
            delay(60_000L)
            currentShanghaiTime = ZonedDateTime.now(DashboardShanghaiZoneId)
        }
    }

    HomeCard(contentPadding = 20.dp) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = stringResource(R.string.dashboard_today_checkin),
                modifier = Modifier.weight(1f),
                color = cs.onSurface,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            if (hasSubmittedToday) {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.size(22.dp)
                )
            }
        }

        Spacer(Modifier.height(16.dp))
        Text(
            text = stringResource(
                if (hasSubmittedToday) {
                    R.string.dashboard_today_checkin_complete
                } else {
                    R.string.dashboard_today_checkin_pending
                }
            ),
            color = cs.onSurface,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(6.dp))
        Text(
            text = stringResource(
                if (hasSubmittedToday) {
                    R.string.dashboard_today_checkin_complete_hint
                } else {
                    R.string.dashboard_today_checkin_pending_hint
                }
            ),
            color = cs.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )

        Spacer(Modifier.height(16.dp))
        CheckInTimeWindowStatus(
            isLoadingPolicy = isLoadingPolicy,
            canStart = canStart,
            dailyStartTime = timeWindow.dailyStartTime,
            dailyEndTime = timeWindow.dailyEndTime,
            blockedReason = blockedReason
        )

        Spacer(Modifier.height(20.dp))
        PrimaryActionButton(
            title = stringResource(
                if (hasSubmittedToday) {
                    R.string.dashboard_continue_exercise
                } else {
                    R.string.dashboard_start_checkin
                }
            ),
            icon = Icons.Filled.AddBox,
            onClick = onOpenCheckIn
        )
    }
}

private val DashboardShanghaiZoneId: ZoneId = ZoneId.of("Asia/Shanghai")

/** Uses the same policy evaluator as the check-in screen to avoid conflicting states. */
@Composable
private fun CheckInTimeWindowStatus(
    isLoadingPolicy: Boolean,
    canStart: Boolean,
    dailyStartTime: String,
    dailyEndTime: String,
    blockedReason: String?
) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Surface(
            shape = CircleShape,
            color = when {
                isLoadingPolicy -> colors.surfaceVariant
                canStart -> colors.primaryContainer
                else -> colors.errorContainer
            }
        ) {
            Icon(
                imageVector = Icons.Filled.Timer,
                contentDescription = null,
                modifier = Modifier.padding(8.dp).size(18.dp),
                tint = when {
                    isLoadingPolicy -> colors.onSurfaceVariant
                    canStart -> colors.onPrimaryContainer
                    else -> colors.onErrorContainer
                }
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = when {
                    isLoadingPolicy -> interfaceText("正在同步打卡时间窗", "Syncing check-in hours")
                    canStart -> interfaceText("当前可开始运动", "You can start exercising now")
                    else -> interfaceText("当前不可开始运动", "You cannot start exercising now")
                },
                color = colors.onSurface,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = when {
                    isLoadingPolicy -> interfaceText("加载完成后将显示当前状态", "Your current status will appear once loading finishes.")
                    canStart -> interfaceText(
                        "每日打卡时间 $dailyStartTime–$dailyEndTime",
                        "Daily check-in hours $dailyStartTime–$dailyEndTime"
                    )
                    else -> blockedReason.orEmpty()
                },
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
        }
        CheckInTimeWindowPill(
            text = when {
                isLoadingPolicy -> interfaceText("同步中", "Syncing")
                canStart -> interfaceText("可开始", "Available")
                else -> interfaceText("不可开始", "Unavailable")
            },
            isLoadingPolicy = isLoadingPolicy,
            canStart = canStart
        )
    }
}

@Composable
private fun CheckInTimeWindowPill(
    text: String,
    isLoadingPolicy: Boolean,
    canStart: Boolean
) {
    val colors = MaterialTheme.colorScheme
    Surface(
        shape = MaterialTheme.shapes.extraLarge,
        color = when {
            isLoadingPolicy -> colors.surfaceVariant
            canStart -> colors.primaryContainer
            else -> colors.errorContainer
        }
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            color = when {
                isLoadingPolicy -> colors.onSurfaceVariant
                canStart -> colors.onPrimaryContainer
                else -> colors.onErrorContainer
            },
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun NewSemesterWelcomePanel(
    academicYear: String,
    onDismiss: () -> Unit
) {
    HomeCard {
        Text(
            text = stringResource(R.string.dashboard_new_semester_welcome),
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.dashboard_new_semester_hint, academicYear),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(Modifier.height(12.dp))
        TextButton(
            onClick = onDismiss,
            modifier = Modifier.align(Alignment.End)
        ) {
            Text(stringResource(R.string.dashboard_new_semester_continue))
        }
    }
}

@Composable
fun CourseJoinEntryPanel(
    onScanJoin: () -> Unit,
    onEnterCode: () -> Unit
) {
    HomeCard {
        Text(
            text = stringResource(R.string.dashboard_join_course),
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.dashboard_join_course_hint),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(Modifier.height(20.dp))
        PrimaryActionButton(
            title = stringResource(R.string.login_scan_button),
            icon = Icons.Filled.QrCodeScanner,
            onClick = onScanJoin
        )
        Spacer(Modifier.height(4.dp))
        TextButton(
            onClick = onEnterCode,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.TextFields,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = stringResource(R.string.dashboard_enter_invite),
                style = MaterialTheme.typography.labelLarge
            )
        }
    }
}

@Composable
private fun DashboardHeader(
    appState: StudentAppState,
    onOpenNotificationSheet: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val safeUnreadCount = appState.workspace.notices
        .toStudentNoticeUiModels()
        .count { it.isUnread }
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = stringResource(
                    R.string.dashboard_greeting,
                    appState.workspace.student.name
                ),
                color = cs.onSurface,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = appState.workspace.student.studentNumberForDisplay(),
                color = cs.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
        NotificationBell(
            unreadCount = safeUnreadCount,
            onClick = onOpenNotificationSheet
        )
    }
}

@Composable
private fun NotificationBell(unreadCount: Int, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val interactionSource = remember { MutableInteractionSource() }
    Box {
        IconButton(
            onClick = onClick,
            interactionSource = interactionSource,
            modifier = Modifier
                .size(48.dp)
                .background(cs.surface, CircleShape)
                .pressScale(
                    interactionSource = interactionSource,
                    pressedScale = 0.94f
                )
        ) {
            Icon(
                imageVector = if (unreadCount > 0) {
                    Icons.Filled.NotificationsActive
                } else {
                    Icons.Filled.Notifications
                },
                contentDescription = stringResource(R.string.dashboard_open_notifications),
                tint = cs.onSurface,
                modifier = Modifier.size(22.dp)
            )
        }
        AnimatedVisibility(
            visible = unreadCount > 0,
            modifier = Modifier.align(Alignment.TopEnd),
            enter = fadeIn(tween(BNBUMotion.Standard)) + scaleIn(
                animationSpec = tween(BNBUMotion.Standard),
                initialScale = 0.72f
            ),
            exit = fadeOut(tween(BNBUMotion.Quick)) + scaleOut(
                animationSpec = tween(BNBUMotion.Quick),
                targetScale = 0.72f
            )
        ) {
            Box(
                modifier = Modifier
                    .background(cs.error, CircleShape)
                    .heightIn(min = 18.dp)
                    .padding(horizontal = 5.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (unreadCount > 99) "99+" else unreadCount.toString(),
                    color = cs.onError,
                    fontSize = 10.sp,
                    lineHeight = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun ProgressOverview(appState: StudentAppState) {
    val cs = MaterialTheme.colorScheme
    val accent = homeAccentColor()
    val progress = appState.studentProgressUiModel()

    HomeCard(contentPadding = 20.dp) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = stringResource(R.string.dashboard_progress),
                modifier = Modifier.weight(1f),
                color = cs.onSurface,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            HomeStatusPill(
                text = dashboardProgressStatusLabel(
                    studentStatus = appState.workspace.student.status,
                    progressStatus = if (progress.isQualified) "QUALIFIED" else "IN_PROGRESS"
                ),
                emphasized = progress.isQualified
            )
        }

        Spacer(Modifier.height(28.dp))
        Text(
            text = stringResource(R.string.dashboard_total_completed),
            color = cs.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(4.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Bottom
        ) {
            Text(
                text = progress.creditedTotalMinutes.toString(),
                color = cs.onSurface,
                fontSize = 44.sp,
                lineHeight = 50.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = (-1).sp
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = interfaceText(
                    "/ ${progress.totalTargetMinutes} 分钟",
                    "/ ${progress.totalTargetMinutes} min"
                ),
                color = cs.onSurfaceVariant,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 6.dp)
            )
            Spacer(Modifier.weight(1f))
            Text(
                text = "${progress.completionPercent}%",
                color = accent,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }

        Spacer(Modifier.height(18.dp))
        HomeProgressBar(
            value = progress.creditedTotalMinutes,
            total = progress.totalTargetMinutes,
            height = 8.dp
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = if (progress.isQualified) {
                stringResource(R.string.dashboard_goal_reached)
            } else {
                pluralStringResource(
                    R.plurals.dashboard_total_remaining,
                    progress.remainingTotalMinutes,
                    progress.remainingTotalMinutes
                )
            },
            color = if (progress.isQualified) accent else cs.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (progress.isQualified) {
                FontWeight.Medium
            } else {
                FontWeight.Normal
            }
        )
    }
}

@Composable
private fun ProgressBreakdown(appState: StudentAppState) {
    val progress = appState.studentProgressUiModel()
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        HomeSectionTitle(stringResource(R.string.dashboard_breakdown))
        HomeCard {
            ProgressMetric(
                title = stringResource(R.string.dashboard_course_exercise),
                valueMinutes = progress.creditedCourseMinutes,
                targetMinutes = progress.courseTargetMinutes
            )

            HorizontalDivider(
                modifier = Modifier.padding(vertical = 20.dp),
                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f)
            )

            ProgressMetric(
                title = stringResource(R.string.dashboard_general_exercise),
                valueMinutes = progress.creditedGeneralMinutes,
                targetMinutes = progress.generalTargetMinutes
            )
        }
    }
}

@Composable
private fun ProgressMetric(
    title: String,
    valueMinutes: Int,
    targetMinutes: Int?
) {
    val cs = MaterialTheme.colorScheme
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            color = cs.onSurface,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Medium
        )
        Text(
            text = if (targetMinutes != null) {
                interfaceText(
                    "$valueMinutes / $targetMinutes 分钟",
                    "$valueMinutes / $targetMinutes min"
                )
            } else {
                interfaceText(
                    "$valueMinutes 分钟 · 目标待同步",
                    "$valueMinutes min · target pending"
                )
            },
            color = cs.onSurface,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun HomeCard(
    modifier: Modifier = Modifier,
    contentPadding: androidx.compose.ui.unit.Dp = BNBULayout.CardPadding,
    content: @Composable ColumnScope.() -> Unit
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 0.dp
    ) {
        Column(
            modifier = Modifier.padding(contentPadding),
            content = content
        )
    }
}

@Composable
private fun HomeSectionTitle(title: String) {
    Text(
        text = title,
        color = MaterialTheme.colorScheme.onSurface,
        style = MaterialTheme.typography.titleLarge,
        fontWeight = FontWeight.SemiBold
    )
}

@Composable
private fun HomeStatusPill(
    text: String,
    emphasized: Boolean = false
) {
    val cs = MaterialTheme.colorScheme
    val accent = homeAccentColor()
    Surface(
        shape = MaterialTheme.shapes.extraLarge,
        color = if (emphasized) {
            accent.copy(alpha = 0.12f)
        } else {
            cs.surfaceVariant
        }
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            color = if (emphasized) accent else cs.onSurfaceVariant,
            style = MaterialTheme.typography.labelMedium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun HomeProgressBar(
    value: Int,
    total: Int,
    height: androidx.compose.ui.unit.Dp
) {
    val cs = MaterialTheme.colorScheme
    val accent = homeAccentColor()
    val progress = if (total <= 0) {
        0f
    } else {
        (value.toFloat() / total.toFloat()).coerceIn(0f, 1f)
    }
    val animatedProgress = animateFloatAsState(
        targetValue = progress,
        animationSpec = BNBUMotion.progressSpec,
        label = "dashboardProgress"
    ).value

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(height)
            .background(cs.surfaceVariant, CircleShape)
            .semantics {
                progressBarRangeInfo = ProgressBarRangeInfo(
                    current = progress,
                    range = 0f..1f
                )
            }
    ) {
        Box(
            modifier = Modifier
                // Use the computed fraction as the actual layout width instead
                // of scaling a full-width layer. Scaling may leave the original
                // layer visible on some render paths, making a partial result
                // look like a completed progress bar.
                .fillMaxWidth(animatedProgress)
                .fillMaxHeight()
                .background(accent, CircleShape)
        )
    }
}

@Composable
private fun homeAccentColor() = MaterialTheme.colorScheme.primary
