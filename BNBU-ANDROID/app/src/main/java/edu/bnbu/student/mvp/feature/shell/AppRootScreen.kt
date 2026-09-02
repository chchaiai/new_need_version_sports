package edu.bnbu.student.mvp.feature.shell

import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalActivity
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.togetherWith
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.AddBox
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material3.Icon
import edu.bnbu.student.mvp.core.designsystem.AppleIconButton as IconButton
import androidx.compose.material3.CircularProgressIndicator
import edu.bnbu.student.mvp.core.designsystem.AppleButton as Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.IntOffset
import edu.bnbu.student.mvp.BuildConfig
import edu.bnbu.student.mvp.R
import edu.bnbu.student.mvp.core.designsystem.BNBULayout
import edu.bnbu.student.mvp.core.designsystem.BNBUMotion
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.local.AndroidAppLocalStore
import edu.bnbu.student.mvp.core.model.SystemMode
import edu.bnbu.student.mvp.core.model.StudentWorkspace
import edu.bnbu.student.mvp.core.model.safeStudentNumberOrNull
import edu.bnbu.student.mvp.core.network.CourseJoinRequestBody
import edu.bnbu.student.mvp.core.network.v1.V1CourseJoinCoordinator
import edu.bnbu.student.mvp.core.network.v1.V1CourseJoinIdentity
import edu.bnbu.student.mvp.core.network.v1.generated.Gender
import edu.bnbu.student.mvp.core.state.StudentAppState
import edu.bnbu.student.mvp.feature.checkin.CheckInScreen
import edu.bnbu.student.mvp.feature.checkin.session.ExerciseSessionController
import edu.bnbu.student.mvp.feature.courses.CourseJoinConfirmScreen
import edu.bnbu.student.mvp.feature.courses.CourseJoinCompletion
import edu.bnbu.student.mvp.feature.courses.CourseJoinInfo
import edu.bnbu.student.mvp.feature.courses.CoursesScreen
import edu.bnbu.student.mvp.feature.courses.EnterInviteCodeScreen
import edu.bnbu.student.mvp.feature.courses.ScanJoinScreen
import edu.bnbu.student.mvp.feature.courses.toCourseJoinInfo
import edu.bnbu.student.mvp.feature.dashboard.DashboardScreen
import edu.bnbu.student.mvp.feature.grades.GradesScreen
import edu.bnbu.student.mvp.feature.guide.PostEnrollmentGuideScreen
import edu.bnbu.student.mvp.feature.guide.PreLoginCourseGuideScreen
import edu.bnbu.student.mvp.feature.help.HelpCenterScreen
import edu.bnbu.student.mvp.feature.login.EmailLoginScreen
import edu.bnbu.student.mvp.feature.login.LoginScreen
import edu.bnbu.student.mvp.feature.login.RecoveryRequestScreen
import edu.bnbu.student.mvp.feature.login.ContactBindingMode
import edu.bnbu.student.mvp.feature.login.ContactBindingScreen
import edu.bnbu.student.mvp.feature.login.ContactActivationHelpScreen
import edu.bnbu.student.mvp.feature.notifications.NotificationSheet
import edu.bnbu.student.mvp.feature.profile.AccountDetailsScreen
import edu.bnbu.student.mvp.feature.profile.AccountDeletionScreen
import edu.bnbu.student.mvp.feature.profile.ProfileSettingsScreen
import edu.bnbu.student.mvp.feature.profile.PrivacyPolicyScreen
import edu.bnbu.student.mvp.feature.profile.ProfileScreen
import edu.bnbu.student.mvp.feature.scoring.EnduranceScoringScreen
import edu.bnbu.student.mvp.feature.exemption.ExemptionScreen
import edu.bnbu.student.mvp.feature.feedback.FeedbackScreen
import edu.bnbu.student.mvp.feature.settings.AboutScreen
import edu.bnbu.student.mvp.feature.settings.ChangelogScreen
import java.time.Instant

enum class AppTab(
    val label: String,
    val icon: ImageVector?
) {
    Dashboard("首页", null),
    Courses("课程", Icons.AutoMirrored.Filled.MenuBook),
    CheckIn("打卡", Icons.Filled.AddBox),
    Grades("运动进度", Icons.Filled.BarChart),
    Profile("我的", Icons.Filled.AccountCircle)
}

enum class SubScreen {
    None,
    ScanJoin,
    EnterCode,
    CourseJoinConfirm,
    EnduranceScoring,
    Exemption,
    AccountDetails,
    Settings,
    ContactBinding,
    AccountDeletion,
    PrivacyPolicy,
    HelpCenter,
    Feedback,
    About,
    Changelog
}

private enum class AuthUiState {
    PrivacyConsent,
    Authenticated,
    Login
}

private enum class ActivationSupportScreen {
    Privacy,
    Help
}

private suspend fun V1CourseJoinCoordinator.resolveCourseInvite(
    inviteCode: String
): CourseJoinInfo {
    val preview = preview(inviteCode)
    check(preview.enrollmentOpen) { "ENROLLMENT_CLOSED" }
    return preview.toCourseJoinInfo()
}

