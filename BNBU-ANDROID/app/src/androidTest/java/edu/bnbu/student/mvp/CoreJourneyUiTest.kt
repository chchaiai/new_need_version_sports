package edu.bnbu.student.mvp

import android.Manifest
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import edu.bnbu.student.mvp.core.designsystem.BNBUStudentTheme
import edu.bnbu.student.mvp.core.local.AndroidAppLocalStore
import edu.bnbu.student.mvp.core.model.SystemMode
import edu.bnbu.student.mvp.core.model.SystemModeStatus
import edu.bnbu.student.mvp.core.state.StudentAppState
import edu.bnbu.student.mvp.core.review.LocalReviewWorkspaceProvider
import edu.bnbu.student.mvp.feature.checkin.session.ExerciseSessionController
import edu.bnbu.student.mvp.feature.shell.AppRootScreen
import edu.bnbu.student.mvp.feature.login.ContactBindingMode
import edu.bnbu.student.mvp.feature.login.ContactBindingScreen
import edu.bnbu.student.mvp.feature.courses.CourseJoinConfirmScreen
import edu.bnbu.student.mvp.feature.courses.CourseJoinInfo
import edu.bnbu.student.mvp.feature.exemption.ExemptionScreen
import edu.bnbu.student.mvp.feature.shell.MaintenanceSupplementTimingUiModel
import edu.bnbu.student.mvp.feature.shell.StartupGateScreen
import java.io.File
import java.time.Instant
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.assertTrue

/**
 * Device/emulator regression coverage for the critical student journey.
 *
 * Authentication and enrollment remain server-owned. These device tests verify
 * the formal pre-authentication and activation surfaces without manufacturing a
 * local student session. Full submission still requires a camera and backend.
 * The explicit review-navigation tests below use debug-only synthetic data and
 * a null repository. They do not validate authentication or submission.
 * Run only on a disposable, dedicated test installation: setup/teardown clear app state.
 */
@RunWith(AndroidJUnit4::class)
class CoreJourneyUiTest {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    private lateinit var localStore: AndroidAppLocalStore
    private lateinit var appState: StudentAppState
    private lateinit var exerciseController: ExerciseSessionController

    @Test
    fun startupLoadingIsVisibleWhileTheServiceModeIsBeingChecked() {
        composeRule.setContent {
            BNBUStudentTheme {
                StartupGateScreen(
                    state = StartupSurfaceState.LOADING,
                    allowLocalReview = false,
                    onRetry = {},
                    onEnterLocalReview = {}
                )
            }
        }

        composeRule.onNodeWithTag("startup.loading").assertIsDisplayed()
        composeRule.onNodeWithTag("startup.loadingIndicator").assertIsDisplayed()
    }

    @Test
    fun startupErrorExposesRetryAndExplicitDebugReviewActions() {
        var retryCount = 0
        var localReviewCount = 0
        composeRule.setContent {
            BNBUStudentTheme {
                StartupGateScreen(
                    state = StartupSurfaceState.ERROR,
                    allowLocalReview = true,
                    onRetry = { retryCount += 1 },
                    onEnterLocalReview = { localReviewCount += 1 }
                )
            }
        }

        composeRule.onNodeWithTag("startup.error").assertIsDisplayed()
        composeRule.onNodeWithTag("startup.retry").assertIsDisplayed().performClick()
        composeRule.onNodeWithTag("startup.localReview").assertIsDisplayed().performClick()
        assertTrue(retryCount == 1)
        assertTrue(localReviewCount == 1)
    }

    @Before
    fun setUp() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        localStore = AndroidAppLocalStore(context)
        localStore.clearAll()
        localStore.agreePrivacyPolicy(BuildConfig.PRIVACY_POLICY_VERSION, Instant.now().toString())
        localStore.markPreLoginCourseGuideCompleted()

