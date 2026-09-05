package edu.bnbu.student.mvp.feature.checkin

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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.designsystem.BNBULayout
import edu.bnbu.student.mvp.core.designsystem.bnbuClickable
import edu.bnbu.student.mvp.core.designsystem.interfaceText

private val SupplementResultBlue = Color(0xFF007AFF)
private val SupplementResultGreen = Color(0xFF34C759)

/** PAGE-STU-061: acceptance is not validity, approval, or credited progress. */
@Composable
internal fun SupplementResultScreen(
    model: SupplementTaskUiModel,
    onBack: () -> Unit,
    onViewRecords: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("screen.supplementResult"),
        verticalArrangement = Arrangement.spacedBy(BNBULayout.Space16)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 52.dp)
                    .bnbuClickable(
                        onClickLabel = interfaceText("返回一次补充", "Back to one-time supplement"),
                        onClick = onBack
                    ),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = interfaceText("返回一次补充", "Back to one-time supplement"),
                    tint = SupplementResultBlue,
                    modifier = Modifier.size(28.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = interfaceText("补充结果", "Supplement result"),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Surface(
                    shape = MaterialTheme.shapes.extraLarge,
                    color = SupplementResultGreen.copy(alpha = 0.12f)
                ) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = SupplementResultGreen,
                        modifier = Modifier.padding(14.dp).size(36.dp)
                    )
                }
                Text(
                    text = interfaceText("补充材料已接收", "Supplement received"),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = interfaceText("等待责任教师复核", "Waiting for the responsible teacher's review"),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = TextAlign.Center
                )
                if (model.isReviewSample) {
                    Text(
                        text = interfaceText(
                            "本地虚构评审样例 · 未发生提交或后端写入",
                            "Synthetic local review sample · No submission or backend write occurred"
                        ),
                        color = MaterialTheme.colorScheme.tertiary,
                        style = MaterialTheme.typography.bodySmall,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large,
                color = MaterialTheme.colorScheme.surface
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
                    SupplementResultFact(interfaceText("原记录", "Original record"), model.recordId)
                    SupplementResultFact(interfaceText("运动项目", "Exercise"), model.sportLabel)
                    SupplementResultFact(
                        interfaceText("补充机会", "Supplement opportunity"),
                        interfaceText("已使用 1/1", "Used 1/1")
                    )
                    SupplementResultFact(
                        interfaceText("当前阶段", "Current stage"),
                        interfaceText("等待教师复核", "Waiting for teacher review")
                    )
                }
            }
        }
        item {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.medium,
                color = SupplementResultBlue.copy(alpha = 0.08f)
            ) {
                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.Top) {
                    Icon(
                        imageVector = Icons.Filled.Schedule,
                        contentDescription = null,
                        tint = SupplementResultBlue,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(9.dp))
                    Text(
                        text = interfaceText(
                            "材料在截止前被服务器受理后，即使教师稍后复核也不会因等待而过期。最终仍可能有效或无效；当前没有第二轮补充。",
                            "Once accepted by the server before the deadline, the evidence does not expire while waiting for review. The final result may still be valid or invalid, and there is no second supplement round."
                        ),
                        modifier = Modifier.weight(1f),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
        item {
            Button(
                onClick = onViewRecords,
                modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = SupplementResultBlue,
                    contentColor = Color.White
                )
            ) {
                Text(interfaceText("返回记录与进度", "Back to records and progress"))
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SupplementResultFact(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}
