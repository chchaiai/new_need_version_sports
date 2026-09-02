package edu.bnbu.student.mvp.core.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import edu.bnbu.student.mvp.core.error.UserFacingError

/**
 * Shared structured error presentation. It only accepts [UserFacingError], so
 * repository messages and exception descriptions cannot be rendered directly.
 */
@Composable
internal fun BNBUErrorPanel(
    error: UserFacingError,
    modifier: Modifier = Modifier,
    onRetry: (() -> Unit)? = null,
    onDismiss: (() -> Unit)? = null
) {
    val colors = MaterialTheme.colorScheme
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.errorContainer, MaterialTheme.shapes.medium)
            .padding(BNBULayout.CardPadding)
            .testTag("errorPanel"),
        verticalArrangement = Arrangement.spacedBy(BNBULayout.Space8)
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Icon(
                imageVector = Icons.Filled.ErrorOutline,
                contentDescription = interfaceText("操作错误", "Action error"),
                tint = colors.error,
                modifier = Modifier.size(22.dp)
            )
            Spacer(Modifier.width(BNBULayout.Space8))
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = error.title,
                    color = colors.onErrorContainer,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = error.message,
                    color = colors.onErrorContainer,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        if (error.fieldErrors.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                error.fieldErrors.forEach { fieldError ->
                    Text(
                        text = "${fieldError.label}：${fieldError.message}",
                        color = colors.onErrorContainer,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.testTag("errorPanel.field.${fieldError.field}")
                    )
                }
            }
        }

        Text(
            text = error.action,
            color = colors.onErrorContainer,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
        Text(
            text = interfaceText(
                "诊断编号：${error.requestId ?: "暂不可用"}",
                "Diagnostic ID: ${error.requestId ?: "unavailable"}"
            ),
            color = colors.onErrorContainer,
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.testTag("errorPanel.requestId")
        )

        if (onRetry != null || onDismiss != null) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (onDismiss != null) {
                    AppleTextButton(
                        onClick = onDismiss,
                        modifier = Modifier.testTag("errorPanel.dismiss")
                    ) {
                        Text(interfaceText("关闭", "Close"))
                    }
                }
                if (onRetry != null && error.retryable) {
                    AppleTextButton(
                        onClick = onRetry,
                        modifier = Modifier.testTag("errorPanel.retry")
                    ) {
                        Text(interfaceText("重试", "Retry"))
                    }
                }
            }
        }
    }
}
