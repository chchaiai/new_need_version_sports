package edu.bnbu.student.mvp.feature.checkin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.interfaceText

/**
 * UI-only V8.1 exercise-record review catalog.
 *
 * These enum names are not Contract values. A future Contract adapter must map an explicit server
 * reason code to this model. Free text must never be parsed or guessed into a fixed category. This
 * catalog applies to exercise check-in review only, not exemption or certification workflows.
 */
internal enum class ExerciseReviewTeacherActionUi {
    ReturnForSupplement,
    MarkInvalid
}

internal enum class ExerciseReviewPublicReasonCodeUi(
    val chineseLabel: String,
    val englishLabel: String,
    private val allowedActions: Set<ExerciseReviewTeacherActionUi>
) {
    UnclearEvidence(
        chineseLabel = "材料不清晰",
        englishLabel = "Unclear evidence",
        allowedActions = setOf(
            ExerciseReviewTeacherActionUi.ReturnForSupplement,
            ExerciseReviewTeacherActionUi.MarkInvalid
        )
    ),
    MissingRequiredEvidence(
        chineseLabel = "必需材料缺失（含要求的前后照）",
        englishLabel = "Missing required evidence",
        allowedActions = setOf(
            ExerciseReviewTeacherActionUi.ReturnForSupplement,
            ExerciseReviewTeacherActionUi.MarkInvalid
        )
    ),
    EvidenceDoesNotMatchSession(
        chineseLabel = "材料与本次运动不符",
        englishLabel = "Evidence does not match this session",
        allowedActions = setOf(
            ExerciseReviewTeacherActionUi.ReturnForSupplement,
            ExerciseReviewTeacherActionUi.MarkInvalid
        )
    ),
    InconsistentEvidence(
        chineseLabel = "材料信息矛盾",
        englishLabel = "Inconsistent evidence",
        allowedActions = setOf(
            ExerciseReviewTeacherActionUi.ReturnForSupplement,
            ExerciseReviewTeacherActionUi.MarkInvalid
        )
    ),
    AuthenticityRequiresClarification(
        chineseLabel = "材料真实性待核实",
        englishLabel = "Evidence authenticity requires clarification",
        allowedActions = setOf(ExerciseReviewTeacherActionUi.ReturnForSupplement)
    ),
    ConfirmedReuseOrMisuse(
        chineseLabel = "经核实存在重复使用或冒用材料",
        englishLabel = "Confirmed reuse or misuse of evidence",
        allowedActions = setOf(ExerciseReviewTeacherActionUi.MarkInvalid)
    );

    fun supports(action: ExerciseReviewTeacherActionUi): Boolean = action in allowedActions

    companion object {
        fun forAction(action: ExerciseReviewTeacherActionUi): List<ExerciseReviewPublicReasonCodeUi> =
            entries.filter { it.supports(action) }
    }
}

internal sealed interface ExerciseReviewPublicReasonUiModel {
    data class TeacherDecision(
        val action: ExerciseReviewTeacherActionUi,
        val reasonCode: ExerciseReviewPublicReasonCodeUi,
        /** Public original-language note; never translated or reclassified by the Android UI. */
        val publicSupplementalNote: String? = null
    ) : ExerciseReviewPublicReasonUiModel {
        init {
            require(reasonCode.supports(action)) {
                "The fixed public reason is not allowed for the selected teacher action."
            }
        }
    }

    /** System-generated terminal reason; it is neither a teacher option nor a teacher action. */
    data object SystemSupplementDeadlineMissed : ExerciseReviewPublicReasonUiModel {
        const val ChineseLabel = "补证逾期"
        const val EnglishLabel = "Supplementary evidence deadline missed"
    }

    /**
     * Legacy/future-Contract gap. The public note may be shown verbatim, but must not be promoted
     * to one of the six fixed categories without an explicit structured reason from the server.
     */
    data class FixedCategoryUnavailable(
        val publicSupplementalNote: String? = null
    ) : ExerciseReviewPublicReasonUiModel
}

