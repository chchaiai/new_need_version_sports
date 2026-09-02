"use client";

import { useEffect, useRef } from "react";

export type Locale = "zh" | "en";

type LanguageToggleProps = {
  locale: Locale;
  onChange: (locale: Locale) => void;
  compact?: boolean;
};

// The workspace was originally authored in Chinese. Keeping this dictionary at the
// display boundary lets the existing forms retain their Chinese status values and
// validation logic while presenting a complete English teacher experience.
const englishText: Record<string, string> = {
  "北师香港浸会大学 · 体育课程管理平台":
    "Beijing Normal-Hong Kong Baptist University · Physical Education Management Platform",
  体育课程管理平台: "Physical Education Management Platform",
  体育课程管理平台标志: "Physical Education Management Platform logo",
  正在确认系统状态: "Checking system status",
  系统维护中: "System maintenance",
  "正在读取服务端最新运行状态，确认完成前所有业务入口保持关闭。":
    "All business entry points remain closed until the latest server status is confirmed.",
  "普通学生与教师业务暂不可用，请等待授权管理员恢复系统。":
    "Student and teacher features are temporarily unavailable until an authorised administrator restores service.",
  "预计恢复时间：请留意管理员后续通知":
    "Estimated recovery: watch for an administrator update",
  "管理员治理入口 · Administrator access": "Administrator access",
  正在恢复登录状态: "Restoring your session",
  登录状态已保留: "Your session is still saved",
  "正在核验已保存的登录凭据，请稍候。":
    "Checking your saved sign-in credentials. Please wait.",
  "当前暂时无法连接服务，已保存的登录凭据不会被删除。":
    "The service is temporarily unreachable. Your saved sign-in credentials have not been deleted.",
  重试恢复: "Retry session restore",
  使用其他账号: "Use another account",
  "已保存的会话不属于教师或管理员账号。":
    "This saved session does not belong to a teacher or administrator account.",
  登录管理平台: "Sign in to the Management Platform",
  "使用学校分配的教师或管理员账号登录。":
    "Sign in with the teacher or administrator account assigned by the university.",
  学校邮箱: "University email",
  请输入学校邮箱: "Enter your university email",
  密码: "Password",
  请输入密码: "Enter your password",
  显示或隐藏密码: "Show or hide password",
  "正在登录…": "Signing in…",
  登录: "Sign In",
  "忘记密码或无法登录？": "Forgot your password or unable to sign in?",
  测试教师: "Test Teacher",
  测试管理员: "Test Administrator",
  本地审查数据: "Local review data",
  本地审查: "LOCAL REVIEW",
  开发预览: "DEVELOPMENT PREVIEW",
  跳过登录: "Skip sign-in",
  "无需登录即可打开完整教师端或管理端界面；预览数据只保留在当前浏览器。":
    "Open the complete teacher or administrator interface without signing in. Preview data stays in this browser only.",
  可跳过登录查看的工作区: "Workspaces available without sign-in",
  跳过登录查看教师端: "Skip sign-in and view teacher portal",
  跳过登录查看管理端: "Skip sign-in and view administrator portal",
  免登录预览模式: "Sign-in-free preview mode",
  "完整界面使用本地预览数据，不会向真实 Backend 发送业务写入。":
    "The complete interface uses local preview data and does not send business writes to the real Backend.",
  复位预览: "Reset preview",
  "预览数据已复位。": "Preview data reset.",
  免登录测试入口: "Password-free test access",
  "仅使用浏览器内的合成数据，不会向真实 Backend 登录或写入业务数据。":
    "Uses synthetic browser data only. It does not authenticate with or write to the real Backend.",
  免登录测试角色: "Password-free test roles",
  测试教师端: "Test teacher",
  课程与审核流程: "Courses and reviews",
  测试管理员端: "Test administrator",
  系统治理工作台: "Governance workspace",
  "正式登录仍仅使用后端认证与授权数据，并根据账号权限进入对应工作台":
    "Formal sign-in still uses Backend authentication and authorization only.",
  免登录测试模式: "Password-free test mode",
  "仅使用本地合成数据，不会向真实 Backend 发送业务请求。":
    "Synthetic local data only; no business request is sent to the real Backend.",
  复位数据: "Reset data",
  "Mock 数据已复位。": "Mock data reset.",
  退出测试: "Exit test",
  重置密码: "Reset password",
  验证邮箱: "Verify email",
  设置新密码: "Set a new password",
  密码已更新: "Password updated",
  使用新密码保护您的教师账号:
    "Protect your teacher account with a new password",
  账号安全设置已完成: "Account security setup is complete",
  无法登录协助: "Sign-in assistance",
  密码重置完成: "Password reset complete",
  返回登录: "Back to sign in",
  "请输入工号后继续。": "Enter your staff ID to continue.",
  "请输入邮箱收到的 6 位验证码。": "Enter the 6-digit code sent to your email.",
  "新密码至少 8 位，并同时包含字母和数字。":
    "Your new password must contain at least 8 characters, including letters and numbers.",
  "两次输入的新密码不一致。": "The new passwords do not match.",
  "输入教师或管理员工号。验证通过后，系统会向该账号绑定的邮箱发送密码重置验证码。":
    "Enter a teacher or administrator staff ID. After verification, a password-reset code will be sent to the email linked to the account.",
  工号: "Staff ID",
  请输入工号: "Enter your staff ID",
  发送验证码: "Send verification code",
  "收不到邮箱验证码或账号无法使用？":
    "Cannot receive an email code or access your account?",
  "验证码已发送至绑定邮箱（已脱敏显示）。验证码 10 分钟内有效，仅可使用一次。":
    "A verification code has been sent to the linked email address (masked). It is valid for 10 minutes and can be used once.",
  "6 位验证码": "6-digit verification code",
  "请输入 6 位数字验证码": "Enter the 6-digit verification code",
  验证并继续: "Verify and continue",
  "未收到验证码？同一邮箱 60 秒后可重新发送；连续输错 5 次将锁定 15 分钟。":
    "Didn't receive the code? You can resend after 60 seconds; five consecutive incorrect attempts lock the account for 15 minutes.",
  "无法使用绑定邮箱？": "Cannot access the linked email?",
  "请设置新密码。成功后，当前账号在所有设备上的旧登录状态将失效。":
    "Set a new password. Once successful, all previous sign-in sessions for this account will be invalidated.",
  新密码: "New password",
  "至少 8 位，包含字母和数字":
    "At least 8 characters, including letters and numbers",
  确认新密码: "Confirm new password",
  请再次输入新密码: "Enter the new password again",
  确认重置密码: "Confirm password reset",
  账号安全: "Account security",
  修改密码: "Change password",
  "定期更新密码，有助于保护课程和学生信息。":
    "Updating your password regularly helps protect course and student information.",
  "退出当前登录后，通过已验证学校邮箱完成身份验证并设置新密码。":
    "After signing out, verify your identity through your verified university email and set a new password.",
  "无需跳转登录页，在当前工作台完成邮箱验证并设置新密码。":
    "Verify your email and set a new password in the current workspace without returning to sign in.",
  "无需离开工作台，完成身份验证并设置新密码":
    "Verify your identity and set a new password without leaving the workspace",
  修改密码进度: "Password change progress",
  验证身份: "Verify identity",
  设置密码: "Set password",
  "通过当前账号已验证的学校邮箱完成身份验证；整个过程保留在当前工作台内。":
    "Verify your identity with the university email linked to this account. You will remain in the current workspace while completing the steps.",
  当前账号: "Current account",
  已验证邮箱: "Verified email",
  "免登录预览仅展示流程，不会发送验证码，也不会修改账号密码。":
    "Preview only: no verification email will be sent and no password will be changed.",
  完整学校邮箱: "Complete verified email",
  "请输入上方脱敏邮箱对应的完整地址。":
    "Enter the complete address represented by the masked email above.",
  请输入已验证学校邮箱: "Enter the verified university email",
  返回账号信息: "Back to account",
  预览下一步: "Preview next step",
  "正在发送…": "Sending…",
  "输入邮件验证码并设置新密码；修改完成后，该账号现有登录状态将全部失效。":
    "Enter the email verification code and set a new password. Existing sign-in sessions will be revoked after completion.",
  "当前为免登录预览，最终提交已禁用。":
    "Preview only: the final submission is disabled.",
  "验证码有效期至：": "Verification expires at: ",
  请输入验证码: "Enter the verification code",
  上一步: "Previous",
  预览模式不可提交: "Disabled in preview",
  验证并修改密码: "Verify and update",
  "Backend 已撤销该账号现有登录状态，请使用新密码重新登录。":
    "The Backend has revoked existing sign-in sessions. Sign in again with the new password.",
  去设置: "Set up",
  去修改: "Change",
  "修改后，其他设备上的登录状态将失效；请使用新密码重新登录。":
    "After the change, sign-in sessions on other devices will be invalidated. Sign in again with the new password.",
  当前密码: "Current password",
  请输入当前密码: "Enter your current password",
  显示或隐藏当前密码: "Show or hide current password",
  显示或隐藏新密码: "Show or hide new password",
  显示或隐藏确认密码: "Show or hide password confirmation",
  新密码要求: "New password requirements",
  "至少 8 位字符": "At least 8 characters",
  同时包含字母和数字: "Includes both letters and numbers",
  "✓ 两次密码一致": "✓ Passwords match",
  两次输入的密码不一致: "The passwords do not match",
  确认更新: "Confirm update",
  新密码设置成功: "New password set successfully",
  "为保护账号安全，其他设备上的登录状态将失效。请在需要时使用新密码重新登录。":
    "To protect your account, sign-in sessions on other devices will be invalidated. Sign in again with the new password when needed.",
  完成: "Done",
  "请输入当前密码以验证身份。":
    "Enter your current password to verify your identity.",
  "如账号不存在、已停用，或无法使用绑定邮箱，请联系系统管理员完成身份核验后处理账号恢复或联系方式更新。":
    "If the account does not exist, is disabled, or the linked email is inaccessible, contact a system administrator for identity verification and account recovery or contact-detail updates.",
  "教师和管理员：管理员核实账号状态，并协助更新有效邮箱或恢复账号。":
    "Teachers and administrators: an administrator verifies the account status and can help update a valid email or restore the account.",
  "学生：请使用学生端验证码登录；手机号和邮箱均失效时，由管理员核验身份后绑定新的联系方式。":
    "Students: use the student verification-code sign-in. If both phone and email are unavailable, an administrator will verify identity before linking new contact details.",
  "请勿仅凭姓名或学号请求登录；身份核验需通过学校规定的安全渠道完成。":
    "Do not request sign-in access using only a name or student number; identity checks must use the university's approved secure channels.",
  "密码已重置。请使用新密码重新登录；为保护账号安全，所有旧登录状态均已失效。":
    "Your password has been reset. Sign in again with the new password; all previous sessions have been invalidated to protect your account.",
  使用新密码登录: "Sign in with the new password",
  进入演示模式: "Enter demo mode",
  演示模式选项: "Demo mode options",
  教师端演示: "Teacher demo",
  管理员端演示: "Administrator demo",
  系统将根据账号权限自动进入对应工作台:
    "You will be directed to the appropriate workspace based on your account permissions.",
  教师端: "Teacher portal",
  管理员工作台: "Administrator workspace",
  师: "T",
  "隐私政策 · 使用帮助": "Privacy · Help",
  "请输入账号与密码后继续。": "Enter your account and password to continue.",
  "请输入学校邮箱与密码后继续。": "Enter both the school email and password.",
  "该账号不是教师或管理员，无法登录本平台。":
    "This account is not a teacher or administrator and cannot sign in to this platform.",
  "账号资料与登录角色不一致，请联系管理员。":
    "The account profile does not match the signed-in role. Contact an administrator.",
  演示数据: "Demo data",
  "Mock 审核通过": "Approved in mock",
  "Mock 记录已标记为有效，汇总已在本地更新。":
    "The mock record is now valid and local totals were updated.",
  "Mock 记录已追加有效结论；原无效情景可通过复位数据恢复。":
    "A valid mock decision was appended. Reset data to restore the invalid scenario.",
  "Mock 记录已标记为无效，汇总已在本地更新。":
    "The mock record is now invalid and local totals were updated.",
  "Mock 当前学期": "Current mock semester",
  "Mock 打卡时间窗与学时目标已保存到本地。":
    "The mock check-in window and hour targets were saved locally.",
  "2025-2026 第二学期": "2025-2026 Semester 2",
  "该功能后端暂未开放。": "This feature is not yet enabled on the backend.",
  "找不到该教学班，请刷新后重试。":
    "This class section could not be found. Refresh and try again.",
  "该教学班不是后端真实数据（演示模式），无法保存到服务器。":
    "This class section is demo data rather than a backend record, so it cannot be saved to the server.",
  "打卡时间窗已保存到后端，学生端立即生效；学时目标暂存本地，等成绩规则接口开放后再同步。":
    "The check-in window was saved to the backend and applies to students immediately. Hour targets stay on this device until the score-rule API opens.",
  "提交的内容格式不正确，请检查后重试。":
    "Some submitted fields are invalid. Check and try again.",
  "账号或密码不正确。": "Incorrect account or password.",
  "登录状态已失效，请重新登录。": "Your session has expired. Sign in again.",
  "没有权限执行该操作。": "You do not have permission for this action.",
  "资源不存在或已被移除。": "The resource does not exist or was removed.",
  "数据已在别处更新，请刷新后重试。":
    "The data changed elsewhere. Refresh and try again.",
  "操作过于频繁，请稍后再试。": "Too many attempts. Try again later.",
  "请联系管理员完成身份核验与账号恢复。":
    "Contact an administrator to verify your identity and restore your account.",
  "密码修改尚未接入 Backend；此页面不会伪造修改成功。":
    "Password changes are not yet connected to the Backend; this page will not report a false success.",
  "无法读取 Backend 真实数据": "Unable to load live Backend data",
  重试: "Retry",
  课程管理: "Course Management",
  学生管理: "Student Management",
  性别: "Gender",
  年级: "Grade",
  加入时间: "Joined at",
  加入方式: "Join method",
  "2023级": "2023 cohort",
  "2024级": "2024 cohort",
  已移出课程: "Removed from course",
  已退出课程: "Exited course",
  成员关系已停用: "Membership disabled",
  扫码加入: "Joined by QR code",
  手动导入: "Manual import",
  今日直接加入: "Direct joins today",
  今日新增学生: "New students today",
  非在课成员: "Inactive members",
  加入信息: "Join details",
  成员状态: "Membership status",
  移出课程原因: "Reason for removal",
  打卡审核: "Check-in Review",
  成绩管理: "Grade Management",
  免测与认证: "Exemptions & Verification",
  免测与组织认证: "Exemptions & Organization Verification",
  教学业务: "TEACHING OPERATIONS",
  "管理本人授课班级、课程目标与邀请码。":
    "Manage your classes, credit targets, and invitation codes.",
  "管理本人授课班级、课程目标、打卡时间窗与邀请码。":
    "Manage your classes, credit targets, check-in windows, and invitation codes.",
  "管理课程学生、跟进学时进度与课程状态。":
    "Manage course rosters, follow up on credit progress, and track enrollment status.",
  "查看直接加入的课程成员、加入信息、学时进度与当前状态。":
    "View directly enrolled course members, join details, credit progress, and current status.",
  "按学生查看打卡完成情况、系统辅助置信度与全部运动凭证。":
    "Review check-in completion, system confidence, and all activity evidence by student.",
  "集中处理学生打卡记录与异常内容。":
    "Review pending student check-ins and records that need attention.",
  "录入耐力跑成绩并统一发布给学生。":
    "Record endurance-run grades and publish them to students.",
  "审核医学免测及校队、社团认证，并配置相应分数或学时抵扣。":
    "Review medical exemptions and team or club verification, then set grades or credit offsets.",
  "审核免测申请及组织认证材料。":
    "Review exemption requests and organization verification materials.",
  教师空间: "Teacher Workspace",
  北师香港浸会大学: "Beijing Normal-Hong Kong Baptist University",
  "BNBU · 体育课程管理平台": "BNBU · Physical Education Management Portal",
  "BNBU 体育课程管理平台": "BNBU Physical Education Management Portal",
  "BNBU 体育": "BNBU SPORTS",
  "BNBU 校园体育": "BNBU CAMPUS SPORTS",
  体育: "SPORTS",
  "BNBU 校徽": "BNBU emblem",
  "© 2026 北师香港浸会大学":
    "© 2026 Beijing Normal-Hong Kong Baptist University",
  当前学期: "Current term",
  "2025–2026 · 第二学期": "2025–2026 · Semester 2",
  "2025–2026 第二学期": "2025–2026 Semester 2",
  "2025–2026 第一学期": "2025–2026 Semester 1",
  通知: "Notifications",
  "目前没有新的系统通知。": "There are no new system notifications.",
  "＋ 新建教学班": "+ Create class",
  "＋ 新建课程": "+ Create course",
  学时完成率: "Credit completion",
  学生达标情况: "Student qualification",
  达标率: "Qualification rate",
  当前运动任务: "Current activity task",
  暂无进行中的任务: "No active task",
  邀请码: "Invitation code",
  "管理课程 →": "Manage class →",
  待审核: "Pending",
  已处理: "Processed",
  教学班: "Class",
  课程管理核心统计: "Course management summary",
  全部教学班: "All classes",
  学生: "Student",
  提交时间: "Submitted",
  "状态 / 操作": "Status / action",
  教学班学生名单: "Class roster",
  学生管理核心统计: "Student management summary",
  学生列表状态筛选: "Student status filters",
  学生总数: "Total students",
  未达标人数: "Below target",
  全部: "All",
  待跟进: "Needs follow-up",
  已达标: "Target met",
  在班学生: "Enrolled students",
  "＋ 补录学时": "+ Add credits",
  课程运动: "Course activity",
  其他运动: "Other activity",
  操作: "Actions",
  目标: "Target",
  已减免: "Exempted",
  补录: "Add credits",
  补录学时: "Add credits",
  减免时长: "Adjust required credits",
  历史只读: "Read-only history",
  按学生集中审核打卡记录: "Review check-ins by student",
  打卡审核核心统计: "Check-in review summary",
  待审核记录状态筛选: "Pending record filters",
  打卡记录视图筛选: "Check-in record view filters",
  待审核记录: "Pending records",
  "待审核记录（历史遗留）": "Pending records (legacy)",
  已标记无效: "Marked invalid",
  涉及学生: "Students involved",
  需要关注记录: "Records needing attention",
  全部待审核记录: "All pending records",
  低置信度记录: "Low-confidence records",
  全部记录: "All records",
  历史: "history",
  记录: "records",
  历史记录: "Record history",
  条已提交记录: "submitted records",
  当前筛选没有待审核记录: "No pending records match this filter",
  当前筛选没有无效记录: "No invalid records match this filter",
  "切换状态筛选查看其他打卡记录。":
    "Choose another status filter to view other check-in records.",
  暂无打卡记录: "No check-in records",
  "学生提交后的记录会保留在此处。":
    "Submitted student records remain available here.",
  "切换到全部记录可回看已处理内容。":
    "Switch to all records to review processed content.",
  "先查看全体学生的学时与系统辅助置信度，再进入个人详情，以列表或相册方式浏览全部打卡凭证。":
    "Start with all students’ credits and system confidence, then open a student record to view all evidence as a list or album.",
  查看学生打卡: "View student check-ins",
  学生打卡名单: "Student check-in list",
  "展示当前教师全部在班学生的打卡完成情况。":
    "Shows check-in progress for all students currently enrolled in your classes.",
  名学生: "students",
  全部打卡记录: "All check-in records",
  共: "Total",
  "条记录；点击任一运动凭证可查看完整打卡数据并进行审核调整。":
    " records. Select any activity evidence to view full check-in details and adjust the review.",
  打卡记录展示方式: "Check-in display",
  列表: "List",
  相册: "Album",
  课程相关: "Course-related",
  系统抵扣: "System offset",
  低风险: "Low risk",
  需关注: "Needs attention",
  凭证模糊: "Unclear evidence",
  有效: "Valid",
  已调整: "Adjusted",
  教师补录: "Teacher entry",
  补录记录: "Manual entry",
  年: "year",
  月: "month",
  日: "day",
  成绩录入: "Grade entry",
  "按教学班录入耐力跑成绩，系统自动换算分数；发布后学生可见。":
    "Enter endurance-run grades by class. The system calculates scores automatically; published grades are visible to students.",
  发布成绩: "Publish grades",
  耐力跑: "Endurance run",
  未录入: "Not recorded",
  录入用时: "Enter time",
  标记缺考: "Mark absent",
  免测: "Exempt",
  已发布: "Published",
  待发布: "Awaiting publication",
  免测与组织认证核心统计: "Exemptions and verification summary",
  认证申请状态筛选: "Application status filters",
  全部申请: "All applications",
  "耐力跑免测设置自定义分数；校队/社团认证分配最多 20 小时抵扣。":
    "Set a custom score for endurance-run exemptions; team and club verification can offset up to 20 credits.",
  待补材料: "More material needed",
  已通过: "Approved",
  已驳回: "Rejected",
  耐力跑免测: "Endurance-run exemption",
  校队认证: "Varsity team verification",
  社团认证: "Club verification",
  审核: "Review",
  撤销抵扣: "Revoke offset",
  教师端业务操作: "TEACHER WORKSPACE",
  关闭: "Close",
  取消: "Cancel",
  保存: "Save",
  确认: "Confirm",
  确认操作: "Confirm action",
  确认审核: "Confirm review",
  确认发布: "Confirm publication",
  确认审核结果: "Confirm review result",
  新建教学班: "Create class",
  "教师只能在当前学期创建课程，创建后自动成为授课教师。":
    "Teachers can create classes only in the current term and become the instructor automatically.",
  创建教学班: "Create class",
  未知课程: "Unknown course",
  "课程名称为必填项。": "Course name is required.",
  "真实后端尚未实现教师仅按课程名称创建课程的接口；本次未发送旧格式请求。":
    "The real backend does not yet support teacher-created courses by name only; no legacy request was sent.",
  新建课程: "Create course",
  "教师可以在当前学期自定义课程名称，创建后自动成为责任教师。":
    "Teachers can name a course in the current term and automatically become its responsible instructor.",
  创建课程: "Create course",
  "找不到该课程，请刷新后重试。":
    "This course could not be found. Refresh the page and try again.",
  "该课程不是后端真实数据（演示模式），无法保存到服务器。":
    "This course is local preview data and cannot be saved to the server.",
  "切换课程状态后可查看其他课程。":
    "Switch the course status to view other courses.",
  课程学生名单: "Course roster",
  "由本课程责任教师设置；学生仅能在本课程规定的时间窗内提交打卡。":
    "Set by the responsible instructor; students can check in only during this course's configured time window.",
  "只发布当前课程中已由服务端生成且尚未发布的成绩投影；缺失投影的学生不会被伪造为已发布。":
    "Publish only server-generated, unpublished grade projections for this course; students without a projection are never shown as published.",
  学期: "Term",
  授课教师: "Instructor",
  课程代码: "Course code",
  教学班号: "Section",
  课程名称: "Course name",
  "如 PE101": "e.g. PE101",
  "如 04班": "e.g. Section 04",
  "如 大学体育（一）": "e.g. University Physical Education I",
  课程设置: "Class settings",
  保存学时目标: "Save credit targets",
  课程目标设置: "Course target settings",
  当前课程: "Current class",
  "大学体育（一）": "University Physical Education I",
  跑步: "Running",
  羽毛球: "Badminton",
  篮球: "Basketball",
  足球: "Football",
  乒乓球: "Table tennis",
  游泳: "Swimming",
  健身: "Fitness",
  骑行: "Cycling",
  "调整当前课程目标。": "Adjust the activity targets for this class.",
  "保存后仅影响本课程，不影响其他课程。":
    "Saving affects only this class and does not change other classes.",
  课程概览: "Course overview",
  "快速确认当前课程状态与已保存目标。":
    "Review the class status and saved targets at a glance.",
  课程目标概览: "Class target overview",
  当前目标: "Current target",
  目标配置: "Target configuration",
  "修改学生在本课程中需要完成的两类最低学时。":
    "Set the minimum credits students must complete in each activity category.",
  课程相关运动最低学时: "Minimum course-related activity credits",
  自主运动最低学时: "Minimum independent activity credits",
  小时: "hours",
  保存设置: "Save settings",
  课程运动最低学时: "Minimum course-activity credits",
  课程相关运动目标: "Course-related activity target",
  自主其他运动最低学时: "Minimum other-activity credits",
  自由运动目标: "Independent activity target",
  运动任务: "Activity tasks",
  "学生每个任务只能提交一次，且仍遵循每日一次/2h 全局规则。":
    "Students can submit each task once and must still follow the one-per-day / 2h global rule.",
  "＋ 新建任务": "+ Create task",
  截止: "Due",
  草稿: "Draft",
  进行中: "Active",
  已关闭: "Closed",
  发布: "Publish",
  暂无运动任务: "No activity tasks",
  "学生端会显示“当前暂无可提交任务，请等待老师发布”。":
    "Students will see “No tasks are available for submission. Please wait for your teacher to publish one.”",
  课程邀请: "Class invitation",
  "邀请码与二维码从生成时起 7 天有效，可提前手动撤销。":
    "The invitation code and QR code are valid for 7 days after creation and can be revoked early.",
  撤销邀请码: "Revoke invitation code",
  生成新邀请码: "Generate new invitation code",
  课程邀请二维码: "Class invitation QR code",
  邀请二维码: "Invitation QR code",
  课程加入邀请码: "Course enrollment invitation",
  复制链接: "Copy link",
  全屏投影: "Present fullscreen",
  下载: "Download",
  打印: "Print",
  "有效期至（北京时间）": "Valid until (Beijing time)",
  "将二维码投影给学生端扫码，或复制邀请码在学生端手动输入。学生确认资料且服务端校验成功后会立即成为课程成员。":
    "Project the QR code for the student app to scan, or copy the invitation code for manual entry. After the student confirms their details and server validation succeeds, they immediately become a course member.",
  "邀请码失效后不能再用于加入课程。生成新邀请码会重新开始 7 天有效期。":
    "An expired invitation cannot be used to join a class. Generating a new invitation starts a fresh 7-day validity period.",
  "请使用学生端扫描二维码；无法扫码时，可在学生端手动输入邀请码。":
    "Use the student app to scan the QR code. If scanning is unavailable, enter the invitation code manually in the student app.",
  "二维码仅用于定位课程并携带短期加入凭证；学生资料校验成功后直接加入，无需教师审批。已加入成员会立即出现在学生名单中。":
    "The QR code only identifies the course and carries a short-lived join credential. Successful student-data validation enrolls the student directly without teacher approval, and the member appears in the roster immediately.",
  "此前展示的二维码已失效。请生成新邀请码后再让学生扫码。":
    "The previously displayed QR code is no longer valid. Generate a new invitation before asking students to scan it.",
  "生成后可投影二维码、下载或打印，也可将邀请码发送给学生。":
    "After generation, project, download, or print the QR code, or send students the invitation code.",
  撤销课程邀请码: "Revoke course invitation",
  "撤销后，当前二维码和邀请码将立即失效，学生无法再凭此码加入课程。此操作不会影响已经建立的课程成员关系。":
    "After revocation, the current QR code and invitation code become invalid immediately. Students cannot join with it, while existing course memberships remain unchanged.",
  确认撤销: "Confirm revocation",
  返回: "Back",
  "有效期：": "Valid until: ",
  复制邀请码: "Copy invitation code",
  原邀请码已撤销: "The previous invitation code was revoked",
  尚未生成邀请码: "No invitation code yet",
  保存任务: "Save task",
  任务标题: "Task title",
  任务说明: "Task description",
  学时类别: "Credit category",
  要求时长: "Required duration",
  截止日期: "Due date",
  保存状态: "Save status",
  "1 小时": "1 hour",
  "2 小时": "2 hours",
  审核结果: "Review decision",
  审核意见: "Review comment",
  请选择: "Select an option",
  通过: "Approve",
  驳回: "Reject",
  要求补正: "Request correction",
  要求补材料: "Request more material",
  "学生可见；请说明处理结果或下一步操作":
    "Visible to the student; explain the decision or next step.",
  移出课程: "Remove from course",
  减免运动时长: "Adjust required credits",
  补录学生学时: "Add student credits",
  "确认后该成员关系变为“已移出课程”；旧打卡和成绩保留为历史只读。":
    "After confirmation, the membership becomes Removed from course; previous check-ins and grades remain read-only history.",
  确认移出课程: "Confirm removal",
  "减免只降低该学生对应类别的完成目标，不修改已有打卡记录。":
    "An adjustment lowers the target for the selected category without changing existing check-ins.",
  "教师补录不占用学生每日一次/2h额度，并立即计入统计。":
    "Teacher entries do not use the student's daily one-submission / 2h allowance and are counted immediately.",
  补录时长: "Added credits",
  运动项目: "Activity",
  "教师凭证（可选）": "Teacher evidence (optional)",
  "如 校园跑、课堂活动": "e.g. campus run, class activity",
  凭证文件名: "Evidence file name",
  减免类别: "Adjusted category",
  补录原因: "Reason for entry",
  减免原因: "Reason for adjustment",
  操作原因: "Reason for action",
  保存调整: "Save adjustment",
  打卡开始时间: "Check-in start",
  打卡结束时间: "Check-in end",
  实际运动时间: "Actual activity time",
  计入学时: "Counted credits",
  运动说明: "Activity description",
  "提交日期：": "Submitted: ",
  未提供公开原因: "No public reason provided",
  "本次审核：": "Current review: ",
  系统辅助: "System assistance",
  置信度: "Confidence",
  位置: "Location",
  "位置信息已过期（超过 90 天）": "Location data expired (over 90 days)",
  "校内运动区域 · 可查看地图位置":
    "On-campus activity area · map location available",
  运动凭证: "Activity evidence",
  "预览 / 下载原件": "Preview / download original",
  无凭证文件: "No evidence files",
  "该记录未附带照片或视频。": "This record has no attached photo or video.",
  "0 小时（作废）": "0 hours (void)",
  学生可见审核意见: "Student-visible review comment",
  耐力跑状态: "Endurance-run status",
  分钟: "Minutes",
  秒: "Seconds",
  自动换算: "Automatic conversion",
  缺考原因: "Reason for absence",
  "我已检查全班成绩，确认发布后学生可见并收到不可关闭的通知":
    "I have checked the entire class. After publication, grades will be visible to students and they will receive a mandatory notification.",
  免测分数: "Exemption score",
  "根据实际情况自定义，不固定为 100 分":
    "Set this according to the circumstances; it is not fixed at 100.",
  课程运动抵扣: "Course-activity offset",
  其他运动抵扣: "Other-activity offset",
  "两类合计不得超过 20 小时；学生端按抵扣后的目标计算剩余学时。":
    "The two offsets combined cannot exceed 20 hours; the student portal calculates remaining credits using the adjusted target.",
  请明确需要补充的材料: "Specify the additional material required",
  请说明审核依据和处理结果: "Explain the basis for the review and its outcome",
  预览: "Preview",
  关闭预览: "Close preview",
  学生上传图片: "Student-uploaded image",
  学生上传文件: "Student-uploaded file",
  证明材料预览: "Evidence preview",
  "证明材料 · 第 1 页": "Evidence · Page 1",
  只读预览: "Read-only preview",
  文件信息: "File information",
  文件名: "File name",
  提交人: "Submitted by",
  学生证明材料: "Student supporting materials",
  "份 · 点击缩略图或文件名预览":
    " files · Select a thumbnail or filename to preview",
  "预览 ↗": "Preview ↗",
  图片: "Image",
  凭证: "Evidence",
  文件: "File",
  未知教学班: "Unknown class",
  未知学生: "Unknown student",
  男: "Male",
  女: "Female",
  "大一/大二": "Year 1 / Year 2",
  "大三/大四": "Year 3 / Year 4",
  "缺考 0分": "Absent · 0 points",
  等待录入: "Awaiting entry",
  学生信息: "Student information",
  学生详情: "Student details",
  关闭学生详情: "Close student details",
  学生资料: "Student profile",
  学号: "Student ID",
  邮箱: "Email",
  班级: "Class",
  专业: "Major",
  当前课程信息: "Current course information",
  课程状态: "Course status",
  基础信息: "Basic information",
  快捷操作: "Quick actions",
  累计运动学时: "Total activity credits",
  打卡次数: "Check-in count",
  成绩状态: "Grade status",
  待审核内容: "Pending reviews",
  无: "None",
  在课: "Enrolled",
  暂无成绩: "No grade",
  设置减免: "Adjust required credits",
  查看打卡记录: "View check-in records",
  编辑成绩: "Edit grade",
  "查看 / 编辑成绩": "View / edit grade",
  开始审核: "Start review",
  查看审核详情: "View review details",
  学生详情加载失败: "Could not load student details",
  "学生详情暂时无法加载。": "Student details are temporarily unavailable.",
  "请稍后重试。": "Try again later.",
  重新加载: "Reload",
  正在加载学生详情: "Loading student details",
  正在加载学生信息: "Loading student information",
  教师: "Teacher",
  每: "per",
  今天: "Today",
  昨天: "Yesterday",
  小时前: " hours ago",

  // Shared controls, tickets, and administration workspace.
  语言: "Language",
  中文: "Chinese",
  英文: "English",
  暂无可选项: "No options available",
  "加载中…": "Loading…",
  搜索选项: "Search options",
  当前选择: "current selection",
  筛选工具栏: "Filter toolbar",
  更多: "More",
  待受理: "Awaiting intake",
  受理中: "In progress",
  待技术团队处理: "Awaiting the technical team",
  处理完成: "Resolved",
  账户与登录: "Accounts & sign-in",
  系统功能: "System features",
  数据与权限: "Data & access",
  其他咨询: "Other inquiries",
  学生端: "Student portal",
  管理端支持请求: "Admin support request",
  工单: "Ticket",
  系统管理员: "System administrator",
  处理状态: "Resolution status",
  回复用户: "Reply to requester",
  "说明处理结果、下一步或预计完成时间":
    "Describe the outcome, next step, or expected completion time",
  "该支持请求将保留在管理端队列，并标记为等待技术团队处理。":
    "This support request will remain in the admin queue and be marked as awaiting the technical team.",
  保存处理结果: "Save resolution",
  "支持请求已移交技术团队处理。":
    "The support request was assigned to the technical team.",
  "工单处理结果已保存并同步给提交人。":
    "The ticket resolution was saved and shared with the requester.",
  "支持请求处理结果已保存并同步给提交人。":
    "The support request resolution was saved and shared with the requester.",
  待处理工单: "Open tickets",
  由管理端统一受理: "Managed centrally by administrators",
  等待技术团队反馈: "Awaiting technical-team feedback",
  今日已完成: "Resolved today",
  处理结果已同步: "Resolution shared",
  支持请求: "Support requests",
  学生问题反馈: "Student issue feedback",
  反馈管理: "Feedback management",
  "查看学生提交的问题类型和问题描述，并跟踪处理状态。":
    "Review the problem category and description submitted by students, and track its handling status.",
  "学生和教师提交的服务请求由管理端统一受理、回复和协调处理。":
    "Service requests from students and teachers are centrally received, answered, and coordinated by administrators.",
  "学生和教师提交的支持请求由管理端统一受理、回复和协调处理。":
    "Support requests from students and teachers are centrally received, answered, and coordinated by administrators.",
  "2 工作小时内首次响应": "First response within 2 business hours",
  "系统功能 / 数据权限": "System features / data access",
  "4 工作小时内首次响应": "First response within 4 business hours",
  "1 工作日内首次响应": "First response within 1 business day",
  工单编号: "Ticket ID",
  类别与主题: "Category & subject",
  来源: "Source",
  "查看并处理 →": "View & handle →",
  "请填写处理说明后再保存。": "Enter a resolution note before saving.",
  状态: "Status",
  全部状态: "All statuses",

  系统概览: "System overview",
  课程目录看板: "Course dashboard",
  教学运行: "Teaching operations",
  "只读查看当前全部课程、学生人数与打卡情况。":
    "View all current courses, student counts, and check-in activity in read-only mode.",
  "只读汇总当前学期全部教学班、成员关系和有效打卡数据。":
    "Read-only summary of all current class sections, memberships, and valid check-in data.",
  "查看服务端当前学期；本地预览完整呈现创建、配置与切换流程。":
    "View the current server semester. The local preview presents the complete creation, configuration, and switching flow.",
  "查看服务端系统模式；本地预览可验证完整的状态切换流程。":
    "View the server system mode. The local preview can verify the complete state-change flow.",
  学期管理: "Term management",
  用户与账号: "Users & accounts",
  分管理员设置: "Sub-administrator settings",
  权限管理: "Permission management",
  "设置分管理员账号、初始密码以及可使用的侧边栏标签权限。":
    "Configure sub-administrator accounts, initial passwords, and accessible sidebar permissions.",
  "设置分管理员账号、初始密码和侧边栏权限；当前预览配置只保存在本浏览器。":
    "Configure sub-administrator accounts, initial passwords, and sidebar permissions. Preview settings are stored in this browser only.",
  全局规则: "Global rules",
  系统模式: "System mode",
  帮助中心: "Help center",
  审计日志: "Audit log",
  系统运行平稳: "System operating normally",
  "当前处于正常模式，优先处理账号恢复与配置提醒。":
    "The system is operating normally. Prioritize account recovery and configuration reminders.",
  "查看 Backend 实时健康状态与当前可用的管理数据。":
    "Review live Backend health and the administration data currently available.",
  全局治理: "Global governance",
  "创建、切换与归档学期。切换当前学期会影响全系统业务范围。":
    "Create, switch, and archive terms. Changing the current term affects the whole system's business scope.",
  "管理教师和学生账号、恢复申请、验证码解锁与数据删除。":
    "Manage teacher and student accounts, recovery requests, verification-code unlocks, and data deletion.",
  服务运营: "Service operations",
  "统一受理学生与教师的服务请求，协调处理并同步处理结果。":
    "Receive student and teacher service requests centrally, coordinate handling, and share outcomes.",
  "维护学时目标、每日限额、打卡时间窗和耐力跑换算表。":
    "Maintain credit targets, daily limits, check-in windows, and endurance-run conversion tables.",
  "维护学时目标、每日限额和耐力跑换算表。":
    "Maintain credit targets, daily limits, and endurance-run conversion tables.",
  劳动节假期: "Labor Day holiday",
  期末考试安排: "Final-exam schedule",
  "请完整填写打卡时间窗的日期和每日时段。":
    "Complete the check-in window dates and daily hours.",
  "打卡结束日期不能早于开始日期。":
    "The check-in end date cannot be earlier than the start date.",
  "每日结束时间必须晚于开始时间。":
    "The daily end time must be later than the start time.",
  "学期截止日期不能晚于打卡结束日期。":
    "The term deadline cannot be later than the check-in end date.",
  "排除日期请按“YYYY-MM-DD, 原因”每行一条填写。":
    "Enter excluded dates one per line as “YYYY-MM-DD, reason”.",
  "排除日期不能重复。": "Excluded dates cannot be duplicated.",
  "排除日期必须位于打卡日期范围内。":
    "Excluded dates must fall within the check-in date range.",
  "课程设置已保存，学生端将按本教学班的目标和打卡时间窗执行。":
    "Class settings were saved. Students will follow this class’s targets and check-in window.",
  "调整当前课程的学时目标和打卡时间窗。":
    "Adjust the current class’s credit targets and check-in window.",
  "保存后仅影响本教学班，不影响其他课程。":
    "Saving affects only this class, not other classes.",
  "由本教学班授课教师设置；学生仅能在本课程规定的时间窗内提交打卡。":
    "Set by this class’s instructor; students can submit check-ins only within this class’s window.",
  打卡状态: "Check-in status",
  允许打卡: "Check-ins allowed",
  暂停全部打卡: "Pause all check-ins",
  学期截止日期: "Term deadline",
  "此日期后不能开始或补交新的打卡记录。":
    "After this date, students cannot start or submit new check-in records.",
  打卡开始日期: "Check-in start date",
  打卡结束日期: "Check-in end date",
  每日开始时间: "Daily start time",
  每日结束时间: "Daily end time",
  排除日期: "Excluded dates",
  "选填；每行一条，格式为 YYYY-MM-DD, 原因。":
    "Optional; one per line in the format YYYY-MM-DD, reason.",
  "2026-05-01, 劳动节假期\n2026-06-19, 期末考试安排":
    "2026-05-01, Labor Day holiday\n2026-06-19, Final-exam schedule",
  系统维护: "System maintenance",
  "在正常、只读和维护模式之间切换；每次变更都写入审计日志。":
    "Switch between normal, read-only, and maintenance modes; every change is recorded in the audit log.",
  内容管理: "Content management",
  "维护面向学生与教师的中英双语帮助内容。":
    "Maintain bilingual help content for students and teachers.",
  "集中处理系统故障及需要技术团队协助的事项；当前为前端规划功能演示。":
    "Centralize system incidents and requests that need help from the technical team; this is currently a frontend planning demo.",
  "维护面向学生的中英双语帮助内容、关键词与发布状态。":
    "Maintain student-facing bilingual help content, keywords, and publishing status.",
  "追踪关键操作。审计记录只读，不可修改或删除。":
    "Track key actions. Audit records are read-only and cannot be changed or deleted.",
  体育部: "Physical Education Department",
  正常: "Normal",
  验证码锁定: "Verification code locked",
  待交接: "Pending handover",
  已停用: "Disabled",
  主题模式: "Theme",
  浅色: "Light",
  深色: "Dark",
  跟随系统: "System",
  系统配色: "System appearance",
  "选择浅色、深色或跟随系统；设置会自动保存在此设备。":
    "Choose light, dark, or system appearance. Your choice is saved on this device.",
  管理空间: "Administrator workspace",
  主要导航: "Primary navigation",
  演示教师: "Demo Teacher",
  演示管理员: "Demo Administrator",
  演示体育部: "Demo Physical Education Department",
  演示管理部门: "Demo Administration",
  打开演示教师的用户信息: "Open the demo teacher profile",
  打开演示管理员的用户信息: "Open the demo administrator profile",
  打开陈若宁的用户信息: "Open Chen Ruoning's profile",
  打开系统管理员的用户信息: "Open the system administrator profile",
  调整导航栏宽度: "Resize navigation bar",
  展开侧边栏: "Expand sidebar",
  折叠侧边栏: "Collapse sidebar",
  导航栏已折叠: "Navigation bar collapsed",
  导航栏宽度: "Navigation bar width",
  "体育部 · T2024007": "Physical Education Department · T2024007",

  全部学期: "All terms",
  当前: "Current",
  待开始: "Upcoming",
  已归档: "Archived",
  "＋ 创建新学期": "+ Create term",
  "2026年2月23日 — 2026年7月31日 · 3 个教学班 · 126 名学生":
    "February 23, 2026 — July 31, 2026 · 3 classes · 126 students",
  学期进度: "Term progress",
  "第 22 周 / 共 23 周": "Week 22 of 23",
  "归档前需要确认成绩发布状态，已生成检查清单。":
    "Confirm grade-publication status before archiving. A checklist has been generated.",
  归档前检查: "Pre-archive check",
  学期记录: "Term records",
  "切换当前学期会自动归档原当前学期。":
    "Switching the current term automatically archives the previous current term.",
  "2026–2027 第一学期": "2026–2027 Semester 1",
  "已进入切换确认流程。": "The change confirmation process has started.",
  设为当前学期: "Set as current term",
  查看历史数据: "View historical data",
  "2024–2025 第二学期": "2024–2025 Semester 2",

  总用户: "Total users",
  "教师 68 · 学生 3,413 · 管理员 1":
    "68 teachers · 3,413 students · 1 administrator",
  账号恢复: "Account recovery",
  等待身份核验: "Awaiting identity verification",
  可手动解除: "Can be unlocked manually",
  "＋ 创建用户": "+ Create user",
  "搜索姓名、学号、工号或邮箱": "Search name, student ID, staff ID, or email",
  角色: "Role",
  全部角色: "All roles",
  锁定: "Locked",
  停用: "Disabled",
  "已准备批量导入模板。": "The bulk-import template is ready.",
  批量导入: "Bulk import",
  用户: "User",
  "学院 / 部门": "College / department",
  最近活动: "Last activity",
  "管理 →": "Manage →",

  正常模式: "Normal mode",
  学生与教师端全部功能可用: "All student and teacher features are available",
  "允许查看，禁止打卡、审核与其他写操作":
    "Viewing is allowed; check-ins, reviews, and other write actions are disabled",
  维护模式: "Maintenance mode",
  "普通用户仅看到维护页，管理员仍可进入":
    "Regular users see only the maintenance page; administrators can still enter",
  当前系统模式: "Current system mode",
  正常运行: "Operating normally",
  "最近变更：2026-07-18 03:12 · 自动恢复":
    "Last change: July 18, 2026, 3:12 AM · automatic recovery",
  切换原因: "Reason for change",
  必填: "Required",
  "说明本次模式切换原因，将写入审计日志":
    "Describe why this mode is being changed; it will be recorded in the audit log",
  "模式变更将立即生效。": "The mode change takes effect immediately.",
  "请填写切换原因。": "Enter a reason for the mode change.",
  确认切换模式: "Confirm mode change",
  影响范围: "Impact",
  变更前请确认: "Confirm before changing",
  维护模式会立即阻止普通用户进入:
    "Maintenance mode immediately blocks regular users",
  "计划内维护应至少提前 48 小时公告":
    "Scheduled maintenance should be announced at least 48 hours in advance",
  恢复后系统自动发送完成通知:
    "The system automatically sends a completion notice after recovery",

  "已发布 18": "Published 18",
  "草稿 3": "Drafts 3",
  "已下线 6": "Offline 6",
  "＋ 新建帮助文章": "+ Create help article",
  搜索标题或关键词: "Search titles or keywords",
  受众: "Audience",
  全部受众: "All audiences",
  "中英双语完整度 94%": "Chinese and English completeness: 94%",
  "如何提交运动打卡？": "How do I submit a sports check-in?",
  "提交体育打卡的操作说明。": "Instructions for submitting a sports check-in.",
  "学生 · 打卡与学时": "Student · Check-ins & credits",
  "为什么我的打卡时长被调整？": "Why was my check-in duration adjusted?",
  "了解打卡时长被调整的原因。": "Learn why a check-in duration was adjusted.",
  "学生 · 审核反馈": "Student · Review feedback",
  "教师 · 课程管理": "Teacher · Class management",
  "校队和社团成员如何申请学时抵扣？":
    "How do team and club members apply for credit offsets?",
  "了解校队和社团成员申请学时抵扣的流程。":
    "Learn how team and club members apply for credit offsets.",
  "学生 · 组织认证": "Student · Organization verification",
  英文待更新: "English update pending",
  "· 更新于 2026-07-24": "· Updated July 24, 2026",
  "编辑 →": "Edit →",

  "操作人、资源 ID 或请求 ID": "Operator, resource ID, or request ID",
  操作类型: "Action type",
  全部操作类型: "All action types",
  用户管理: "User management",
  配置变更: "Configuration change",
  成绩发布: "Grade publication",
  日期范围: "Date range",
  导出: "Export",
  时间: "Time",
  操作人: "Operator",
  资源: "Resource",
  结果: "Result",
  详情: "Details",
  成功: "Succeeded",
  "展开 →": "Expand →",
  "共 1,284 条记录 · 第 1 / 65 页": "1,284 records · Page 1 of 65",
  上一页: "Previous",
  下一页: "Next",

  全部服务可用: "All services available",
  活跃用户: "Active users",
  "过去 7 天": "Past 7 days",
  今日打卡: "Today's check-ins",
  "成功率 99.7%": "99.7% success rate",
  待处理事项: "Open items",
  "账号恢复 5 · 锁定 2": "5 account recoveries · 2 locked accounts",
  需要处理: "Needs attention",
  系统待办: "System tasks",
  "7 项": "7 items",
  账号恢复申请: "Account recovery requests",
  "5 条等待身份核验": "5 awaiting identity verification",
  处理申请: "Handle requests",
  "2 个学生账号被锁定": "2 student accounts are locked",
  前往解锁: "Go to unlock",
  帮助文章翻译: "Help article translations",
  "1 篇英文内容待更新": "1 English article needs an update",
  更新内容: "Update content",
  系统健康: "System health",
  核心服务: "Core services",
  "健康检查已刷新。": "Health check refreshed.",
  刷新: "Refresh",
  "API 服务": "API service",
  数据库: "Database",
  "12 / 20 连接": "12 / 20 connections",
  通知队列: "Notification queue",
  "0 条积压": "0 queued",
  对象存储: "Object storage",
  当前配置: "Current configuration",
  全局规则快照: "Global rules snapshot",
  "管理规则 →": "Manage rules →",
  总学时目标: "Total credit target",
  "20 小时": "20 hours",
  每日上限: "Daily limit",
  "2 小时 · 1 次": "2 hours · 1 check-in",
  打卡时段: "Check-in hours",
  当前学期截止: "Current term ends",

  "课程将自动关联当前教师与当前学期。":
    "The class will be linked automatically to the current teacher and term.",
  "邀请码 PE01–7K2Q · 7 天内有效":
    "Invitation code PE01–7K2Q · valid for 7 days",
  发布运动任务: "Publish activity task",
  "任务时长仅可设置为 1 小时或 2 小时。":
    "Task duration can only be set to 1 or 2 hours.",
  发布任务: "Publish task",
  "补录不占用学生每日一次、每日两小时额度。":
    "Manual entries do not use a student's daily one-entry, two-hour allowance.",
  确认补录: "Confirm manual entry",
  调整有效时长: "Adjust valid duration",
  "调整后将立即更新统计，并强制通知学生。":
    "The adjustment updates statistics immediately and sends a mandatory student notification.",
  通过耐力跑免测: "Approve endurance-run exemption",
  "请根据材料与课程要求设置免测分数。":
    "Set the exemption score based on the evidence and class requirements.",
  确认通过: "Confirm approval",
  配置组织认证抵扣: "Configure organization-verification offset",
  "抵扣总时长上限 20 小时，可分配至两类学时。":
    "Total offset is limited to 20 hours and can be split between the two credit categories.",
  确认抵扣: "Confirm offset",
  创建新学期: "Create new term",
  "创建后默认为待开始状态。": "New terms are upcoming by default.",
  创建学期: "Create term",
  创建用户: "Create user",
  "教师与管理员账号使用密码登录；学生账号沿用验证码流程。":
    "Teacher and administrator accounts use passwords; student accounts continue to use verification codes.",
  新建帮助文章: "Create help article",
  "请同时维护中文与英文内容。": "Maintain both Chinese and English content.",
  保存草稿: "Save draft",
  全局系统管理账号: "Global system administrator account",
  退出登录: "Sign out",
  "有效期至 2026-08-05 18:00": "Valid until August 5, 2026, 6:00 PM",
  当前身份: "Current role",
  抵扣时长: "Offset duration",
  "名称 / 标题": "Name / title",
  "0、1 或 2 小时": "0, 1, or 2 hours",
  "不超过 20 小时": "No more than 20 hours",
  请输入: "Enter a value",
  "补充信息 / 操作原因": "Additional information / reason for action",
  请输入必要说明: "Enter the required details",
  "身份权限由学校账号管理，当前会话无法自行切换角色。":
    "Account permissions are managed by the university. This session cannot change roles.",
  "教师与管理员统一入口，按身份进入清晰、专注的职责工作台。":
    "A unified entrance for teachers and administrators, with a focused workspace for each role.",
  "统一入口 · 职责清晰 · 高效协同":
    "One portal · Clear roles · Efficient collaboration",
  "体育部 · 教师账号": "Physical Education Department · Teacher account",
  有效时长: "Valid duration",
  有效学时汇总: "Valid credit summary",
  状态异常: "Invalid state",
  "搜索姓名、学号或邮箱": "Search name, student ID, or email",
  人: "students",
  "· 无效": "· Invalid",
  "· 待审核": "· Pending",

  // Teacher workspace: review states, validation, filters, and dialogs.
  已撤销: "Revoked",
  运动时长不符合要求: "Activity duration does not meet the requirement",
  图片或视频无法证明运动过程: "The image or video does not verify the activity",
  媒体内容与运动无关: "The media is unrelated to the activity",
  重复提交: "Duplicate submission",
  疑似代打卡: "Suspected proxy check-in",
  运动记录异常: "Abnormal activity record",
  其他: "Other",
  无效: "Invalid",
  审核状态: "Review status",
  无效原因: "Reason for invalidation",
  "该记录已被判定为无效。": "This record has been marked invalid.",
  "该记录已判定无效，本页暂不支持改回有效。":
    "This record is invalid. Changing it back to valid is not supported on this page.",
  "改回有效时需要填写纠正说明；原无效审核会保留在历史中。":
    "Provide a correction note when changing the record back to valid; the prior invalid review remains in history.",
  "请填写纠正说明；原无效审核记录不会被覆盖。":
    "Enter a correction note; the previous invalid review record will not be overwritten.",
  "本地操作上下文已失效，本次没有发送写请求。请关闭后从最新记录重新操作。requestId：未生成。":
    "The local operation context expired, so no write request was sent. Close this view and retry from the latest record. requestId: not generated.",
  "已追加有效结论；原无效审核仍保留在历史中。":
    "A valid decision was appended; the prior invalid review remains in history.",
  "客户端在写入前发现服务端最新审核状态与本操作不一致，已停止追加并刷新真实状态。requestId：未生成（本地一致性检查停止写入）。":
    "The latest server review state no longer matched this operation, so the client stopped before writing and refreshed the authoritative state. requestId: not generated because the local consistency check stopped the write.",
  "系统会直接追加一条有效结论；原无效审核会完整保留。":
    "The system will append a valid decision directly; the prior invalid review remains intact.",
  确认纠正为有效: "Confirm correction to valid",
  纠正说明: "Correction note",
  "此说明会写入新的有效审核记录，不会覆盖原无效原因。":
    "This note will be written to a new valid review and will not overwrite the prior invalid reason.",
  请说明为什么需要把该记录重新判定为有效:
    "Explain why this record should be classified as valid again",
  打卡审核汇总: "Check-in review summary",
  审核已完成: "Review complete",
  审核中: "Review in progress",
  有效打卡时长进度: "Valid check-in credit progress",
  已达到教师设置的学时目标:
    "The teacher-configured credit target has been reached",
  条: "records",
  完成审核: "Complete review",
  待录入: "Awaiting entry",
  缺考: "Absent",
  已录入: "Entered",
  待补正: "Correction required",
  "请选择一项无效原因。": "Select a reason for invalidation.",
  "选择“其他”时，请填写备注。": "Enter a note when selecting “Other.”",
  "暂无打卡记录需要审核。": "There are no check-in records to review.",
  "审核已完成（结果仅保存在当前页面）。":
    "Review complete (the result is saved only on this page).",
  "；已自动发送不可静默的学生通知。":
    "; a mandatory student notification was sent automatically.",
  "；学生通知已自动生成。":
    "; a student notification was generated automatically.",
  "课程代码、教学班号和课程名称均为必填项。":
    "Course code, section, and class name are required.",
  "当前学期已存在相同课程代码和教学班号。":
    "This term already has the same course code and section.",
  "两类学时目标必须为不小于 0 的数字。":
    "Both credit targets must be numbers greater than or equal to 0.",
  "两类学时目标必须合计 20 小时，且精确到秒。":
    "The two credit targets must total 20 hours and be precise to the second.",
  教师更新课程学时目标: "Teacher updated the class credit targets",
  "课程级学时目标已保存，学生端将按新目标计算进度。":
    "Class-level credit targets were saved. The student portal will calculate progress against the new targets.",
  "生成后 7 天": "7 days after generation",
  "已生成唯一邀请码与二维码，有效期为 7 天。":
    "A unique invitation code and QR code were generated and are valid for 7 days.",
  "已生成新的课程邀请，二维码将在几秒内可扫码。有效期为 7 天。":
    "A new course invitation was generated. The QR code will be scannable in a few seconds and is valid for 7 days.",
  "邀请码已撤销，学生将不能再凭此码加入课程。":
    "The invitation code was revoked. Students can no longer join the course with it.",
  "未能自动复制邀请码，请手动选择后复制。":
    "The invitation code could not be copied automatically. Select and copy it manually.",
  "课程邀请链接已复制。": "The course invitation link was copied.",
  "未能自动复制链接，请使用二维码或手动复制邀请码。":
    "The link could not be copied automatically. Use the QR code or copy the invitation code manually.",
  "二维码正在生成，请稍候再下载。":
    "The QR code is being generated. Please wait before downloading it.",
  "二维码已下载，可投影或发送给学生。":
    "The QR code was downloaded and can be projected or sent to students.",
  "当前浏览器不支持全屏展示，请使用下载或打印功能。":
    "This browser does not support fullscreen presentation. Use the download or print option instead.",
  "无法进入全屏展示，请检查浏览器权限。":
    "Fullscreen presentation could not start. Check your browser permissions.",
  "移出课程原因必填，学生将收到课程成员关系变更通知。":
    "A reason for removal is required. The student will receive a course-membership change notification.",
  "减免类别、减免时长和减免原因均为必填项，时长须大于 0。":
    "Adjustment category, duration, and reason are required, and the duration must be greater than 0.",
  "学时类型、1/2 小时时长、运动项目和补录原因均为必填项。":
    "Credit type, 1- or 2-hour duration, activity, and entry reason are required.",
  "有效学时只能为 0、1 或 2 小时，且学生可见的审查意见必填。":
    "Valid credits can only be 0, 1, or 2 hours, and a student-visible review comment is required.",
  "可计入时长已调整，当前页面统计将以审核状态重新计算。":
    "Counted duration was adjusted. Statistics on this page will be recalculated from the review status.",
  "请填写有效的耐力跑分钟和秒数。":
    "Enter valid endurance-run minutes and seconds.",
  "标记缺考时必须填写缺考原因。":
    "A reason is required when marking a student absent.",
  "已发布成绩已修改，审计来源已记录":
    "Published grade updated; audit source recorded",
  学生成绩已保存: "Student grade saved",
  "请确认全班学生将看到成绩后再发布。":
    "Confirm that all students will see the grades before publishing.",
  全班成绩已发布: "Class grades published",
  "审核结果和学生可见的审核意见均为必填项。":
    "A review decision and student-visible review comment are required.",
  "通过耐力跑免测时必须设置 0–100 的自定义分数。":
    "A custom score from 0 to 100 is required when approving an endurance-run exemption.",
  "课程运动与其他运动抵扣之和必须大于 0，且不得超过 20 小时。":
    "Course-activity and other-activity offsets must total more than 0 and no more than 20 hours.",
  "申请已审核通过并同步成绩/抵扣结果":
    "Application approved and grade/offset result synchronized",
  "申请已驳回，学生可补充材料后重新提交":
    "Application rejected. The student can resubmit after adding materials.",
  已要求学生补充材料: "Student asked to provide more material",
  "组织成员资格变更，教师手动撤销抵扣。":
    "Organization membership changed; the teacher manually revoked the offset.",
  "组织认证抵扣已手动撤销，学生需通过正常打卡补足差额":
    "Organization-verification offset was manually revoked. The student must make up the difference through regular check-ins.",

  更多课程操作: "More class actions",
  查看邀请码: "View invitation code",
  课程目标: "Class targets",
  完成进度: "Completion progress",
  已完成: "Completed",
  暂无待审核记录: "No pending records",
  进入课程: "Open class",
  没有符合条件的课程: "No classes match the criteria",
  "切换课程状态后可查看其他教学班。":
    "Choose another class status to view other classes.",
  课程: "Class",
  排序: "Sort",

  全部课程: "All classes",
  优先处理: "Priority first",
  完成率从高到低: "Completion rate: high to low",
  姓名: "Name",
  显示: "Showing",
  人学时尚未达标: "students are below the credit target",
  总学时进度: "Total credit progress",
  学时不足: "Below credit target",
  未找到符合条件的学生: "No students match the criteria",
  "调整搜索或筛选条件后重试。": "Adjust the search or filters and try again.",

  "辅助置信度仅用于排序与提示，最终审核结果仍由教师确认。":
    "Assistance confidence is used only for sorting and guidance; the teacher confirms the final review result.",
  "新提交默认有效；辅助置信度仅用于发现异常，教师可将问题记录标记为无效。":
    "New submissions are valid by default. Assistance confidence only helps identify anomalies, and teachers can mark problematic records invalid.",
  打卡审核列表: "Check-in review list",
  条待审核记录: "pending records",
  涉及: "Involving",
  剩余学时: "Remaining credits",
  辅助置信度: "Assistance confidence",
  "根据定位、时长与凭证完整度生成，仅作为教师审核辅助。":
    "Generated from location, duration, and evidence completeness; it only assists teacher review.",
  条待处理: "pending items",
  暂无待办: "No pending items",
  尚待完成: "Still to complete",
  暂无记录: "No records yet",
  系统辅助置信度: "System assistance confidence",
  基于: "Based on",
  条记录: "records",
  查看记录: "View records",
  "← 返回学生名单": "← Back to student list",
  返回学生名单: "Back to student list",
  打卡记录: "Check-in records",
  已处理进度: "Processed progress",
  的全部打卡记录: "'s check-in records",
  "条记录；审核结果仅保存在当前页面，刷新后恢复默认状态。":
    " records; review results are saved only on this page and reset after refresh.",
  "条记录；审核结果已保存到后端，页面切换或刷新后会重新读取最新状态。":
    " records; review results are saved by the backend and reloaded after navigation or refresh.",
  审核状态筛选: "Review status filters",
  该学生尚无打卡记录: "This student has no check-in records yet",
  "学生提交的运动凭证会按日期出现在此处。":
    "Activity evidence submitted by the student will appear here by date.",
  当前筛选暂无记录: "No records match the current filter",
  "切换审核状态筛选可查看其他打卡记录。":
    "Choose another review status to view other check-in records.",
  打卡时间: "Check-in time",
  运动日期: "Activity date",
  运动信息: "Activity information",
  审核操作: "Review action",
  开始: "Start",
  结束: "End",
  图: "Image",
  无凭证: "No evidence",
  "实际运动：": "Actual activity: ",
  实际运动: "Actual activity",
  "可计入时长：": "Counted credits: ",
  "查看详情 →": "View details →",
  "查看完整记录 →": "View full record →",

  学生姓名: "Student name",
  异常: "Exception",
  成绩已发布: "Grades published",
  "导出 CSV": "Export CSV",
  成绩册: "Gradebook",
  耐力跑成绩: "Endurance-run grade",
  录入成绩: "Enter grade",
  编辑: "Edit",
  "查看 / 编辑": "View / edit",
  当前状态没有成绩记录: "No grade records for the current status",
  "切换成绩状态查看其他学生。":
    "Choose another grade status to view other students.",

  认证申请筛选工具栏: "Verification request filters",
  "搜索学生、学号或申请说明":
    "Search students, student IDs, or request descriptions",
  搜索认证申请: "Search verification requests",
  申请类型: "Request type",
  全部类型: "All types",
  免测与组织认证申请列表: "Exemption and organization-verification requests",
  条申请: "requests",
  申请说明: "Request description",
  材料: "Materials",
  该学生: "this student",
  份: "files",
  查看详情: "View details",
  重新处理: "Review again",
  当前分类没有申请: "No requests in this category",
  "新的申请或学生补充材料后会自动出现在对应列表。":
    "New requests and student-supplied materials will appear in the appropriate list automatically.",

  "审核意见会展示给学生。通过前将校验学生账号状态和“一学期一课”约束。":
    "The review comment is visible to the student. Approval checks account status and the one-class-per-term rule.",
  "该生本学期已有 ACTIVE 体育课，不能直接通过第二门课。":
    "This student already has an ACTIVE physical education class this term, so the second class cannot be approved directly.",
  "减免后，学生端将按新的目标计算剩余学时；原有打卡记录和已获得学时保持不变。":
    "After the adjustment, the student portal calculates remaining credits from the new target; existing check-ins and earned credits remain unchanged.",
  前端审核原型: "Front-end review prototype",
  "请选择最符合本条记录的原因。取消不会改变当前审核状态。":
    "Select the reason that best fits this record. Canceling does not change the current review status.",
  确认标记无效: "Confirm invalid",
  其他原因备注: "Other reason note",
  备注仅保存在当前页面状态中:
    "This note is saved only in the current page state",
  请简要说明无效原因: "Briefly explain why this record is invalid",
  完成前确认: "Pre-completion confirmation",
  "确认后仅在当前前端页面标记为“审核已完成”，不会发送接口请求。":
    "Confirming marks the review complete only on this front-end page and does not send an API request.",
  返回检查: "Back to review",
  确认完成审核: "Confirm review completion",
  有效记录: "Valid records",
  无效记录: "Invalid records",
  目标完成: "Target completion",
  已达到教师设置目标: "Teacher-configured target reached",
  可计入时长: "Counted duration",
  "· 置信度": "· confidence ",
  预览原件: "Preview original",
  保存成绩: "Save grade",
  "该成绩已发布；保存修改后会立即更新学生端、发送强制通知并记录审计来源。":
    "This grade is published. Saving changes updates the student portal immediately, sends a mandatory notification, and records the audit source.",
  "审核意见会展示给学生；社团负责人不参与系统审核。":
    "The review comment is visible to the student; club leaders do not participate in system review.",
  耐力跑换算表: "Endurance-run conversion table",
  打卡时间窗: "Check-in time window",
  "维护四套耐力跑成绩换算规则。学时目标仅由任课教师在教学班内配置。":
    "Maintain four endurance-run conversion rule sets. Credit targets are configured only by the instructor for each class.",
  打卡凭证审核工具: "Check-in evidence review tool",
  份材料: "evidence items",
  下载原件: "Download original",
  选择要审核的凭证: "Select evidence to review",
  视频: "Video",
  暂停视频: "Pause video",
  播放视频: "Play video",
  播放或暂停视频: "Play or pause video",
  视频播放进度: "Video playback progress",
  图片缩放控制: "Image zoom controls",
  缩小图片: "Zoom out",
  恢复原始缩放: "Reset zoom",
  放大图片: "Zoom in",
  "视频可播放并核对时长、场景与运动过程。":
    "Play the video to verify duration, scene, and activity process.",
  "可缩放图片，核对时间、场景及运动凭证细节。":
    "Zoom the image to verify the time, scene, and evidence details.",
  定位数据已过期: "Location data expired",
  "超过 90 天的原始定位已按规则清除，当前不可查看地图。":
    "Original location data older than 90 days has been removed and the map is unavailable.",
  已脱敏的校园运动区域地图: "Masked campus activity-area map",
  "校园运动区域（已脱敏）": "Campus activity area (masked)",
  "仅显示约 300m 范围和运动路径概览，不展示精确坐标。":
    "Only an approximately 300m area and route overview are shown; exact coordinates are hidden.",
  "已标记为无效，汇总有效时长已更新。":
    "Marked invalid. The valid-credit total has been updated.",
  "已标记为有效，汇总有效时长已更新。":
    "Marked valid. The valid-credit total has been updated.",
  "定位数据已过期，地图不可查看": "Location data expired; map unavailable",
  已提供脱敏地图与运动区域概览:
    "A masked map and activity-area overview are available",
  分: "points",
  "发布后，全班学生将在成绩页查看耐力跑分数/状态和打卡学时完成情况。":
    "After publication, all students in the class can view endurance-run scores/status and check-in credit completion.",
  "发布将立即同步学生端并发送不可关闭的成绩通知；之后如修改耐力跑成绩，学生端会同步更新。":
    "Publication immediately syncs to students and sends a mandatory grade notification. Later endurance-run grade changes also sync to students.",
  名单对齐: "Roster Reconciliation",
  已正确加入: "Matched",
  未加入课程: "Not joined",
  加错课程: "Wrong course",
  非官方名单成员: "Not in official roster",
  信息不一致: "Information mismatch",
  疑似匹配: "Possible match",
  重复记录: "Duplicate",
  待人工确认: "Pending confirmation",
  待确认: "Pending",
  已确认: "Confirmed",
  行政班: "Administrative class",
  教学班编号: "Teaching class code",
  "文件格式错误，请上传 .xlsx、.xls 或 .csv 文件。":
    "Unsupported file format. Upload an .xlsx, .xls, or .csv file.",
  "文件为空，或文件中没有可导入的数据。":
    "The file is empty or contains no importable data.",
  "文件过大，请将名单控制在 10 MB 以内。":
    "The file is too large. Keep the roster under 10 MB.",
  "文件解析失败，请检查文件是否损坏或受密码保护。":
    "File parsing failed. Check whether the file is damaged or password-protected.",
  "缺少必填字段：学号。": "Required field missing: student number.",
  "导入失败，请检查文件后重试。":
    "Import failed. Check the file and try again.",
  "名单对齐数据加载失败，请重试。":
    "Roster reconciliation data failed to load. Try again.",
  "对齐完成；结果已保存到当前前端演示会话，尚未写入服务器。":
    "Reconciliation completed. Results are saved in this front-end demo session and have not been written to the server.",
  "重新对齐失败，请检查网络后重试。":
    "Reconciliation failed. Check the network and try again.",
  "处理状态已保存在当前前端演示会话，尚未写入服务器。":
    "The resolution status is saved in this front-end demo session and has not been written to the server.",
  "处理状态更新失败，请重试。":
    "The resolution status could not be updated. Try again.",
  "已导出当前筛选结果。": "The current filtered results were exported.",
  "导出失败，请重试。": "Export failed. Try again.",
  "名单对齐数据暂时不可用。":
    "Roster reconciliation data is temporarily unavailable.",
  尚未导入官方名单: "No official roster imported",
  "导入学校提供的 Excel 或 CSV 名单后，系统会按学号自动比对当前课程成员。":
    "Import the university-provided Excel or CSV roster to compare current class members by student number.",
  导入官方名单: "Import official roster",
  "当前为前端 Mock 服务；导入内容仅保存在本次浏览器会话，不会写入学校服务器。":
    "This is a front-end mock service. Imported content is saved only for this browser session and is not written to the university server.",
  "导入成功并完成对齐；数据仅保存在当前前端演示会话。":
    "Import and reconciliation completed. Data is saved only in the current front-end demo session.",
  正在对齐: "Reconciling",
  重新对齐: "Reconcile again",
  导出结果: "Export results",
  名单版本和更新时间: "Roster version and update times",
  当前名单版本: "Current roster version",
  官方名单更新时间: "Official roster updated",
  平台名单更新时间: "Platform roster updated",
  最近一次对齐: "Last reconciled",
  名单对齐概览: "Roster reconciliation overview",
  官方名单总人数: "Official roster total",
  平台当前人数: "Current platform total",
  已正确加入人数: "Matched students",
  未加入人数: "Not joined",
  加错课程人数: "Wrong-course students",
  其他异常人数: "Other exceptions",
  其他异常: "Other exceptions",
  名单对齐筛选工具栏: "Roster reconciliation filters",
  已选择: "Selected",
  批量确认: "Confirm selected",
  批量标记已处理: "Mark selected resolved",
  搜索姓名或学号: "Search name or student number",
  对齐状态: "Reconciliation status",
  全部对齐状态: "All reconciliation statuses",
  全部处理状态: "All resolution statuses",
  课程筛选: "Class filter",
  全部相关课程: "All related classes",
  待处理优先: "Pending first",
  按学号: "By student number",
  按姓名: "By name",
  最近更新: "Recently updated",
  对齐结果: "Reconciliation results",
  "条记录，异常和待处理记录优先显示。":
    "records; exceptions and pending records are shown first.",
  清除筛选: "Clear filters",
  没有符合筛选条件的记录: "No records match the filters",
  "调整搜索或筛选条件后再试。": "Change the search or filters and try again.",
  选择当前页全部记录: "Select all records on this page",
  官方课程: "Official class",
  当前加入课程: "Current class",
  官方信息: "Official information",
  平台信息: "Platform information",
  差异说明: "Difference explanation",
  查看差异详情: "View difference details",
  标记为已确认: "Mark confirmed",
  标记为已处理: "Mark resolved",
  恢复为待处理: "Restore to pending",
  第: "Page",
  页: "page",
  "教师备注已保存在当前前端演示会话，尚未写入服务器。":
    "The teacher note is saved in this front-end demo session and has not been written to the server.",
  返回课程管理: "Back to Class Management",
  "课程管理 · 名单对齐": "Class Management · Roster Reconciliation",
  正在加载名单对齐数据: "Loading roster reconciliation data",
  "正在获取官方名单、平台成员和最近一次对齐结果。":
    "Fetching the official roster, platform members, and latest reconciliation results.",
  名单对齐加载失败: "Roster reconciliation failed to load",
  差异详情: "Difference details",
  系统判定依据与教师处理记录: "System rationale and teacher action history",
  关闭差异详情: "Close difference details",
  系统判定原因: "System rationale",
  官方名单信息: "Official roster information",
  官方归属课程: "Officially assigned class",
  平台学生信息: "Platform student information",
  差异字段: "Different fields",
  "主要身份字段无差异。": "No differences in the main identity fields.",
  "官方：": "Official:",
  "平台：": "Platform:",
  教师备注: "Teacher note",
  记录核实情况或后续处理计划: "Record verification findings or next steps",
  最近操作记录: "Recent actions",
  "后续操作（等待真实后端）": "Future actions (awaiting the real backend)",
  通知学生: "Notify student",
  调整到正确课程: "Move to correct class",
  从当前课程移除: "Remove from current class",
  修改平台信息: "Edit platform information",
  "这些操作尚未接入服务器，不会伪造处理成功。调整课程或移除成员上线前必须增加对象、范围和不可逆风险的二次确认。":
    "These actions are not connected to the server and will not pretend to succeed. Moving or removing members must show a second confirmation with the target, scope, and irreversible risks before launch.",
  恢复待处理: "Restore pending",
  正在保存: "Saving",
  保存备注: "Save note",
  标记已确认: "Mark confirmed",
  标记已处理: "Mark resolved",
  执行名单对齐: "Run roster reconciliation",
  更新教师备注: "Update teacher note",
  "官方名单导入 · 第": "Official roster import · Step",
  "步，共 3 步": "of 3",
  关闭导入: "Close import",
  导入进度: "Import progress",
  "1 选择并预览": "1 Select and preview",
  "2 字段映射": "2 Map fields",
  "3 校验并导入": "3 Validate and import",
  正在解析文件: "Parsing file",
  选择学校官方课程名单: "Select the university official class roster",
  选择学校官方课程名单文件: "Select the university official class roster file",
  "支持 .xlsx、.xls 和 .csv，最大 10 MB、最多 10,000 行。学号始终按字符串处理。":
    "Supports .xlsx, .xls, and .csv up to 10 MB and 10,000 rows. Student numbers are always treated as strings.",
  正在解析: "Parsing",
  选择文件: "Choose file",
  行数据: "data rows",
  更换文件: "Choose another file",
  数据预览: "Data preview",
  显示前: "Showing the first",
  "行；确认表头和学号前导零是否正确。":
    "rows; verify the headers and leading zeros in student numbers.",
  字段映射: "Field mapping",
  "系统已自动识别常见表头。学号为必填核心匹配字段，姓名仅用于辅助校验。":
    "Common headers were detected automatically. Student number is the required primary match field; name is only an auxiliary check.",
  不导入此字段: "Do not import this field",
  有效数据: "Valid rows",
  异常数据: "Invalid rows",
  总数据行: "Total rows",
  "异常行不会导入；重复学号的所有相关记录需要先在源文件中确认。":
    "Invalid rows will not be imported. Confirm every duplicate student number in the source file first.",
  行: "row",
  另有: "Another",
  "条异常未展开。": "errors are not expanded.",
  该课程已有官方名单: "This class already has an official roster",
  "当前版本为 v": "The current version is v",
  "。请选择本次导入方式，不会直接覆盖。":
    ". Choose how to import; the current roster will not be overwritten automatically.",
  创建新版本: "Create a new version",
  "保留当前版本记录，并将本次名单设为最新版本。":
    "Keep the current version record and make this roster the latest version.",
  替换当前官方名单: "Replace the current official roster",
  "替换当前版本内容；历史版本能力仍由数据结构预留。":
    "Replace the current version contents; the data model still reserves historical-version support.",
  "当前使用前端 Mock Service。确认后会在本次浏览器会话中保存名单并自动重新对齐，不会修改学校服务器或真实学生成员关系。":
    "The front-end Mock Service is active. Confirming saves the roster for this browser session and reruns reconciliation without changing the university server or real memberships.",
  取消导入: "Cancel import",
  校验数据: "Validate data",
  正在导入并对齐: "Importing and reconciling",
  确认导入并对齐: "Confirm import and reconcile",
  教师备注已更新: "Teacher note updated",
  教师备注已清空: "Teacher note cleared",
  "学号及主要身份信息与官方名单一致。":
    "The student number and primary identity fields match the official roster.",
  "姓名一致但学号不同，系统不会自动认定为同一学生，需要教师人工确认。":
    "The name matches but the student number does not. The system will not treat these records as the same student without teacher confirmation.",
  "该学生存在于官方名单，但平台当前没有相同学号的课程成员。":
    "The student is on the official roster, but the platform has no class member with the same student number.",
  "该平台课程成员的学号未出现在本课程或教师其他课程的官方名单中。":
    "This platform member's student number does not appear on the official roster for this class or the teacher's other classes.",
  体测免测: "Physical-test exemption",
  运动打卡减免: "Exercise check-in exemption",
  历史体测免测: "Legacy physical-test exemption",
  历史运动打卡减免: "Legacy exercise check-in exemption",
  特殊情况: "Special circumstances",
  真实凭证受安全访问控制保护: "Genuine evidence is protected by access controls",
  "点击下方按钮获取短期签名地址，并在新窗口查看服务端原件。此处不会显示固定占位图。":
    "Use the button below to obtain a short-lived signed URL and view the server original in a new window. No fixed placeholder is shown here.",
  查看真实凭证: "View genuine evidence",
  "该学生的全部记录均已在服务端完成审核，无需额外提交完成标记。":
    "All records for this student have been reviewed on the server; no extra completion marker is required.",
  "打卡时间窗已保存到后端；20 小时总目标由服务端成绩规则统一裁决。":
    "The check-in window was saved to the backend; the server score rule owns the 20-hour total target.",
  "该操作没有已批准的后端能力，真实模式不会创建本地补录或减免事实。":
    "This action has no approved backend capability. Real mode will not create local supplemental-credit or waiver facts.",
  "缺少服务端成员关系版本，请刷新后重试。":
    "The server enrollment version is missing. Refresh and try again.",
  "该学生尚无服务端成绩投影，需先由服务端成绩任务生成后才能重新计算。":
    "This student has no server score projection. The server score job must generate one before recalculation.",
  "服务端已重新计算该学生成绩。发布前学生端不会看到未发布分数。":
    "The server recalculated this student's score. Unpublished scores remain hidden from the student.",
  "当前没有可发布的服务端成绩；缺失成绩投影的学生不会被伪造为已发布。":
    "There are no server scores available to publish. Students without a score projection will not be marked as published.",
  "缺少申请版本，请刷新后重试。":
    "The application version is missing. Refresh and try again.",
  "免测/减免申请审核结果已保存到服务端；该操作不会伪造成绩或抵扣时长。":
    "The exemption decision was saved to the server; it does not fabricate a score or duration offset.",
  "浏览器阻止了新窗口，请允许弹窗后再次点击查看凭证。":
    "The browser blocked the new window. Allow pop-ups and click the evidence again.",
  成绩规则: "Score rule",
  "演示模式可调整两类展示目标。": "Demo mode can adjust the two display-only targets.",
  "服务端采用 TOTAL_ONLY 规则，不设置课程/自主运动分类配额。":
    "The server uses a TOTAL_ONLY rule and does not set course/independent activity quotas.",
  "当前权威要求为累计有效运动 20 小时。分类时长仅用于展示，不作为单独达标门槛；教师不能在此页面创建本地覆盖规则。":
    "The authoritative requirement is 20 total valid exercise hours. Categories are display-only and teachers cannot create local override rules here.",
  当前邀请码明文不会被重新读取: "The current invitation plaintext cannot be retrieved again",
  "如需重新展示，请生成新邀请码；服务端会同时使此前的有效邀请码失效。":
    "Generate a new invitation to display it again; the server will invalidate the previous active invitation.",
  替换课程邀请码: "Replace class invitation",
  "撤销后，当前二维码和邀请码将立即失效。":
    "After revocation, the current QR code and invitation become invalid immediately.",
  "服务端 API 不提供单独撤销接口。生成新邀请码会在同一服务端事务中使旧邀请码失效，且不会影响已经建立的成员关系。":
    "The backend API has no standalone revoke endpoint. Creating a new invitation invalidates the old one in the same server transaction without affecting existing enrollments.",
  生成新码并替换旧码: "Generate a new code and replace the old one",
  "先查看审核状态和计入时长，再核对原始记录与运动凭证；详情页仅用于查看。":
    "Review the status and counted duration first, then verify the original record and evidence. This detail view is read-only.",
  "先查看审核状态和计入时长，再核对服务端记录与真实运动凭证。":
    "Review the status and counted duration first, then verify the server record and genuine evidence.",
  打卡核心信息: "Key check-in information",
  "以原始开始和结束时间为准": "Based on the original start and end times",
  原始记录: "Original record",
  时间与说明: "Time and description",
  完成查看: "Done",
  "业务规则明确禁止教师覆盖计入时长。教师可以追加“有效/无效”审核记录，但不能在客户端改写服务端时长事实。":
    "The API prohibits teacher duration overrides. Teachers may append valid/invalid reviews but cannot rewrite server duration facts from the client.",
  服务端成绩: "Server score",
  "成绩由服务端按已审核记录与已生效规则计算；教师端不本地录入耐力跑分数。":
    "The server calculates scores from reviewed records and the active rule; the teacher client does not enter local endurance-run scores.",
  重新计算: "Recalculate",
  尚未计算: "Not calculated",
  未发布: "Unpublished",
  "“重新计算”只请求服务端刷新成绩投影；不会创建本地分数，也不会自动发布。尚无成绩投影的学生会明确显示“未生成”。":
    "Recalculate only asks the server to refresh the score projection. It creates no local score and does not publish automatically. Missing projections are shown explicitly.",
  "只发布当前教学班中已由服务端生成且尚未发布的成绩投影；缺失投影的学生不会被伪造为已发布。":
    "Publish only server-generated, unpublished score projections for this class. Missing projections are never presented as published.",
  "发布请求逐条使用服务端版本控制。页面不会声称已经发送服务端 API 未保证的通知。":
    "Each publish request uses server version control. The page does not claim notifications that the API does not guarantee.",
  "该申请未附带可访问的服务端凭证。":
    "This application has no accessible server evidence.",
  "审核通过只改变申请状态；服务端不会因此自动生成分数或抵扣时长。":
    "Approval changes only the application status; the API does not automatically create a score or duration offset.",
  "真实服务端当前不返回风险或置信度；请依据记录与受保护凭证人工审核。":
    "The live server does not return risk or confidence values. Review the record and protected evidence manually.",
  "新提交默认有效；如凭证存在问题，请进入记录并手动标记为无效。":
    "New submissions are valid by default. If the evidence has a problem, open the record and mark it invalid manually.",
  "服务端未提供": "Not provided by the server",
  "风险辅助": "Risk assistance",
  "服务端正式审核": "Authoritative server review",
  "备注将随无效审核记录保存到服务端":
    "The note will be saved to the server with the invalid review record.",
  "服务端 API 当前未提供风险或置信度投影":
    "The server API currently exposes no risk or confidence projection.",
  "服务端教师投影当前不返回位置或地图数据":
    "The teacher projection currently returns no location or map data.",
  "查看服务端教学班、成员关系、时间窗与一次性课程邀请。":
    "View server class sections, enrollments, time windows, and one-time class invitations.",
  "查看真实课程成员、加入状态与服务端成绩进度。":
    "View genuine class members, enrollment status, and server score progress.",
  "依据服务端记录与受保护运动凭证追加有效或无效审核。":
    "Append a valid or invalid review based on the server record and protected exercise evidence.",
  "重新计算并发布服务端成绩投影；客户端不录入或伪造分数。":
    "Recalculate and publish server score projections; the client neither enters nor fabricates scores.",
  "审核服务端免测申请；审核结论不会自动生成分数或抵扣时长。":
    "Review server exemption applications; a decision does not automatically create a score or duration offset.",
  "查看服务端学期状态；当前 API 不提供手工创建、切换或归档操作。":
    "View server term status; the current API does not provide manual creation, switching, or archiving.",
  "查看组织范围内的账号与角色资料；当前 API 不提供账号恢复、解锁或删除操作。":
    "View organization-scoped accounts and roles; the current API does not provide account recovery, unlocking, or deletion.",
  "查看组织范围内的用户反馈；当前 API 不提供回复或状态变更操作。":
    "View organization-scoped user feedback; the current API provides no reply or status mutation.",
  "查看学生端提交的问题类型和问题描述；当前 API 不提供回复或状态变更操作。":
    "View the problem category and description submitted by students; the current API provides no reply or status mutation.",
  "维护服务端总学时成绩规则草稿，并执行双管理员审批流程。":
    "Maintain server total-hours score-rule drafts and complete the two-administrator approval flow.",
  "查看当前服务端系统模式；客户端不显示当前 API 未开放的切换操作。":
    "View the current server system mode; the client hides switching actions not exposed by the API.",
  "查看服务端已发布的中英文帮助内容；当前客户端 API 不提供发布能力。":
    "View published Chinese and English server help; publication is outside the current client API.",
  "追踪服务端关键操作；审计记录只读，不可修改或删除。":
    "Trace important server operations; audit records are read-only and cannot be changed or deleted.",
  "请输入账号已绑定的完整邮箱地址。":
    "Enter the full email address linked to the account.",
  "密码恢复请求已失效，请返回登录页后重新发起。":
    "This password recovery request has expired. Return to sign in and start again.",
  "请输入邮箱收到的 4–10 位数字验证码。":
    "Enter the 4–10 digit verification code sent to your email.",
  "请输入新的个人密码。": "Enter a new personal password.",
  "系统仅使用后端认证与授权数据，并根据账号权限进入对应工作台":
    "The system uses only server authentication and authorization data and opens the workspace permitted for the account.",
  验证并设置新密码: "Verify and set a new password",
  "输入账号绑定邮箱和账号身份。后端会创建一次性恢复请求，并通过已配置的邮件服务发送验证码。":
    "Enter the account email and account role. The server will create a one-time recovery request and send a verification code through the configured email service.",
  账号身份: "Account role",
  管理员: "Administrator",
  账号绑定邮箱: "Account email",
  请输入完整学校邮箱: "Enter the full university email address",
  "正在提交…": "Submitting…",
  "恢复请求已由后端受理。请输入邮件验证码和新密码；成功后，该账号在所有设备上的旧登录状态将失效。":
    "The server accepted the recovery request. Enter the email verification code and a new password. After completion, existing sessions for this account on all devices will be invalidated.",
  "本次恢复请求有效期至：": "This recovery request expires at:",
  邮件验证码: "Email verification code",
  "请输入 4–10 位数字验证码": "Enter a 4–10 digit verification code",
  "请输入新的个人密码": "Enter a new personal password",
  "请输入非空的个人密码": "Enter a non-empty personal password",
  已输入密码: "Password entered",
  "正在验证…": "Verifying…",
  验证并重置密码: "Verify and reset password",
  "已登录状态下修改密码尚未纳入 Backend API；请退出后使用真实邮箱恢复流程重置密码。":
    "Changing a password while signed in is not yet part of the Backend API. Sign out and use the live email recovery flow to reset it.",
  已忽略: "Ignored",
  入学年份: "Entry year",
  学院: "School",
  "缺少必填字段：姓名。": "The required name field is missing.",
  "名单超过 10,000 行，请拆分或整理后重新导入。":
    "The roster exceeds 10,000 rows. Split or clean the file and import it again.",
  "后端未接受该名单版本，请根据校验结果修正文件后重试。":
    "The server rejected this roster version. Correct the file based on the validation results and try again.",
  "后端名单核对已完成，并生成新的不可变核对修订。":
    "Server roster reconciliation is complete and a new immutable reconciliation revision was created.",
  "已由后端记录确认原因。": "The server recorded the confirmation reason.",
  "已由后端重新打开该核对结果。": "The server reopened this reconciliation result.",
  "导入学校提供的 Excel 或 CSV 名单后，后端会校验并创建不可变名单版本；教师确认后再运行名单核对。":
    "After a university Excel or CSV roster is imported, the server validates it and creates an immutable roster version. The teacher can then run reconciliation.",
  "文件和字段映射将提交到真实后端；导入不会直接增删课程成员。":
    "The file and field mapping are submitted to the live server. Importing does not directly add or remove course members.",
  "后端已创建并验证新的官方名单版本；请点击“运行核对”生成结果。":
    "The server created and validated a new official roster version. Select Run reconciliation to generate results.",
  正在核对: "Reconciling",
  重新核对: "Reconcile again",
  运行核对: "Run reconciliation",
  "名单有效 / 异常": "Roster valid / exceptions",
  "后端已创建并验证新的官方名单版本；请运行核对生成最新结果。":
    "The server created and validated a new official roster version. Run reconciliation to generate the latest results.",
  "请填写本次确认或重新打开的原因。":
    "Enter the reason for confirming or reopening this result.",
  "后端未接受本次处理，请查看页面错误信息后重试。":
    "The server rejected this action. Review the page error and try again.",
  后端最近处理说明: "Latest server action note",
  本次处理原因: "Reason for this action",
  "必填；说明核实依据。该原因会写入后端审计与处理历史。":
    "Required. Describe the verification basis. The server stores this reason in the audit and action history.",
  受接口规则约束的处理范围: "API-governed action scope",
  "当前页面仅开放后端已支持的“确认异常”和“重新打开”。“已处理”必须附带可追溯证据引用；现有页面尚不能安全采集该证据，因此不会显示伪造入口。完整历史可在审计日志中查询。":
    "This page exposes only server-supported Confirm exception and Reopen actions. Marking an item resolved requires a traceable evidence reference, which this page cannot yet collect safely, so no fabricated action is shown. The complete history is available in the audit log.",
  正在提交: "Submitting",
  重新打开: "Reopen",
  确认该异常: "Confirm this exception",
  "字段名与服务端 API一致；学号和姓名均为必填字段，最终校验结果以后端为准。":
    "Field names follow the Backend API. Student number and name are required, and server validation is authoritative.",
  该教学班已有官方名单: "This class section already has an official roster",
  "。后端只允许创建新的不可变版本；历史版本会保留，本次导入验证通过后成为当前版本。":
    ". The server only creates new immutable versions. Historical versions remain available, and this import becomes current after validation succeeds.",
  "确认后会把规范化 CSV 和字段映射提交到真实后端。后端负责校验、版本切换、审计与存储；该操作不会直接增删 Enrollment。":
    "Confirmation submits the normalized CSV and field mapping to the live server. The server owns validation, version activation, auditing, and storage; this action does not directly add or remove enrollments.",
  本地预检: "Local preflight validation",
  正在提交后端: "Submitting to server",
  确认创建新版本: "Confirm new version",
  未知: "Unknown",
  已计算: "Calculated",
  已锁定: "Locked",
  未生成: "Not generated",
  达标: "Meets target",
  未达标: "Below target",
  有效时长不足: "Insufficient valid duration",
  待计算: "Pending calculation",
  打开真实原件: "Open original evidence",
  "凭证内容来自后端短期签名地址；当前页面不缓存或替换真实媒体。":
    "Evidence is loaded from a short-lived server-signed URL. This page does not cache or substitute the original media.",
  位置投影未开放: "Location projection unavailable",
  "教师端后端投影当前不返回位置或地图数据；页面不会显示固定地图。":
    "The teacher server projection currently returns no location or map data, so the page does not display a fixed map.",
  "后端返回了无法关联学生身份资料的打卡记录，已停止展示不完整数据。":
    "The server returned a check-in record that could not be linked to a student identity profile, so incomplete data is not displayed.",
  "近 24 小时加入": "Joined in the last 24 hours",
  服务端成绩状态: "Server score status",
  已生成: "Generated",
  "本页只显示后端 StudentScore 投影；导出 API 当前为默认拒绝，因此不提供本地拼接 CSV。":
    "This page displays only the server StudentScore projection. Export is default-denied by the current API, so the client does not assemble a local CSV.",
  服务端成绩册: "Server gradebook",
  达标状态: "Target status",
  课程相关有效时长: "Course-related valid duration",
  其他有效时长: "Other valid duration",
  总有效时长: "Total valid duration",
  最终分数: "Final score",
  后端学生资料不可用: "Server student profile unavailable",
  "查看 / 重新计算": "View / recalculate",
  等待后端生成: "Waiting for server generation",
  当前筛选没有成绩投影: "No score projections match the current filter",
  "切换状态，或等待服务端成绩任务生成后再刷新。":
    "Change the status filter, or wait for the server score job to finish and refresh.",
  后端当前学期不可用: "Current server term unavailable",
  不会返回给学生: "Not returned to the student",
};

