package edu.bnbu.student.mvp.core.designsystem

import android.app.Activity
import android.graphics.drawable.ColorDrawable
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import edu.bnbu.student.mvp.core.model.AppThemeMode

/**
 * Calm, content-first palette informed by Apple HIG semantics.
 *
 * These values intentionally map onto Material's semantic slots instead of
 * copying iOS controls. Screens consume roles such as primary, surface and
 * error, so hierarchy and contrast remain stable in both appearance modes.
 */
private val primaryLight = Color(0xFF007AFF)
private val onPrimaryLight = Color.White
private val primaryContainerLight = Color(0xFFE8F2FF)
private val onPrimaryContainerLight = Color(0xFF003E7D)

private val primaryDark = Color(0xFF0A84FF)
private val onPrimaryDark = Color.White
private val primaryContainerDark = Color(0xFF16395F)
private val onPrimaryContainerDark = Color(0xFFD6E9FF)

private val secondaryLight = Color(0xFFFF9500)
private val onSecondaryLight = Color.White
private val secondaryContainerLight = Color(0xFFFFF1D6)
private val onSecondaryContainerLight = Color(0xFF5A3500)

private val secondaryDark = Color(0xFFFF9F0A)
private val onSecondaryDark = Color(0xFF2C1A00)
private val secondaryContainerDark = Color(0xFF503500)
private val onSecondaryContainerDark = Color(0xFFFFE2A8)

private val tertiaryLight = Color(0xFF248A3D)
private val onTertiaryLight = Color.White
private val tertiaryContainerLight = Color(0xFFE6F6E9)
private val onTertiaryContainerLight = Color(0xFF0E4B1D)

private val tertiaryDark = Color(0xFF30D158)
private val onTertiaryDark = Color(0xFF002C0D)
private val tertiaryContainerDark = Color(0xFF164B24)
private val onTertiaryContainerDark = Color(0xFFC7F5D0)

private val errorLight = Color(0xFFFF3B30)
private val onErrorLight = Color.White
private val errorContainerLight = Color(0xFFFFE9E7)
private val onErrorContainerLight = Color(0xFF7A1712)

private val errorDark = Color(0xFFFF453A)
private val onErrorDark = Color.White
private val errorContainerDark = Color(0xFF5C201D)
private val onErrorContainerDark = Color(0xFFFFD2CE)

private val backgroundLight = Color(0xFFF2F2F7)
private val onBackgroundLight = Color(0xFF1C1C1E)
private val surfaceLight = Color.White
private val onSurfaceLight = Color(0xFF1C1C1E)
private val surfaceVariantLight = Color(0xFFEFEFF4)
private val onSurfaceVariantLight = Color(0xFF636366)
private val outlineLight = Color(0xFF8E8E93)
private val outlineVariantLight = Color(0xFFC6C6C8)

private val backgroundDark = Color.Black
private val onBackgroundDark = Color(0xFFF2F2F7)
private val surfaceDark = Color(0xFF1C1C1E)
private val onSurfaceDark = Color(0xFFF2F2F7)
private val surfaceVariantDark = Color(0xFF2C2C2E)
private val onSurfaceVariantDark = Color(0xFFAEAEB2)
private val outlineDark = Color(0xFF8E8E93)
private val outlineVariantDark = Color(0xFF3A3A3C)

private val inverseSurfaceLight = Color(0xFF2C2C2E)
private val inverseOnSurfaceLight = Color(0xFFF2F2F7)
private val inversePrimaryLight = Color(0xFF64B5FF)

private val inverseSurfaceDark = Color(0xFFF2F2F7)
private val inverseOnSurfaceDark = Color(0xFF1C1C1E)
private val inversePrimaryDark = Color(0xFF0066CC)

// ── Color schemes ────────────────────────────────────────────

