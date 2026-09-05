package edu.bnbu.student.mvp.feature.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StartupGateStaticPolicyTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    @Test
    fun startupWaitsUseVisibleLoadingAndErrorSurfaces() {
        val main = read("app/src/main/java/edu/bnbu/student/mvp/MainActivity.kt")
        val gate = read(
            "app/src/main/java/edu/bnbu/student/mvp/feature/shell/StartupGateScreen.kt"
        )

        assertTrue(main.contains("shouldKeepSystemSplash(initialSurfaceReady = isInitialTargetReady)"))
        assertFalse(main.contains("systemModeChecked ="))
        assertTrue(main.contains("StartupServiceState.ERROR"))
        assertTrue(main.contains("StartupGateScreen("))
        assertTrue(gate.contains("startup.loading"))
        assertTrue(gate.contains("startup.error"))
        assertTrue(gate.contains("startup.retry"))
        assertTrue(gate.contains("LiveRegionMode.Polite"))
        assertTrue(gate.contains("heightIn(min = BNBULayout.TouchTarget)"))
    }

    @Test
    fun failedServerCheckDoesNotSilentlyBecomeNormalMode() {
        val main = read("app/src/main/java/edu/bnbu/student/mvp/MainActivity.kt")
        val firstAttempt = main.substringAfter("val initialMode = requestSystemMode()")
            .substringBefore("while (true)")

        assertTrue(firstAttempt.contains("StartupServiceState.ERROR"))
        assertFalse(firstAttempt.contains("fallbackSystemModeStatus"))
        assertFalse(firstAttempt.contains("SystemMode.NORMAL"))
    }

    @Test
    fun localReviewBypassIsExplicitAndSourceSetGated() {
        val main = read("app/src/main/java/edu/bnbu/student/mvp/MainActivity.kt")
        val gate = read(
            "app/src/main/java/edu/bnbu/student/mvp/feature/shell/StartupGateScreen.kt"
        )
        val releaseProvider = read(
            "app/src/release/java/edu/bnbu/student/mvp/core/review/LocalReviewWorkspaceProvider.kt"
        )

        assertTrue(main.contains("localReviewWorkspaceFactory != null"))
        assertTrue(main.contains("appState.enterLocalReview(factory())"))
        assertTrue(gate.contains("if (allowLocalReview)"))
        assertTrue(releaseProvider.contains("workspaceFactory: (() -> StudentWorkspace)? = null"))
    }

    @Test
    fun startupCopyExistsInBothSupportedLanguages() {
        val chinese = read("app/src/main/res/values/strings.xml")
        val english = read("app/src/main/res/values-en/strings.xml")
        listOf(
            "startup_loading_title",
            "startup_loading_message",
            "startup_error_title",
            "startup_error_message",
            "startup_retry",
            "startup_local_review",
            "startup_local_review_hint"
        ).forEach { name ->
            assertTrue("Missing Chinese resource $name", chinese.contains("name=\"$name\""))
            assertTrue("Missing English resource $name", english.contains("name=\"$name\""))
        }
    }

    private fun read(relativePath: String): String = File(projectRoot, relativePath).also {
        require(it.isFile) { "Required project file is missing: ${it.absolutePath}" }
    }.readText()
}
