package edu.bnbu.student.mvp.core.network.v1

import com.google.gson.Gson
import edu.bnbu.student.mvp.BuildConfig
import edu.bnbu.student.mvp.core.local.AuthSessionCredentialStore
import edu.bnbu.student.mvp.core.local.AuthSessionCredentials
import edu.bnbu.student.mvp.core.local.PendingRefreshIntent
import edu.bnbu.student.mvp.core.network.SharedHttpClient
import edu.bnbu.student.mvp.core.network.v1.generated.AuthSession
import edu.bnbu.student.mvp.core.network.v1.generated.LogoutRequest
import edu.bnbu.student.mvp.core.network.v1.generated.RefreshRequest
import java.security.MessageDigest
import java.time.Instant
import java.util.UUID
import okhttp3.OkHttpClient

class V1SessionInvalidatedException(
    val requestId: String?,
    cause: Throwable? = null
) : V1TransportException(
    "Authenticated session is no longer usable " +
        "(requestId=${requestId ?: "unavailable"})"
) {
    init {
        if (cause != null) initCause(cause)
    }
}

data class V1LogoutOutcome(
    val serverRevoked: Boolean,
    val requestId: String?
)

class V1AuthCredentialStateException(reason: String) :
    V1TransportException("Authentication credentials could not be persisted: $reason")

/**
 * Serializes refresh-token rotation. Concurrent 401 responses that rejected
 * the same access token wait for one rotation and then reuse its result.
 */
