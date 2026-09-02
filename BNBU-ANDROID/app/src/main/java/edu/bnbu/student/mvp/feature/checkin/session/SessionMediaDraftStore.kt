package edu.bnbu.student.mvp.feature.checkin.session

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaCandidate
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaEvidence
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaPolicy
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaServerStatus
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaSource
import edu.bnbu.student.mvp.core.model.ProofMediaType
import java.io.File
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.util.UUID

internal data class SessionDraftKey(
    val accountId: String,
    val sessionId: String
)

internal enum class SessionMediaDraftStatus {
    PendingCapture,
    Ready
}

internal data class SessionMediaDraft(
    val id: String,
    val type: ProofMediaType,
    val fileName: String,
    val capturedAtEpochMillis: Long,
    val byteCount: Long,
    val durationSeconds: Double? = null,
    /** True only after the in-app video has been transcoded to the upload copy. */
    val compressedForUpload: Boolean = false,
    /** A persisted video-frame position used by the thumbnail renderer. */
    val coverTimestampMillis: Long? = null,
    /** Durable server checkpoint used to resume a partially completed batch upload. */
    val serverMediaId: String? = null,
    val serverMediaStatus: ExerciseMediaServerStatus? = null,
    val serverMediaVersion: Long? = null,
    val status: SessionMediaDraftStatus = SessionMediaDraftStatus.Ready
)

internal data class SessionCaptureTarget(
    val key: SessionDraftKey,
    val draftId: String,
    val type: ProofMediaType,
    val file: File
)

/**
 * A new, unreferenced file for safely replacing or editing an existing draft.
 *
 * The current draft file remains referenced by the index until [commitFileUpdate]
 * has written a new index successfully. This is what keeps the original proof
 * available when a camera, encoder, or storage operation fails.
 */
internal data class SessionMediaFileUpdateTarget(
    val key: SessionDraftKey,
    val draftId: String,
    val type: ProofMediaType,
    val sourceFile: File,
    val file: File,
    val replacesCapture: Boolean
)

