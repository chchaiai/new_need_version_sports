package edu.bnbu.student.mvp.feature.profile

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AccountSupportV8UiStaticPolicyTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    private fun source(relativePath: String): String = File(projectRoot, relativePath).readText()

    @Test
    fun recoveryAndEmailBindingDoNotPromiseUnsupportedChannelsOrBusinessEmail() {
        val recovery = source(
            "app/src/main/java/edu/bnbu/student/mvp/feature/login/RecoveryRequestScreen.kt"
        )
        val binding = source(
            "app/src/main/java/edu/bnbu/student/mvp/feature/login/ContactBindingScreen.kt"
        )

        assertTrue(recovery.contains("没有手机号、短信验证码或自助账户恢复入口"))
        assertTrue(recovery.contains("本页面不会直接改绑"))
        assertTrue(binding.contains("业务提醒只在站内通知中心查看"))
        assertFalse(binding.contains("用于身份验证及重要通知"))
        assertFalse(binding.contains("identity checks and important notices"))
    }

    @Test
    fun accountDetailsExposeMembershipStatusAndDeletionDoesNotInventABlocker() {
        val details = source(
            "app/src/main/java/edu/bnbu/student/mvp/feature/profile/AccountDetailsScreen.kt"
        )
        val deletion = source(
            "app/src/main/java/edu/bnbu/student/mvp/feature/profile/AccountDeletionScreen.kt"
        )

        assertTrue(details.contains("studentStatusLabel(student.status)"))
        assertTrue(deletion.contains("服务器确认的其他阻塞事项"))
        assertFalse(deletion.contains("存在进行中运动或待审核记录时"))
        assertFalse(deletion.contains("pending review blocks deletion"))
    }

    @Test
    fun changelogDoesNotAdvertiseStudentScoresOrSystemPush() {
        val chinese = source("app/src/main/res/values/strings.xml")
        val english = source("app/src/main/res/values-en/strings.xml")

        assertTrue(chinese.contains("业务提醒只在站内通知中心展示"))
        assertTrue(english.contains("business reminders appear only in the in-app notification centre"))
        assertFalse(chinese.contains("支持课程、打卡、成绩和服务申请等核心功能"))
        assertFalse(english.contains("Core course, check-in, grade, and service-application features are available"))
        assertFalse(chinese.contains("支持离线缓存和系统通知"))
        assertFalse(english.contains("Offline caching and system notifications"))
    }

    @Test
    fun languageSwitchUpdatesTheComposeLocaleWithoutRestartingTheActivity() {
        val profile = source(
            "app/src/main/java/edu/bnbu/student/mvp/feature/profile/ProfileScreen.kt"
        )
        val activity = source("app/src/main/java/edu/bnbu/student/mvp/MainActivity.kt")

        assertTrue(profile.contains("appState.updateAppLanguage(language)"))
        assertFalse(profile.contains("recreate()"))
        assertTrue(activity.contains("object : ContextWrapper(hostContext)"))
        assertTrue(activity.contains("LocalContext provides localizedContext"))
        assertTrue(activity.contains("LocalConfiguration provides localizedConfiguration"))
    }
}