class V1AuthSessionCoordinator(
    private val credentialStore: AuthSessionCredentialStore,
    private val refreshSession: (String, IdempotencyKey) -> AuthSessionCredentials,
    private val clock: () -> Instant = Instant::now,
    private val idempotencyKeyProvider: () -> IdempotencyKey = {
        IdempotencyKey.fromGenerated("android-refresh-${UUID.randomUUID()}")
    }
) {
    @Volatile
    private var session: AuthSessionCredentials? = credentialStore.loadAuthSession()

    @Volatile
    private var pendingRefreshIntent: PendingRefreshIntent? =
        credentialStore.loadPendingRefreshIntent()

    fun currentAccessToken(): String? = session?.accessToken

    fun currentSession(): AuthSessionCredentials? = session

    fun currentAccountScope(): String? = session?.principalUserId ?: session?.sessionId

    fun install(session: AuthSessionCredentials): Boolean {
        synchronized(GlobalRefreshLock) {
            if (!credentialStore.saveAuthSession(session)) {
                this.session = null
                runCatching(credentialStore::clearAuth)
                return false
            }
            this.session = session
            clearPendingRefreshIntent()
            return true
        }
    }

    fun sessionWithUsableAccessToken(): AuthSessionCredentials {
        val latest = currentSession() ?: throw invalidated(requestId = null)
        if (latest.usableAccessToken(clock()) != null) return latest
        refreshAfterExpiredAccessToken(latest.accessToken)
        return currentSession() ?: throw invalidated(requestId = null)
    }

    fun refreshAfterExpiredAccessToken(rejectedAccessToken: String): String {
        synchronized(GlobalRefreshLock) {
            val latest = session
                ?: throw invalidated(requestId = null)

            // Different API facades can hold coordinators for the same durable session.
            // Observe a rotation completed by another facade before using the old
            // single-use refresh token again.
            val persisted = credentialStore.loadAuthSession()
            if (
                persisted != null &&
                persisted.sessionId == latest.sessionId &&
                persisted.accessToken != rejectedAccessToken
            ) {
                session = persisted
                clearPendingRefreshIntent()
                return persisted.accessToken
            }

            // A concurrent request already rotated this token family.
            if (latest.accessToken != rejectedAccessToken) return latest.accessToken

            val refreshToken = latest.usableRefreshToken(clock())
                ?: run {
                    clearPendingRefreshIntent()
                    throw invalidateAndBuildException(requestId = null)
                }
            val sessionId = latest.sessionId
                ?: run {
                    clearPendingRefreshIntent()
                    throw invalidateAndBuildException(requestId = null)
                }
            val refreshIntent = acquirePendingRefreshIntent(sessionId, refreshToken)
            val rotated = try {
                refreshSession(
                    refreshToken,
                    IdempotencyKey.fromGenerated(refreshIntent.idempotencyKey)
                )
            } catch (error: Exception) {
                if (error.isDefinitiveRefreshFailure()) {
                    clearPendingRefreshIntent()
                    throw invalidateAndBuildException(error.requestIdOrNull(), error)
                }
                // A timeout, 409 request-in-progress, rate limit or 5xx response
                // does not prove that the single-use refresh token is invalid.
                // Keep both credentials and the same durable Idempotency-Key so
                // the next attempt can safely replay the original rotation.
                throw error
            }.withEnrollmentIdIfMissing(latest.enrollmentId)
            if (!credentialStore.saveAuthSession(rotated)) {
                throw V1AuthCredentialStateException("rotated session write failed")
            }
            session = rotated
            clearPendingRefreshIntent()
            return rotated.accessToken
        }
    }

    fun invalidate(requestId: String?, cause: Throwable? = null): V1SessionInvalidatedException {
        synchronized(GlobalRefreshLock) {
            session = null
            clearPendingRefreshIntent()
            runCatching(credentialStore::clearAuth)
        }
        return invalidated(requestId, cause)
    }

    private fun acquirePendingRefreshIntent(
        sessionId: String,
        refreshToken: String
    ): PendingRefreshIntent {
        val tokenFingerprint = refreshToken.sha256()
        val loaded = credentialStore.loadPendingRefreshIntent()
            ?: pendingRefreshIntent
        if (
            loaded != null &&
            loaded.sessionId == sessionId &&
            loaded.refreshTokenFingerprint == tokenFingerprint
        ) {
            pendingRefreshIntent = loaded
            return loaded
        }

        if (loaded != null) clearPendingRefreshIntent()
        val created = PendingRefreshIntent(
            sessionId = sessionId,
            refreshTokenFingerprint = tokenFingerprint,
            idempotencyKey = idempotencyKeyProvider().wireValue
        )
        if (!credentialStore.savePendingRefreshIntent(created)) {
            throw V1AuthCredentialStateException("refresh intent write failed")
        }
        pendingRefreshIntent = created
        return created
    }

    private fun clearPendingRefreshIntent() {
        pendingRefreshIntent = null
        runCatching(credentialStore::clearPendingRefreshIntent)
    }

    private fun Throwable.isDefinitiveRefreshFailure(): Boolean =
        this is V1HttpException &&
            (statusCode == 401 || error.code.value in DefinitiveRefreshFailureCodes)

    private fun String.sha256(): String = MessageDigest.getInstance("SHA-256")
        .digest(toByteArray(Charsets.UTF_8))
        .joinToString("") { byte ->
            (byte.toInt() and 0xff).toString(16).padStart(2, '0')
        }

    private fun invalidateAndBuildException(
        requestId: String?,
        cause: Throwable? = null
    ): V1SessionInvalidatedException = invalidate(requestId, cause)

    private fun invalidated(
        requestId: String?,
        cause: Throwable? = null
    ): V1SessionInvalidatedException = V1SessionInvalidatedException(requestId, cause)

    private fun Throwable.requestIdOrNull(): String? =
        (this as? V1HttpException)?.error?.requestId
            ?: (this as? V1ProtocolException)?.requestId

    private companion object {
        val GlobalRefreshLock = Any()
        val DefinitiveRefreshFailureCodes = setOf(
            "AUTH_CREDENTIAL_INVALID",
            "AUTH_SESSION_REVOKED",
            "AUTH_ACCOUNT_DISABLED"
        )
    }
}