private suspend fun V1CourseJoinCoordinator.submitCourseJoin(
    inviteCode: String,
    expectedClassSectionId: String,
    body: CourseJoinRequestBody
): CourseJoinCompletion.Authoritative {
    val gender = when (body.gender.trim().lowercase()) {
        "male" -> Gender.MALE
        "female" -> Gender.FEMALE
        else -> throw IllegalArgumentException("GENDER_UNSUPPORTED")
    }
    val gradeYear = body.grade.trim().toIntOrNull()
        ?: throw IllegalArgumentException("GRADE_YEAR_INVALID")
    return CourseJoinCompletion.Authoritative(
        currentUser = join(
            inviteToken = inviteCode,
            expectedClassSectionId = expectedClassSectionId,
            identity = V1CourseJoinIdentity(
                fullName = body.studentName,
                studentNumber = body.studentNumber,
                gender = gender,
                gradeYear = gradeYear
            )
        )
    )
}

@Composable
internal fun AppRootScreen(
    appState: StudentAppState,
    exerciseSessionController: ExerciseSessionController,
    localStore: AndroidAppLocalStore,
    initialPrivacyConsentRequired: Boolean = false,
    onPrivacyConsentAccepted: () -> Unit = {},
    onInitialTargetReady: () -> Unit = {},
    onRequestNotificationPermission: () -> Unit = {},
    localReviewWorkspaceFactory: (() -> StudentWorkspace)? = null
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .onGloballyPositioned { onInitialTargetReady() }
    ) {
        when (appState.systemMode) {
            SystemMode.MAINTENANCE -> MaintenancePage(
                message = appState.systemModeStatus.message,
                estimatedRecoveryTime = appState.systemModeStatus.estimatedRecoveryTime
            )
            SystemMode.NORMAL -> {
                val plannedMaintenanceAt = appState.systemModeStatus.plannedMaintenanceAt
                if (plannedMaintenanceAt == null) {
                    AppRootContent(
                        appState = appState,
                        exerciseSessionController = exerciseSessionController,
                        localStore = localStore,
                        initialPrivacyConsentRequired = initialPrivacyConsentRequired,
                        onPrivacyConsentAccepted = onPrivacyConsentAccepted,
                        onRequestNotificationPermission = onRequestNotificationPermission,
                        localReviewWorkspaceFactory = localReviewWorkspaceFactory
                    )
                } else {
                    Column(modifier = Modifier.fillMaxSize()) {
                        PlannedMaintenanceBanner(
                            plannedMaintenanceAt = plannedMaintenanceAt,
                            message = appState.systemModeStatus.message
                        )
                        Box(modifier = Modifier.weight(1f)) {
                            AppRootContent(
                                appState = appState,
                                exerciseSessionController = exerciseSessionController,
                                localStore = localStore,
                                initialPrivacyConsentRequired = initialPrivacyConsentRequired,
                                onPrivacyConsentAccepted = onPrivacyConsentAccepted,
                                onRequestNotificationPermission = onRequestNotificationPermission,
                                localReviewWorkspaceFactory = localReviewWorkspaceFactory
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AppRootContent(
    appState: StudentAppState,
    exerciseSessionController: ExerciseSessionController,
    localStore: AndroidAppLocalStore,
    initialPrivacyConsentRequired: Boolean,
    onPrivacyConsentAccepted: () -> Unit,
    onRequestNotificationPermission: () -> Unit,
    localReviewWorkspaceFactory: (() -> StudentWorkspace)?
) {
    val courseJoinCoordinator = remember(localStore) {
        V1CourseJoinCoordinator.create(localStore)
    }
    LaunchedEffect(appState.isAuthenticated, appState.workspace.student.id, appState.requiresContactBinding) {
        exerciseSessionController.bindAccount(
            accountId = if (appState.isAuthenticated && !appState.requiresContactBinding) {
                appState.workspace.student.id
            } else {
                ""
            },
            // A server-side activation requirement hides drafts until activation;
            // it must not delete a student's existing local exercise work.
            preserveExistingDrafts = appState.isAuthenticated && appState.requiresContactBinding
        )
    }
    var showLoginPrivacy by rememberSaveable { mutableStateOf(false) }
    var loginPrivacyAccepted by rememberSaveable(initialPrivacyConsentRequired) {
        mutableStateOf(!initialPrivacyConsentRequired)
    }
    var showEmailLogin by rememberSaveable { mutableStateOf(false) }
    var showRecoveryRequest by rememberSaveable { mutableStateOf(false) }
    var showScanJoin by rememberSaveable { mutableStateOf(false) }
    var needsPrivacyConsent by rememberSaveable(initialPrivacyConsentRequired) {
        mutableStateOf(initialPrivacyConsentRequired)
    }
    var pendingInviteCode by rememberSaveable { mutableStateOf<String?>(null) }
    var pendingInviteCourse by remember { mutableStateOf<CourseJoinInfo?>(null) }
    var activationSupportScreen by rememberSaveable { mutableStateOf<ActivationSupportScreen?>(null) }
    val accountId = appState.workspace.student.id
    var preLoginCourseGuideCompleted by remember {
        mutableStateOf(localStore.hasCompletedPreLoginCourseGuide())
    }
    var postEnrollmentGuideCompleted by remember(accountId) {
        mutableStateOf(localStore.hasCompletedPostEnrollmentGuide(accountId))
    }

    fun completePreLoginCourseGuide() {
        localStore.markPreLoginCourseGuideCompleted()
        preLoginCourseGuideCompleted = true
    }

    fun completePostEnrollmentGuide() {
        localStore.markPostEnrollmentGuideCompleted(accountId)
        postEnrollmentGuideCompleted = true
    }

    val authUiState = when {
        needsPrivacyConsent -> AuthUiState.PrivacyConsent
        appState.isAuthenticated -> AuthUiState.Authenticated
        else -> AuthUiState.Login
    }
    LaunchedEffect(authUiState, appState.requiresContactBinding) {
        if (
            authUiState == AuthUiState.Authenticated &&
            !appState.requiresContactBinding &&
            !appState.isLocalReviewMode
        ) {
            onRequestNotificationPermission()
        }
    }
    AnimatedContent(
        targetState = authUiState,
        modifier = Modifier.fillMaxSize(),
        transitionSpec = {
            val direction = if (targetState == AuthUiState.Authenticated) 1 else -1
            (fadeIn(tween(BNBUMotion.Standard, delayMillis = 40)) +
                slideInHorizontally(
                    animationSpec = tween(BNBUMotion.Emphasized, easing = FastOutSlowInEasing),
                    initialOffsetX = { direction * (it / 10) }
                )) togetherWith
                (fadeOut(tween(BNBUMotion.Quick)) +
                    slideOutHorizontally(
                        animationSpec = tween(BNBUMotion.Standard, easing = FastOutSlowInEasing),
                        targetOffsetX = { -direction * (it / 12) }
                    ))
        },
        label = "authentication-transition"
    ) { state ->
        when (state) {
            AuthUiState.PrivacyConsent -> PrivacyConsentScreen(
                onAgree = {
                    localStore.agreePrivacyPolicy(
                        policyVersion = BuildConfig.PRIVACY_POLICY_VERSION,
                        agreedAt = Instant.now().toString()
                    )
                    loginPrivacyAccepted = true
                    needsPrivacyConsent = false
                    onPrivacyConsentAccepted()
                },
                onDecline = appState::logout
            )
            AuthUiState.Authenticated -> {
                if (appState.requiresContactBinding) {
                    when (activationSupportScreen) {
                        ActivationSupportScreen.Privacy -> PrivacyPolicyScreen(
                            onBack = { activationSupportScreen = null }
                        )
                        ActivationSupportScreen.Help -> ContactActivationHelpScreen(
                            onBack = { activationSupportScreen = null }
                        )
                        null -> {
                            ContactBindingScreen(
                                mode = ContactBindingMode.RequiredActivation,
                                localStore = localStore,
                                currentEmailMasked = appState.contactStatus.email.masked
                                    ?.takeIf { appState.contactStatus.email.verified && it.isNotBlank() }
                                    ?: appState.workspace.student.email,
                                currentEmailVerified = appState.contactStatus.email.verified,
                                expectedUserVersion = appState.currentUserVersion,
                                onCurrentUserUpdated = appState::acceptV1ContactActivation,
                                onBindingComplete = {},
                                onLogout = appState::logout,
                                onOpenPrivacy = { activationSupportScreen = ActivationSupportScreen.Privacy },
                                onOpenHelp = { activationSupportScreen = ActivationSupportScreen.Help },
                                activationLoading = appState.isPreparingActivatedWorkspace,
                                activationError = appState.contactActivationLoadError,
                                onRetryActivation = appState::retryContactActivationWorkspace
                            )
                        }
                    }
                } else if (appState.hasActiveEnrollment && !postEnrollmentGuideCompleted) {
                    PostEnrollmentGuideScreen(
                        onFinish = ::completePostEnrollmentGuide
                    )
                } else {
                    AuthenticatedAppContent(
                        appState = appState,
                        exerciseSessionController = exerciseSessionController,
                        localStore = localStore
                    )
                }
            }
            AuthUiState.Login -> {
                val inviteCode = pendingInviteCode
                val inviteCourse = pendingInviteCourse
                if (inviteCode != null && inviteCourse != null) {
                    CourseJoinConfirmScreen(
                        inviteCode = inviteCode,
                        course = inviteCourse,
                        initialName = appState.workspace.student.name,
                        initialStudentNumber = appState.workspace.student.safeStudentNumberOrNull().orEmpty(),
                        initialGender = appState.workspace.student.gender,
                        initialGrade = appState.workspace.student.gradeLevel,
                        writeEnabled = appState.isWriteAllowed,
                        activeCourseId = appState.workspace.courses.firstOrNull {
                            it.isCurrent && it.hasActiveMembership
                        }?.id,
                        onBack = {
                            pendingInviteCode = null
                            pendingInviteCourse = null
                            showScanJoin = true
                        },
                        onJoined = { completion ->
                            when (completion) {
                                is CourseJoinCompletion.Authoritative ->
                                    appState.acceptV1Authentication(completion.currentUser)
                            }
                            pendingInviteCode = null
                            pendingInviteCourse = null
                            showScanJoin = false
                        },
                        submitCourseJoin = { body ->
                            courseJoinCoordinator.submitCourseJoin(
                                inviteCode = inviteCode,
                                expectedClassSectionId = inviteCourse.id,
                                body = body
                            )
                        }
                    )
                } else if (showScanJoin) {
                    ScanJoinScreen(
                        onInviteResolved = { code, course ->
                            pendingInviteCode = code
                            pendingInviteCourse = course
                            showScanJoin = false
                        },
                        onBack = { showScanJoin = false },
                        resolveInvite = courseJoinCoordinator::resolveCourseInvite
                    )
                } else if (showRecoveryRequest) {
                    RecoveryRequestScreen(onBack = { showRecoveryRequest = false })
                } else if (showEmailLogin) {
                    EmailLoginScreen(
                        localStore = localStore,
                        onLoginSuccess = { current ->
                            appState.acceptV1Authentication(current)
                            showEmailLogin = false
                        },
                        onBack = { showEmailLogin = false }
                    )
                } else if (!preLoginCourseGuideCompleted) {
                    PreLoginCourseGuideScreen(
                        onStartJoin = {
                            completePreLoginCourseGuide()
                            showScanJoin = true
                        },
                        onSkipToLogin = ::completePreLoginCourseGuide
                    )
                } else if (showLoginPrivacy) {
                    PreLoginPrivacyScreen(onBack = { showLoginPrivacy = false })
                } else {
                    LoginScreen(
                        onEmailLogin = {
                            showEmailLogin = true
                        },
                        onScanJoin = {
                            showScanJoin = true
                        },
                        onRecoveryRequest = { showRecoveryRequest = true },
                        onOpenPrivacy = { showLoginPrivacy = true },
                        privacyAccepted = loginPrivacyAccepted,
                        onPrivacyAcceptedChange = { loginPrivacyAccepted = it },
                        onLocalReview = localReviewWorkspaceFactory
                            ?.takeIf { BuildConfig.BNBU_ENVIRONMENT == "local" }
                            ?.let { factory -> { appState.enterLocalReview(factory()) } }
                    )
                }
            }
        }
    }
}

@Composable
private fun LocalReviewBanner(onExit: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.tertiaryContainer)
            .padding(horizontal = 16.dp, vertical = 10.dp)
            .testTag("banner.localReview"),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = interfaceText("免登录测试模式", "Password-free review mode"),
                color = colors.onTertiaryContainer,
                style = MaterialTheme.typography.titleSmall
            )
            Text(
                text = interfaceText(
                    "仅使用本地合成学生数据，不会请求真实 Backend。",
                    "Only local synthetic student data is used; the real Backend is not called."
                ),
                color = colors.onTertiaryContainer,
                style = MaterialTheme.typography.bodySmall
            )
        }
        TextButton(onClick = onExit, modifier = Modifier.testTag("localReview.exit")) {
            Text(interfaceText("退出测试", "Exit review"))
        }
    }
}

@Composable
private fun PlannedMaintenanceBanner(plannedMaintenanceAt: String, message: String) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.tertiaryContainer)
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Filled.CloudOff,
            contentDescription = null,
            tint = colors.onTertiaryContainer,
            modifier = Modifier.size(20.dp)
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(interfaceText("计划维护通知", "Planned maintenance"), color = colors.onTertiaryContainer, style = MaterialTheme.typography.titleSmall)
            Text(
                text = message.ifBlank { interfaceText("系统将于 $plannedMaintenanceAt 进行维护，请提前完成需要提交的操作。", "The system will undergo maintenance at $plannedMaintenanceAt. Complete any submissions beforehand.") },
                color = colors.onTertiaryContainer,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun MaintenancePage(message: String, estimatedRecoveryTime: String?) {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .statusBarsPadding()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.CloudOff,
                contentDescription = null,
                tint = colors.primary,
                modifier = Modifier.size(56.dp)
            )
            Text(interfaceText("系统维护中", "System maintenance"), style = MaterialTheme.typography.headlineSmall)
            Text(
                text = message.ifBlank { interfaceText("我们正在进行系统维护，请稍后再试。", "We are performing system maintenance. Try again later.") },
                style = MaterialTheme.typography.bodyLarge,
                color = colors.onSurfaceVariant
            )
            Text(
                text = estimatedRecoveryTime?.let { interfaceText("预计恢复时间：$it", "Estimated recovery time: $it") } ?: interfaceText("预计恢复时间：请留意后续通知", "Estimated recovery time: watch for further notices."),
                style = MaterialTheme.typography.titleSmall,
                color = colors.primary
            )
        }
    }
}

