package edu.bnbu.student.mvp.feature.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Source-set and entry-point checks, not release APK inspection.
 * Compose previews remain design-time source and require a separate release-artifact audit.
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

    @Test
    fun runtimeReviewPayloadsExistOnlyInTheDebugSourceSet() {
        val mainSupplement = read(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SupplementUiModel.kt"
        )
        val mainHelp = read(
            "app/src/main/java/edu/bnbu/student/mvp/feature/help/HelpArticlePresentation.kt"
        )
        val mainGrades = read(
            "app/src/main/java/edu/bnbu/student/mvp/feature/grades/GradesScreen.kt"
        )
        val mainRoot = read(
            "app/src/main/java/edu/bnbu/student/mvp/feature/shell/AppRootScreen.kt"
        )
        val debug = read(
            "app/src/debug/java/edu/bnbu/student/mvp/feature/review/LocalReviewUiFixtureProvider.kt"
        )
        val release = read(
            "app/src/release/java/edu/bnbu/student/mvp/feature/review/LocalReviewUiFixtureProvider.kt"
        )
        val staging = read(
            "app/src/staging/java/edu/bnbu/student/mvp/feature/review/LocalReviewUiFixtureProvider.kt"
        )

        assertFalse(mainSupplement.contains("LOCAL-REVIEW-RECORD"))
        assertFalse(mainSupplement.contains("localReviewSupplementTask"))
        assertFalse(mainHelp.contains("localReviewHelpArticles"))
        assertFalse(mainGrades.contains("testDate = \"2026-08-29\""))
        assertTrue(mainGrades.contains("LocalReviewUiFixtureProvider.rawEnduranceResult"))
        assertTrue(mainRoot.contains("LocalReviewUiFixtureProvider.supplementTask"))

        assertTrue(debug.contains("LOCAL-REVIEW-RECORD"))
        assertTrue(debug.contains("val supplementTask: SupplementTaskUiModel?"))
        assertTrue(debug.contains("val rawEnduranceResult: RawEnduranceResultUiModel?"))
        assertTrue(debug.contains("fun helpArticles(): List<HelpArticleContent> = listOf("))
        assertTrue(debug.contains("isReviewSample = true"))

        listOf(release, staging).forEach { nonDebug ->
            assertTrue(nonDebug.contains("val supplementTask: SupplementTaskUiModel? = null"))
            assertTrue(nonDebug.contains("val rawEnduranceResult: RawEnduranceResultUiModel? = null"))
            assertTrue(nonDebug.contains("fun helpArticles(): List<HelpArticleContent> = emptyList()"))
            assertFalse(nonDebug.contains("LOCAL-REVIEW-RECORD"))
            assertFalse(nonDebug.contains("HelpArticleContent("))
            assertFalse(nonDebug.contains("isReviewSample = true"))
        }
    }

    @Test
    fun designPreviewFixturesExistOnlyInTheDebugSourceSet() {
        val mainRoot = File(projectRoot, "app/src/main/java")
        val mainPreviews = mainRoot.walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .filter { it.readText().contains("@Preview") }
            .map { it.relativeTo(projectRoot).invariantSeparatorsPath }
            .toList()
        assertTrue("Main source set must not contain design preview fixtures: $mainPreviews", mainPreviews.isEmpty())

        val debugPreviewFiles = listOf(
            "app/src/debug/java/edu/bnbu/student/mvp/feature/courses/CourseJoinResultPreviews.kt",
            "app/src/debug/java/edu/bnbu/student/mvp/feature/shell/MaintenancePreviews.kt"
        )
        debugPreviewFiles.forEach { path ->
            assertTrue("Missing debug-only preview: $path", read(path).contains("@Preview"))
        }
    }

    private fun read(relativePath: String): String = File(projectRoot, relativePath).readText()
}
