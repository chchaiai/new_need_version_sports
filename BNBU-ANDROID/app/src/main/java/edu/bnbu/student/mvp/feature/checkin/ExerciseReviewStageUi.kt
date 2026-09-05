package edu.bnbu.student.mvp.feature.checkin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.interfaceText

@Composable
internal fun ExerciseRecordReviewStage.displayText(): String =
    interfaceText(chineseLabel, englishLabel)

@Composable
internal fun ExerciseRecordReviewStage.supportingText(): String = when (this) {
    ExerciseRecordReviewStage.PendingAiCheck -> interfaceText(
        "材料已受理，正在等待系统规则和 AI 检查；尚未确认有效或计入。",
        "Evidence was accepted and is awaiting system rules and AI checks; validity and credit are not confirmed."
    )

    ExerciseRecordReviewStage.PendingTeacherReview -> interfaceText(
        "系统或 AI 发现异常或不确定项，正在等待责任教师处理。",
        "The system or AI found an exception or uncertainty and the responsible teacher must review it."
    )

    ExerciseRecordReviewStage.PendingStudentSupplement -> interfaceText(
        "教师已退回一次补证；需要在服务器确认的截止时间前提交。",
        "The teacher returned the record for its one supplement; submit before the server-confirmed deadline."
    )

    ExerciseRecordReviewStage.SupplementReceivedPendingTeacherReview -> interfaceText(
        "补证已由服务器按时受理，等待教师最终复核；等待期间不会自动逾期。",
        "The server accepted the supplement on time and it awaits final teacher review; review waiting does not cause expiry."
    )

    ExerciseRecordReviewStage.TechnicalProcessing -> interfaceText(
        "系统正在有限重试或等待技术处理；技术问题不代表学生记录无效。",
        "The system is retrying or awaiting technical handling; a technical issue does not mean the record is invalid."
    )

    ExerciseRecordReviewStage.ValidCredited -> interfaceText(
        "审核已完成，记录有效且本次有分钟计入进度。",
        "Review is complete; the record is valid and minutes from it were credited."
    )

    ExerciseRecordReviewStage.ValidNotCredited -> interfaceText(
        "审核已完成且记录有效，但受日、周、类别或总目标上限影响，本次未计入。",
        "Review is complete and the record is valid, but daily, weekly, category, or total caps prevented credit."
    )

    ExerciseRecordReviewStage.Invalid -> interfaceText(
        "审核已完成，记录结果无效；原始运动事实和材料仍保留。",
        "Review is complete and the record result is invalid; original activity facts and evidence remain."
    )

    ExerciseRecordReviewStage.StageUnavailable -> interfaceText(
        "当前接口没有提供可区分的处理中阶段，Android 不会自行猜测。",
        "The current interface does not provide a distinguishable processing stage, so Android does not guess one."
    )
}

@Composable
internal fun ExerciseRecordReviewUiModel.creditOutcomeText(): String = when (stage) {
    ExerciseRecordReviewStage.ValidCredited -> interfaceText(
        "实际计入 ${creditedWholeMinutes ?: 0} 分钟",
        "${creditedWholeMinutes ?: 0} minutes credited"
    )

    ExerciseRecordReviewStage.ValidNotCredited -> interfaceText(
        "记录有效，但本次未计入进度",
        "The record is valid but not credited to progress"
    )

    ExerciseRecordReviewStage.Invalid -> interfaceText(
        "记录无效；实际运动事实仍保留",
        "The record is invalid; the actual exercise fact remains"
    )

    ExerciseRecordReviewStage.PendingAiCheck,
    ExerciseRecordReviewStage.PendingTeacherReview,
    ExerciseRecordReviewStage.PendingStudentSupplement,
    ExerciseRecordReviewStage.SupplementReceivedPendingTeacherReview -> interfaceText(
        "审核尚未完成，当前不计入进度",
        "Review is incomplete and currently contributes no progress"
    )

    ExerciseRecordReviewStage.TechnicalProcessing -> interfaceText(
        "技术处理中，不视为记录无效",
        "Technical processing; the record is not treated as invalid"
    )

    ExerciseRecordReviewStage.StageUnavailable -> interfaceText(
        "当前接口尚不能区分具体审核阶段",
        "The current interface cannot distinguish the review stage"
    )
}

/** Local-review-only matrix; a production record still renders only its own explicit stage. */
@Composable
internal fun ExerciseReviewStageCatalogReviewPanel(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .testTag("reviewStage.catalog"),
        color = MaterialTheme.colorScheme.surface,
        shape = MaterialTheme.shapes.large
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = interfaceText("V8.1 审核阶段矩阵 · UI 评审", "V8.1 review-stage matrix · UI review"),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = interfaceText(
                    "仅用于核对状态语义，不属于当前学生记录，也不会写入后端。",
                    "For reviewing state semantics only. These are not states of the current student record and are never written to the backend."
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
            ExerciseReviewStageUiPolicy.V81ReviewStages.forEachIndexed { index, stage ->
                if (index > 0) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                }
                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(
                        text = stage.displayText(),
                        modifier = Modifier.testTag("reviewStage.catalog.${stage.name}"),
                        color = MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = stage.supportingText(),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    text = ExerciseRecordReviewStage.StageUnavailable.displayText(),
                    modifier = Modifier.testTag("reviewStage.catalog.StageUnavailable"),
                    color = MaterialTheme.colorScheme.onSurface,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = ExerciseRecordReviewStage.StageUnavailable.supportingText(),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}
