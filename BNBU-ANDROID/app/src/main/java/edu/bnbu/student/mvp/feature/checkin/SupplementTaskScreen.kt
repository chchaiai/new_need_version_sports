package edu.bnbu.student.mvp.feature.checkin

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.AssignmentLate
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import edu.bnbu.student.mvp.core.designsystem.AppleOutlinedButton as OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.ActionButton
import edu.bnbu.student.mvp.core.designsystem.BNBUFormField
import edu.bnbu.student.mvp.core.designsystem.BNBULayout
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText

/** Review-mode entry; production only shows a task after a future server projection supplies it. */
@Composable
internal fun SupplementTaskEntryCard(onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("recordsProgress.supplementReviewEntry")
            .bnbuClickable(
                onClickLabel = interfaceText("打开一次补充评审样例", "Open one-time supplement review sample"),
                onClick = onClick
            ),
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.10f)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Filled.AssignmentLate,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.secondary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    text = interfaceText("一次补充 · 本地评审样例", "One-time supplement · Local review sample"),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = interfaceText(
                        "检查公开原因、24/72 小时截止、原材料只读与唯一机会",
                        "Review the public reason, 24/72-hour deadline, read-only originals, and single opportunity"
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

/** PAGE-STU-060: one server-authorized supplement version for one original record. */
@Composable
internal fun SupplementTaskScreen(
    model: SupplementTaskUiModel,
    note: String,
    onNoteChanged: (String) -> Unit,
    photoCount: Int,
    videoCount: Int,
    writeEnabled: Boolean,
    onBack: () -> Unit,
    onAddPhoto: () -> Unit,
    onRecordVideo: () -> Unit,
    onSubmit: () -> Unit,
    onPreviewAcceptedState: (() -> Unit)? = null
) {
    val formalActionsEnabled = writeEnabled &&
        model.formalSubmissionAvailable &&
        model.state == SupplementTaskState.Open
    val canSubmit = model.canSubmit(writeEnabled, photoCount, videoCount, note)

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("screen.supplementTask"),
        verticalArrangement = Arrangement.spacedBy(BNBULayout.Space16)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 52.dp)
                    .bnbuClickable(
                        onClickLabel = interfaceText("返回记录与进度", "Back to records and progress"),
                        onClick = onBack
                    ),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = interfaceText("返回记录与进度", "Back to records and progress"),
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(Modifier.width(8.dp))
                Column {
                    Text(
                        text = interfaceText("一次补充", "One-time supplement"),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = if (model.isReviewSample) {
                            interfaceText("本地虚构评审样例 · 不写入后端", "Synthetic local review sample · No backend write")
                        } else {
                            interfaceText("原记录事实保持不变", "Original record facts remain unchanged")
                        },
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }

        item { SupplementDeadlinePanel(model) }
        item { OriginalRecordPanel(model) }
        if (model.isReviewSample) {
            item { ExerciseReviewReasonCatalogReviewPanel() }
        }

        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large,
                color = MaterialTheme.colorScheme.surface
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.Lock,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(21.dp)
                        )
                        Spacer(Modifier.width(9.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = interfaceText("唯一补充版本", "Only supplement version"),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = interfaceText(
                                    "提交后不能创建第二版，也不能覆盖原材料",
                                    "After submission, no second version can be created and originals cannot be overwritten"
                                ),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                    Text(
                        text = interfaceText(
                            "本版最多 ${ExerciseEvidenceUiPolicy.MaxPhotoCount} 张 JPEG/PNG、1 段有声 MP4；图片 10 MB/张，视频 1—15 秒且不超过 100 MB，本版总量不超过 250 MB。",
                            "This version allows up to ${ExerciseEvidenceUiPolicy.MaxPhotoCount} JPEG/PNG photos and one MP4 with audio; 10 MB per photo, 1–15 seconds and 100 MB per video, 250 MB total."
                        ),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        ActionButton(
                            title = interfaceText("添加照片 $photoCount/6", "Add photos $photoCount/6"),
                            icon = Icons.Filled.AddAPhoto,
                            enabled = formalActionsEnabled && photoCount < ExerciseEvidenceUiPolicy.MaxPhotoCount,
                            filled = true,
                            modifier = Modifier.weight(1f),
                            onClick = onAddPhoto
                        )
                        ActionButton(
                            title = interfaceText("录制视频 $videoCount/1", "Record video $videoCount/1"),
                            icon = Icons.Filled.Videocam,
                            enabled = formalActionsEnabled && videoCount < ExerciseEvidenceUiPolicy.MaxVideoCount,
                            filled = false,
                            modifier = Modifier.weight(1f),
                            onClick = onRecordVideo
                        )
                    }
                }
            }
        }

        item {
            BNBUFormField(
                value = note,
                onValueChange = onNoteChanged,
                label = interfaceText("补充说明", "Supplement note"),
                testTag = "supplement.note",
                placeholder = interfaceText(
                    "说明新增材料与原记录的关系；不要填写密码、Token 或无关敏感资料",
                    "Explain how the new evidence relates to the original record. Do not include passwords, tokens, or unrelated sensitive data."
                ),
                supportingText = interfaceText(
                    "返回会保留同一份草稿；截止时间由服务器决定，不能修改本机时间或自行延期。",
                    "Back keeps the same draft. The server owns the deadline; device time changes and self-extension do not apply."
                ),
                enabled = formalActionsEnabled,
                required = true,
                singleLine = false,
                minLines = 4,
                maxLines = 7
            )
        }

        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                shape = MaterialTheme.shapes.medium
            ) {
                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                    Icon(
                        imageVector = Icons.Filled.Info,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(19.dp)
                    )
                    Spacer(Modifier.width(9.dp))
                    Text(
                        text = interfaceText(
                            "服务器受理只代表补充材料已接收并等待教师复核，不代表有效、通过或已经计入分钟。",
                            "Server acceptance only means the supplement was received for teacher review; it does not mean valid, approved, or credited."
                        ),
                        modifier = Modifier.weight(1f),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }

        item {
            if (!model.formalSubmissionAvailable) {
                Text(
                    text = interfaceText(
                        "补充任务与提交接口尚未接入；本页仅用于 UI 评审，不会生成本地成功记录。",
                        "Supplement task and submission APIs are not integrated. This page is for UI review only and never creates a local success record."
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(Modifier.height(8.dp))
            }
            Button(
                onClick = onSubmit,
                enabled = canSubmit,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 54.dp)
                    .testTag("supplement.submit"),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                )
            ) {
                Text(interfaceText("提交唯一一次补充", "Submit the one supplement"))
            }
            if (onPreviewAcceptedState != null) {
                Spacer(Modifier.height(8.dp))
                OutlinedButton(
                    onClick = onPreviewAcceptedState,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
                ) {
                    Text(interfaceText("查看“已接收”评审样例", "Preview the received state"))
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SupplementDeadlinePanel(model: SupplementTaskUiModel) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.10f)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Filled.Schedule,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.size(22.dp)
                )
                Spacer(Modifier.width(9.dp))
                Text(
                    text = interfaceText("${model.windowHours} 小时总窗口", "${model.windowHours}-hour total window"),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Text(
                text = interfaceText("截止：${model.deadlineLabel}", "Deadline: ${model.deadlineLabel}"),
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = interfaceText(
                    "窗口从服务器确认退回时起算；72 小时是总窗口，不是在 24 小时后继续追加。",
                    "The window starts when the server confirms the return. Seventy-two hours is the total window, not an extension after 24 hours."
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun OriginalRecordPanel(model: SupplementTaskUiModel) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.surface
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                text = interfaceText("原记录与公开原因", "Original record and public reason"),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            SupplementFact(interfaceText("运动项目", "Exercise"), model.sportLabel)
            SupplementFact(interfaceText("原提交时间", "Original submission"), model.originalSubmittedAt)
            SupplementFact(interfaceText("记录标识", "Record ID"), model.recordId)
            ExerciseReviewPublicReasonCard(model = model.reviewReason)
            Text(
                text = interfaceText("原材料（永久只读）", "Original evidence (permanently read-only)"),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold
            )
            model.originalEvidenceLabels.forEach { label ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.shapes.small)
                        .padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Filled.Lock,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(17.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(label, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
private fun SupplementFact(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
    }
}
