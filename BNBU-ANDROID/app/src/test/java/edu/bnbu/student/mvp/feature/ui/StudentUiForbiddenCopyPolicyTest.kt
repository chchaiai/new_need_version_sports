package edu.bnbu.student.mvp.feature.ui

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StudentUiForbiddenCopyPolicyTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    @Test
    fun reachableStudentSummariesDoNotProjectLegacyScorePayloads() {
        val summaries = listOf(
            "dashboard/DashboardScreen.kt",
            "courses/CoursesScreen.kt",
            "checkin/CheckInRecords.kt",
            "grades/GradesScreen.kt",
            "grades/RawEnduranceResult.kt",
            "notifications/NotificationSheet.kt",
            "profile/ProfileScreen.kt"
        ).associateWith(::featureSource)

        listOf(
            "enduranceRunScore",
            "totalScore",
            "totalDisplay",
            "publishedTotalGrade",
            "FinalGradePanel",
            "studentRank"
        ).forEach { forbidden ->
            summaries.forEach { (path, source) ->
                assertFalse("$path must not project $forbidden", source.contains(forbidden))
            }
        }

        val root = featureSource("shell/AppRootScreen.kt")
        assertTrue(root.contains("Grades(\"记录与进度\""))
        assertFalse(root.contains("Grades(\"成绩\""))
        assertFalse(root.contains("EnduranceScoring"))
    }

    @Test
    fun pendingStudentMembershipIsPresentedAsWithdrawn() {
        val labels = source(
            "app/src/main/java/edu/bnbu/student/mvp/core/model/ServerDisplayLabels.kt"
        )
        val profile = featureSource("profile/ProfileScreen.kt")
        val details = featureSource("profile/AccountDetailsScreen.kt")

        assertTrue(labels.contains("\"ACTIVE\" -> interfaceText(\"已进班\", \"Enrolled\")"))
        assertTrue(labels.contains("\"PENDING\" -> interfaceText(\"已退班\", \"Withdrawn\")"))
        assertTrue(profile.contains("studentStatusLabel(student.status)"))
        assertTrue(details.contains("studentStatusLabel(student.status)"))
    }

    @Test
    fun submittedAndAcceptedStatesNeverClaimValidityOrCreditedProgress() {
        val submission = featureSource("checkin/ExerciseSubmissionScreen.kt")
        val supplement = featureSource("checkin/SupplementResultScreen.kt")

        assertTrue(submission.contains("受理不等于有效、通过或已计入分钟"))
        assertTrue(submission.contains("当前尚未确认有效或计入分钟"))
        assertTrue(supplement.contains("等待责任教师复核"))
        assertTrue(supplement.contains("最终仍可能有效或无效"))
        assertTrue(supplement.contains("当前没有第二轮补充"))
        assertFalse(submission.contains("打卡成功"))
        assertFalse(supplement.contains("补充审核通过"))
    }

    @Test
    fun designReviewSamplesCannotEnterAFormalWriteOrFakeSuccessPath() {
        val root = featureSource("shell/AppRootScreen.kt")
        val supplement = featureSource("checkin/SupplementTaskScreen.kt")
        val scan = featureSource("courses/ScanJoinScreen.kt")

        assertTrue(root.contains("if (appState.isLocalReviewMode)"))
        assertTrue(root.contains("writeEnabled = false"))
        assertTrue(supplement.contains("本地虚构评审样例 · 不写入后端"))
        assertTrue(supplement.contains("不会生成本地成功记录"))
        listOf(
            "courseJoin.scan.simulateSuccess",
            "simulatedCourseJoinInfo",
            "模拟扫码成功",
            "Simulate scan success"
        ).forEach { forbidden ->
            assertFalse("Formal scan source must not contain $forbidden", scan.contains(forbidden))
        }
    }

    private fun featureSource(relativePath: String): String = source(
        "app/src/main/java/edu/bnbu/student/mvp/feature/$relativePath"
    )

    private fun source(relativePath: String): String = File(projectRoot, relativePath).also {
        require(it.isFile) { "Required project file is missing: ${it.absolutePath}" }
    }.readText()
}
