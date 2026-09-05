package edu.bnbu.student.mvp.feature.checkin

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseV8UiStaticPolicyTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    @Test
    fun activeAndAcceptedScreensDoNotClaimLegacyHoursOrImmediateCredit() {
        val checkIn = source("ExerciseCheckInScreen.kt")
        val submission = source("ExerciseSubmissionScreen.kt")

        assertTrue(checkIn.contains("30、45 或 60 分钟"))
        assertTrue(checkIn.contains("单次最多计入 60 分钟"))
        assertTrue(submission.contains("材料已受理"))
        assertTrue(submission.contains("受理不等于有效、通过或已计入分钟"))
        assertFalse(checkIn.contains("预计学时"))
        assertFalse(checkIn.contains("已计入 \${state.creditedHours} 小时"))
        assertFalse(checkIn.contains("controller::addSixtyMinutes"))
        assertFalse(checkIn.contains("advanceLocalReviewToTwoHours"))
    }

    @Test
    fun evidenceAndSwimmingScreensExposeTheReviewedBoundaries() {
        val evidence = source("ExerciseEvidenceScreen.kt")
        val delay = source("SwimmingDelayExplanationScreen.kt")
        val media = source("SessionMediaManager.kt")

        listOf("JPEG/PNG", "有声 MP4", "前照片", "后照片", "禁拍区域").forEach {
            assertTrue("Evidence UI must include $it", evidence.contains(it))
        }
        assertTrue(delay.contains("完全离线"))
        assertTrue(delay.contains("SwimmingDelayExplanationHours"))
        assertTrue(delay.contains("小时内"))
        assertTrue(delay.contains("不会自动通过"))
        assertTrue(media.contains("已锁定"))
        assertTrue(media.contains("恢复时继续同一批次"))
    }

    @Test
    fun recordsSeparateActualEligibleCreditedAndReviewStages() {
        val records = source("CheckInRecords.kt")
        val stageModel = source("ExerciseReviewUiModel.kt")
        val stageUi = source("ExerciseReviewStageUi.kt")
        val progress = File(
            projectRoot,
            "app/src/main/java/edu/bnbu/student/mvp/feature/grades/GradesScreen.kt"
        ).readText()

        listOf("实际运动", "可计分钟", "实际计入").forEach {
            assertTrue("Record UI must include $it", records.contains(it))
        }
        listOf(
            "待 AI 检查",
            "待教师复核",
            "待补证",
            "补证已接收 · 待教师复核",
            "技术处理中",
            "有效 · 已计入",
            "有效 · 未计入",
            "无效",
            "审核阶段暂不可用"
        ).forEach {
            assertTrue("Review-stage UI must include $it", stageModel.contains(it))
        }
        assertTrue(stageUi.contains("技术问题不代表学生记录无效"))
        assertTrue(progress.contains("record.toExerciseRecordReviewUiModel()"))
        assertFalse(progress.contains("else -> interfaceText(\"处理中\""))
        assertTrue(records.contains("首版照片与视频（只读）"))
        assertFalse(records.contains("SubmissionChainPanel("))
        assertFalse(records.contains("onStartResubmission"))
        assertFalse(records.contains("teacherInternalNote"))
        assertFalse(records.contains("重新补交"))
    }

    @Test
    fun videoRecorderKeepsActiveControlLabelsVisibleOnNarrowLargeTextDevices() {
        val recorder = source("ExerciseVideoRecorder.kt")

        assertTrue(recorder.contains("RecorderActionButton("))
        assertTrue(recorder.contains("RecorderActionContent(title = title, icon = icon)"))
        assertTrue(recorder.contains("maxLines = 2"))
        assertTrue(recorder.contains("textAlign = TextAlign.Center"))
        assertTrue(recorder.contains("modifier = Modifier.weight(1f)"))
        assertFalse(recorder.contains("modifier = Modifier.weight(0.9f)"))
    }

    @Test
    fun retainedVideoPreviewShowsAFrameAndControlsWithoutABlindTap() {
        val mediaManager = source("SessionMediaManager.kt")

        assertTrue(mediaManager.contains("view.setOnPreparedListener"))
        assertTrue(mediaManager.contains("view.seekTo(1)"))
        assertTrue(mediaManager.contains("mediaController.show(0)"))
    }

    private fun source(name: String): String = File(
        projectRoot,
        "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/$name"
    ).also {
        require(it.isFile) { "Required project file is missing: ${it.absolutePath}" }
    }.readText()
}