@Composable
private fun PreLoginPrivacyScreen(onBack: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
    ) {
        PrivacyPolicyScreen(onBack = onBack)
    }
}

@Composable
private fun AuthenticatedAppContent(
    appState: StudentAppState,
    exerciseSessionController: ExerciseSessionController,
    localStore: AndroidAppLocalStore
) {
    var selectedTab by rememberSaveable { mutableStateOf(AppTab.Dashboard) }
    var subScreen by rememberSaveable { mutableStateOf(SubScreen.None) }
    var renderedSubScreen by rememberSaveable { mutableStateOf(subScreen) }
    var exemptionTargetId by rememberSaveable { mutableStateOf<String?>(null) }
    var scannedInviteCode by rememberSaveable { mutableStateOf<String?>(null) }
    var scannedInviteCourse by remember { mutableStateOf<CourseJoinInfo?>(null) }
    var showNotificationSheet by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(subScreen) {
        if (subScreen != SubScreen.None) renderedSubScreen = subScreen
    }

    BackHandler(enabled = subScreen != SubScreen.None) {
        when (subScreen) {
            SubScreen.ContactBinding -> subScreen = SubScreen.Settings
            SubScreen.AccountDeletion -> subScreen = SubScreen.Settings
            SubScreen.PrivacyPolicy,
            SubScreen.HelpCenter,
            SubScreen.Feedback,
            SubScreen.About -> subScreen = SubScreen.Settings
            SubScreen.Changelog -> subScreen = SubScreen.About
            else -> {
                exemptionTargetId = null
                subScreen = SubScreen.None
            }
        }
    }
    BackHandler(
        enabled = subScreen == SubScreen.None &&
            selectedTab != AppTab.Dashboard &&
            !showNotificationSheet
    ) {
        selectedTab = AppTab.Dashboard
    }

    val pageBackground = MaterialTheme.colorScheme.background

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(pageBackground)
    ) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = pageBackground,
            bottomBar = {
                FloatingBottomNavigationBar(
                    selectedTab = selectedTab,
                    onTabSelected = { tab ->
                        if (tab != selectedTab) selectedTab = tab
                    }
                )
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(pageBackground)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(pageBackground)
                        .padding(innerPadding)
                ) {
                    if (appState.isLocalReviewMode) {
                        LocalReviewBanner(onExit = appState::logout)
                    }
                    AnimatedVisibility(
                        visible = appState.lastError != null || appState.isShowingCachedData,
                        enter = expandVertically(tween(BNBUMotion.Standard)) +
                            fadeIn(tween(BNBUMotion.Standard)),
                        exit = shrinkVertically(tween(BNBUMotion.Standard)) +
                            fadeOut(tween(BNBUMotion.Quick))
                    ) {
                        SyncStatusBanner(appState)
                    }
                    Box(modifier = Modifier.weight(1f)) {
                        RootTabContent(
                            tab = selectedTab,
                            appState = appState,
                            exerciseSessionController = exerciseSessionController,
                            contentPadding = PaddingValues(0.dp),
                            onOpenNotificationSheet = { showNotificationSheet = true },
                            onOpenCheckIn = { selectedTab = AppTab.CheckIn },
                            onReturnDashboard = { selectedTab = AppTab.Dashboard },
                            openAccountDetails = {
                                renderedSubScreen = SubScreen.AccountDetails
                                subScreen = SubScreen.AccountDetails
                            },
                            openSettings = {
                                renderedSubScreen = SubScreen.Settings
                                subScreen = SubScreen.Settings
                            },
                            openExemption = { targetId ->
                                exemptionTargetId = targetId
                                renderedSubScreen = SubScreen.Exemption
                                subScreen = SubScreen.Exemption
                            },
                            openEnduranceScoring = {
                                renderedSubScreen = SubScreen.EnduranceScoring
                                subScreen = SubScreen.EnduranceScoring
                            },
                            openScanJoin = {
                                scannedInviteCode = null
                                scannedInviteCourse = null
                                renderedSubScreen = SubScreen.ScanJoin
                                subScreen = SubScreen.ScanJoin
                            },
                            openEnterCode = {
                                renderedSubScreen = SubScreen.EnterCode
                                subScreen = SubScreen.EnterCode
                            }
                        )
                    }
                }
            }
        }

        AnimatedVisibility(
            visible = subScreen != SubScreen.None,
            enter = fadeIn(tween(BNBUMotion.Standard)) +
                slideInHorizontally(
                    animationSpec = tween(BNBUMotion.Emphasized, easing = FastOutSlowInEasing),
                    initialOffsetX = { it / 10 }
                ),
            exit = fadeOut(tween(BNBUMotion.Quick)) +
                slideOutHorizontally(
                    animationSpec = tween(BNBUMotion.Standard, easing = FastOutSlowInEasing),
                    targetOffsetX = { it / 12 }
                )
        ) {
            SubScreenOverlay(
                subScreen = renderedSubScreen,
                appState = appState,
                localStore = localStore,
                exemptionTargetId = exemptionTargetId,
                scannedInviteCode = scannedInviteCode,
                scannedInviteCourse = scannedInviteCourse,
                onClose = {
                    exemptionTargetId = null
                    scannedInviteCode = null
                    scannedInviteCourse = null
                    subScreen = SubScreen.None
                },
                onNavigateFromSettings = { destination ->
                    renderedSubScreen = destination
                    subScreen = destination
                },
                onReturnToSettings = {
                    renderedSubScreen = SubScreen.Settings
                    subScreen = SubScreen.Settings
                },
                onReturnFromContactBinding = {
                    renderedSubScreen = SubScreen.Settings
                    subScreen = SubScreen.Settings
                },
                onOpenChangelog = {
                    renderedSubScreen = SubScreen.Changelog
                    subScreen = SubScreen.Changelog
                },
                onReturnToAbout = {
                    renderedSubScreen = SubScreen.About
                    subScreen = SubScreen.About
                },
                onInviteResolved = { code, course ->
                    scannedInviteCode = code
                    scannedInviteCourse = course
                    renderedSubScreen = SubScreen.CourseJoinConfirm
                    subScreen = SubScreen.CourseJoinConfirm
                },
                onReturnToScan = {
                    scannedInviteCode = null
                    scannedInviteCourse = null
                    renderedSubScreen = SubScreen.ScanJoin
                    subScreen = SubScreen.ScanJoin
                }
            )
        }

    }

    if (showNotificationSheet) {
        NotificationSheet(
            notices = appState.visibleNotices,
            unreadCount = appState.unreadNoticeCount,
            onDismiss = { showNotificationSheet = false },
            onMarkRead = appState::markNoticeRead,
            onMarkAllRead = appState::markAllNoticesRead,
            onOpenExemption = { targetId ->
                showNotificationSheet = false
                exemptionTargetId = targetId
                renderedSubScreen = SubScreen.Exemption
                subScreen = SubScreen.Exemption
            }
        )
    }
}

