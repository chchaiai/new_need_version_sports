package edu.bnbu.student.mvp.feature.grades

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
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Star
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
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.BNBULayout
import edu.bnbu.student.mvp.core.designsystem.SectionTitle
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.model.EnduranceRunStatus
import edu.bnbu.student.mvp.core.model.SportHourRule
import edu.bnbu.student.mvp.core.model.StudentProgress
import edu.bnbu.student.mvp.core.state.StudentAppState

@Composable
fun GradesScreen(appState: StudentAppState) {
    val workspace = appState.workspace
    val publishedGrade = workspace.grades.publishedTotalGrade()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("screen.grades"),
        contentPadding = PaddingValues(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(BNBULayout.Space16)
    ) {
        item { CompletionHeader(calculatedAt = workspace.student.gradeCalculatedAt) }
        item {
            EnduranceRunCard(
                gender = workspace.student.gender,
                timeSeconds = workspace.grades.enduranceRunTimeSeconds,
                status = workspace.grades.enduranceRunStatus,
                score = workspace.grades.enduranceRunScore
            )
        }
        if (publishedGrade != null) {
            item { PublishedGradeCard(publishedGrade) }
        }
        item {
            CheckInHoursCard(
                progress = workspace.progress,
                rule = workspace.hourRule
            )
        }
    }
}