@Composable
internal fun ExerciseReviewPublicReasonCard(
    model: ExerciseReviewPublicReasonUiModel,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .testTag("reviewReason.card"),
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = MaterialTheme.shapes.medium
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            when (model) {
                is ExerciseReviewPublicReasonUiModel.TeacherDecision -> {
                    ReasonField(
                        label = interfaceText("决定来源与动作", "Decision source and action"),
                        value = when (model.action) {
                            ExerciseReviewTeacherActionUi.ReturnForSupplement ->
                                interfaceText("教师 · 退回补证", "Teacher · Returned for supplementary evidence")

                            ExerciseReviewTeacherActionUi.MarkInvalid ->
                                interfaceText("教师 · 判为无效", "Teacher · Marked invalid")
                        },
                        testTag = "reviewReason.action"
                    )
                    ReasonField(
                        label = interfaceText("固定公开原因", "Fixed public reason"),
                        value = interfaceText(model.reasonCode.chineseLabel, model.reasonCode.englishLabel),
                        testTag = "reviewReason.fixedCategory"
                    )
                    model.publicSupplementalNote?.takeIf { it.isNotBlank() }?.let { note ->
                        ReasonField(
                            label = interfaceText(
                                "公开补充说明（保留原文）",
                                "Public supplemental note (original language)"
                            ),
                            value = note,
                            testTag = "reviewReason.publicNote"
                        )
                    }
                }

                ExerciseReviewPublicReasonUiModel.SystemSupplementDeadlineMissed -> {
                    ReasonField(
                        label = interfaceText("决定来源", "Decision source"),
                        value = interfaceText("系统", "System"),
                        testTag = "reviewReason.action"
                    )
                    ReasonField(
                        label = interfaceText("公开结果原因", "Public result reason"),
                        value = interfaceText(
                            ExerciseReviewPublicReasonUiModel.SystemSupplementDeadlineMissed.ChineseLabel,
                            ExerciseReviewPublicReasonUiModel.SystemSupplementDeadlineMissed.EnglishLabel
                        ),
                        testTag = "reviewReason.systemOverdue"
                    )
                    Text(
                        text = interfaceText(
                            "该原因不属于教师原因选项，也不会重新开放补证入口。",
                            "This is not a teacher reason option and does not reopen supplementation."
                        ),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                is ExerciseReviewPublicReasonUiModel.FixedCategoryUnavailable -> {
                    ReasonField(
                        label = interfaceText("固定公开原因", "Fixed public reason"),
                        value = interfaceText("暂不可用", "Currently unavailable"),
                        testTag = "reviewReason.unavailable"
                    )
                    Text(
                        text = interfaceText(
                            "当前记录未提供可识别的固定原因分类；不会根据自由文本猜测分类。",
                            "This record has no identifiable fixed reason category; free text is not used to guess one."
                        ),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                    model.publicSupplementalNote?.takeIf { it.isNotBlank() }?.let { note ->
                        ReasonField(
                            label = interfaceText(
                                "公开说明（保留原文）",
                                "Public note (original language)"
                            ),
                            value = note,
                            testTag = "reviewReason.publicNote"
                        )
                    }
                }
            }
        }
    }
}

/** Debug-review-only catalog. Production student records show only their own explicit reason. */
@Composable
internal fun ExerciseReviewReasonCatalogReviewPanel(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .testTag("reviewReason.catalog"),
        color = MaterialTheme.colorScheme.surface,
        shape = MaterialTheme.shapes.large
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = interfaceText("V8.1 公开原因目录 · UI 评审", "V8.1 public reason catalog · UI review"),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = interfaceText(
                    "仅用于核对六类文案和动作范围，不属于当前学生记录，也不会写入后端。",
                    "For reviewing the six labels and action scopes only. This is not part of the student's record and is never written to the backend."
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
            ExerciseReviewPublicReasonCodeUi.entries.forEachIndexed { index, reason ->
                if (index > 0) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                }
                Column(
                    modifier = Modifier.testTag("reviewReason.catalog.${reason.name}"),
                    verticalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    Text(
                        text = interfaceText(reason.chineseLabel, reason.englishLabel),
                        color = MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = reason.allowedActionDisplayText(),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Text(
                text = interfaceText(
                    "系统结果原因（不属于教师选项）",
                    "System result reason (not a teacher option)"
                ),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold
            )
            ExerciseReviewPublicReasonCard(
                model = ExerciseReviewPublicReasonUiModel.SystemSupplementDeadlineMissed
            )
        }
    }
}

@Composable
private fun ExerciseReviewPublicReasonCodeUi.allowedActionDisplayText(): String {
    val supportsReturn = supports(ExerciseReviewTeacherActionUi.ReturnForSupplement)
    val supportsInvalid = supports(ExerciseReviewTeacherActionUi.MarkInvalid)
    return when {
        supportsReturn && supportsInvalid -> interfaceText(
            "适用：退回补证、判为无效",
            "Applies to: Return for supplement, Mark invalid"
        )

        supportsReturn -> interfaceText(
            "仅适用：退回补证",
            "Only applies to: Return for supplement"
        )

        else -> interfaceText(
            "仅适用：判为无效",
            "Only applies to: Mark invalid"
        )
    }
}

@Composable
private fun ReasonField(label: String, value: String, testTag: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = label,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = value,
            modifier = Modifier.testTag(testTag),
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}