const originalTextNodes = new WeakMap<Text, string>();

const englishToChineseText = new Map(
  Object.entries(englishText)
    .filter(([, english]) => english.length > 0)
    .map(([chinese, english]) => [english, chinese]),
);

const chineseTextOverrides: Record<string, string> = {
  ADMIN: "管理员",
  "BNBU SPORTS": "BNBU 体育",
  "BNBU CAMPUS SPORTS": "BNBU 校园体育",
  SPORTS: "体育",
  "BEIJING NORMAL · HONG KONG BAPTIST UNIVERSITY": "北师香港浸会大学",
  "© 2026 Beijing Normal-Hong Kong Baptist University":
    "© 2026 北师香港浸会大学",
  "How to submit a sports check-in?": "如何提交运动打卡？",
  "How to apply for team or club credit?": "校队和社团成员如何申请学时抵扣？",
};

type StatusScope =
  "default" | "system" | "audit" | "grade" | "exemption" | "ticket" | "invite";

const statusSourceLabels: Record<StatusScope, Record<string, string>> = {
  default: {
    PENDING: "待审核",
    ACTIVE: "进行中",
    REJECTED: "已驳回",
    NEEDS_CORRECTION: "待补正",
    pending: "待审核",
    valid: "有效",
    invalid: "无效",
    approved: "已通过",
    rejected: "已驳回",
    supplement_required: "待补材料",
    NotRecorded: "待录入",
    Recorded: "已录入",
    Exempt: "免测",
    Absent: "缺考",
  },
  system: {
    NORMAL: "正常模式",
    MAINTENANCE: "维护模式",
  },
  audit: { pending: "待审核", valid: "有效", invalid: "无效" },
  grade: {
    NotRecorded: "待录入",
    Recorded: "已录入",
    Exempt: "免测",
    Absent: "缺考",
  },
  exemption: {
    pending: "待审核",
    supplement_required: "待补材料",
    approved: "已通过",
    rejected: "已驳回",
  },
  ticket: {
    待受理: "待受理",
    受理中: "受理中",
    待技术团队处理: "待技术团队处理",
    处理完成: "处理完成",
    已关闭: "已关闭",
  },
  invite: { 有效: "有效", 已撤销: "已撤销" },
};