@Composable
private fun PrivacyConsentScreen(
    onAgree: () -> Unit,
    onDecline: () -> Unit
) {
    var showFullPrivacyPolicy by rememberSaveable { mutableStateOf(false) }
    val activity = LocalActivity.current

    if (showFullPrivacyPolicy) {
        PreLoginPrivacyScreen(onBack = { showFullPrivacyPolicy = false })
    } else {
        BackHandler(enabled = true) {}
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = BNBULayout.ScreenHorizontal)
                .padding(top = BNBULayout.Space32, bottom = BNBULayout.Space24),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp)
            ) {
                Text(
                    text = stringResource(R.string.privacy_consent_eyebrow),
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.labelMedium
                )
                Spacer(Modifier.height(20.dp))
                Text(
                    text = stringResource(R.string.privacy_consent_title),
                    color = MaterialTheme.colorScheme.onBackground,
                    style = MaterialTheme.typography.headlineLarge
                )
                Spacer(Modifier.height(BNBULayout.Space12))
                Text(
                    text = stringResource(R.string.privacy_consent_intro),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyLarge
                )

                Spacer(Modifier.height(BNBULayout.Space32))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.large,
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 0.dp
                ) {
                    Column(modifier = Modifier.padding(BNBULayout.CardPadding)) {
                        Text(
                            text = stringResource(R.string.privacy_consent_summary_title),
                            color = MaterialTheme.colorScheme.onSurface,
                            style = MaterialTheme.typography.titleMedium
                        )
                        Spacer(Modifier.height(BNBULayout.Space12))
                        Text(
                            text = stringResource(R.string.privacy_consent_summary),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Spacer(Modifier.height(BNBULayout.Space16))
                        TextButton(
                            onClick = { showFullPrivacyPolicy = true },
                            contentPadding = PaddingValues(horizontal = 0.dp, vertical = 8.dp)
                        ) {
                            Text(
                                text = stringResource(R.string.privacy_consent_full_policy),
                                style = MaterialTheme.typography.labelLarge
                            )
                        }
                    }
                }

                Spacer(Modifier.height(BNBULayout.Space32))
                Button(
                    onClick = onAgree,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(BNBULayout.PrimaryControlHeight),
                    shape = MaterialTheme.shapes.medium,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Text(
                        text = stringResource(R.string.privacy_consent_agree),
                        style = MaterialTheme.typography.labelLarge
                    )
                }
                TextButton(
                    onClick = {
                        onDecline()
                        activity?.finishAndRemoveTask()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(BNBULayout.TouchTarget),
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Text(
                        text = stringResource(R.string.privacy_consent_decline),
                        style = MaterialTheme.typography.labelLarge
                    )
                }
                Text(
                    text = stringResource(R.string.privacy_consent_footer),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = BNBULayout.Space12)
                )
            }
        }
    }
}