/** Contract-specific refresh and logout calls. */
private class V1AuthEndpoints(
    private val publicTransport: V1ApiTransport,
    private val authenticatedTransport: V1ApiTransport
) {
    fun refresh(refreshToken: String, idempotencyKey: IdempotencyKey): AuthSessionCredentials {
        val response = publicTransport.execute<AuthSession>(
            request = V1ApiRequest(
                operationId = "refreshSession",
                method = V1HttpMethod.POST,
                relativePath = "auth/refresh",
                headers = mapOf("Idempotency-Key" to idempotencyKey.wireValue),
                body = RefreshRequest(refreshToken)
            ),
            responseType = AuthSession::class.java
        )
        if (response.statusCode != 200) {
            throw V1ProtocolException(
                operationId = "refreshSession",
                statusCode = response.statusCode,
                requestId = response.meta.requestId,
                reason = "refresh returned unexpected success status"
            )
        }
        val session = response.data
            ?: throw V1ProtocolException(
                operationId = "refreshSession",
                statusCode = response.statusCode,
                requestId = response.meta.requestId,
                reason = "refresh response data is null"
            )
        return session.toCredentials()
    }

    fun logout(accessToken: String, refreshToken: String, idempotencyKey: IdempotencyKey): V1ApiSuccess<Any> {
        val response = authenticatedTransport.executeWithAccessToken<Any>(
            request = V1ApiRequest(
                operationId = "logoutSession",
                method = V1HttpMethod.POST,
                relativePath = "auth/logout",
                headers = mapOf("Idempotency-Key" to idempotencyKey.wireValue),
                body = LogoutRequest(refreshToken)
            ),
            responseType = Any::class.java,
            accessToken = accessToken
        )
        if (response.statusCode != 200 || response.data != null) {
            throw V1ProtocolException(
                operationId = "logoutSession",
                statusCode = response.statusCode,
                requestId = response.meta.requestId,
                reason = "logout response does not match EmptySuccess"
            )
        }
        return response
    }

}

internal fun AuthSession.toCredentials(): AuthSessionCredentials =
    AuthSessionCredentials.fromContract(
        sessionId = sessionId,
        enrollmentId = enrollmentId,
        accessToken = accessToken,
        refreshToken = refreshToken,
        tokenType = tokenType.value,
        accessTokenExpiresAt = accessTokenExpiresAt.toString(),
        refreshTokenExpiresAt = refreshTokenExpiresAt.toString(),
        principalUserId = user.id
    )

/**
 * Authenticated facade over [V1ApiTransport]. Only AUTH_TOKEN_EXPIRED is
 * refreshable. Invalid/revoked sessions and a second 401 fail closed.
 */