/**
 * Converts persisted API enums to their Chinese display source. The language
 * boundary then localizes that source consistently, so callers never expose a
 * backend enum such as `MAINTENANCE` or `pending` directly in the UI.
 */
export function statusLabel(value: string, scope: StatusScope = "default") {
  return (
    statusSourceLabels[scope][value] ??
    statusSourceLabels.default[value] ??
    value
  );
}

function formatIsoDateTime(value: string, locale: Locale) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour === undefined ? 0 : Number(hour),
    minute === undefined ? 0 : Number(minute),
    second === undefined ? 0 : Number(second),
  );
  const hasTime = hour !== undefined && minute !== undefined;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: locale === "en" ? "long" : "numeric",
    day: "numeric",
    ...(hasTime
      ? {
          hour: "numeric",
          minute: "2-digit",
          ...(locale === "en" ? { hour12: true } : { hour12: false }),
        }
      : {}),
  }).format(date);
}

function formatEnglishMonthDay(month: string, day: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(2026, Number(month) - 1, Number(day)));
}

function formatEnglishMonthYear(year: string, month: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
  }).format(new Date(Number(year), Number(month) - 1, 1));
}

const dynamicText: Array<[RegExp, (...matches: string[]) => string]> = [
  [/^(\d{4})级$/, (_, year) => `Cohort ${year}`],
  [
    /^(大学体育（一）|羽毛球|篮球) · (\d+)班$/,
    (_, course, section) => `${translateText(course)} · Section ${section}`,
  ],
  [
    /^([A-Z]+\d+) · (\d+)班$/,
    (_, code, section) => `${code} · Section ${section}`,
  ],
  [/^(\d+) 名学生$/, (_, count) => `${count} students`],
  [/^显示 (\d+) 名学生$/, (_, count) => `Showing ${count} students`],
  [
    /^(\d+) 人学时尚未达标$/,
    (_, count) => `${count} students are below the credit target`,
  ],
  [
    /^(\d+) \/ (\d+) 人已达标$/,
    (_, qualified, total) => `${qualified} / ${total} students qualified`,
  ],
  [/^达标率 (\d+)%$/, (_, percent) => `Qualification rate ${percent}%`],
  [/^(\d+) 条待审核$/, (_, count) => `${count} pending`],
  [
    /^显示 (\d+) 条待审核记录$/,
    (_, count) =>
      `Showing ${count} pending record${count === "1" ? "" : "s"}`,
  ],
  [
    /^显示 (\d+) 条历史记录$/,
    (_, count) =>
      `Showing ${count} history record${count === "1" ? "" : "s"}`,
  ],
  [
    /^显示 (\d+) 条记录$/,
    (_, count) => `Showing ${count} record${count === "1" ? "" : "s"}`,
  ],
  [/^(\d+) 条$/, (_, count) => `${count} record${count === "1" ? "" : "s"}`],
  [/^打开(.*)的用户信息$/, (_, name) => `Open ${name}'s profile`],
  [/^涉及 (\d+) 名学生$/, (_, count) => `${count} students involved`],
  [/^显示 (\d+) 条申请$/, (_, count) => `Showing ${count} applications`],
  [/^共 (\d+) 条申请$/, (_, count) => `${count} applications in total`],
  [
    /^学生至少需要完成 (\d+(?:\.\d+)?) 小时课程相关运动。$/,
    (_, hours) =>
      `Students must complete at least ${hours} hours of course-related activity.`,
  ],
  [
    /^学生至少需要完成 (\d+(?:\.\d+)?) 小时自主运动。$/,
    (_, hours) =>
      `Students must complete at least ${hours} hours of independent activity.`,
  ],
  [
    /^目标 (\d+(?:\.\d+)?)h \+ (\d+(?:\.\d+)?)h$/,
    (_, course, other) => `Target ${course}h + ${other}h`,
  ],
  [/^(\d+) 小时$/, (_, hours) => `${hours} hour${hours === "1" ? "" : "s"}`],
  [/^(\d+) 次$/, (_, count) => `${count} check-in${count === "1" ? "" : "s"}`],
  [/^第 (\d+) 次提交$/, (_, count) => `Submission attempt ${count}`],
  [
    /^无效：(.*)$/,
    (_, detail) => {
      const [reason, ...remark] = detail.split("：");
      return `Invalid: ${translateText(reason)}${remark.length ? `: ${remark.join("：")}` : ""}`;
    },
  ],
  [/^(\d+) 项$/, (_, count) => `${count} item${count === "1" ? "" : "s"}`],
  [/^(\d+) 小时 (\d+) 分$/, (_, hours, minutes) => `${hours}h ${minutes}m`],
  [
    /^(\d+) 年 (\d+) 月$/,
    (_, year, month) => formatEnglishMonthYear(year, month),
  ],
  [/^(\d+) 日$/, (_, day) => day],
  [/^(\d+)班$/, (_, section) => `Section ${section}`],
  [/^今天 (\d{1,2}:\d{2}(?::\d{2})?)$/, (_, time) => `Today at ${time}`],
  [/^昨天 (\d{1,2}:\d{2}(?::\d{2})?)$/, (_, time) => `Yesterday at ${time}`],
  [
    /^(\d+) 小时前$/,
    (_, hours) => `${hours} hour${hours === "1" ? "" : "s"} ago`,
  ],
  [/^(\d+) 天前$/, (_, days) => `${days} day${days === "1" ? "" : "s"} ago`],
  [
    /^(\d{1,2})月(\d{1,2})日$/,
    (_, month, day) => formatEnglishMonthDay(month, day),
  ],
  [
    /^(\d{2})-(\d{2}) (\d{2}:\d{2})$/,
    (_, month, day, time) => `${formatEnglishMonthDay(month, day)}, ${time}`,
  ],
  [/^清除(.*)$/, (_, label) => `Clear ${translateText(label)}`],
  [
    /^还有 (\d+) 条记录未审核。$/,
    (_, count) =>
      `${count} record${count === "1" ? "" : "s"} still await review.`,
  ],
  [/^导航栏宽度 (\d+) 像素$/, (_, width) => `Navigation bar width: ${width}px`],
  [
    /^已打开 (.*) 的账号详情。$/,
    (_, name) => `Opened account details for ${name}.`,
  ],
  [
    /^系统已切换至 (.*)。$/,
    (_, mode) => `System switched to ${translateText(statusLabel(mode))}.`,
  ],
  [
    /^已打开「(.*)」编辑页。$/,
    (_, title) => `Opened the editor for “${translateText(title)}”.`,
  ],
  [/^(.*)已完成。$/, (_, action) => `${translateText(action)} completed.`],
  [/^(.*)，查看学生详情$/, (_, name) => `View ${name}'s student details`],
  [/^完成进度 (\d+)%$/, (_, percent) => `Completion progress: ${percent}%`],
  [/^(.*)审核状态$/, (_, subject) => `${translateText(subject)} review status`],
  [
    /^已超出目标 (\d+(?:\.\d+)?) 小时$/,
    (_, hours) => `Exceeded target by ${hours} hours`,
  ],
  [/^还差 (\d+(?:\.\d+)?) 小时$/, (_, hours) => `${hours} hours remaining`],
  [
    /^(\d+) 分钟前$/,
    (_, minutes) => `${minutes} minute${minutes === "1" ? "" : "s"} ago`,
  ],
  [/^(\d+) 分$/, (_, minutes) => `${minutes} min`],
  [/^(\d+)分$/, (_, score) => `${score} points`],
  [/^免测 (\d+)分$/, (_, score) => `Exempt · ${score} points`],
  [
    /^学生证明材料，共 (\d+) 份$/,
    (_, count) =>
      `Student supporting materials · ${count} file${count === "1" ? "" : "s"}`,
  ],
  [
    /^已创建 (.*) · (.*)，并自动关联当前教师与当前学期。$/,
    (_, name, section) =>
      `Created ${name} · ${translateText(section)} and linked it to the current teacher and term.`,
  ],
  [
    /^已将 (.*) 移出课程；原打卡和成绩保留为只读历史$/,
    (_, student) =>
      `${student} was removed from the course; previous check-ins and grades remain read-only history.`,
  ],
  [
    /^该类别最多还可减免 (\d+(?:\.\d+)?) 小时，请调整减免时长。$/,
    (_, hours) =>
      `This category can be adjusted by at most ${hours} more hours. Update the adjustment duration.`,
  ],
  [
    /^已为 (.*) 减免 (\d+(?:\.\d+)?) 小时(.*)，该类别还需完成 (\d+(?:\.\d+)?) 小时$/,
    (_, student, hours, category, remaining) =>
      `Adjusted ${hours} hours for ${student} in ${translateText(category)}; ${remaining} hours remain in this category`,
  ],
  [
    /^已为 (.*) 补录 (\d+(?:\.\d+)?) 小时(.*)学时，且不占用每日提交额度$/,
    (_, student, hours, category) =>
      `Added ${hours} ${translateText(category)} credits for ${student}; this does not use the daily submission allowance`,
  ],
  [
    /^仍有 (\d+) 名学生未录入耐力跑状态，请先录入成绩或标记缺考。$/,
    (_, count) =>
      `${count} student${count === "1" ? "" : "s"} still need an endurance-run status. Enter a grade or mark them absent first.`,
  ],
  [/^完成率 (\d+)%$/, (_, percent) => `Completion rate ${percent}%`],
  [/^选择 (.*)$/, (_, value) => `Select ${translateText(value)}`],
  [
    /^课程运动 (\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)h · 其他运动 (\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)h(?: · 已减免 (\d+(?:\.\d+)?)h)?$/,
    (_, course, courseTarget, other, otherTarget, waived) =>
      `Course activity ${course}/${courseTarget}h · Other activity ${other}/${otherTarget}h${waived ? ` · Adjusted ${waived}h` : ""}`,
  ],
  [/^总完成率 (\d+)%$/, (_, percent) => `Total completion ${percent}%`],
  [/^(.*)的打卡记录列表$/, (_, student) => `${student}'s check-in record list`],
  [/^凭证 (\d+)$/, (_, index) => `Evidence ${index}`],
  [
    /^(.*)的打卡凭证相册$/,
    (_, student) => `${student}'s check-in evidence album`,
  ],
  [/^查看 (.*)$/, (_, item) => `View ${item}`],
  [
    /^(.*)-成绩册\.csv$/,
    (_, course) => `${translateText(course)}-gradebook.csv`,
  ],
  [
    /^已导出 (.*) 的 CSV 成绩册。$/,
    (_, course) => `Exported the CSV gradebook for ${translateText(course)}.`,
  ],
  [/^(\d+) 份材料$/, (_, count) => `${count} file${count === "1" ? "" : "s"}`],
  [
    /^(.*) · 课程邀请$/,
    (_, course) => `${translateText(course)} · Class invitation`,
  ],
  [/^邀请码 (.*) 已复制。$/, (_, code) => `Invitation code ${code} copied.`],
  [
    /^将“(.*)”标记为无效$/,
    (_, sport) => `Mark “${translateText(sport)}” as invalid`,
  ],
  [
    /^完成 (.*) 的打卡审核$/,
    (_, student) => `Complete check-in review for ${student}`,
  ],
  [
    /^(.*) · (.*)打卡详情$/,
    (_, student, sport) =>
      `${student} · ${translateText(sport)} check-in details`,
  ],
  [
    /^已打开 (.*) 的前端预览。$/,
    (_, file) => `Opened the front-end preview for ${file}.`,
  ],
  [
    /^系统已按性别默认 (.*)，用时将依据“(.*)”换算表自动生成分数。$/,
    (_, distance, group) =>
      `The default distance is ${distance} based on gender. The score is calculated from the “${translateText(group)}” conversion table.`,
  ],
  [/^有效期：(.*)$/, (_, date) => `Valid until: ${translateText(date)}`],
  [
    /^为 (.*) 创建运动任务$/,
    (_, course) => `Create activity task for ${translateText(course)}`,
  ],
  [
    /^审核 (.*) 的(.*)$/,
    (_, student, kind) => `Review ${translateText(kind)}: ${student}`,
  ],
  [
    /^(.*) · (.*)打卡审核$/,
    (_, student, sport) =>
      `${student} · ${translateText(sport)} check-in review`,
  ],
  [/^(.*) · 成绩录入$/, (_, student) => `${student} · Enter grades`],
  [
    /^发布 (.*) 成绩$/,
    (_, course) => `Publish grades: ${translateText(course)}`,
  ],
  [/^预览 (.*)$/, (_, file) => `Preview ${file}`],
  [
    /^(.*) 提交的(.*)证明材料，仅限本次审核使用。$/,
    (_, student, kind) =>
      `${student}'s ${translateText(kind)} supporting material. For this review only.`,
  ],
  [
    /^该类别还可减免 (\d+(?:\.\d+)?) 小时$/,
    (_, hours) =>
      `${hours} credits remain available for adjustment in this category`,
  ],
  [
    /^共 (\d+) 条记录；(.*)$/,
    (_, count, rest) =>
      `Total ${count} record${count === "1" ? "" : "s"}; ${translateText(rest)}`,
  ],
  [/^处理 (.*)$/, (_, value) => `Manage ${value}`],
  [
    /^官方名单中学号 (.*) 出现 (\d+) 次，需要先清理重复数据。$/,
    (_, number, count) =>
      `Student number ${number} appears ${count} times in the official roster. Resolve the duplicate data first.`,
  ],
  [
    /^平台课程中学号 (.*) 出现 (\d+) 次，可能由重复扫码或重复导入导致。$/,
    (_, number, count) =>
      `Student number ${number} appears ${count} times in the platform class, possibly due to repeated scanning or import.`,
  ],
  [
    /^学号完全一致，但 (.*) 与官方名单不同。$/,
    (_, fields) =>
      `The student number matches exactly, but ${fields} differs from the official roster.`,
  ],
  [
    /^该学生学号与本课程官方名单一致，但当前加入了“(.*)”，因此被标记为加错课程。$/,
    (_, course) =>
      `The student number matches this class's official roster, but the student joined “${translateText(course)}”, so the record is marked as wrong course.`,
  ],
  [
    /^该学生学号与本课程官方名单一致，但当前加入了另一门课程，因此被标记为加错课程。$/,
    () =>
      "The student number matches this class's official roster, but the student joined another class, so the record is marked as wrong course.",
  ],
  [
    /^该学生学号属于“(.*)”官方名单，但实际加入了本课程。$/,
    (_, course) =>
      `The student number belongs to the official roster for “${translateText(course)}” but the student joined this class.`,
  ],
  [
    /^该学生学号属于教师的另一门课程官方名单，但实际加入了本课程。$/,
    () =>
      "The student number belongs to the official roster for another class taught by this teacher, but the student joined this class.",
  ],
  [
    /^(.*) 条相同学号记录$/,
    (_, count) =>
      `${count} record${count === "1" ? "" : "s"} with the same student number`,
  ],
  [
    /^(.*) 条课程成员记录$/,
    (_, count) => `${count} class-member record${count === "1" ? "" : "s"}`,
  ],
];

