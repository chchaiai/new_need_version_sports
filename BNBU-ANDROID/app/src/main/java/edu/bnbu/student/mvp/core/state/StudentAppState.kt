package edu.bnbu.student.mvp.core.state

import androidx.compose.runtime.getValue
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import edu.bnbu.student.mvp.core.data.ApiStudentRepository
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.error.ClientErrorContext
import edu.bnbu.student.mvp.core.error.ClientErrorMapper
import edu.bnbu.student.mvp.core.error.SafeClientLogger
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordAttemptContext
import edu.bnbu.student.mvp.core.local.AndroidAppLocalStore
import edu.bnbu.student.mvp.core.local.AppLanguagePreferences
import edu.bnbu.student.mvp.core.local.AuthSessionCredentials
import edu.bnbu.student.mvp.core.local.EphemeralAuthSessionCredentialStore
import edu.bnbu.student.mvp.core.model.CheckInRecord
import edu.bnbu.student.mvp.core.model.CheckInTimeWindow
import edu.bnbu.student.mvp.core.model.AppThemeMode
import edu.bnbu.student.mvp.core.model.AppLanguage
import edu.bnbu.student.mvp.core.model.AccountStatus
import edu.bnbu.student.mvp.core.model.StudentStatus
import edu.bnbu.student.mvp.core.model.Course
import edu.bnbu.student.mvp.core.model.CreditType
import edu.bnbu.student.mvp.core.model.NoticeCategory
import edu.bnbu.student.mvp.core.model.ProofAttachment
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.model.ProofUploadRule
import edu.bnbu.student.mvp.core.model.SportHourRule
import edu.bnbu.student.mvp.core.model.StudentNotice
import edu.bnbu.student.mvp.core.model.StudentWorkspace
import edu.bnbu.student.mvp.core.model.StudentProfile
import edu.bnbu.student.mvp.core.model.SystemMode
import edu.bnbu.student.mvp.core.model.SystemModeStatus
import edu.bnbu.student.mvp.core.model.canStartNewCourseJoin
import edu.bnbu.student.mvp.core.model.SyncOperation
import edu.bnbu.student.mvp.core.model.SyncOperationStatus
import edu.bnbu.student.mvp.core.model.SyncOperationType
import edu.bnbu.student.mvp.core.model.hourText
import edu.bnbu.student.mvp.core.time.currentBeijingBusinessDate
import edu.bnbu.student.mvp.core.time.toBeijingBusinessDate
import edu.bnbu.student.mvp.core.network.ApiHttpException
import edu.bnbu.student.mvp.core.push.FcmPushRegistrar
import edu.bnbu.student.mvp.core.network.StudentLoginRequest
import edu.bnbu.student.mvp.core.network.ProofFileReference
import edu.bnbu.student.mvp.core.network.SubmitSportRecordRequest
import edu.bnbu.student.mvp.core.network.UserDto
import edu.bnbu.student.mvp.core.network.ContactStatusResponse
import edu.bnbu.student.mvp.core.network.UploadProgress
import edu.bnbu.student.mvp.core.network.StudentProfileResponse
import edu.bnbu.student.mvp.core.network.ContactMethodResponse
import edu.bnbu.student.mvp.core.network.v1.V1StudentApi
import edu.bnbu.student.mvp.core.network.v1.V1AuthorizedApiClient
import edu.bnbu.student.mvp.core.network.v1.AccountDeletionConfirmation
import edu.bnbu.student.mvp.core.network.v1.V1StudentWorkspaceGateway
import edu.bnbu.student.mvp.core.network.v1.createV1ExerciseGateway
import edu.bnbu.student.mvp.core.network.v1.generated.CurrentUserData
import java.io.File
import java.time.Instant
import java.time.LocalDate
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.UUID
import com.google.gson.GsonBuilder

private const val MaxOtherExerciseDescriptionLength = 200

internal fun hasAcademicYearChanged(cachedAcademicYear: String, serverAcademicYear: String): Boolean {
    val cached = cachedAcademicYear.trim()
    val server = serverAcademicYear.trim()
    return cached.isNotEmpty() && server.isNotEmpty() && cached != server
}

