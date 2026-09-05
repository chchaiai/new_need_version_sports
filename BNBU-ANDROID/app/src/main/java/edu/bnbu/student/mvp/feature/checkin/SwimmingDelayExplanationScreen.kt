package edu.bnbu.student.mvp.feature.checkin

import androidx.activity.compose.BackHandler

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
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.BNBUFormField
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText

/** PAGE-STU-043: local draft UI for a fully-offline swimming delay explanation. */
@Composable
internal fun SwimmingDelayExplanationScreen(
    explanation: String,
    onExplanationChanged: (String) -> Unit,
    canSubmit: Boolean,
    isSubmitting: Boolean,
    unavailableReason: String?,
    onBack: () -> Unit,
    onSubmit: () -> Unit
) {
    BackHandler(onBack = onBack)
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 52.dp)
                    .bnbuClickable(
                        onClickLabel = interfaceText("返回证据采集", "Back to evidence capture"),
                        onClick = onBack
                    ),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = interfaceText("返回证据采集", "Back to evidence capture"),
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(Modifier.width(8.dp))
                Column {
                    Text(
                        text = interfaceText("游泳延迟说明", "Swimming delay explanation"),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = interfaceText("完全离线情形 · 本地草稿", "Fully offline · Local draft"),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                shape = MaterialTheme.shapes.large
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(9.dp)
                ) {
                    DelayFact(
                        icon = Icons.Filled.Schedule,
                        text = interfaceText(
                            "仅适用于游泳结束时完全离线，并须在结束后 ${ExerciseEvidenceUiPolicy.SwimmingDelayExplanationHours} 小时内由服务器受理。",
                            "Only for a fully offline swimming finish, and must be accepted by the server within ${ExerciseEvidenceUiPolicy.SwimmingDelayExplanationHours} hours."
                        )
                    )
                    DelayFact(
                        icon = Icons.Filled.Info,
                        text = interfaceText(
                            "说明会连同已有会话和材料进入教师异常队列，不会自动通过，也不会补造会话、时长、业务日期或运动前照片。",
                            "The explanation and existing session evidence enter the teacher exception queue. It does not auto-approve or recreate a session, duration, business date, or before photo."
                        )
                    )
                }
            }
        }
        item {
            BNBUFormField(
                value = explanation,
                onValueChange = onExplanationChanged,
                label = interfaceText("延迟原因说明", "Reason for delay"),
                testTag = "checkIn.swimmingDelay.explanation",
                placeholder = interfaceText(
                    "说明结束时无法联网的事实；不要填写密码、Token 或其他敏感信息",
                    "Describe why the device was offline at finish. Do not include passwords, tokens, or other sensitive data."
                ),
                supportingText = interfaceText(
                    "返回会保留本地草稿；最终资格和截止时间必须由服务器确认。",
                    "Back keeps this local draft. Eligibility and deadline must be confirmed by the server."
                ),
                required = true,
                enabled = !isSubmitting,
                loading = isSubmitting,
                singleLine = false,
                minLines = 5,
                maxLines = 8
            )
        }
        unavailableReason?.let { reason ->
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Text(
                        text = reason,
                        modifier = Modifier.padding(14.dp),
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
        item {
            Button(
                onClick = onSubmit,
                enabled = canSubmit && explanation.isNotBlank() && !isSubmitting,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 54.dp)
                    .testTag("checkIn.swimmingDelay.submit"),
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
                    Spacer(Modifier.width(8.dp))
                }
                Text(
                    if (isSubmitting) {
                        interfaceText("提交中…", "Submitting…")
                    } else {
                        interfaceText("提交延迟说明", "Submit delay explanation")
                    }
                )
            }
            Spacer(Modifier.height(22.dp))
        }
    }
}

@Composable
private fun DelayFact(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String
) {
    Row(verticalAlignment = Alignment.Top) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(20.dp)
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
