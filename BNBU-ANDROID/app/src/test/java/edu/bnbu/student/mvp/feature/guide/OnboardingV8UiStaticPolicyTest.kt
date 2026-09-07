package edu.bnbu.student.mvp.feature.guide

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OnboardingV8UiStaticPolicyTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    @Test
    fun guideUsesCurrentNavigationAndApplicationSemantics() {
        val source = File(
            projectRoot,
            "app/src/main/java/edu/bnbu/student/mvp/feature/guide/OnboardingGuideScreen.kt"
        ).readText()

        assertTrue(source.contains("记录与进度"))
        assertTrue(source.contains("只有服务器标记“需补材料”时才能补充"))
        assertTrue(source.contains("校队或社团认证"))
        assertFalse(source.contains("补充材料或重新提交"))
        assertFalse(source.contains("Check status, add documents, or resubmit"))
        assertFalse(source.contains("打卡、校队或社团"))
        assertFalse(source.contains("从首页或“运动”"))
    }
}
