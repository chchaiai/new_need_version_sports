package edu.bnbu.student.mvp.feature.checkin.session

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import edu.bnbu.student.mvp.core.config.ClientTestToolsPolicy
import edu.bnbu.student.mvp.core.error.ClientErrorContext
import edu.bnbu.student.mvp.core.error.ClientErrorMapper
import edu.bnbu.student.mvp.core.error.SafeClientLogger
import edu.bnbu.student.mvp.core.error.UserFacingError
import edu.bnbu.student.mvp.core.exercise.ExerciseGateway
import edu.bnbu.student.mvp.core.exercise.ExerciseCheckInNotRequiredException
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaEvidence
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaServerStatus
import edu.bnbu.student.mvp.core.exercise.ExerciseOperationRejection
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordCoordinator
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordForm
import edu.bnbu.student.mvp.core.exercise.ExerciseRecordOperationResult
import edu.bnbu.student.mvp.core.exercise.ExerciseSessionPhase
import edu.bnbu.student.mvp.core.exercise.ExerciseSessionCoordinator
import edu.bnbu.student.mvp.core.exercise.ExerciseSessionOperationResult
import edu.bnbu.student.mvp.core.exercise.ExistingRemoteExerciseSession
import edu.bnbu.student.mvp.core.exercise.ExerciseTestToolsGateway
import edu.bnbu.student.mvp.core.exercise.ExerciseVersionConflictException
import edu.bnbu.student.mvp.core.exercise.StartExerciseCommand
import edu.bnbu.student.mvp.core.exercise.requiresExerciseDescription
import edu.bnbu.student.mvp.core.local.AndroidAppLocalStore
import edu.bnbu.student.mvp.core.local.LocalStoreReadStatus
import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.CreditType
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.network.UploadProgress
import edu.bnbu.student.mvp.core.network.v1.V1HttpException
import java.io.File
import java.util.UUID
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

