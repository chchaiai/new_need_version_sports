package edu.bnbu.student.mvp.feature.ui

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StudentUiPageStatePolicyTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }
    private val repositoryRoot: File get() = requireNotNull(projectRoot.parentFile)

    @Test
    fun designInventoryKeepsAllFortyOnePagesAndSevenSharedStates() {
        val inventory = repositoryFile(
            "docs/rebuild/phase-2/android/p2a-student-ui/page-inventory.md"
        ).readText()
        val matrix = repositoryFile(
            "docs/rebuild/phase-2/android/p2a-student-ui/state-matrix.md"
        ).readText()
        val pageIds = Regex("PAGE-STU-\\d{3}").findAll(inventory).map { it.value }.toSet()

        assertEquals(41, pageIds.size)
        listOf("NORMAL", "LOADING", "EMPTY", "ERROR", "FORBIDDEN", "MAINTENANCE", "RESUME")
            .forEach { state -> assertTrue("State matrix must include $state", matrix.contains("`$state`")) }
        assertTrue(matrix.contains("所有 41 个页面都使用这一状态包络"))
    }

    @Test
    fun rootKeepsFiveReviewedTabsAndDedicatedCriticalSubflows() {
        val root = featureSource("shell/AppRootScreen.kt")

        listOf(
            "Dashboard(\"首页\"",
            "Courses(\"课程\"",
            "CheckIn(\"打卡\"",
            "Grades(\"记录与进度\"",
            "Profile(\"我的\""
        ).forEach { tab -> assertTrue("Missing reviewed tab $tab", root.contains(tab)) }
        val appTabBlock = root.substringAfter("enum class AppTab").substringBefore("enum class SubScreen")
        assertFalse(appTabBlock.contains("成绩"))

        listOf(
            "SubScreen.ScanJoin",
            "SubScreen.EnterCode",
            "SubScreen.CourseJoinConfirm",
            "SubScreen.CourseJoinResult",
            "SubScreen.Exemption",
            "SubScreen.SupplementTask",
            "SubScreen.SupplementResult",
            "SubScreen.AccountDetails",
            "SubScreen.HelpCenter",
            "SubScreen.Feedback"
        ).forEach { route -> assertTrue("Missing critical route $route", root.contains(route)) }
    }

    @Test
    fun exerciseAndJoinSurfacesCollectivelyExposeTheSevenStateEnvelope() {
        val root = featureSource("shell/AppRootScreen.kt")
        val exercise = featureSource("checkin/ExerciseCheckInScreen.kt")
        val submission = featureSource("checkin/ExerciseSubmissionScreen.kt")
        val enterCode = featureSource("courses/EnterInviteCodeScreen.kt")
        val joinResult = featureSource("courses/CourseJoinResultScreen.kt")

        assertTrue(root.contains("SystemMode.MAINTENANCE -> MaintenancePage("))
        assertTrue(exercise.contains("CircularProgressIndicator"))
        assertTrue(exercise.contains("EmptyPlaceholder("))
        assertTrue(exercise.contains("BNBUErrorPanel("))
        assertTrue(joinResult.contains("CourseJoinResultKind.Forbidden"))
        assertTrue(submission.contains("继续同一锁定批次"))
        assertTrue(submission.contains("上传已中断，可安全续传"))
        assertTrue(enterCode.contains("courseJoin.enterCode.loading"))
        assertTrue(enterCode.contains("courseJoin.enterCode.error"))
    }

    @Test
    fun addedAndRedesignedPagesRemainConnectedToReviewedUiSurfaces() {
        val root = featureSource("shell/AppRootScreen.kt")
        val exercise = featureSource("checkin/ExerciseCheckInScreen.kt")
        val grades = featureSource("grades/GradesScreen.kt")

        listOf(
            "screen.courseJoin.scan" to featureSource("courses/ScanJoinScreen.kt"),
            "screen.courseJoin.enterCode" to featureSource("courses/EnterInviteCodeScreen.kt"),
            "screen.courseJoinConfirm" to featureSource("courses/CourseJoinConfirmScreen.kt"),
            "screen.courseJoinResult" to featureSource("courses/CourseJoinResultScreen.kt"),
            "screen.supplementTask" to featureSource("checkin/SupplementTaskScreen.kt"),
            "screen.supplementResult" to featureSource("checkin/SupplementResultScreen.kt"),
            "screen.recordsProgress" to grades
        ).forEach { (tag, source) -> assertTrue("Missing reviewed surface $tag", source.contains(tag)) }

        assertTrue(exercise.contains("ExerciseEvidenceScreen("))
        assertTrue(exercise.contains("ExerciseSubmissionScreen("))
        assertTrue(exercise.contains("ExerciseSubmissionAcceptedScreen("))
        assertTrue(exercise.contains("SwimmingDelayExplanationScreen("))
        assertTrue(grades.contains("RawEnduranceResultCard("))
        assertTrue(root.contains("CourseJoinResultScreen("))
        assertTrue(root.contains("SupplementTaskScreen("))
        assertTrue(root.contains("SupplementResultScreen("))
    }

    private fun featureSource(relativePath: String): String = projectFile(
        "app/src/main/java/edu/bnbu/student/mvp/feature/$relativePath"
    ).readText()

    private fun projectFile(relativePath: String): File = File(projectRoot, relativePath).also {
        require(it.isFile) { "Required project file is missing: ${it.absolutePath}" }
    }

    private fun repositoryFile(relativePath: String): File = File(repositoryRoot, relativePath).also {
        require(it.isFile) { "Required repository file is missing: ${it.absolutePath}" }
    }
}
