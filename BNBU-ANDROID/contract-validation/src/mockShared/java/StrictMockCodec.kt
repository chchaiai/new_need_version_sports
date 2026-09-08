import com.google.gson.*
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import edu.bnbu.student.contractvalidation.mock.ContractCodec
import java.io.StringReader
import java.math.BigDecimal

/** Same implementation compiled for JVM tests and the Android instrumentation APK. */
class StrictMockCodec(input: JsonObject) : ContractCodec {
    private val schemas = input.getAsJsonObject("spec").getAsJsonObject("components").getAsJsonObject("schemas")
    private val guard: ContractRuntimeProbe.SchemaGuard
    private val gson: Gson
    init {
        require(input.get("candidateSha256").asString == "5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed")
        ContractRuntimeProbe.schemas = schemas
        guard = ContractRuntimeProbe.SchemaGuard(schemas, input.get("candidateSha256").asString)
        val builder = GsonBuilder().serializeNulls().setStrictness(Strictness.STRICT)
            .registerTypeAdapterFactory(ContractRuntimeProbe.ScalarEnumFactory())
        input.getAsJsonArray("wrapperFactories").forEach {
            builder.registerTypeAdapterFactory(Class.forName("bnbu.cr005.review.${it.asString}\$CustomTypeAdapterFactory")
                .getConstructor().newInstance() as TypeAdapterFactory)
        }
        gson = builder.registerTypeAdapterFactory(guard).create()
    }
    @Synchronized override fun decode(body: String, schema: String): Any {
        guard.present.clear()
        val wire = try { parse(body) } catch (e: java.io.IOException) { throw JsonParseException("Malformed JSON", e) }
        guard.check(wire, schema)
        val type = Class.forName("bnbu.cr005.review.$schema")
        val result = requireNotNull(gson.fromJson(wire, type))
        ContractRuntimeProbe.branchCheck(schemas.getAsJsonObject(schema), wire, result)
        require(gson.toJsonTree(result, type) == wire) { "Strict Mock decoder changed wire values" }
        return result
    }
    @Synchronized override fun encode(value: Any, schema: String): String {
        guard.present.clear()
        require(value.javaClass.simpleName == schema)
        val wire = gson.toJsonTree(value)
        guard.check(wire, schema)
        return gson.toJson(wire)
    }
    companion object {
        /** Raw HTTP adds duplicate keys/trailing tokens absent from object-based schema fixtures. */
        fun parse(body: String): JsonElement = JsonReader(StringReader(body)).use { reader ->
            reader.strictness = Strictness.STRICT
            val result = readValue(reader)
            if (reader.peek() != JsonToken.END_DOCUMENT) throw JsonParseException("Trailing JSON document")
            result
        }
        private fun readValue(reader: JsonReader): JsonElement = when (reader.peek()) {
            JsonToken.BEGIN_OBJECT -> JsonObject().also { value ->
                reader.beginObject()
                while (reader.hasNext()) {
                    val name = reader.nextName()
                    if (value.has(name)) throw JsonParseException("Duplicate JSON member")
                    value.add(name, readValue(reader))
                }
                reader.endObject()
            }
            JsonToken.BEGIN_ARRAY -> JsonArray().also { value ->
                reader.beginArray(); while (reader.hasNext()) value.add(readValue(reader)); reader.endArray()
            }
            JsonToken.STRING -> JsonPrimitive(reader.nextString())
            JsonToken.NUMBER -> JsonPrimitive(BigDecimal(reader.nextString()))
            JsonToken.BOOLEAN -> JsonPrimitive(reader.nextBoolean())
            JsonToken.NULL -> { reader.nextNull(); JsonNull.INSTANCE }
            else -> throw JsonParseException("Expected JSON value")
        }
    }
}
