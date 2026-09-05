package edu.bnbu.student.mvp.feature.grades

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.BNBULayout
import edu.bnbu.student.mvp.core.designsystem.SectionTitle
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.CheckInRecord
import edu.bnbu.student.mvp.core.model.CreditType
import edu.bnbu.student.mvp.core.state.StudentAppState
import edu.bnbu.student.mvp.feature.checkin.SupplementTaskEntryCard
import edu.bnbu.student.mvp.feature.checkin.displaySportType
import edu.bnbu.student.mvp.feature.common.StudentProgressUiModel
import edu.bnbu.student.mvp.feature.common.studentProgressUiModel

/**
 * Student-facing activity facts only. The legacy grade payload remains outside this screen until
 * the shared Contract is replaced; it must never be projected into the student UI.
 */
@Composable
fun GradesScreen(
    appState: StudentAppState,
    onOpenSupplement: (() -> Unit)? = null
) {
    val workspace = appState.workspace
    val progress = appState.studentProgressUiModel()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("screen.recordsProgress"),
        contentPadding = PaddingValues(top = BNBULayout.Space4, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(BNBULayout.Space16)
    ) {
        item {
            ProgressHeader(
                updatedAt = workspace.records.maxOfOrNull(CheckInRecord::submittedAt).orEmpty()
            )
        }
        item { ProgressOverviewCard(progress) }
        item { CategoryProgressCard(progress) }
        item {
            val rawEndurance = if (appState.isLocalReviewMode) {
                rawEnduranceResultUiModel(
                    gender = workspace.student.gender,
                    status = edu.bnbu.student.mvp.core.model.EnduranceRunStatus.Recorded,
                    durationSeconds = 287,
                    testDate = "2026-08-29",
                    isReviewSample = true
                )
            } else {
                rawEnduranceResultUiModel(
                    gender = workspace.student.gender,
                    status = workspace.grades.enduranceRunStatus,
                    durationSeconds = workspace.grades.enduranceRunTimeSeconds
                )
            }
            RawEnduranceResultCard(rawEndurance)
        }
        if (appState.isLocalReviewMode && onOpenSupplement != null) {
            item { SupplementTaskEntryCard(onClick = onOpenSupplement) }
        }
        item {
            RecentRecordsCard(
                records = workspace.records,
                showReviewProjection = appState.isLocalReviewMode
            )
        }
        item { ProgressDataBoundaryCard() }
    }
}

