package edu.bnbu.student.mvp.core.designsystem

import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.Error
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import edu.bnbu.student.mvp.core.designsystem.AppleFilledTonalButton as FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.animateColorAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.sp
import edu.bnbu.student.mvp.R

// ═══════════════════════════════════════════════════════════════
//  GridBackground — retained API, now a calm content-first backdrop
// ═══════════════════════════════════════════════════════════════

@Composable
fun GridBackground(modifier: Modifier = Modifier) {
    Box(modifier = modifier.background(MaterialTheme.colorScheme.background))
}

// ═══════════════════════════════════════════════════════════════
//  SwissPanel — grouped surface with no decorative border or shadow
// ═══════════════════════════════════════════════════════════════

@Composable
fun SwissPanel(
    modifier: Modifier = Modifier,
    contentPadding: Dp = BNBULayout.CardPadding,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(contentPadding), content = content)
    }
}

// ═══════════════════════════════════════════════════════════════
//  BrandMark — official BNBU emblem
// ═══════════════════════════════════════════════════════════════

@Composable
fun BrandMark(modifier: Modifier = Modifier, compact: Boolean = false) {
    val size = if (compact) 44.dp else 64.dp

    Surface(
        modifier = modifier
            .size(size),
        shape = MaterialTheme.shapes.medium,
        color = Color.White,
        shadowElevation = 0.dp
    ) {
        Image(
            painter = painterResource(R.drawable.bnbu_emblem),
            contentDescription = interfaceText("BNBU 校徽", "BNBU emblem"),
            modifier = Modifier
                .fillMaxSize()
                .padding(if (compact) 5.dp else 7.dp)
        )
    }
}

/**
 * The stacked identity used while the app starts. The official school emblem
 * remains unchanged; the sports seal is a separate companion mark.
 */
@Composable
fun BnbuSportsBrandLockup(
    modifier: Modifier = Modifier,
    emblemSize: Dp = 84.dp,
    sportsSealSize: Dp = 34.dp
) {
    val officialBlue = colorResource(R.color.bnbu_brand_official)

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Image(
            painter = painterResource(R.drawable.bnbu_emblem),
            contentDescription = interfaceText("BNBU 校徽", "BNBU emblem"),
            modifier = Modifier.size(emblemSize)
        )
        Text(
            text = "BNBU",
            color = officialBlue,
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Black,
            letterSpacing = 4.sp
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            SportsSeal(size = sportsSealSize)
            Text(
                text = "SPORTS",
                color = officialBlue,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                letterSpacing = 3.sp
            )
        }
    }
}

/** A formal, official-blue sports companion mark with a seal-like silhouette. */
@Composable
fun SportsSeal(
    modifier: Modifier = Modifier,
    size: Dp = 34.dp
) {
    val officialBlue = colorResource(R.color.bnbu_brand_official)

    Surface(
        modifier = modifier.size(size),
        shape = CircleShape,
        color = Color.White,
        border = BorderStroke(1.dp, officialBlue),
        shadowElevation = 0.dp
    ) {
        Box(
            modifier = Modifier.padding(4.dp),
            contentAlignment = Alignment.Center
        ) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                shape = CircleShape,
                color = officialBlue,
                contentColor = Color.White,
                shadowElevation = 0.dp
            ) {
                Icon(
                    imageVector = Icons.Filled.DirectionsRun,
                    contentDescription = interfaceText("运动标识", "Sports mark"),
                    modifier = Modifier.padding(5.dp),
                    tint = Color.White
                )
            }
        }
    }
}

