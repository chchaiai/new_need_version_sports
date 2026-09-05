package edu.bnbu.student.mvp.feature.grades

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CheckInHoursPresentationPolicyTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    @Test
    fun recordsAndProgressScreenUsesTheV8MinutePresentationBoundary() {
        val source = File(
            projectRoot,
            "app/src/main/java/edu/bnbu/student/mvp/feature/grades/GradesScreen.kt"
        ).readText()
        val progressAdapter = File(
            projectRoot,
            "app/src/main/java/edu/bnbu/student/mvp/feature/common/StudentProgressUiModel.kt"
        ).readText()

        listOf(
            "本学期已计入",
            "实际 ",
            "可计 ",
            "计入 ",
            "待新接口"
        ).forEach { token ->
            assertTrue("Records and progress UI must include $token", source.contains(token))
        }

        assertFalse(source.contains("PublishedGradeCard"))
        assertFalse(source.contains("publishedTotalGrade"))
        assertFalse(source.contains("enduranceRunScore"))
        assertFalse(source.contains("小时"))
        assertTrue(progressAdapter.contains("StudentSemesterTargetMinutes = 1_200"))
        assertTrue(progressAdapter.contains("legacyHoursToWholeMinutes"))
    }
}
