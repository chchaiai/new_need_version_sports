package edu.bnbu.student.mvp.feature.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Source regression guards only: these do not prove layout, TalkBack, or device back handling. */
class StudentUiAccessibilityStaticPolicyTest {
    private val minimumNormalTextContrast = 4.5

    private val projectRoot: File by lazy {
        generateSequence(File(requireNotNull(System.getProperty("user.dir"))).canonicalFile) { it.parentFile }
            .first { File(it, "app/src/main/AndroidManifest.xml").isFile }
    }

    @Test
    fun segmentedTargetsHaveMinimumSizeAndAllowLabelsToWrap() {
        val source = source("core/designsystem/Components.kt")
            .substringAfter("fun <T> SegmentedControl(")
            .substringBefore("//  ActionButton")
        assertTrue(source.contains("heightIn(min = BNBULayout.TouchTarget)"))
        assertTrue(source.contains(".selectableGroup()"))
        assertTrue(source.contains("role = Role.Tab"))
        assertTrue(source.contains("enabled = enabled"))
        assertFalse(source.contains("maxLines = 1"))
        assertFalse(source.contains("heightIn(min = 44.dp)"))
    }

    @Test
    fun rootKeepsDrawingAndKeyboardInsetsAndAnAdaptiveBottomBar() {
        val source = source("feature/shell/AppRootScreen.kt")
        assertTrue(source.contains(".safeDrawingPadding()"))
        assertTrue(source.contains(".imePadding()"))
        val bar = source.substringAfter("private fun FloatingBottomNavigationBar(")
            .substringBefore("private fun FloatingBottomNavigationItem(")
        assertTrue(bar.contains(".heightIn(min = 72.dp)"))
        assertTrue(bar.contains(".height(IntrinsicSize.Min)"))
        assertFalse(bar.contains(".height(72.dp)"))
    }

    @Test
    fun maintenanceAndErrorsAnnounceWithoutMakingExerciseTimersLiveRegions() {
        val root = source("feature/shell/AppRootScreen.kt")
        val maintenance = root.substringAfter("fun MaintenancePage(")
            .substringBefore("@Composable")
        assertTrue(maintenance.contains("verticalScroll(rememberScrollState())"))
        assertTrue(maintenance.contains("liveRegion = LiveRegionMode.Polite"))
        assertTrue(source("core/designsystem/BNBUErrorPanel.kt")
            .contains("liveRegion = LiveRegionMode.Polite"))
        assertFalse(source("feature/checkin/ExerciseCheckInScreen.kt").contains("liveRegion ="))
    }

    @Test
    fun nestedDetailsAndEmailLoginKeepTheirOwnSystemBackHandlers() {
        listOf("CheckInRecords.kt", "SwimmingDelayExplanationScreen.kt").forEach { file ->
            assertTrue(source("feature/checkin/$file").contains("BackHandler(onBack = onBack)"))
        }
        assertTrue(source("feature/shell/AppRootScreen.kt")
            .contains("BackHandler { showEmailLogin = false }"))
        listOf("EmailLoginScreen.kt", "RecoveryRequestScreen.kt").forEach { file ->
            assertTrue(source("feature/login/$file").contains("Back to sign-in options"))
        }
    }

    @Test
    fun busyJoinScreensConsumeBackInsteadOfFallingThroughToTheRoot() {
        listOf(
            "ScanJoinScreen.kt" to "isResolving",
            "EnterInviteCodeScreen.kt" to "isResolving",
            "CourseJoinConfirmScreen.kt" to "isSubmitting"
        ).forEach { (file, busyFlag) ->
            val compact = source("feature/courses/$file").filterNot(Char::isWhitespace)
            assertTrue("$file must consume back while busy",
                compact.contains("BackHandler{if(!$busyFlag)onBack()}"))
            assertFalse(compact.contains("BackHandler(enabled=!$busyFlag"))
        }
    }

