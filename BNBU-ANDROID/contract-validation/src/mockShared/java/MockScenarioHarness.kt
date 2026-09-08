import com.google.gson.*
import edu.bnbu.student.contractvalidation.mock.*
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import java.net.InetAddress
import java.util.concurrent.TimeUnit

/** This exact fixture/HTTP/codec/controller chain is compiled into both test targets. */
class MockScenarioHarness(val input: JsonObject) : AutoCloseable {
    val codec = StrictMockCodec(input)
    val server = MockWebServer().apply { start(InetAddress.getByName("127.0.0.1"), 0) }
    // Android may reverse-resolve the bound InetAddress to "localhost" in server.url().
    // Keep the literal-loopback transport rule and use the explicit address we bound above.
    val http = ContractMockHttp(server.url("/").newBuilder().host("127.0.0.1").build(), codec)
    val controller = MockScreenController(http, operation("getSystemMode"))
    val requests = mutableListOf<Map<String, String>>()
    fun operation(id: String): MockOperation {
        val x = input.getAsJsonObject("operations").getAsJsonObject(id) ?: error("Unknown RC operation: $id")
        return MockOperation(id, x["method"].asString, x["path"].asString,
            x.getAsJsonObject("responses").entrySet().associate { it.key.toInt() to it.value.asString },
            x["requestSchema"].takeUnless { it.isJsonNull }?.asString)
    }
    fun call(id: String, query: Map<String, String> = emptyMap()) = MockCall(operation(id),
        Regex("\\{([^}]+)\\}").findAll(operation(id).path).associate { it.groupValues[1] to MockCases.ID }, query)
    fun respond(body: JsonElement, status: Int = 200) { raw(body.toString(), status) }
    fun raw(body: String, status: Int = 200, contentType: String = "application/json") {
        server.enqueue(MockResponse().setResponseCode(status).setHeader("Content-Type", contentType).setBody(body))
    }
    fun normal() = respond(MockCases.mode())
    fun take(): RecordedRequest = requireNotNull(server.takeRequest(3, TimeUnit.SECONDS)) { "Expected Mock request" }.also {
        requests += mapOf("method" to requireNotNull(it.method), "path" to requireNotNull(it.path))
    }
    override fun close() { http.close(); server.shutdown() }
}
