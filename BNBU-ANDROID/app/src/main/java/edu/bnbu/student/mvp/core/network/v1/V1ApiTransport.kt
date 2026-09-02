package edu.bnbu.student.mvp.core.network.v1

import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import edu.bnbu.student.mvp.BuildConfig
import edu.bnbu.student.mvp.core.network.SharedHttpClient
import edu.bnbu.student.mvp.core.network.v1.generated.ErrorCode
import java.io.IOException
import java.lang.reflect.Type
import java.time.OffsetDateTime
import java.util.UUID
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response

enum class V1HttpMethod {
    GET,
    HEAD,
    POST,
    PUT,
    PATCH,
    DELETE;

    val isReadOnly: Boolean
        get() = this == GET || this == HEAD
}

data class V1ApiRequest(
    val operationId: String,
    val method: V1HttpMethod,
    val relativePath: String,
    val query: Map<String, String?> = emptyMap(),
    val headers: Map<String, String> = emptyMap(),
    val body: Any? = null,
    val pathSegments: List<String>? = null
) {
    init {
        require(operationId.isNotBlank()) { "operationId must not be blank" }
        require(relativePath.isNotBlank()) { "relativePath must not be blank" }
        require(!relativePath.startsWith('/')) { "relativePath must not start with /" }
        require("://" !in relativePath) { "relativePath must not be an absolute URL" }
        require(!relativePath.contains("..")) { "relativePath must not contain parent traversal" }
        require('?' !in relativePath && '#' !in relativePath) {
            "Use query parameters instead of embedding query or fragment text in relativePath"
        }
        require(!method.isReadOnly || body == null) { "$method requests must not contain a body" }
        pathSegments?.let { segments ->
            require(segments.isNotEmpty()) { "pathSegments must not be empty" }
            require(segments.all { it.isNotEmpty() && it != "." && it != ".." }) {
                "pathSegments must contain safe non-empty segments"
            }
        }
        val reservedHeaders = headers.keys.filter { name ->
            name.equals("Authorization", ignoreCase = true) ||
                name.equals("Accept", ignoreCase = true) ||
                name.equals("Content-Type", ignoreCase = true) ||
                name.equals(REQUEST_ID_HEADER, ignoreCase = true)
        }
        require(reservedHeaders.isEmpty()) {
            "Reserved headers are owned by V1ApiTransport: ${reservedHeaders.joinToString()}"
        }
    }

    override fun toString(): String =
        "V1ApiRequest(operationId=$operationId, method=$method, " +
            "path=<redacted:${pathSegments?.size ?: relativePath.count { it == '/' } + 1} segments>, " +
            "queryKeys=${query.keys}, " +
            "headerNames=${headers.keys}, bodyType=${body?.javaClass?.simpleName ?: "none"})"

    private companion object {
        const val REQUEST_ID_HEADER = "X-Request-ID"
    }
}

/** JSON tree body used when the contract requires explicit null PATCH fields. */
internal data class V1ExplicitJsonBody(val value: JsonElement)

data class V1ResponseMeta(
    val requestId: String,
    val pagination: JsonElement? = null
)

data class V1ApiSuccess<T>(
    val statusCode: Int,
    val data: T?,
    val meta: V1ResponseMeta
)

@JvmInline
value class V1ErrorCode(val value: String) {
    init {
        require(value.isNotBlank()) { "Error code must not be blank" }
    }
}

data class V1ApiError(
    val code: V1ErrorCode,
    val serverMessage: String,
    val details: JsonElement,
    val requestId: String,
    val timestamp: String
)

sealed class V1TransportException(message: String) : IOException(message)

class V1HttpException(
    val operationId: String,
    val statusCode: Int,
    val error: V1ApiError
) : V1TransportException(
    "HTTP $statusCode ${error.code.value} " +
        "(operationId=$operationId, requestId=${error.requestId})"
)

class V1ProtocolException(
    val operationId: String,
    val statusCode: Int,
    val requestId: String?,
    reason: String
) : V1TransportException(
    "Invalid API response (operationId=$operationId, status=$statusCode, " +
        "requestId=${requestId ?: "unavailable"}): $reason"
)

class V1NetworkException(
    val operationId: String,
    cause: IOException,
    val requestId: String? = null
) : V1TransportException("Network request failed (operationId=$operationId)") {
    init {
        initCause(cause)
    }
}

