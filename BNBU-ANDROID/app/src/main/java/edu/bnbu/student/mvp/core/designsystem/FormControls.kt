package edu.bnbu.student.mvp.core.designsystem

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp

/**
 * Shared mobile form field used by focused account and enrollment flows.
 * Labels, supporting copy and errors live outside the control so the field
 * remains calm and legible instead of behaving like a dense web form.
 */
@Composable
fun BNBUFormField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    testTag: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    supportingText: String? = null,
    errorText: String? = null,
    successText: String? = null,
    required: Boolean = false,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    loading: Boolean = false,
    singleLine: Boolean = true,
    minLines: Int = 1,
    maxLines: Int = if (singleLine) 1 else Int.MAX_VALUE,
    counter: Pair<Int, Int>? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    isSecure: Boolean = false,
    inputModifier: Modifier = Modifier,
    onFocusChanged: (Boolean) -> Unit = {},
) {
    val colors = MaterialTheme.colorScheme
    val interactionSource = remember { MutableInteractionSource() }
    val focused by interactionSource.collectIsFocusedAsState()
    var secureTextVisible by remember { mutableStateOf(false) }
    val counterVisible = counter?.let { (current, maximum) ->
        focused || current >= (maximum - 16).coerceAtLeast(0)
    } == true

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(BNBULayout.Space8)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clearAndSetSemantics { },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(BNBULayout.Space8)
        ) {
            Text(
                text = label,
                color = colors.onSurface,
                style = MaterialTheme.typography.labelLarge
            )
            if (required) {
                Text(
                    text = interfaceText("必填", "Required"),
                    color = colors.onSurfaceVariant,
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }

        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = inputModifier
                .fillMaxWidth()
                .heightIn(min = BNBULayout.PrimaryControlHeight)
                .onFocusChanged { onFocusChanged(it.isFocused) }
                .semantics {
                    contentDescription = label
                    val states = buildList {
                        if (required) add(interfaceText("必填", "Required"))
                        if (readOnly) add(interfaceText("只读", "Read only"))
                        if (loading) add(interfaceText("处理中", "Loading"))
                        if (errorText != null) add(interfaceText("输入无效", "Invalid input"))
                        if (successText != null && errorText == null) {
                            add(interfaceText("已验证", "Validated"))
                        }
                    }
                    if (states.isNotEmpty()) stateDescription = states.joinToString(". ")
                    if (!enabled || loading) disabled()
                    if (errorText != null) {
                        error(errorText)
                        liveRegion = LiveRegionMode.Assertive
                    } else if (successText != null) {
                        liveRegion = LiveRegionMode.Polite
                    }
                }
                .testTag(testTag),
            enabled = enabled && !loading,
            readOnly = readOnly,
            singleLine = singleLine,
            minLines = minLines,
            maxLines = maxLines,
            placeholder = placeholder?.let {
                {
                    Text(
                        text = it,
                        color = colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            },
            isError = errorText != null,
            interactionSource = interactionSource,
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            visualTransformation = if (isSecure && !secureTextVisible) {
                PasswordVisualTransformation()
            } else {
                visualTransformation
            },
            trailingIcon = if (loading) {
                {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp
                    )
                }
            } else if (isSecure) {
                {
                    IconButton(
                        onClick = { secureTextVisible = !secureTextVisible },
                        enabled = enabled && !readOnly
                    ) {
                        Icon(
                            imageVector = if (secureTextVisible) {
                                Icons.Filled.VisibilityOff
                            } else {
                                Icons.Filled.Visibility
                            },
                            contentDescription = if (secureTextVisible) {
                                interfaceText("隐藏密码", "Hide password")
                            } else {
                                interfaceText("显示密码", "Show password")
                            }
                        )
                    }
                }
            } else {
                null
            },
            shape = MaterialTheme.shapes.medium,
            textStyle = MaterialTheme.typography.bodyLarge,
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = colors.surfaceContainerLow,
                unfocusedContainerColor = colors.surfaceContainerLow,
                disabledContainerColor = colors.surfaceVariant,
                errorContainerColor = colors.errorContainer.copy(alpha = 0.18f),
                focusedBorderColor = colors.primary,
                unfocusedBorderColor = colors.outlineVariant,
                disabledBorderColor = Color.Transparent,
                errorBorderColor = colors.error,
                cursorColor = colors.primary,
            )
        )

        if (errorText != null || successText != null || supportingText != null || counterVisible) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(BNBULayout.Space8)
            ) {
                Text(
                    text = errorText ?: successText ?: supportingText.orEmpty(),
                    modifier = Modifier.weight(1f),
                    color = when {
                        errorText != null -> colors.error
                        successText != null -> colors.tertiary
                        else -> colors.onSurfaceVariant
                    },
                    style = MaterialTheme.typography.bodySmall
                )
                if (counterVisible) {
                    val (current, maximum) = requireNotNull(counter)
                    Text(
                        text = "$current/$maximum",
                        color = colors.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}

/** A quiet text-only primary action with explicit loading and disabled states. */
@Composable
fun BNBUPrimaryButton(
    title: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val colors = MaterialTheme.colorScheme
    AppleButton(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = BNBULayout.PrimaryControlHeight),
        enabled = enabled && !loading,
        shape = MaterialTheme.shapes.medium,
        colors = ButtonDefaults.buttonColors(
            disabledContainerColor = if (loading) {
                colors.primary.copy(alpha = 0.58f)
            } else {
                colors.surfaceVariant
            },
            disabledContentColor = if (loading) colors.onPrimary else colors.onSurfaceVariant,
        )
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                color = colors.onPrimary,
                strokeWidth = 2.dp
            )
            Spacer(Modifier.width(BNBULayout.Space8))
        }
        Text(text = title, style = MaterialTheme.typography.labelLarge)
    }
}
