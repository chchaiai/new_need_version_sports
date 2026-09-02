package edu.bnbu.student.mvp.core.network.v1

import com.google.gson.JsonElement
import java.security.MessageDigest
import java.util.UUID

@JvmInline
value class IdempotencyKey private constructor(val wireValue: String) {
    override fun toString(): String = "[redacted idempotency key]"

    companion object {
        fun fromGenerated(value: String): IdempotencyKey {
            require(value.length in 1..128) { "Idempotency-Key must contain 1..128 characters" }
            require(value.all { it.code in 0x21..0x7e }) {
                "Idempotency-Key must contain printable ASCII characters only"
            }
            return IdempotencyKey(value)
        }
    }
}

@JvmInline
value class IntentFingerprint private constructor(private val digest: String) {
    internal val stableValue: String
        get() = digest

    override fun toString(): String = "[redacted intent fingerprint]"

    companion object {
        fun fromCanonicalInput(operationId: String, canonicalInput: String): IntentFingerprint {
            require(operationId.isNotBlank()) { "operationId must not be blank" }
            val material = "$operationId\n$canonicalInput".toByteArray(Charsets.UTF_8)
            val digest = MessageDigest.getInstance("SHA-256")
                .digest(material)
                .joinToString("") { byte ->
                    (byte.toInt() and 0xff).toString(16).padStart(2, '0')
                }
            return IntentFingerprint(digest)
        }
    }
}

data class MutationIntentScope(
    val accountScope: String,
    val operationId: String,
    val actionSlot: String
) {
    init {
        require(accountScope.isNotBlank()) { "accountScope must not be blank" }
        require(operationId.isNotBlank()) { "operationId must not be blank" }
        require(actionSlot.isNotBlank()) { "actionSlot must not be blank" }
    }
}

data class MutationIntent internal constructor(
    val scope: MutationIntentScope,
    internal val fingerprint: IntentFingerprint,
    val idempotencyKey: IdempotencyKey
)

class MutationIntentRegistry(
    private val keyFactory: () -> String = { "android-${UUID.randomUUID()}" }
) {
    private val activeIntents = mutableMapOf<MutationIntentScope, MutationIntent>()

    @Synchronized
    fun acquire(
        scope: MutationIntentScope,
        fingerprint: IntentFingerprint
    ): MutationIntent {
        val existing = activeIntents[scope]
        if (existing != null && existing.fingerprint == fingerprint) return existing

        return MutationIntent(
            scope = scope,
            fingerprint = fingerprint,
            idempotencyKey = IdempotencyKey.fromGenerated(keyFactory().trim())
        ).also { activeIntents[scope] = it }
    }

    @Synchronized
    fun complete(intent: MutationIntent) {
        activeIntents.remove(intent.scope, intent)
    }

    @Synchronized
    fun abandon(intent: MutationIntent) {
        activeIntents.remove(intent.scope, intent)
    }

    @Synchronized
    fun clearAccount(accountScope: String) {
        activeIntents.keys.removeAll { it.accountScope == accountScope }
    }

    @Synchronized
    fun clearAll() {
        activeIntents.clear()
    }
}

fun V1ApiRequest.withMutationIntent(intent: MutationIntent): V1ApiRequest {
    require(!method.isReadOnly) { "Idempotency-Key is only valid for mutation requests" }
    require(operationId == intent.scope.operationId) {
        "Mutation intent operationId does not match the request operationId"
    }
    require(headers.keys.none { it.equals(IDEMPOTENCY_HEADER, ignoreCase = true) }) {
        "Idempotency-Key must be supplied through MutationIntent"
    }
    return copy(headers = headers + (IDEMPOTENCY_HEADER to intent.idempotencyKey.wireValue))
}

@JvmInline
value class ExpectedVersion(val wireValue: Long) {
    init {
        require(wireValue >= 1L) { "expectedVersion must be positive" }
    }
}

@JvmInline
value class ExpectedReviewVersion(val wireValue: Int) {
    init {
        require(wireValue >= 0) { "expectedReviewVersion must be non-negative" }
    }
}

data class VersionConflict(
    val resourceType: String?,
    val resourceId: String?,
    val expectedVersion: ExpectedVersion?,
    val actualVersion: ExpectedVersion?,
    val requestId: String
)

fun V1HttpException.asVersionConflictOrNull(): VersionConflict? {
    if (error.code.value != VERSION_CONFLICT_CODE) return null
    val details = error.details.takeIf(JsonElement::isJsonObject)?.asJsonObject
    return VersionConflict(
        resourceType = details?.safeString("resourceType"),
        resourceId = details?.safeString("resourceId"),
        expectedVersion = details?.safePositiveLong("expectedVersion")?.let(::ExpectedVersion),
        actualVersion = details?.safePositiveLong("actualVersion")?.let(::ExpectedVersion),
        requestId = error.requestId
    )
}

private fun com.google.gson.JsonObject.safeString(name: String): String? = get(name)
    ?.takeUnless(JsonElement::isJsonNull)
    ?.takeIf(JsonElement::isJsonPrimitive)
    ?.asString
    ?.takeIf(String::isNotBlank)

private fun com.google.gson.JsonObject.safePositiveLong(name: String): Long? = get(name)
    ?.takeUnless(JsonElement::isJsonNull)
    ?.takeIf(JsonElement::isJsonPrimitive)
    ?.let { runCatching { it.asLong }.getOrNull() }
    ?.takeIf { it >= 1L }

private const val IDEMPOTENCY_HEADER = "Idempotency-Key"
private const val VERSION_CONFLICT_CODE = "CONFLICT_VERSION_MISMATCH"