/** Returns only a bounded correlation ID that is safe to render in user-facing diagnostics. */
internal fun Throwable.v1RequestIdForDisplay(): String? = when (this) {
    is V1HttpException -> error.requestId
    is V1ProtocolException -> requestId
    is V1NetworkException -> requestId
    else -> null
}
    ?.trim()
    ?.takeIf(SAFE_DIAGNOSTIC_REQUEST_ID::matches)

private val SAFE_DIAGNOSTIC_REQUEST_ID = Regex("^[A-Za-z0-9._:-]{1,64}$")

class V1ApiTransport(
    baseUrl: String = BuildConfig.BNBU_API_BASE_URL,
    private val httpClient: OkHttpClient = SharedHttpClient.instance,
    private val gson: Gson = V1Json.gson,
    private val accessTokenProvider: () -> String? = { null },
    private val requestIdProvider: () -> String = { "android-${UUID.randomUUID()}" }
) {
    private val baseHttpUrl: HttpUrl = requireBaseUrl(baseUrl)

    fun <T> execute(request: V1ApiRequest, responseType: Type): V1ApiSuccess<T> {
        return executeWithAccessToken(request, responseType, accessTokenProvider())
    }

    internal fun <T> executeWithAccessToken(
        request: V1ApiRequest,
        responseType: Type,
        accessToken: String?
    ): V1ApiSuccess<T> {
        val call = httpClient.newCall(buildRequest(request, accessToken))
        val response = try {
            call.execute()
        } catch (error: IOException) {
            throw V1NetworkException(
                operationId = request.operationId,
                cause = error,
                requestId = call.request().header(REQUEST_ID_HEADER)
            )
        }
        return response.use { parseResponse(request.operationId, it, responseType) }
    }

    suspend fun <T> executeCancellable(
        request: V1ApiRequest,
        responseType: Type
    ): V1ApiSuccess<T> = executeCancellableWithAccessToken(
        request = request,
        responseType = responseType,
        accessToken = accessTokenProvider()
    )

    internal suspend fun <T> executeCancellableWithAccessToken(
        request: V1ApiRequest,
        responseType: Type,
        accessToken: String?
    ): V1ApiSuccess<T> = suspendCancellableCoroutine { continuation ->
        val call = httpClient.newCall(buildRequest(request, accessToken))
        continuation.invokeOnCancellation { call.cancel() }
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, error: IOException) {
                if (continuation.isActive) {
                    continuation.resumeWithException(
                        V1NetworkException(
                            operationId = request.operationId,
                            cause = error,
                            requestId = call.request().header(REQUEST_ID_HEADER)
                        )
                    )
                }
            }

            override fun onResponse(call: Call, response: Response) {
                val result = runCatching {
                    response.use { parseResponse<T>(request.operationId, it, responseType) }
                }
                if (!continuation.isActive) return
                result.fold(
                    onSuccess = continuation::resume,
                    onFailure = continuation::resumeWithException
                )
            }
        })
    }

    internal fun buildRequest(request: V1ApiRequest): Request =
        buildRequest(request, accessTokenProvider())

    private fun buildRequest(request: V1ApiRequest, accessToken: String?): Request {
        val urlBuilder = baseHttpUrl.newBuilder()
        (request.pathSegments ?: request.relativePath.split('/').filter { it.isNotEmpty() })
            .forEach(urlBuilder::addPathSegment)
        request.query.forEach { (name, value) ->
            if (value != null) urlBuilder.addQueryParameter(name, value)
        }

        val clientRequestId = requestIdProvider().trim()
        require(CLIENT_REQUEST_ID.matches(clientRequestId)) {
            "Generated X-Request-ID must be 1-64 safe correlation characters"
        }

        val builder = Request.Builder()
            .url(urlBuilder.build())
            .header("Accept", JSON_MEDIA_TYPE_VALUE)
            .header(REQUEST_ID_HEADER, clientRequestId)
        request.headers.forEach(builder::header)
        accessToken.orEmpty().trim().takeIf { it.isNotEmpty() }?.let { token ->
            builder.header("Authorization", "Bearer $token")
        }

        val requestBody = request.body?.let { body ->
            val json = when (body) {
                is V1ExplicitJsonBody -> body.value.toString()
                else -> gson.toJson(body)
            }
            json.toRequestBody(JSON_MEDIA_TYPE)
        }
        when (request.method) {
            V1HttpMethod.GET -> builder.get()
            V1HttpMethod.HEAD -> builder.head()
            V1HttpMethod.POST -> builder.post(requestBody ?: EMPTY_BODY)
            V1HttpMethod.PUT -> builder.put(requestBody ?: EMPTY_BODY)
            V1HttpMethod.PATCH -> builder.patch(requestBody ?: EMPTY_BODY)
            V1HttpMethod.DELETE -> if (requestBody == null) builder.delete() else builder.delete(requestBody)
        }
        return builder.build()
    }

    private fun <T> parseResponse(
        operationId: String,
        response: Response,
        responseType: Type
    ): V1ApiSuccess<T> {
        val responseHeaderRequestId = response.header(REQUEST_ID_HEADER)?.trim()?.takeIf(String::isNotEmpty)
        val bodyText = response.body?.string()
        val root = parseRootObject(operationId, response.code, responseHeaderRequestId, bodyText)

        if (!response.isSuccessful) {
            throw parseHttpError(operationId, response.code, responseHeaderRequestId, root)
        }

        if (root.keySet() != SUCCESS_KEYS) {
            throw protocolError(
                operationId,
                response.code,
                responseHeaderRequestId,
                "success envelope must contain exactly data and meta"
            )
        }
        val metaElement = root.get("meta")
        if (metaElement == null || !metaElement.isJsonObject) {
            throw protocolError(
                operationId,
                response.code,
                responseHeaderRequestId,
                "meta must be a non-null object"
            )
        }
        val metaObject = metaElement.asJsonObject
        if (
            metaObject.keySet().isEmpty() ||
            (metaObject.keySet() - META_KEYS).isNotEmpty() ||
            "requestId" !in metaObject.keySet()
        ) {
            throw protocolError(
                operationId,
                response.code,
                responseHeaderRequestId,
                "meta fields do not match the contract"
            )
        }
        val bodyRequestId = metaObject.stringValue("requestId")
            ?: throw protocolError(
                operationId,
                response.code,
                responseHeaderRequestId,
                "meta.requestId must be a non-empty string"
            )
        val finalRequestId = resolveFinalRequestId(
            operationId,
            response.code,
            responseHeaderRequestId,
            bodyRequestId
        )
        val dataElement = root.get("data")
        val parsedData: T? = if (dataElement == null || dataElement.isJsonNull) {
            null
        } else {
            runCatching { gson.fromJson<T>(dataElement, responseType) }.getOrElse { error ->
                throw protocolError(
                    operationId,
                    response.code,
                    finalRequestId,
                    "data does not match the expected response type",
                    error
                )
            }
        }
        val result = V1ApiSuccess(
            statusCode = response.code,
            data = parsedData,
            meta = V1ResponseMeta(
                requestId = finalRequestId,
                pagination = metaObject.get("pagination")
            )
        )
        result.meta.validateOptionalContractPagination(operationId, response.code)
        return result
    }

    private fun parseHttpError(
        operationId: String,
        statusCode: Int,
        responseHeaderRequestId: String?,
        root: JsonObject
    ): V1HttpException {
        if (root.keySet() != ERROR_KEYS) {
            throw protocolError(
                operationId,
                statusCode,
                responseHeaderRequestId,
                "error envelope fields do not match the contract"
            )
        }
        val bodyRequestId = root.stringValue("requestId")
            ?: throw protocolError(
                operationId,
                statusCode,
                responseHeaderRequestId,
                "error requestId must be a non-empty string"
            )
        val finalRequestId = resolveFinalRequestId(
            operationId,
            statusCode,
            responseHeaderRequestId,
            bodyRequestId
        )
        val code = root.stringValue("code")
            ?: throw protocolError(operationId, statusCode, finalRequestId, "error code is missing")
        if (ErrorCode.entries.none { it.value == code }) {
            throw protocolError(operationId, statusCode, finalRequestId, "error code is not in the contract")
        }
        val message = root.stringValue("message")
            ?: throw protocolError(operationId, statusCode, finalRequestId, "error message is missing")
        if (message.length > 1_000) {
            throw protocolError(operationId, statusCode, finalRequestId, "error message exceeds the contract limit")
        }
        val timestamp = root.stringValue("timestamp")
            ?: throw protocolError(operationId, statusCode, finalRequestId, "error timestamp is missing")
        runCatching { OffsetDateTime.parse(timestamp) }.getOrElse {
            throw protocolError(operationId, statusCode, finalRequestId, "error timestamp is invalid", it)
        }
        val details = root.get("details")
            ?: throw protocolError(operationId, statusCode, finalRequestId, "error details are missing")
        if (
            !details.isJsonObject ||
            (details.asJsonObject.keySet() - ERROR_DETAIL_KEYS).isNotEmpty()
        ) {
            throw protocolError(
                operationId,
                statusCode,
                finalRequestId,
                "error details fields do not match the contract"
            )
        }
        return V1HttpException(
            operationId = operationId,
            statusCode = statusCode,
            error = V1ApiError(
                code = V1ErrorCode(code),
                serverMessage = message,
                details = details,
                requestId = finalRequestId,
                timestamp = timestamp
            )
        )
    }

    private fun parseRootObject(
        operationId: String,
        statusCode: Int,
        requestId: String?,
        bodyText: String?
    ): JsonObject {
        if (bodyText.isNullOrBlank()) {
            throw protocolError(operationId, statusCode, requestId, "response body is empty")
        }
        val parsed = runCatching { JsonParser.parseString(bodyText) }.getOrElse { error ->
            throw protocolError(operationId, statusCode, requestId, "response body is not valid JSON", error)
        }
        if (!parsed.isJsonObject) {
            throw protocolError(operationId, statusCode, requestId, "response envelope must be an object")
        }
        return parsed.asJsonObject
    }

    private fun resolveFinalRequestId(
        operationId: String,
        statusCode: Int,
        responseHeaderRequestId: String?,
        bodyRequestId: String?
    ): String {
        if (responseHeaderRequestId == null) {
            throw protocolError(
                operationId,
                statusCode,
                bodyRequestId,
                "X-Request-ID response header is missing"
            )
        }
        if (bodyRequestId != null && responseHeaderRequestId != bodyRequestId) {
            throw protocolError(
                operationId,
                statusCode,
                responseHeaderRequestId,
                "response header and envelope requestId values differ"
            )
        }
        val resolved = bodyRequestId
            ?: throw protocolError(operationId, statusCode, responseHeaderRequestId, "server requestId is missing")
        if (resolved.length !in 1..64) {
            throw protocolError(operationId, statusCode, null, "server requestId exceeds the contract limit")
        }
        return resolved
    }

    private fun protocolError(
        operationId: String,
        statusCode: Int,
        requestId: String?,
        reason: String,
        cause: Throwable? = null
    ): V1ProtocolException = V1ProtocolException(operationId, statusCode, requestId, reason).also {
        if (cause != null) it.initCause(cause)
    }

    private fun JsonObject.stringValue(name: String): String? = get(name)
        ?.takeUnless(JsonElement::isJsonNull)
        ?.takeIf(JsonElement::isJsonPrimitive)
        ?.takeIf { it.asJsonPrimitive.isString }
        ?.asString
        ?.trim()
        ?.takeIf(String::isNotEmpty)

    private fun requireBaseUrl(value: String): HttpUrl {
        val parsed = value.toHttpUrlOrNull()
        require(parsed != null) { "BNBU_API_BASE_URL must be a valid HTTP(S) URL" }
        require(BuildConfig.BNBU_ALLOW_CLEARTEXT_API || parsed.isHttps) {
            "Non-local builds require an HTTPS BNBU_API_BASE_URL"
        }
        require(parsed.username.isEmpty() && parsed.password.isEmpty()) {
            "BNBU_API_BASE_URL must not contain credentials"
        }
        require(parsed.query == null && parsed.fragment == null) {
            "BNBU_API_BASE_URL must not contain a query or fragment"
        }
        require(parsed.encodedPath.trimEnd('/') == "/api/v1") {
            "BNBU_API_BASE_URL must end with /api/v1"
        }
        return parsed
    }

    private companion object {
        const val REQUEST_ID_HEADER = "X-Request-ID"
        const val JSON_MEDIA_TYPE_VALUE = "application/json"
        val JSON_MEDIA_TYPE = JSON_MEDIA_TYPE_VALUE.toMediaType()
        val EMPTY_BODY = ByteArray(0).toRequestBody(JSON_MEDIA_TYPE)
        val CLIENT_REQUEST_ID = Regex("^[A-Za-z0-9._:-]{1,64}$")
        val SUCCESS_KEYS = setOf("data", "meta")
        val META_KEYS = setOf("requestId", "pagination")
        val ERROR_KEYS = setOf("code", "message", "details", "requestId", "timestamp")
        val ERROR_DETAIL_KEYS = setOf(
            "fieldErrors",
            "resourceType",
            "resourceId",
            "currentState",
            "allowedActions",
            "expectedVersion",
            "actualVersion",
            "retryAfterSeconds",
            "idempotencyKey",
            "itemErrors",
            "migrationReference"
        )
    }
}
