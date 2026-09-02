package edu.bnbu.student.mvp.core.network

import java.io.IOException
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient

/**
 * Shared transport for the generated-contract `/api/v1` clients.
 *
 * The former endpoint-building client was removed because it carried a second,
 * undocumented route inventory. Network requests are now constructed only by
 * the V1 transport and its OpenAPI-backed gateways.
 */
object SharedHttpClient {
    val instance: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .connectionPool(okhttp3.ConnectionPool(5, 5, TimeUnit.MINUTES))
        .retryOnConnectionFailure(false)
        .addInterceptor { chain ->
            val request = chain.request()
            if (!isRetryableHttpMethod(request.method)) {
                return@addInterceptor chain.proceed(request)
            }

            var attempt = 0
            val maxRetries = 2
            var lastException: IOException? = null
            while (attempt <= maxRetries) {
                try {
                    return@addInterceptor chain.proceed(request)
                } catch (error: IOException) {
                    lastException = error
                    attempt++
                    if (attempt > maxRetries) throw error
                    try {
                        Thread.sleep(250L * attempt)
                    } catch (_: InterruptedException) {
                        Thread.currentThread().interrupt()
                        throw error
                    }
                }
            }
            throw lastException ?: IOException("Retry exhausted")
        }
        .build()

    internal fun isRetryableHttpMethod(method: String): Boolean =
        method.equals("GET", ignoreCase = true) || method.equals("HEAD", ignoreCase = true)
}

class ApiHttpException(
    val statusCode: Int,
    val responseBody: String
) : IOException("HTTP $statusCode: $responseBody")

data class UploadedProofFile(
    val url: String,
    val cosKey: String,
    val mediaType: String,
    val mimeType: String,
    val size: Long
)

data class UploadProofResponse(
    val files: List<UploadedProofFile> = emptyList(),
    val count: Int = 0
)
