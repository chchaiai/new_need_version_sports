import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import com.google.gson.JsonParser
import edu.bnbu.student.contractvalidation.mock.*
import org.junit.*
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

/** Built in Step5. Run on Android in Step6; a successful build is not a rendered-UI pass. */
@RunWith(Parameterized::class)
class Phase6MockUiTest(private val scenario: MockCase) {
    @get:Rule val compose = createComposeRule()
    private lateinit var harness: MockScenarioHarness
    private var selected: PageAction? = null
    @Before fun open() {
        harness = MockScenarioHarness(input())
        compose.setContent {
            val page by harness.controller.state.collectAsState()
            ContractMockScreen(page) { selected = it }
        }
    }
    @After fun close() { harness.close() }
    @Test fun renderSameHttpDtoMapperScenario() {
        compose.onNodeWithTag("page.state").assertTextEquals("LOADING")
        compose.onNodeWithTag("page.loading").assertExists()
        if (scenario.name == "dashboard_unjoined") DeviceCapture.save("loading")
        val page = scenario.execute(harness)
        compose.waitForIdle()
        compose.onNodeWithTag("mock.marker").assertIsDisplayed().assertTextContains("MOCK", substring=true)
        compose.onNodeWithTag("page.state").assertTextEquals(page.state.name)
        compose.onNodeWithTag("page.title").assertIsDisplayed().assertTextEquals(page.title)
        if (page.readOnly) compose.onNodeWithTag("page.readOnly").assertExists()
        else compose.onNodeWithTag("page.readOnly").assertDoesNotExist()
        if (page.state == PageState.EMPTY) compose.onNodeWithTag("page.empty").assertTextEquals("暂无记录")
        for ((key, text) in scenario.expectedRows) compose.onNodeWithTag(key).assertTextContains(text, substring=true)
        DeviceCapture.save(scenario.name)
        for (action in PageAction.entries) {
            val node = compose.onNodeWithTag("action.${action.name}")
            if (action in page.actions) {
                node.performScrollTo().assertIsEnabled().performClick()
                compose.runOnIdle { Assert.assertEquals(action, selected) }
            } else node.assertDoesNotExist()
        }
    }
    companion object {
        fun input() = InstrumentationRegistry.getInstrumentation().context.assets.open("phase6/mock-input.json").use {
            JsonParser.parseString(it.bufferedReader(Charsets.UTF_8).readText()).asJsonObject }
        @JvmStatic @Parameterized.Parameters(name="{0}") fun cases(): List<Array<Any>> = MockCases.all(input()).map { arrayOf(it) }
    }
}