@Composable
private fun PublishedGradeCard(grade: TotalGrade) {
    val cs = MaterialTheme.colorScheme
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = cs.surface
    ) {
        Column(
            modifier = Modifier.padding(BNBULayout.CardPadding),
            verticalArrangement = Arrangement.spacedBy(BNBULayout.Space16)
        ) {
            CardTitle(
                icon = {
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = null,
                        tint = cs.primary,
                        modifier = Modifier.size(21.dp)
                    )
                },
                title = interfaceText("已发布成绩", "Published grade"),
                supportingText = interfaceText(
                    "仅显示服务端正式发布的最终成绩",
                    "Only the server-published final grade is shown"
                )
            )
            Text(
                text = interfaceText("${grade.display} 分", "${grade.display} points"),
                color = cs.onSurface,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold
            )
            grade.isPassed?.let { passed ->
                Text(
                    text = if (passed) {
                        interfaceText("已达标", "Qualified")
                    } else {
                        interfaceText("未达标", "Not qualified")
                    },
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

@Composable
private fun CompletionHeader(calculatedAt: String) {
    val cs = MaterialTheme.colorScheme
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = BNBULayout.Space4),
        verticalArrangement = Arrangement.spacedBy(BNBULayout.Space4)
    ) {
        SectionTitle(title = interfaceText("体测与打卡", "Fitness & check-ins"))
        Text(
            text = calculatedAt.takeIf(String::isNotBlank)
                ?.let { interfaceText(
                    "本学期完成情况 · 更新于 ${formatCompactTime(it)}",
                    "This semester's progress · Updated ${formatCompactTime(it)}"
                ) }
                ?: interfaceText("本学期完成情况", "This semester's progress"),
            color = cs.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun EnduranceRunCard(
    gender: String,
    timeSeconds: Int?,
    status: EnduranceRunStatus,
    score: Int?
) {
    val cs = MaterialTheme.colorScheme
    val distance = when (gender.trim().lowercase()) {
        "male" -> interfaceText("1000 米", "1000 m")
        "female" -> interfaceText("800 米", "800 m")
        else -> interfaceText("800 米 / 1000 米", "800 m / 1000 m")
    }
    val recordedTime = timeSeconds?.takeIf { it > 0 }?.let(::formatRunTime)
    val display = when (status) {
        EnduranceRunStatus.Recorded -> EnduranceRunDisplay(
            primary = recordedTime ?: interfaceText("暂未记录", "Not recorded"),
            supporting = interfaceText("耐力跑测试用时", "Endurance run time"),
            score = score
        )
        EnduranceRunStatus.Exempt -> EnduranceRunDisplay(
            primary = interfaceText("免测", "Exempt"),
            supporting = interfaceText("耐力跑免测 · 教师评分", "Endurance exemption · Teacher-assigned score"),
            score = score
        )
        EnduranceRunStatus.Absent -> EnduranceRunDisplay(
            primary = interfaceText("缺考（计0分）", "Absent (0 points)"),
            supporting = interfaceText("耐力跑缺考状态", "Endurance run absence"),
            score = 0
        )
        EnduranceRunStatus.NotRecorded -> EnduranceRunDisplay(
            primary = interfaceText("暂未记录", "Not recorded"),
            supporting = interfaceText("耐力跑测试用时", "Endurance run time"),
            score = null
        )
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = cs.surface
    ) {
        Column(
            modifier = Modifier.padding(BNBULayout.CardPadding),
            verticalArrangement = Arrangement.spacedBy(BNBULayout.Space16)
        ) {
            CardTitle(
                icon = {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.DirectionsRun,
                        contentDescription = null,
                        tint = cs.primary,
                        modifier = Modifier.size(21.dp)
                    )
                },
                title = interfaceText("$distance 跑步", "$distance run"),
                supportingText = display.supporting
            )
            Text(
                text = display.primary,
                color = cs.onSurface,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold
            )
            if (status == EnduranceRunStatus.Exempt || status == EnduranceRunStatus.Absent) {
                Text(
                    text = display.score?.let {
                        interfaceText("成绩：$it 分", "Score: $it points")
                    } ?: interfaceText("成绩：暂未评分", "Score: not assigned"),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

private data class EnduranceRunDisplay(
    val primary: String,
    val supporting: String,
    val score: Int?
)

@Composable
private fun CheckInHoursCard(progress: StudentProgress, rule: SportHourRule) {
    val cs = MaterialTheme.colorScheme
    val completed = if (rule.isAvailable) {
        (progress.course + progress.general).coerceAtLeast(0.0)
    } else {
        progress.authoritativeTotalHours?.coerceAtLeast(0.0) ?: 0.0
    }
    val required = rule.total.coerceAtLeast(0.0)
    val remaining = (required - completed).coerceAtLeast(0.0)
    val isQualified = progress.status.trim().equals("QUALIFIED", ignoreCase = true)

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = cs.surface
    ) {
        Column(
            modifier = Modifier.padding(BNBULayout.CardPadding),
            verticalArrangement = Arrangement.spacedBy(BNBULayout.Space16)
        ) {
            CardTitle(
                icon = {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = cs.primary,
                        modifier = Modifier.size(21.dp)
                    )
                },
                title = interfaceText("打卡学时", "Check-in hours"),
                supportingText = when {
                    !rule.isAvailable -> interfaceText(
                        "有效打卡时长已累计；学时目标等待后端同步",
                        "Valid check-in hours are summed; the target is waiting for backend sync"
                    )
                    isQualified -> interfaceText(
                        "已完成本学期打卡要求",
                        "Semester check-in requirement complete"
                    )
                    remaining == 0.0 -> interfaceText(
                        "等待后端确认达标状态",
                        "Waiting for backend qualification confirmation"
                    )
                    else -> interfaceText(
                        "已按有效打卡累计，还需 ${formatHours(remaining)} 小时",
                        "Summed from valid check-ins; ${formatHours(remaining)} hours remaining"
                    )
                }
            )

            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    text = formatHours(completed),
                    color = cs.onSurface,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = if (rule.isAvailable) interfaceText(
                        " / ${formatHours(required)} 小时",
                        " / ${formatHours(required)} hours"
                    ) else interfaceText(
                        " / 待后端同步",
                        " / waiting for backend"
                    ),
                    modifier = Modifier.padding(start = BNBULayout.Space4, bottom = 3.dp),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyLarge
                )
            }

            if (rule.isAvailable && required > 0.0) {
                LinearProgressIndicator(
                    progress = { (completed / required).toFloat().coerceIn(0f, 1f) },
                    modifier = Modifier.fillMaxWidth().height(4.dp),
                    color = cs.primary,
                    trackColor = cs.surfaceVariant,
                    drawStopIndicator = {}
                )
            }

            Row(modifier = Modifier.fillMaxWidth()) {
                HourBreakdown(
                    modifier = Modifier.weight(1f),
                    label = interfaceText("课程相关", "Course-related"),
                    completed = progress.course
                )
                Spacer(Modifier.width(BNBULayout.Space16))
                HourBreakdown(
                    modifier = Modifier.weight(1f),
                    label = interfaceText("其他运动", "Other exercise"),
                    completed = progress.general
                )
            }
        }
    }
}

@Composable
private fun CardTitle(
    icon: @Composable () -> Unit,
    title: String,
    supportingText: String
) {
    val cs = MaterialTheme.colorScheme
    Row(verticalAlignment = Alignment.CenterVertically) {
        Surface(
            modifier = Modifier.size(40.dp),
            shape = MaterialTheme.shapes.small,
            color = cs.surfaceVariant
        ) {
            Box(contentAlignment = Alignment.Center) { icon() }
        }
        Spacer(Modifier.width(BNBULayout.Space12))
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(text = title, color = cs.onSurface, style = MaterialTheme.typography.titleMedium)
            Text(text = supportingText, color = cs.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun HourBreakdown(
    modifier: Modifier = Modifier,
    label: String,
    completed: Double
) {
    val cs = MaterialTheme.colorScheme
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(text = label, color = cs.onSurfaceVariant, style = MaterialTheme.typography.labelMedium)
        Text(
            text = interfaceText(
                "${formatHours(completed)} 小时",
                "${formatHours(completed)} hours"
            ),
            color = cs.onSurface,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

private fun formatRunTime(totalSeconds: Int): String {
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%d′%02d″".format(AppLanguagePreferences.currentLocale, minutes, seconds)
}

private fun formatHours(value: Double): String = if (value % 1.0 == 0.0) {
    value.toInt().toString()
} else {
    "%.1f".format(AppLanguagePreferences.currentLocale, value)
}

private fun formatCompactTime(raw: String): String {
    val normalized = raw.trim().replace('T', ' ')
    return when {
        normalized.length >= 16 -> normalized.take(16)
        normalized.length >= 10 -> normalized.take(10)
        else -> normalized
    }
}