function translateToEnglish(value: string) {
  const formattedDate = formatIsoDateTime(value, "en");
  if (formattedDate) return formattedDate;
  const exact = englishText[value];
  if (exact) return exact;
  for (const [pattern, replace] of dynamicText) {
    const match = value.match(pattern);
    if (match) return replace(...match);
  }
  return value;
}

function translateToChinese(value: string) {
  const formattedDate = formatIsoDateTime(value, "zh");
  if (formattedDate) return formattedDate;
  return (
    chineseTextOverrides[value] ?? englishToChineseText.get(value) ?? value
  );
}

function translateForLocale(value: string, locale: Locale) {
  const leadingWhitespace = value.match(/^\s*/)?.[0] ?? "";
  const trailingWhitespace = value.match(/\s*$/)?.[0] ?? "";
  const core = value.slice(
    leadingWhitespace.length,
    value.length - trailingWhitespace.length,
  );
  if (!core) return value;
  const translated =
    locale === "en" ? translateToEnglish(core) : translateToChinese(core);
  return `${leadingWhitespace}${translated}${trailingWhitespace}`;
}

export function translateText(value: string) {
  return translateForLocale(value, "en");
}

export function LanguageToggle({
  locale,
  onChange,
  compact = false,
}: LanguageToggleProps) {
  return (
    <div
      className={`language-toggle ${compact ? "language-toggle-compact" : ""}`}
      aria-label={locale === "en" ? "Language" : "语言"}
      translate="no"
    >
      <button
        type="button"
        className={locale === "zh" ? "selected" : ""}
        aria-pressed={locale === "zh"}
        onClick={() => onChange("zh")}
      >
        中文
      </button>
      <button
        type="button"
        className={locale === "en" ? "selected" : ""}
        aria-pressed={locale === "en"}
        onClick={() => onChange("en")}
      >
        English
      </button>
    </div>
  );
}

