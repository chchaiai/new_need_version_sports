package edu.bnbu.student.mvp.core.network.v1

import com.google.gson.JsonObject
import edu.bnbu.student.mvp.core.exercise.BindExerciseMediaCommand
import edu.bnbu.student.mvp.core.exercise.ConfirmExerciseMediaUploadCommand
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaEvidence
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadGateway
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadMethod
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadSession
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaServerStatus
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaVersionConflictException
import edu.bnbu.student.mvp.core.exercise.InitiateExerciseMediaUploadCommand
import edu.bnbu.student.mvp.core.model.ProofMediaType
import edu.bnbu.student.mvp.core.network.v1.generated.BindMediaRequest
import edu.bnbu.student.mvp.core.network.v1.generated.CaptureSource
import edu.bnbu.student.mvp.core.network.v1.generated.ConfirmMediaUploadRequest
import edu.bnbu.student.mvp.core.network.v1.generated.MediaBusinessPurpose
import edu.bnbu.student.mvp.core.network.v1.generated.MediaEvidence as ContractMediaEvidence
import edu.bnbu.student.mvp.core.network.v1.generated.MediaType as ContractMediaType
import edu.bnbu.student.mvp.core.network.v1.generated.MediaUploadStatus
import edu.bnbu.student.mvp.core.network.v1.generated.MediaUploadSession as ContractMediaUploadSession
import java.time.Instant

