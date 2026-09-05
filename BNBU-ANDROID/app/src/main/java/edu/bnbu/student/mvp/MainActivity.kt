package edu.bnbu.student.mvp

import android.app.Application
import android.Manifest
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.PackageManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import edu.bnbu.student.mvp.core.designsystem.AppleTextButton as TextButton
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.AndroidViewModel
import edu.bnbu.student.mvp.core.data.ApiStudentRepository
import edu.bnbu.student.mvp.core.designsystem.BNBUStudentTheme
import edu.bnbu.student.mvp.core.local.AndroidAppLocalStore
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.network.SharedHttpClient
import edu.bnbu.student.mvp.core.model.SystemMode
import edu.bnbu.student.mvp.core.model.SystemModeStatus
import edu.bnbu.student.mvp.core.state.StudentAppState
import edu.bnbu.student.mvp.core.review.LocalReviewWorkspaceProvider
import edu.bnbu.student.mvp.feature.shell.AppRootScreen
import edu.bnbu.student.mvp.feature.shell.StartupGateScreen
import edu.bnbu.student.mvp.feature.checkin.session.ExerciseSessionController
import edu.bnbu.student.mvp.feature.checkin.session.SessionMediaUploadCoordinator
import edu.bnbu.student.mvp.feature.checkin.session.SessionVideoCompressor
import edu.bnbu.student.mvp.core.network.v1.PrivateExerciseMediaObjectUploader
import edu.bnbu.student.mvp.core.network.v1.V1AuthorizedApiClient
import edu.bnbu.student.mvp.core.network.v1.V1ExerciseMediaUploadGateway
import edu.bnbu.student.mvp.core.network.v1.V1PublicStatusClient
import edu.bnbu.student.mvp.core.network.v1.createV1ExerciseGateway
import edu.bnbu.student.mvp.core.config.ClientTestToolsPolicy
import edu.bnbu.student.mvp.R
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import java.io.File
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    private val appStateViewModel: StudentAppStateViewModel by viewModels()
    private val appUpdateManager: AppUpdateManager by lazy { AppUpdateManagerFactory.create(this) }
    private var isInitialTargetReady = false
    private var startupServiceState by mutableStateOf(StartupServiceState.CHECKING)
    private var systemModeRequestGeneration by mutableIntStateOf(0)
    private var isPlayUpdateReady by mutableStateOf(false)
    private val installStateUpdatedListener = InstallStateUpdatedListener { state ->
        if (state.installStatus() == InstallStatus.DOWNLOADED) {
            isPlayUpdateReady = true
        }
    }
    private val playUpdateLauncher = registerForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult()
    ) { /* The Play dialog already handles cancellation and errors for flexible updates. */ }
    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* Denial leaves the in-app notification center fully usable. */ }

    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(AppLanguagePreferences.localizedContext(newBase))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition {
            shouldKeepSystemSplash(initialSurfaceReady = isInitialTargetReady)
        }
        super.onCreate(savedInstanceState)
        val appState = appStateViewModel.appState
        val localReviewWorkspaceFactory = LocalReviewWorkspaceProvider.workspaceFactory
        appUpdateManager.registerListener(installStateUpdatedListener)
        checkForPlayUpdate()

        setContent {
            val hostContext = LocalContext.current
            val appLanguage = appState.appLanguage
            val localizedContext = remember(hostContext, appLanguage) {
                val resourceContext = AppLanguagePreferences.localizedContext(hostContext)
                object : ContextWrapper(hostContext) {
                    override fun getAssets() = resourceContext.assets
                    override fun getResources() = resourceContext.resources
                }
            }
            val localizedConfiguration = remember(localizedContext) {
                localizedContext.resources.configuration
            }
            var updateRequirement by remember { mutableStateOf<UpdateRequirement?>(null) }
            LaunchedEffect(Unit) {
                updateRequirement = checkMinimumVersion()
            }

            LaunchedEffect(systemModeRequestGeneration, appState.isLocalReviewMode) {
                if (appState.isLocalReviewMode) return@LaunchedEffect

                startupServiceState = StartupServiceState.CHECKING
                val initialMode = requestSystemMode()
                if (initialMode.isFailure) {
                    startupServiceState = StartupServiceState.ERROR
                    return@LaunchedEffect
                }
                appState.updateSystemMode(requireNotNull(initialMode.getOrNull()))
                startupServiceState = StartupServiceState.READY

                while (true) {
                    delay(SYSTEM_MODE_POLL_MILLIS)
                    val refreshedMode = requestSystemMode()
                    if (refreshedMode.isSuccess) {
                        appState.updateSystemMode(requireNotNull(refreshedMode.getOrNull()))
                    } else {
                        val fallback = fallbackSystemModeStatus(BuildConfig.BNBU_ENVIRONMENT)
                        Log.w(
                            SYSTEM_MODE_LOG_TAG,
                            "Public system mode refresh unavailable; applying ${fallback.mode.name}"
                        )
                        appState.updateSystemMode(fallback)
                    }
                }
            }

            val localStartupReady =
                !appStateViewModel.isRestoringSession &&
                    appStateViewModel.isPrivacyConsentChecked
            val startupSurfaceState = resolveStartupSurfaceState(
                localStartupReady = localStartupReady,
                serviceState = startupServiceState
            )
            CompositionLocalProvider(
                LocalContext provides localizedContext,
                LocalConfiguration provides localizedConfiguration
            ) {
                BNBUStudentTheme(themeMode = appState.themeMode) {
                    when (startupSurfaceState) {
                        StartupSurfaceState.LOADING,
                        StartupSurfaceState.ERROR -> StartupGateScreen(
                            state = startupSurfaceState,
                            allowLocalReview =
                                startupSurfaceState == StartupSurfaceState.ERROR &&
                                    localReviewWorkspaceFactory != null,
                            onRetry = { systemModeRequestGeneration += 1 },
                            onEnterLocalReview = {
                                localReviewWorkspaceFactory?.let { factory ->
                                    appState.updateSystemMode(
                                        SystemModeStatus(mode = SystemMode.NORMAL)
                                    )
                                    appState.enterLocalReview(factory())
                                    startupServiceState = StartupServiceState.READY
                                }
                            },
                            onInitialSurfaceReady = { isInitialTargetReady = true }
                        )

                        StartupSurfaceState.APP -> {
                            AppRootScreen(
                                appState = appState,
                                exerciseSessionController =
                                    appStateViewModel.exerciseSessionController,
                                localStore = appStateViewModel.localStore,
                                initialPrivacyConsentRequired =
                                    appStateViewModel.isPrivacyConsentRequired,
                                onPrivacyConsentAccepted =
                                    appStateViewModel::markPrivacyConsentAccepted,
                                onInitialTargetReady = { isInitialTargetReady = true },
                                onRequestNotificationPermission =
                                    ::requestNotificationPermissionIfNeeded,
                                localReviewWorkspaceFactory = localReviewWorkspaceFactory
                            )

                            updateRequirement?.let { requirement ->
                                UpdateRequiredDialog(
                                    requirement = requirement,
                                    onUpdate = { openUpdateUrl(requirement.downloadUrl) }
                                )
                            }

                            if (updateRequirement == null && isPlayUpdateReady) {
                                PlayUpdateReadyDialog(onRestart = ::completePlayUpdate)
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // A flexible update may finish while the app is in the background.
        appUpdateManager.appUpdateInfo.addOnSuccessListener { info ->
            if (info.installStatus() == InstallStatus.DOWNLOADED) {
                isPlayUpdateReady = true
            }
        }
    }

    override fun onDestroy() {
        appUpdateManager.unregisterListener(installStateUpdatedListener)
        super.onDestroy()
    }

    /**
     * Starts Google Play's optional, in-app update prompt when this install belongs to a
     * Play track with a newer version. Sideloaded/debug installs simply receive no prompt.
     */
    private fun checkForPlayUpdate() {
        appUpdateManager.appUpdateInfo.addOnSuccessListener { info ->
            if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE &&
                info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
            ) {
                appUpdateManager.startUpdateFlowForResult(
                    info,
                    playUpdateLauncher,
                    AppUpdateOptions.defaultOptions(AppUpdateType.FLEXIBLE)
                )
            }
        }
    }

    private fun completePlayUpdate() {
        isPlayUpdateReady = false
        appUpdateManager.completeUpdate()
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    /**
     * Checks the public minimum-version configuration. Failures intentionally leave the
     * application usable: a transient configuration/network failure must not lock out users.
     */
    private suspend fun checkMinimumVersion(): UpdateRequirement? {
        return try {
            val response = V1PublicStatusClient().getAndroidReleasePolicy()
            val minimumVersion = response.minimumSupportedVersion.trim()
            if (minimumVersion.isNotEmpty() &&
                compareVersions(BuildConfig.VERSION_NAME, minimumVersion) < 0
            ) {
                UpdateRequirement(
                    minimumVersion = minimumVersion,
                    downloadUrl = response.downloadUrl?.toString().orEmpty(),
                    updateMessage = response.message.orEmpty().trim()
                )
            } else {
                null
            }
        } catch (error: CancellationException) {
            throw error
        } catch (_: Throwable) {
            null
        }
    }

    /** Production-like variants fail closed when the public mode cannot be confirmed. */
    private suspend fun requestSystemMode(): Result<SystemModeStatus> {
        return try {
            val response = V1PublicStatusClient().getSystemMode()
            val resolvedMode = SystemMode.from(response.mode.value)
            Log.i(SYSTEM_MODE_LOG_TAG, "Public system mode resolved to ${resolvedMode.name}")
            Result.success(
                SystemModeStatus(
                    mode = resolvedMode,
                    message = "",
                    estimatedRecoveryTime = null,
                    plannedMaintenanceAt = null
                )
            )
        } catch (error: CancellationException) {
            throw error
        } catch (error: Throwable) {
            Log.w(
                SYSTEM_MODE_LOG_TAG,
                "Public system mode unavailable (${error::class.java.simpleName})"
            )
            Result.failure(error)
        }
    }

    private fun openUpdateUrl(downloadUrl: String) {
        if (downloadUrl.isBlank()) return
        runCatching {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)))
        }
    }
}

private data class UpdateRequirement(
    val minimumVersion: String,
    val downloadUrl: String,
    val updateMessage: String
)

@androidx.compose.runtime.Composable
private fun UpdateRequiredDialog(
    requirement: UpdateRequirement,
    onUpdate: () -> Unit
) {
    AlertDialog(
        onDismissRequest = {},
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false
        ),
        title = { Text(stringResource(R.string.update_required_title)) },
        text = {
            Text(
                stringResource(
                    R.string.update_required_message,
                    BuildConfig.VERSION_NAME,
                    requirement.minimumVersion,
                    requirement.updateMessage.takeIf { it.isNotBlank() }?.let { "\n\n$it" }.orEmpty()
                )
            )
        },
        confirmButton = {
            TextButton(onClick = onUpdate, enabled = requirement.downloadUrl.isNotBlank()) {
                Text(stringResource(R.string.update_now))
            }
        }
    )
}

