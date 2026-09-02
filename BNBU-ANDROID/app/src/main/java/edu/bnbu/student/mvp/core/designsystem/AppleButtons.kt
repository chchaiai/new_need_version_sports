package edu.bnbu.student.mvp.core.designsystem

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.RowScope
import androidx.compose.material3.Button as MaterialButton
import androidx.compose.material3.ButtonColors
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ButtonElevation
import androidx.compose.material3.FilledTonalButton as MaterialFilledTonalButton
import androidx.compose.material3.IconButton as MaterialIconButton
import androidx.compose.material3.IconButtonColors
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.OutlinedButton as MaterialOutlinedButton
import androidx.compose.material3.TextButton as MaterialTextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp

/**
 * Material button wrappers that apply the app-wide press specification.
 *
 * They retain the Material APIs used by this app, so screen-level code keeps
 * its semantics, accessibility behavior and visual customization while all
 * button variants respond consistently.
 */
@Composable
fun AppleButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    shape: Shape = ButtonDefaults.shape,
    colors: ButtonColors = ButtonDefaults.buttonColors(),
    elevation: ButtonElevation? = ButtonDefaults.buttonElevation(
        defaultElevation = 1.dp,
        pressedElevation = 0.dp
    ),
    border: BorderStroke? = null,
    contentPadding: PaddingValues = ButtonDefaults.ContentPadding,
    interactionSource: MutableInteractionSource? = null,
    content: @Composable RowScope.() -> Unit
) {
    val resolvedInteractionSource = interactionSource ?: remember { MutableInteractionSource() }
    MaterialButton(
        onClick = onClick,
        modifier = modifier.pressScale(resolvedInteractionSource, enabled),
        enabled = enabled,
        shape = shape,
        colors = colors,
        elevation = elevation,
        border = border,
        contentPadding = contentPadding,
        interactionSource = resolvedInteractionSource,
        content = content
    )
}

@Composable
fun AppleTextButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    shape: Shape = ButtonDefaults.shape,
    colors: ButtonColors = ButtonDefaults.textButtonColors(),
    contentPadding: PaddingValues = ButtonDefaults.TextButtonContentPadding,
    interactionSource: MutableInteractionSource? = null,
    content: @Composable RowScope.() -> Unit
) {
    val resolvedInteractionSource = interactionSource ?: remember { MutableInteractionSource() }
    MaterialTextButton(
        onClick = onClick,
        modifier = modifier.pressScale(resolvedInteractionSource, enabled),
        enabled = enabled,
        shape = shape,
        colors = colors,
        contentPadding = contentPadding,
        interactionSource = resolvedInteractionSource,
        content = content
    )
}

@Composable
fun AppleOutlinedButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    shape: Shape = ButtonDefaults.shape,
    colors: ButtonColors = ButtonDefaults.outlinedButtonColors(),
    border: BorderStroke? = ButtonDefaults.outlinedButtonBorder(enabled),
    contentPadding: PaddingValues = ButtonDefaults.ContentPadding,
    interactionSource: MutableInteractionSource? = null,
    content: @Composable RowScope.() -> Unit
) {
    val resolvedInteractionSource = interactionSource ?: remember { MutableInteractionSource() }
    MaterialOutlinedButton(
        onClick = onClick,
        modifier = modifier.pressScale(resolvedInteractionSource, enabled),
        enabled = enabled,
        shape = shape,
        colors = colors,
        border = border,
        contentPadding = contentPadding,
        interactionSource = resolvedInteractionSource,
        content = content
    )
}

@Composable
fun AppleFilledTonalButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    shape: Shape = ButtonDefaults.shape,
    colors: ButtonColors = ButtonDefaults.filledTonalButtonColors(),
    contentPadding: PaddingValues = ButtonDefaults.ContentPadding,
    interactionSource: MutableInteractionSource? = null,
    content: @Composable RowScope.() -> Unit
) {
    val resolvedInteractionSource = interactionSource ?: remember { MutableInteractionSource() }
    MaterialFilledTonalButton(
        onClick = onClick,
        modifier = modifier.pressScale(resolvedInteractionSource, enabled),
        enabled = enabled,
        shape = shape,
        colors = colors,
        contentPadding = contentPadding,
        interactionSource = resolvedInteractionSource,
        content = content
    )
}

@Composable
fun AppleIconButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    colors: IconButtonColors = IconButtonDefaults.iconButtonColors(),
    interactionSource: MutableInteractionSource? = null,
    content: @Composable () -> Unit
) {
    val resolvedInteractionSource = interactionSource ?: remember { MutableInteractionSource() }
    MaterialIconButton(
        onClick = onClick,
        modifier = modifier.pressScale(resolvedInteractionSource, enabled),
        enabled = enabled,
        colors = colors,
        interactionSource = resolvedInteractionSource,
        content = content
    )
}