/** OpenAPI 1.3 adapter for initiating private Exercise Record media uploads. */
internal class V1ExerciseMediaUploadGateway(
    private val authorizedClient: V1AuthorizedApiClient,
    private val clock: () -> Instant = Instant::now,
    private val mutationRegistry: MutationIntentRegistry = MutationIntentRegistry()
) : ExerciseMediaUploadGateway {
    override suspend fun initiateUpload(
        command: InitiateExerciseMediaUploadCommand
    ): ExerciseMediaUploadSession {
        val normalized = command.normalized()
        val operationId = "initiateMediaUpload"
        val scope = mutationScope(
            operationId = operationId,
            actionSlot = "session:${normalized.sessionId}:intent:${normalized.uploadIntentId}"
        )
        val intent = mutationRegistry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput(
                operationId,
                normalized.canonicalFingerprint()
            )
        )
        val body = normalized.toContractJson()
        val response = authorizedClient.executeCancellable<ContractMediaUploadSession>(
            V1ApiRequest(
                operationId = operationId,
                method = V1HttpMethod.POST,
                relativePath = "media-uploads",
                body = V1ExplicitJsonBody(body)
            ).withMutationIntent(intent),
            ContractMediaUploadSession::class.java
        )
        // Failures intentionally leave the intent active so an explicit retry reuses its key.
        // Keep this intent active after initiation. If object transfer fails, retrying the
        // same local draft must replay the same server upload session instead of allocating
        // a second mediaId and consuming another media quota slot.
        return try {
            response.requireCreatedUploadSession(operationId).toDomain(clock())
        } catch (error: IllegalArgumentException) {
            // A successfully cached initiation can outlive its signed URL. Do not
            // pin this process to that expired idempotency result forever; the next
            // retry must obtain a new intent so the backend can fail/release the old
            // PENDING_UPLOAD row and create a fresh session.
            if (error.message == ExpiredUploadSessionMessage) {
                mutationRegistry.abandon(intent)
            }
            throw error
        }
    }

    override suspend fun confirmUpload(
        command: ConfirmExerciseMediaUploadCommand
    ): ExerciseMediaEvidence {
        val contractEntityTag = command.entityTag.normalizedForMediaConfirmation()
        val operationId = "confirmMediaUpload"
        val scope = mutationScope(operationId, "upload-session:${command.uploadSessionId}")
        val intent = mutationRegistry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput(
                operationId,
                "uploadSessionId=${command.uploadSessionId}\nmediaId=${command.mediaId}" +
                    "\netag=$contractEntityTag"
            )
        )
        val response = authorizedClient.executeCancellable<ContractMediaEvidence>(
            V1ApiRequest(
                operationId = operationId,
                method = V1HttpMethod.POST,
                relativePath = "media-uploads/{uploadSessionId}/confirm",
                pathSegments = listOf("media-uploads", command.uploadSessionId, "confirm"),
                body = ConfirmMediaUploadRequest(contractEntityTag)
            ).withMutationIntent(intent),
            ContractMediaEvidence::class.java
        )
        return response.requireMedia(operationId, command.mediaId)
            .toDomain()
            .also { mutationRegistry.complete(intent) }
    }

    override suspend fun getMedia(mediaId: String): ExerciseMediaEvidence {
        require(mediaId.isNotBlank()) { "Media ID cannot be blank." }
        val operationId = "getMediaEvidence"
        val response = authorizedClient.executeCancellable<ContractMediaEvidence>(
            V1ApiRequest(
                operationId = operationId,
                method = V1HttpMethod.GET,
                relativePath = "media/{mediaId}",
                pathSegments = listOf("media", mediaId)
            ),
            ContractMediaEvidence::class.java
        )
        return response.requireMedia(operationId, mediaId).toDomain()
    }

    override suspend fun bindMedia(command: BindExerciseMediaCommand): ExerciseMediaEvidence {
        val operationId = "bindMediaEvidence"
        val scope = mutationScope(
            operationId,
            "media:${command.mediaId}:version:${command.expectedVersion}"
        )
        val intent = mutationRegistry.acquire(
            scope,
            IntentFingerprint.fromCanonicalInput(
                operationId,
                "mediaId=${command.mediaId}\nsessionId=${command.sessionId}" +
                    "\nexpectedVersion=${command.expectedVersion}"
            )
        )
        return try {
            val response = authorizedClient.executeCancellable<ContractMediaEvidence>(
                V1ApiRequest(
                    operationId = operationId,
                    method = V1HttpMethod.POST,
                    relativePath = "media/{mediaId}/bind",
                    pathSegments = listOf("media", command.mediaId, "bind"),
                    body = BindMediaRequest(command.sessionId, command.expectedVersion)
                ).withMutationIntent(intent),
                ContractMediaEvidence::class.java
            )
            response.requireMedia(operationId, command.mediaId)
                .toDomain(expectedSessionId = command.sessionId)
                .also { mutationRegistry.complete(intent) }
        } catch (error: V1HttpException) {
            if (error.error.code.value == "CONFLICT_VERSION_MISMATCH") {
                mutationRegistry.complete(intent)
                throw ExerciseMediaVersionConflictException().also { it.initCause(error) }
            }
            throw error
        }
    }

    private fun mutationScope(
        operationId: String,
        actionSlot: String
    ): MutationIntentScope {
        val accountScope = authorizedClient.currentAccountScope()
            ?.trim()
            ?.takeIf(String::isNotEmpty)
            ?: throw IllegalStateException("An authenticated student session is required.")
        return MutationIntentScope(accountScope, operationId, actionSlot)
    }

    private fun InitiateExerciseMediaUploadCommand.toContractJson(): JsonObject = JsonObject().apply {
        addProperty("sessionId", sessionId)
        addProperty("businessPurpose", "EXERCISE_RECORD")
        addProperty(
            "mediaType",
            when (mediaType) {
                ProofMediaType.Image -> "IMAGE"
                ProofMediaType.Video -> "VIDEO"
            }
        )
        addProperty("mimeType", mimeType)
        addProperty("fileSizeBytes", fileSizeBytes)
        addProperty("captureSource", "IN_APP_CAMERA")
        declaredContentSha256?.let { addProperty("declaredContentSha256", it) }
        durationSeconds?.let { addProperty("durationSeconds", it) }
    }

    private fun InitiateExerciseMediaUploadCommand.canonicalFingerprint(): String = buildString {
        append("uploadIntentId=").append(uploadIntentId)
        append("\nsessionId=").append(sessionId)
        append("\nmediaType=").append(mediaType.name)
        append("\nmimeType=").append(mimeType)
        append("\nfileSizeBytes=").append(fileSizeBytes)
        append("\ndurationSeconds=").append(durationSeconds ?: "null")
        append("\ndeclaredContentSha256=").append(declaredContentSha256 ?: "null")
    }

    private fun V1ApiSuccess<ContractMediaUploadSession>.requireCreatedUploadSession(
        operationId: String
    ): ContractMediaUploadSession {
        if (statusCode != 201) {
            throw V1ProtocolException(
                operationId = operationId,
                statusCode = statusCode,
                requestId = meta.requestId,
                reason = "unexpected success status"
            )
        }
        return data ?: throw V1ProtocolException(
            operationId = operationId,
            statusCode = statusCode,
            requestId = meta.requestId,
            reason = "media upload session data is null"
        )
    }

    private fun V1ApiSuccess<ContractMediaEvidence>.requireMedia(
        operationId: String,
        expectedMediaId: String
    ): ContractMediaEvidence {
        if (statusCode != 200) {
            throw V1ProtocolException(
                operationId = operationId,
                statusCode = statusCode,
                requestId = meta.requestId,
                reason = "unexpected success status"
            )
        }
        val media = data ?: throw V1ProtocolException(
            operationId = operationId,
            statusCode = statusCode,
            requestId = meta.requestId,
            reason = "media evidence data is null"
        )
        require(media.id == expectedMediaId) { "Server returned different media evidence." }
        return media
    }

    private fun ContractMediaUploadSession.toDomain(now: Instant): ExerciseMediaUploadSession {
        val expiration = expiresAt.toInstant()
        require(expiration.isAfter(now)) { ExpiredUploadSessionMessage }
        return ExerciseMediaUploadSession(
            uploadSessionId = uploadSessionId,
            mediaId = mediaId,
            uploadUrl = uploadUrl,
            uploadMethod = when (uploadMethod) {
                ContractMediaUploadSession.UploadMethod.PUT -> ExerciseMediaUploadMethod.PUT
                ContractMediaUploadSession.UploadMethod.POST -> ExerciseMediaUploadMethod.POST
            },
            requiredHeaders = requiredHeaders.toMap(),
            expiresAtEpochMillis = expiration.toEpochMilli()
        )
    }

    private fun ContractMediaEvidence.toDomain(
        expectedSessionId: String? = null
    ): ExerciseMediaEvidence {
        require(businessPurpose == MediaBusinessPurpose.EXERCISE_RECORD) {
            "Server media purpose is not EXERCISE_RECORD."
        }
        require(captureSource == CaptureSource.IN_APP_CAMERA) {
            "Server media capture source is not IN_APP_CAMERA."
        }
        require(enrollmentId == null) {
            "Exercise Record media cannot be scoped to an enrollment."
        }
        val ownedSessionId = requireNotNull(sessionId) {
            "Exercise Record media is missing its session."
        }
        require(expectedSessionId == null || ownedSessionId == expectedSessionId) {
            "Server media belongs to a different exercise session."
        }
        require(version >= 1L) { "Server media version must be positive." }
        return ExerciseMediaEvidence(
            mediaId = id,
            sessionId = ownedSessionId,
            mediaType = when (mediaType) {
                ContractMediaType.IMAGE -> ProofMediaType.Image
                ContractMediaType.VIDEO -> ProofMediaType.Video
            },
            status = when (uploadStatus) {
                MediaUploadStatus.PENDING_UPLOAD -> ExerciseMediaServerStatus.PENDING_UPLOAD
                MediaUploadStatus.UPLOADED -> ExerciseMediaServerStatus.UPLOADED
                MediaUploadStatus.BOUND -> ExerciseMediaServerStatus.BOUND
                MediaUploadStatus.PROCESSING -> ExerciseMediaServerStatus.PROCESSING
                MediaUploadStatus.AVAILABLE -> ExerciseMediaServerStatus.AVAILABLE
                MediaUploadStatus.FAILED -> ExerciseMediaServerStatus.FAILED
                MediaUploadStatus.DELETED -> ExerciseMediaServerStatus.DELETED
            },
            version = version
        )
    }

    private companion object {
        const val ExpiredUploadSessionMessage = "Media upload session is already expired."
    }
}

/**
 * S3-compatible object stores return ETag response headers surrounded by quotes. The
 * confirmation endpoint compares the normalized opaque value and its request validator
 * accepts only the unquoted representation, so quotes must not cross the API boundary.
 */
internal fun String.normalizedForMediaConfirmation(): String {
    val normalized = trim().removeSurrounding("\"")
    require(normalized.isNotEmpty()) { "Media ETag cannot be blank." }
    return normalized
}