    @Test
    fun returningFromAnActiveSessionNeverEndsOrSubmitsIt() {
        val source = source("feature/checkin/ExerciseCheckInScreen.kt")
        val leaveDialog = source.substringAfter("if (showLeaveSessionConfirm && hasOngoingSession)")
            .substringBefore("Column(")
        assertTrue(source.contains("BackHandler(enabled = hasOngoingSession"))
        assertTrue(leaveDialog.contains("onReturnHome()"))
        assertTrue(leaveDialog.contains("showLeaveSessionConfirm = false"))
        assertFalse(leaveDialog.contains("controller."))
    }

    @Test
    fun supplementEditingRequiresAnOpenTaskAsWellAsWriteAndServicePermission() {
        val compact = source("feature/checkin/SupplementTaskScreen.kt").filterNot(Char::isWhitespace)
        assertTrue(compact.contains(
            "valformalActionsEnabled=writeEnabled&&model.formalSubmissionAvailable&&model.state==SupplementTaskState.Open"
        ))
        assertTrue(compact.contains("enabled=formalActionsEnabled,"))
        assertTrue(compact.contains("enabled=formalActionsEnabled&&photoCount<"))
        assertTrue(compact.contains("enabled=formalActionsEnabled&&videoCount<"))
    }

    @Test
    fun helpSearchAndExpandedArticleUseSaveableUiState() {
        val source = source("feature/help/HelpCenterScreen.kt")
        assertTrue(Regex("searchQuery by rememberSaveable").containsMatchIn(source))
        assertTrue(Regex("expandedArticleId by rememberSaveable").containsMatchIn(source))
    }

    @Test
    fun exerciseCategorySelectionExposesItsRoleAndSelectedState() {
        val source = source("feature/checkin/ExerciseCheckInScreen.kt")
        val category = source.substringAfter("private fun CategoryButton(")
            .substringBefore("@Composable")
        assertTrue(source.contains(".selectableGroup()"))
        assertTrue(category.contains("role = Role.RadioButton"))
        assertTrue(category.contains("selected = selected"))
    }

    @Test
    fun semanticThemeTextPairsMeetWcagAaNormalTextContrast() {
        val colors = parseThemeColors()
        val foregroundBackgroundPairs = listOf(
            "onPrimaryLight" to "primaryLight",
            "onPrimaryDark" to "primaryDark",
            "onSecondaryLight" to "secondaryLight",
            "onSecondaryDark" to "secondaryDark",
            "onTertiaryLight" to "tertiaryLight",
            "onTertiaryDark" to "tertiaryDark",
            "onErrorLight" to "errorLight",
            "onErrorDark" to "errorDark",
            "onPrimaryContainerLight" to "primaryContainerLight",
            "onPrimaryContainerDark" to "primaryContainerDark",
            "onSecondaryContainerLight" to "secondaryContainerLight",
            "onSecondaryContainerDark" to "secondaryContainerDark",
            "onTertiaryContainerLight" to "tertiaryContainerLight",
            "onTertiaryContainerDark" to "tertiaryContainerDark",
            "onErrorContainerLight" to "errorContainerLight",
            "onErrorContainerDark" to "errorContainerDark",
            "onBackgroundLight" to "backgroundLight",
            "onBackgroundDark" to "backgroundDark",
            "onSurfaceLight" to "surfaceLight",
            "onSurfaceDark" to "surfaceDark",
            "onSurfaceVariantLight" to "surfaceVariantLight",
            "onSurfaceVariantDark" to "surfaceVariantDark",
            "inverseOnSurfaceLight" to "inverseSurfaceLight",
            "inverseOnSurfaceDark" to "inverseSurfaceDark"
        )
        val accentOnSurfacePairs = listOf(
            "primaryLight" to "surfaceLight",
            "secondaryLight" to "surfaceLight",
            "tertiaryLight" to "surfaceLight",
            "errorLight" to "surfaceLight",
            "primaryDark" to "surfaceDark",
            "secondaryDark" to "surfaceDark",
            "tertiaryDark" to "surfaceDark",
            "errorDark" to "surfaceDark"
        )

        (foregroundBackgroundPairs + accentOnSurfacePairs).forEach { (foreground, background) ->
            val ratio = contrastRatio(
                foreground = colors.getValue(foreground),
                background = colors.getValue(background)
            )
            assertTrue(
                "$foreground on $background is ${"%.3f".format(ratio)}:1; expected at least 4.5:1",
                ratio >= minimumNormalTextContrast
            )
        }

        listOf(
            Triple("primaryLight", "surfaceLight", 0.14),
            Triple("primaryDark", "surfaceDark", 0.14),
            Triple("secondaryLight", "surfaceLight", 0.12),
            Triple("secondaryDark", "surfaceDark", 0.12),
            Triple("tertiaryLight", "surfaceLight", 0.12),
            Triple("tertiaryDark", "surfaceDark", 0.12),
            Triple("errorLight", "surfaceLight", 0.08),
            Triple("errorDark", "surfaceDark", 0.08)
        ).forEach { (accent, surface, alpha) ->
            val accentColor = colors.getValue(accent)
            val tintedSurface = compositeOver(
                foreground = accentColor,
                background = colors.getValue(surface),
                alpha = alpha
            )
            val ratio = contrastRatio(accentColor, tintedSurface)
            assertTrue(
                "$accent on its $alpha tint is ${"%.3f".format(ratio)}:1; expected at least 4.5:1",
                ratio >= minimumNormalTextContrast
            )
        }
    }

