package edu.bnbu.student.contractvalidation.mock

import bnbu.cr005.review.ErrorEnvelope
import edu.bnbu.student.contractvalidation.toStudentFailure
import edu.bnbu.student.contractvalidation.StudentFailure
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.util.concurrent.TimeUnit

/** Implemented by the identical strict test codec on host and in the device-test APK. */
interface ContractCodec {
    fun decode(body: String, schema: String): Any
    fun encode(value: Any, schema: String): String
}
data class MockOperation(val id: String, val method: String, val path: String,
    val responses: Map<Int, String>, val requestSchema: String? = null)
data class MockCall(val operation: MockOperation, val pathValues: Map<String, String> = emptyMap(),
    val query: Map<String, String> = emptyMap(), val body: Any? = null, val idempotencyKey: String? = null)
sealed interface HttpResult {
    data class Data(val value: Any) : HttpResult
    data class ApiError(val error: StudentFailure) : HttpResult
    data object TransportError : HttpResult
    data object InvalidResponse : HttpResult
    data object InvalidRequest : HttpResult
}

/** Loopback-only validation transport. Never accepts a production URL or real credentials. */
class ContractMockHttp(private val baseUrl: HttpUrl, private val codec: ContractCodec,
    timeoutMillis: Long = 2000) : AutoCloseable {
    init { require(baseUrl.scheme == "http" && baseUrl.host == "127.0.0.1") { "Mock transport requires literal loopback" } }
    private val client = OkHttpClient.Builder().followRedirects(false).followSslRedirects(false)
        .retryOnConnectionFailure(false).connectTimeout(timeoutMillis, TimeUnit.MILLISECONDS)
        .readTimeout(timeoutMillis, TimeUnit.MILLISECONDS).callTimeout(timeoutMillis, TimeUnit.MILLISECONDS).build()

    fun execute(call: MockCall): HttpResult {
        val op = call.operation
        require(op.path.startsWith("/") && !op.path.startsWith("//"))
        val url = baseUrl.newBuilder().encodedPath("/api/v1/")
        for (part in op.path.removePrefix("/").split('/')) {
            val value = if (part.startsWith("{") && part.endsWith("}"))
                requireNotNull(call.pathValues[part.substring(1, part.length - 1)]) else part
            url.addPathSegment(value)
        }
        call.query.toSortedMap().forEach { (key, value) -> url.addQueryParameter(key, value) }
        val request = Request.Builder().url(url.build()).header("Accept", "application/json")
            .header("Authorization", "Bearer phase6-synthetic-only")
        call.idempotencyKey?.let { request.header("Idempotency-Key", it) }
        val encoded = try { call.body?.let { codec.encode(it, requireNotNull(op.requestSchema)) } }
            catch (_: IllegalArgumentException) { return HttpResult.InvalidRequest }
            catch (_: com.google.gson.JsonParseException) { return HttpResult.InvalidRequest }
        request.method(op.method, encoded?.toRequestBody("application/json; charset=utf-8".toMediaType()))
        return try {
            client.newCall(request.build()).execute().use { response ->
                val schema = op.responses[response.code] ?: return HttpResult.InvalidResponse
                if (response.body?.contentType()?.let { it.type == "application" && it.subtype == "json" } != true)
                    return HttpResult.InvalidResponse
                val bytes = response.body!!.bytes()
                val text = Charsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString()
                val value = codec.decode(text, schema)
                if (response.isSuccessful) HttpResult.Data(value)
                else if (value is ErrorEnvelope) HttpResult.ApiError(value.toStudentFailure())
                else HttpResult.InvalidResponse
            }
        } catch (_: java.nio.charset.CharacterCodingException) { HttpResult.InvalidResponse
        } catch (_: IOException) { HttpResult.TransportError
        } catch (_: IllegalArgumentException) { HttpResult.InvalidResponse
        } catch (_: com.google.gson.JsonParseException) { HttpResult.InvalidResponse }
    }
    override fun close() {
        client.dispatcher.executorService.shutdownNow()
        client.connectionPool.evictAll()
    }
}
