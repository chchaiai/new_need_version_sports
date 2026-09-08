import androidx.test.platform.app.InstrumentationRegistry
import com.google.gson.JsonParser
import org.junit.Assert.*
import org.junit.Test
import java.io.File

/** Runs the same pinned probe and unchanged corpus inside Android, not on the host JVM. */
class Phase6DeviceSchemaTest {
    private fun corpus(name: String, count: Int, legal: Int) {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val dir = File(instrumentation.targetContext.getExternalFilesDir(null), "phase6-device").apply { mkdirs() }
        val input = File(dir, "$name-input.json")
        instrumentation.context.assets.open("phase6/$name-input.json").use { source -> input.outputStream().use { source.copyTo(it) } }
        val result = File(dir, "$name-result.json")
        ContractRuntimeProbe.main(arrayOf(input.absolutePath, result.absolutePath))
        val report = JsonParser.parseString(result.readText()).asJsonObject
        assertEquals("5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed", report["candidateSha256"].asString)
        assertEquals(count, report["total"].asInt); assertEquals(count, report["passed"].asInt)
        assertEquals(legal, report["roundtrips"].asInt)
    }
    @Test fun publishedCorpusOnAndroid() = corpus("schema", 992, 159)
    @Test fun supplementalCorpusOnAndroid() = corpus("supplemental", 164, 127)
}
