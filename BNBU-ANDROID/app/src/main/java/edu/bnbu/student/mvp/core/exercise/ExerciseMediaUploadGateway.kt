package edu.bnbu.student.mvp.core.exercise

import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.network.UploadProgress
import java.net.URI
import java.io.File

internal interface ExerciseMediaUploadGateway {
    suspend fun initiateUpload(
        command: InitiateExerciseMediaUploadCommand
    ): ExerciseMediaUploadSession

    suspend fun confirmUpload(command: ConfirmExerciseMediaUploadCommand): ExerciseMediaEvidence

    suspend fun getMedia(mediaId: String): ExerciseMediaEvidence

    suspend fun bindMedia(command: BindExerciseMediaCommand): ExerciseMediaEvidence
}

internal interface ExerciseMediaObjectUploader {
    suspend fun upload(command: UploadExerciseMediaObjectCommand): ExerciseMediaUploadReceipt

    suspend fun upload(
        command: UploadExerciseMediaObjectCommand,
        onProgress: (UploadProgress) -> Unit
    ): ExerciseMediaUploadReceipt = upload(command)
}

internal data class InitiateExerciseMediaUploadCommand(
    val uploadIntentId: String,
    val sessionId: String,
    val mediaType: ProofMediaType,
    val mimeType: String,
    val fileSizeBytes: Long,
    val durationSeconds: Long? = null,
    val declaredContentSha256: String? = null
) {
    init {
        require(uploadIntentId.trim().length in 1..MaxMediaUploadIntentIdLength) {
            "Upload intent ID must contain 1 to $MaxMediaUploadIntentIdLength characters."
        }
        require(sessionId.isNotBlank()) { "Exercise session ID cannot be blank." }
        require(fileSizeBytes > 0L) { "Media file cannot be empty." }
        require(mimeType.length in 1..MaxMediaMimeTypeLength) {
            "MIME type must contain 1 to $MaxMediaMimeTypeLength characters."
        }
        val normalizedMimeType = mimeType.trim().lowercase()
        when (mediaType) {
            ProofMediaType.Image -> {
                require(normalizedMimeType in AllowedExerciseImageMimeTypes) {
                    "Exercise image MIME type is not allowed."
                }
                require(fileSizeBytes <= ExerciseMediaPolicy.MaxImageBytes) {
                    "Exercise image exceeds its size limit."
                }
                require(durationSeconds == null) { "Exercise images cannot have a duration." }
            }

            ProofMediaType.Video -> {
                require(normalizedMimeType in AllowedExerciseVideoMimeTypes) {
                    "Exercise video MIME type is not allowed."
                }
                val duration = requireNotNull(durationSeconds) {
                    "Exercise video duration is required."
                }
                require(duration in 1L..ExerciseMediaPolicy.MaxVideoDurationSeconds.toLong()) {
                    "Exercise video duration is outside the allowed range."
                }
            }
        }
        declaredContentSha256?.let { hash ->
            require(Sha256.matches(hash.lowercase())) {
                "Declared SHA-256 must contain exactly 64 hexadecimal characters."
            }
        }
    }

    fun normalized(): InitiateExerciseMediaUploadCommand = copy(
        uploadIntentId = uploadIntentId.trim(),
        sessionId = sessionId.trim(),
        mimeType = mimeType.trim().lowercase(),
        declaredContentSha256 = declaredContentSha256?.trim()?.lowercase()
    )
}

internal enum class ExerciseMediaUploadMethod {
    PUT,
    POST
}

internal data class UploadExerciseMediaObjectCommand(
    val uploadSession: ExerciseMediaUploadSession,
    val sourceFile: File,
    val mimeType: String,
    val expectedFileSizeBytes: Long
) {
    init {
        require(sourceFile.isFile) { "Exercise media source file does not exist." }
        require(expectedFileSizeBytes > 0L) { "Expected media size must be positive." }
        require(sourceFile.length() == expectedFileSizeBytes) {
            "Exercise media file size changed before upload."
        }
        require(mimeType.trim().lowercase() in
            AllowedExerciseImageMimeTypes + AllowedExerciseVideoMimeTypes) {
            "Exercise media MIME type is not allowed."
        }
        uploadSession.requiredHeaders.entries
            .firstOrNull { it.key.equals("Content-Type", ignoreCase = true) }
            ?.let { required ->
                require(required.value.equals(mimeType.trim(), ignoreCase = true)) {
                    "Signed upload Content-Type does not match the local media type."
                }
            }
        uploadSession.requiredHeaders.entries
            .firstOrNull { it.key.equals("Content-Length", ignoreCase = true) }
            ?.let { required ->
                require(required.value.toLongOrNull() == expectedFileSizeBytes) {
                    "Signed upload Content-Length does not match the local media size."
                }
            }
    }
}

