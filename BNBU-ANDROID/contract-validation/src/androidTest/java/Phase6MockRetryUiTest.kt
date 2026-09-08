import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import edu.bnbu.student.contractvalidation.mock.*
import org.junit.*
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class Phase6MockRetryUiTest {
    @get:Rule val compose = createComposeRule()
    @Test fun retryButtonRunsFreshModeAndReadOverMockHttp() {
        MockScenarioHarness(Phase6MockUiTest.input()).use { h ->
            val worker = Executors.newSingleThreadExecutor()
            try {
                compose.setContent {
                    val page by h.controller.state.collectAsState()
                    ContractMockScreen(page) { action ->
                        check(action == PageAction.RETRY)
                        worker.submit { h.controller.load(h.call("getStudentDashboard")) }
                    }
                }
                h.normal(); h.respond(MockCases.error("DEPENDENCY_UNAVAILABLE"), 503)
                h.controller.load(h.call("getStudentDashboard"))
                compose.onNodeWithTag("page.state").assertTextEquals("ERROR")
                DeviceCapture.save("retry-before")
                h.normal(); h.respond(MockCases.fixture(h.input, "checks/wire/StudentDashboard"))
                compose.onNodeWithTag("action.RETRY").performScrollTo().performClick()
                compose.waitUntil(10000) { h.controller.state.value.state == PageState.NORMAL }
                compose.onNodeWithTag("page.state").assertTextEquals("NORMAL")
                compose.onNodeWithTag("action.RETRY").assertDoesNotExist()
                Assert.assertEquals(4, h.server.requestCount)
                DeviceCapture.save("retry-after")
            } finally { worker.shutdown(); worker.awaitTermination(5, TimeUnit.SECONDS) }
        }
    }
}
