package edu.bnbu.student.mvp.core.designsystem

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.Role

/** Shared motion rhythm for the app. Keep transitions short and physically damped. */
object BNBUMotion {
    const val Quick = 120
    const val StateChange = 180
    const val Standard = 220
    const val Emphasized = 320

    val progressSpec = tween<Float>(
        durationMillis = 360,
        easing = FastOutSlowInEasing
    )

    val colorSpec = tween<androidx.compose.ui.graphics.Color>(
        durationMillis = Standard,
        easing = FastOutSlowInEasing
    )

    /**
     * A short, heavily damped spring that settles in roughly 180 ms without
     * the overshoot associated with a playful or mechanical bounce.
     */
    val pressReleaseSpec = spring<Float>(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessHigh
    )
}

/**
 * Shared Apple-inspired press feedback.
 *
 * The pressed state is deliberately immediate and restrained: 0.97 scale and
 * 92% opacity. Releasing uses [BNBUMotion.pressReleaseSpec], which is tuned
 * for a natural 180 ms settle with no overshoot. Material buttons additionally
 * lower their pressed elevation through the Apple button wrappers.
 */
@Composable
fun Modifier.pressScale(
    interactionSource: MutableInteractionSource,
    enabled: Boolean = true,
    pressedScale: Float = 0.97f
): Modifier {
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (enabled && isPressed) pressedScale else 1f,
        animationSpec = BNBUMotion.pressReleaseSpec,
        label = "bnbuPressScale"
    )
    val alpha by animateFloatAsState(
        targetValue = if (enabled && isPressed) 0.92f else 1f,
        animationSpec = BNBUMotion.pressReleaseSpec,
        label = "bnbuPressAlpha"
    )
    return graphicsLayer {
        scaleX = scale
        scaleY = scale
        this.alpha = alpha
    }
}

/** Standard clickable treatment for custom cards and rows. */
@Composable
fun Modifier.bnbuClickable(
    enabled: Boolean = true,
    onClickLabel: String? = null,
    role: Role? = null,
    pressedScale: Float = 0.97f,
    onClick: () -> Unit
): Modifier {
    val interactionSource = remember { MutableInteractionSource() }
    val indication = LocalIndication.current
    return pressScale(
        interactionSource = interactionSource,
        enabled = enabled,
        pressedScale = pressedScale
    ).clickable(
        interactionSource = interactionSource,
        indication = indication,
        enabled = enabled,
        onClickLabel = onClickLabel,
        role = role,
        onClick = onClick
    )
}
