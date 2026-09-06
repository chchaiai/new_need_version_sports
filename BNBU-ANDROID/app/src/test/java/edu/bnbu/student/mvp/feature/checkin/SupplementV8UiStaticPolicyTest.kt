package edu.bnbu.student.mvp.feature.checkin

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SupplementV8UiStaticPolicyTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    @Test
    fun oneTimeSupplementScreensKeepAcceptanceSeparateFromValidity() {
        val task = source("feature/checkin/SupplementTaskScreen.kt")
        val result = source("feature/checkin/SupplementResultScreen.kt")
        val model = source("feature/checkin/SupplementUiModel.kt")

        listOf("24", "72", "原材料（永久只读）", "唯一补充版本", "不代表有效、通过或已经计入分钟")
            .forEach { assertTrue("Supplement UI must include $it", task.contains(it)) }
        listOf("补充材料已接收", "等待责任教师复核", "已使用 1/1", "没有第二轮补充")
            .forEach { assertTrue("Supplement result must include $it", result.contains(it)) }
        assertTrue(model.contains("MaximumSupplementVersions = 1"))
        assertTrue(model.contains("AllowedWindowHours = setOf(24, 72)"))
        assertFalse(task.contains("自动通过"))
    }

    @Test
    fun exemptionScreenUsesItsOwnThreeImageTenMegabyteWebpBoundary() {
        val source = source("feature/exemption/ExemptionScreen.kt")

        assertTrue(source.contains("MaxExemptionMediaItems = 3"))
        assertTrue(source.contains("MaxExemptionImageBytes = 10_000_000L"))
        assertTrue(source.contains("image/webp"))
        assertTrue(source.contains("首次与全部补充累计最多 3 张"))
        assertTrue(source.contains("校队认证"))
        assertTrue(source.contains("社团认证"))
        assertFalse(source.contains("体育免测与免打卡申请"))
        assertFalse(source.contains("MaxExemptionMediaItems = 20"))
    }

    @Test
    fun enduranceStudentSurfaceHasNoScoreOrRankingProjection() {
        val source = source("feature/grades/RawEnduranceResult.kt")

        listOf("原始耐力结果", "测试日期", "OCR 草稿", "缺失不会显示为 0 分")
            .forEach { assertTrue("Raw endurance UI must include $it", source.contains(it)) }
        listOf("enduranceRunScore", "score:", "rank:", "level:")
            .forEach { assertFalse("Raw endurance UI must not declare $it", source.contains(it)) }
    }

    private fun source(relativePath: String): String = File(
        projectRoot,
        "app/src/main/java/edu/bnbu/student/mvp/$relativePath"
    ).readText()
}
