import bnbu.cr005.review.CreateStudentApplicationRequest;
import com.google.gson.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import org.junit.Test;
import static org.junit.Assert.*;

/** Host-side tests of the models compiled by the Android library plugin. No device claim. */
public class Phase6ContractSmokeTest {
    @Test public void publishedCasesUseThisAndroidModulesCompiledModels() throws Exception {
        Path input = Path.of(System.getProperty("phase6.input"));
        Path output = Path.of(System.getProperty("phase6.output"));
        Files.createDirectories(output);
        Path modelLocation = Path.of(CreateStudentApplicationRequest.class.getProtectionDomain()
                .getCodeSource().getLocation().toURI()).toRealPath();
        assertTrue("Must use this build's Android-compiled model, not the old Phase5 models.jar",
                modelLocation.startsWith(Path.of(System.getProperty("phase6.build")).toRealPath()));
        Path report = output.resolve("strict-smoke.json");
        ContractRuntimeProbe.main(new String[]{input.toString(), report.toString()});
        JsonObject result = JsonParser.parseString(new String(Files.readAllBytes(report), StandardCharsets.UTF_8)).getAsJsonObject();
        assertEquals("5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed",
                result.get("candidateSha256").getAsString());
        assertEquals(17, result.get("total").getAsInt());
        assertEquals(17, result.get("passed").getAsInt());
        assertEquals(8, result.get("roundtrips").getAsInt());
        result.addProperty("compiledModelLocation", modelLocation.toString());
        result.addProperty("executionScope", "Android library compiled models; host JVM smoke test; no device/backend claim");
        Files.write(report, (new GsonBuilder().setPrettyPrinting().create().toJson(result) + "\n").getBytes(StandardCharsets.UTF_8));
    }
}
