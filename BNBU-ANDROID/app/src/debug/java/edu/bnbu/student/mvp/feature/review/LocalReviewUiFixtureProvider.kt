package edu.bnbu.student.mvp.feature.review

import edu.bnbu.student.mvp.core.designsystem.interfaceText
import edu.bnbu.student.mvp.core.model.EnduranceRunStatus
import edu.bnbu.student.mvp.core.model.HelpArticleContent
import edu.bnbu.student.mvp.feature.checkin.ExerciseReviewPublicReasonCodeUi
import edu.bnbu.student.mvp.feature.checkin.ExerciseReviewPublicReasonUiModel
import edu.bnbu.student.mvp.feature.checkin.ExerciseReviewTeacherActionUi
import edu.bnbu.student.mvp.feature.checkin.SupplementTaskState
import edu.bnbu.student.mvp.feature.checkin.SupplementTaskUiModel
import edu.bnbu.student.mvp.feature.grades.RawEnduranceResultUiModel
import edu.bnbu.student.mvp.feature.grades.rawEnduranceResultUiModel

/** Debug-only runtime fixtures. No credential, repository, or network client is created. */
internal object LocalReviewUiFixtureProvider {
    val supplementTask: SupplementTaskUiModel?
        get() = SupplementTaskUiModel(
            recordId = "LOCAL-REVIEW-RECORD",
            sportLabel = "羽毛球",
            originalSubmittedAt = "2026-09-04 18:30",
            reviewReason = ExerciseReviewPublicReasonUiModel.TeacherDecision(
                action = ExerciseReviewTeacherActionUi.ReturnForSupplement,
                reasonCode = ExerciseReviewPublicReasonCodeUi.MissingRequiredEvidence,
                publicSupplementalNote = "请补充能够说明本次运动现场与时间连续性的材料。"
            ),
            deadlineLabel = "2026-09-05 18:30（Asia/Shanghai）",
            windowHours = 24,
            originalEvidenceLabels = listOf(
                "原始照片 1 · 只读引用",
                "原始有声视频 · 只读引用"
            ),
            state = SupplementTaskState.Open,
            formalSubmissionAvailable = false,
            isReviewSample = true
        )

    val rawEnduranceResult: RawEnduranceResultUiModel?
        get() = rawEnduranceResultUiModel(
            gender = "female",
            status = EnduranceRunStatus.Recorded,
            durationSeconds = 287,
            testDate = "2026-08-29",
            isReviewSample = true
        )

    fun helpArticles(): List<HelpArticleContent> = listOf(
        HelpArticleContent(
            id = "HA-001",
            categoryCode = "checkin",
            locale = interfaceText("zh-CN", "en"),
            title = interfaceText("如何提交运动打卡？", "How do I submit an activity check-in?"),
            bodyMarkdown = interfaceText(
                "进入“打卡”，核对课程和教师配置的 30/45/60 分钟门槛。完成后提交当前材料；已受理不等于有效或已计入分钟。",
                "Open Check-in and review the class and its teacher-selected 30/45/60-minute threshold. Submit the current evidence when finished; received does not mean valid or credited."
            ),
            publishedAt = "2026-03-02T08:00:00Z",
            version = 1
        ),
        HelpArticleContent(
            id = "HA-006",
            categoryCode = "enrollment",
            locale = interfaceText("zh-CN", "en"),
            title = interfaceText("如何扫码或使用邀请码加入课程？", "How do I join a class with a QR code or invitation code?"),
            bodyMarkdown = interfaceText(
                "扫描授课教师展示的课程二维码后，请先核对课程名称、班级、教师和学期，再填写姓名、学号、性别和年级并确认加入。服务端校验成功后会立即建立有效课程成员关系并进入学生首页，无需等待教师审核。无法扫码时，可在学生端输入邀请码；二维码过期或被撤销时，请向教师获取新的邀请。",
                "After scanning the class QR code shown by your teacher, confirm the course, section, teacher, and semester, then enter your name, student ID, gender, and grade. Successful server validation creates an active membership immediately and opens the student home screen without teacher approval. If scanning is unavailable, enter the invitation code in the student app; ask for a new invitation if the code has expired or been revoked."
            ),
            publishedAt = "2026-08-01T08:00:00Z",
            version = 1
        ),
        HelpArticleContent(
            id = "HA-002",
            categoryCode = "login",
            locale = interfaceText("zh-CN", "en"),
            title = interfaceText("验证码连续输错后怎么办？", "What happens after repeated verification-code failures?"),
            bodyMarkdown = interfaceText(
                "连续输错或频繁申请验证码时，系统可能暂时限制继续尝试。请按页面提示稍后重试；无法使用已验证邮箱时，联系学校体育教学部门或账户管理员完成身份核验。",
                "Repeated incorrect codes or frequent requests may temporarily limit further attempts. Retry when the page allows; if you cannot use the verified email, contact the school sports office or account administrator for identity verification."
            ),
            publishedAt = "2026-03-05T08:00:00Z",
            version = 1
        ),
        HelpArticleContent(
            id = "HA-003",
            categoryCode = "exemption",
            locale = interfaceText("zh-CN", "en"),
            title = interfaceText("如何申请耐力跑免测？", "How do I apply for an endurance-run exemption?"),
            bodyMarkdown = interfaceText(
                "在申请页选择耐力跑免测，按要求提交医学材料并等待授课教师审核。",
                "Choose Endurance-run exemption under Applications, provide the required medical documents, and wait for your teacher's review."
            ),
            publishedAt = "2026-04-12T08:00:00Z",
            version = 1
        )
    )
}
