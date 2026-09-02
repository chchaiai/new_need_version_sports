package edu.bnbu.student.mvp.core.review

import edu.bnbu.student.mvp.core.model.CheckInRecord
import edu.bnbu.student.mvp.core.model.CheckInTimeWindow
import edu.bnbu.student.mvp.core.model.Course
import edu.bnbu.student.mvp.core.model.CreditType
import edu.bnbu.student.mvp.core.model.Exemption
import edu.bnbu.student.mvp.core.model.NoticeCategory
import edu.bnbu.student.mvp.core.model.StudentNotice
import edu.bnbu.student.mvp.core.model.StudentProfile
import edu.bnbu.student.mvp.core.model.StudentStatus
import edu.bnbu.student.mvp.core.model.StudentProgress
import edu.bnbu.student.mvp.core.model.StudentWorkspace
import edu.bnbu.student.mvp.core.model.SyncOperation
import edu.bnbu.student.mvp.core.model.SyncOperationStatus
import edu.bnbu.student.mvp.core.model.SyncOperationType
import edu.bnbu.student.mvp.core.model.TeacherInfo

/** Debug-only synthetic workspace. No credential or network client is created. */
internal object LocalReviewWorkspaceProvider {
    val workspaceFactory: (() -> StudentWorkspace)? = { createWorkspace() }

    private fun createWorkspace(): StudentWorkspace {
        val student = StudentProfile(
            id = "LOCAL-REVIEW-STUDENT",
            studentNumber = "LOCAL-REVIEW-STUDENT",
            name = "本地测试学生",
            email = "student.review@bnbu.invalid",
            college = "本地合成数据学院",
            className = "免登录审查测试班",
            status = StudentStatus.ACTIVE.name,
            gender = "female",
            gradeLevel = "sophomore",
            admissionYear = 2024,
            currentAcademicYear = "2025-2026 学年",
            gradeCalculatedAt = "2026-08-25 12:00"
        )
        val course = Course(
            id = "local-review-course",
            name = "本地审查体育课程",
            semester = "2025-2026 第二学期",
            semesterId = "semester-2026-2",
            academicYear = "2025-2026",
            term = "SECOND",
            students = 30,
            completion = 80,
            missing = 6,
            deadline = "2026-08-31 23:59",
            teacher = "测试教师",
            teacherId = "local-review-teacher"
        )
        val records = listOf(
            CheckInRecord(
                id = "local-review-record-course",
                courseId = course.id,
                taskTitle = "本地课程运动记录",
                creditType = CreditType.CourseRelated,
                hours = 2.0,
                submittedAt = "2026-08-24 18:30",
                proofSummary = "1 张合成图片",
                proofPhotoCount = 1,
                proofVideoCount = 0,
                proofFiles = emptyList(),
                teacherPublicFeedback = "本地审查数据，不代表真实审核结果。",
                teacherInternalNote = null,
                note = "用于检查学生端课程运动记录展示。",
                sportType = "羽毛球",
                startTime = "2026-08-24T16:20:00+08:00",
                endTime = "2026-08-24T18:30:00+08:00",
                actualDurationSeconds = 7_800,
                reviewStatus = "VALID"
            ),
            CheckInRecord(
                id = "local-review-record-general",
                courseId = null,
                taskTitle = "本地自主运动记录",
                creditType = CreditType.General,
                hours = 2.0,
                submittedAt = "2026-08-23 07:20",
                proofSummary = "1 张合成图片",
                proofPhotoCount = 1,
                proofVideoCount = 0,
                proofFiles = emptyList(),
                teacherPublicFeedback = "本地合成记录。",
                teacherInternalNote = null,
                note = "用于检查学生端自主运动记录展示。",
                sportType = "跑步",
                startTime = "2026-08-23T05:10:00+08:00",
                endTime = "2026-08-23T07:20:00+08:00",
                actualDurationSeconds = 7_800,
                reviewStatus = "VALID"
            )
        )
        return StudentWorkspace.empty().copy(
            student = student,
            courses = listOf(course),
            progress = StudentProgress(
                id = student.id,
                name = student.name,
                college = student.college,
                className = student.className,
                course = 8.0,
                general = 8.0,
                rawCourse = 8.0,
                rawGeneral = 8.0,
                exam = 0,
                attendance = 0,
                physical = 0,
                status = "本地测试",
                source = "本地免登录审查数据 · 不来自真实 Backend",
                organizationCredit = null,
                authoritativeTotalHours = 16.0
            ),
            records = records,
            notices = listOf(
                StudentNotice(
                    id = "local-review-notice",
                    title = "免登录测试模式",
                    message = "当前内容全部为本地合成数据。",
                    time = "刚刚",
                    category = NoticeCategory.System,
                    isUnread = true
                )
            ),
            teachers = listOf(TeacherInfo(course.teacherId, course.teacher)),
            exemptions = listOf(
                Exemption(
                    id = "exemption-800m-2026",
                    studentId = student.id,
                    studentName = student.name,
                    type = "run_800m",
                    category = "physical_test",
                    reason = "因踝关节扭伤申请本学期 800 米测试缓测。",
                    status = "审核中",
                    proofFiles = listOf("mock://proof/medical_certificate.jpg"),
                    reviewComment = "已收到校医院证明，正在审核。",
                    reviewerName = "体育部教务组",
                    createdAt = "2026-07-21 11:05",
                    updatedAt = "2026-07-21 11:20"
                )
            ),
            syncOperations = listOf(
                SyncOperation(
                    id = "local-review-loaded",
                    type = SyncOperationType.ResetLocalData,
                    title = "本地审查数据已加载",
                    detail = "未连接真实 Backend",
                    createdAt = "刚刚",
                    status = SyncOperationStatus.LocalOnly
                )
            ),
            checkInTimeWindow = CheckInTimeWindow(
                windowMode = "semester_wide",
                dateRangeStart = null,
                dateRangeEnd = null,
                dailyStartTime = "00:00",
                dailyEndTime = "23:59",
                excludedDates = emptyList(),
                semesterDeadline = null
            )
        )
    }
}
