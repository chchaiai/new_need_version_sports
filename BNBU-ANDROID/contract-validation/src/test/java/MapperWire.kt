import bnbu.cr005.review.*
import com.google.gson.*
import java.nio.file.Files
import java.nio.file.Path
import org.junit.Assert.*

/** Host-only strict wire boundary. No fallback to unguarded Gson, and no app/runtime dependency. */
object MapperWire {
    const val ID = "00000000-0000-4000-8000-000000000001"
    const val ID2 = "00000000-0000-4000-8000-000000000002"
    const val NOW = "2026-09-07T02:00:00.000000001Z"
    private val source = JsonParser.parseString(String(Files.readAllBytes(Path.of(System.getProperty("phase6.schemaInput"))), Charsets.UTF_8)).asJsonObject
    private val cases = source.getAsJsonArray("cases").associateBy { it.asJsonObject.get("name").asString }
    private val guard: ContractRuntimeProbe.SchemaGuard
    private val gson: Gson
    val decodedSchemas = linkedSetOf<String>()
    init {
        ContractRuntimeProbe.schemas = source.getAsJsonObject("spec").getAsJsonObject("components").getAsJsonObject("schemas")
        guard = ContractRuntimeProbe.SchemaGuard(ContractRuntimeProbe.schemas, source.get("candidateSha256").asString)
        val builder = GsonBuilder().serializeNulls().setStrictness(Strictness.STRICT)
            .registerTypeAdapterFactory(ContractRuntimeProbe.ScalarEnumFactory())
        source.getAsJsonArray("wrapperFactories").forEach {
            val factory = Class.forName("bnbu.cr005.review.${it.asString}\$CustomTypeAdapterFactory")
            builder.registerTypeAdapterFactory(factory.getConstructor().newInstance() as TypeAdapterFactory)
        }
        gson = builder.registerTypeAdapterFactory(guard).create()
        val location = Path.of(requireNotNull(StudentDashboard::class.java.protectionDomain).codeSource.location.toURI()).toRealPath()
        assertTrue("Must test this Android build's generated classes", location.startsWith(Path.of(System.getProperty("phase6.build")).toRealPath()))
    }
    fun fixture(name: String): JsonObject = requireNotNull(cases[name]) { name }.asJsonObject.getAsJsonObject("payload").deepCopy()
    fun json(text: String): JsonObject = JsonParser.parseString(text).asJsonObject
    fun <T> decode(wire: JsonObject, type: Class<T>): T {
        guard.present.clear()
        guard.check(wire, type.simpleName)
        val decoded = gson.fromJson(wire, type)
        ContractRuntimeProbe.branchCheck(ContractRuntimeProbe.schemas.getAsJsonObject(type.simpleName), wire, decoded)
        assertEquals("Mapper input must roundtrip without losing wire meaning", wire, gson.toJsonTree(decoded, type))
        decodedSchemas.add(type.simpleName)
        return decoded
    }
    inline fun <reified T> read(wire: JsonObject): T = decode(wire, T::class.java)
    inline fun <reified T> read(name: String): T = read(fixture(name))
    fun firstEligibility(): JsonObject = json("""{"sessionId":"$ID","serverNow":"$NOW","endedAt":"2026-09-07T01:00:00Z",
        "ordinaryFirstDueAt":"2026-09-08T01:00:00Z","swimmingTimelyDueAt":"2026-09-07T01:15:00Z",
        "swimmingOfflineDueAt":"2026-09-08T01:00:00Z","eligibleHistoricalChain":true,"firstReceipt":null,"sessionVersion":9007199254740993}""")
    fun session(): JsonObject = json("""{"sessionId":"$ID","courseId":"$ID","enrollmentId":"$ID","status":"ACTIVE",
        "businessDate":"2026-09-07","startedAt":"$NOW","pausedAt":null,"completedAt":null,"elapsedActiveSeconds":0,
        "actualDurationSeconds":null,"stateVersion":9007199254740993,"ruleVersionId":"$ID","makeupAuthorizationId":null}""")
    fun application(): JsonObject {
        val x = json("""{"applicationId":"$ID","applicationNumber":"SYN-01","applicationType":"EXEMPTION","courseId":"$ID",
            "enrollmentId":"$ID","student":{},"status":"SUBMITTED","certification":null,"evidence":[],"decisions":[],
            "certificationCredit":null,"submittedAt":"$NOW","updatedAt":"$NOW","version":9007199254740993}""")
        x.add("student", JsonObject().apply { addProperty("kind", "CURRENT_STUDENT"); add("student", fixture("checks/wire/StudentDashboard").getAsJsonObject("student")) })
        x.getAsJsonArray("evidence").add(json("""{"mediaAssetId":"$ID","purpose":"APPLICATION_EVIDENCE","mediaKind":"IMAGE",
            "contentType":"image/jpeg","byteSize":1,"checksumSha256":"${"a".repeat(64)}","durationMilliseconds":null,
            "hasAudio":null,"widthPixels":1,"heightPixels":1,"status":"BOUND","rejectionCode":null,"version":1}"""))
        return x
    }
    fun course(): JsonObject = fixture("prior-courses/preview/active_new_registration").getAsJsonObject("course").deepCopy().apply {
        add("description", JsonNull.INSTANCE)
        addProperty("checkinOpensAt", NOW); addProperty("checkinClosesAt", "2026-09-30T02:00:00.000000001Z")
        add("targets", json("""{"courseRelatedTargetMinutes":600,"otherTargetMinutes":600,"totalTargetMinutes":1200}"""))
        add("publishedRule", fixture("prior-courses/rule/frozen"))
    }
    fun publicReason(code: String): JsonObject {
        val schema = ContractRuntimeProbe.schemas.getAsJsonObject("PublicReviewReason")
        val rule = schema.getAsJsonArray("allOf").first {
            it.asJsonObject.getAsJsonObject("if").getAsJsonObject("properties").getAsJsonObject("code").getAsJsonArray("enum")[0].asString == code
        }.asJsonObject.getAsJsonObject("then").getAsJsonObject("properties").getAsJsonObject("label").getAsJsonObject("properties")
        return JsonObject().apply {
            addProperty("code", code)
            add("label", JsonObject().apply { for (lang in listOf("zh", "en")) add(lang, rule.getAsJsonObject(lang).get("const")) })
        }
    }
}