function translateAttributes(root: HTMLElement, locale: Locale) {
  root
    .querySelectorAll<HTMLElement>(
      "[aria-label], [placeholder], [title], [alt]",
    )
    .forEach((element) => {
      if (element.closest('[translate="no"]')) return;
      for (const attribute of [
        "aria-label",
        "placeholder",
        "title",
        "alt",
      ] as const) {
        const original =
          element.dataset[
            `original${attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}`
          ];
        const current = original ?? element.getAttribute(attribute);
        if (!current) continue;
        if (!original)
          element.dataset[
            `original${attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}`
          ] = current;
        element.setAttribute(attribute, translateForLocale(current, locale));
      }
    });
}

function translateSubtree(root: HTMLElement, locale: Locale) {
  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (textWalker.nextNode()) textNodes.push(textWalker.currentNode as Text);

  textNodes.forEach((node) => {
    if (!node.parentElement) return;
    if (node.parentElement.closest('[translate="no"]')) return;
    const storedOriginal = originalTextNodes.get(node);
    const displayedValue = node.nodeValue ?? "";
    const original =
      storedOriginal &&
      (displayedValue === storedOriginal ||
        displayedValue === translateForLocale(storedOriginal, "en") ||
        displayedValue === translateForLocale(storedOriginal, "zh"))
        ? storedOriginal
        : displayedValue;
    originalTextNodes.set(node, original);
    if (node.parentElement.tagName === "OPTION") {
      // React's options use the Chinese display text as their default value.
      // Preserve that value before replacing the label so controlled selects continue to work.
      const option = node.parentElement as HTMLOptionElement;
      if (!option.dataset.originalValue) {
        option.dataset.originalValue = option.value;
        option.value = option.value;
      }
    }
    const nextValue = translateForLocale(original, locale);
    if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
  });
  translateAttributes(root, locale);
}

export function LocalizedContent({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
    document.title =
      locale === "en"
        ? "BNBU Physical Education Management Portal"
        : "BNBU 体育课程管理平台";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        locale === "en"
          ? "A unified portal for BNBU physical education teachers and administrators."
          : "教师与管理员统一入口，按身份进入清晰、专注的职责工作台。",
      );
    translateSubtree(root, locale);
    const observer = new MutationObserver(() => translateSubtree(root, locale));
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [locale]);

  return (
    <div ref={rootRef} className="localized-content" data-locale={locale}>
      {children}
    </div>
  );
}