internal class SessionMediaDraftStore(
    private val rootDirectory: File,
    private val clock: ExerciseClock = SystemExerciseClock,
    private val gson: Gson = GsonBuilder().disableHtmlEscaping().create()
) {
    init {
        require(rootDirectory.path.isNotBlank()) { "草稿根目录不能为空" }
    }

    @Synchronized
    fun prepareCapture(
        key: SessionDraftKey,
        type: ProofMediaType
    ): Result<SessionCaptureTarget> = runCatching {
        validateKey(key)
        val index = readAndRecoverIndex(key)
        enforceAvailableSlot(index.drafts, type)
        val id = UUID.randomUUID().toString()
        val extension = if (type == ProofMediaType.Image) "jpg" else "mp4"
        val prefix = if (type == ProofMediaType.Image) "photo" else "video"
        val fileName = "${prefix}_${id}.$extension"
        val directory = sessionDirectory(key).also { directory ->
            check(directory.mkdirs() || directory.isDirectory) { "无法创建媒体草稿目录" }
        }
        val file = File(directory, fileName)
        check(file.createNewFile()) { "无法创建媒体草稿文件" }
        val pending = SessionMediaDraft(
            id = id,
            type = type,
            fileName = fileName,
            capturedAtEpochMillis = clock.nowEpochMillis(),
            byteCount = 0L,
            status = SessionMediaDraftStatus.PendingCapture
        )
        if (!writeIndex(key, index.copy(drafts = index.drafts + pending))) {
            file.delete()
            error("无法保存媒体草稿索引")
        }
        SessionCaptureTarget(key = key, draftId = id, type = type, file = file)
    }

    @Synchronized
    fun completeCapture(
        target: SessionCaptureTarget,
        success: Boolean,
        durationSeconds: Double? = null
    ): Result<SessionMediaDraft> = runCatching {
        validateKey(target.key)
        val expectedDirectory = sessionDirectory(target.key).canonicalFile
        check(target.file.canonicalFile.parentFile == expectedDirectory) {
            "媒体文件不属于当前运动会话"
        }
        val index = readIndex(target.key)
        val pending = index.drafts.firstOrNull {
            it.id == target.draftId && it.status == SessionMediaDraftStatus.PendingCapture
        } ?: error("找不到待完成的媒体草稿")
        check(pending.type == target.type && pending.fileName == target.file.name) {
            "媒体草稿信息不一致"
        }
        if (!success) {
            removeDraftInternal(target.key, index, pending)
            error("拍摄已取消")
        }
        val actualBytes = target.file.length()
        validateCapturedFile(target.type, actualBytes, durationSeconds)
        val ready = pending.copy(
            byteCount = actualBytes,
            durationSeconds = durationSeconds?.takeIf { it >= 0.0 },
            compressedForUpload = target.type != ProofMediaType.Video,
            status = SessionMediaDraftStatus.Ready
        )
        check(writeIndex(target.key, index.copy(
            drafts = index.drafts.map { if (it.id == ready.id) ready else it }
        ))) { "无法更新媒体草稿索引" }
        ready
    }.onFailure {
        if (!success || !isCapturedFileValid(target.type, target.file.length(), durationSeconds)) {
            cancelCapture(target)
        }
    }

    @Synchronized
    fun list(key: SessionDraftKey): List<SessionMediaDraft> {
        validateKey(key)
        return readAndRecoverIndex(key).drafts.filter {
            it.status == SessionMediaDraftStatus.Ready
        }
    }

    /** Records the latest server identity immediately after bind/poll succeeds. */
    @Synchronized
    fun setServerEvidence(
        key: SessionDraftKey,
        draftId: String,
        evidence: ExerciseMediaEvidence
    ): SessionMediaDraft? {
        validateKey(key)
        require(evidence.sessionId == key.sessionId) { "Server media belongs to another session" }
        val index = readAndRecoverIndex(key)
        val draft = index.drafts.firstOrNull {
            it.id == draftId && it.status == SessionMediaDraftStatus.Ready
        } ?: return null
        require(evidence.mediaType == draft.type) { "Server media type does not match the draft" }
        val updated = draft.copy(
            serverMediaId = evidence.mediaId,
            serverMediaStatus = evidence.status,
            serverMediaVersion = evidence.version
        )
        check(writeIndex(key, index.copy(drafts = index.drafts.map {
            if (it.id == draft.id) updated else it
        }))) { "Unable to persist the media upload checkpoint" }
        return updated
    }

    /** Persists a user-selected video cover frame without changing the media file. */
    @Synchronized
    fun setVideoCover(
        key: SessionDraftKey,
        draftId: String,
        timestampMillis: Long
    ): Boolean {
        validateKey(key)
        if (timestampMillis < 0L) return false
        val index = readAndRecoverIndex(key)
        val draft = index.drafts.firstOrNull {
            it.id == draftId &&
                it.type == ProofMediaType.Video &&
                it.status == SessionMediaDraftStatus.Ready
        } ?: return false
        return writeIndex(
            key,
            index.copy(drafts = index.drafts.map {
                if (it.id == draft.id) it.copy(coverTimestampMillis = timestampMillis) else it
            })
        )
    }

    /**
     * Reorders only ready photos. Video positions and pending capture entries stay
     * where they are, so the supplied photo order is also the eventual upload order.
     */
    @Synchronized
    fun reorderImages(key: SessionDraftKey, orderedImageIds: List<String>): Boolean {
        validateKey(key)
        val index = readAndRecoverIndex(key)
        val images = index.drafts.filter {
            it.type == ProofMediaType.Image && it.status == SessionMediaDraftStatus.Ready
        }
        if (images.size < 2) return false
        if (orderedImageIds.distinct().size != images.size || orderedImageIds.toSet() != images.map { it.id }.toSet()) {
            return false
        }
        val orderedImages = images.associateBy { it.id }
        val iterator = orderedImageIds.iterator()
        val updated = index.copy(drafts = index.drafts.map { draft ->
            if (draft.type == ProofMediaType.Image && draft.status == SessionMediaDraftStatus.Ready) {
                orderedImages.getValue(iterator.next())
            } else {
                draft
            }
        })
        return writeIndex(key, updated)
    }

    @Synchronized
    fun readyForSubmission(key: SessionDraftKey): Result<List<SessionMediaDraft>> = runCatching {
        val ready = list(key)
        ready.forEach { draft ->
            val file = resolveFile(key, draft)
            check(file.isFile && file.length() == draft.byteCount) { "凭证文件不存在或已发生变化" }
            check(draft.type != ProofMediaType.Video || draft.compressedForUpload) {
                "视频压缩尚未完成，不能上传"
            }
        }
        ExerciseMediaPolicy.validateSelection(ready.map { draft ->
            ExerciseMediaCandidate(
                type = draft.type,
                byteCount = draft.byteCount,
                durationSeconds = draft.durationSeconds,
                source = ExerciseMediaSource.CAMERA
            )
        }).getOrThrow()
        ready
    }

    @Synchronized
    fun remove(key: SessionDraftKey, draftId: String): Boolean {
        validateKey(key)
        val index = readIndex(key)
        val draft = index.drafts.firstOrNull { it.id == draftId } ?: return false
        if (draft.serverMediaId != null) return false
        return removeDraftInternal(key, index, draft)
    }

    /** Allocates a staging file for a replacement capture while preserving the original draft. */
    @Synchronized
    fun prepareReplacement(
        key: SessionDraftKey,
        draftId: String
    ): Result<SessionMediaFileUpdateTarget> = prepareFileUpdate(key, draftId, replacesCapture = true)

    /** Allocates a staging file for a photo/video edit while preserving the original draft. */
    @Synchronized
    fun prepareEdit(
        key: SessionDraftKey,
        draftId: String
    ): Result<SessionMediaFileUpdateTarget> = prepareFileUpdate(key, draftId, replacesCapture = false)

    /** Removes an uncommitted edit/replacement staging file. */
    @Synchronized
    fun cancelFileUpdate(target: SessionMediaFileUpdateTarget): Boolean {
        validateKey(target.key)
        return safeDelete(target.file, sessionDirectory(target.key))
    }

    /**
     * Commits a staged edit or replacement. The index is switched first and only
     * then is the no-longer-referenced original removed, preserving the original
     * whenever processing or index persistence fails.
     */
    @Synchronized
    fun commitFileUpdate(
        target: SessionMediaFileUpdateTarget,
        durationSeconds: Double? = null,
        compressedForUpload: Boolean? = null
    ): Result<SessionMediaDraft> = runCatching {
        validateKey(target.key)
        val directory = sessionDirectory(target.key).canonicalFile
        check(target.file.canonicalFile.parentFile == directory) {
            "编辑后的媒体文件不属于当前运动会话"
        }
        check(target.sourceFile.canonicalFile.parentFile == directory) {
            "原始媒体文件不属于当前运动会话"
        }
        check(target.file.name != target.sourceFile.name) { "编辑文件不能覆盖原始文件" }
        // The staged output is intentionally not in the index yet. Preserve it
        // during recovery so orphan cleanup does not remove the file we are
        // about to validate and commit.
        val index = readAndRecoverIndex(target.key, setOf(target.file.name))
        val original = index.drafts.firstOrNull {
            it.id == target.draftId && it.status == SessionMediaDraftStatus.Ready
        } ?: error("找不到待更新的媒体草稿")
        check(original.type == target.type) { "媒体类型与草稿不一致" }
        check(resolveFile(target.key, original).canonicalFile == target.sourceFile.canonicalFile) {
            "原始媒体草稿已变化，请重新操作"
        }
        val updatedDuration = durationSeconds ?: original.durationSeconds
        validateCapturedFile(target.type, target.file.length(), updatedDuration)

        val updated = original.copy(
            fileName = target.file.name,
            capturedAtEpochMillis = if (target.replacesCapture) clock.nowEpochMillis() else original.capturedAtEpochMillis,
            byteCount = target.file.length(),
            durationSeconds = updatedDuration,
            compressedForUpload = compressedForUpload
                ?: if (target.replacesCapture && target.type == ProofMediaType.Video) false
                else original.compressedForUpload,
            coverTimestampMillis = null,
            serverMediaId = null,
            serverMediaStatus = null,
            serverMediaVersion = null
        )
        val updatedIndex = index.copy(drafts = index.drafts.map {
            if (it.id == original.id) updated else it
        })
        check(writeIndex(target.key, updatedIndex)) { "无法保存编辑后的媒体草稿" }

        // The updated index already points to the new file. A failed cleanup only
        // leaves an orphan that readAndRecoverIndex removes later; it never loses
        // the newly saved draft.
        runCatching { safeDelete(target.sourceFile, directory) }
        runCatching { cleanupUnreferencedFiles(target.key, updatedIndex) }
        updated
    }.onFailure {
        // Before the index switch this is only a staging file, so removing it is safe.
        // After a successful switch there are no fallible statements above this line.
        cancelFileUpdate(target)
    }

    @Synchronized
    fun cancelCapture(target: SessionCaptureTarget): Boolean {
        validateKey(target.key)
        val index = readIndex(target.key)
        val draft = index.drafts.firstOrNull { it.id == target.draftId }
        return if (draft == null) {
            safeDelete(target.file, sessionDirectory(target.key))
        } else {
            removeDraftInternal(target.key, index, draft)
        }
    }

    @Synchronized
    fun clearSession(key: SessionDraftKey): Boolean {
        validateKey(key)
        val directory = sessionDirectory(key)
        return !directory.exists() || directory.deleteRecursively()
    }

    @Synchronized
    fun clearAccount(accountId: String): Boolean {
        require(accountId.isNotBlank()) { "账号不能为空" }
        val directory = File(rootDirectory, stableHash(accountId.trim()))
        check(isWithinRoot(directory)) { "账号草稿目录越界" }
        return !directory.exists() || directory.deleteRecursively()
    }

    @Synchronized
    fun cleanupExpiredOrphans(
        activeKeys: Set<SessionDraftKey>,
        retentionMillis: Long = DefaultOrphanRetentionMillis
    ): Int {
        require(retentionMillis >= 0L) { "保留时间不能为负数" }
        if (!rootDirectory.isDirectory) return 0
        val activePaths = activeKeys.map { sessionDirectory(it).canonicalPath }.toSet()
        val cutoff = clock.nowEpochMillis() - retentionMillis
        var removed = 0
        rootDirectory.listFiles()?.filter { it.isDirectory }?.forEach { accountDirectory ->
            accountDirectory.listFiles()?.filter { it.isDirectory }?.forEach { sessionDirectory ->
                val canonical = sessionDirectory.canonicalPath
                if (
                    canonical !in activePaths &&
                    isWithinRoot(sessionDirectory) &&
                    sessionDirectory.lastModified() <= cutoff &&
                    sessionDirectory.deleteRecursively()
                ) {
                    removed += 1
                }
            }
            if (accountDirectory.listFiles().isNullOrEmpty()) accountDirectory.delete()
        }
        return removed
    }

    fun resolveFile(key: SessionDraftKey, draft: SessionMediaDraft): File {
        validateKey(key)
        require(isSafeFileName(draft.fileName)) { "媒体文件名无效" }
        val directory = sessionDirectory(key)
        return File(directory, draft.fileName).also { file ->
            check(file.canonicalFile.parentFile == directory.canonicalFile) { "媒体文件路径越界" }
        }
    }

    private fun readAndRecoverIndex(
        key: SessionDraftKey,
        preserveFileNames: Set<String> = emptySet()
    ): SessionMediaDraftIndex {
        val index = readIndex(key)
        val now = clock.nowEpochMillis()
        var changed = false
        val recovered = index.drafts.mapNotNull { draft ->
            val file = runCatching { resolveFile(key, draft) }.getOrNull()
            if (file == null) {
                changed = true
                return@mapNotNull null
            }
            when (draft.status) {
                SessionMediaDraftStatus.Ready -> {
                    if (!file.isFile || !isFileSizeValid(draft.type, file.length())) {
                        safeDelete(file, sessionDirectory(key))
                        changed = true
                        null
                    } else if (draft.byteCount != file.length()) {
                        changed = true
                        draft.copy(byteCount = file.length())
                    } else {
                        draft
                    }
                }

                SessionMediaDraftStatus.PendingCapture -> {
                    when {
                        now - draft.capturedAtEpochMillis >= PendingCaptureRetentionMillis -> {
                            safeDelete(file, sessionDirectory(key))
                            changed = true
                            null
                        }

                        // Bytes written by the camera are still unconfirmed. A process
                        // restart must never silently promote them into retained evidence.
                        // Only completeCapture(success = true), called after the camera or
                        // recorder reports user acceptance, may transition PendingCapture to Ready.
                        else -> draft
                    }
                }
            }
        }.distinctBy { it.id }
        if (recovered.size != index.drafts.size) changed = true
        val result = index.copy(drafts = recovered)
        if (changed) writeIndex(key, result)
        cleanupUnreferencedFiles(key, result, preserveFileNames)
        return result
    }

    private fun readIndex(key: SessionDraftKey): SessionMediaDraftIndex {
        val file = indexFile(key)
        if (!file.isFile) return SessionMediaDraftIndex()
        return try {
            val index = gson.fromJson(file.readText(Charsets.UTF_8), SessionMediaDraftIndex::class.java)
            if (index == null || index.schemaVersion != SessionMediaDraftIndex.CurrentSchemaVersion) {
                SessionMediaDraftIndex()
            } else {
                index.copy(drafts = index.drafts.orEmpty())
            }
        } catch (_: RuntimeException) {
            SessionMediaDraftIndex()
        }
    }

    private fun writeIndex(key: SessionDraftKey, index: SessionMediaDraftIndex): Boolean {
        val directory = sessionDirectory(key)
        if (!directory.mkdirs() && !directory.isDirectory) return false
        val destination = indexFile(key)
        val temporary = File(directory, "$IndexFileName.tmp")
        return try {
            temporary.writeText(gson.toJson(index), Charsets.UTF_8)
            try {
                Files.move(
                    temporary.toPath(),
                    destination.toPath(),
                    StandardCopyOption.REPLACE_EXISTING,
                    StandardCopyOption.ATOMIC_MOVE
                )
            } catch (_: AtomicMoveNotSupportedException) {
                Files.move(
                    temporary.toPath(),
                    destination.toPath(),
                    StandardCopyOption.REPLACE_EXISTING
                )
            }
            directory.setLastModified(clock.nowEpochMillis())
            true
        } catch (_: Exception) {
            temporary.delete()
            false
        }
    }

    private fun removeDraftInternal(
        key: SessionDraftKey,
        index: SessionMediaDraftIndex,
        draft: SessionMediaDraft
    ): Boolean {
        val remaining = index.drafts.filterNot { it.id == draft.id }
        val indexUpdated = writeIndex(key, index.copy(drafts = remaining))
        if (!indexUpdated) return false
        runCatching {
            safeDelete(resolveFile(key, draft), sessionDirectory(key))
        }
        if (remaining.isEmpty()) {
            indexFile(key).delete()
            sessionDirectory(key).delete()
        } else {
            cleanupUnreferencedFiles(key, index.copy(drafts = remaining))
        }
        return true
    }

    private fun prepareFileUpdate(
        key: SessionDraftKey,
        draftId: String,
        replacesCapture: Boolean
    ): Result<SessionMediaFileUpdateTarget> = runCatching {
        validateKey(key)
        val index = readAndRecoverIndex(key)
        val draft = index.drafts.firstOrNull {
            it.id == draftId && it.status == SessionMediaDraftStatus.Ready
        } ?: error("找不到可更新的媒体草稿")
        check(draft.serverMediaId == null) {
            "A media draft that has reached the server cannot be edited or replaced"
        }
        val source = resolveFile(key, draft)
        check(source.isFile && source.length() > 0L) { "原始媒体文件不存在或已损坏" }
        val directory = sessionDirectory(key).also { directory ->
            check(directory.mkdirs() || directory.isDirectory) { "无法创建媒体编辑目录" }
        }
        val extension = if (draft.type == ProofMediaType.Image) "jpg" else "mp4"
        val prefix = if (draft.type == ProofMediaType.Image) "photo" else "video"
        val purpose = if (replacesCapture) "replacement" else "edit"
        val targetFile = File(directory, "${prefix}_${purpose}_${UUID.randomUUID()}.$extension")
        check(targetFile.createNewFile()) { "无法创建媒体编辑临时文件" }
        SessionMediaFileUpdateTarget(
            key = key,
            draftId = draft.id,
            type = draft.type,
            sourceFile = source,
            file = targetFile,
            replacesCapture = replacesCapture
        )
    }

    private fun enforceAvailableSlot(
        drafts: List<SessionMediaDraft>,
        type: ProofMediaType
    ) {
        val count = drafts.count { it.type == type }
        val limit = if (type == ProofMediaType.Image) {
            ExerciseMediaPolicy.MaxImageCount
        } else {
            ExerciseMediaPolicy.MaxVideoCount
        }
        check(count < limit) {
            if (type == ProofMediaType.Image) {
                "运动过程中最多拍摄 $limit 张照片草稿"
            } else {
                "每次运动最多拍摄 $limit 个视频草稿"
            }
        }
    }

    private fun validateCapturedFile(
        type: ProofMediaType,
        byteCount: Long,
        durationSeconds: Double?
    ) {
        ExerciseMediaPolicy.validateCandidate(
            ExerciseMediaCandidate(
                type = type,
                byteCount = byteCount,
                durationSeconds = durationSeconds,
                source = ExerciseMediaSource.CAMERA
            )
        ).getOrThrow()
    }

    private fun isCapturedFileValid(
        type: ProofMediaType,
        byteCount: Long,
        durationSeconds: Double?
    ): Boolean {
        return ExerciseMediaPolicy.validateCandidate(
            ExerciseMediaCandidate(
                type = type,
                byteCount = byteCount,
                durationSeconds = durationSeconds,
                source = ExerciseMediaSource.CAMERA
            )
        ).isSuccess
    }

    private fun isFileSizeValid(type: ProofMediaType, byteCount: Long): Boolean =
        byteCount > 0L &&
            (type == ProofMediaType.Video || byteCount <= ExerciseMediaPolicy.MaxImageBytes)

    private fun validateKey(key: SessionDraftKey) {
        require(key.accountId.isNotBlank()) { "账号不能为空" }
        require(key.sessionId.isNotBlank()) { "运动会话编号不能为空" }
    }

    private fun sessionDirectory(key: SessionDraftKey): File {
        validateKey(key)
        val accountDirectory = File(rootDirectory, stableHash(key.accountId.trim()))
        val directory = File(accountDirectory, stableHash(key.sessionId.trim()))
        check(isWithinRoot(directory)) { "媒体草稿目录越界" }
        return directory
    }

    private fun indexFile(key: SessionDraftKey): File = File(sessionDirectory(key), IndexFileName)

    /** Removes files that are no longer referenced after cancelled edits/replacements. */
    private fun cleanupUnreferencedFiles(
        key: SessionDraftKey,
        index: SessionMediaDraftIndex,
        preserveFileNames: Set<String> = emptySet()
    ) {
        val directory = sessionDirectory(key)
        if (!directory.isDirectory) return
        val referenced = index.drafts.map { it.fileName }.toSet()
        directory.listFiles()?.forEach { candidate ->
            if (
                candidate.isFile &&
                candidate.name != IndexFileName &&
                candidate.name != "$IndexFileName.tmp" &&
                candidate.name !in referenced &&
                candidate.name !in preserveFileNames &&
                isSafeFileName(candidate.name)
            ) {
                safeDelete(candidate, directory)
            }
        }
    }

    private fun isWithinRoot(file: File): Boolean {
        val rootPath = rootDirectory.canonicalFile.toPath()
        return file.canonicalFile.toPath().startsWith(rootPath)
    }

    private fun safeDelete(file: File, expectedDirectory: File): Boolean {
        if (file.canonicalFile.parentFile != expectedDirectory.canonicalFile) return false
        return !file.exists() || file.delete()
    }

    private fun isSafeFileName(fileName: String): Boolean {
        return fileName.isNotBlank() &&
            fileName == File(fileName).name &&
            !fileName.contains("..")
    }

    private fun stableHash(value: String): String {
        return MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.UTF_8))
            .joinToString(separator = "") { byte -> "%02x".format(byte) }
    }

    private data class SessionMediaDraftIndex(
        val schemaVersion: Int = CurrentSchemaVersion,
        val drafts: List<SessionMediaDraft> = emptyList()
    ) {
        companion object {
            const val CurrentSchemaVersion = 1
        }
    }

    companion object {
        const val DefaultOrphanRetentionMillis = 7L * 24L * 60L * 60L * 1_000L
        private const val PendingCaptureRetentionMillis = 60L * 60L * 1_000L
        private const val IndexFileName = "drafts.v1.json"
    }
}
