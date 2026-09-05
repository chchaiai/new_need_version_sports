package edu.bnbu.student.mvp.feature.notifications

import edu.bnbu.student.mvp.core.model.NoticeCategory
import edu.bnbu.student.mvp.core.model.StudentNotice
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StudentNoticeUiModelTest {
    @Test
    fun keepsOnlyWhitelistedStudentWorkflowNotifications() {
        val notices = listOf(
            notice(
                id = "review",
                title = "运动材料审核完成",
                message = "已确认 45 分钟计入运动进度",
                category = NoticeCategory.Review,
                targetType = "exercise_record"
            ),
            notice(
                id = "maintenance",
                title = "系统维护提醒",
                message = "服务恢复后可继续提交"
            ),
            notice(
                id = "generic",
                title = "欢迎回来",
                message = "暂无待办"
            )
        ).toStudentNoticeUiModels()

        assertEquals(listOf("review", "maintenance"), notices.map { it.id })
        assertEquals(StudentNoticeKind.Review, notices.first().kind)
        assertFalse(notices.first().opensExemption)
    }

    @Test
    fun omitsTheWholeNoticeWhenResultDataAppears() {
        val notices = listOf(
            notice(
                id = "unsafe-zh",
                title = "最终成绩已发布",
                message = "请查看详情",
                category = NoticeCategory.Review,
                targetType = "exercise_record"
            ),
            notice(
                id = "unsafe-en",
                title = "Final grade available",
                message = "Open the app",
                category = NoticeCategory.Review,
                targetType = "exercise_record"
            ),
            notice(
                id = "unsafe-converted-score",
                title = "Converted endurance score available",
                message = "Open the app",
                category = NoticeCategory.Review,
                targetType = "exercise_record"
            )
        ).toStudentNoticeUiModels()

        assertTrue(notices.isEmpty())
    }

    @Test
    fun keepsValidEnglishFailureAndWorkflowStatusWording() {
        val notices = listOf(
            notice(
                id = "upload-failed",
                title = "Evidence upload failed",
                message = "Try the same evidence batch again"
            ),
            notice(
                id = "checks-passed",
                title = "Evidence passed initial checks",
                message = "Waiting for teacher review"
            ),
            notice(
                id = "evidence-level",
                title = "Evidence level unavailable",
                message = "The record remains in technical processing"
            ),
            notice(
                id = "points-to-evidence",
                title = "Review points to missing evidence",
                message = "Open the supplementary evidence task"
            )
        ).toStudentNoticeUiModels()

        assertEquals(
            listOf("upload-failed", "checks-passed", "evidence-level", "points-to-evidence"),
            notices.map { it.id }
        )
        assertTrue(notices.all { it.kind == StudentNoticeKind.Review })
    }

    @Test
    fun exemptionWorkflowCanOpenTheApplicationSurface() {
        val notice = listOf(
            notice(
                id = "exemption",
                title = "免测申请需要补充材料",
                message = "请在截止前补充证明",
                category = NoticeCategory.Review,
                targetType = "exemption"
            )
        ).toStudentNoticeUiModels().single()

        assertTrue(notice.opensExemption)
    }

    private fun notice(
        id: String,
        title: String,
        message: String,
        category: NoticeCategory = NoticeCategory.System,
        targetType: String? = null
    ) = StudentNotice(
        id = id,
        title = title,
        message = message,
        time = "now",
        category = category,
        isUnread = true,
        targetType = targetType
    )
}
