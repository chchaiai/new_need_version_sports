import bnbu.cr005.review.CreateStudentApplicationRequest;
import bnbu.cr005.review.CourseInvitationCreateRequest;
import com.google.gson.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import org.junit.Test;
import static org.junit.Assert.*;

/** Full protocol coverage against this Android module, executed on the host JVM. */
public class Phase6ContractSchemaTest {
    private void runCorpus(String inputProperty, String reportName, int expectedCount, int expectedLegal) throws Exception {
        Path input = Path.of(System.getProperty(inputProperty));
        Path output = Path.of(System.getProperty("phase6.output"));
        Files.createDirectories(output);
        Path modelLocation = Path.of(CreateStudentApplicationRequest.class.getProtectionDomain()
                .getCodeSource().getLocation().toURI()).toRealPath();
        assertTrue("Only this Android build's compiled classes may satisfy the suite",
                modelLocation.startsWith(Path.of(System.getProperty("phase6.build")).toRealPath()));
        Path report = output.resolve(reportName);
        ContractRuntimeProbe.main(new String[]{input.toString(), report.toString()});
        JsonObject result = JsonParser.parseString(new String(Files.readAllBytes(report), StandardCharsets.UTF_8)).getAsJsonObject();
        assertEquals("5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed",
                result.get("candidateSha256").getAsString());
        assertEquals(expectedCount, result.get("total").getAsInt());
        assertEquals(expectedCount, result.get("passed").getAsInt());
        assertEquals(expectedLegal, result.get("roundtrips").getAsInt());
        result.addProperty("compiledModelLocation", modelLocation.toString());
        result.addProperty("executionScope", "Android compiled models on host JVM; no device or backend claim");
        Files.write(report, (new GsonBuilder().setPrettyPrinting().create().toJson(result) + "\n").getBytes(StandardCharsets.UTF_8));
    }

    @Test public void allPublishedFixtures() throws Exception {
        runCorpus("phase6.schemaInput", "full-schema.json", 992, 159);
    }

    @Test public void supplementalSchemaBoundaries() throws Exception {
        JsonObject input = JsonParser.parseString(new String(Files.readAllBytes(
                Path.of(System.getProperty("phase6.supplementalInput"))), StandardCharsets.UTF_8)).getAsJsonObject();
        int legal = 0;
        for (JsonElement row : input.getAsJsonArray("cases")) {
            if (row.getAsJsonObject().get("expectedValid").getAsBoolean()) legal++;
        }
        runCorpus("phase6.supplementalInput", "supplemental-schema.json", input.getAsJsonArray("cases").size(), legal);
    }

    @Test public void outboundConstructedDtosAreValidated() throws Exception {
        JsonObject input = JsonParser.parseString(new String(Files.readAllBytes(
                Path.of(System.getProperty("phase6.schemaInput"))), StandardCharsets.UTF_8)).getAsJsonObject();
        ContractRuntimeProbe.schemas = input.getAsJsonObject("spec").getAsJsonObject("components").getAsJsonObject("schemas");
        ContractRuntimeProbe.SchemaGuard guard = new ContractRuntimeProbe.SchemaGuard(
                ContractRuntimeProbe.schemas, input.get("candidateSha256").getAsString());
        Gson gson = new GsonBuilder().serializeNulls().registerTypeAdapterFactory(guard).create();
        for (int lifetime : new int[]{5, 120}) {
            JsonObject wire = gson.toJsonTree(new CourseInvitationCreateRequest(0L, lifetime)).getAsJsonObject();
            assertEquals(lifetime, wire.get("lifetimeMinutes").getAsInt());
            guard.check(wire, "CourseInvitationCreateRequest");
        }
        for (CourseInvitationCreateRequest invalid : new CourseInvitationCreateRequest[]{
                new CourseInvitationCreateRequest(0L, 4), new CourseInvitationCreateRequest(0L, 121),
                new CourseInvitationCreateRequest(-1L, 30)}) {
            assertThrows(JsonParseException.class, () -> gson.toJsonTree(invalid));
        }
        JsonObject absentOptional = gson.toJsonTree(new CourseInvitationCreateRequest(0L, null)).getAsJsonObject();
        assertFalse("An optional non-nullable value must be omitted, never transmitted as explicit null",
                absentOptional.has("lifetimeMinutes"));
    }
}
