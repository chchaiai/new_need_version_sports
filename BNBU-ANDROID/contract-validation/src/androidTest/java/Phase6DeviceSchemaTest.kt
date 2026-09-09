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
        assertEquals("0528389bb8b72714d9a4af35ffc66c87503560d41c58ad968b1713b39ff3da2d", report["candidateSha256"].asString)
        assertEquals(count, report["total"].asInt); assertEquals(count, report["passed"].asInt)
        assertEquals(legal, report["roundtrips"].asInt)
    }
    @Test fun publishedCorpusOnAndroid() = corpus("schema", 992, 159)
    @Test fun supplementalCorpusOnAndroid() = corpus("supplemental", 221, 149)
}
