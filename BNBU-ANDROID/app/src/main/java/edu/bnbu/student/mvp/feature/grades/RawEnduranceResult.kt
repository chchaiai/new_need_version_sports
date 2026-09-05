package edu.bnbu.student.mvp.feature.grades

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Icon
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
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.EnduranceRunStatus

internal enum class RawEnduranceResultState {
    Measured,
    Exempt,
    Unconfirmed
}

/** UI-only projection. It deliberately has no score, level, rank, or conversion fields. */
internal data class RawEnduranceResultUiModel(
    val state: RawEnduranceResultState,
    val eventMeters: Int?,
    val durationSeconds: Int?,
    val testDate: String?,
    val isReviewSample: Boolean = false
)

internal fun rawEnduranceResultUiModel(
    gender: String,
    status: EnduranceRunStatus,
    durationSeconds: Int?,
    testDate: String? = null,
    isReviewSample: Boolean = false
): RawEnduranceResultUiModel {
    val eventMeters = when (gender.trim().lowercase()) {
        "female" -> 800
        "male" -> 1_000
        else -> null
    }
    val confirmedDuration = durationSeconds?.takeIf { it > 0 }
    val state = when {
        status == EnduranceRunStatus.Exempt -> RawEnduranceResultState.Exempt
        status == EnduranceRunStatus.Recorded && confirmedDuration != null ->
            RawEnduranceResultState.Measured
        else -> RawEnduranceResultState.Unconfirmed
    }
    return RawEnduranceResultUiModel(
        state = state,
        eventMeters = eventMeters,
        durationSeconds = confirmedDuration.takeIf { state == RawEnduranceResultState.Measured },
        testDate = testDate?.trim()?.takeIf(String::isNotEmpty)
            .takeIf { state == RawEnduranceResultState.Measured },
        isReviewSample = isReviewSample
    )
}

/** PAGE-STU-052: teacher-confirmed raw fact, an exemption fact, or an honest empty state. */
@Composable
internal fun RawEnduranceResultCard(model: RawEnduranceResultUiModel) {
    val colors = MaterialTheme.colorScheme
    val event = model.eventMeters?.let { interfaceText("$it 米", "$it m") }
        ?: interfaceText("800 米 / 1000 米", "800 m / 1000 m")
    val primary = when (model.state) {
        RawEnduranceResultState.Measured -> formatRawEnduranceTime(requireNotNull(model.durationSeconds))
        RawEnduranceResultState.Exempt -> interfaceText("已确认免测", "Exemption confirmed")
        RawEnduranceResultState.Unconfirmed -> interfaceText("暂无已确认结果", "No confirmed result")
    }
    val supporting = when (model.state) {
        RawEnduranceResultState.Measured -> interfaceText(
            "责任教师确认的原始测试用时",
            "Raw test time confirmed by the responsible teacher"
        )
        RawEnduranceResultState.Exempt -> interfaceText(
            "仅显示免测事实，不生成用时或换算结果",
            "Only the exemption fact is shown; no time or conversion is generated"
        )
        RawEnduranceResultState.Unconfirmed -> interfaceText(
            "未确认内容和 OCR 草稿不会显示为正式结果",
            "Unconfirmed content and OCR drafts are not shown as formal results"
        )
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("recordsProgress.rawEndurance"),
        shape = MaterialTheme.shapes.large,
        color = colors.surface,
        shadowElevation = 1.dp
    ) {
        Column(
            modifier = Modifier.padding(BNBULayout.CardPadding),
            verticalArrangement = Arrangement.spacedBy(BNBULayout.Space12)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = MaterialTheme.shapes.medium,
                    color = colors.primaryContainer
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.DirectionsRun,
                        contentDescription = null,
                        tint = colors.primary,
                        modifier = Modifier.padding(10.dp).size(21.dp)
                    )
                }
                Spacer(Modifier.width(BNBULayout.Space12))
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = interfaceText("$event 原始耐力结果", "$event raw endurance result"),
                        color = colors.onSurface,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = supporting,
                        color = colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                if (model.isReviewSample) {
                    Surface(shape = MaterialTheme.shapes.extraLarge, color = colors.secondaryContainer) {
                        Text(
                            text = interfaceText("评审样例", "Review sample"),
                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                            color = colors.onSecondaryContainer,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            Text(
                text = primary,
                color = colors.onSurface,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold
            )

            when (model.state) {
                RawEnduranceResultState.Measured -> EnduranceDateRow(
                    value = model.testDate ?: interfaceText(
                        "测试日期待新接口同步",
                        "Test date pending the new API"
                    ),
                    pending = model.testDate == null
                )
                RawEnduranceResultState.Exempt -> EnduranceBoundaryNote(
                    interfaceText(
                        "免测不增加运动分钟，也不向学生展示分数、等级或排名。",
                        "An exemption adds no exercise minutes and shows students no score, band, or rank."
                    )
                )
                RawEnduranceResultState.Unconfirmed -> EnduranceBoundaryNote(
                    interfaceText(
                        "责任教师确认项目、用时和测试日期后才会显示；缺失不会显示为 0 分。",
                        "The event, time, and date appear only after teacher confirmation; missing data is never shown as zero points."
                    )
                )
            }
        }
    }
}

@Composable
private fun EnduranceDateRow(value: String, pending: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = Icons.Filled.CalendarMonth,
            contentDescription = null,
            tint = if (pending) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(18.dp)
        )
        Spacer(Modifier.width(BNBULayout.Space8))
        Text(
            text = interfaceText("测试日期：$value", "Test date: $value"),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
private fun EnduranceBoundaryNote(text: String) {
    Row(verticalAlignment = Alignment.Top) {
        Icon(
            imageVector = Icons.Filled.Info,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(18.dp)
        )
        Spacer(Modifier.width(BNBULayout.Space8))
        Text(
            text = text,
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

private fun formatRawEnduranceTime(totalSeconds: Int): String {
    val normalized = totalSeconds.coerceAtLeast(0)
    return "${normalized / 60}′${(normalized % 60).toString().padStart(2, '0')}″"
}
