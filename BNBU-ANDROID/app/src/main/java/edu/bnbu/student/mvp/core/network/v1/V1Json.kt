package edu.bnbu.student.mvp.core.network.v1

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.JsonParseException
import com.google.gson.JsonSerializationContext
import com.google.gson.JsonSerializer
import com.google.gson.TypeAdapter
import com.google.gson.TypeAdapterFactory
import com.google.gson.annotations.SerializedName
import com.google.gson.reflect.TypeToken
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import com.google.gson.stream.JsonWriter
import java.io.IOException
import java.lang.reflect.Type
import java.time.LocalDate
import java.time.LocalTime
import java.time.OffsetDateTime

/** Gson configuration shared by the generated OpenAPI models and transport. */
object V1Json {
    val gson: Gson = GsonBuilder()
        .registerTypeAdapterFactory(StrictEnumTypeAdapterFactory)
        .registerTypeAdapter(OffsetDateTime::class.java, OffsetDateTimeAdapter)
        .registerTypeAdapter(LocalDate::class.java, LocalDateAdapter)
        .registerTypeAdapter(LocalTime::class.java, LocalTimeAdapter)
        .disableHtmlEscaping()
        .create()

    private object OffsetDateTimeAdapter : JsonSerializer<OffsetDateTime>,
        JsonDeserializer<OffsetDateTime> {
        override fun serialize(
            source: OffsetDateTime,
            type: Type,
            context: JsonSerializationContext
        ): JsonElement = context.serialize(source.toString())

        override fun deserialize(
            json: JsonElement,
            type: Type,
            context: JsonDeserializationContext
        ): OffsetDateTime = parseDateTime(json) { OffsetDateTime.parse(it) }
    }

    private object LocalDateAdapter : JsonSerializer<LocalDate>, JsonDeserializer<LocalDate> {
        override fun serialize(
            source: LocalDate,
            type: Type,
            context: JsonSerializationContext
        ): JsonElement = context.serialize(source.toString())

        override fun deserialize(
            json: JsonElement,
            type: Type,
            context: JsonDeserializationContext
        ): LocalDate = parseDateTime(json) { LocalDate.parse(it) }
    }

    private object LocalTimeAdapter : JsonSerializer<LocalTime>, JsonDeserializer<LocalTime> {
        override fun serialize(
            source: LocalTime,
            type: Type,
            context: JsonSerializationContext
        ): JsonElement = context.serialize(source.toString())

        override fun deserialize(
            json: JsonElement,
            type: Type,
            context: JsonDeserializationContext
        ): LocalTime = parseDateTime(json) { LocalTime.parse(it) }
    }

    private fun <T> parseDateTime(json: JsonElement, parser: (String) -> T): T {
        if (!json.isJsonPrimitive || !json.asJsonPrimitive.isString) {
            throw JsonParseException("OpenAPI date value must be a string")
        }
        return runCatching { parser(json.asString) }
            .getOrElse { throw JsonParseException("Invalid OpenAPI date value", it) }
    }

    private object StrictEnumTypeAdapterFactory : TypeAdapterFactory {
        override fun <T> create(gson: Gson, type: TypeToken<T>): TypeAdapter<T>? {
            val rawType = type.rawType
            if (!rawType.isEnum) return null

            @Suppress("UNCHECKED_CAST")
            val enumClass = rawType as Class<out Enum<*>>
            val byWireValue = linkedMapOf<String, Enum<*>>()
            val wireValueByEnum = linkedMapOf<Enum<*>, String>()
            enumClass.enumConstants.forEach { constant ->
                val field = enumClass.getField(constant.name)
                val annotation = field.getAnnotation(SerializedName::class.java)
                val primary = annotation?.value ?: constant.name
                byWireValue[primary] = constant
                annotation?.alternate?.forEach { byWireValue[it] = constant }
                wireValueByEnum[constant] = primary
            }

            return object : TypeAdapter<T>() {
                @Throws(IOException::class)
                override fun write(output: JsonWriter, value: T?) {
                    if (value == null) {
                        output.nullValue()
                        return
                    }
                    val enumValue = value as Enum<*>
                    output.value(wireValueByEnum[enumValue] ?: enumValue.name)
                }

                @Throws(IOException::class)
                override fun read(input: JsonReader): T? {
                    if (input.peek() == JsonToken.NULL) {
                        input.nextNull()
                        return null
                    }
                    val wireValue = input.nextString()
                    val parsed = byWireValue[wireValue]
                        ?: throw JsonParseException(
                            "Unknown ${enumClass.simpleName} value"
                        )
                    @Suppress("UNCHECKED_CAST")
                    return parsed as T
                }
            }.nullSafe()
        }
    }
}