class StudentAppState(
    private val localStore: AndroidAppLocalStore? = null,
    var cacheDir: File? = null
) {
    private data class InitialLocalState(
        val workspace: StudentWorkspace? = null,
        val lastSyncTimestamp: String? = null,
        val authToken: String? = null,
        val userProfileJson: String? = null
    )

    private val gson = GsonBuilder().serializeNulls().create()
    private val job = kotlinx.coroutines.Job()
    private val scope = CoroutineScope(Dispatchers.Main + job)
    private val persistenceMutex = Mutex()
    private var sessionRequestJob: Job? = null
    @Volatile
    private var sessionGeneration: Long = 0
    private var initialLocalStateApplied = false
    @Volatile
    private var localSessionInvalidated = false
    private var pendingSessionClear: Job? = null
    private val initialLocalState = scope.async(Dispatchers.IO) {
        persistenceMutex.withLock {
            val store = localStore ?: return@withLock InitialLocalState()
            try {
                val loaded = InitialLocalState(
                    workspace = store.readWorkspace().value,
                    lastSyncTimestamp = store.loadLastSyncTime(),
                    authToken = store.loadAuthToken(),
                    userProfileJson = store.loadUserProfileJson()
                )
                if (localSessionInvalidated) {
                    store.clearAll()
                    InitialLocalState()
                } else {
                    loaded
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                android.util.Log.w("StudentAppState", "load initial local state failed", error)
                InitialLocalState()
            }
        }
    }

    // ── State ─────────────────────────────────────────────────────

    var isAuthenticated by mutableStateOf(false)
        private set

    /** True only for the in-memory, Debug-only password-free review session. */
    var isLocalReviewMode by mutableStateOf(false)
        private set

    var workspace by mutableStateOf(
        StudentWorkspace.empty()
    )
        private set

    /** Server-authoritative, masked state used by the activation and contact-management UI. */
    var contactStatus by mutableStateOf(ContactStatusResponse())
        private set

    /** Optimistic-lock version returned by the authoritative /me projection. */
    var currentUserVersion by mutableLongStateOf(1L)
        private set

    /** Keeps the activation screen visible until the newly active workspace is ready. */
    var isPreparingActivatedWorkspace by mutableStateOf(false)
        private set

    /** A retryable workspace-loading error shown in the activation flow only. */
    var contactActivationLoadError by mutableStateOf<String?>(null)
        private set

    /** A pending account may hold a token, but it must not enter the workspace. */
    val requiresContactBinding: Boolean
        get() = isAuthenticated && (
            isPreparingActivatedWorkspace ||
                AccountStatus.from(workspace.student.accountStatus) == AccountStatus.PENDING_CONTACT_BINDING
            )

    var isShowingCachedData by mutableStateOf(false)
        private set

    var lastSyncTimestamp: String? by mutableStateOf(null)
        private set

    /** Last server-supplied policy, persisted with the workspace for offline display. */
    val checkInTimeWindow: CheckInTimeWindow
        get() = workspace.checkInTimeWindow

    var isLoading by mutableStateOf(false)
        private set

    var lastError by mutableStateOf<String?>(null)
        private set

    /** Actual bytes written while the current check-in proof request is uploading. */
    var checkInUploadProgress by mutableStateOf<UploadProgress?>(null)
        private set

    /**
     * Non-null only for the session in which the server confirms that the
     * student's academic year has changed. The dashboard uses it to introduce
     * the new semester before offering the course-join entry point.
     */
    var newSemesterWelcomeAcademicYear by mutableStateOf<String?>(null)
        private set

    /** Availability policy obtained from the public health endpoint at app startup. */
    var systemModeStatus by mutableStateOf(SystemModeStatus())
        private set

    val systemMode: SystemMode
        get() = systemModeStatus.mode

    val isWriteAllowed: Boolean
        get() = !systemMode.blocksWrites

    var themeMode by mutableStateOf(
        localStore?.loadThemeMode() ?: AppThemeMode.Light
    )
        private set

    var appLanguage by mutableStateOf(
        localStore?.loadAppLanguage() ?: AppLanguage.Chinese
    )
        private set

    /** Teacher-configured targets returned in the latest student workspace. */
    val hourRule: SportHourRule
        get() = workspace.hourRule

    /** Entry point for the future time-window API response. */
    fun updateCheckInTimeWindow(window: CheckInTimeWindow) {
        workspace = workspace.copy(checkInTimeWindow = window)
    }

    /** Reloads the policy whenever the student opens the check-in page. */
    fun refreshCheckInTimeWindow() {
        val repository = apiRepository ?: return
        val generation = sessionGeneration
        launchSessionRequest {
            try {
                val window = repository.fetchCheckInTimeWindow()
                if (!isCurrentSession(generation)) return@launchSessionRequest
                updateCheckInTimeWindow(window)
                saveWorkspaceNow(event = "check-in policy refreshed", expectedGeneration = generation)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (!isCurrentSession(generation)) return@launchSessionRequest
                if (isUnauthorized(e)) {
                    expireSession(
                        interfaceText("登录已过期，请重新登录", "Your sign-in has expired. Sign in again.")
                    )
                } else if (isContactBindingRequired(e)) {
                    forceContactActivation()
                } else {
                    lastError = interfaceText(
                        "无法加载最新打卡规则，请检查网络后重试",
                        "Couldn't load the latest check-in rules. Check your connection and try again."
                    )
                }
            }
        }
    }

    /** Startup-health integration seam. Kept public so future periodic checks can reuse it. */
    fun updateSystemMode(status: SystemModeStatus) {
        systemModeStatus = status
    }

    fun updateThemeMode(mode: AppThemeMode) {
        themeMode = mode
        persist(event = "save theme mode", expectedGeneration = null) {
            saveThemeMode(mode)
        }
    }

    fun updateAppLanguage(language: AppLanguage): Boolean {
        if (language == appLanguage) return true
        // Persist before exposing the new selection. Otherwise a failed write
        // would make Settings disagree with the locale used at the next start.
        if (localStore?.saveAppLanguage(language) != true) {
            lastError = interfaceText(
                "无法保存界面语言，请重试。",
                "Couldn't save the interface language. Try again."
            )
            return false
        }
        appLanguage = AppLanguagePreferences.currentLanguage
        // Errors are presentation copy. The Activity is recreated for the new locale, so do not
        // carry a previously translated transient message into the rebuilt UI.
        lastError = null
        val repository = apiRepository ?: return true
        launchAuthenticatedRequest {
            try {
                repository.updateLanguagePreference(language)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (isUnauthorized(e)) {
                    expireSession(
                        interfaceText("登录已过期，请重新登录", "Your sign-in has expired. Sign in again.")
                    )
                } else {
                    lastError = interfaceText(
                        "界面语言已更新，但未能同步邮件语言偏好，请稍后重试",
                        "The interface language was updated, but the email-language preference could not be synced. Try again later."
                    )
                }
            }
        }
        return true
    }

    // ── API repository (set after successful login) ───────────────

    var apiRepository: ApiStudentRepository? = null
        private set

    /** True only when mutations are backed by the current V1/OpenAPI service. */
    val isV1ContractBacked: Boolean
        get() = apiRepository != null

    init {
        scope.launch {
            ensureInitialLocalState()
        }
    }

    private suspend fun ensureInitialLocalState(): InitialLocalState {
        val loaded = initialLocalState.await()
        if (localSessionInvalidated) {
            initialLocalStateApplied = true
            return InitialLocalState()
        }
        if (initialLocalStateApplied) return loaded

        initialLocalStateApplied = true
        workspace = (loaded.workspace ?: StudentWorkspace.empty()).let { cachedWorkspace ->
            if (cachedWorkspace.syncOperations.isEmpty()) {
                cachedWorkspace.copy(syncOperations = listOf(localWorkspaceLoadedOperation()))
            } else {
                cachedWorkspace
            }
        }
        lastSyncTimestamp = loaded.lastSyncTimestamp

        return loaded
    }

    // ── Computed properties ───────────────────────────────────────

    val courseRemaining: Double
        get() = (hourRule.courseRequired - workspace.progress.course).coerceAtLeast(0.0)

    val generalRemaining: Double
        get() = (hourRule.generalRequired - workspace.progress.general).coerceAtLeast(0.0)

    val totalCompleted: Double
        get() {
            if (!hourRule.isAvailable) {
                return workspace.progress.authoritativeTotalHours?.coerceAtLeast(0.0) ?: 0.0
            }
            // Cap each category at its required max to avoid double-counting overflow.
            // e.g., if a student has 15h course (over 10h cap), only 10h counts toward total.
            val cappedCourse = workspace.progress.course.coerceAtMost(hourRule.courseRequired)
            val cappedGeneral = workspace.progress.general.coerceAtMost(hourRule.generalRequired)
            return (cappedCourse + cappedGeneral).coerceAtMost(hourRule.total)
        }

    val totalRemaining: Double
        get() = if (hourRule.isAvailable) (hourRule.total - totalCompleted).coerceAtLeast(0.0) else 0.0

    val completionRatio: Double
        get() = if (hourRule.total <= 0.0) 0.0 else (totalCompleted / hourRule.total).coerceIn(0.0, 1.0)

    val unreadNoticeCount by derivedStateOf {
        visibleNotices.count { it.isUnread }
    }

    val visibleNotices by derivedStateOf {
        workspace.notices.filter { it.isStudentVisible }
    }

    val hasActiveEnrollment: Boolean
        get() = workspace.courses.any { it.isCurrent && it.hasActiveMembership }

    val hasOpenCurrentCourse: Boolean
        get() = workspace.courses.any {
            it.isCurrent && it.hasActiveMembership && it.isOpenForCheckIn
        }

    /** Whether this student can directly join a course in the current semester. */
    val canStartNewCourseJoin: Boolean
        get() = workspace.canStartNewCourseJoin()

    /**
     * Compares the server's authoritative academic year with the workspace
     * snapshot saved on this device. Blank values never trigger a reset: they
     * mean the backend has not supplied enough information yet.
     */
    fun detectNewSemester(serverAcademicYear: String): Boolean {
        val cachedAcademicYear = localStore?.loadCachedAcademicYear().orEmpty()
        return hasAcademicYearChanged(cachedAcademicYear, serverAcademicYear)
    }

    fun dismissNewSemesterWelcome() {
        newSemesterWelcomeAcademicYear = null
    }

    // ── Authentication ────────────────────────────────────────────

    /**
     * Log in via the backend API. Returns true on success.
     * On success, sets up the [apiRepository] with the returned bearer token
     * and refreshes the workspace from the server.
     *
     * On failure, stays on the login screen and surfaces the error via [lastError].
     */
    fun login(account: String, password: String, onResult: (Boolean) -> Unit = {}) {
        lastError = interfaceText(
            "密码登录已停用，请使用邮箱验证码登录",
            "Password login is retired. Use the email verification-code flow."
        )
        onResult(false)
    }

    /**
     * Installs a synthetic workspace without creating credentials or an API
     * repository. The caller is build-type gated; this state method keeps the
     * review session memory-only and invalidates any earlier network session.
     */
    fun enterLocalReview(reviewWorkspace: StudentWorkspace) {
        require(reviewWorkspace.student.id == "LOCAL-REVIEW-STUDENT") {
            "LOCAL_REVIEW_STUDENT_REQUIRED"
        }
        invalidateSessionGeneration()
        localSessionInvalidated = true
        localStore?.clearAuth()
        apiRepository = null
        workspace = reviewWorkspace
        contactStatus = ContactStatusResponse()
        currentUserVersion = 1L
        isPreparingActivatedWorkspace = false
        contactActivationLoadError = null
        isShowingCachedData = false
        isLoading = false
        lastError = null
        isLocalReviewMode = true
        isAuthenticated = true
    }

    /**
     * Try to restore a previous session using a saved bearer token.
     * Called on app start before showing login screen.
     *
     * On network error: keeps credentials only. A workspace is never restored
     * from cache until the server has confirmed the account is ACTIVE.
     * On auth error (401/403): clears stale auth data, shows login.
     *
     * @return true if the session was restored successfully (fresh data from API).
     */
    fun tryRestoreSession(onResult: (Boolean) -> Unit = {}) {
        if (localStore == null) {
            onResult(false)
            return
        }
        if (isLoading) return
        isLoading = true
        lastError = null
        val generation = beginSessionGeneration()
        launchSessionRequest {
            try {
                val loaded = ensureInitialLocalState()
                val v1Session = localStore.loadAuthSession()
                if (v1Session?.refreshToken != null) {
                    val current = V1StudentApi.create(localStore).getCurrentUser().data
                        ?: error("CURRENT_USER_DATA_MISSING")
                    if (!isCurrentSession(generation)) return@launchSessionRequest
                    applyV1CurrentUser(current, loaded.workspace)
                    val repository = createV1Repository(current.toLegacyUserDto())
                        ?: error("ACCESS_TOKEN_MISSING")
                    apiRepository = repository
                    if (AccountStatus.from(workspace.student.accountStatus) == AccountStatus.ACTIVE) {
                        hydrateV1ActiveWorkspace(repository, generation)
                    }
                    onResult(true)
                    return@launchSessionRequest
                }
                // Legacy access-token-only sessions cannot satisfy V1 refresh rotation.
                // Fail closed and require the email-code flow to establish a complete session.
                apiRepository = null
                workspace = StudentWorkspace.empty()
                onResult(false)
                return@launchSessionRequest
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (!isCurrentSession(generation)) return@launchSessionRequest
                if (isUnauthorized(e)) {
                    // Token expired or revoked — clear auth, show login
                    expireSession(message = null)
                    onResult(false)
                } else {
                    // Network error — enter offline mode only when usable cache exists.
                    // Never unlock a workspace from a local snapshot: the
                    // server profile above is the activation authority.
                    val hasCachedWorkspace = false
                    isShowingCachedData = hasCachedWorkspace
                    isAuthenticated = hasCachedWorkspace
                    if (!hasCachedWorkspace) {
                        apiRepository = null
                        workspace = StudentWorkspace.empty()
                    }
                    lastError = if (hasCachedWorkspace) {
                        interfaceText("无法连接服务器，显示缓存数据", "Could not connect to the server. Cached data is shown.")
                    } else {
                        interfaceText("无法连接服务器，请检查网络后重试", "Could not connect to the server. Check your connection and try again.")
                    }
                    onResult(hasCachedWorkspace)
                }
            } finally {
                if (isCurrentSession(generation)) isLoading = false
            }
        }
    }

    /**
     * Adopts a session that was already persisted by [V1StudentApi.verifySignInCode].
     * The authoritative /me projection decides whether the account is pending or active;
     * no cached profile can bypass email activation.
     */
    fun acceptV1Authentication(current: CurrentUserData) {
        invalidateSessionGeneration()
        val generation = beginSessionGeneration()
        localSessionInvalidated = false
        applyV1CurrentUser(current, cachedWorkspace = null)
        val repository = createV1Repository(current.toLegacyUserDto())
        apiRepository = repository
        if (
            repository != null &&
            AccountStatus.from(workspace.student.accountStatus) == AccountStatus.ACTIVE
        ) {
            isLoading = true
            launchSessionRequest {
                try {
                    hydrateV1ActiveWorkspace(repository, generation)
                } catch (error: CancellationException) {
                    throw error
                } catch (error: Exception) {
                    if (!isCurrentSession(generation)) return@launchSessionRequest
                    lastError = errorMessage(error)
                } finally {
                    if (isCurrentSession(generation)) isLoading = false
                }
            }
        }
    }

    /**
     * Keeps the mandatory activation route locked after email verification until
     * the newly ACTIVE student's full workspace has been loaded successfully.
     * A failed load therefore cannot reveal the authenticated app shell.
     */
    fun acceptV1ContactActivation(current: CurrentUserData) {
        val accountStatus = AccountStatus.requireKnown(current.user.status.value)
        if (accountStatus != AccountStatus.ACTIVE) {
            acceptV1Authentication(current)
            contactActivationLoadError = interfaceText(
                "邮箱验证尚未生效，请稍后重试。",
                "Email verification is not active yet. Try again shortly."
            )
            return
        }

        invalidateSessionGeneration()
        val generation = beginSessionGeneration()
        localSessionInvalidated = false
        isAuthenticated = true
        isPreparingActivatedWorkspace = true
        contactActivationLoadError = null
        val store = localStore
        if (store == null) {
            isPreparingActivatedWorkspace = false
            contactActivationLoadError = interfaceText(
                "无法读取登录会话，请退出后重新登录。",
                "The authenticated session could not be read. Sign out and sign in again."
            )
            return
        }

        launchSessionRequest {
            try {
                val confirmed = V1StudentApi.create(store).getCurrentUser().data
                    ?: throw IllegalStateException("CURRENT_USER_DATA_MISSING")
                if (!isCurrentSession(generation)) return@launchSessionRequest
                if (AccountStatus.requireKnown(confirmed.user.status.value) != AccountStatus.ACTIVE) {
                    applyV1CurrentUser(confirmed, cachedWorkspace = null)
                    contactActivationLoadError = interfaceText(
                        "邮箱验证尚未生效，请稍后重试。",
                        "Email verification is not active yet. Try again shortly."
                    )
                    return@launchSessionRequest
                }
                val repository = prepareActivatedWorkspace(confirmed)
                    ?: throw IllegalStateException("AUTH_SESSION_MISSING")
                hydrateV1ActiveWorkspace(repository, generation)
                if (isCurrentSession(generation)) contactActivationLoadError = null
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (!isCurrentSession(generation)) return@launchSessionRequest
                contactActivationLoadError = errorMessage(error)
            } finally {
                if (isCurrentSession(generation)) isPreparingActivatedWorkspace = false
            }
        }
    }

    /**
     * Retry loading the workspace after an error. Uses the existing
     * [apiRepository] (must be set via prior login).
     */
    fun retryLoadWorkspace() {
        val apiRepo = apiRepository ?: return
        if (isLoading) return
        isLoading = true
        lastError = null
        val generation = sessionGeneration
        launchSessionRequest {
            try {
                val refreshedWorkspace = apiRepo.loadWorkspaceAsync()
                if (!isCurrentSession(generation)) return@launchSessionRequest
                val isNewSemester = detectNewSemester(refreshedWorkspace.student.currentAcademicYear)
                if (isNewSemester) {
                    clearWorkspaceCacheNow(expectedGeneration = generation)
                    if (!isCurrentSession(generation)) return@launchSessionRequest
                }
                workspace = refreshedWorkspace
                showNewSemesterWelcomeIfNeeded(isNewSemester, refreshedWorkspace)
                isShowingCachedData = false
                saveWorkspaceNow(event = "工作台已刷新", expectedGeneration = generation)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (!isCurrentSession(generation)) return@launchSessionRequest
                if (isUnauthorized(e)) {
                    expireSession(
                        interfaceText("登录已过期，请重新登录", "Your sign-in has expired. Sign in again.")
                    )
                } else if (isContactBindingRequired(e)) {
                    forceContactActivation()
                } else {
                    isShowingCachedData = hasUsableCachedWorkspace()
                    lastError = errorMessage(e)
                }
            } finally {
                if (isCurrentSession(generation)) isLoading = false
            }
        }
    }

    fun refreshWorkspace() {
        retryLoadWorkspace()
    }

    /** Re-reads /me and retries workspace hydration, never the consumed verification code. */
    fun retryContactActivationWorkspace() {
        val store = localStore ?: return
        if (!isAuthenticated || !requiresContactBinding || isPreparingActivatedWorkspace) return
        val generation = sessionGeneration
        isPreparingActivatedWorkspace = true
        contactActivationLoadError = null
        val job = launchAuthenticatedRequest {
            try {
                val current = V1StudentApi.create(store).getCurrentUser().data
                    ?: throw IllegalStateException("CURRENT_USER_DATA_MISSING")
                if (!isCurrentSession(generation)) return@launchAuthenticatedRequest
                if (AccountStatus.requireKnown(current.user.status.value) != AccountStatus.ACTIVE) {
                    applyV1CurrentUser(current, cachedWorkspace = null)
                    contactActivationLoadError = interfaceText(
                        "联系方式验证尚未生效，请稍后再试。",
                        "Contact verification is not active yet. Try again shortly."
                    )
                    return@launchAuthenticatedRequest
                }
                val repository = prepareActivatedWorkspace(current)
                    ?: throw IllegalStateException("AUTH_SESSION_MISSING")
                hydrateV1ActiveWorkspace(repository, generation)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (!isCurrentSession(generation)) return@launchAuthenticatedRequest
                if (isUnauthorized(error)) {
                    expireSession(
                        interfaceText("登录已过期，请重新登录", "Your sign-in has expired. Sign in again.")
                    )
                } else if (isContactBindingRequired(error)) {
                    forceContactActivation()
                    contactActivationLoadError = errorMessage(error)
                } else {
                    contactActivationLoadError = errorMessage(error)
                }
            } finally {
                if (isCurrentSession(generation)) isPreparingActivatedWorkspace = false
            }
        }
        if (job == null) {
            isPreparingActivatedWorkspace = false
            contactActivationLoadError = interfaceText(
                "登录状态已失效，请重新登录。",
                "Your sign-in session is no longer valid. Sign in again."
            )
        }
    }

    fun clearError() {
        lastError = null
    }

    /**
     * Runs feature-screen network work under the current authenticated session.
     * Logout or token expiry cancels the returned job and, through the
     * repository's cancellable client, the underlying OkHttp call.
     */
    fun launchAuthenticatedRequest(
        block: suspend CoroutineScope.() -> Unit
    ): Job? {
        val generation = sessionGeneration
        val requestParent = sessionRequestJob?.takeIf { it.isActive } ?: return null
        if (!isAuthenticated) return null
        return scope.launch(context = requestParent) {
            if (!isAuthenticated || !isCurrentSession(generation)) return@launch
            block()
        }
    }

    fun logout() {
        val logoutCredentials = localStore?.loadAuthSession()
        val shouldUnregisterPush = !requiresContactBinding
        val context = ApiStudentRepository.androidAppContext()
        invalidateSessionGeneration()
        localSessionInvalidated = true
        try {
            localStore?.clearAll()
        } catch (error: RuntimeException) {
            logSafeClientFailure(error, ClientErrorContext.GENERAL)
        }
        scheduleRemoteLogoutAndFinalSessionClear(
            event = "clear local data on logout",
            credentials = logoutCredentials,
            context = context,
            shouldUnregisterPush = shouldUnregisterPush
        )
        resetToSignedOutState()
    }

    /** Called only after the backend proves terminal account deletion and global revocation. */
    internal fun completeAccountDeletion(confirmation: AccountDeletionConfirmation) {
        check(confirmation.allSessionsRevoked) { "Account deletion must revoke all sessions." }
        check(confirmation.newRegistrationRequired) {
            "Account deletion must require a new registration."
        }
        invalidateSessionGeneration()
        localSessionInvalidated = true
        try {
            localStore?.clearAll()
        } catch (error: RuntimeException) {
            logSafeClientFailure(error, ClientErrorContext.ACCOUNT_DELETION)
        }
        // Retry the local wipe outside the cancelled authenticated generation.
        // No remote logout is attempted: deletion already revoked every session.
        scheduleRemoteLogoutAndFinalSessionClear(
            event = "clear local data after account deletion",
            credentials = null,
            context = null,
            shouldUnregisterPush = false
        )
        resetToSignedOutState()
    }

    fun handleUnauthorized() {
        if (!isAuthenticated) return
        logout()
        lastError = interfaceText(
            "登录已过期，请重新登录",
            "Your sign-in has expired. Sign in again."
        )
    }

    /**
     * Cancel the coroutine scope and release resources.
     * Call from Activity.onDestroy().
     */
    fun destroy() {
        job.cancel()
    }

    // ── Notifications ─────────────────────────────────────────────

    fun markNoticeRead(id: String) {
        val notice = workspace.notices.firstOrNull { it.id == id } ?: return
        if (!notice.isUnread) return

        val repo = apiRepository ?: run {
            lastError = interfaceText(
                "当前处于离线状态，连接服务器后再标记已读",
                "You're offline. Connect to the server before marking notifications as read."
            )
            return
        }
        val generation = sessionGeneration
        launchSessionRequest {
            val result = repo.markNotificationRead(id)
            if (!isCurrentSession(generation)) return@launchSessionRequest
            result.onSuccess {
                workspace = workspace.copy(
                    notices = workspace.notices.map {
                        if (it.id == id) it.copy(isUnread = false) else it
                    }
                )
                enqueueSyncOperation(
                    type = SyncOperationType.MarkNoticeRead,
                    title = interfaceText("标记通知已读", "Mark notification as read"),
                    detail = notice.title,
                    status = SyncOperationStatus.Synced
                )
                saveWorkspace(event = "通知已读状态已同步")
            }.onFailure { error ->
                if (isUnauthorized(error)) {
                    expireSession(
                        interfaceText("登录已过期，请重新登录", "Your sign-in has expired. Sign in again.")
                    )
                } else {
                    lastError = errorMessage(error.asException())
                }
            }
        }
    }

    fun markAllNoticesRead() {
        val count = unreadNoticeCount
        if (count == 0) return

        // Capture which notices were unread BEFORE mutating
        val previouslyUnreadIds = visibleNotices.filter { it.isUnread }.map { it.id }

        val repo = apiRepository ?: run {
            lastError = interfaceText(
                "当前处于离线状态，连接服务器后再标记已读",
                "You're offline. Connect to the server before marking notifications as read."
            )
            return
        }
        val generation = sessionGeneration
        launchSessionRequest {
            val syncedIds = mutableSetOf<String>()
            var firstError: Throwable? = null
            for (id in previouslyUnreadIds) {
                val result = repo.markNotificationRead(id)
                if (!isCurrentSession(generation)) return@launchSessionRequest
                result.onSuccess { syncedIds += id }
                    .onFailure { if (firstError == null) firstError = it }
                if (firstError?.let(::isUnauthorized) == true) break
            }

            if (syncedIds.isNotEmpty()) {
                workspace = workspace.copy(
                    notices = workspace.notices.map {
                        if (it.id in syncedIds) it.copy(isUnread = false) else it
                    }
                )
                enqueueSyncOperation(
                    type = SyncOperationType.MarkNoticeRead,
                    title = interfaceText("批量标记通知已读", "Mark notifications as read"),
                    detail = interfaceText(
                        "${syncedIds.size} 条通知已同步",
                        "${syncedIds.size} notifications synced"
                    ),
                    status = SyncOperationStatus.Synced
                )
                saveWorkspace(event = "批量通知已读已同步")
            }

            firstError?.let { error ->
                if (isUnauthorized(error)) {
                    expireSession(
                        interfaceText("登录已过期，请重新登录", "Your sign-in has expired. Sign in again.")
                    )
                } else {
                    lastError = if (syncedIds.isEmpty()) {
                        errorMessage(error.asException())
                    } else {
                        interfaceText(
                            "部分通知同步失败，请重试",
                            "Some notifications could not be synced. Try again."
                        )
                    }
                }
            }
        }
    }

    // ── Check-in submission ───────────────────────────────────────

    /** Supplies UI-safe attempt-chain state without exposing the repository to Compose. */
    internal suspend fun fetchExerciseRecordAttemptContext(
        recordId: String
    ): ExerciseRecordAttemptContext {
        require(recordId.isNotBlank()) { "Record ID cannot be empty." }
        if (isLocalReviewMode) {
            return ExerciseRecordAttemptContext(
                recordId = recordId,
                previousAttemptId = null,
                rootAttemptId = recordId,
                attemptNumber = 1
            )
        }
        val repository = apiRepository
            ?: throw IllegalStateException("Exercise record history is unavailable.")
        return repository.fetchExerciseRecordAttemptContext(recordId)
    }

    fun submitExerciseCheckIn(
        creditType: CreditType,
        hours: Double,
        startedAtEpochMillis: Long,
        endedAtEpochMillis: Long,
        actualDurationSeconds: Long,
        note: String,
        sportType: String?,
        proofAttachments: List<ProofAttachment>,
        onResult: (Result<Unit>) -> Unit = {}
    ) {
        if (!allowWrite("submitCheckIn", onResult)) return
        if (isLoading) {
            failSubmission("submitExerciseCheckIn", interfaceText("正在处理上一项请求，请稍候", "The previous request is still being processed. Please wait."), onResult)
            return
        }
        if (!isV1ContractBacked && hasSubmittedCheckInToday()) {
            failSubmission("submitExerciseCheckIn", interfaceText("今日已打卡，每天只能提交一次", "You have already checked in today. Only one submission is allowed per day."), onResult)
            return
        }
        val normalizedDescription = note.trim()
        if (normalizedDescription.isBlank()) {
            failSubmission("submitExerciseCheckIn", interfaceText("请填写运动说明", "Enter exercise details."), onResult)
            return
        }
        if (normalizedDescription.length > MaxOtherExerciseDescriptionLength) {
            failSubmission(
                "submitExerciseCheckIn",
                interfaceText("运动说明不能超过 $MaxOtherExerciseDescriptionLength 个字符", "Exercise details cannot exceed $MaxOtherExerciseDescriptionLength characters."),
                onResult
            )
            return
        }
        if (sportType != null && sportType.length > 100) {
            failSubmission("submitExerciseCheckIn", interfaceText("运动项目不能超过 100 个字符", "Exercise type cannot exceed 100 characters."), onResult)
            return
        }
        if (proofAttachments.isEmpty()) {
            failSubmission("submitExerciseCheckIn", interfaceText("至少需要添加 1 个凭证", "Add at least one proof item."), onResult)
            return
        }
        if (proofAttachments.any { !it.isValidForUpload }) {
            failSubmission("submitExerciseCheckIn", interfaceText("凭证包含无效文件", "Proof contains an invalid file."), onResult)
            return
        }
        ProofUploadRule.limitMessage(proofAttachments)?.let { message ->
            failSubmission("submitExerciseCheckIn", message, onResult)
            return
        }

        val associatedCourseId = if (creditType == CreditType.CourseRelated) {
            workspace.courses.firstOrNull {
                it.isCurrent && it.hasActiveMembership
            }?.id
        } else {
            null
        }
        if (creditType == CreditType.CourseRelated && associatedCourseId == null) {
            failSubmission(
                "submitExerciseCheckIn",
                interfaceText("未找到当前课程，无法提交课程相关打卡", "The current course was not found, so a course-related check-in cannot be submitted."),
                onResult
            )
            return
        }

        // Legacy DTO field retained for the adapter shape only. The V1 adapter
        // does not send it; Backend derives creditedDurationSeconds.
        val nonAuthoritativeHours = hours.coerceAtLeast(0.0)
        val submittedDescription = normalizedDescription
        val repo = apiRepository ?: run {
            failSubmission("submitExerciseCheckIn", interfaceText("尚未连接服务器，请重新登录", "The server is not connected. Sign in again."), onResult)
            return
        }
        isLoading = true
        lastError = null
        checkInUploadProgress = null
        val generation = sessionGeneration
        launchSessionRequest {
            try {
                val cDir = cacheDir ?: File(System.getProperty("java.io.tmpdir") ?: "/tmp")
                val uploadedFiles = repo.uploadProofFiles(
                    proofAttachments = proofAttachments,
                    cacheDir = cDir,
                    onProgress = { progress ->
                        scope.launch {
                            if (isCurrentSession(generation)) {
                                checkInUploadProgress = progress
                            }
                        }
                    }
                ).getOrThrow()
                if (!isCurrentSession(generation)) return@launchSessionRequest
                check(uploadedFiles.size == proofAttachments.size) {
                    interfaceText("部分凭证上传失败，请重新选择后再试", "Some proof files could not be uploaded. Select them again and retry.")
                }
                val proofFiles = uploadedFiles.map { uploaded ->
                    ProofFileReference(
                        cosKey = uploaded.cosKey,
                        mediaType = uploaded.mediaType,
                        mimeType = uploaded.mimeType,
                        size = uploaded.size
                    )
                }
                val payload = SubmitSportRecordRequest(
                    creditType = creditType.label,
                    courseId = associatedCourseId,
                    hours = nonAuthoritativeHours,
                    description = submittedDescription,
                    proofFiles = proofFiles,
                    sportType = sportType,
                    startTime = Instant.ofEpochMilli(startedAtEpochMillis).toString(),
                    endTime = Instant.ofEpochMilli(endedAtEpochMillis).toString(),
                    actualDurationSeconds = actualDurationSeconds
                )
                val response = repo.submitRecord(payload).getOrThrow()
                if (!isCurrentSession(generation)) return@launchSessionRequest
                val serverCreditedHours = response.creditedDurationSeconds / 3600.0
                val serverProofs = uploadedFiles.map { uploaded ->
                    ProofAttachment(
                        id = uploaded.cosKey,
                        type = if (uploaded.mediaType == "video") ProofMediaType.Video else ProofMediaType.Image,
                        fileName = uploaded.cosKey.substringAfterLast('/'),
                        byteCount = uploaded.size,
                        source = uploaded.url
                    )
                }
                val record = CheckInRecord(
                    id = response.id,
                    courseId = associatedCourseId,
                    taskTitle = interfaceText("运动打卡", "Exercise check-in"),
                    creditType = creditType,
                    hours = serverCreditedHours,
                    submittedAt = response.submittedAt,
                    proofSummary = proofSummary(serverProofs),
                    proofPhotoCount = serverProofs.count { it.type == ProofMediaType.Image },
                    proofVideoCount = serverProofs.count { it.type == ProofMediaType.Video },
                    proofFiles = serverProofs,
                    teacherPublicFeedback = null,
                    teacherInternalNote = null,
                    note = submittedDescription,
                    sportType = sportType,
                    startTime = payload.startTime,
                    endTime = payload.endTime,
                    actualDurationSeconds = payload.actualDurationSeconds,
                    reviewStatus = response.reviewStatus,
                    businessDate = response.businessDate
                )
                workspace = workspace.copy(
                    records = listOf(record) + workspace.records
                )
                enqueueSyncOperation(
                    type = SyncOperationType.SubmitRecord,
                    title = interfaceText("提交打卡记录", "Submit check-in record"),
                    detail = interfaceText(
                        "${creditType.label} · ${serverCreditedHours.hourText()} · 已保存，权威进度待刷新",
                        "${creditType.label} · ${serverCreditedHours.hourText()} · saved; authoritative progress pending refresh"
                    ),
                    status = SyncOperationStatus.Queued
                )
                saveWorkspace(event = "打卡提交已同步")
                onResult(Result.success(Unit))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (!isCurrentSession(generation)) return@launchSessionRequest
                if (isUnauthorized(e)) {
                    val message = interfaceText(
                        "登录已过期，请重新登录",
                        "Your sign-in has expired. Sign in again."
                    )
                    expireSession(message)
                    onResult(Result.failure(IllegalStateException(message, e)))
                } else {
                    val message = errorMessage(e, ClientErrorContext.RECORD)
                    lastError = message
                    onResult(Result.failure(IllegalStateException(message, e)))
                }
            } finally {
                if (isCurrentSession(generation)) {
                    isLoading = false
                    checkInUploadProgress = null
                }
            }
        }
    }

    /** Local/demo observation only; V1 mutations must defer businessDate to Backend. */
    fun hasSubmittedCheckInToday(today: LocalDate = currentBeijingBusinessDate()): Boolean {
        return workspace.records.any { record ->
            record.creditType != CreditType.OrganizationOffset &&
                record.submittedAt.toBeijingBusinessDate() == today
        }
    }

    fun normalizedCheckInHours(hours: Double): Double {
        return if (hours >= 2.0 && hourRule.dailyLimit >= 2.0) 2.0 else 1.0
    }

    private fun allowWrite(
        method: String,
        onResult: ((Result<Unit>) -> Unit)? = null
    ): Boolean {
        if (isWriteAllowed) return true
        val message = interfaceText(
            "系统当前处于维护模式，暂不能提交或修改内容。",
            "The system is under maintenance. Content cannot be submitted or changed."
        )
        lastError = message
        android.util.Log.w("StudentAppState", "$method blocked: system mode=$systemMode")
        onResult?.invoke(Result.failure(IllegalStateException(message)))
        return false
    }

    // ── Private helpers ───────────────────────────────────────────

    private suspend fun errorMessage(
        e: Exception,
        context: ClientErrorContext = ClientErrorContext.GENERAL
    ): String {
        val mapped = ClientErrorMapper.map(e, context)
        SafeClientLogger.log(mapped, context)
        if (mapped.code == "CONTACT_BINDING_REQUIRED") {
            forceContactActivation()
            return mapped.legacySafeText()
        }
        return mapped.legacySafeText()
    }

    private fun activationWorkspace(user: UserDto): StudentWorkspace {
        return StudentWorkspace.empty().copy(
            student = StudentProfile(
                id = user.id,
                name = user.name,
                studentNumber = user.studentNumber,
                email = user.email,
                college = user.college,
                className = user.className,
                status = StudentStatus.PENDING.name,
                gender = user.gender.orEmpty(),
                gradeLevel = user.gradeLevel.orEmpty(),
                accountStatus = user.accountStatus
            )
        )
    }

    private fun applyV1CurrentUser(
        current: CurrentUserData,
        cachedWorkspace: StudentWorkspace?
    ) {
        isLocalReviewMode = false
        val profile = current.studentProfile
            ?: throw IllegalStateException("STUDENT_PROFILE_REQUIRED")
        currentUserVersion = current.user.version
        val accountStatus = AccountStatus.requireKnown(current.user.status.value).name
        val cachedStudentStatus = cachedWorkspace
            ?.takeIf { it.student.id == profile.id }
            ?.student
            ?.status
            ?.takeIf { it == StudentStatus.ACTIVE.name || it == StudentStatus.PENDING.name }
            ?: StudentStatus.PENDING.name
        val student = StudentProfile(
            id = profile.id,
            name = profile.fullName,
            studentNumber = profile.studentNumber,
            email = current.user.primaryEmailMasked.orEmpty(),
            college = profile.collegeName.orEmpty(),
            className = profile.administrativeClassName.orEmpty(),
            status = cachedStudentStatus,
            gender = profile.gender.value.lowercase(),
            gradeLevel = profile.gradeYear.toString(),
            accountStatus = accountStatus
        )
        val mayReuseCache =
            accountStatus == AccountStatus.ACTIVE.name && cachedWorkspace?.student?.id == profile.id
        workspace = if (mayReuseCache) {
            cachedWorkspace!!.copy(student = student)
        } else {
            StudentWorkspace.empty().copy(student = student)
        }
        contactStatus = ContactStatusResponse(
            email = ContactMethodResponse(
                masked = current.user.primaryEmailMasked,
                verified = current.user.emailVerified
            )
        )
        isPreparingActivatedWorkspace = false
        contactActivationLoadError = null
        isAuthenticated = true
        isShowingCachedData = mayReuseCache
        lastError = null

        val user = UserDto(
            id = current.user.id,
            name = profile.fullName,
            studentNumber = profile.studentNumber,
            email = current.user.primaryEmailMasked.orEmpty(),
            role = current.user.role.value,
            college = profile.collegeName.orEmpty(),
            status = profile.status,
            gender = profile.gender.value.lowercase(),
            gradeLevel = profile.gradeYear.toString(),
            className = profile.administrativeClassName.orEmpty(),
            accountStatus = accountStatus,
            contacts = contactStatus
        )
        persistUnit(event = "save v1 authenticated profile") {
            saveUserProfile(gson.toJson(user)) &&
                if (accountStatus == AccountStatus.PENDING_CONTACT_BINDING.name) {
                    clearWorkspaceCache()
                } else {
                    saveWorkspace(workspace)
                }
        }
    }

    private fun CurrentUserData.toLegacyUserDto(): UserDto {
        val profile = studentProfile ?: throw IllegalStateException("STUDENT_PROFILE_REQUIRED")
        return UserDto(
            id = user.id,
            name = profile.fullName,
            studentNumber = profile.studentNumber,
            email = user.primaryEmailMasked.orEmpty(),
            role = user.role.value,
            college = profile.collegeName.orEmpty(),
            status = profile.status,
            gender = profile.gender.value.lowercase(),
            gradeLevel = profile.gradeYear.toString(),
            className = profile.administrativeClassName.orEmpty(),
            accountStatus = user.status.value,
            contacts = ContactStatusResponse(
                email = ContactMethodResponse(
                    masked = user.primaryEmailMasked,
                    verified = user.emailVerified
                )
            )
        )
    }

    private fun createV1Repository(user: UserDto): ApiStudentRepository? {
        val store = localStore ?: return null
        val accessToken = store.loadAuthSession()?.accessToken
            ?.takeIf(String::isNotBlank)
            ?: return null
        return ApiStudentRepository(
            initialBearerToken = accessToken,
            userProfile = user,
            v1Gateway = V1StudentWorkspaceGateway.create(store)
        ).attachExerciseGateway(createV1ExerciseGateway(store))
    }

    private fun prepareActivatedWorkspace(current: CurrentUserData): ApiStudentRepository? {
        require(AccountStatus.requireKnown(current.user.status.value) == AccountStatus.ACTIVE) {
            "ACTIVE_ACCOUNT_REQUIRED"
        }
        currentUserVersion = current.user.version
        contactStatus = ContactStatusResponse(
            email = ContactMethodResponse(
                masked = current.user.primaryEmailMasked,
                verified = current.user.emailVerified
            )
        )
        val user = current.toLegacyUserDto()
        val repository = createV1Repository(user)
        apiRepository = repository
        isAuthenticated = true
        isPreparingActivatedWorkspace = true
        contactActivationLoadError = null
        isShowingCachedData = false
        persistUnit(event = "save verified contact profile before workspace activation") {
            saveUserProfile(gson.toJson(user)) && clearWorkspaceCache()
        }
        return repository
    }

    private suspend fun hydrateV1ActiveWorkspace(
        repository: ApiStudentRepository,
        generation: Long
    ) {
        val remoteWorkspace = repository.loadWorkspaceAsync()
        if (!isCurrentSession(generation)) return
        workspace = remoteWorkspace.copy(
            student = remoteWorkspace.student.copy(
                accountStatus = AccountStatus.ACTIVE.name
            )
        )
        isShowingCachedData = false
        val now = currentSyncTimestamp()
        lastSyncTimestamp = now
        saveWorkspaceNow(event = "v1 workspace loaded", expectedGeneration = generation)
        repository.bearerToken?.let { syncPushToken() }
    }

    private fun applyContactProfile(profile: StudentProfileResponse) {
        contactStatus = profile.contacts
        val current = workspace.student
        workspace = workspace.copy(
            student = current.copy(
                id = profile.id.ifBlank { current.id },
                name = profile.name.ifBlank { current.name },
                studentNumber = profile.studentNumber.ifBlank { current.studentNumber },
                email = profile.email.ifBlank { current.email },
                college = profile.college.ifBlank { current.college },
                className = profile.className.ifBlank { current.className },
                status = profile.status.ifBlank { current.status },
                gender = profile.gender ?: current.gender,
                gradeLevel = profile.currentGradeLevel ?: profile.gradeLevel ?: current.gradeLevel,
                admissionYear = profile.admissionYear ?: current.admissionYear,
                currentAcademicYear = profile.currentAcademicYear ?: current.currentAcademicYear,
                gradeCalculatedAt = profile.gradeCalculatedAt ?: current.gradeCalculatedAt,
                accountStatus = profile.accountStatus
            )
        )
    }

    private fun UserDto.withProfile(profile: StudentProfileResponse): UserDto = copy(
        id = profile.id.ifBlank { id },
        name = profile.name.ifBlank { name },
        studentNumber = profile.studentNumber.ifBlank { studentNumber },
        email = profile.email.ifBlank { email },
        role = profile.role.ifBlank { role },
        college = profile.college.ifBlank { college },
        status = profile.status.ifBlank { status },
        gender = profile.gender ?: gender,
        gradeLevel = profile.gradeLevel ?: gradeLevel,
        className = profile.className.ifBlank { className },
        accountStatus = profile.accountStatus,
        contacts = profile.contacts
    )

    private fun StudentProfileResponse.toUserDto(): UserDto = UserDto(
        id = id,
        name = name,
        studentNumber = studentNumber,
        email = email,
        role = role,
        college = college,
        status = status,
        gender = gender,
        gradeLevel = gradeLevel,
        className = className,
        accountStatus = accountStatus,
        contacts = contacts
    )

    private fun isContactBindingRequired(error: Throwable): Boolean {
        return error is ApiHttpException &&
            error.statusCode == 403 &&
            ClientErrorMapper.safeCode(error) == "CONTACT_BINDING_REQUIRED"
    }

    /** Turns any authoritative 403 into the same minimal activation state. */
    private fun forceContactActivation() {
        if (!isAuthenticated) return
        workspace = StudentWorkspace.empty().copy(
            student = workspace.student.copy(
                accountStatus = AccountStatus.PENDING_CONTACT_BINDING.name
            )
        )
        isPreparingActivatedWorkspace = false
        contactActivationLoadError = null
        isShowingCachedData = false
        persistUnit(event = "clear workspace after contact activation is required") {
            clearWorkspaceCache()
        }
    }

    private fun hasUsableCachedWorkspace(): Boolean {
        // Sync-operation metadata is added even to an empty workspace during
        // startup, so equality with StudentWorkspace.empty() is not a safe test.
        return workspace.student.id.isNotBlank()
    }

    private suspend fun syncPushToken() {
        val context = ApiStudentRepository.androidAppContext() ?: return
        val store = localStore ?: return
        FcmPushRegistrar.registerCurrentDevice(context, store)
            .onFailure { error ->
                val mapped = ClientErrorMapper.map(error, ClientErrorContext.GENERAL)
                SafeClientLogger.log(mapped, ClientErrorContext.GENERAL)
            }
    }

    private fun isUnauthorized(error: Throwable): Boolean {
        if (error is ApiHttpException && error.statusCode == 401) return true
        return ClientErrorMapper.safeCode(error) in setOf(
            "AUTH_REQUIRED",
            "AUTH_TOKEN_INVALID",
            "AUTH_TOKEN_EXPIRED",
            "AUTH_SESSION_REVOKED",
            "AUTH_ACCOUNT_DISABLED"
        )
    }

    private fun resetToSignedOutState() {
        isAuthenticated = false
        isLocalReviewMode = false
        apiRepository = null
        lastError = null
        isLoading = false
        workspace = StudentWorkspace.empty()
        contactStatus = ContactStatusResponse()
        currentUserVersion = 1L
        isPreparingActivatedWorkspace = false
        contactActivationLoadError = null
    }

    private fun logSafeClientFailure(
        error: Throwable,
        context: ClientErrorContext
    ) {
        SafeClientLogger.log(ClientErrorMapper.map(error, context), context)
    }

    private fun isCurrentSession(generation: Long): Boolean = sessionGeneration == generation

    /**
     * Starts a new generation for every login/restore attempt. All network work
     * for that generation is parented to one supervisor so logout can cancel the
     * underlying OkHttp calls instead of merely ignoring their eventual result.
     */
    private fun beginSessionGeneration(): Long {
        sessionRequestJob?.cancel()
        sessionRequestJob = SupervisorJob(job)
        return ++sessionGeneration
    }

    private fun invalidateSessionGeneration() {
        sessionGeneration++
        sessionRequestJob?.cancel()
        sessionRequestJob = null
    }

    private fun launchSessionRequest(
        block: suspend CoroutineScope.() -> Unit
    ): Job {
        val requestParent = sessionRequestJob
            ?: SupervisorJob(job).also { sessionRequestJob = it }
        return scope.launch(context = requestParent, block = block)
    }

    private suspend fun expireSession(message: String?) {
        // This method is commonly called by a session request that is itself
        // about to be cancelled. Keep the privacy cleanup independent from it.
        withContext(NonCancellable) {
            invalidateSessionGeneration()
            localSessionInvalidated = true
            apiRepository = null
            isAuthenticated = false
            isShowingCachedData = false
            isLoading = false
            workspace = StudentWorkspace.empty()
            contactStatus = ContactStatusResponse()
            currentUserVersion = 1L
            isPreparingActivatedWorkspace = false
            contactActivationLoadError = null
            withLocalStoreOnIo(
                event = "clear expired session",
                expectedGeneration = null
            ) {
                clearAll()
            }
            lastError = message
        }
    }

    private fun Throwable.asException(): Exception = this as? Exception ?: Exception(this)

    /**
     * Installs a fully loaded workspace only after the server says the pending
     * account is active.  Returning false means another session superseded it.
     */
    private suspend fun hydrateActivatedWorkspace(
        repository: ApiStudentRepository,
        profile: StudentProfileResponse,
        generation: Long
    ): Boolean {
        val remoteWorkspace = repository.loadWorkspaceAsync()
        if (!isCurrentSession(generation)) return false
        workspace = remoteWorkspace.copy(
            student = remoteWorkspace.student.copy(accountStatus = profile.accountStatus)
        )
        contactStatus = profile.contacts
        isShowingCachedData = false
        val now = currentSyncTimestamp()
        lastSyncTimestamp = now
        withLocalStoreOnIo(
            event = "activate account and save workspace",
            expectedGeneration = generation
        ) {
            saveUserProfile(gson.toJson(profile.toUserDto())) &&
                saveWorkspace(workspace) &&
                saveLastSyncTime(now)
        }
        if (!isCurrentSession(generation)) return false
        // Push registration is deliberately delayed until the account is active.
        isPreparingActivatedWorkspace = false
        repository.bearerToken
            ?.takeIf { it.isNotBlank() }
            ?.let { syncPushToken() }
        return isCurrentSession(generation)
    }

    private fun logValidationFailure(method: String, reason: String) {
        android.util.Log.w("StudentAppState", "$method blocked: $reason")
    }

    private fun failSubmission(
        method: String,
        reason: String,
        onResult: (Result<Unit>) -> Unit
    ) {
        logValidationFailure(method, reason)
        onResult(Result.failure(IllegalArgumentException(reason)))
    }

    private fun proofSummary(proofAttachments: List<ProofAttachment>): String {
        val photoCount = proofAttachments.count { it.type == ProofMediaType.Image }
        val videoCount = proofAttachments.count { it.type == ProofMediaType.Video }
        val parts = buildList {
            if (photoCount > 0) add(interfaceText("$photoCount 张图片", "$photoCount photos"))
            if (videoCount > 0) add(interfaceText("$videoCount 个短视频", "$videoCount videos"))
        }
        return parts.ifEmpty { listOf(interfaceText("未添加凭证", "No proof added")) }
            .joinToString(interfaceText("，", ", "))
    }

    private val maxSyncOperations = 12

    private fun enqueueSyncOperation(
        type: SyncOperationType,
        title: String,
        detail: String,
        status: SyncOperationStatus = SyncOperationStatus.Queued
    ) {
        val operation = SyncOperation(
            id = UUID.randomUUID().toString(),
            type = type,
            title = title,
            detail = detail,
            createdAt = interfaceText("刚刚", "Just now"),
            status = status
        )
        // Prepend new operation and cap the list at maxSyncOperations.
        // .take() keeps the first N entries, so the oldest entries drop off naturally.
        val updated = (listOf(operation) + workspace.syncOperations).take(maxSyncOperations)
        workspace = workspace.copy(syncOperations = updated)
    }

    private fun saveWorkspace(event: String) {
        val workspaceSnapshot = workspace
        val now = currentSyncTimestamp()
        lastSyncTimestamp = now
        persist(event = event) {
            val workspaceSaved = saveWorkspace(workspaceSnapshot)
            val syncTimeSaved = saveLastSyncTime(now)
            workspaceSaved && syncTimeSaved
        }
    }

    private suspend fun saveWorkspaceNow(
        event: String,
        expectedGeneration: Long = sessionGeneration
    ) {
        val workspaceSnapshot = workspace
        val now = currentSyncTimestamp()
        lastSyncTimestamp = now
        val saved = withLocalStoreOnIo(
            event = event,
            expectedGeneration = expectedGeneration
        ) {
            val workspaceSaved = saveWorkspace(workspaceSnapshot)
            val syncTimeSaved = saveLastSyncTime(now)
            workspaceSaved && syncTimeSaved
        }
        if (saved == false) {
            android.util.Log.w("StudentAppState", "$event failed")
        }
    }

    /** Clears stale workspace data before persisting the server's new-semester snapshot. */
    private suspend fun clearWorkspaceCacheNow(expectedGeneration: Long): Boolean {
        val cleared = withLocalStoreOnIo(
            event = "clear workspace cache for new semester",
            expectedGeneration = expectedGeneration
        ) {
            clearWorkspaceCache()
        }
        if (cleared == false) {
            android.util.Log.w("StudentAppState", "new-semester workspace cache clear failed")
        }
        return cleared ?: true
    }

    private fun showNewSemesterWelcomeIfNeeded(
        isNewSemester: Boolean,
        remoteWorkspace: StudentWorkspace
    ) {
        if (!isNewSemester) return
        newSemesterWelcomeAcademicYear = remoteWorkspace.student.currentAcademicYear
            .trim()
            .takeIf { it.isNotEmpty() }
    }

    private fun currentSyncTimestamp(): String {
        return java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", AppLanguagePreferences.currentLocale)
            .format(java.util.Date())
    }

    private fun persist(
        event: String,
        expectedGeneration: Long? = sessionGeneration,
        block: AndroidAppLocalStore.() -> Boolean
    ) {
        val store = localStore ?: return
        scope.launch(start = CoroutineStart.UNDISPATCHED) {
            withContext(NonCancellable) {
                persistenceMutex.withLock {
                    if (!canPersist(expectedGeneration)) return@withLock
                    val saved = withContext(Dispatchers.IO) {
                        try {
                            store.block()
                        } catch (error: Exception) {
                            android.util.Log.w("StudentAppState", "$event failed", error)
                            false
                        }
                    }
                    if (!canPersist(expectedGeneration)) {
                        clearStoreAfterStaleWrite(store, event)
                        return@withLock
                    }
                    if (!saved) {
                        android.util.Log.w("StudentAppState", "$event failed")
                    }
                }
            }
        }
    }

    private fun persistUnit(
        event: String,
        expectedGeneration: Long? = sessionGeneration,
        block: AndroidAppLocalStore.() -> Unit
    ) {
        val store = localStore ?: return
        scope.launch(start = CoroutineStart.UNDISPATCHED) {
            withContext(NonCancellable) {
                persistenceMutex.withLock {
                    if (!canPersist(expectedGeneration)) return@withLock
                    withContext(Dispatchers.IO) {
                        try {
                            store.block()
                        } catch (error: Exception) {
                            android.util.Log.w("StudentAppState", "$event failed", error)
                        }
                    }
                    if (!canPersist(expectedGeneration)) {
                        clearStoreAfterStaleWrite(store, event)
                    }
                }
            }
        }
    }

    private suspend fun <T> withLocalStoreOnIo(
        event: String,
        expectedGeneration: Long? = sessionGeneration,
        block: AndroidAppLocalStore.() -> T
    ): T? {
        val store = localStore ?: return null
        return withContext(NonCancellable) {
            persistenceMutex.withLock {
                if (!canPersist(expectedGeneration)) return@withLock null
                val result = withContext(Dispatchers.IO) {
                    try {
                        store.block()
                    } catch (error: Exception) {
                        android.util.Log.w("StudentAppState", "$event failed", error)
                        null
                    }
                }
                if (!canPersist(expectedGeneration)) {
                    clearStoreAfterStaleWrite(store, event)
                    null
                } else {
                    result
                }
            }
        }
    }

    private fun canPersist(expectedGeneration: Long?): Boolean {
        return expectedGeneration == null ||
            (isCurrentSession(expectedGeneration) && !localSessionInvalidated)
    }

    private suspend fun clearStoreAfterStaleWrite(
        store: AndroidAppLocalStore,
        event: String
    ) {
        withContext(Dispatchers.IO) {
            try {
                store.clearAll()
            } catch (error: Exception) {
                android.util.Log.e(
                    "StudentAppState",
                    "$event completed for a stale session and cleanup failed",
                    error
                )
            }
        }
    }

    private fun scheduleRemoteLogoutAndFinalSessionClear(
        event: String,
        credentials: AuthSessionCredentials?,
        context: android.content.Context?,
        shouldUnregisterPush: Boolean
    ) {
        val store = localStore ?: return
        pendingSessionClear = scope.launch(start = CoroutineStart.UNDISPATCHED) {
            withContext(NonCancellable) {
                withContext(Dispatchers.IO) {
                    if (credentials != null) {
                        val ephemeralStore = EphemeralAuthSessionCredentialStore(credentials)
                        if (shouldUnregisterPush && context != null) {
                            // Best effort. A push cleanup failure must not prevent
                            // the authoritative authentication session logout.
                            FcmPushRegistrar.unregisterCurrentDevice(context, ephemeralStore)
                        }
                        runCatching {
                            V1AuthorizedApiClient.create(ephemeralStore).logoutSafely()
                        }.onFailure { error ->
                            android.util.Log.w(
                                "StudentAppState",
                                "remote logout could not be confirmed",
                                error
                            )
                        }
                    }
                }
                persistenceMutex.withLock {
                    withContext(Dispatchers.IO) {
                        try {
                            store.clearAll()
                        } catch (error: Exception) {
                            android.util.Log.e("StudentAppState", "$event failed", error)
                        }
                    }
                }
            }
        }
    }

    private suspend fun awaitPendingSessionClear() {
        val pending = pendingSessionClear ?: return
        pending.join()
        if (pendingSessionClear === pending) pendingSessionClear = null
    }

    private fun localWorkspaceLoadedOperation(): SyncOperation {
        return SyncOperation(
            id = "sync-local-load",
            type = SyncOperationType.ResetLocalData,
            title = interfaceText("读取本地工作台", "Load local workspace"),
            detail = interfaceText(
                "从 Android SharedPreferences 加载已缓存的工作台数据。",
                "Load cached workspace data from Android SharedPreferences."
            ),
            createdAt = interfaceText("启动时", "At startup"),
            status = SyncOperationStatus.LocalOnly
        )
    }
}