@androidx.compose.runtime.Composable
private fun PlayUpdateReadyDialog(onRestart: () -> Unit) {
    AlertDialog(
        onDismissRequest = {},
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false
        ),
        title = { Text(stringResource(R.string.play_update_ready_title)) },
        text = { Text(stringResource(R.string.play_update_ready_message)) },
        confirmButton = {
            TextButton(onClick = onRestart) {
                Text(stringResource(R.string.play_update_restart))
            }
        }
    )
}

internal fun shouldKeepSystemSplash(
    sessionRestoreComplete: Boolean,
    privacyConsentChecked: Boolean,
    systemModeChecked: Boolean,
    initialTargetReady: Boolean
): Boolean =
    !sessionRestoreComplete || !privacyConsentChecked || !systemModeChecked || !initialTargetReady

private const val SYSTEM_MODE_POLL_MILLIS = 15_000L
private const val SYSTEM_MODE_LOG_TAG = "BNBU-SystemMode"

internal fun fallbackSystemModeStatus(environment: String): SystemModeStatus =
    if (environment.trim().equals("local", ignoreCase = true)) {
        // Local review remains available without a Backend and is visibly
        // isolated from real data and writes.
        SystemModeStatus(mode = SystemMode.NORMAL)
    } else {
        SystemModeStatus(mode = SystemMode.MAINTENANCE)
    }