@Composable
private fun SubScreenOverlay(
    subScreen: SubScreen,
    appState: StudentAppState,
    localStore: AndroidAppLocalStore,
    exemptionTargetId: String?,
    scannedInviteCode: String?,
    scannedInviteCourse: CourseJoinInfo?,
    onClose: () -> Unit,
    onNavigateFromSettings: (SubScreen) -> Unit,
    onReturnToSettings: () -> Unit,
    onReturnFromContactBinding: () -> Unit,
    onOpenChangelog: () -> Unit,
    onReturnToAbout: () -> Unit,
    onInviteResolved: (String, CourseJoinInfo) -> Unit,
    onReturnToScan: () -> Unit
) {
    val repo = appState.apiRepository
    val courseJoinCoordinator = remember(localStore) {
        V1CourseJoinCoordinator.create(localStore)
    }
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .padding(BNBULayout.ScreenHorizontal)
    ) {
        when (subScreen) {
            SubScreen.EnduranceScoring -> {
                EnduranceScoringScreen(
                    appState = appState,
                    student = appState.workspace.student,
                    repository = repo,
                    onUnauthorized = appState::handleUnauthorized,
                    onBack = onClose
                )
            }
            SubScreen.Exemption -> {
                ExemptionScreen(
                    appState = appState,
                    repository = repo,
                    initialApplicationId = exemptionTargetId,
                    onUnauthorized = appState::handleUnauthorized,
                    onBack = onClose
                )
            }
            SubScreen.AccountDetails -> AccountDetailsScreen(
                appState = appState,
                onBack = onClose
            )
            SubScreen.Settings -> ProfileSettingsScreen(
                appState = appState,
                onBack = onClose,
                onOpenContactBinding = { onNavigateFromSettings(SubScreen.ContactBinding) },
                onOpenAccountDeletion = { onNavigateFromSettings(SubScreen.AccountDeletion) },
                onOpenPrivacy = { onNavigateFromSettings(SubScreen.PrivacyPolicy) },
                onOpenHelpCenter = { onNavigateFromSettings(SubScreen.HelpCenter) },
                onOpenFeedback = { onNavigateFromSettings(SubScreen.Feedback) },
                onOpenAbout = { onNavigateFromSettings(SubScreen.About) }
            )
            SubScreen.ContactBinding -> {
                ContactBindingScreen(
                    mode = ContactBindingMode.ManageContacts,
                    localStore = localStore,
                    currentEmailMasked = appState.contactStatus.email.masked
                        ?.takeIf { appState.contactStatus.email.verified && it.isNotBlank() }
                        ?: appState.workspace.student.email,
                    currentEmailVerified = appState.contactStatus.email.verified,
                    expectedUserVersion = appState.currentUserVersion,
                    onCurrentUserUpdated = appState::acceptV1Authentication,
                    onBindingComplete = onReturnFromContactBinding,
                    onBack = onReturnFromContactBinding
                )
            }
            SubScreen.AccountDeletion -> AccountDeletionScreen(
                appState = appState,
                localStore = localStore,
                onBack = onReturnToSettings
            )
            SubScreen.PrivacyPolicy -> PrivacyPolicyScreen(onBack = onReturnToSettings)
            SubScreen.HelpCenter -> HelpCenterScreen(
                onBack = onReturnToSettings,
                repository = repo,
                isLocalReviewMode = appState.isLocalReviewMode,
                onUnauthorized = appState::handleUnauthorized
            )
            SubScreen.About -> AboutScreen(
                onBack = onReturnToSettings,
                onOpenChangelog = onOpenChangelog
            )
            SubScreen.Changelog -> ChangelogScreen(onBack = onReturnToAbout)
            SubScreen.Feedback -> FeedbackScreen(
                appState = appState,
                repository = repo,
                onUnauthorized = appState::handleUnauthorized,
                onBack = onReturnToSettings
            )
            SubScreen.CourseJoinConfirm -> {
                val inviteCode = scannedInviteCode
                val inviteCourse = scannedInviteCourse
                if (inviteCode != null && inviteCourse != null) {
                    CourseJoinConfirmScreen(
                        inviteCode = inviteCode,
                        course = inviteCourse,
                        initialName = appState.workspace.student.name,
                        initialStudentNumber = appState.workspace.student.safeStudentNumberOrNull().orEmpty(),
                        initialGender = appState.workspace.student.gender,
                        initialGrade = appState.workspace.student.gradeLevel,
                        writeEnabled = appState.isWriteAllowed,
                        activeCourseId = appState.workspace.courses.firstOrNull {
                            it.isCurrent && it.hasActiveMembership
                        }?.id,
                        onBack = onReturnToScan,
                        onEnterExistingCourse = onClose,
                        onJoined = { completion ->
                            when (completion) {
                                is CourseJoinCompletion.Authoritative ->
                                    appState.acceptV1Authentication(completion.currentUser)
                            }
                            onClose()
                        },
                        submitCourseJoin = { body ->
                            courseJoinCoordinator.submitCourseJoin(
                                inviteCode = inviteCode,
                                expectedClassSectionId = inviteCourse.id,
                                body = body
                            )
                        }
                    )
                } else {
                    ScanJoinScreen(
                        onInviteResolved = onInviteResolved,
                        onBack = onClose,
                        resolveInvite = courseJoinCoordinator::resolveCourseInvite
                    )
                }
            }
            SubScreen.ScanJoin -> ScanJoinScreen(
                onInviteResolved = onInviteResolved,
                onBack = onClose,
                resolveInvite = courseJoinCoordinator::resolveCourseInvite
            )
            SubScreen.EnterCode -> EnterInviteCodeScreen(
                onInviteResolved = onInviteResolved,
                onBack = onClose,
                resolveInvite = courseJoinCoordinator::resolveCourseInvite
            )
            SubScreen.None -> Unit
        }
    }
}

