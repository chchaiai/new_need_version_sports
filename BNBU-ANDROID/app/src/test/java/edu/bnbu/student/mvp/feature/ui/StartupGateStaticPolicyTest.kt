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
    fun originalSystemSplashBrandingRemainsTheLaunchAndVisibleGateIdentity() {
        val manifest = read("app/src/main/AndroidManifest.xml")
        val styles = read("app/src/main/res/values/styles.xml")
        val stylesV31 = read("app/src/main/res/values-v31/styles.xml")
        val gate = read(
            "app/src/main/java/edu/bnbu/student/mvp/feature/shell/StartupGateScreen.kt"
        )

        assertTrue(manifest.contains("android:theme=\"@style/Theme.BNBUStudent.Starting\""))
        assertTrue(styles.contains("@drawable/splash_main_system_generated"))
        assertTrue(stylesV31.contains("@drawable/splash_main_system_generated"))
        assertTrue(stylesV31.contains("@drawable/verity_ai_generated_system"))
        assertTrue(gate.contains("R.drawable.splash_main_system_generated"))
        assertTrue(gate.contains("R.drawable.splash_partner_generated"))
        assertTrue(gate.contains("R.color.bnbu_splash_background"))
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
    fun refreshFailureDoesNotReplaceTheLastConfirmedModeWithFallbackMaintenance() {
        val main = read("app/src/main/java/edu/bnbu/student/mvp/MainActivity.kt")
        val refreshLoop = main.substringAfter("while (true) {")
            .substringBefore("\n            }\n\n            val localStartupReady")
        val refreshFailure = refreshLoop.substringAfter("} else {")

        assertTrue(refreshLoop.contains("val refreshedMode = requestSystemMode()"))
        assertTrue(refreshLoop.contains("resolveSystemModeRefresh("))
        assertTrue(refreshFailure.contains("preserving last confirmed"))
        assertFalse(refreshFailure.contains("fallbackSystemModeStatus"))
        assertFalse(refreshFailure.contains("appState.updateSystemMode"))
    }

    @Test
    fun refreshFailureUsesAnIndependentBlockingSurfaceWithoutAFalsePausePromise() {
        val root = read(
            "app/src/main/java/edu/bnbu/student/mvp/feature/shell/AppRootScreen.kt"
        )
        val chinese = read("app/src/main/res/values/strings.xml")
        val english = read("app/src/main/res/values-en/strings.xml")

        assertTrue(root.contains("SystemModeConnectionState.REFRESH_UNAVAILABLE"))
        assertTrue(root.contains("SystemModeRefreshUnavailablePage("))
        assertTrue(root.contains("systemMode.refreshUnavailable"))
        assertTrue(root.contains("maintenance.refreshUnavailable"))
        assertTrue(root.contains("heightIn(min = BNBULayout.TouchTarget)"))
        assertTrue(chinese.contains("当前未认定为维护，也不会据此显示补证计时暂停"))
        assertTrue(english.contains("This is not treated as maintenance"))
        assertTrue(english.contains("does not promise that supplementary-evidence timing is paused"))
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
            "startup_local_review_hint",
            "system_mode_refresh_error_title",
            "system_mode_refresh_error_message",
            "system_mode_refresh_error_icon",
            "system_mode_refresh_retry",
            "maintenance_refresh_error_title",
            "maintenance_refresh_error_message"
        ).forEach { name ->
            assertTrue("Missing Chinese resource $name", chinese.contains("name=\"$name\""))
            assertTrue("Missing English resource $name", english.contains("name=\"$name\""))
        }
    }

    private fun read(relativePath: String): String = File(projectRoot, relativePath).also {
        require(it.isFile) { "Required project file is missing: ${it.absolutePath}" }
    }.readText()
}
