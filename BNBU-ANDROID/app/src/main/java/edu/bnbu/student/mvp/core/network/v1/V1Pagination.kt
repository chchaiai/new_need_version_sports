package edu.bnbu.student.mvp.core.network.v1

import java.security.MessageDigest

internal data class V1ContractPagination(
    val nextCursor: String?,
    val hasMore: Boolean,
    val limit: Int
)

internal fun V1ResponseMeta.requireContractPagination(
    operationId: String,
    statusCode: Int
): V1ContractPagination {
    val element = pagination ?: throw V1ProtocolException(
        operationId,
        statusCode,
        requestId,
        "paged success response is missing meta.pagination"
    )
    if (!element.isJsonObject) {
        throw V1ProtocolException(
            operationId,
            statusCode,
            requestId,
            "meta.pagination must be an object"
        )
    }
    val value = element.asJsonObject
    if (value.keySet() != PaginationKeys) {
        throw V1ProtocolException(
            operationId,
            statusCode,
            requestId,
            "meta.pagination fields do not match the contract"
        )
    }

    val nextElement = value.get("nextCursor")
    val nextCursor = when {
        nextElement == null || nextElement.isJsonNull -> null
        nextElement.isJsonPrimitive && nextElement.asJsonPrimitive.isString ->
            nextElement.asString.takeIf { it.length <= 2_048 }
                ?: throw V1ProtocolException(
                    operationId,
                    statusCode,
                    requestId,
                    "meta.pagination.nextCursor exceeds the contract limit"
                )
        else -> throw V1ProtocolException(
            operationId,
            statusCode,
            requestId,
            "meta.pagination.nextCursor must be a string or null"
        )
    }
    val hasMoreElement = value.get("hasMore")
    if (
        hasMoreElement == null ||
        !hasMoreElement.isJsonPrimitive ||
        !hasMoreElement.asJsonPrimitive.isBoolean
    ) {
        throw V1ProtocolException(
            operationId,
            statusCode,
            requestId,
            "meta.pagination.hasMore must be a boolean"
        )
    }
    val limitElement = value.get("limit")
    val limitText = limitElement
        ?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }
        ?.asString
    val limit = limitText
        ?.takeIf { it.matches(UnsignedIntegerPattern) }
        ?.toIntOrNull()
        ?.takeIf { it in 1..100 }
        ?: throw V1ProtocolException(
            operationId,
            statusCode,
            requestId,
            "meta.pagination.limit must be an integer from 1 through 100"
        )
    val hasMore = hasMoreElement.asBoolean
    if (hasMore && nextCursor.isNullOrBlank()) {
        throw V1ProtocolException(
            operationId,
            statusCode,
            requestId,
            "meta.pagination.nextCursor is required when hasMore=true"
        )
    }
    return V1ContractPagination(nextCursor, hasMore, limit)
}

internal fun V1ResponseMeta.validateOptionalContractPagination(
    operationId: String,
    statusCode: Int
) {
    if (pagination != null) requireContractPagination(operationId, statusCode)
}

private val PaginationKeys = setOf("nextCursor", "hasMore", "limit")
private val UnsignedIntegerPattern = Regex("^[0-9]+$")

data class CursorScope private constructor(
    val accountScope: String,
    val operationId: String,
    private val queryFingerprint: String
) {
    companion object {
        fun forQuery(
            accountScope: String,
            operationId: String,
            canonicalQuery: String
        ): CursorScope {
            require(accountScope.isNotBlank()) { "accountScope must not be blank" }
            require(operationId.isNotBlank()) { "operationId must not be blank" }
            val material = "$operationId\n$canonicalQuery".toByteArray(Charsets.UTF_8)
            val digest = MessageDigest.getInstance("SHA-256")
                .digest(material)
                .joinToString("") { byte ->
                    (byte.toInt() and 0xff).toString(16).padStart(2, '0')
                }
            return CursorScope(accountScope, operationId, digest)
        }
    }
}

class ScopedCursor private constructor(
    private val scope: CursorScope,
    private val wireValue: String
) {
    fun queryValueFor(currentScope: CursorScope): String {
        require(currentScope == scope) {
            "Cursor cannot be reused across accounts, operations, filters, or sort order"
        }
        return wireValue
    }

    override fun equals(other: Any?): Boolean =
        other is ScopedCursor && scope == other.scope && wireValue == other.wireValue

    override fun hashCode(): Int = 31 * scope.hashCode() + wireValue.hashCode()

    override fun toString(): String = "[opaque cursor]"

    companion object {
        fun fromServer(scope: CursorScope, value: String): ScopedCursor {
            require(value.length in 1..2048) { "Cursor must contain 1..2048 characters" }
            return ScopedCursor(scope, value)
        }
    }
}

fun V1ApiRequest.withCursor(cursor: ScopedCursor?, scope: CursorScope): V1ApiRequest {
    require(method.isReadOnly) { "Cursor is only valid for read-only list requests" }
    require(operationId == scope.operationId) { "Cursor scope operationId does not match request" }
    if (cursor == null) return this
    require("cursor" !in query) { "Cursor query must be supplied through ScopedCursor" }
    return copy(query = query + ("cursor" to cursor.queryValueFor(scope)))
}
