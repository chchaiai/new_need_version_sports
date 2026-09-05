package edu.bnbu.student.mvp.feature.checkin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.network.UploadProgress
import edu.bnbu.student.mvp.feature.checkin.session.SubmissionSummary

/** PAGE-STU-042: submission, locked-batch retry, and acceptance semantics. */
@Composable
internal fun ExerciseSubmissionScreen(
    isSubmitting: Boolean,
    uploadProgress: UploadProgress?,
    hasLockedMedia: Boolean,
    submitEnabled: Boolean,
    blockedReason: String?,
    summaryContent: @Composable () -> Unit,
    onSubmit: () -> Unit,
    onDiscard: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.surface,
            shape = MaterialTheme.shapes.large
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (hasLockedMedia) Icons.Filled.Lock else Icons.Filled.CloudUpload,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(Modifier.size(9.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (hasLockedMedia) {
                                interfaceText("继续同一锁定批次", "Resume the same locked batch")
                            } else {
                                interfaceText("提交首版材料", "Submit initial evidence")
                            },
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = if (hasLockedMedia) {
                                interfaceText(
                                    "只续传尚未完成的项目，不更换文件或创建新批次",
                                    "Continue unfinished items only; do not replace files or create a new batch"
                                )
                            } else {
                                interfaceText(
                                    "上传开始后材料会锁定，不能删除或替换",
                                    "Evidence locks when upload starts and can no longer be deleted or replaced"
                                )
                            },
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
                Spacer(Modifier.height(14.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f))
                Spacer(Modifier.height(14.dp))
                summaryContent()
            }
        }

        UploadStatePanel(
            isSubmitting = isSubmitting,
            progress = uploadProgress,
            hasLockedMedia = hasLockedMedia
        )

        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
            shape = MaterialTheme.shapes.medium
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.Top
            ) {
                Icon(
                    imageVector = Icons.Filled.Schedule,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(Modifier.size(9.dp))
                Text(
                    text = interfaceText(
                        "材料被系统受理后将进入检查或审核；受理不等于有效、通过或已计入分钟。",
                        "After acceptance, evidence enters checks or review. Acceptance does not mean valid, approved, or credited."
                    ),
                    modifier = Modifier.weight(1f),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        blockedReason?.let {
            Text(
                text = it,
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center
            )
        }

        Button(
            onClick = onSubmit,
            enabled = submitEnabled && !isSubmitting,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 54.dp),
            shape = MaterialTheme.shapes.extraLarge,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            )
        ) {
            if (isSubmitting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary
                )
                Spacer(Modifier.size(8.dp))
            }
            Text(
                when {
                    isSubmitting -> interfaceText("提交中…", "Submitting…")
                    hasLockedMedia -> interfaceText("继续上传同一批次", "Resume the same batch")
                    else -> interfaceText("提交材料", "Submit evidence")
                }
            )
        }
        TextButton(
            onClick = onDiscard,
            enabled = !isSubmitting && !hasLockedMedia,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = if (hasLockedMedia) {
                    interfaceText("材料已锁定，不能放弃批次", "Locked evidence cannot be discarded")
                } else {
                    interfaceText("放弃本次记录", "Discard this record")
                },
                color = if (hasLockedMedia) {
                    MaterialTheme.colorScheme.onSurfaceVariant
                } else {
                    MaterialTheme.colorScheme.error
                }
            )
        }
    }
}

@Composable
private fun UploadStatePanel(
    isSubmitting: Boolean,
    progress: UploadProgress?,
    hasLockedMedia: Boolean
) {
    if (!isSubmitting && !hasLockedMedia) return
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("checkIn.uploadProgress"),
        color = MaterialTheme.colorScheme.surface,
        shape = MaterialTheme.shapes.large
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = when {
                        !isSubmitting -> interfaceText("上传已中断，可安全续传", "Upload interrupted; safe to resume")
                        progress == null -> interfaceText("正在锁定提交材料", "Locking evidence for submission")
                        progress.percent >= 100 -> interfaceText("文件已上传，正在等待受理确认", "Files uploaded; awaiting acceptance")
                        else -> interfaceText("正在上传图片和视频", "Uploading photos and video")
                    },
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                progress?.let {
                    Text(
                        text = "${it.percent}%",
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
            if (progress != null) {
                LinearProgressIndicator(
                    progress = { progress.fraction },
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
                Text(
                    text = formatUploadBytesForUi(progress.bytesSent, progress.totalBytes),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            } else {
                Text(
                    text = interfaceText(
                        "重新进入后仍使用已经锁定的材料；请勿删除应用数据。",
                        "Re-entering resumes the locked evidence. Do not clear app data."
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

/** Accepted is deliberately separate from review validity and credit allocation. */
@Composable
internal fun ExerciseSubmissionAcceptedScreen(
    summary: SubmissionSummary,
    onViewRecords: () -> Unit,
    onReturnHome: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Surface(
            color = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.12f),
            shape = MaterialTheme.shapes.extraLarge
        ) {
            Icon(
                imageVector = Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.tertiary,
                modifier = Modifier
                    .padding(14.dp)
                    .size(34.dp)
            )
        }
        Text(
            text = interfaceText("材料已受理", "Evidence accepted"),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = interfaceText(
                "记录正在等待系统检查或教师审核，当前尚未确认有效或计入分钟。",
                "The record is awaiting system checks or teacher review. Validity and credited minutes are not confirmed yet."
            ),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center
        )
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.surface,
            shape = MaterialTheme.shapes.large
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                SubmissionSummaryRow(interfaceText("打卡日期", "Check-in date"), summary.date)
                SubmissionSummaryRow(interfaceText("实际运动时长", "Active duration"), summary.duration)
                SubmissionSummaryRow(interfaceText("打卡类别", "Check-in category"), summary.creditType)
                SubmissionSummaryRow(interfaceText("运动项目", "Exercise type"), summary.sportType)
                SubmissionSummaryRow(
                    interfaceText("首版材料", "Initial evidence"),
                    interfaceText("${summary.proofCount} 项已受理", "${summary.proofCount} items accepted")
                )
                SubmissionSummaryRow(
                    interfaceText("当前阶段", "Current stage"),
                    interfaceText("待系统检查", "Pending system checks")
                )
            }
        }
        Button(
            onClick = onViewRecords,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 54.dp),
            shape = MaterialTheme.shapes.extraLarge,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            )
        ) {
            Text(interfaceText("查看打卡记录", "View check-in records"))
        }
        TextButton(onClick = onReturnHome, modifier = Modifier.fillMaxWidth()) {
            Text(interfaceText("返回运动首页", "Back to exercise home"))
        }
    }
}

@Composable
private fun SubmissionSummaryRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.weight(1f))
        Text(value, fontWeight = FontWeight.Medium)
    }
}

private fun formatUploadBytesForUi(sentBytes: Long, totalBytes: Long): String {
    fun megabytes(bytes: Long): String =
        String.format(java.util.Locale.US, "%.1f MB", bytes / 1_048_576.0)
    return "${megabytes(sentBytes)} / ${megabytes(totalBytes)}"
}
