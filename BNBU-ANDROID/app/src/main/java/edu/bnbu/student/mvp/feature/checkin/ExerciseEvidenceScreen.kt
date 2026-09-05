package edu.bnbu.student.mvp.feature.checkin

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Photo
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import edu.bnbu.student.mvp.core.designsystem.AppleOutlinedButton as OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.interfaceText

private val EvidenceBlue = Color(0xFF007AFF)
private val EvidenceOrange = Color(0xFFFF9500)

/** PAGE-STU-041: version-aware evidence presentation around the existing capture UI. */
@Composable
internal fun ExerciseEvidenceScreen(
    isSwimming: Boolean,
    photoCount: Int,
    videoCount: Int,
    totalBytes: Long,
    hasLockedMedia: Boolean,
    captureActions: @Composable () -> Unit,
    mediaManager: @Composable () -> Unit,
    onOpenSwimmingDelayExplanation: (() -> Unit)? = null
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
                        imageVector = if (hasLockedMedia) Icons.Filled.Lock else Icons.Filled.CameraAlt,
                        contentDescription = null,
                        tint = if (hasLockedMedia) EvidenceOrange else EvidenceBlue,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(Modifier.width(9.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = interfaceText("首版运动材料", "Initial exercise evidence"),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = if (hasLockedMedia) {
                                interfaceText(
                                    "已进入正式上传流程；锁定材料不可删除或替换",
                                    "Formal upload has started; locked evidence cannot be deleted or replaced"
                                )
                            } else {
                                interfaceText(
                                    "本地草稿 · 尚未提交，可预览或删除",
                                    "Local draft · Not submitted; preview or delete before upload"
                                )
                            },
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }

                Spacer(Modifier.height(14.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f))
                Spacer(Modifier.height(12.dp))
                EvidenceFactRow(
                    icon = Icons.Filled.Photo,
                    text = interfaceText(
                        "JPEG/PNG 照片 $photoCount/${ExerciseEvidenceUiPolicy.MaxPhotoCount} · 单张不超过 ${ExerciseEvidenceUiPolicy.MaxPhotoMegabytes} MB",
                        "JPEG/PNG photos $photoCount/${ExerciseEvidenceUiPolicy.MaxPhotoCount} · ${ExerciseEvidenceUiPolicy.MaxPhotoMegabytes} MB each"
                    )
                )
                EvidenceFactRow(
                    icon = Icons.Filled.Videocam,
                    text = interfaceText(
                        "有声 MP4 $videoCount/${ExerciseEvidenceUiPolicy.MaxVideoCount} · ${ExerciseEvidenceUiPolicy.MinVideoSeconds}—${ExerciseEvidenceUiPolicy.MaxVideoSeconds} 秒 · 不超过 ${ExerciseEvidenceUiPolicy.MaxVideoMegabytes} MB",
                        "MP4 with audio $videoCount/${ExerciseEvidenceUiPolicy.MaxVideoCount} · ${ExerciseEvidenceUiPolicy.MinVideoSeconds}–${ExerciseEvidenceUiPolicy.MaxVideoSeconds}s · ${ExerciseEvidenceUiPolicy.MaxVideoMegabytes} MB max"
                    )
                )
                EvidenceFactRow(
                    icon = Icons.Filled.Schedule,
                    text = interfaceText(
                        "当前版本合计 ${formatEvidenceMegabytes(totalBytes)} / ${ExerciseEvidenceUiPolicy.MaxVersionMegabytes} MB；至少保留一项有效媒体",
                        "Current version ${formatEvidenceMegabytes(totalBytes)} / ${ExerciseEvidenceUiPolicy.MaxVersionMegabytes} MB; keep at least one valid item"
                    )
                )
            }
        }

        if (isSwimming) {
            SwimmingEvidenceRequirements(
                photoCount = photoCount,
                onOpenDelayExplanation = onOpenSwimmingDelayExplanation
            )
        }

        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.surface,
            shape = MaterialTheme.shapes.large
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = interfaceText("现场拍摄", "Capture on site"),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = interfaceText(
                        "仅在进入拍摄时申请相机权限；录像还需要麦克风权限。应用不请求位置权限。",
                        "Camera permission is requested only when capturing. Video also needs microphone access. Location is not requested."
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(Modifier.height(12.dp))
                captureActions()
                Spacer(Modifier.height(18.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f))
                Spacer(Modifier.height(16.dp))
                mediaManager()
            }
        }
    }
}

@Composable
private fun SwimmingEvidenceRequirements(
    photoCount: Int,
    onOpenDelayExplanation: (() -> Unit)?
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = EvidenceBlue.copy(alpha = 0.08f),
        shape = MaterialTheme.shapes.large
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = interfaceText("游泳前后证据", "Swimming before-and-after evidence"),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.height(5.dp))
            Text(
                text = interfaceText(
                    "每版必须有 1 张运动前照片和 1 张运动后照片，照片总计 2—6 张；无需在水中、更衣室等禁拍区域拍摄，也不强制露脸。",
                    "Each version needs one before and one after photo, with 2–6 photos total. Do not capture in prohibited areas, and showing your face is not required."
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SwimmingSlot(
                    label = interfaceText("运动前照片", "Before photo"),
                    modifier = Modifier.weight(1f)
                )
                SwimmingSlot(
                    label = interfaceText("运动后照片", "After photo"),
                    modifier = Modifier.weight(1f)
                )
            }
            Spacer(Modifier.height(9.dp))
            Text(
                text = interfaceText(
                    "已拍摄 $photoCount 张。当前接口尚未提供前/后阶段标记，不能自动把普通照片归入槽位，也不能事后补造前照。",
                    "$photoCount photos captured. The current interface has no before/after marker, so photos cannot be assigned automatically and a missing before photo cannot be recreated later."
                ),
                color = EvidenceOrange,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium
            )
            if (onOpenDelayExplanation != null) {
                Spacer(Modifier.height(12.dp))
                OutlinedButton(
                    onClick = onOpenDelayExplanation,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 48.dp)
                ) {
                    Text(interfaceText("完全离线？记录延迟说明", "Fully offline? Prepare a delay explanation"))
                }
            }
        }
    }
}

@Composable
private fun SwimmingSlot(label: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.heightIn(min = 88.dp),
        color = MaterialTheme.colorScheme.surface,
        shape = MaterialTheme.shapes.medium
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Filled.Photo,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(22.dp)
            )
            Spacer(Modifier.height(6.dp))
            Text(label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            Text(
                interfaceText("待阶段标记", "Stage marker pending"),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.labelSmall
            )
        }
    }
}

@Composable
private fun EvidenceFactRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String
) {
    Row(
        modifier = Modifier.padding(vertical = 4.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = EvidenceBlue,
            modifier = Modifier.size(18.dp)
        )
        Spacer(Modifier.width(9.dp))
        Text(
            text = text,
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

private fun formatEvidenceMegabytes(byteCount: Long): String =
    String.format(java.util.Locale.US, "%.1f", byteCount.coerceAtLeast(0L) / 1_048_576.0)
