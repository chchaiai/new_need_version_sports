package edu.bnbu.student.mvp.core.network.v1

import edu.bnbu.student.mvp.core.exercise.ExerciseMediaObjectUploader
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadMethod
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadReceipt
import edu.bnbu.student.mvp.core.exercise.UploadExerciseMediaObjectCommand
import edu.bnbu.student.mvp.core.network.ProgressRequestBody
import edu.bnbu.student.mvp.core.network.UploadProgress
import java.io.IOException
import java.time.Instant
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.Response

internal class PrivateExerciseMediaObjectUploader(
    httpClient: OkHttpClient,
    private val clock: () -> Instant = Instant::now
) : ExerciseMediaObjectUploader {
    private val storageClient = httpClient.newBuilder()
        .followRedirects(false)
        .followSslRedirects(false)
        .retryOnConnectionFailure(false)
        .build()

    override suspend fun upload(
        command: UploadExerciseMediaObjectCommand
    ): ExerciseMediaUploadReceipt = upload(command) {}

    override suspend fun upload(
        command: UploadExerciseMediaObjectCommand,
        onProgress: (UploadProgress) -> Unit
    ): ExerciseMediaUploadReceipt {
        require(command.uploadSession.expiresAtEpochMillis > clock().toEpochMilli()) {
            "Media upload session is expired."
        }
        val requestBody = ProgressRequestBody(
            command.sourceFile.asRequestBody(command.mimeType.trim().lowercase().toMediaType()),
            onProgress
        )
        val request = Request.Builder()
            .url(command.uploadSession.uploadUrl.toURL())
            .apply {
                command.uploadSession.requiredHeaders.forEach { (name, value) -> header(name, value) }
            }
            .method(command.uploadSession.uploadMethod.name, requestBody)
            .build()
        return execute(request)
    }

    private suspend fun execute(request: Request): ExerciseMediaUploadReceipt =
        suspendCancellableCoroutine { continuation ->
            val call = storageClient.newCall(request)
            continuation.invokeOnCancellation { call.cancel() }
            call.enqueue(object : Callback {
                override fun onFailure(call: Call, error: IOException) {
                    if (continuation.isActive) {
                        continuation.resumeWithException(
                            ExerciseMediaObjectUploadException(
                                message = "Private media upload failed."
                            )
                        )
                    }
                }

                override fun onResponse(call: Call, response: Response) {
                    val result = runCatching {
                        response.use {
                            if (it.code !in 200..299) {
                                val failure = it.storageFailureMetadata()
                                throw ExerciseMediaObjectUploadException(
                                    message = "Private media upload returned HTTP ${it.code}.",
                                    httpStatus = it.code,
                                    storageErrorCode = failure.errorCode,
                                    storageRequestId = failure.requestId
                                )
                            }
                            val entityTag = it.header("ETag")?.trim().orEmpty()
                            if (entityTag.isEmpty()) {
                                throw ExerciseMediaObjectUploadException(
                                    message = "Private media upload response is missing ETag.",
                                    httpStatus = it.code
                                )
                            }
                            ExerciseMediaUploadReceipt(entityTag)
                        }
                    }
                    if (!continuation.isActive) return
                    result.fold(
                        onSuccess = continuation::resume,
                        onFailure = continuation::resumeWithException
                    )
                }
            })
        }
}

internal enum class ExerciseMediaStorageErrorCode(val wireValue: String) {
    SIGNATURE_DOES_NOT_MATCH("SignatureDoesNotMatch"),
    ACCESS_DENIED("AccessDenied"),
    EXPIRED_TOKEN("ExpiredToken"),
    REQUEST_EXPIRED("RequestExpired"),
    REQUEST_TIME_TOO_SKEWED("RequestTimeTooSkewed");

    companion object {
        fun fromWireValue(value: String?): ExerciseMediaStorageErrorCode? =
            entries.firstOrNull { it.wireValue == value?.trim() }
    }
}

internal class ExerciseMediaObjectUploadException(
    message: String,
    val httpStatus: Int? = null,
    val storageErrorCode: ExerciseMediaStorageErrorCode? = null,
    val storageRequestId: String? = null
) : IOException(message)

private data class StorageFailureMetadata(
    val errorCode: ExerciseMediaStorageErrorCode?,
    val requestId: String?
)

private fun Response.storageFailureMetadata(): StorageFailureMetadata {
    val boundedBody = readBoundedStorageErrorBody()
    val errorCode = ExerciseMediaStorageErrorCode.fromWireValue(
        STORAGE_ERROR_CODE_XML.find(boundedBody)?.groupValues?.getOrNull(1)
    )
    val headerRequestId = STORAGE_REQUEST_ID_HEADERS.firstNotNullOfOrNull { headerName ->
        header(headerName).safeStorageRequestId()
    }
    val xmlRequestId = STORAGE_REQUEST_ID_XML.find(boundedBody)
        ?.groupValues
        ?.getOrNull(1)
        .safeStorageRequestId()
    return StorageFailureMetadata(
        errorCode = errorCode,
        requestId = headerRequestId ?: xmlRequestId
    )
}

private fun Response.readBoundedStorageErrorBody(): String {
    val source = body?.source() ?: return ""
    source.request(MAX_STORAGE_ERROR_BODY_BYTES + 1L)
    val byteCount = minOf(source.buffer.size, MAX_STORAGE_ERROR_BODY_BYTES)
    return source.buffer.clone().readUtf8(byteCount)
}

private fun String?.safeStorageRequestId(): String? = this
    ?.trim()
    ?.takeIf(SAFE_STORAGE_REQUEST_ID::matches)

private const val MAX_STORAGE_ERROR_BODY_BYTES = 8_192L
private val STORAGE_REQUEST_ID_HEADERS = listOf(
    "x-cos-request-id",
    "x-amz-request-id",
    "x-obs-request-id"
)
private val STORAGE_ERROR_CODE_XML = Regex("<Code>\\s*([^<]{1,64})\\s*</Code>")
private val STORAGE_REQUEST_ID_XML = Regex("<RequestId>\\s*([^<]{1,128})\\s*</RequestId>")
private val SAFE_STORAGE_REQUEST_ID = Regex("^[A-Za-z0-9][A-Za-z0-9._:+/=-]{0,127}$")