internal data class ExerciseMediaUploadReceipt(val entityTag: String) {
    init {
        require(entityTag.length in 1..MaxMediaEntityTagLength) {
            "Media entity tag must contain 1 to $MaxMediaEntityTagLength characters."
        }
    }

    override fun toString(): String = "ExerciseMediaUploadReceipt(entityTag=[redacted])"
}

internal data class ConfirmExerciseMediaUploadCommand(
    val uploadSessionId: String,
    val mediaId: String,
    val entityTag: String
) {
    init {
        require(uploadSessionId.isNotBlank()) { "Upload session ID cannot be blank." }
        require(mediaId.isNotBlank()) { "Media ID cannot be blank." }
        require(entityTag.length in 1..MaxMediaEntityTagLength) {
            "Media entity tag must contain 1 to $MaxMediaEntityTagLength characters."
        }
    }
}

internal data class BindExerciseMediaCommand(
    val mediaId: String,
    val sessionId: String,
    val expectedVersion: Long
) {
    init {
        require(mediaId.isNotBlank()) { "Media ID cannot be blank." }
        require(sessionId.isNotBlank()) { "Exercise session ID cannot be blank." }
        require(expectedVersion >= 1L) { "Media version must be positive." }
    }
}

internal enum class ExerciseMediaServerStatus {
    PENDING_UPLOAD,
    UPLOADED,
    BOUND,
    PROCESSING,
    AVAILABLE,
    FAILED,
    DELETED
}

internal data class ExerciseMediaEvidence(
    val mediaId: String,
    val sessionId: String,
    val mediaType: ProofMediaType,
    val status: ExerciseMediaServerStatus,
    val version: Long
) {
    init {
        require(mediaId.isNotBlank()) { "Media ID cannot be blank." }
        require(sessionId.isNotBlank()) { "Exercise session ID cannot be blank." }
        require(version >= 1L) { "Media version must be positive." }
    }

    fun toRecordReference(): ExerciseMediaReference = ExerciseMediaReference(
        mediaId = mediaId,
        sessionId = sessionId,
        type = mediaType,
        availability = when (status) {
            ExerciseMediaServerStatus.AVAILABLE -> ExerciseMediaAvailability.AVAILABLE
            ExerciseMediaServerStatus.FAILED,
            ExerciseMediaServerStatus.DELETED -> ExerciseMediaAvailability.FAILED
            else -> ExerciseMediaAvailability.PROCESSING
        }
    )
}

internal class ExerciseMediaVersionConflictException(
    message: String = "Exercise media version conflict."
) : IllegalStateException(message)

internal data class ExerciseMediaUploadSession(
    val uploadSessionId: String,
    val mediaId: String,
    val uploadUrl: URI,
    val uploadMethod: ExerciseMediaUploadMethod,
    val requiredHeaders: Map<String, String>,
    val expiresAtEpochMillis: Long
) {
    init {
        require(uploadSessionId.isNotBlank()) { "Upload session ID cannot be blank." }
        require(mediaId.isNotBlank()) { "Media ID cannot be blank." }
        require(
            uploadUrl.isAbsolute &&
                !uploadUrl.isOpaque &&
                !uploadUrl.host.isNullOrBlank() &&
                uploadUrl.scheme.lowercase() in setOf("http", "https")
        ) {
            "Upload URL must be an absolute HTTP(S) URL."
        }
        require(uploadUrl.userInfo == null && uploadUrl.fragment == null) {
            "Upload URL cannot contain user information or a fragment."
        }
        require(expiresAtEpochMillis > 0L) { "Upload session expiration must be positive." }
        require(requiredHeaders.keys.all(MediaUploadHeaderName::matches)) {
            "Upload header name is invalid."
        }
        require(requiredHeaders.values.all { value ->
            value.isNotBlank() && value.all { it == '\t' || it.code in 0x20..0x7e }
        }) {
            "Upload header value is blank or contains unsafe control characters."
        }
        require(requiredHeaders.keys.map(String::lowercase).distinct().size == requiredHeaders.size) {
            "Upload headers cannot contain case-insensitive duplicates."
        }
    }

    override fun toString(): String =
        "ExerciseMediaUploadSession(uploadSessionId=[redacted], mediaId=[redacted], " +
            "uploadUrl=[redacted], uploadMethod=$uploadMethod, requiredHeaders=[redacted], " +
            "expiresAtEpochMillis=$expiresAtEpochMillis)"
}

internal val AllowedExerciseImageMimeTypes = setOf("image/jpeg", "image/png")
internal val AllowedExerciseVideoMimeTypes = setOf("video/mp4")
internal const val MaxMediaUploadIntentIdLength = 128
internal const val MaxMediaMimeTypeLength = 127
internal const val MaxMediaEntityTagLength = 256
private val Sha256 = Regex("^[a-f0-9]{64}$")
private val MediaUploadHeaderName = Regex("^[!#$%&'*+.^_`|~0-9A-Za-z-]+$")