@Composable
private fun SyncStatusBanner(appState: StudentAppState) {
    val cs = MaterialTheme.colorScheme
    val message = appState.lastError
        ?: interfaceText(
            "当前显示缓存数据，内容可能不是最新",
            "Cached data is shown and may not be up to date."
        )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(cs.errorContainer)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Icon(
            imageVector = Icons.Filled.CloudOff,
            contentDescription = null,
            tint = cs.onErrorContainer,
            modifier = Modifier.size(20.dp)
        )
        Text(
            text = message,
            color = cs.onErrorContainer,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.weight(1f)
        )
        if (appState.isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = cs.onErrorContainer,
                strokeWidth = 2.dp
            )
        } else {
            IconButton(
                onClick = appState::retryLoadWorkspace,
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.Refresh,
                    contentDescription = interfaceText("重新同步", "Sync again"),
                    tint = cs.onErrorContainer
                )
            }
        }
    }
}

@Composable
private fun FloatingBottomNavigationBar(
    selectedTab: AppTab,
    onTabSelected: (AppTab) -> Unit
) {
    val colors = MaterialTheme.colorScheme
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(
                start = BNBULayout.Space20,
                end = BNBULayout.Space20,
                bottom = BNBULayout.Space12
            )
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(72.dp),
            shape = RoundedCornerShape(32.dp),
            color = colors.surface,
            contentColor = colors.onSurface,
            tonalElevation = 0.dp,
            shadowElevation = 6.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = BNBULayout.Space4)
                    .selectableGroup(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                AppTab.entries.forEach { tab ->
                    FloatingBottomNavigationItem(
                        tab = tab,
                        selected = selectedTab == tab,
                        onClick = { onTabSelected(tab) },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                    )
                }
            }
        }
    }
}