@Composable
private fun ProgressHeader(updatedAt: String) {
    val colors = MaterialTheme.colorScheme
    Column(verticalArrangement = Arrangement.spacedBy(BNBULayout.Space4)) {
        SectionTitle(title = interfaceText("记录与进度", "Records & progress"))
        Text(
            text = updatedAt.takeIf(String::isNotBlank)
                ?.let {
                    interfaceText(
                        "本人运动事实 · 更新于 ${formatCompactTime(it)}",
                        "Your activity facts · Updated ${formatCompactTime(it)}"
                    )
                }
                ?: interfaceText("本人运动事实", "Your activity facts"),
            color = colors.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun ProgressOverviewCard(progress: StudentProgressUiModel) {
    val colors = MaterialTheme.colorScheme
    ProgressCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            CardIcon {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = colors.primary,
                    modifier = Modifier.size(21.dp)
                )
            }
            Spacer(Modifier.width(BNBULayout.Space12))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = interfaceText("本学期已计入", "Credited this semester"),
                    color = colors.onSurface,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = interfaceText(
                        "考核进度与真实运动记录分开保存",
                        "Assessment progress is separate from activity history"
                    ),
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            StatusPill(
                text = if (progress.isQualified) {
                    interfaceText("已达目标", "Goal reached")
                } else {
                    interfaceText("进行中", "In progress")
                }
            )
        }

        Spacer(Modifier.height(BNBULayout.Space20))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = progress.creditedTotalMinutes.toString(),
                color = colors.onSurface,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = interfaceText(
                    " / ${progress.totalTargetMinutes} 分钟",
                    " / ${progress.totalTargetMinutes} min"
                ),
                modifier = Modifier.padding(start = 5.dp, bottom = 4.dp),
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.bodyLarge
            )
            Spacer(Modifier.weight(1f))
            Text(
                text = "${progress.completionPercent}%",
                color = colors.primary,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
        }
        Spacer(Modifier.height(BNBULayout.Space12))
        LinearProgressIndicator(
            progress = { progress.completionRatio },
            modifier = Modifier.fillMaxWidth().height(6.dp),
            color = colors.primary,
            trackColor = colors.surfaceVariant,
            drawStopIndicator = {}
        )
        Spacer(Modifier.height(BNBULayout.Space12))
        Text(
            text = if (progress.isQualified) {
                interfaceText(
                    "已达到考核目标，仍可继续记录真实运动；额外记录可能不再计入。",
                    "The assessment goal is complete. You may keep recording real exercise; additional records may not be credited."
                )
            } else {
                interfaceText(
                    "距离总目标还差 ${progress.remainingTotalMinutes} 分钟。",
                    "${progress.remainingTotalMinutes} minutes remain toward the total goal."
                )
            },
            color = colors.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun CategoryProgressCard(progress: StudentProgressUiModel) {
    ProgressCard {
        Text(
            text = interfaceText("分类进度", "Category progress"),
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(BNBULayout.Space16))
        CategoryProgressRow(
            label = interfaceText("课程相关运动", "Course-related exercise"),
            creditedMinutes = progress.creditedCourseMinutes,
            targetMinutes = progress.courseTargetMinutes
        )
        HorizontalDivider(
            modifier = Modifier.padding(vertical = BNBULayout.Space16),
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f)
        )
        CategoryProgressRow(
            label = interfaceText("其他运动", "Other exercise"),
            creditedMinutes = progress.creditedGeneralMinutes,
            targetMinutes = progress.generalTargetMinutes
        )
    }
}

@Composable
private fun CategoryProgressRow(label: String, creditedMinutes: Int, targetMinutes: Int?) {
    val colors = MaterialTheme.colorScheme
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(text = label, color = colors.onSurface, style = MaterialTheme.typography.bodyLarge)
            Text(
                text = interfaceText("已计入分钟", "Credited minutes"),
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
        }
        Text(
            text = targetMinutes?.let {
                interfaceText("$creditedMinutes / $it 分钟", "$creditedMinutes / $it min")
            } ?: interfaceText("$creditedMinutes 分钟 · 目标待同步", "$creditedMinutes min · target pending"),
            color = colors.onSurface,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun RecentRecordsCard(
    records: List<CheckInRecord>,
    showReviewProjection: Boolean
) {
    val colors = MaterialTheme.colorScheme
    ProgressCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            CardIcon {
                Icon(
                    imageVector = Icons.Filled.History,
                    contentDescription = null,
                    tint = colors.primary,
                    modifier = Modifier.size(21.dp)
                )
            }
            Spacer(Modifier.width(BNBULayout.Space12))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = interfaceText("最近运动记录", "Recent activity records"),
                    color = colors.onSurface,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = interfaceText("显示本人事实与审核阶段", "Your facts and review stages"),
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
        Spacer(Modifier.height(BNBULayout.Space16))

        val recentRecords = records.sortedByDescending(CheckInRecord::submittedAt).take(3)
        if (recentRecords.isEmpty()) {
            Text(
                text = interfaceText(
                    "还没有运动记录。完成真实运动并提交材料后，记录会显示在这里。",
                    "No activity records yet. Records appear here after you exercise and submit evidence."
                ),
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium
            )
        } else {
            recentRecords.forEachIndexed { index, record ->
                if (index > 0) {
                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = BNBULayout.Space16),
                        color = colors.outlineVariant.copy(alpha = 0.55f)
                    )
                }
                RecordSummary(record = record, showReviewProjection = showReviewProjection)
            }
        }
    }
}

