package edu.bnbu.student.mvp.core.network.v1

import edu.bnbu.student.mvp.BuildConfig
import edu.bnbu.student.mvp.core.network.SharedHttpClient
import edu.bnbu.student.mvp.core.network.v1.generated.AppReleasePolicy
import edu.bnbu.student.mvp.core.network.v1.generated.SystemModeProjection

/** Contract-pinned public startup checks. */
class V1PublicStatusClient(
    baseUrl: String = BuildConfig.BNBU_API_BASE_URL
) {
    private val transport = V1ApiTransport(
        baseUrl = baseUrl,
        httpClient = SharedHttpClient.instance
    )

    suspend fun getAndroidReleasePolicy(): AppReleasePolicy = requireData(
        "getAppReleasePolicy",
        transport.executeCancellable(
            V1ApiRequest(
                operationId = "getAppReleasePolicy",
                method = V1HttpMethod.GET,
                relativePath = "app-release-policy",
                query = mapOf(
                    "platform" to "ANDROID",
                    "currentVersion" to BuildConfig.VERSION_NAME,
                    "currentBuildNumber" to BuildConfig.VERSION_CODE.toString()
                )
            ),
            AppReleasePolicy::class.java
        )
    )

    suspend fun getSystemMode(): SystemModeProjection = requireData(
        "getSystemMode",
        transport.executeCancellable(
            V1ApiRequest("getSystemMode", V1HttpMethod.GET, "system-mode"),
            SystemModeProjection::class.java
        )
    )

    private fun <T> requireData(operationId: String, response: V1ApiSuccess<T>): T {
        if (response.statusCode != 200 || response.data == null) {
            throw V1ProtocolException(
                operationId,
                response.statusCode,
                response.meta.requestId,
                "public startup response is missing data"
            )
        }
        return response.data
    }
}