    @Test
    fun checkInUiUsesThemeRolesInsteadOfLegacyFixedAccentColors() {
        val legacyAccent = Regex("Color\\(0xFF(?:007AFF|34C759|FF9500)\\)")
        listOf(
            "ExerciseCheckInScreen.kt",
            "ExerciseEvidenceScreen.kt",
            "ExerciseSubmissionScreen.kt",
            "SessionMediaManager.kt",
            "SupplementResultScreen.kt",
            "SupplementTaskScreen.kt",
            "SwimmingDelayExplanationScreen.kt"
        ).forEach { file ->
            val source = source("feature/checkin/$file")
            assertFalse("$file must use semantic theme accents", legacyAccent.containsMatchIn(source))
            assertFalse(
                "$file must pair filled primary controls with onPrimary",
                source.contains("contentColor = Color.White")
            )
        }
    }

    private fun parseThemeColors(): Map<String, Long> {
        val theme = source("core/designsystem/Theme.kt")
        val explicit = Regex("private val (\\w+) = Color\\(0xFF([0-9A-Fa-f]{6})\\)")
            .findAll(theme)
            .associate { match -> match.groupValues[1] to match.groupValues[2].toLong(16) }
        val named = Regex("private val (\\w+) = Color\\.(White|Black)")
            .findAll(theme)
            .associate { match ->
                match.groupValues[1] to if (match.groupValues[2] == "White") 0xFFFFFFL else 0x000000L
            }
        return explicit + named
    }

    private fun contrastRatio(foreground: Long, background: Long): Double {
        val foregroundLuminance = relativeLuminance(foreground)
        val backgroundLuminance = relativeLuminance(background)
        val lighter = maxOf(foregroundLuminance, backgroundLuminance)
        val darker = minOf(foregroundLuminance, backgroundLuminance)
        return (lighter + 0.05) / (darker + 0.05)
    }

    private fun relativeLuminance(rgb: Long): Double {
        fun channel(shift: Int): Double {
            val encoded = ((rgb shr shift) and 0xFF).toDouble() / 255.0
            return if (encoded <= 0.04045) {
                encoded / 12.92
            } else {
                Math.pow((encoded + 0.055) / 1.055, 2.4)
            }
        }
        return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0)
    }

    private fun compositeOver(foreground: Long, background: Long, alpha: Double): Long {
        fun channel(shift: Int): Long {
            val foregroundChannel = (foreground shr shift) and 0xFF
            val backgroundChannel = (background shr shift) and 0xFF
            return Math.round(foregroundChannel * alpha + backgroundChannel * (1.0 - alpha))
        }
        return (channel(16) shl 16) or (channel(8) shl 8) or channel(0)
    }

    private fun source(relativePath: String): String = File(
        projectRoot, "app/src/main/java/edu/bnbu/student/mvp/$relativePath"
    ).readText()
}
