import com.google.gson.JsonParser
import org.junit.Test
import org.junit.AfterClass
import com.google.gson.GsonBuilder
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import java.io.File

@RunWith(Parameterized::class)
class Phase6MockTest(private val scenario: MockCase) {
    @Test fun actualHttpDtoMapperPage() {
        MockScenarioHarness(input).use {
            val page = scenario.execute(it)
            results += mapOf("name" to scenario.name, "operation" to scenario.operation, "state" to page.state.name,
                "readOnly" to page.readOnly, "requests" to it.requests, "passed" to true)
        }
    }
    companion object {
        val input = JsonParser.parseString(File(requireNotNull(System.getProperty("phase6.mockInput"))).readText()).asJsonObject
        private val results = mutableListOf<Map<String, Any>>()
        @JvmStatic @Parameterized.Parameters(name="{0}") fun cases(): List<Array<Any>> =
            MockCases.all(input).map { arrayOf(it) }
        @JvmStatic @AfterClass fun report() {
            val dir = File(requireNotNull(System.getProperty("phase6.output"))).apply { mkdirs() }
            File(dir, "mock.json").writeText(GsonBuilder().setPrettyPrinting().create().toJson(mapOf(
                "candidateSha256" to input["candidateSha256"].asString, "planned" to MockCases.all(input).size,
                "passed" to results.size, "cases" to results, "renderedDeviceTestsExecuted" to 0)))
        }
    }
}