@Composable
private fun FloatingBottomNavigationItem(
    tab: AppTab,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = MaterialTheme.colorScheme
    // Each item owns its press lifecycle.  In particular, never share this
    // source between items: a press on the destination must not affect the
    // item that is losing selection.
    val interactionSource = remember(tab) { MutableInteractionSource() }
    val itemColor by animateColorAsState(
        targetValue = if (selected) colors.primary else colors.onSurfaceVariant,
        animationSpec = tween(BNBUMotion.StateChange, easing = FastOutSlowInEasing),
        label = "floatingBottomBarItemColor"
    )
    // Do not animate to Color.Transparent: it is transparent black, so a
    // simultaneous exit/enter can briefly render both indicators as dark.
    // The RGB value stays primaryContainer throughout; only this indicator's
    // own background opacity changes, never the whole tab's alpha.
    val indicatorAlpha by animateFloatAsState(
        targetValue = if (selected) 1f else 0f,
        animationSpec = tween(BNBUMotion.StateChange, easing = FastOutSlowInEasing),
        label = "floatingBottomBarIndicatorAlpha"
    )
    val iconOffset by animateDpAsState(
        targetValue = if (selected) (-2).dp else 0.dp,
        animationSpec = tween(BNBUMotion.StateChange, easing = FastOutSlowInEasing),
        label = "floatingBottomBarIconOffset"
    )
    val iconScale = remember { Animatable(1f) }

    LaunchedEffect(selected) {
        if (selected) {
            iconScale.animateTo(
                targetValue = 1.08f,
                animationSpec = tween(
                    durationMillis = 80,
                    easing = FastOutSlowInEasing
                )
            )
            iconScale.animateTo(
                targetValue = 1f,
                animationSpec = tween(
                    durationMillis = 120,
                    easing = FastOutSlowInEasing
                )
            )
        } else {
            iconScale.animateTo(
                targetValue = 1f,
                animationSpec = tween(
                    durationMillis = BNBUMotion.StateChange,
                    easing = FastOutSlowInEasing
                )
            )
        }
    }

    Column(
        modifier = modifier.selectable(
            selected = selected,
            onClick = {
                if (!selected) onClick()
            },
            role = Role.Tab,
            interactionSource = interactionSource,
            indication = null
        ),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .offset { IntOffset(x = 0, y = iconOffset.roundToPx()) }
                .widthIn(max = 60.dp)
                .fillMaxWidth()
                .height(40.dp)
                .background(
                    color = colors.primaryContainer.copy(alpha = indicatorAlpha),
                    shape = RoundedCornerShape(percent = 50)
                ),
            contentAlignment = Alignment.Center
        ) {
            if (tab.icon == null) {
                Icon(
                    painter = painterResource(R.drawable.bnbu_emblem),
                    contentDescription = null,
                    tint = itemColor,
                    modifier = Modifier
                        .size(24.dp)
                        .graphicsLayer {
                            scaleX = iconScale.value
                            scaleY = iconScale.value
                        }
                )
            } else {
                Icon(
                    imageVector = tab.icon,
                    contentDescription = null,
                    tint = itemColor,
                    modifier = Modifier
                        .size(24.dp)
                        .graphicsLayer {
                            scaleX = iconScale.value
                            scaleY = iconScale.value
                        }
                )
            }
        }
        Text(
            text = stringResource(tab.navigationLabelRes()),
            color = itemColor,
            style = MaterialTheme.typography.labelSmall,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 2.dp)
        )
    }
}

