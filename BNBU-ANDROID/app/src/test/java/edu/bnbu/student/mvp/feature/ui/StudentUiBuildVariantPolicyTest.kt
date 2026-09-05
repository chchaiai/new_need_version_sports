package edu.bnbu.student.mvp.feature.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Source-set and entry-point checks, not release APK inspection.
 * Shared main-source UI samples still require a separate packaging audit.
 */
class StudentUiBuildVariantPolicyTest {
    private val projectRoot: File by lazy {
        generateSequence(File(requireNotNull(System.getProperty("user.dir"))).canonicalFile) { it.parentFile }
            .first { File(it, "app/src/main/AndroidManifest.xml").isFile }
    }

    @Test
    fun releaseWorkspaceProviderHasNoSyntheticWorkspaceFactory() {
        val release = read("app/src/release/java/edu/bnbu/student/mvp/core/review/LocalReviewWorkspaceProvider.kt")
        val debug = read("app/src/debug/java/edu/bnbu/student/mvp/core/review/LocalReviewWorkspaceProvider.kt")
        assertTrue(release.contains("val workspaceFactory: (() -> StudentWorkspace)? = null"))
        assertFalse(release.contains("createWorkspace"))
        assertFalse(release.contains("StudentProfile("))
        assertTrue(debug.contains("createWorkspace()"))
        assertTrue(debug.contains("LOCAL-REVIEW-STUDENT"))
        assertFalse(File(projectRoot,
            "app/src/main/java/edu/bnbu/student/mvp/core/review/LocalReviewWorkspaceProvider.kt").exists())
    }

    @Test
    fun productionBuildDisablesTestToolsAndDoesNotIncludeTheDebugSourceDirectory() {
        val gradle = read("app/build.gradle.kts")
        val release = gradle.substringAfter("        release {")
            .substringBefore("    compileOptions")
        assertTrue(release.contains("BNBU_TEST_TOOLS_ENABLED\", \"false\""))
        assertTrue(release.contains("BNBU_ENVIRONMENT\", \"production\""))
        val mainSource = gradle.substringAfter("sourceSets.getByName(\"main\")")
            .substringBefore("sourceSets.getByName(\"test\")")
        assertFalse(mainSource.contains("src/debug"))
    }

    @Test
    fun loginReviewEntryRequiresALocalEnvironmentAndAnInjectedFactory() {
        val root = read("app/src/main/java/edu/bnbu/student/mvp/feature/shell/AppRootScreen.kt")
        val compact = root.filterNot(Char::isWhitespace)
        assertTrue(compact.contains(
            "onLocalReview=localReviewWorkspaceFactory?.takeIf{BuildConfig.BNBU_ENVIRONMENT==\"local\"}"
        ))
        val activity = read("app/src/main/java/edu/bnbu/student/mvp/MainActivity.kt")
        assertTrue(activity.contains(
            "localReviewWorkspaceFactory = LocalReviewWorkspaceProvider.workspaceFactory"
        ))
    }

    private fun read(relativePath: String): String = File(projectRoot, relativePath).readText()
}

