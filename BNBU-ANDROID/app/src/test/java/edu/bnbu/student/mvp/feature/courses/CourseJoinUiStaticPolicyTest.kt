package edu.bnbu.student.mvp.feature.courses

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CourseJoinUiStaticPolicyTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    @Test
    fun formalScanFlowContainsNoSyntheticSuccessRoute() {
        val scan = source(
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/ScanJoinScreen.kt"
        )

        listOf(
            "SIMULATED-PREVIEW-ONLY",
            "simulatedCourseJoinInfo",
            "courseJoin.scan.simulateSuccess",
            "模拟扫码成功",
            "Simulate scan success"
        ).forEach { forbidden ->
            assertFalse("Formal scan UI must not contain $forbidden", scan.contains(forbidden))
        }
        assertTrue(scan.contains("onEnterCode"))
        assertTrue(scan.contains("courseJoin.scan.manualInput"))
    }

    @Test
    fun resultPageKeepsEveryRequiredOutcomeDistinct() {
        val model = source(
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/CourseJoinUiModel.kt"
        )
        val result = source(
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/CourseJoinResultScreen.kt"
        )

        listOf(
            "Success",
            "AlreadyEnrolled",
            "SemesterConflict",
            "InvitationExpired",
            "GracePeriodExhausted",
            "InvitationRevoked",
            "CourseClosed",
            "Forbidden",
            "TechnicalFailure",
            "ResultUnknown"
        ).forEach { outcome ->
            assertTrue("Result model must include $outcome", model.contains(outcome))
            assertTrue("Result page must render $outcome", result.contains("CourseJoinResultKind.$outcome"))
        }
        assertTrue(result.contains("Do not treat this as success"))
        assertTrue(result.contains("isDesignReview"))
    }

    @Test
    fun appNavigationUsesDedicatedEntryConfirmationAndResultPages() {
        val root = source(
            "app/src/main/java/edu/bnbu/student/mvp/feature/shell/AppRootScreen.kt"
        )

        assertTrue(root.contains("SubScreen.EnterCode"))
        assertTrue(root.contains("SubScreen.CourseJoinConfirm"))
        assertTrue(root.contains("SubScreen.CourseJoinResult"))
        assertTrue(root.contains("CourseJoinResultScreen("))
    }

    private fun source(relativePath: String): String =
        File(projectRoot, relativePath).also {
            require(it.isFile) { "Required project file is missing: ${it.absolutePath}" }
        }.readText()
}