        appState = StudentAppState(localStore = localStore, cacheDir = context.cacheDir)
        exerciseController = ExerciseSessionController(
            localStore = localStore,
            mediaRootDirectory = File(context.cacheDir, "core-journey-ui-test")
        )
    }

    private fun setAppRootContent(
        maintenanceSupplementTiming: MaintenanceSupplementTimingUiModel =
            MaintenanceSupplementTimingUiModel.Unavailable
    ) {
        composeRule.setContent {
            BNBUStudentTheme {
                AppRootScreen(
                    appState = appState,
                    exerciseSessionController = exerciseController,
                    localStore = localStore,
                    maintenanceSupplementTiming = maintenanceSupplementTiming
                )
            }
        }
    }

    @After
    fun tearDown() {
        exerciseController.destroy()
        localStore.clearAll()
    }

    @Test
    fun formalLogin_exposesOnlyServerBackedEntryPoints() {
        setAppRootContent()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            runCatching {
                composeRule.onNodeWithTag("login.email").assertIsEnabled()
            }.isSuccess
        }
        composeRule.onNodeWithTag("login.email").assertIsEnabled().assertIsDisplayed()
        composeRule.onNodeWithTag("login.scanJoin").assertIsEnabled().assertIsDisplayed()
        composeRule.onNodeWithTag("login.recoveryRequest").assertIsDisplayed()
        assertTrue(composeRule.onAllNodesWithTag("login.mockUser").fetchSemanticsNodes().isEmpty())
        assertTrue(composeRule.onAllNodesWithTag("screen.checkIn").fetchSemanticsNodes().isEmpty())
    }

    @Test
    fun maintenance_showsServerConfirmedPausedSupplementTiming() {
        composeRule.runOnUiThread {
            appState.updateSystemMode(
                SystemModeStatus(
                    mode = SystemMode.MAINTENANCE,
                    message = "系统维护期间暂停普通业务访问。",
                    estimatedRecoveryTime = "2026-09-05 16:00（Asia/Shanghai）"
                )
            )
        }
        setAppRootContent(
            maintenanceSupplementTiming = MaintenanceSupplementTimingUiModel.Paused(
                serverConfirmedRemainingSeconds = 18 * 60 * 60L + 24 * 60L
            )
        )

        composeRule.onNodeWithTag("screen.maintenance").assertIsDisplayed()
        composeRule.onNodeWithTag("maintenance.supplementTiming").assertIsDisplayed()
        composeRule.onNodeWithText("计时已暂停").assertIsDisplayed()
        composeRule.onNodeWithText("剩余时间（服务器确认）：18小时24分钟").assertIsDisplayed()
        assertTrue(composeRule.onAllNodesWithTag("screen.checkIn").fetchSemanticsNodes().isEmpty())
    }

    @Test
    fun maintenance_remainsBlockingUntilTheServerConfirmsNormal() {
        composeRule.runOnUiThread {
            appState.updateSystemMode(
                SystemModeStatus(
                    mode = SystemMode.MAINTENANCE,
                    estimatedRecoveryTime = "2026-09-05 00:00（Asia/Shanghai）"
                )
            )
        }
        setAppRootContent(
            maintenanceSupplementTiming = MaintenanceSupplementTimingUiModel.Paused(
                serverConfirmedRemainingSeconds = 45 * 60L
            )
        )

        composeRule.onNodeWithTag("screen.maintenance").assertIsDisplayed()
        composeRule.onNodeWithText("剩余时间（服务器确认）：45分钟").assertIsDisplayed()

        composeRule.runOnUiThread {
            appState.updateSystemMode(SystemModeStatus(mode = SystemMode.NORMAL))
        }
        composeRule.waitForIdle()

        assertTrue(composeRule.onAllNodesWithTag("screen.maintenance").fetchSemanticsNodes().isEmpty())
        composeRule.onNodeWithTag("login.email").assertIsDisplayed()
    }

    @Test
    fun scanEntry_hasNoSimulatedSuccessAndOpensDedicatedManualInput() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.uiAutomation.grantRuntimePermission(
            instrumentation.targetContext.packageName,
            Manifest.permission.CAMERA
        )
        setAppRootContent()
        composeRule.waitUntil(timeoutMillis = 5_000) {
            runCatching {
                composeRule.onNodeWithTag("login.scanJoin").assertIsEnabled()
            }.isSuccess
        }
        composeRule.onNodeWithTag("login.scanJoin").performClick()
        composeRule.onNodeWithTag("screen.courseJoin.scan").assertIsDisplayed()
        composeRule.onNodeWithTag("courseJoin.scan.camera").assertIsDisplayed()
        assertTrue(
            composeRule.onAllNodesWithTag("courseJoin.scan.simulateSuccess")
                .fetchSemanticsNodes()
                .isEmpty()
        )
        composeRule.onNodeWithTag("courseJoin.scan.manualInput")
            .assertIsDisplayed()
            .performClick()
        composeRule.onNodeWithTag("screen.courseJoin.enterCode").assertIsDisplayed()
        composeRule.onNodeWithTag("courseJoin.enterCode.input").assertIsDisplayed()
        composeRule.onNodeWithTag("courseJoin.enterCode.submit").assertIsNotEnabled()
        assertTrue(composeRule.onAllNodesWithTag("screen.courseJoinConfirm").fetchSemanticsNodes().isEmpty())
    }

    @Test
    fun requiredActivation_isFocusedAndDoesNotOfferWorkspaceNavigation() {
        composeRule.setContent {
            BNBUStudentTheme {
                ContactBindingScreen(
                    mode = ContactBindingMode.RequiredActivation,
                    localStore = localStore,
                    currentEmailMasked = null,
                    currentEmailVerified = false,
                    expectedUserVersion = 1,
                    onCurrentUserUpdated = {},
                    onBindingComplete = {},
                    onLogout = {},
                    onOpenPrivacy = {},
                    onOpenHelp = {}
                )
            }
        }

        composeRule.onNodeWithTag("screen.emailSecurity").assertIsDisplayed()
        composeRule.onNodeWithTag("emailSecurity.logout").assertIsDisplayed()
        composeRule.onNodeWithTag("emailSecurity.privacy").assertIsDisplayed()
        composeRule.onNodeWithTag("emailSecurity.help").assertIsDisplayed()
        assertTrue(composeRule.onAllNodesWithTag("emailSecurity.back").fetchSemanticsNodes().isEmpty())
        assertTrue(composeRule.onAllNodesWithTag("screen.checkIn").fetchSemanticsNodes().isEmpty())

        composeRule.activityRule.scenario.onActivity {
            it.onBackPressedDispatcher.onBackPressed()
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("screen.emailSecurity").assertIsDisplayed()
    }

    @Test
    fun courseJoinForm_hasOnlyMaleAndFemaleAndStartsDisabled() {
        val serverCourse = CourseJoinInfo(
            id = "section-test",
            name = "体育课程",
            teacher = "测试教师",
            semester = "测试学期"
        )
        composeRule.setContent {
            BNBUStudentTheme {
                CourseJoinConfirmScreen(
                    inviteCode = "0123456789abcdef",
                    course = serverCourse,
                    submitCourseJoin = { error("Submit must remain disabled for an empty form") }
                )
            }
        }

        composeRule.onNodeWithTag("screen.courseJoinConfirm").assertIsDisplayed()
        composeRule.onNodeWithTag("courseJoinConfirm.gender.male").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithTag("courseJoinConfirm.gender.female").assertIsDisplayed()
        assertTrue(composeRule.onAllNodesWithTag("courseJoinConfirm.gender.other").fetchSemanticsNodes().isEmpty())
        composeRule.onNodeWithTag("courseJoinConfirm.submit").assertIsNotEnabled()
    }

    @Test
    fun managedContacts_canReplaceAnAlreadyVerifiedMethod() {
        composeRule.setContent {
            BNBUStudentTheme {
                ContactBindingScreen(
                    mode = ContactBindingMode.ManageContacts,
                    localStore = localStore,
                    currentEmailMasked = "s***@example.edu.cn",
                    currentEmailVerified = true,
                    expectedUserVersion = 2,
                    onCurrentUserUpdated = {},
                    onBindingComplete = {},
                    onBack = {}
                )
            }
        }

        composeRule.onNodeWithTag("screen.emailSecurity").assertIsDisplayed()
        composeRule.onNodeWithTag("emailSecurity.back").assertIsDisplayed()
        composeRule.onNodeWithText("修改邮箱").assertIsDisplayed()
        composeRule.onNodeWithText("当前邮箱：s***@example.edu.cn").assertIsDisplayed()
        composeRule.onNodeWithText("验证码将分别发送到当前邮箱和新邮箱。").assertIsDisplayed()
        composeRule.onNodeWithTag("emailSecurity.newEmail").assertIsDisplayed()
    }

    @Test
    fun emailLogin_systemBackReturnsToSignInChoices() {
        setAppRootContent()
        composeRule.onNodeWithTag("login.email").assertIsEnabled().performClick()
        composeRule.onNodeWithContentDescription("返回登录方式").assertIsDisplayed()

        pressSystemBack()

        composeRule.onNodeWithTag("login.email").assertIsDisplayed()
        composeRule.onNodeWithTag("login.scanJoin").assertIsDisplayed()
    }

    @Test
    fun localReview_fiveMainTabsKeepSelectionAndBackReturnsHome() {
        enterSyntheticReviewWorkspace()
        setAppRootContent()
        composeRule.onNodeWithTag("banner.localReview").assertIsDisplayed()
        val tabRole = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Tab)
        composeRule.onAllNodes(tabRole).assertCountEquals(5)

        listOf("课程", "打卡", "记录与进度", "我的").forEach { label ->
            composeRule.onNode(hasText(label) and tabRole).performClick().assertIsSelected()
            when (label) {
                "打卡" -> composeRule.onNodeWithTag("screen.checkIn").assertIsDisplayed()
                "记录与进度" -> composeRule.onNodeWithTag("screen.recordsProgress").assertIsDisplayed()
            }
            pressSystemBack()
            composeRule.onNode(hasText("首页") and tabRole).assertIsSelected()
        }
    }

    @Test
    fun localReview_supplementPreviewReturnsWithoutSubmitting() {
        enterSyntheticReviewWorkspace()
        setAppRootContent()
        val tabRole = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Tab)
        composeRule.onNode(hasText("记录与进度") and tabRole).performClick()
        composeRule.onNodeWithTag("recordsProgress.supplementReviewEntry")
            .performScrollTo().performClick()
        composeRule.onNodeWithTag("screen.supplementTask").assertIsDisplayed()
        composeRule.onNodeWithTag("reviewReason.fixedCategory")
            .performScrollTo().assertTextEquals("必需材料缺失（含要求的前后照）")
        composeRule.onNodeWithTag("reviewReason.publicNote")
            .assertTextEquals("请补充能够说明本次运动现场与时间连续性的材料。")
        composeRule.onNodeWithTag("reviewReason.catalog").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithTag("reviewReason.systemOverdue")
            .performScrollTo().assertTextEquals("补证逾期")
        composeRule.onNodeWithTag("supplement.submit").performScrollTo().assertIsNotEnabled()
        composeRule.onNodeWithText("查看“已接收”评审样例").performScrollTo().performClick()
        composeRule.onNodeWithTag("screen.supplementResult").assertIsDisplayed()
        composeRule.onNodeWithTag("reviewReason.fixedCategory")
            .performScrollTo().assertTextEquals("必需材料缺失（含要求的前后照）")

        pressSystemBack()
        composeRule.onNodeWithTag("screen.supplementTask").assertIsDisplayed()
        pressSystemBack()
        composeRule.onNodeWithTag("screen.recordsProgress").assertIsDisplayed()
        assertTrue(appState.apiRepository == null)
    }

    @Test
    fun localReview_recordsExposeTheCompleteReviewStageMatrixWithoutCollapsingStates() {
        enterSyntheticReviewWorkspace()
        setAppRootContent()
        val tabRole = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Tab)
        composeRule.onNode(hasText("记录与进度") and tabRole).performClick()

        composeRule.onNodeWithTag("reviewStage.catalog").performScrollTo().assertIsDisplayed()
        mapOf(
            "PendingAiCheck" to "待 AI 检查",
            "PendingTeacherReview" to "待教师复核",
            "PendingStudentSupplement" to "待补证",
            "SupplementReceivedPendingTeacherReview" to "补证已接收 · 待教师复核",
            "TechnicalProcessing" to "技术处理中",
            "ValidCredited" to "有效 · 已计入",
            "ValidNotCredited" to "有效 · 未计入",
            "Invalid" to "无效",
            "StageUnavailable" to "审核阶段暂不可用"
        ).forEach { (tagSuffix, expectedText) ->
            composeRule.onNodeWithTag("reviewStage.catalog.$tagSuffix")
                .performScrollTo()
                .assertTextEquals(expectedText)
        }
        assertTrue(appState.apiRepository == null)
    }

    private fun enterSyntheticReviewWorkspace() {
        val workspace = requireNotNull(LocalReviewWorkspaceProvider.workspaceFactory).invoke()
        localStore.markPostEnrollmentGuideCompleted(workspace.student.id)
        composeRule.runOnUiThread { appState.enterLocalReview(workspace) }
        assertTrue(appState.isLocalReviewMode)
        assertTrue(appState.apiRepository == null)
    }

    private fun pressSystemBack() {
        composeRule.activityRule.scenario.onActivity {
            it.onBackPressedDispatcher.onBackPressed()
        }
        composeRule.waitForIdle()
    }

    @Test
    fun exemptionDetail_showsImageOnlyEvidenceAsAThumbnail() {
        val workspace = requireNotNull(LocalReviewWorkspaceProvider.workspaceFactory).invoke()
        composeRule.runOnUiThread { appState.enterLocalReview(workspace) }
        assertTrue(appState.workspace.exemptions.isNotEmpty())
        composeRule.setContent {
            BNBUStudentTheme {
                ExemptionScreen(
                    appState = appState,
                    repository = null,
                    onUnauthorized = {},
                    onBack = {}
                )
            }
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("800m 免测").assertIsDisplayed().performClick()
        composeRule.onNodeWithText("证明材料").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("1 张图片").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("medical_certificate.jpg").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("证明图片 1 缩略图").assertIsDisplayed()
        assertTrue(composeRule.onAllNodesWithText("medical_note.pdf").fetchSemanticsNodes().isEmpty())
    }
}
