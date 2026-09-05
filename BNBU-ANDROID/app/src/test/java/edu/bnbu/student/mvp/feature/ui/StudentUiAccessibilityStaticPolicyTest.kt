package edu.bnbu.student.mvp.feature.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Source regression guards only: these do not prove layout, TalkBack, or device back handling. */
class StudentUiAccessibilityStaticPolicyTest {
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
        val maintenance = root.substringAfter("private fun MaintenancePage(")
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

    private fun source(relativePath: String): String = File(
        projectRoot, "app/src/main/java/edu/bnbu/student/mvp/$relativePath"
    ).readText()
}

