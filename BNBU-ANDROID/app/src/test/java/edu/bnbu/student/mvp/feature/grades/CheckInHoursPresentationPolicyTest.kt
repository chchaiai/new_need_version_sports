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
    fun checkInHoursCardMatchesTheWebStudentPresentationBaseline() {
        val source = File(
            projectRoot,
            "app/src/main/java/edu/bnbu/student/mvp/feature/grades/GradesScreen.kt"
        ).readText()

        listOf(
            "progress.status.trim().equals(\"QUALIFIED\", ignoreCase = true)",
            "有效打卡时长已累计；学时目标等待后端同步",
            "等待后端确认达标状态",
            "已按有效打卡累计，还需 \${formatHours(remaining)} 小时",
            " / 待后端同步"
        ).forEach { token ->
            assertTrue("Check-in hours card must include $token", source.contains(token))
        }

        assertFalse(source.contains("required = rule.courseRequired.takeIf"))
        assertFalse(source.contains("required = rule.generalRequired.takeIf"))
        assertFalse(source.contains("\${formatHours(completed)} / \${formatHours(required)} 小时"))
    }
}
