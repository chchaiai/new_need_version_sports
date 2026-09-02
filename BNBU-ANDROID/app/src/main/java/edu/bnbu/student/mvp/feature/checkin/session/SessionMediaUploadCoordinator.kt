package edu.bnbu.student.mvp.feature.checkin.session

import edu.bnbu.student.mvp.core.exercise.BindExerciseMediaCommand
import edu.bnbu.student.mvp.core.exercise.ConfirmExerciseMediaUploadCommand
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaCandidate
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaEvidence
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaObjectUploader
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaPolicy
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaServerStatus
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaSource
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadGateway
import edu.bnbu.student.mvp.core.exercise.InitiateExerciseMediaUploadCommand
import edu.bnbu.student.mvp.core.exercise.UploadExerciseMediaObjectCommand
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.network.UploadProgress
import java.io.File
import java.security.MessageDigest
import kotlin.math.ceil
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Bridges a preserved local camera draft to the private mediaId lifecycle. */
internal class SessionMediaUploadCoordinator(
    private val gateway: ExerciseMediaUploadGateway,
    private val objectUploader: ExerciseMediaObjectUploader
) {
    suspend fun uploadAndBind(
        sessionId: String,
        draft: SessionMediaDraft,
        sourceFile: File,
        onProgress: (UploadProgress) -> Unit = {}
    ): ExerciseMediaEvidence {
        require(sessionId.isNotBlank()) { "Exercise session ID cannot be blank." }
        require(draft.status == SessionMediaDraftStatus.Ready) {
            "Only a ready local camera draft can be uploaded."
        }
        require(draft.type != ProofMediaType.Video || draft.compressedForUpload) {
            "Uncompressed exercise video cannot be uploaded."
        }
        require(sourceFile.isFile && sourceFile.name == draft.fileName) {
            "The local media draft file is missing or mismatched."
        }
        require(sourceFile.length() == draft.byteCount) {
            "The local media draft changed after capture."
        }
        ExerciseMediaPolicy.validateCandidate(
            ExerciseMediaCandidate(
                type = draft.type,
                byteCount = draft.byteCount,
                durationSeconds = draft.durationSeconds,
                source = ExerciseMediaSource.CAMERA
            )
        ).getOrThrow()

        val mimeType = resolveMimeType(draft, sourceFile)
        val durationSeconds = when (draft.type) {
            ProofMediaType.Image -> null
            ProofMediaType.Video -> ceil(requireNotNull(draft.durationSeconds)).toLong()
        }
        val declaration = InitiateExerciseMediaUploadCommand(
            uploadIntentId = draft.id,
            sessionId = sessionId,
            mediaType = draft.type,
            mimeType = mimeType,
            fileSizeBytes = draft.byteCount,
            durationSeconds = durationSeconds,
            declaredContentSha256 = sha256(sourceFile)
        )
        val uploadSession = gateway.initiateUpload(declaration)
        val receipt = objectUploader.upload(
            UploadExerciseMediaObjectCommand(
                uploadSession = uploadSession,
                sourceFile = sourceFile,
                mimeType = mimeType,
                expectedFileSizeBytes = draft.byteCount
            ),
            onProgress
        )
        val confirmed = gateway.confirmUpload(
            ConfirmExerciseMediaUploadCommand(
                uploadSessionId = uploadSession.uploadSessionId,
                mediaId = uploadSession.mediaId,
                entityTag = receipt.entityTag
            )
        )
        require(confirmed.sessionId == sessionId && confirmed.mediaType == draft.type) {
            "Confirmed media does not match the local camera draft."
        }
        require(confirmed.status == ExerciseMediaServerStatus.UPLOADED) {
            "Confirmed media did not enter UPLOADED state."
        }
        return gateway.bindMedia(
            BindExerciseMediaCommand(
                mediaId = confirmed.mediaId,
                sessionId = sessionId,
                expectedVersion = confirmed.version
            )
        ).also { bound ->
            require(bound.sessionId == sessionId && bound.mediaType == draft.type) {
                "Bound media does not match the local camera draft."
            }
            require(
                bound.status in setOf(
                    ExerciseMediaServerStatus.BOUND,
                    ExerciseMediaServerStatus.PROCESSING,
                    ExerciseMediaServerStatus.AVAILABLE
                )
            ) { "Bound media entered an invalid server state." }
        }
    }

    suspend fun refresh(evidence: ExerciseMediaEvidence): ExerciseMediaEvidence =
        gateway.getMedia(evidence.mediaId).also { refreshed ->
            require(
                refreshed.sessionId == evidence.sessionId &&
                    refreshed.mediaType == evidence.mediaType
            ) { "Refreshed media identity does not match the upload." }
        }

    private fun resolveMimeType(draft: SessionMediaDraft, sourceFile: File): String =
        when (draft.type) {
            ProofMediaType.Image -> when (sourceFile.extension.lowercase()) {
                "jpg", "jpeg" -> "image/jpeg"
                "png" -> "image/png"
                else -> error("Exercise image extension is not supported.")
            }

            ProofMediaType.Video -> when (sourceFile.extension.lowercase()) {
                "mp4" -> "video/mp4"
                else -> error("Exercise video extension is not supported.")
            }
        }

    private suspend fun sha256(file: File): String = withContext(Dispatchers.IO) {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().buffered().use { input ->
            val buffer = ByteArray(DefaultHashBufferBytes)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                if (count > 0) digest.update(buffer, 0, count)
            }
        }
        digest.digest().joinToString("") { byte ->
            (byte.toInt() and 0xff).toString(16).padStart(2, '0')
        }
    }

    private companion object {
        const val DefaultHashBufferBytes = 8 * 1024
    }
}