class V1AuthorizedApiClient private constructor(
    private val transport: V1ApiTransport,
    private val authEndpoints: V1AuthEndpoints,
    private val coordinator: V1AuthSessionCoordinator,
    private val idempotencyKeyProvider: () -> IdempotencyKey
) {
    fun installSession(session: AuthSessionCredentials): Boolean = coordinator.install(session)

    fun currentAccountScope(): String? = coordinator.currentAccountScope()
    fun <T> execute(request: V1ApiRequest, responseType: java.lang.reflect.Type): V1ApiSuccess<T> {
        val rejectedToken = coordinator.currentAccessToken()
        try {
            return transport.executeWithAccessToken(request, responseType, rejectedToken)
        } catch (error: V1HttpException) {
            if (error.shouldInvalidateImmediately()) throw coordinator.invalidate(error.error.requestId, error)
            if (!error.isRefreshable(rejectedToken)) throw error
        }

        val refreshedToken = coordinator.refreshAfterExpiredAccessToken(rejectedToken!!)
        return try {
            transport.executeWithAccessToken(request, responseType, refreshedToken)
        } catch (error: V1HttpException) {
            if (error.statusCode == 401) throw coordinator.invalidate(error.error.requestId, error)
            throw error
        }
    }

    suspend fun <T> executeCancellable(
        request: V1ApiRequest,
        responseType: java.lang.reflect.Type
    ): V1ApiSuccess<T> {
        val rejectedToken = coordinator.currentAccessToken()
        try {
            return transport.executeCancellableWithAccessToken(request, responseType, rejectedToken)
        } catch (error: V1HttpException) {
            if (error.shouldInvalidateImmediately()) throw coordinator.invalidate(error.error.requestId, error)
            if (!error.isRefreshable(rejectedToken)) throw error
        }

        val refreshedToken = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            coordinator.refreshAfterExpiredAccessToken(rejectedToken!!)
        }
        return try {
            transport.executeCancellableWithAccessToken(request, responseType, refreshedToken)
        } catch (error: V1HttpException) {
            if (error.statusCode == 401) throw coordinator.invalidate(error.error.requestId, error)
            throw error
        }
    }

    /** Always clears local secrets, even if remote revocation cannot be confirmed. */
    fun logoutSafely(): V1LogoutOutcome {
        val session = coordinator.currentSession()
        if (session == null) {
            coordinator.invalidate(requestId = null)
            return V1LogoutOutcome(serverRevoked = false, requestId = null)
        }
        var outcome = V1LogoutOutcome(serverRevoked = false, requestId = null)
        try {
            val usableSession = coordinator.sessionWithUsableAccessToken()
            val refreshToken = usableSession.refreshToken ?: return outcome
            val response = authEndpoints.logout(
                accessToken = usableSession.accessToken,
                refreshToken = refreshToken,
                idempotencyKey = idempotencyKeyProvider()
            )
            outcome = V1LogoutOutcome(
                serverRevoked = true,
                requestId = response.meta.requestId
            )
        } catch (error: V1HttpException) {
            outcome = V1LogoutOutcome(false, error.error.requestId)
        } catch (error: V1ProtocolException) {
            outcome = V1LogoutOutcome(false, error.requestId)
        } catch (error: V1SessionInvalidatedException) {
            outcome = V1LogoutOutcome(false, error.requestId)
        } catch (_: V1TransportException) {
            outcome = V1LogoutOutcome(false, null)
        } catch (_: RuntimeException) {
            outcome = V1LogoutOutcome(false, null)
        } finally {
            coordinator.invalidate(outcome.requestId)
        }
        return outcome
    }

    private fun V1HttpException.isRefreshable(rejectedToken: String?): Boolean =
        statusCode == 401 &&
            error.code.value == "AUTH_TOKEN_EXPIRED" &&
            !rejectedToken.isNullOrBlank()

    private fun V1HttpException.shouldInvalidateImmediately(): Boolean =
        error.code.value in ImmediateInvalidationCodes

    companion object {
        private val ImmediateInvalidationCodes = setOf(
            "AUTH_TOKEN_INVALID",
            "AUTH_SESSION_REVOKED",
            "AUTH_ACCOUNT_DISABLED"
        )

        fun create(
            credentialStore: AuthSessionCredentialStore,
            baseUrl: String = BuildConfig.BNBU_API_BASE_URL,
            httpClient: OkHttpClient = SharedHttpClient.instance,
            gson: Gson = V1Json.gson,
            clock: () -> Instant = Instant::now,
            requestIdProvider: () -> String = { "android-${UUID.randomUUID()}" },
            idempotencyKeyProvider: () -> IdempotencyKey = {
                IdempotencyKey.fromGenerated("android-auth-${UUID.randomUUID()}")
            }
        ): V1AuthorizedApiClient {
            lateinit var coordinator: V1AuthSessionCoordinator
            val authenticatedTransport = V1ApiTransport(
                baseUrl = baseUrl,
                httpClient = httpClient,
                gson = gson,
                accessTokenProvider = { coordinator.currentAccessToken() },
                requestIdProvider = requestIdProvider
            )
            val publicTransport = V1ApiTransport(
                baseUrl = baseUrl,
                httpClient = httpClient,
                gson = gson,
                requestIdProvider = requestIdProvider
            )
            val endpoints = V1AuthEndpoints(publicTransport, authenticatedTransport)
            coordinator = V1AuthSessionCoordinator(
                credentialStore = credentialStore,
                refreshSession = endpoints::refresh,
                clock = clock,
                idempotencyKeyProvider = idempotencyKeyProvider
            )
            return V1AuthorizedApiClient(
                transport = authenticatedTransport,
                authEndpoints = endpoints,
                coordinator = coordinator,
                idempotencyKeyProvider = idempotencyKeyProvider
            )
        }
    }
}