internal class ExerciseSessionController(
    private val localStore: AndroidAppLocalStore,
    mediaRootDirectory: File,
    private val clock: ExerciseClock = SystemExerciseClock,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
    private val exerciseGateway: ExerciseGateway? = null,
    private val exerciseGatewayProvider: (() -> ExerciseGateway?)? = null,
    private val mediaUploadCoordinatorProvider: (() -> SessionMediaUploadCoordinator?)? = null,
    private val videoCompressor: SessionVideoCompressor? = null,
    private val mediaPollDelayMillis: Long = DefaultMediaPollDelayMillis,
    private val testToolsEnabled: Boolean = false
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val machine = ExerciseSessionMachine(clock)
    private val sessionStore = ExerciseSessionStore(localStore)
    private val mediaStore = SessionMediaDraftStore(mediaRootDirectory, clock)
    private var boundAccountId: String? = null
    private var bindingGeneration = 0L
    private var persistenceJob: Job? = null
    private var serverCoordinator = resolveExerciseGateway()?.let(::ExerciseSessionCoordinator)
    private var serverMediaUploadCoordinator = mediaUploadCoordinatorProvider?.invoke()
    private var automaticFinishSessionId: String? = null
    var state: ExerciseSessionState by mutableStateOf(ExerciseSessionState.Idle)
        private set

    var drafts: List<SessionMediaDraft> by mutableStateOf(emptyList())
        private set

    var isRestoring: Boolean by mutableStateOf(false)
        private set

    var isMediaBusy: Boolean by mutableStateOf(false)
        private set

    var isSessionBusy: Boolean by mutableStateOf(false)
        private set

    var message: String? by mutableStateOf(null)
        private set

    var userFacingError: UserFacingError? by mutableStateOf(null)
        private set

    var existingRemoteSession: ExistingRemoteExerciseSession? by mutableStateOf(null)
        private set

    var shouldShowHealthReminder: Boolean by mutableStateOf(false)
        private set

    var hasTestDurationAdvanceCapability: Boolean by mutableStateOf(false)
        private set

    val isTestDurationToolVisible: Boolean
        get() = testToolsEnabled &&
            hasTestDurationAdvanceCapability &&
            serverCoordinator != null

    /**
     * Binds the controller to an active account.  A pending contact-activation
     * session passes an empty account with [preserveExistingDrafts] so its
     * locally saved exercise work stays private and can be restored only after
     * the server confirms the account is active again.
     */
    fun bindAccount(accountId: String, preserveExistingDrafts: Boolean = false) {
        val normalized = accountId.trim()
        val resolvedGateway = resolveExerciseGateway()
        if (normalized.isEmpty()) {
            val previousAccountId = boundAccountId
            bindingGeneration += 1
            boundAccountId = null
            state = ExerciseSessionState.Idle
            drafts = emptyList()
            isRestoring = false
            isSessionBusy = false
            shouldShowHealthReminder = false
            hasTestDurationAdvanceCapability = false
            existingRemoteSession = null
            userFacingError = null
            serverCoordinator = null
            serverMediaUploadCoordinator = null
            automaticFinishSessionId = null
            if (previousAccountId != null && !preserveExistingDrafts) {
                scope.launch(ioDispatcher) {
                    runCatching { mediaStore.clearAccount(previousAccountId) }
                }
            }
            return
        }
        if (
            boundAccountId == normalized &&
            !isRestoring &&
            (
                (resolvedGateway == null && serverCoordinator == null) ||
                    (resolvedGateway != null && serverCoordinator != null)
                )
        ) return
        val previousAccountId = boundAccountId
        boundAccountId = normalized
        serverCoordinator = resolvedGateway?.let(::ExerciseSessionCoordinator)
        serverMediaUploadCoordinator = mediaUploadCoordinatorProvider?.invoke()
        automaticFinishSessionId = null
        shouldShowHealthReminder = !localStore.hasShownHealthReminder(normalized)
        bindingGeneration += 1
        val generation = bindingGeneration
        state = ExerciseSessionState.Idle
        drafts = emptyList()
        existingRemoteSession = null
        userFacingError = null
        hasTestDurationAdvanceCapability = false
        isRestoring = true
        isSessionBusy = false
        scope.launch {
            if (testToolsEnabled) {
                val capabilities = withContext(ioDispatcher) {
                    runCatching {
                        (resolvedGateway as? ExerciseTestToolsGateway)?.capabilities().orEmpty()
                    }.getOrDefault(emptySet())
                }
                if (generation != bindingGeneration || boundAccountId != normalized) return@launch
                hasTestDurationAdvanceCapability =
                    ClientTestToolsPolicy.TestDurationAdvanceCapability in capabilities
            }
            if (previousAccountId != null && previousAccountId != normalized) {
                withContext(ioDispatcher) {
                    runCatching { mediaStore.clearAccount(previousAccountId) }
                }
            }
            val restored = withContext(ioDispatcher) { sessionStore.restore(normalized) }
            if (generation != bindingGeneration || boundAccountId != normalized) return@launch
            val normalizedTransition = machine.autoFinishIfNeeded(restored.state)
            state = normalizedTransition.state
            var remoteConflictDetected = false
            val coordinator = serverCoordinator
            if (coordinator != null) {
                val localMirror = state.toContractMirrorOrNull(
                    version = 0L,
                    nowEpochMillis = clock.nowEpochMillis()
                )
                when (val serverResult = withContext(ioDispatcher) {
                    coordinator.restore(localMirror)
                }) {
                    is ExerciseSessionOperationResult.Success -> {
                        existingRemoteSession = null
                        val mapped = runCatching {
                            serverResult.session?.toLocalState(clock.nowEpochMillis())
                                ?: ExerciseSessionState.Idle
                        }
                        if (mapped.isSuccess) {
                            state = mapped.getOrThrow()
                        } else {
                            presentProtocolMismatch()
                        }
                    }

                    is ExerciseSessionOperationResult.Failed -> {
                        presentUserFacingError(serverResult.cause)
                    }

                    is ExerciseSessionOperationResult.AlreadyActive -> {
                        state = ExerciseSessionState.Idle
                        existingRemoteSession = serverResult.existingRemoteSession
                        remoteConflictDetected = true
                    }

                    is ExerciseSessionOperationResult.Rejected -> Unit
                }
            }
            if (generation != bindingGeneration || boundAccountId != normalized) return@launch
            val restoredDrafts = withContext(ioDispatcher) {
                runCatching {
                    currentDraftKey(normalized, state)?.let(mediaStore::list).orEmpty()
                }
            }
            drafts = restoredDrafts.getOrDefault(emptyList())
            if (restoredDrafts.isFailure && restored.status != LocalStoreReadStatus.Discarded) {
                message = interfaceText("媒体草稿恢复失败，原始文件未被修改。", "Could not restore media drafts. Original files were not changed.")
            }
            if (!remoteConflictDetected && state != restored.state) persistCurrentState()
            if (restored.status == LocalStoreReadStatus.Discarded) {
                message = interfaceText("无法恢复旧运动会话，已安全清理本地状态。", "Could not restore the previous exercise session. Local state was safely cleared.")
            }
            isRestoring = false
        }
    }

    fun start(details: ExerciseSessionDetails) {
        if (existingRemoteSession != null) return
        val coordinator = serverCoordinator
        if (coordinator != null) {
            runServerSessionOperation {
                coordinator.start(
                    StartExerciseCommand(
                        creditType = details.creditType,
                        sportType = details.sportType,
                        customSportName = details.customSportName
                    )
                )
            }
            return
        }
        applyTransition(
            machine.start(
                state = state,
                sessionId = UUID.randomUUID().toString(),
                details = details
            )
        )
    }

    fun pause() {
        val coordinator = serverCoordinator
        if (coordinator != null) {
            runServerSessionOperation(operation = coordinator::pause)
            return
        }
        applyTransition(machine.pause(state))
    }

    fun resume() {
        val coordinator = serverCoordinator
        if (coordinator != null) {
            runServerSessionOperation(operation = coordinator::resume)
            return
        }
        applyTransition(machine.resume(state))
    }

    fun requestFinish() {
        val coordinator = serverCoordinator
        if (coordinator != null) {
            val duration = state.effectiveDurationMillis(clock.nowEpochMillis())
            runServerSessionOperation(
                operation = if (duration < MinimumValidExerciseMillis) {
                    coordinator::cancel
                } else {
                    coordinator::finish
                }
            )
            return
        }
        applyTransition(machine.requestFinish(state))
    }

    fun autoFinishIfNeeded() {
        if (serverCoordinator != null) {
            val active = state as? ExerciseSessionState.Active ?: return
            if (
                active.effectiveDurationMillis(clock.nowEpochMillis()) >= MaximumExerciseMillis &&
                automaticFinishSessionId != active.sessionId
            ) {
                automaticFinishSessionId = active.sessionId
                requestFinish()
            }
            return
        }
        val transition = machine.autoFinishIfNeeded(state)
        if (transition.state != state) {
            applyTransition(transition)
        }
    }

    fun prepareCapture(
        type: ProofMediaType,
        onPrepared: (Result<SessionCaptureTarget>) -> Unit
    ) {
        val accountId = boundAccountId
        val key = accountId?.let { currentDraftKey(it, state) }
        if (key == null) {
            onPrepared(Result.failure(IllegalStateException(interfaceText("当前没有可拍摄凭证的运动会话", "There is no exercise session available for capturing proof."))))
            return
        }
        if (isMediaBusy) {
            onPrepared(Result.failure(IllegalStateException(interfaceText("正在处理上一项媒体文件", "The previous media file is still being processed."))))
            return
        }
        isMediaBusy = true
        scope.launch {
            val result = withContext(ioDispatcher) { mediaStore.prepareCapture(key, type) }
            isMediaBusy = false
            onPrepared(result)
        }
    }

    fun completeCapture(
        target: SessionCaptureTarget,
        success: Boolean,
        durationSeconds: Double? = null,
        onFinished: () -> Unit = {}
    ) {
        if (isMediaBusy) {
            onFinished()
            return
        }
        isMediaBusy = true
        scope.launch {
            try {
                val result = withContext(ioDispatcher) {
                    if (success && target.type == ProofMediaType.Image) {
                        SessionMediaEditor.normalizeCapturedPhoto(target.file).getOrThrow()
                    }
                    val resolvedDuration = durationSeconds ?: if (success && target.type == ProofMediaType.Video) {
                        SessionMediaEditor.readVideoDurationSeconds(target.file)
                    } else {
                        null
                    }
                    mediaStore.completeCapture(target, success, resolvedDuration)
                }
                refreshDrafts()
                message = result.fold(
                    onSuccess = {
                        if (it.type == ProofMediaType.Image) interfaceText("现场照片已确认保留。", "On-site photo confirmed and retained.") else interfaceText("现场视频已确认保留。", "On-site video confirmed and retained.")
                    },
                    onFailure = {
                        if (!success) {
                            null
                        } else if (target.type == ProofMediaType.Image) {
                            interfaceText("现场照片保存失败，请重试。", "Could not save the on-site photo. Try again.")
                        } else {
                            interfaceText("现场视频保存失败，请重试。", "Could not save the on-site video. Try again.")
                        }
                    }
                )
            } finally {
                isMediaBusy = false
                onFinished()
            }
        }
    }

    /** Saves an accepted recording as a local draft, then creates its verified upload copy. */
    fun completeVideoCapture(
        target: SessionCaptureTarget,
        success: Boolean,
        recordedDurationSeconds: Double,
        onFinished: () -> Unit = {}
    ) {
        if (isMediaBusy) {
            onFinished()
            return
        }
        isMediaBusy = true
        scope.launch {
            try {
                val result = processVideoCaptureRetention(
                    success = success,
                    discardPending = {
                        withContext(ioDispatcher) { mediaStore.cancelCapture(target) }
                    },
                    retainPending = {
                        withContext(ioDispatcher) {
                        mediaStore.completeCapture(
                            target = target,
                            success = true,
                            durationSeconds = recordedDurationSeconds.coerceAtMost(15.0)
                        )
                        }.getOrThrow().id
                    },
                    compressRetained = { draftId ->
                        compressVideoDraft(draftId).getOrThrow()
                    }
                )
                refreshDrafts()
                if (result.getOrNull() == VideoCaptureRetentionResult.DiscardedPending) {
                    return@launch
                }
                message = result.fold(
                    onSuccess = {
                        interfaceText(
                            "现场视频已压缩并保存为本地草稿。",
                            "On-site video compressed and saved as a local draft."
                        )
                    },
                    onFailure = {
                        interfaceText(
                            "视频压缩失败，原视频仍保留在本地。可以删除后重录，或重试处理；未压缩视频不会上传。",
                            "Video compression failed. The original remains local. Delete it and record again, or retry processing; uncompressed video is never uploaded."
                        )
                    }
                )
            } finally {
                isMediaBusy = false
                onFinished()
            }
        }
    }

    fun retryVideoCompression(draftId: String) {
        if (isMediaBusy) return
        isMediaBusy = true
        scope.launch {
            val result = compressVideoDraft(draftId)
            refreshDrafts()
            isMediaBusy = false
            message = result.fold(
                onSuccess = { interfaceText("视频压缩完成，可以上传。", "Video compression completed and is ready to upload.") },
                onFailure = { interfaceText("视频压缩仍未成功，原视频已保留。", "Video compression still failed; the original was kept.") }
            )
        }
    }

    fun removeDraft(draftId: String, onFinished: (Boolean) -> Unit = {}) {
        if (isMediaBusy || isSessionBusy) {
            message = interfaceText(
                "媒体正在处理或提交，暂时不能删除。",
                "Media is being processed or submitted and cannot be deleted right now."
            )
            onFinished(false)
            return
        }
        val accountId = boundAccountId
        val key = accountId?.let { currentDraftKey(it, state) }
        val draft = drafts.firstOrNull { it.id == draftId }
        if (key == null || draft == null) {
            message = interfaceText("找不到这项本地凭证。", "This local evidence item could not be found.")
            onFinished(false)
            return
        }
        if (draft.serverMediaId != null) {
            message = interfaceText(
                "这项凭证已经开始上传，不能再从客户端删除。",
                "This evidence item has started uploading and can no longer be deleted from the client."
            )
            onFinished(false)
            return
        }
        isMediaBusy = true
        scope.launch {
            val removed = try {
                runCatching {
                    withContext(ioDispatcher) { mediaStore.remove(key, draftId) }
                }.getOrDefault(false).also {
                    refreshDrafts()
                }
            } finally {
                isMediaBusy = false
            }
            message = if (removed) {
                interfaceText("已删除这项本地凭证。", "The local evidence item was deleted.")
            } else {
                interfaceText("无法删除这项凭证，请稍后重试。", "Could not delete this evidence item. Try again later.")
            }
            onFinished(removed)
        }
    }

    private suspend fun compressVideoDraft(draftId: String): Result<SessionMediaDraft> {
        val accountId = boundAccountId
            ?: return Result.failure(IllegalStateException("No account is bound."))
        val key = currentDraftKey(accountId, state)
            ?: return Result.failure(IllegalStateException("No exercise draft is active."))
        val compressor = videoCompressor
            ?: return Result.failure(IllegalStateException("Video compressor is unavailable."))
        val target = withContext(ioDispatcher) { mediaStore.prepareEdit(key, draftId) }
            .getOrElse { return Result.failure(it) }
        if (target.type != ProofMediaType.Video) {
            withContext(ioDispatcher) { mediaStore.cancelFileUpdate(target) }
            return Result.failure(IllegalArgumentException("Only video drafts can be compressed."))
        }
        return runCatching {
            val compressed = compressor.compress(target.sourceFile, target.file)
            check(compressed.containsAudio) { "Compressed exercise video must contain audio." }
            withContext(ioDispatcher) {
                mediaStore.commitFileUpdate(
                    target = target,
                    durationSeconds = compressed.durationSeconds,
                    compressedForUpload = true
                )
            }.getOrThrow()
        }.onFailure {
            withContext(ioDispatcher) { runCatching { mediaStore.cancelFileUpdate(target) } }
        }
    }

    fun updateDescription(value: String) {
        val current = state as? ExerciseSessionState.Finished ?: return
        val truncatedValue = truncateExerciseDescription(value)
        if (current.details.description == truncatedValue) return
        state = current.copy(details = current.details.copy(description = truncatedValue))
        persistCurrentState()
    }

    fun validateReadyProofs(): Result<List<SessionMediaDraft>> {
        if (isMediaBusy) {
            return Result.failure(IllegalStateException(interfaceText("媒体仍在处理中，请稍后再提交。", "Media is still being processed. Try submitting again shortly.")))
        }
        val finished = state as? ExerciseSessionState.Finished
            ?: return Result.failure(IllegalStateException(interfaceText("当前运动尚未结束", "The current exercise has not ended.")))
        if (finished.activeDurationMillis < MinimumValidExerciseMillis) {
            return Result.failure(
                IllegalStateException(
                    interfaceText(
                        "运动不足 1 小时，不能创建有效打卡记录。",
                        "Exercise under 1 hour cannot create a valid check-in record."
                    )
                )
            )
        }
        if (
            finished.details.creditType.requiresExerciseDescription &&
            finished.details.description.isBlank()
        ) {
            return Result.failure(IllegalArgumentException(interfaceText("请填写运动说明", "Enter exercise details.")))
        }
        if (finished.details.description.length > MaxExerciseDescriptionLength) {
            return Result.failure(
                IllegalArgumentException(interfaceText("运动说明不能超过 $MaxExerciseDescriptionLength 个字符", "Exercise details cannot exceed $MaxExerciseDescriptionLength characters."))
            )
        }
        val key = boundAccountId?.let { currentDraftKey(it, state) }
            ?: return Result.failure(IllegalStateException(interfaceText("当前没有待提交的运动会话", "There is no exercise session ready to submit.")))
        return mediaStore.readyForSubmission(key)
    }

    /** Uses only the private v1 media lifecycle; legacy multipart is intentionally unreachable. */
    fun submitReadyProofs(
        onProgress: (UploadProgress) -> Unit = {},
        onResult: (Result<Int>) -> Unit
    ) {
        if (isSessionBusy) {
            onResult(Result.failure(IllegalStateException(interfaceText("正在处理上一项请求。", "Another request is in progress."))))
            return
        }
        val readyDrafts = validateReadyProofs().getOrElse {
            onResult(Result.failure(it))
            return
        }
        val finished = state as? ExerciseSessionState.Finished ?: run {
            onResult(Result.failure(IllegalStateException("Exercise session is not completed.")))
            return
        }
        val completedSession = serverCoordinator?.state?.session?.takeIf {
            it.phase == ExerciseSessionPhase.COMPLETED && it.sessionId == finished.sessionId
        } ?: run {
            onResult(Result.failure(IllegalStateException(interfaceText(
                "服务端尚未确认运动结束，请联网重试。",
                "The server has not confirmed the completed exercise. Reconnect and try again."
            ))))
            return
        }
        val gateway = resolveExerciseGateway()
        val mediaCoordinator = serverMediaUploadCoordinator
        if (gateway == null || mediaCoordinator == null) {
            onResult(Result.failure(IllegalStateException(interfaceText(
                "尚未连接服务器，请重新登录。",
                "The server is not connected. Sign in again."
            ))))
            return
        }
        val accountId = boundAccountId
        val key = accountId?.let { currentDraftKey(it, finished) }
        if (key == null) {
            onResult(Result.failure(IllegalStateException("Exercise media draft is unavailable.")))
            return
        }

        isSessionBusy = true
        scope.launch {
            val result = runCatching {
                val totalBytes = readyDrafts.sumOf(SessionMediaDraft::byteCount)
                check(totalBytes > 0L) { "Captured media is empty." }
                var completedBytes = 0L
                val availableMedia = mutableListOf<ExerciseMediaEvidence>()
                for (draft in readyDrafts) {
                    val file = withContext(ioDispatcher) { mediaStore.resolveFile(key, draft) }
                    val checkpoint = draft.serverMediaId?.let { mediaId ->
                        val status = draft.serverMediaStatus
                        val version = draft.serverMediaVersion
                        if (status == null || version == null) null else ExerciseMediaEvidence(
                            mediaId = mediaId,
                            sessionId = finished.sessionId,
                            mediaType = draft.type,
                            status = status,
                            version = version
                        )
                    }
                    var evidence = if (checkpoint != null) {
                        mediaCoordinator.refresh(checkpoint)
                    } else {
                        mediaCoordinator.uploadAndBind(
                            sessionId = finished.sessionId,
                            draft = draft,
                            sourceFile = file
                        ) { itemProgress ->
                            onProgress(
                                UploadProgress(
                                    bytesSent = (completedBytes + itemProgress.bytesSent).coerceAtMost(totalBytes),
                                    totalBytes = totalBytes
                                )
                            )
                        }
                    }
                    withContext(ioDispatcher) {
                        checkNotNull(mediaStore.setServerEvidence(key, draft.id, evidence)) {
                            "The local media draft disappeared after upload."
                        }
                    }
                    completedBytes += draft.byteCount
                    onProgress(UploadProgress(completedBytes.coerceAtMost(totalBytes), totalBytes))

                    var pollAttempt = 0
                    while (evidence.status != ExerciseMediaServerStatus.AVAILABLE) {
                        check(
                            evidence.status !in setOf(
                                ExerciseMediaServerStatus.FAILED,
                                ExerciseMediaServerStatus.DELETED
                            )
                        ) {
                            "Server rejected the uploaded media."
                        }
                        check(pollAttempt < MaximumMediaPollAttempts) {
                            "Media is still processing. Try submission again shortly."
                        }
                        pollAttempt += 1
                        delay(mediaPollDelayMillis)
                        evidence = mediaCoordinator.refresh(evidence)
                        withContext(ioDispatcher) {
                            checkNotNull(mediaStore.setServerEvidence(key, draft.id, evidence)) {
                                "The local media draft disappeared while processing."
                            }
                        }
                    }
                    availableMedia += evidence
                }

                val record = ExerciseRecordCoordinator(gateway)
                record.begin(completedSession).requireRecordSuccess("begin")
                record.edit(
                    ExerciseRecordForm(
                        description = finished.details.descriptionForSubmission(),
                        sportType = finished.details.sportType,
                        otherSportName = finished.details.customSportName
                    )
                ).requireRecordSuccess("edit")
                record.attachAvailableMedia(availableMedia).requireRecordSuccess("attach media")
                record.updateDraft().requireRecordSuccess("save record draft")
                record.submit().requireRecordSuccess("submit record")
                availableMedia.size
            }
            isSessionBusy = false
            onResult(result)
        }
    }

    fun resolveDraftFile(draft: SessionMediaDraft): File? {
        val key = boundAccountId?.let { currentDraftKey(it, state) } ?: return null
        return runCatching { mediaStore.resolveFile(key, draft) }.getOrNull()
    }

    /** Clears durable state and local media after a successful server submission. */
    fun markSubmitted(summary: SubmissionSummary) {
        val finished = state as? ExerciseSessionState.Finished ?: return
        val accountId = boundAccountId ?: return
        val key = currentDraftKey(accountId, finished)
        state = ExerciseSessionState.Submitted(
            creditedHours = finished.creditedHours,
            summary = summary
        )
        serverCoordinator?.clearCompletedSession()
        drafts = emptyList()
        queuePersistence(accountId, ExerciseSessionState.Idle)
        if (key != null) {
            scope.launch { withContext(ioDispatcher) { runCatching { mediaStore.clearSession(key) } } }
        }
    }

    fun resetAfterSubmission() {
        if (state !is ExerciseSessionState.Submitted) return
        state = ExerciseSessionState.Idle
        message = null
        userFacingError = null
    }

    fun abandon() {
        if (isMediaBusy) {
            message = interfaceText("媒体仍在处理中，请稍后再放弃本次运动。", "Media is still being processed. Try discarding this exercise again shortly.")
            return
        }
        clearCurrentSession(interfaceText("本次运动会话及本地草稿已清理。", "This exercise session and its local drafts were cleared."))
    }

    private fun clearCurrentSession(completionMessage: String) {
        val accountId = boundAccountId
        val key = accountId?.let { currentDraftKey(it, state) }
        state = ExerciseSessionState.Idle
        drafts = emptyList()
        if (accountId != null) {
            queuePersistence(accountId, ExerciseSessionState.Idle)
        }
        if (key != null) {
            scope.launch { withContext(ioDispatcher) { runCatching { mediaStore.clearSession(key) } } }
        }
        message = completionMessage
    }

    /** Local synthetic-review shortcut; remote and authenticated sessions fail closed. */
    fun advanceLocalReviewToTwoHours(isLocalReviewMode: Boolean) {
        if (!isLocalReviewMode || serverCoordinator != null) {
            message = interfaceText(
                "直达 2 小时仅可用于免登录测试。",
                "The two-hour shortcut is available only in local review mode."
            )
            return
        }
        applyTransition(machine.advanceToTwoHoursForLocalReview(state))
    }

    /** Formal student action; the local timer is never edited directly. */
    fun addSixtyMinutes() {
        val coordinator = serverCoordinator
        val current = coordinator?.state?.session?.takeIf {
            it.phase == ExerciseSessionPhase.ACTIVE || it.phase == ExerciseSessionPhase.PAUSED
        }
        if (coordinator == null || current == null) {
            message = interfaceText(
                "当前没有可增加时长的运动。",
                "There is no current exercise to extend."
            )
            return
        }
        runServerSessionOperation(
            successMessage = interfaceText(
                "已增加 60 分钟，并刷新服务端运动状态。",
                "60 minutes were added and the authoritative session was refreshed."
            )
        ) {
            coordinator.addSixtyMinutes()
        }
    }

    fun consumeMessage() {
        message = null
    }

    fun consumeUserFacingError() {
        userFacingError = null
    }

    fun refreshExistingRemoteSession() {
        val coordinator = serverCoordinator ?: return
        if (existingRemoteSession == null || isSessionBusy) return
        runServerSessionOperation(operation = { coordinator.restore(localMirror = null) })
    }

    fun dismissHealthReminder() {
        val accountId = boundAccountId ?: return
        localStore.markHealthReminderShown(accountId)
        shouldShowHealthReminder = false
    }

    fun destroy() {
        scope.cancel()
    }

    private fun runServerSessionOperation(
        successMessage: String? = null,
        operation: suspend () -> ExerciseSessionOperationResult
    ) {
        if (isSessionBusy) {
            message = interfaceText(
                "正在同步运动状态，请稍候。",
                "Exercise state is syncing. Try again shortly."
            )
            return
        }
        val generation = bindingGeneration
        val accountId = boundAccountId
        if (accountId == null) {
            message = interfaceText(
                "当前账号尚未准备好，无法同步运动状态。",
                "The current account is not ready for exercise sync."
            )
            return
        }
        isSessionBusy = true
        userFacingError = null
        scope.launch {
            val result = withContext(ioDispatcher) { operation() }
            if (generation != bindingGeneration || boundAccountId != accountId) return@launch
            when (result) {
                is ExerciseSessionOperationResult.Success -> {
                    existingRemoteSession = null
                    val mapped = runCatching {
                        result.session?.toLocalState(clock.nowEpochMillis())
                            ?: ExerciseSessionState.Idle
                    }
                    if (mapped.isSuccess) {
                        state = mapped.getOrThrow()
                        if (state is ExerciseSessionState.Active) {
                            automaticFinishSessionId = null
                        }
                        persistCurrentState()
                        refreshDraftsAsync()
                        successMessage?.let { message = it }
                    } else {
                        presentProtocolMismatch()
                    }
                }

                is ExerciseSessionOperationResult.Failed -> {
                    if (result.cause is ExerciseCheckInNotRequiredException) {
                        message = interfaceText(
                            "已达到合格打卡时长，无需继续打卡。",
                            "You have reached the required check-in duration. No further check-in is needed."
                        )
                        isSessionBusy = false
                        return@launch
                    }
                    if (result.cause is ExerciseVersionConflictException) {
                        val mapped = runCatching {
                            result.retainedSession?.toLocalState(clock.nowEpochMillis())
                                ?: ExerciseSessionState.Idle
                        }
                        if (mapped.isSuccess) {
                            state = mapped.getOrThrow()
                            persistCurrentState()
                            refreshDraftsAsync()
                        }
                    }
                    presentUserFacingError(result.cause)
                }

                is ExerciseSessionOperationResult.AlreadyActive -> {
                    state = ExerciseSessionState.Idle
                    existingRemoteSession = result.existingRemoteSession
                    message = null
                    userFacingError = null
                }

                is ExerciseSessionOperationResult.Rejected -> {
                    if (result.reason == ExerciseOperationRejection.INVALID_STATE) {
                        presentUserFacingError(ExerciseVersionConflictException())
                    }
                }
            }
            isSessionBusy = false
        }
    }

    private fun presentUserFacingError(error: Throwable) {
        val mapped = ClientErrorMapper.map(error, ClientErrorContext.SESSION)
        message = null
        userFacingError = mapped
        SafeClientLogger.log(
            error = mapped,
            context = ClientErrorContext.SESSION,
            httpStatus = (error as? V1HttpException)?.statusCode
        )
    }

    private fun presentProtocolMismatch() {
        val mapped = ClientErrorMapper.protocolMismatch(ClientErrorContext.SESSION)
        message = null
        userFacingError = mapped
        SafeClientLogger.log(mapped, ClientErrorContext.SESSION)
    }

    private fun resolveExerciseGateway(): ExerciseGateway? =
        exerciseGatewayProvider?.invoke() ?: exerciseGateway

    private fun applyTransition(transition: ExerciseSessionTransition) {
        when (transition) {
            is ExerciseSessionTransition.Rejected -> {
                message = transition.reason
                return
            }

            is ExerciseSessionTransition.Discarded -> {
                clearCurrentSession(transition.message)
                return
            }
            is ExerciseSessionTransition.Changed -> Unit
        }
        state = transition.state
        persistCurrentState()
        refreshDraftsAsync()
    }

    private fun persistCurrentState() {
        val accountId = boundAccountId ?: return
        queuePersistence(accountId, state)
    }

    private fun queuePersistence(accountId: String, stateSnapshot: ExerciseSessionState) {
        val previous = persistenceJob
        persistenceJob = scope.launch {
            previous?.join()
            val saved = withContext(ioDispatcher) {
                sessionStore.save(accountId, stateSnapshot)
            }
            if (!saved && boundAccountId == accountId) {
                message = interfaceText("运动会话本地保存失败，请勿关闭应用并稍后重试。", "Could not save the exercise session locally. Keep the app open and try again later.")
            }
        }
    }

    private fun refreshDraftsAsync() {
        scope.launch { refreshDrafts() }
    }

    private suspend fun refreshDrafts() {
        val accountId = boundAccountId ?: return
        val key = currentDraftKey(accountId, state)
        if (key == null) {
            drafts = emptyList()
            return
        }
        val loaded = withContext(ioDispatcher) { runCatching { mediaStore.list(key) } }
        loaded.onSuccess { drafts = it }
            .onFailure {
                message = interfaceText("读取媒体草稿失败，请稍后重试。", "Could not read media drafts. Try again later.")
            }
    }

    private fun currentDraftKey(
        accountId: String,
        state: ExerciseSessionState
    ): SessionDraftKey? {
        val sessionId = when (state) {
            ExerciseSessionState.Idle -> null
            is ExerciseSessionState.Active -> state.sessionId
            is ExerciseSessionState.Paused -> state.sessionId
            is ExerciseSessionState.Finished -> state.sessionId
            is ExerciseSessionState.Submitted -> null
        } ?: return null
        return SessionDraftKey(accountId = accountId, sessionId = sessionId)
    }
}