/** Compares numeric dot-separated version components, ignoring build suffixes such as -debug. */
internal fun compareVersions(currentVersion: String, minimumVersion: String): Int {
    val current = versionComponents(currentVersion)
    val minimum = versionComponents(minimumVersion)
    val length = maxOf(current.size, minimum.size)
    for (index in 0 until length) {
        val comparison = (current.getOrElse(index) { 0 }).compareTo(minimum.getOrElse(index) { 0 })
        if (comparison != 0) return comparison
    }
    return 0
}

private fun versionComponents(version: String): List<Int> = version
    .trim()
    .removePrefix("v")
    .removePrefix("V")
    .substringBefore('-')
    .split('.')
    .map { component -> component.takeWhile(Char::isDigit).toIntOrNull() ?: 0 }

class StudentAppStateViewModel(application: Application) : AndroidViewModel(application) {
    internal val localStore = AndroidAppLocalStore(application)

    val appState = StudentAppState(
        localStore = localStore,
        cacheDir = application.cacheDir
    )

    internal val exerciseSessionController = ExerciseSessionController(
        localStore = localStore,
        mediaRootDirectory = File(application.filesDir, "exercise_session_drafts"),
        exerciseGatewayProvider = { createV1ExerciseGateway(localStore) },
        mediaUploadCoordinatorProvider = {
            val authorizedClient = V1AuthorizedApiClient.create(localStore)
            SessionMediaUploadCoordinator(
                gateway = V1ExerciseMediaUploadGateway(authorizedClient),
                objectUploader = PrivateExerciseMediaObjectUploader(SharedHttpClient.instance)
            )
        },
        videoCompressor = SessionVideoCompressor(application),
        testToolsEnabled = ClientTestToolsPolicy.isEnabled
    )

    var isRestoringSession by mutableStateOf(true)
        private set

    var isPrivacyConsentChecked by mutableStateOf(false)
        private set

    var isPrivacyConsentRequired by mutableStateOf(false)
        private set

    init {
        ApiStudentRepository.initContext(application)
        isPrivacyConsentRequired =
            !localStore.hasAgreedPrivacyPolicy(BuildConfig.PRIVACY_POLICY_VERSION)
        isPrivacyConsentChecked = true
        appState.tryRestoreSession {
            isRestoringSession = false
        }
    }

    internal fun markPrivacyConsentAccepted() {
        isPrivacyConsentRequired = false
    }

    override fun onCleared() {
        exerciseSessionController.destroy()
        appState.destroy()
        super.onCleared()
    }
}