private fun AppTab.navigationLabelRes(): Int = when (this) {
    AppTab.Dashboard -> R.string.navigation_dashboard
    AppTab.Courses -> R.string.navigation_courses
    AppTab.CheckIn -> R.string.navigation_checkin
    AppTab.Grades -> R.string.navigation_grades
    AppTab.Profile -> R.string.navigation_profile
}

@Composable
private fun RootTabContent(
    tab: AppTab,
    appState: StudentAppState,
    exerciseSessionController: ExerciseSessionController,
    contentPadding: PaddingValues,
    onOpenNotificationSheet: () -> Unit,
    onOpenCheckIn: () -> Unit,
    onReturnDashboard: () -> Unit,
    openAccountDetails: () -> Unit = {},
    openSettings: () -> Unit = {},
    openExemption: (String?) -> Unit = {},
    openEnduranceScoring: () -> Unit = {},
    openScanJoin: () -> Unit = {},
    openEnterCode: () -> Unit = {}
) {
    val tabStateHolder = rememberSaveableStateHolder()
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(contentPadding)
            .padding(BNBULayout.ScreenHorizontal)
    ) {
        // Tab changes are deliberately instantaneous. The previous implementation faded the
        // outgoing tree out before the incoming tree became opaque, exposing the scaffold/window
        // background as a light flash. SaveableStateProvider keeps each tab's saveable state.
        tabStateHolder.SaveableStateProvider(tab.name) {
            when (tab) {
                AppTab.Dashboard -> DashboardScreen(
                    appState = appState,
                    exerciseSessionController = exerciseSessionController,
                    onOpenNotificationSheet = onOpenNotificationSheet,
                    onOpenCheckIn = onOpenCheckIn,
                    onScanJoin = openScanJoin,
                    onEnterCode = openEnterCode
                )
                AppTab.Courses -> CoursesScreen(
                    appState = appState,
                    onScanJoin = openScanJoin,
                    onEnterCode = openEnterCode
                )
                AppTab.CheckIn -> CheckInScreen(
                    appState = appState,
                    exerciseSessionController = exerciseSessionController,
                    onReturnHome = onReturnDashboard
                )
                AppTab.Grades -> GradesScreen(appState)
                AppTab.Profile -> ProfileScreen(
                    appState = appState,
                    onOpenAccountDetails = openAccountDetails,
                    onOpenSettings = openSettings,
                    onOpenExemption = openExemption,
                    onOpenEnduranceScoring = openEnduranceScoring
                )
            }
        }
    }
}