private val BNBULightColorScheme = lightColorScheme(
    primary = primaryLight,
    onPrimary = onPrimaryLight,
    primaryContainer = primaryContainerLight,
    onPrimaryContainer = onPrimaryContainerLight,
    secondary = secondaryLight,
    onSecondary = onSecondaryLight,
    secondaryContainer = secondaryContainerLight,
    onSecondaryContainer = onSecondaryContainerLight,
    tertiary = tertiaryLight,
    onTertiary = onTertiaryLight,
    tertiaryContainer = tertiaryContainerLight,
    onTertiaryContainer = onTertiaryContainerLight,
    error = errorLight,
    onError = onErrorLight,
    errorContainer = errorContainerLight,
    onErrorContainer = onErrorContainerLight,
    background = backgroundLight,
    onBackground = onBackgroundLight,
    surface = surfaceLight,
    onSurface = onSurfaceLight,
    surfaceVariant = surfaceVariantLight,
    onSurfaceVariant = onSurfaceVariantLight,
    outline = outlineLight,
    outlineVariant = outlineVariantLight,
    inverseSurface = inverseSurfaceLight,
    inverseOnSurface = inverseOnSurfaceLight,
    inversePrimary = inversePrimaryLight,
    surfaceContainerLowest = surfaceLight,
    surfaceContainerLow = Color(0xFFF8F8FA),
    surfaceContainer = Color(0xFFEFEFF4),
    surfaceContainerHigh = Color(0xFFE9E9EE),
    surfaceContainerHighest = Color(0xFFE3E3E8)
)

private val BNBUDarkColorScheme = darkColorScheme(
    primary = primaryDark,
    onPrimary = onPrimaryDark,
    primaryContainer = primaryContainerDark,
    onPrimaryContainer = onPrimaryContainerDark,
    secondary = secondaryDark,
    onSecondary = onSecondaryDark,
    secondaryContainer = secondaryContainerDark,
    onSecondaryContainer = onSecondaryContainerDark,
    tertiary = tertiaryDark,
    onTertiary = onTertiaryDark,
    tertiaryContainer = tertiaryContainerDark,
    onTertiaryContainer = onTertiaryContainerDark,
    error = errorDark,
    onError = onErrorDark,
    errorContainer = errorContainerDark,
    onErrorContainer = onErrorContainerDark,
    background = backgroundDark,
    onBackground = onBackgroundDark,
    surface = surfaceDark,
    onSurface = onSurfaceDark,
    surfaceVariant = surfaceVariantDark,
    onSurfaceVariant = onSurfaceVariantDark,
    outline = outlineDark,
    outlineVariant = outlineVariantDark,
    inverseSurface = inverseSurfaceDark,
    inverseOnSurface = inverseOnSurfaceDark,
    inversePrimary = inversePrimaryDark,
    surfaceContainerLowest = Color.Black,
    surfaceContainerLow = Color(0xFF141416),
    surfaceContainer = surfaceDark,
    surfaceContainerHigh = Color(0xFF242426),
    surfaceContainerHighest = surfaceVariantDark
)

// ── Legacy convenience singleton ─────────────────────────────
//
// Retained for gradual migration.  Prefer `MaterialTheme.colorScheme`
// in new code; use these only where the call-site hasn't been updated yet.

object BNBUColors {
    val Ink get() = onSurfaceLight
    val Paper get() = backgroundLight
    val Surface get() = surfaceLight
    val Muted get() = onSurfaceVariantLight
    val Line get() = outlineVariantLight
    val Blue get() = primaryLight
    val BlueLight get() = primaryDark
    val BlueSoft get() = primaryContainerLight
    val Pale get() = backgroundLight
}

// ── Theme composable ─────────────────────────────────────────

@Composable
@Suppress("DEPRECATION")
fun BNBUStudentTheme(
    themeMode: AppThemeMode = AppThemeMode.Light,
    content: @Composable () -> Unit
) {
    val systemDark = isSystemInDarkTheme()
    val darkTheme = when (themeMode) {
        AppThemeMode.Light -> false
        AppThemeMode.Dark -> true
        AppThemeMode.System -> systemDark
    }
    val colorScheme = if (darkTheme) BNBUDarkColorScheme else BNBULightColorScheme
    val view = LocalView.current

    val window = (view.context as? Activity)?.window
    if (!view.isInEditMode && window != null) {
        // Keep the platform window behind Compose in the same color as the active scheme.
        // The effect only reruns for a real theme change, not for ordinary page recomposition.
        LaunchedEffect(window, colorScheme.background, darkTheme) {
            val backgroundColor = colorScheme.background.toArgb()
            window.setBackgroundDrawable(ColorDrawable(backgroundColor))
            window.statusBarColor = backgroundColor
            window.navigationBarColor = backgroundColor
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
                isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = BNBUTypography,
        shapes = BNBUShapes,
    ) {
        // Apple-style press feedback is communicated by scale, opacity and
        // elevation rather than an expanding Android ripple.
        CompositionLocalProvider(LocalIndication provides ripple(color = Color.Transparent)) {
            content()
        }
    }
}
