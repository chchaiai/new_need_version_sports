import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { matchesAdminSupportSearch } from "../app/admin-support-search.ts";

const source = (name) => readFile(new URL(`../app/${name}`, import.meta.url), "utf8");

test("read-only course filters and review, roster and exemption controls keep accessible labels", async () => {
  const [adminComponents, adminCourses, teacher, roster] = await Promise.all([
    source("admin-components.tsx"),
    source("admin-courses.tsx"),
    source("teacher-workspace.tsx"),
    source("roster-reconciliation.tsx"),
  ]);

  assert.match(adminComponents, /export function AdminField[\s\S]*<FormField/);
  assert.match(adminComponents, /error=\{error \?\? \(errorCode/);
  assert.match(adminCourses, /fetchClassSections\(\)/);
  assert.match(adminCourses, /fetchEnrollments\(section\.id\)/);
  assert.match(adminCourses, /fetchExerciseRecords\(section\.id\)/);
  assert.match(adminCourses, /label=\{locale === "zh" \? "搜索课程"/);
  assert.match(adminCourses, /管理员只能查看，不能创建、编辑、关闭或删除课程/);
  assert.match(adminCourses, /admin-course-hours/);
  assert.match(adminCourses, /averageSeconds/);
  assert.doesNotMatch(adminCourses, /\{ value: "ARCHIVED"/);
  assert.doesNotMatch(adminCourses, /管理边界|Admin scope/);
  assert.doesNotMatch(adminCourses, /createAdminCourse|updateAdminCourse/);
  assert.match(teacher, /function Field[\s\S]*<FormField/);
  assert.match(teacher, /<Field label="课程名称" required error=\{userFacingFieldError\(formError, "displayName"\)\}>/);
  assert.doesNotMatch(teacher, /label="课程代码"/);
  assert.doesNotMatch(teacher, /label="教学班号"/);
  assert.doesNotMatch(teacher, /label="教师内部备注"|form\.internalNote|saveCheckinReview/);
  assert.match(teacher, /role="radiogroup"[\s\S]*aria-invalid=\{Boolean\(userFacingFieldError\(formError, "reasonCode", "invalidReason"\)\)/);
  assert.match(teacher, /label="审核结果"[\s\S]*error=\{userFacingFieldError\(formError, "decision"\)\}/);
  assert.match(teacher, /label="审核意见" required error=\{userFacingFieldError\(formError, "publicComment", "comment"\)\}/);
  assert.match(roster, /controlId="roster-resolution-reason"/);
  assert.match(roster, /error=\{actionError \|\| undefined\}/);
  assert.match(roster, /id="roster-resolution-reason"/);
});

test("runtime log downloads use the real server export flow and never synthesize CSV", async () => {
  const [audit, service, subadmins] = await Promise.all([
    source("admin-audit.tsx"),
    source("admin-service.ts"),
    source("admin-subadmins.tsx"),
  ]);

  assert.match(service, /requestRuntimeLogArchive[\s\S]*exportType: "AUDIT_LOGS"/);
  assert.match(service, /format: "ZIP"/);
  assert.match(service, /redaction: "REQUIRED"/);
  assert.match(service, /createRuntimeLogArchiveDownload[\s\S]*download-url/);
  assert.match(audit, /服务器运行日志压缩包/);
  assert.match(audit, /mode === "demo"[\s\S]*正式登录后可下载/);
  assert.doesNotMatch(audit, /text\/csv|downloadAuditCsv|\.csv`/);
  assert.match(subadmins, /正式模式不会把浏览器本地账号冒充真实管理员/);
});

test("major search and roster upload controls expose an accessible name or helper", async () => {
  const [help, support, roster, teacher] = await Promise.all([
    source("admin-help.tsx"),
    source("admin-support.tsx"),
    source("roster-reconciliation.tsx"),
    source("teacher-workspace.tsx"),
  ]);

  assert.match(help, /<input type="search" aria-label=\{adminCopy\(locale, "help_search"\)\}/);
  assert.match(support, /function SupportSearchField[\s\S]*type="search"[\s\S]*aria-label=\{label\}/);
  assert.match(support, /<SupportSearchField label=\{adminCopy\(locale, "ticket_search"\)\}/);
  assert.ok((support.match(/label=\{adminCopy\(locale, "ticket_category_filter"\)\}/g) ?? []).length >= 2);
  assert.ok((support.match(/label=\{adminCopy\(locale, "ticket_status_filter"\)\}/g) ?? []).length >= 2);
  assert.match(support, /搜索反馈编号、分类或问题摘要/);
  assert.match(roster, /<input type="search" aria-label="搜索姓名或学号"/);
  assert.match(teacher, /type="search"[\s\S]*aria-label="搜索姓名、学号或邮箱"/);
  assert.match(teacher, /type="search"[\s\S]*aria-label="搜索认证申请"/);
  assert.match(roster, /type="file"[\s\S]*aria-label="选择学校官方课程名单文件"[\s\S]*aria-describedby="roster-file-help"/);
});

test("administrator feedback search matches problem summary, student number, email, and visible category", () => {
  const record = {
    id: "SR-82914",
    requester: "赵可心",
    studentNumber: "2024110261",
    email: "old-zhao@example.invalid",
    category: "bug",
    categoryLabel: "功能异常",
    summary: "运动完成后页面一直提示网络异常，想咨询是否可以补录。",
  };

  assert.equal(matchesAdminSupportSearch(record, "补录"), true);
  assert.equal(matchesAdminSupportSearch(record, "10261"), true);
  assert.equal(matchesAdminSupportSearch(record, "ZHAO@EXAMPLE"), true);
  assert.equal(matchesAdminSupportSearch(record, "功能异常"), true);
  assert.equal(matchesAdminSupportSearch(record, "赵可心 202411"), true);
  assert.equal(matchesAdminSupportSearch(record, "成绩录入"), false);
});

test("administrator feedback supports combined problem-category and status filters", async () => {
  const [support, i18n] = await Promise.all([
    source("admin-support.tsx"),
    source("admin-i18n.ts"),
  ]);

  assert.match(support, /const ticketCategories: TicketCategory\[\] = \[[\s\S]*"BUG"[\s\S]*"SUGGESTION"[\s\S]*"ACCESSIBILITY"[\s\S]*"PRIVACY"[\s\S]*"OTHER"/);
  assert.match(support, /categoryFilter === "all" \|\| ticket\.category === categoryFilter/);
  assert.match(support, /categoryFilter === "all" \|\| item\.category === categoryFilter/);
  assert.ok((support.match(/setCategoryFilter\("all"\)/g) ?? []).length >= 2);
  assert.match(i18n, /ticket_category_filter: "问题类型筛选"/);
  assert.match(i18n, /ticket_category_filter: "Problem category filter"/);
});

test("administrator dashboards keep supported metrics, student identity, and clean dialog close behavior", async () => {
  const [support, overview, courses, subadmins, styles, i18n] = await Promise.all([
    source("admin-support.tsx"),
    source("admin-overview.tsx"),
    source("admin-courses.tsx"),
    source("admin-subadmins.tsx"),
    source("admin-workspace.css"),
    source("admin-i18n.ts"),
  ]);

  assert.match(support, /requesterEmail=\{requesterFor\(selected\)\?\.email\}/);
  assert.match(support, /学校邮箱/);
  assert.match(support, /学号/);
  assert.match(support, /admin-support-requester/);
  assert.match(support, /admin-ticket-requester/);
  assert.match(overview, /学生与班级数据/);
  assert.match(overview, /classCount/);
  assert.match(overview, /admin-overview-layout/);
  assert.doesNotMatch(overview, /classDistribution|activeStudentRate|有效学生占比|班级人数分布/);
  assert.doesNotMatch(overview, /lockedAccounts|adminCopy\(locale, "locked_accounts"\)/);
  assert.doesNotMatch(
    overview,
    /pendingRecoveries|pending_recoveries|等待管理员核验|Awaiting administrator review|total_users|state\.users\.length/,
  );
  assert.match(
    styles,
    /\.admin-overview-page \.admin-summary-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
  );
  assert.doesNotMatch(styles, /\.admin-overview-page \.admin-summary-grid > button\.is-primary/);
  assert.doesNotMatch(i18n, /^\s*(?:total_users|pending_recoveries):/m);
  assert.match(i18n, /shortcut_accounts_hint: "管理角色与状态"/);
  assert.match(i18n, /shortcut_accounts_hint: "Manage roles and status"/);
  assert.match(courses, /当前课程数/);
  assert.match(courses, /总学生数/);
  assert.match(courses, /总教师数/);
  assert.match(courses, /new Set\(rows\.flatMap\(\(row\) => row\.activeStudentIds\)\)\.size/);
  assert.match(courses, /new Set\(rows\.map\(\(row\) => row\.teacherId\)\)\.size/);
  assert.match(subadmins, /const editorDirty = useMemo/);
  assert.match(subadmins, /dirty=\{editorDirty\}/);
  assert.doesNotMatch(subadmins, /\sdirty\s*\n\s*wide/);
  assert.match(subadmins, /学校邮箱/);
  assert.match(subadmins, /所属部门/);
  assert.match(subadmins, /职责模板/);
  assert.match(subadmins, /系统概览自动可见/);
  assert.match(subadmins, /“分管理员设置”始终不能下放/);
  assert.match(subadmins, /创建确认/);
  assert.match(subadmins, /只要求非空且两次输入一致/);
  assert.match(subadmins, /首次登录后必须先修改本人临时密码/);
  assert.match(subadmins, /mustChangePassword 初始为 true/);
  assert.match(subadmins, /mode: "create"/);
  assert.match(subadmins, /mode: "update"/);
  assert.doesNotMatch(subadmins, /isPasswordComplexEnough|自动生成安全密码|密码强度|New password|新密码|留空表示不修改当前密码/);
  assert.doesNotMatch(subadmins, /Select all|全选/);
  assert.match(subadmins, /创建成功/);
  assert.match(subadmins, /更新成功/);
  assert.match(subadmins, /删除成功/);
  assert.match(subadmins, /AdminConfirm/);
  assert.match(subadmins, /确认删除/);
  assert.match(subadmins, /className="is-danger"/);
  assert.doesNotMatch(subadmins, /admin-inline-success/);
  assert.match(styles, /\.admin-subadmin-editor-layout/);
  assert.match(styles, /\.admin-subadmin-confirmation/);
  assert.match(styles, /\.admin-subadmin-feedback/);
  assert.match(styles, /\.admin-subadmin-delete-confirmation/);
  assert.match(styles, /\.admin-overview-insight-grid/);
  assert.match(styles, /grid-template-areas:[\s\S]*"insights health"[\s\S]*"rules health"/);
  assert.doesNotMatch(styles, /\.admin-overview-student-rate|\.admin-overview-rate-track|\.admin-overview-class-list/);
  assert.match(styles, /\.admin-ticket-requester/);
});

test("login and recovery map safe fieldErrors to their concrete controls", async () => {
  const app = await source("portal-app.tsx");
  assert.match(app, /controlId="login-account"[\s\S]*userFacingFieldError\(loginError, "account", "email"\)/);
  assert.match(app, /controlId="login-password"[\s\S]*userFacingFieldError\(loginError, "password"\)/);
  assert.doesNotMatch(app, /controlId="recovery-organization"/);
  assert.doesNotMatch(app, /onOrganizationCodeChange/);
  assert.match(app, /controlId="recovery-email"[\s\S]*userFacingFieldError\(error, "account", "email"\)/);
  assert.match(app, /controlId="recovery-code"[\s\S]*userFacingFieldError\(error, "verificationCode", "code"\)/);
  assert.match(app, /controlId="recovery-password-confirmation"[\s\S]*userFacingFieldError\(error, "passwordConfirmation"\)/);
  assert.doesNotMatch(app, /controlId="password-settings-organization"/);
  assert.match(app, /controlId="password-settings-email"[\s\S]*userFacingFieldError\(error, "account", "email"\)/);
  assert.match(app, /controlId="password-settings-code"[\s\S]*userFacingFieldError\(error, "verificationCode", "code"\)/);
  assert.match(app, /controlId="password-settings-confirmation"[\s\S]*userFacingFieldError\(error, "passwordConfirmation"\)/);
});

test("authentication boundaries clear both module-level account caches", async () => {
  const [app, profiles, rosterService] = await Promise.all([
    source("portal-app.tsx"),
    source("use-student-profile.ts"),
    source("roster-reconciliation-api-service.ts"),
  ]);
  assert.match(profiles, /export function clearStudentProfileCache\(\)[\s\S]*profileCache\.clear\(\)[\s\S]*pendingProfileLoads\.clear\(\)/);
  assert.match(profiles, /profileCacheEpoch \+= 1/);
  assert.match(profiles, /if \(requestEpoch !== profileCacheEpoch\) return student/);
  assert.match(rosterService, /export function clearRosterReconciliationCache\(\)[\s\S]*contextsByCourse\.clear\(\)[\s\S]*lastAlignmentAtByCourse\.clear\(\)/);
  assert.match(rosterService, /operationEpoch === rosterCacheEpoch/);
  assert.match(app, /function clearPortalAccountCaches\(\)[\s\S]*clearStudentProfileCache\(\)[\s\S]*clearRosterReconciliationCache\(\)/);
  assert.match(app, /const leaveWorkspace = \(clearIdentity: boolean\) => \{\s*clearPortalAccountCaches\(\)/);
});

test("responsive workspace keeps the teacher/admin account entry available", async () => {
  const [css, workspaceCss] = await Promise.all([
    source("globals.css"),
    source("teacher-workspace.css"),
  ]);
  const mobileStart = css.indexOf("@media (max-width: 860px)");
  const mobileEnd = css.indexOf("@media (max-width: 620px)", mobileStart);
  assert.notEqual(mobileStart, -1);
  assert.ok(mobileEnd > mobileStart);
  const mobileRules = css.slice(mobileStart, mobileEnd);
  assert.match(mobileRules, /\.sidebar-bottom \{ display: block;/);
  assert.doesNotMatch(mobileRules, /\.sidebar-bottom\s*\{[^}]*display:\s*none/);
  assert.match(
    workspaceCss,
    /\.app-shell-tabbed-workspace \.sidebar-bottom \{\s*display: block;\s*max-width: 360px;/,
  );
  assert.doesNotMatch(
    workspaceCss,
    /\.app-shell-tabbed-workspace \.sidebar-bottom \{\s*display: none;/,
  );
});