internal enum class VideoCaptureRetentionResult {
    DiscardedPending,
    RetainedAndCompressed
}

/**
 * Encodes the confirmation boundary independently from camera UI callbacks.
 * A rejected capture can only clear its pending target; it must never enter
 * retained evidence or invoke compression.
 */
internal suspend fun processVideoCaptureRetention(
    success: Boolean,
    discardPending: suspend () -> Unit,
    retainPending: suspend () -> String,
    compressRetained: suspend (String) -> Unit
): Result<VideoCaptureRetentionResult> = runCatching {
    if (!success) {
        discardPending()
        return@runCatching VideoCaptureRetentionResult.DiscardedPending
    }
    val retainedDraftId = retainPending()
    compressRetained(retainedDraftId)
    VideoCaptureRetentionResult.RetainedAndCompressed
}

internal fun exerciseSessionRestoreFailureMessage(error: Throwable): String {
    return ClientErrorMapper.map(error, ClientErrorContext.SESSION).legacySafeText()
}

private fun ExerciseRecordOperationResult.requireRecordSuccess(action: String) {
    when (this) {
        is ExerciseRecordOperationResult.Success -> Unit
        is ExerciseRecordOperationResult.Rejected -> error("Exercise record $action rejected: $reason")
        is ExerciseRecordOperationResult.Failed -> throw cause
    }
}

private const val DefaultMediaPollDelayMillis = 1_000L
private const val MaximumMediaPollAttempts = 90