@Composable
fun UniversityBrandLockup(modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        BrandMark(compact = true)
        Spacer(Modifier.width(12.dp))
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = interfaceText(
                    "北师香港浸会大学",
                    "Beijing Normal University–Hong Kong Baptist University"
                ),
                color = cs.onSurface,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = interfaceText("BNBU · 学生体育", "BNBU · STUDENT SPORTS"),
                color = cs.onSurfaceVariant,
                style = MaterialTheme.typography.labelSmall,
                letterSpacing = 0.6.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  SectionTitle — concise, single-line section heading
// ═══════════════════════════════════════════════════════════════

@Composable
@Suppress("UNUSED_PARAMETER")
fun SectionTitle(title: String, modifier: Modifier = Modifier, eyebrow: String = "") {
    val cs = MaterialTheme.colorScheme
    // Keep the legacy eyebrow argument while call sites migrate, but avoid
    // repeating English labels above an already descriptive Chinese title.
    Text(
        text = title,
        modifier = modifier.fillMaxWidth(),
        color = cs.onSurface,
        style = MaterialTheme.typography.headlineSmall
    )
}

/**
 * Reusable consent control for entry points that require policy acceptance.
 * State remains with the caller so policy persistence and navigation are not
 * coupled to this visual component.
 */
@Composable
fun PrivacyConsentRow(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    onOpenPrivacy: () -> Unit,
    modifier: Modifier = Modifier
) {
    val cs = MaterialTheme.colorScheme
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Checkbox(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = CheckboxDefaults.colors(checkedColor = cs.primary)
        )
        Spacer(Modifier.width(8.dp))
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = stringResource(R.string.login_privacy_prefix),
                color = cs.onSurface,
                style = MaterialTheme.typography.bodyMedium
            )
            TextButton(
                onClick = onOpenPrivacy,
                modifier = Modifier.defaultMinSize(minWidth = 0.dp)
            ) {
                Text(
                    text = stringResource(R.string.login_privacy_policy),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            if (!checked) {
                Text(
                    text = stringResource(R.string.login_privacy_required),
                    color = cs.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  StatusBadge — low-saturation semantic capsule
// ═══════════════════════════════════════════════════════════════

@Composable
fun StatusBadge(text: String, modifier: Modifier = Modifier, filled: Boolean = false) {
    val cs = MaterialTheme.colorScheme
    val bg by animateColorAsState(
        targetValue = if (filled) cs.primaryContainer else cs.surfaceVariant,
        animationSpec = BNBUMotion.colorSpec,
        label = "statusBadgeBackground"
    )
    val fg by animateColorAsState(
        targetValue = if (filled) cs.onPrimaryContainer else cs.onSurfaceVariant,
        animationSpec = BNBUMotion.colorSpec,
        label = "statusBadgeContent"
    )

    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.extraLarge,
        color = bg
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            color = fg,
            style = MaterialTheme.typography.labelMedium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

// ═══════════════════════════════════════════════════════════════
//  HourProgressBar — M3 LinearProgressIndicator wrapper
// ═══════════════════════════════════════════════════════════════

@Composable
fun HourProgressBar(value: Double, total: Double, modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    val progress = if (total <= 0.0) 0f else (value / total).toFloat().coerceIn(0f, 1f)
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = BNBUMotion.progressSpec,
        label = "hourProgress"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(8.dp)
            .background(cs.surfaceVariant, MaterialTheme.shapes.small)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .background(cs.primary, MaterialTheme.shapes.small)
                .graphicsLayer {
                    transformOrigin = TransformOrigin(0f, 0.5f)
                    scaleX = animatedProgress
                }
        )
    }
}

// ═══════════════════════════════════════════════════════════════
//  EmptyPlaceholder — Card with muted message
// ═══════════════════════════════════════════════════════════════

@Composable
fun EmptyPlaceholder(
    title: String,
    message: String,
    modifier: Modifier = Modifier
) {
    val cs = MaterialTheme.colorScheme
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = cs.surface)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Text(
                text = title,
                color = cs.onSurface,
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = message,
                color = cs.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  PrimaryActionButton  →  M3 FilledButton
// ═══════════════════════════════════════════════════════════════

@Composable
fun PrimaryActionButton(
    title: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    onClick: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val interactionSource = remember { MutableInteractionSource() }
    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = BNBULayout.PrimaryControlHeight)
            .pressScale(
                interactionSource = interactionSource,
                enabled = enabled && !loading
            ),
        enabled = enabled && !loading,
        interactionSource = interactionSource,
        shape = MaterialTheme.shapes.medium,
        colors = ButtonDefaults.buttonColors(
            disabledContainerColor = if (loading) cs.primary.copy(alpha = 0.58f) else cs.surfaceVariant,
            disabledContentColor = if (loading) cs.onPrimary else cs.onSurfaceVariant
        )
    ) {
        if (loading) {
            androidx.compose.material3.CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                color = cs.onPrimary,
                strokeWidth = 2.dp
            )
        } else {
            Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(8.dp))
        Text(text = title)
    }
}

// ═══════════════════════════════════════════════════════════════
//  SegmentedControl — M3 chip-style segmented bar
// ═══════════════════════════════════════════════════════════════

@Composable
fun <T> SegmentedControl(
    values: List<T>,
    selected: T?,
    label: @Composable (T) -> String,
    onSelected: (T) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    optionTestTag: ((T) -> String)? = null,
) {
    val cs = MaterialTheme.colorScheme
    Row(
        modifier = modifier
            .fillMaxWidth()
            .selectableGroup()
            .background(cs.surfaceContainerHighest, MaterialTheme.shapes.small)
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        values.forEach { value ->
            val isSelected = value == selected
            val interactionSource = remember { MutableInteractionSource() }
            val indication = LocalIndication.current
            val backgroundColor by animateColorAsState(
                targetValue = if (isSelected) cs.surface else Color.Transparent,
                animationSpec = BNBUMotion.colorSpec,
                label = "segmentBackground"
            )
            val contentColor by animateColorAsState(
                targetValue = if (isSelected) cs.onSurface else cs.onSurfaceVariant,
                animationSpec = BNBUMotion.colorSpec,
                label = "segmentContent"
            )
            Box(
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 44.dp)
                    .pressScale(interactionSource, enabled)
                    .background(
                        backgroundColor,
                        MaterialTheme.shapes.small
                    )
                    .selectable(
                        selected = isSelected,
                        enabled = enabled,
                        role = Role.Tab,
                        interactionSource = interactionSource,
                        indication = indication,
                        onClick = { onSelected(value) }
                    )
                    .then(
                        optionTestTag?.let { Modifier.testTag(it(value)) } ?: Modifier
                    )
                    .padding(horizontal = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = label(value),
                    modifier = Modifier.fillMaxWidth(),
                    style = MaterialTheme.typography.labelLarge,
                    color = contentColor,
                    maxLines = 1,
                    textAlign = TextAlign.Center,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  ActionButton
//
//  filled=true   → primary action
//  filled=false  → quiet secondary action
// ═══════════════════════════════════════════════════════════════

@Composable
fun ActionButton(
    title: String,
    icon: ImageVector,
    filled: Boolean,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val animatedModifier = modifier
        .fillMaxWidth()
        .heightIn(min = BNBULayout.PrimaryControlHeight)
        .pressScale(interactionSource = interactionSource, enabled = enabled)
    if (filled) {
        Button(
            onClick = onClick,
            modifier = animatedModifier,
            interactionSource = interactionSource,
            enabled = enabled,
            shape = MaterialTheme.shapes.medium
        ) {
            Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(text = title, maxLines = 1)
        }
    } else {
        FilledTonalButton(
            onClick = onClick,
            modifier = animatedModifier,
            interactionSource = interactionSource,
            enabled = enabled,
            shape = MaterialTheme.shapes.medium,
            colors = ButtonDefaults.filledTonalButtonColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                contentColor = MaterialTheme.colorScheme.primary
            )
        ) {
            Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(text = title, maxLines = 1)
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  StatusMessagePanel — success toast in a Card
// ═══════════════════════════════════════════════════════════════

@Composable
fun StatusMessagePanel(
    message: String,
    onDismiss: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = cs.tertiaryContainer)
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = interfaceText("操作成功", "Operation succeeded"),
                    tint = cs.primary,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(Modifier.width(10.dp))
                Text(
                    text = message,
                    color = cs.onSurface,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f)
                )
                StatusBadge(text = interfaceText("完成", "Complete"), filled = true)
            }
            Spacer(Modifier.height(10.dp))
            ActionButton(
                title = interfaceText("知道了", "Got it"),
                icon = Icons.Filled.Clear,
                filled = false,
                onClick = onDismiss
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  ValidationPanel — local, reviewed validation copy only.
//  Backend/repository failures must use BNBUErrorPanel(UserFacingError).
// ═══════════════════════════════════════════════════════════════

@Composable
fun ValidationPanel(message: String) {
    val cs = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(cs.errorContainer, MaterialTheme.shapes.small)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Filled.Error,
            contentDescription = interfaceText("验证错误", "Validation error"),
            tint = cs.error,
            modifier = Modifier.size(20.dp)
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = message,
            color = cs.onErrorContainer,
            style = MaterialTheme.typography.bodySmall
        )
    }
}