@Composable
private fun RecordSummary(record: CheckInRecord, showReviewProjection: Boolean) {
    val colors = MaterialTheme.colorScheme
    val actualMinutes = record.actualDurationSeconds?.coerceAtLeast(0L)?.div(60L)?.toInt()
    val reviewStatus = when (record.reviewStatus?.trim()?.uppercase()) {
        "VALID" -> interfaceText("审核有效", "Valid after review")
        "INVALID" -> interfaceText("审核无效", "Invalid after review")
        else -> interfaceText("处理中", "In review")
    }
    val reviewEligibleMinutes = if (
        showReviewProjection && record.reviewStatus.equals("VALID", ignoreCase = true)
    ) {
        actualMinutes?.takeIf { it >= 30 }?.coerceAtMost(60) ?: 0
    } else {
        null
    }
    val title = record.sportType?.takeIf(String::isNotBlank)?.displaySportType()
        ?: record.taskTitle.ifBlank { interfaceText("运动记录", "Activity record") }

    Row(verticalAlignment = Alignment.Top) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = title,
                color = colors.onSurface,
                style = MaterialTheme.typography.titleSmall,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "${record.creditType.studentLabel()} · ${formatCompactTime(record.submittedAt)}",
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
            Text(
                text = buildString {
                    append(interfaceText("实际 ", "Actual "))
                    append(actualMinutes?.let { interfaceText("$it 分钟", "$it min") }
                        ?: interfaceText("待同步", "pending"))
                    append(" · ")
                    append(interfaceText("可计 ", "Eligible "))
                    append(reviewEligibleMinutes?.let { interfaceText("$it 分钟", "$it min") }
                        ?: interfaceText("待新接口", "new API pending"))
                    append(" · ")
                    append(interfaceText("计入 ", "Credited "))
                    append(reviewEligibleMinutes?.let { interfaceText("$it 分钟", "$it min") }
                        ?: interfaceText("待新接口", "new API pending"))
                },
                color = colors.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
        }
        Spacer(Modifier.width(BNBULayout.Space8))
        StatusPill(text = reviewStatus)
    }
}

@Composable
private fun ProgressDataBoundaryCard() {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.surfaceVariant, MaterialTheme.shapes.medium)
            .padding(BNBULayout.Space12),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            imageVector = Icons.Filled.Info,
            contentDescription = null,
            tint = colors.primary,
            modifier = Modifier.size(19.dp)
        )
        Spacer(Modifier.width(BNBULayout.Space8))
        Text(
            text = interfaceText(
                "这里只展示本人运动事实、审核阶段与计入进度。",
                "Only your activity facts, review stages, and credited progress are shown here."
            ),
            color = colors.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
private fun ProgressCard(content: @Composable () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier.padding(BNBULayout.CardPadding),
            content = { content() }
        )
    }
}

@Composable
private fun CardIcon(content: @Composable () -> Unit) {
    Surface(
        modifier = Modifier.size(40.dp),
        shape = MaterialTheme.shapes.small,
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Box(contentAlignment = Alignment.Center, content = { content() })
    }
}

@Composable
private fun StatusPill(text: String) {
    val colors = MaterialTheme.colorScheme
    Surface(shape = MaterialTheme.shapes.extraLarge, color = colors.primaryContainer) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            color = colors.onPrimaryContainer,
            style = MaterialTheme.typography.labelMedium,
            maxLines = 1
        )
    }
}

@Composable
private fun CreditType.studentLabel(): String = when (this) {
    CreditType.CourseRelated -> interfaceText("课程相关", "Course-related")
    CreditType.General -> interfaceText("其他运动", "Other exercise")
    CreditType.OrganizationOffset -> interfaceText("认证认可", "Certification credit")
}

private fun formatCompactTime(raw: String): String {
    val normalized = raw.trim().replace('T', ' ')
    return when {
        normalized.length >= 16 -> normalized.take(16)
        normalized.length >= 10 -> normalized.take(10)
        normalized.isNotBlank() -> normalized
        else -> "—"
    }
}
