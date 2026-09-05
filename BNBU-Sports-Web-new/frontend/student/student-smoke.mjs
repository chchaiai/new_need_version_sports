// Smoke test for the current API Web student client.
// Exercises the framework-free logic modules (i18n, session policy, API
// projection mapping, proof rules, local store) without a DOM.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// localStorage shim so store.js is testable in Node. Safe with hoisted static
// imports: store.js only touches localStorage inside function bodies.
const memoryStorage = new Map();
globalThis.localStorage = {
  getItem(key) { return memoryStorage.has(key) ? memoryStorage.get(key) : null; },
  setItem(key, value) { memoryStorage.set(key, String(value)); },
  removeItem(key) { memoryStorage.delete(key); },
};

import { t, tx, setLanguage } from "./js/i18n.js";
import {
  canStartExercise, hasSubmittedCheckInToday, startSession, pauseSession,
  resumeSession, sessionDurationMs, creditedHours, formatTimer,
  SESSION_MAX_MILLIS,
} from "./js/session.js";
import { emptyWorkspace, hourText } from "./js/data.js";
import { canNormalizeCapturedImage, mimeEssence, validateProofFile } from "./js/proofs.js";
import {
  ApiError,
  ClientTransportError,
  apiBaseUrl,
  clearApiSession,
  createExemptionApplication,
  createFeedback,
  getActiveSession,
  getClassProgressTarget,
  hasApiSession,
  listMyClassSections,
  listMyActivityCertificationApplications,
  listMyEnrollments,
  listMyFeedback,
  listHelpArticles,
  listMyRecords,
  listMyScores,
  listMyStudentProgress,
  listRecognitionAllocationRevisions,
  logoutApi,
  mapPublishedScore,
  mapClassSectionCheckInTimeWindow,
  mapMediaEvidenceProof,
  mapActivityCertificationMembership,
  mapServerRecord,
  mapServerStudent,
  deriveStudentStatus,
  mapStudentScoreProgress,
  mapStudentProgressProjection,
  mapProgressTarget,
  mapStructuredOrganizationMembership,
  mapStructuredExemptionApplication,
  normalizeUploadEtag,
  normalizeSystemModeProjection,
  requestCurrentUserAccountDeletionChallenge,
  confirmCurrentUserAccountDeletion,
  applyMediaVerificationState,
  proxyObjectUrl,
  request,
  safeLogRoute,
  selectCurrentStudentScore,
  selectCurrentStudentProgress,
  storeAuthSession,
  submitExemptionApplication,
  toUserFacingError,
  uploadMediaDraft,
  updateExemptionApplication,
  uploadExemptionApplicationMediaDraft,
} from "./js/api.js";
import { focusFirstInvalidField, userFacingErrorPanel } from "./js/ui.js";
import { enduranceExemptionTypeForGender, renderEnduranceScoring, renderExemption } from "./js/screens/services.js";
import { renderAccountDetails, renderProfile } from "./js/screens/profile.js";
import { dashboardProgressStatusLabel, renderDashboard } from "./js/screens/dashboard.js";
import { renderCourses } from "./js/screens/courses.js";
import { renderContactBinding } from "./js/screens/binding.js";
import { semesterDisplayName } from "./js/semester.js";
import {
  authoritativeCreditedHours,
  capturedRecordingDurationSeconds,
  checkinActions,
  isExactCancelledSession,
  isActiveSessionConflict,
  isRetainedEvidenceLocked,
  reconcileAuthoritativeSession,
  retainedEvidenceStatus,
  videoThumbnailDimensions,
} from "./js/screens/checkin.js";
import { localStore } from "./js/store.js";
import { icon } from "./js/icons.js";
import {
  HELP_CATEGORY_CODES,
  helpCategoryLabel,
  renderHelpMarkdown,
} from "./js/help-content.js";
import {
  LOCAL_PREVIEW_ACCOUNT_ID,
  buildLocalPreviewWorkspace,
  localPreviewEnabled,
  localPreviewRequested,
} from "./js/local-preview.js";
import {
  PUBLIC_REASON_CATALOG,
  SYSTEM_OVERDUE_REASON,
  TEACHER_ACTIONS,
  classifyStudentNotice,
  maintenanceTimingPresentation,
  matchExactPublicReason,
  reasonsForAction,
  resolvePublicReasonModel,
  reviewStageFromRecord,
  toVisibleStudentNotices,
} from "./js/v81-review.js";
const failures = [];
const checks = [];
const checkinScreenSource = await readFile(
  new URL("./js/screens/checkin.js", import.meta.url),
  "utf8",
);
const dashboardScreenSource = await readFile(
  new URL("./js/screens/dashboard.js", import.meta.url),
  "utf8",
);
const coursesScreenSource = await readFile(
  new URL("./js/screens/courses.js", import.meta.url),
  "utf8",
);
const gradesScreenSource = await readFile(
  new URL("./js/screens/grades.js", import.meta.url),
  "utf8",
);
const appSource = await readFile(new URL("./js/app.js", import.meta.url), "utf8");
const bindingScreenSource = await readFile(
  new URL("./js/screens/binding.js", import.meta.url),
  "utf8",
);
const profileScreenSource = await readFile(
  new URL("./js/screens/profile.js", import.meta.url),
  "utf8",
);
const joinScreenSource = await readFile(
  new URL("./js/screens/join.js", import.meta.url),
  "utf8",
);
const notificationsScreenSource = await readFile(
  new URL("./js/screens/notifications.js", import.meta.url),
  "utf8",
);
const servicesScreenSource = await readFile(
  new URL("./js/screens/services.js", import.meta.url),
  "utf8",
);
const supportScreenSource = await readFile(
  new URL("./js/screens/support.js", import.meta.url),
  "utf8",
);
const loginScreenSource = await readFile(
  new URL("./js/screens/login.js", import.meta.url),
  "utf8",
);
const verificationScreenSource = await readFile(
  new URL("./js/screens/verification.js", import.meta.url),
  "utf8",
);
const startupScreenSource = await readFile(
  new URL("./js/screens/startup.js", import.meta.url),
  "utf8",
);
const tokenSource = await readFile(
  new URL("./css/tokens.css", import.meta.url),
  "utf8",
);
const studentIndexSource = await readFile(
  new URL("./index.html", import.meta.url),
  "utf8",
);
const authoritativeOpenApiSource = await readFile(
  new URL("../../portal-teacher-admin/openapi/openapi.snapshot.yaml", import.meta.url),
  "utf8",
);
const check = (name, fn) => {
  checks.push({ name, fn });
};

async function runCheck(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL - ${name}: ${error.message}`);
  }
}

const authSession = (suffix, status = "ACTIVE") => ({
  sessionId: `session-${suffix}`,
  accessToken: `access-${suffix}`,
  refreshToken: `refresh-${suffix}`,
  tokenType: "Bearer",
  accessTokenExpiresAt: "2099-01-01T00:00:00Z",
  refreshTokenExpiresAt: "2099-02-01T00:00:00Z",
  user: {
    id: `user-${suffix}`,
    role: "STUDENT",
    status,
    primaryEmailMasked: null,
    emailVerified: status === "ACTIVE",
    version: 1,
  },
});

function studentWorkspaceFixture() {
  const workspace = emptyWorkspace();
  workspace.student = {
    ...workspace.student,
    id: "student-fixture",
    name: "学生测试账号",
    email: "student@example.edu",
    emailVerified: true,
    status: "ACTIVE",
    gender: "female",
    gradeLevel: "sophomore",
    admissionYear: 2024,
    currentAcademicYear: "2025-2026 学年",
  };
  workspace.courses = [{
    id: "course-fixture", name: "大学体育（羽毛球）", teacherId: "teacher-fixture",
    teacher: "教师测试账号", isCurrent: true, enrollmentStatus: "enrolled", status: "active",
  }];
  workspace.exemptions = [{
    id: "exemption-800m-2026", type: "800m", status: "审核中",
    reason: "因踝关节扭伤申请本学期 800 米测试缓测。",
    createdAt: "2026-07-21 11:05", reviewComment: "已收到校医院证明，正在审核。",
    proofFiles: [{ name: "medical_certificate.jpg", source: "blob:exemption-proof-test" }],
  }];
  return workspace;
}

check("student persists the complete versioned refresh session", () => {
  clearApiSession();
  storeAuthSession(authSession("persisted"));
  const persisted = JSON.parse(memoryStorage.get("bnbu.student.web.apiTokens"));
  assert.equal(persisted.schemaVersion, 2);
  assert.equal(persisted.sessionId, "session-persisted");
  assert.equal(persisted.accessTokenExpiresAt, "2099-01-01T00:00:00Z");
  assert.equal(persisted.refreshTokenExpiresAt, "2099-02-01T00:00:00Z");
  assert.equal(persisted.userId, "user-persisted");
  assert.equal(hasApiSession(), true);
  clearApiSession();
});

check("student rejects malformed or refresh-expired persisted sessions", () => {
  clearApiSession();
  memoryStorage.set("bnbu.student.web.apiTokens", "{not-json");
  assert.equal(hasApiSession(), false);
  assert.equal(memoryStorage.has("bnbu.student.web.apiTokens"), false);

  memoryStorage.set("bnbu.student.web.apiTokens", JSON.stringify({
    schemaVersion: 2,
    sessionId: "expired-session",
    accessToken: "expired-access",
    refreshToken: "expired-refresh",
    accessTokenExpiresAt: "2099-01-01T00:00:00Z",
    refreshTokenExpiresAt: "2000-01-01T00:00:00Z",
    userId: "expired-user",
  }));
  assert.equal(hasApiSession(), false);
  assert.equal(memoryStorage.has("bnbu.student.web.apiTokens"), false);
});

check("temporary student startup failure preserves the persisted session", async () => {
  clearApiSession();
  storeAuthSession(authSession("temporary-failure"));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("synthetic offline");
  };
  try {
    await assert.rejects(
      request("/me"),
      (error) => error instanceof ClientTransportError,
    );
    assert.equal(hasApiSession(), true);
    assert.equal(memoryStorage.has("bnbu.student.web.apiTokens"), true);
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("disabled student account clears the persisted session", async () => {
  clearApiSession();
  storeAuthSession(authSession("disabled-account"));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json(
    { code: "AUTH_ACCOUNT_DISABLED", message: "disabled" },
    { status: 403 },
  );
  try {
    await assert.rejects(
      request("/me"),
      (error) => error instanceof ApiError && error.code === "AUTH_ACCOUNT_DISABLED",
    );
    assert.equal(hasApiSession(), false);
    assert.equal(memoryStorage.has("bnbu.student.web.apiTokens"), false);
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("i18n resolves zh by default and en after switch", () => {
  setLanguage("zh");
  assert.equal(t("navigation_dashboard"), "首页");
  assert.equal(tx("你好", "Hello"), "你好");
  setLanguage("en");
  assert.equal(t("navigation_dashboard"), "Home");
  assert.equal(t("notification_unread_count", 3), "3 unread");
  setLanguage("zh");
});


check("semester presentation preserves the administrator-managed name", () => {
  assert.equal(semesterDisplayName({
    displayName: "2026-2027 第一学期",
    academicYear: "2026-2027",
    termCode: "FIRST",
  }), "2026-2027 第一学期");
  assert.equal(semesterDisplayName({
    academicYear: "2025-2026",
    termCode: "SUMMER",
  }), "2025-2026 暑期学期");
});


check("student login keeps real-account testing and gates local UI preview", () => {
  assert.match(loginScreenSource, /config\?\.appEnv === "local"/u);
  assert.match(loginScreenSource, /login\.testEntry/u);
  assert.match(loginScreenSource, /login\.localReview/u);
  assert.match(loginScreenSource, /学生端测试入口/u);
  assert.match(loginScreenSource, /本地界面预览/u);
  assert.match(loginScreenSource, /真实学生账号和邮箱验证码登录/u);
  assert.equal(localPreviewEnabled({ appEnv: "local" }, "127.0.0.1"), true);
  assert.equal(localPreviewEnabled({ appEnv: "production" }, "127.0.0.1"), false);
  assert.equal(localPreviewEnabled({ appEnv: "staging" }, "localhost"), false);
  assert.equal(localPreviewEnabled({ appEnv: "qa" }, "127.0.0.1"), false);
  assert.equal(localPreviewEnabled({ appEnv: "unknown" }, "sports.example"), false);
  assert.equal(localPreviewRequested("?preview=student"), true);
  assert.equal(localPreviewRequested("?mock=student"), true);
  assert.equal(localPreviewRequested("?sysmode=normal"), false);
  assert.match(appSource, /enterLocalPreview/u);
  assert.doesNotMatch(appSource, /reviewMode|demoAccount|demo-session/u);
  assert.doesNotMatch(checkinScreenSource, /checkin\.addMockPhoto|添加 Mock 照片/u);
  assert.doesNotMatch(checkinScreenSource, /Mock Session|增加 60 分钟|checkin\.add60/u);
  assert.doesNotMatch(servicesScreenSource, /mockEnduranceConversion/u);
  assert.doesNotMatch(servicesScreenSource, /exemption\.addMockProof|添加 Mock 证明/u);
  assert.doesNotMatch(supportScreenSource, /mockPublishedHelpArticles|mock-feedback-/u);
  assert.doesNotMatch(bindingScreenSource, /mock-email-verification|Mock 邮箱验证成功/u);
  assert.doesNotMatch(profileScreenSource, /mock-account-deletion/u);
  assert.match(profileScreenSource, /app\.logout\(\{ clearAccountData: true \}\)/u);
  assert.match(checkinScreenSource, /本地预览不提交/u);
});

check("local UI preview workspace is labeled and does not invent student scores", () => {
  const workspace = buildLocalPreviewWorkspace();
  assert.equal(workspace.student.id, LOCAL_PREVIEW_ACCOUNT_ID);
  assert.equal(workspace.student.status, "ACTIVE");
  assert.equal(workspace.grades.totalScore, null);
  assert.equal(workspace.grades.enduranceRunScore, null);
  assert.equal(workspace.grades.enduranceRunStatus, "recorded");
  assert.ok(workspace.courses.some((course) => course.isCurrent && course.enrollmentStatus === "enrolled"));
  assert.ok(workspace.notices.some((notice) => /成绩|总分|等级/.test(`${notice.title}${notice.message}`)));
  const html = renderDashboard({
    state: { workspace },
    unreadNoticeCount: () => workspace.notices.filter((notice) => notice.isUnread).length,
    hasActiveEnrollment: () => true,
  });
  assert.match(html, /630 分钟/u);
  assert.match(html, /1200 分钟/u);
  assert.doesNotMatch(html, />10\.5h</u);
});

check("check-in sport icons share one stroke set and keep each activity recognizable", () => {
  assert.match(checkinScreenSource, /class="sport-grid"/u);
  assert.match(checkinScreenSource, /icon: "sport-running"/u);
  assert.match(checkinScreenSource, /icon: "sport-badminton"/u);
  assert.match(checkinScreenSource, /icon: "sport-table-tennis"/u);
  assert.match(checkinScreenSource, /icon: "sport-other"/u);
  assert.doesNotMatch(checkinScreenSource, /value: "(cricket|tennis|volleyball|yoga|jump-rope)"/u);
  assert.match(checkinScreenSource, /value: "running"/u);
  assert.match(checkinScreenSource, /value: OTHER/u);
  for (const name of [
    "sport-running", "sport-basketball", "sport-football", "sport-badminton",
    "sport-table-tennis", "sport-swimming", "sport-fitness", "sport-cycling", "sport-other",
  ]) {
    const svg = icon(name, 24);
    assert.match(svg, /stroke="currentColor"/u);
    assert.match(svg, /stroke-width="2"/u);
    assert.match(svg, /<svg /u);
  }
});

check("time window evaluator blocks unavailable policy", () => {
  const reason = canStartExercise({ windowMode: "unavailable", dailyStartTime: "", dailyEndTime: "", excludedDates: [] });
  assert.ok(reason && reason.length > 0);
  const open = canStartExercise({ windowMode: "semester_wide", dailyStartTime: "00:00", dailyEndTime: "23:59", excludedDates: [], dateRangeStart: null, dateRangeEnd: null, semesterDeadline: null });
  assert.equal(open, null);
  const allDay = canStartExercise({ windowMode: "semester_wide", dailyStartTime: null, dailyEndTime: null, excludedDates: [], dateRangeStart: null, dateRangeEnd: null, semesterDeadline: null });
  assert.equal(allDay, null);
});

check("class check-in window preserves the teacher's backend values without fixed fallbacks", () => {
  assert.deepEqual(mapClassSectionCheckInTimeWindow({
    checkInWindowMode: "AVAILABLE",
    checkInStartDate: "2026-09-01",
    checkInEndDate: "2026-12-20",
    dailyStartTime: "06:30:00",
    dailyEndTime: "21:45:00",
    excludedDates: ["2026-10-01"],
    submissionDeadlineAt: "2026-12-20T15:59:59Z",
  }), {
    windowMode: "semester_wide",
    dateRangeStart: "2026-09-01",
    dateRangeEnd: "2026-12-20",
    dailyStartTime: "06:30",
    dailyEndTime: "21:45",
    excludedDates: ["2026-10-01"],
    semesterDeadline: "2026-12-20",
  });
  const allDay = mapClassSectionCheckInTimeWindow({ checkInWindowMode: "AVAILABLE" });
  assert.equal(allDay.dailyStartTime, null);
  assert.equal(allDay.dailyEndTime, null);
});

check("server progress and teacher targets map seconds to real student hours", () => {
  const enrollment = { id: "enrollment-current" };
  const section = { id: "section-current" };
  const semester = { id: "semester-current" };
  const rows = [{
    id: "progress-current",
    enrollmentId: enrollment.id,
    classSectionId: section.id,
    semesterId: semester.id,
    courseRelated: { targetSeconds: 28_800, validExerciseSeconds: 21_600 },
    general: { targetSeconds: 43_200, validExerciseSeconds: 18_000 },
    totalCreditedSeconds: 39_600,
    status: "IN_PROGRESS",
  }];
  const selected = selectCurrentStudentProgress(rows, enrollment, section, semester);
  assert.equal(selected.id, "progress-current");
  assert.deepEqual(mapStudentProgressProjection(selected), {
    course: 6,
    general: 5,
    rawCourse: 6,
    rawGeneral: 5,
    totalValidHours: 11,
    qualificationStatus: "NOT_QUALIFIED",
    scoreAvailable: true,
  });
  assert.deepEqual(mapProgressTarget(null, selected, null), {
    total: 20,
    courseRequired: 8,
    generalRequired: 12,
    dailyLimit: null,
    categoryAllocationMode: "CATEGORY_TARGETS",
    source: "student-progress",
  });
  assert.deepEqual(mapProgressTarget(null, null), {
    total: null,
    courseRequired: null,
    generalRequired: null,
    dailyLimit: null,
    categoryAllocationMode: "TOTAL_ONLY",
    source: null,
  });
});

check("dashboard keeps the full backend total and never invents a missing target", () => {
  const html = renderDashboard({
    state: {
      workspace: {
        student: { id: "student-1", name: "测试学生", status: "ACTIVE" },
        records: [],
        progress: {
          totalValidHours: 26,
          course: 14,
          general: 12,
          qualificationStatus: null,
          status: "已按有效打卡累计",
        },
        hourRule: {
          total: null,
          courseRequired: null,
          generalRequired: null,
        },
        checkInTimeWindow: {
          windowMode: "semester_wide",
          dailyStartTime: null,
          dailyEndTime: null,
          excludedDates: [],
          dateRangeStart: null,
          dateRangeEnd: null,
          semesterDeadline: null,
        },
        courseJoinRequest: null,
      },
    },
    unreadNoticeCount: () => 0,
    hasActiveEnrollment: () => true,
  });
  assert.match(html, />1560 分钟</u);
  assert.match(html, /待后端同步/u);
  assert.match(html, /老师设置为全天可打卡/u);
  assert.match(html, /进行中/u);
  assert.doesNotMatch(html, /1200 分钟/u);
  assert.doesNotMatch(html, />26h</u);
});

check("system mode opens only for an explicit NORMAL projection", async () => {
  assert.deepEqual(normalizeSystemModeProjection({
    mode: "NORMAL",
    policyVersion: 7,
    updatedAt: "2026-08-31T00:00:00Z",
  }), {
    mode: "NORMAL",
    policyVersion: 7,
    updatedAt: "2026-08-31T00:00:00Z",
  });
  assert.equal(normalizeSystemModeProjection({ mode: "MAINTENANCE" }).mode, "MAINTENANCE");
  assert.equal(normalizeSystemModeProjection({ mode: "READ_ONLY" }).mode, "MAINTENANCE");
  assert.equal(normalizeSystemModeProjection(null).mode, "MAINTENANCE");

  const { qaSystemModeOverride, shouldQuerySystemMode } = await import("./js/app.js");
  assert.equal(shouldQuerySystemMode({ hostname: "sports.example", appEnv: "production" }), true);
  assert.equal(shouldQuerySystemMode({ hostname: "127.0.0.1", appEnv: "unknown" }), false);
  assert.equal(shouldQuerySystemMode({ hostname: "127.0.0.1", appEnv: "local" }), true);
  assert.equal(qaSystemModeOverride("production", "maintenance"), null);
  assert.equal(qaSystemModeOverride("local", "maintenance"), "maintenance");
  assert.equal(qaSystemModeOverride("qa", "maintenance"), "maintenance");
  assert.equal(qaSystemModeOverride("qa", "unknown"), null);
  assert.equal(shouldQuerySystemMode({ hostname: "sports.example", appEnv: "production", override: qaSystemModeOverride("production", "maintenance") }), true);
  assert.equal(shouldQuerySystemMode({ hostname: "sports.example", appEnv: "qa", override: qaSystemModeOverride("qa", "maintenance") }), false);
  assert.equal(shouldQuerySystemMode({ hostname: "127.0.0.1", appEnv: "local", override: qaSystemModeOverride("local", "normal") }), false);
});

check("dashboard progress state follows active membership", () => {
  setLanguage("zh");
  assert.equal(dashboardProgressStatusLabel("ACTIVE", "本地测试"), "进行中");
  assert.equal(dashboardProgressStatusLabel("PENDING", "IN_PROGRESS"), "已退班");
  assert.equal(dashboardProgressStatusLabel("ACTIVE", "QUALIFIED"), "已达标");
});

check("course detail omits related exercise records", () => {
  setLanguage("zh");
  const html = renderCourses({
    ui: { courses: { selectedCourseId: "course-1" } },
    state: {
      workspace: {
        courses: [{
          id: "course-1",
          name: "大学体育（羽毛球）",
          teacher: "陈宇航",
          academicYear: "2025-2026",
          term: "第二学期",
          semester: "2025-2026 第二学期",
          enrollmentStatus: "enrolled",
          isCurrent: true,
        }],
        records: [{ id: "record-should-not-render", taskTitle: "不应显示的运动记录" }],
      },
    },
  });
  assert.match(html, /大学体育（羽毛球）/u);
  assert.match(html, /陈宇航/u);
  assert.match(html, /开课学期[\s\S]*2025-2026 第二学期/u);
  assert.doesNotMatch(html, /2025-2026\s*·\s*第二学期/u);
  assert.doesNotMatch(html, /不应显示的运动记录|相关记录|暂无相关记录/u);
  assert.doesNotMatch(coursesScreenSource, /courseRecordCard|workspace\.records\.filter/u);
});

check("session timing: pause/resume, 2h cap, credited hours", () => {
  const t0 = 1_000_000;
  let session = startSession({ creditType: "general", sportType: "running" }, t0);
  assert.equal(session.phase, "active");
  session = pauseSession(session, t0 + 10 * 60_000);
  assert.equal(sessionDurationMs(session, t0 + 60 * 60_000), 10 * 60_000);
  session = resumeSession(session, t0 + 20 * 60_000);
  const at3h = sessionDurationMs(session, t0 + 200 * 60_000);
  assert.equal(at3h, SESSION_MAX_MILLIS);
  assert.equal(creditedHours(59 * 60_000), 1);
  assert.equal(creditedHours(2 * 60 * 60_000), 2);
  assert.equal(formatTimer(3_723_000), "01:02:03");
});

check("profile mirrors the Android account-card hierarchy and instant service navigation stays scoped", () => {
  assert.doesNotMatch(dashboardScreenSource, /分类仅用于展示/u);
  assert.doesNotMatch(gradesScreenSource, /课程相关与其他运动仅作分类展示/u);
  const profileHtml = renderProfile({ state: { workspace: studentWorkspaceFixture() } });
  assert.match(profileHtml, /status-badge filled[^>]*>已进班</u);
  assert.match(profileHtml, /profile-facts[\s\S]*student-fixture[\s\S]*profile-facts-row/u);
  assert.doesNotMatch(profileHtml, /LOCAL-REVIEW-STUDENT/u);
  assert.match(appSource, /INSTANT_SUB_SCREENS = new Set\(\["settings", "exemption", "endurance"\]\)/u);
  assert.match(checkinScreenSource, /capturedDurationSeconds[\s\S]*readVideoPreview/u);
  assert.match(checkinScreenSource, /recordingStartedAt = Date\.now\(\)/u);
});

check("exemption form mirrors Android fields and accepted Contract limits", () => {
  setLanguage("zh");
  const app = {
    state: { workspace: studentWorkspaceFixture() },
    ui: {},
    isApiMode: () => true,
    isWriteAllowed: () => true,
  };
  renderExemption(app, {});
  app.ui.exemption.tab = "new";
  const html = renderExemption(app, {});
  assert.match(html, /800m 耐力跑免测/u);
  assert.match(html, /0 \/ 20 张图片/u);
  assert.match(html, /请只填写审核所需信息，避免加入无关敏感资料/u);
  assert.match(html, /必填：至少上传一张耐力跑免测 JPEG 或 PNG 证明图片/u);
  assert.match(html, /accept="image\/jpeg,image\/png"/u);
  assert.doesNotMatch(html, /accept="[^"]*(?:application\/pdf|video\/)/u);
  assert.doesNotMatch(html, /添加 Mock 证明|exemption\.addMockProof|至少 2 个字符/u);
});

check("exemption detail mirrors the Android information hierarchy", () => {
  setLanguage("zh");
  const app = {
    state: { workspace: studentWorkspaceFixture() },
    ui: {},
    isApiMode: () => true,
    isWriteAllowed: () => true,
  };
  const html = renderExemption(app, { targetId: "exemption-800m-2026" });
  assert.match(html, /exemption-detail-hero[\s\S]*申请详情[\s\S]*800m 免测[\s\S]*审核中/u);
  assert.match(html, /申请信息[\s\S]*申请理由[\s\S]*因踝关节扭伤申请本学期 800 米测试缓测。[\s\S]*提交时间[\s\S]*2026-07-21 11:05/u);
  assert.match(html, /证明材料[\s\S]*1 张图片[\s\S]*data-exemption-proof-thumbnail="1"[\s\S]*<img[\s\S]*medical_certificate\.jpg[\s\S]*证明图片 1/u);
  assert.match(html, /处理意见[\s\S]*当前处理意见[\s\S]*已收到校医院证明，正在审核。/u);
  assert.doesNotMatch(html, /medical_note\.pdf|application\/pdf/u);
});

check("course and independent exercise descriptions are both required", () => {
  assert.doesNotMatch(checkinScreenSource, /运动说明（选填）|课程运动说明可不填写|Exercise description \(optional\)|Course exercise description is optional/u);
  assert.match(checkinScreenSource, /fieldControlAttrs\(\{ id: "checkin-description"[\s\S]*required: true/u);
  assert.match(checkinScreenSource, /data-input="checkin\.description" required/u);
  assert.match(checkinScreenSource, /const normalizedDescription = \(details\.description \|\| ""\)\.trim\(\)/u);
  assert.match(checkinScreenSource, /description: details\.description/u);
  assert.doesNotMatch(checkinScreenSource, /description: \(details\.description \|\| ""\)\.trim\(\) \|\| null/u);
});

check("account details show gender and endurance exemption distance follows it", () => {
  setLanguage("zh");
  const accountHtml = renderAccountDetails({
    state: {
      workspace: {
        student: {
          name: "本地测试学生",
          id: "LOCAL-REVIEW-STUDENT",
          gender: "female",
          className: "免登录审查测试班",
          admissionYear: 2024,
          gradeLevel: "sophomore",
          currentAcademicYear: "2025-2026 学年",
        },
      },
    },
  });
  assert.match(accountHtml, /性别/u);
  assert.match(accountHtml, />女</u);
  assert.equal(enduranceExemptionTypeForGender("female"), "800m");
  assert.equal(enduranceExemptionTypeForGender("FEMALE"), "800m");
  assert.equal(enduranceExemptionTypeForGender("male"), "1000m");
  assert.equal(enduranceExemptionTypeForGender("MALE"), "1000m");
  assert.equal(enduranceExemptionTypeForGender(""), null);
});

check("live camera duration uses the measured recording interval", () => {
  assert.equal(capturedRecordingDurationSeconds(1_000, 6_250), 5.25);
  assert.equal(capturedRecordingDurationSeconds(1_000, 99_000), 15);
  assert.equal(capturedRecordingDurationSeconds(1_000, 9_250, 3_000), 5.25);
  assert.match(checkinScreenSource, /"checkin\.cameraPauseVideo":/u);
  assert.match(checkinScreenSource, /"checkin\.cameraResumeVideo":/u);
  assert.match(checkinScreenSource, /"checkin\.cameraRetakeVideo":/u);
  assert.deepEqual(videoThumbnailDimensions(1920, 1080), { width: 640, height: 360 });
  assert.deepEqual(videoThumbnailDimensions(480, 640), { width: 480, height: 640 });
  assert.match(checkinScreenSource, /thumbnailUrl = preview\.thumbnailUrl/u);
  assert.match(checkinScreenSource, /data-proof-preview-video/u);
  assert.match(checkinScreenSource, /requestAnimationFrame\(\(\) => attachDraftVideoPreview\(app\)\)/u);
});

check("help categories stay aligned with the published projection", () => {
  setLanguage("zh");
  assert.deepEqual(HELP_CATEGORY_CODES, [
    "login", "enrollment", "checkin", "evidence", "course", "exemption",
    "organization", "notification", "maintenance", "feedback",
  ]);
  assert.equal(helpCategoryLabel("checkin"), "打卡与学时");
  assert.match(supportScreenSource, /app\.ui\.help\.locale !== locale/u);
});

check("help Markdown renders formatting while escaping administrator HTML", () => {
  const html = renderHelpMarkdown("# 提交步骤\n\n1. **核对课程**\n2. 上传 `凭证`\n\n> 提交前检查\n\n<script>alert(1)</script>");
  assert.match(html, /<h3>提交步骤<\/h3>/u);
  assert.match(html, /<ol><li><strong>核对课程<\/strong><\/li><li>上传 <code>凭证<\/code><\/li><\/ol>/u);
  assert.match(html, /<blockquote>提交前检查<\/blockquote>/u);
  assert.doesNotMatch(html, /<script>/u);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/u);
});

check("published help API requests the current-language non-paginated projection", async () => {
  const originalFetch = globalThis.fetch;
  setLanguage("zh");
  globalThis.fetch = async (input) => {
    const url = new URL(String(input), "http://localhost");
    assert.equal(url.pathname, "/api/v1/help-articles");
    assert.equal(url.searchParams.get("locale"), "zh-CN");
    assert.equal(url.searchParams.has("limit"), false);
    assert.equal(url.searchParams.has("cursor"), false);
    return Response.json({
      data: [{
        id: "help-1", category: "checkin", locale: "zh-CN", title: "帮助",
        bodyMarkdown: "正文", publishedAt: "2026-08-11T00:00:00Z", version: 1,
      }],
      meta: { requestId: "help-list" },
    });
  };
  try {
    const articles = await listHelpArticles();
    assert.equal(articles.length, 1);
    assert.equal(articles[0].bodyMarkdown, "正文");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

check("daily submission observation follows the Beijing business day", () => {
  // This helper is display-only. The Backend alone authorizes a submission
  // from organization timezone and startedAt-derived businessDate.
  // This instant is still 2026-07-29 in the Americas, already 07-30 in Beijing.
  const now = new Date("2026-07-29T16:00:00Z");
  const workspace = {
    records: [{ creditType: "general", businessDate: "2026-07-30" }],
  };
  assert.equal(hasSubmittedCheckInToday(workspace, now), true);
  workspace.records[0].businessDate = "2026-07-29";
  assert.equal(hasSubmittedCheckInToday(workspace, now), false);
});

check("daily client observation never hard-blocks a backend-authorized submission", () => {
  assert.doesNotMatch(
    checkinScreenSource,
    /if\s*\(hasSubmittedCheckInToday\(workspace\)\)\s*\{\s*return\s*\{\s*canStart:\s*false/u,
  );
  assert.doesNotMatch(dashboardScreenSource, /!hasCheckedIn\s*\?\s*`/u);
  assert.match(checkinScreenSource, /Backend remains authoritative/u);
});

check("hourText matches Kotlin Double.hourText()", () => {
  assert.equal(hourText(2), "2h");
  assert.equal(hourText(1.5), "1.5h");
});

check("time window blocks excluded dates and passed deadlines", () => {
  // 2026-07-29 04:00 UTC = 2026-07-29 12:00 Asia/Shanghai.
  const now = new Date(Date.UTC(2026, 6, 29, 4, 0, 0));
  const base = {
    windowMode: "semester_wide", dailyStartTime: "00:00", dailyEndTime: "23:59",
    excludedDates: [], dateRangeStart: null, dateRangeEnd: null, semesterDeadline: null,
  };
  assert.equal(canStartExercise(base, now), null);
  const excluded = canStartExercise({ ...base, excludedDates: ["2026-07-29"] }, now);
  assert.ok(excluded && excluded.length > 0);
  const pastDeadline = canStartExercise({ ...base, semesterDeadline: "2026-07-28" }, now);
  assert.ok(pastDeadline && pastDeadline.includes("2026-07-28"));
});

check("proof rules follow the exact current API media allowlist", () => {
  assert.equal(mimeEssence("video/webm;codecs=vp8,opus"), "video/webm");
  assert.deepEqual(validateProofFile({ type: "image/jpeg", size: 100 }, "image"), {
    ok: true, extension: "jpg", mimeType: "image/jpeg", durationSeconds: null,
  });
  assert.deepEqual(validateProofFile({ type: "image/png", size: 100 }, "image"), {
    ok: true, extension: "png", mimeType: "image/png", durationSeconds: null,
  });
  assert.equal(canNormalizeCapturedImage({ name: "capture.HEIC", type: "" }), true);
  assert.equal(canNormalizeCapturedImage({ name: "capture.webp", type: "image/webp" }), true);
  assert.deepEqual(validateProofFile({ type: "image/webp", size: 100 }, "image"), { ok: false, error: "format" });
  assert.deepEqual(validateProofFile({ type: "image/jpeg", size: 10_485_761 }, "image"), { ok: false, error: "size" });

  const webm = validateProofFile({ type: "video/webm;codecs=vp8,opus", size: 100 }, "video", { durationSeconds: 14.1 });
  assert.deepEqual(webm, { ok: true, extension: "webm", mimeType: "video/webm", durationSeconds: 15 });
  for (const type of ["video/mp4", "video/quicktime", "video/3gpp", "video/webm"]) {
    assert.equal(validateProofFile({ type, size: 100 }, "video", { durationSeconds: 15 }).ok, true);
  }
  assert.deepEqual(validateProofFile({ type: "video/x-matroska", size: 100 }, "video", { durationSeconds: 10 }), { ok: false, error: "format" });
  assert.deepEqual(validateProofFile({ name: "capture.mov", type: "", size: 100 }, "video", { durationSeconds: 10 }), { ok: false, error: "format" });
  assert.deepEqual(validateProofFile({ type: "video/mp4", size: 100 }, "video", { durationSeconds: 15.4 }), { ok: false, error: "duration" });
  assert.deepEqual(validateProofFile({ type: "video/mp4", size: 100 }, "video", { durationSeconds: null }), { ok: false, error: "duration" });
  assert.deepEqual(validateProofFile({ type: "video/mp4", size: 0 }, "video", { durationSeconds: 10 }), { ok: false, error: "empty" });
  assert.equal(validateProofFile({ type: "video/mp4", size: 536_870_913 }, "video", { durationSeconds: 10 }).ok, true);
});

check("check-in proof UI follows the Android preview-then-delete flow", () => {
  assert.match(checkinScreenSource, /data-action="checkin\.previewDraft"/u);
  assert.match(checkinScreenSource, /data-action="checkin\.closeDraftPreview"/u);
  assert.match(checkinScreenSource, /正式提交开始前，可以删除不合适的照片或视频/u);
  assert.match(checkinScreenSource, /ui\.finish\.submitting \|\| isRetainedEvidenceLocked\(draft\)/u);
  assert.match(checkinScreenSource, /删除后可重新拍摄/u);
  assert.doesNotMatch(checkinScreenSource, /checkin\.retakeDraft|pendingRetakeId|拍照并保留|结束并保留/u);
});

check("check-in stages follow the Android information hierarchy", () => {
  for (const copy of [
    "本次运动",
    "已拍摄素材",
    "拍摄完成后，照片和视频会立即显示在这里",
    "本次打卡凭证",
    "至少拍摄 1 项，当前保留素材会全部提交",
    "当前保留的照片和视频会全部作为本次打卡凭证提交",
    "提交确认",
  ]) {
    assert.match(checkinScreenSource, new RegExp(copy, "u"));
  }
  assert.doesNotMatch(
    checkinScreenSource,
    /checkin-truth-confirmation|finish\.confirmed|"checkin\.confirm"|必须确认后才能提交/u,
  );
  assert.match(
    checkinScreenSource,
    /data-action="checkin\.submit" \$\{!ui\.finish\.submitting && app\.isWriteAllowed\(\)/u,
  );
  assert.match(
    checkinScreenSource,
    /durationMs < SESSION_MIN_CREDIT_MILLIS \? 0 : creditedHours\(durationMs\)/u,
  );
  assert.match(
    checkinScreenSource,
    /计入由服务端按整分钟、课程门槛和 60 分钟封顶计算/u,
  );
  assert.match(checkinScreenSource, /30 分钟门槛/u);
  assert.match(checkinScreenSource, /45 分钟门槛/u);
  assert.match(checkinScreenSource, /60 分钟封顶/u);
  assert.match(checkinScreenSource, /creditPolicyChips\(workspace.creditPolicy\)/u);
  assert.match(checkinScreenSource, /data-action="checkin.submitProof"/u);
  assert.match(checkinScreenSource, /提交补证/u);
  assert.match(checkinScreenSource, /data-timer-hours>\$\{estimatedCreditedHours\(duration\)\}h/u);
  assert.match(checkinScreenSource, /hoursEl\.textContent = `\$\{estimatedCreditedHours\(duration\)\}h`/u);
});

check("a student can preview and delete one local proof before submission", () => {
  let renderCount = 0;
  const app = {
    ui: {
      checkin: {
        finish: { submitting: false },
        drafts: [
          { id: "local-proof", type: "image", url: "data:image/jpeg;base64,AA==" },
          { id: "locked-proof", type: "video", url: "data:video/webm;base64,AA==", mediaId: "media-1" },
        ],
      },
    },
    state: { dialog: null },
    render() { renderCount += 1; },
    showDialog(dialog) { this.state.dialog = dialog; this.render(); },
  };

  checkinActions["checkin.previewDraft"](app, { dataset: { draftId: "local-proof" } });
  assert.equal(app.ui.checkin.previewDraftId, "local-proof");
  checkinActions["checkin.deleteDraft"](app, { dataset: { draftId: "local-proof" } });
  assert.equal(app.ui.checkin.previewDraftId, null);
  assert.equal(app.state.dialog.title, "删除该凭证？");
  checkinActions["checkin.deleteDraftConfirm"](app, { dataset: { draftId: "local-proof" } });
  assert.deepEqual(app.ui.checkin.drafts.map((draft) => draft.id), ["locked-proof"]);

  app.state.dialog = null;
  checkinActions["checkin.deleteDraft"](app, { dataset: { draftId: "locked-proof" } });
  assert.equal(app.state.dialog, null);
  assert.ok(renderCount >= 3);
});

check("/me mapping uses the current API masked email and verification fields", () => {
  const student = mapServerStudent(
    { user: { primaryEmailMasked: "s***@example.edu", emailVerified: true, version: 4, status: "ACTIVE" } },
    { studentNumber: "00001234", fullName: "Synthetic Student", gender: "FEMALE", gradeYear: 2026, collegeName: null, administrativeClassName: null },
    { academicYear: "2026-2027" },
    "ACTIVE",
  );
  assert.equal(student.id, "00001234");
  assert.equal(student.email, "s***@example.edu");
  assert.equal(student.emailVerified, true);
  assert.equal(student.userVersion, 4);
  assert.equal(student.status, "ACTIVE");
});

check("student membership state is ACTIVE only while enrolled, otherwise PENDING", () => {
  assert.equal(deriveStudentStatus([{ status: "ACTIVE" }]), "ACTIVE");
  assert.equal(deriveStudentStatus([{ enrollmentStatus: "enrolled" }]), "ACTIVE");
  assert.equal(deriveStudentStatus([{ status: "WITHDRAWN" }]), "PENDING");
  assert.equal(deriveStudentStatus([]), "PENDING");
});

check("a submitted record is valid on arrival and credits the server's hours", () => {
  // current API: /submit atomically appends the system ReviewRecord v1
  // (result VALID, teacherId null) and the record becomes REVIEWED.
  const record = mapServerRecord({
    id: "record-1", status: "REVIEWED", creditType: "GENERAL",
    classSectionId: "section-1", sportType: "RUNNING", sportName: null,
    actualDurationSeconds: 3900, creditedDurationSeconds: 3600,
    businessDate: "2026-08-18", submittedAt: "2026-08-18T02:05:00Z",
    description: "晨跑 5 公里",
    currentReview: { result: "VALID", reasonCode: null, publicComment: null },
  });

  assert.equal(record.reviewResult, "VALID");
  assert.equal(record.hours, 1);
  assert.match(record.teacherPublicFeedback, /记录有效/);
});

check("submission summary never invents credited hours from the local timer", () => {
  assert.equal(authoritativeCreditedHours({ creditedDurationSeconds: 3600 }), 1);
  assert.equal(authoritativeCreditedHours({ creditedDurationSeconds: 0 }), 0);
  assert.equal(authoritativeCreditedHours({}), null);
  assert.equal(authoritativeCreditedHours(null), null);
  assert.doesNotMatch(
    checkinScreenSource,
    /creditedDurationSeconds[^\n]*creditedHours\(session\.activeDurationMillis\)/u,
  );
});

check("a teacher's INVALID verdict reaches the student verbatim", () => {
  const invalidRecord = (creditedDurationSeconds) => mapServerRecord({
    id: "record-2", status: "REVIEWED", creditType: "GENERAL",
    classSectionId: "section-1", sportType: "BADMINTON", sportName: null,
    actualDurationSeconds: 3900, creditedDurationSeconds,
    businessDate: "2026-08-18", submittedAt: "2026-08-18T02:05:00Z",
    description: "羽毛球专项练习",
    currentReview: {
      result: "INVALID", reasonCode: "INSUFFICIENT_EVIDENCE",
      publicComment: "凭证无法证明运动过程，请重新打卡。",
    },
  });

  // 2.0.13 has no way for an INVALID review to zero creditedDurationSeconds
  // (creditedDurationOverrideSeconds is blocked until ADR-047), so a rejected
  // record normally keeps the credit it was submitted with. The client passes
  // the server value through and leaves the exclusion to the review result.
  const stillCredited = invalidRecord(3600);
  assert.equal(stillCredited.reviewResult, "INVALID");
  assert.equal(stillCredited.hours, 1);
  assert.match(stillCredited.teacherPublicFeedback, /凭证无法证明运动过程/);

  // And when the server credits nothing, the client must not invent hours from
  // the actual duration.
  assert.equal(invalidRecord(0).hours, 0);
});

check("published scores read finalScore/baseScore and never invent a zero", () => {
  const published = mapPublishedScore({
    status: "PUBLISHED", finalScore: 86.5, baseScore: 80, adjustmentTotal: 6.5,
  });
  assert.equal(published.totalScore, 86.5);
  assert.equal(published.totalDisplay, "86.5");

  // finalScore is nullable even once PUBLISHED; baseScore is the fallback.
  const baseOnly = mapPublishedScore({
    status: "PUBLISHED", finalScore: null, baseScore: 78, adjustmentTotal: null,
  });
  assert.equal(baseOnly.totalScore, 78);
  assert.equal(baseOnly.totalDisplay, "78");

  // A published 0 is a legal score (DecimalScore has no minimum) and must not
  // be swallowed by a truthiness fallback.
  const publishedZero = mapPublishedScore({
    status: "PUBLISHED", finalScore: 0, baseScore: 80, adjustmentTotal: -80,
  });
  assert.equal(publishedZero.totalScore, 0);
  assert.equal(publishedZero.totalDisplay, "0");

  const pendingCalc = mapPublishedScore({
    status: "PUBLISHED", finalScore: null, baseScore: null, adjustmentTotal: null,
  });
  assert.equal(pendingCalc.totalScore, null);
  assert.equal(pendingCalc.totalDisplay, "待计算");

  const unpublished = mapPublishedScore(null);
  assert.equal(unpublished.totalScore, null);
  assert.equal(unpublished.totalDisplay, "未开放");
});

check("cross-device record media maps from the authoritative evidence context", () => {
  const image = mapMediaEvidenceProof({
    id: "media-image-1",
    mediaType: "IMAGE",
    declaredDurationSeconds: null,
    verifiedDurationSeconds: null,
  }, 0);
  const video = mapMediaEvidenceProof({
    id: "media-video-1",
    mediaType: "VIDEO",
    declaredDurationSeconds: 15,
    verifiedDurationSeconds: 14,
  }, 1);

  assert.deepEqual(image, {
    id: "media-image-1",
    mediaId: "media-image-1",
    type: "image",
    fileName: "运动照片 1",
    durationSeconds: null,
    source: "media:media-image-1",
  });
  assert.equal(video.type, "video");
  assert.equal(video.durationSeconds, 14);
  assert.equal(video.source, "media:media-video-1");
  assert.match(checkinScreenSource, /loadServerRecordProofs\(record\.id\)/);
});

check("authenticated API base stays same-origin and ignores query or persisted overrides", () => {
  memoryStorage.set("bnbu.student.web.apiBase", "https://attacker.example/api/v1");
  globalThis.location = { search: "?api=https%3A%2F%2Fattacker.example%2Fapi%2Fv1" };
  assert.equal(apiBaseUrl(), "/api/v1");
  delete globalThis.location;
  memoryStorage.delete("bnbu.student.web.apiBase");
});

check("only explicit loopback MinIO URLs with valid ports use the same-origin proxy", () => {
  assert.equal(proxyObjectUrl("http://127.0.0.1:19000/sports/object?signature=ok"), "/minio/sports/object?signature=ok");
  assert.equal(proxyObjectUrl("https://localhost:49152/sports/object"), "/minio/sports/object");
  assert.equal(proxyObjectUrl("http://[::1]:9001/sports/object"), "/minio/sports/object");
  assert.equal(proxyObjectUrl("http://127.0.0.1:65536/sports/object"), "http://127.0.0.1:65536/sports/object");
  assert.equal(proxyObjectUrl("https://objects.example.edu:19000/sports/object"), "https://objects.example.edu:19000/sports/object");
});

check("object upload ETag normalization fails closed on a missing value", () => {
  assert.equal(normalizeUploadEtag(' "etag-1" '), "etag-1");
  assert.equal(normalizeUploadEtag(""), null);
  assert.equal(normalizeUploadEtag(null), null);
});

check("confirmed Session evidence stays locked while PROCESSING or FAILED", () => {
  const draft = {
    pendingUpload: {
      initiated: { mediaId: "media-retained-1" },
      confirmed: { version: 2 },
      bound: true,
      verificationStatus: "PROCESSING",
    },
  };
  assert.equal(isRetainedEvidenceLocked(draft), true);
  assert.equal(retainedEvidenceStatus(draft), "PROCESSING");
  assert.equal(
    applyMediaVerificationState(draft, { id: "media-retained-1", uploadStatus: "PROCESSING" }),
    "PROCESSING",
  );
  assert.ok(draft.pendingUpload, "PROCESSING must preserve the retained evidence identity");

  assert.equal(
    applyMediaVerificationState(draft, { id: "media-retained-1", uploadStatus: "FAILED" }),
    "FAILED",
  );
  assert.ok(draft.pendingUpload, "FAILED must not become an excludable local draft");
  assert.equal(retainedEvidenceStatus(draft), "FAILED");
  assert.equal(isRetainedEvidenceLocked(draft), true);
});

check("unconfirmed capture remains deletable and AVAILABLE evidence remains locked", () => {
  const localDraft = {
    pendingUpload: { objectUploaded: true, confirmed: null, bound: false },
  };
  assert.equal(isRetainedEvidenceLocked(localDraft), false);
  assert.equal(retainedEvidenceStatus(localDraft), "LOCAL_DRAFT");

  const retained = {
    pendingUpload: {
      initiated: { mediaId: "media-available-1" },
      confirmed: { version: 2 },
      bound: true,
    },
  };
  assert.equal(
    applyMediaVerificationState(retained, { id: "media-available-1", uploadStatus: "AVAILABLE" }),
    "AVAILABLE",
  );
  assert.equal(retained.mediaId, "media-available-1");
  assert.equal(retained.pendingUpload, null);
  assert.equal(isRetainedEvidenceLocked(retained), true);
});

check("proof preview deletion uses the shared lock and fake local +60 is removed", () => {
  assert.match(checkinScreenSource, /checkin\.deleteDraft[\s\S]*isRetainedEvidenceLocked\(draft\)/u);
  assert.match(checkinScreenSource, /checkin\.previewDraft[\s\S]*checkin\.deleteDraft/u);
  assert.doesNotMatch(checkinScreenSource, /checkin\.retakeDraft|pendingRetakeId/u);
  assert.doesNotMatch(checkinScreenSource, /checkin\.debugAddHour|开发测试：增加60分钟|accumulatedMs:\s*session\.accumulatedMs\s*\+\s*60/u);
});


check("public runtime config loads before the student application", () => {
  const runtimeConfigIndex = studentIndexSource.indexOf('<script src="/runtime-config.js"></script>');
  const appModuleIndex = studentIndexSource.indexOf('<script type="module" src="./js/app.js"></script>');
  assert.ok(runtimeConfigIndex >= 0 && runtimeConfigIndex < appModuleIndex);
});

check("user-facing errors cover status families without exposing raw server text", () => {
  const cases = [
    [new TypeError("token=secret network detail"), "NETWORK", true],
    [Object.assign(new Error("private timeout detail"), { name: "TimeoutError" }), "TIMEOUT", true],
    [new ApiError(401, { code: "AUTH_TOKEN_EXPIRED", message: "private auth detail" }), "AUTHENTICATION", false],
    [new ApiError(403, { code: "PERMISSION_DENIED", message: "private permission detail" }), "AUTHORIZATION", false],
    [new ApiError(409, { code: "CONFLICT_VERSION_MISMATCH", message: "private conflict detail" }), "CONFLICT", true],
    [new ApiError(422, { code: "VALIDATION_FAILED", message: "private validation detail" }), "VALIDATION", false],
    [new ApiError(429, { code: "UNKNOWN_RATE", message: "private rate detail" }), "RATE_LIMIT", true],
    [new ApiError(503, { code: "SYSTEM_SERVICE_UNAVAILABLE", message: "private service detail" }), "SERVER", true],
    [new ApiError(418, { code: "UNKNOWN_PRIVATE", message: "SQL password=secret" }), "UNKNOWN", false],
  ];
  for (const [error, category, retryable] of cases) {
    const model = toUserFacingError(error, { log: false });
    assert.equal(model.category, category);
    assert.equal(model.retryable, retryable);
    const visible = JSON.stringify(model);
    assert.doesNotMatch(visible, /private|SQL|password=secret|token=secret/u);
    assert.ok(model.title && model.message && model.action);
  }
  const rawBackend = new ApiError(500, { code: "SYSTEM_INTERNAL_ERROR", message: "raw server credential" });
  const rawTransport = new ClientTransportError(new TypeError("raw transport credential"));
  assert.equal(rawBackend.message, "Backend request failed");
  assert.equal(rawTransport.message, "Network request failed");

  const validation = toUserFacingError(new ApiError(422, {
    code: "VALIDATION_FAILED",
    message: "do not expose",
    requestId: "req-safe-123",
    details: { fieldErrors: [{ field: "studentNumber", message: "internal validator path" }] },
  }), { log: false });
  assert.equal(validation.requestId, "req-safe-123");
  assert.deepEqual(validation.fieldErrors, [{ field: "studentNumber", message: "请检查此字段后重试。" }]);
  assert.doesNotMatch(JSON.stringify(validation), /internal validator path|do not expose/u);
  const exemption = toUserFacingError(new ApiError(422, {
    code: "EXEMPTION_APPLICATION_MEDIA_INVALID",
    message: "private exemption validator path",
  }), { log: false });
  assert.match(exemption.message, /免测材料/u);
  assert.doesNotMatch(JSON.stringify(exemption), /private exemption validator path/u);
  const accountDeletion = toUserFacingError(new ApiError(409, {
    code: "ACCOUNT_DELETION_ACTIVE_SESSION",
    message: "private active session detail",
    requestId: "req-delete-123",
  }), { log: false });
  assert.match(accountDeletion.title, /结束正在进行的运动/u);
  assert.match(accountDeletion.action, /运动页/u);
  assert.equal(accountDeletion.requestId, "req-delete-123");
  assert.doesNotMatch(JSON.stringify(accountDeletion), /private active session detail/u);
});

check("structured client routes remove query values and dynamic identifiers", () => {
  assert.equal(
    safeLogRoute("/exercise-records/550e8400-e29b-41d4-a716-446655440000?email=secret@example.edu"),
    "/exercise-records/:id",
  );
  assert.equal(
    safeLogRoute("/exercise-records/550e8400-e29b-41d4-a716-446655440000/evidence-context?student=secret@example.edu"),
    "/exercise-records/:id/evidence-context",
  );
  assert.equal(safeLogRoute("/course-invites/BNBU-SECRET/preview"), "/course-invites/:id/preview");
  const transport = new ClientTransportError(new TypeError("private network cause"), {
    method: "POST",
    route: "/exercise-records/record-secret?email=secret@example.edu",
  });
  assert.equal(transport.method, "POST");
  assert.equal(safeLogRoute(transport.route), "/exercise-records/:id");
});

check("error panel string compatibility never renders the supplied raw string", () => {
  const html = userFacingErrorPanel("raw server message token=secret");
  assert.doesNotMatch(html, /raw server message|token=secret/u);
  assert.match(html, /user-facing-error-panel/u);
});

check("major Student backend failures and binding fields use the shared safe UI", () => {
  const bindingApp = {
    state: {
      workspace: {
        student: { email: "", emailVerified: false },
      },
    },
    ui: {},
  };
  const bindingHtml = renderContactBinding(bindingApp, { mode: "requiredActivation" });
  assert.match(bindingHtml, /<label[^>]*for="binding-email"/u);
  assert.match(bindingHtml, /id="binding-email"[^>]*aria-required="true"/u);
  assert.match(bindingHtml, /type="email"[^>]*autocomplete="email"/u);
  assert.match(bindingScreenSource, /state\.error = toUserFacingError\(error\)/u);
  assert.doesNotMatch(bindingScreenSource, /diagnosticError|apiErrorText/u);
  assert.match(joinScreenSource, /else onError\(toUserFacingError\(error\)\)/u);
  assert.match(joinScreenSource, /userFacingErrorPanel\(message, \{ compact: true \}\)/u);
  assert.match(appSource, /state\.lastError = toUserFacingError\(error\)/u);
  assert.match(startupScreenSource, /userFacingErrorPanel\(app\.state\.lastError/u);
  assert.match(checkinScreenSource, /recordOpenError[^\n]*userFacingErrorPanel/u);
});

check("managed email binding opens the Android-aligned change form directly", () => {
  setLanguage("zh");
  const bindingApp = {
    state: {
      workspace: {
        student: { email: "s***@example.edu.cn", emailVerified: true },
      },
    },
    ui: {},
  };
  const html = renderContactBinding(bindingApp, { mode: "manageContacts" });
  assert.match(html, /修改邮箱/u);
  assert.match(html, /当前邮箱：s\*\*\*@example\.edu\.cn/u);
  assert.match(html, /验证码将分别发送到当前邮箱和新邮箱/u);
  assert.match(html, /<label[^>]*for="binding-email"[^>]*>[^<]*新邮箱/u);
  assert.match(html, /placeholder="请输入新的学校登记邮箱"/u);
  assert.match(html, /data-action="binding\.sendCode"/u);
  assert.doesNotMatch(html, /邮箱与安全|data-action="binding\.changeEmail"|>更换邮箱</u);
});

check("a missing object-store ETag stops before media confirmation", async () => {
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const hash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const draft = {
    type: "image",
    durationSeconds: null,
    pendingUpload: {
      signature: `image/png:${blob.size}:${hash}:image`,
      initiated: {
        uploadUrl: "http://127.0.0.1:19000/sports/object",
        uploadMethod: "PUT",
        requiredHeaders: {},
        uploadSessionId: "upload-1",
        mediaId: "media-1",
      },
      objectUploaded: false,
      confirmed: null,
      bound: false,
      confirmIdempotencyKey: "confirm-key",
      bindIdempotencyKey: "bind-key",
    },
  };
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response(null, { status: 200 });
  };
  try {
    await assert.rejects(
      uploadMediaDraft("session-1", draft, blob),
      (error) => error instanceof ApiError && error.code === "MEDIA_ETAG_MISSING",
    );
    assert.deepEqual(calls, ["/minio/sports/object"]);
    assert.equal(draft.pendingUpload.objectUploaded, false);
    assert.equal(draft.pendingUpload.confirmed, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

check("current score requires an exact semester and uses backend total-only qualification", () => {
  const scores = [
    {
      enrollmentId: "enrollment-current",
      validCourseDurationSeconds: 18_000,
      validGeneralDurationSeconds: 27_000,
      // Deliberately differs from the two category totals: categories are
      // display-only and must not re-adjudicate the backend total-only rule.
      totalValidDurationSeconds: 72_000,
      qualificationStatus: "QUALIFIED",
    },
  ];
  const enrollments = [
    {
      id: "enrollment-current",
      classSectionId: "section-current",
      status: "ACTIVE",
    },
  ];
  const sections = [
    { id: "section-current", semesterId: "semester-current" },
  ];
  assert.equal(
    selectCurrentStudentScore(scores, enrollments, sections, null),
    null,
  );
  const score = selectCurrentStudentScore(
    scores,
    enrollments,
    sections,
    { id: "semester-current" },
  );
  assert.equal(score, scores[0]);
  assert.deepEqual(mapStudentScoreProgress(score), {
    course: 5,
    general: 7.5,
    rawCourse: 5,
    rawGeneral: 7.5,
    totalValidHours: 20,
    qualificationStatus: "QUALIFIED",
    scoreAvailable: true,
  });
});

check("student cursor lists collect every page from meta.pagination.nextCursor", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const pages = new Map([
    ["/api/v1/enrollments", [[{ id: "enrollment-1" }], "enrollment-next"]],
    ["/api/v1/enrollments?cursor=enrollment-next", [[{ id: "enrollment-2" }], null]],
    ["/api/v1/class-sections", [[{ id: "section-1" }], "section-next"]],
    ["/api/v1/class-sections?cursor=section-next", [[{ id: "section-2" }], null]],
    ["/api/v1/exercise-records?limit=50&sort=-businessDate", [[{ id: "record-1" }], "record next"]],
    ["/api/v1/exercise-records?limit=50&sort=-businessDate&cursor=record%20next", [[{ id: "record-2" }], null]],
    ["/api/v1/student-scores", [[{ id: "score-1" }], "score-next"]],
    ["/api/v1/student-scores?cursor=score-next", [[{ id: "score-2" }], null]],
    ["/api/v1/student-progress?limit=100", [[{ id: "progress-1" }], "progress-next"]],
    ["/api/v1/student-progress?limit=100&cursor=progress-next", [[{ id: "progress-2" }], null]],
  ]);
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    const page = pages.get(url);
    if (!page) throw new Error(`Unexpected request: ${url}`);
    return Response.json({
      data: page[0],
      meta: { requestId: `request-${calls.length}`, pagination: { nextCursor: page[1], hasMore: page[1] !== null, limit: 50 } },
    });
  };
  try {
    assert.deepEqual((await listMyEnrollments()).map(({ id }) => id), ["enrollment-1", "enrollment-2"]);
    assert.deepEqual((await listMyClassSections()).map(({ id }) => id), ["section-1", "section-2"]);
    assert.deepEqual((await listMyRecords()).map(({ id }) => id), ["record-1", "record-2"]);
    assert.deepEqual((await listMyScores()).map(({ id }) => id), ["score-1", "score-2"]);
    assert.deepEqual((await listMyStudentProgress()).map(({ id }) => id), ["progress-1", "progress-2"]);
    assert.equal(calls.length, 10);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

check("student cursor lists reject repeated cursors instead of looping", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({
      data: [{ id: `enrollment-${calls}` }],
      meta: { requestId: `request-${calls}`, pagination: { nextCursor: "same-cursor", hasMore: true, limit: 50 } },
    });
  };
  try {
    await assert.rejects(listMyEnrollments(), /API_PAGINATION_CURSOR_REPEATED/);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

check("student cursor lists stop after the defensive page limit", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({
      data: [],
      meta: { requestId: `request-${calls}`, pagination: { nextCursor: `cursor-${calls}`, hasMore: true, limit: 50 } },
    });
  };
  try {
    await assert.rejects(listMyScores(), /API_PAGINATION_PAGE_LIMIT_EXCEEDED/);
    assert.equal(calls, 100);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

check("401 refresh retries one student mutation with the same Idempotency-Key", async () => {
  clearApiSession();
  storeAuthSession(authSession("before-refresh"));
  const originalFetch = globalThis.fetch;
  const mutationCalls = [];
  let mutationAttempt = 0;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/test-mutation")) {
      mutationAttempt += 1;
      mutationCalls.push({
        key: init.headers["Idempotency-Key"],
        authorization: init.headers.Authorization,
      });
      if (mutationAttempt === 1) {
        return Response.json(
          { code: "AUTH_TOKEN_EXPIRED", message: "expired" },
          { status: 401 },
        );
      }
      return Response.json({ data: { ok: true }, meta: {} });
    }
    if (url.endsWith("/auth/refresh")) {
      return Response.json({ data: authSession("after-refresh"), meta: {} });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  try {
    assert.deepEqual(
      await request("/test-mutation", {
        method: "POST",
        idempotent: true,
        body: { value: 1 },
      }),
      { ok: true },
    );
    assert.equal(mutationCalls.length, 2);
    assert.ok(mutationCalls[0].key);
    assert.equal(mutationCalls[0].key, mutationCalls[1].key);
    assert.equal(mutationCalls[1].authorization, "Bearer access-after-refresh");
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("ambiguous student refresh failure keeps the session and reuses its intent key", async () => {
  clearApiSession();
  storeAuthSession(authSession("refresh-retry"));
  const originalFetch = globalThis.fetch;
  const refreshKeys = [];
  let refreshCount = 0;
  let protectedCount = 0;
  let finalAuthorization = null;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/refresh-retry")) {
      protectedCount += 1;
      if (protectedCount <= 2) {
        return Response.json(
          { code: "AUTH_TOKEN_EXPIRED", message: "expired" },
          { status: 401 },
        );
      }
      finalAuthorization = init.headers.Authorization;
      return Response.json({ data: { ok: true }, meta: {} });
    }
    if (url.endsWith("/auth/refresh")) {
      refreshKeys.push(init.headers["Idempotency-Key"]);
      refreshCount += 1;
      if (refreshCount === 1) throw new TypeError("synthetic response loss");
      return Response.json({ data: authSession("refresh-retry-success"), meta: {} });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  try {
    await assert.rejects(
      request("/refresh-retry"),
      (error) => error instanceof ClientTransportError && error.message === "Network request failed",
    );
    assert.equal(hasApiSession(), true);
    assert.deepEqual(await request("/refresh-retry"), { ok: true });
    assert.equal(refreshKeys.length, 2);
    assert.ok(refreshKeys[0]);
    assert.equal(refreshKeys[0], refreshKeys[1]);
    assert.equal(finalAuthorization, "Bearer access-refresh-retry-success");
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("terminal student refresh rejection clears the local session", async () => {
  clearApiSession();
  storeAuthSession(authSession("terminal-refresh"));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/terminal-refresh")) {
      return Response.json(
        { code: "AUTH_TOKEN_EXPIRED", message: "expired" },
        { status: 401 },
      );
    }
    if (url.endsWith("/auth/refresh")) {
      return Response.json(
        { code: "AUTH_SESSION_REVOKED", message: "revoked" },
        { status: 401 },
      );
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  try {
    await assert.rejects(
      request("/terminal-refresh"),
      (error) => error instanceof ApiError && error.code === "AUTH_SESSION_REVOKED",
    );
    assert.equal(hasApiSession(), false);
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("logout wins a race with refresh and stale tokens cannot return", async () => {
  clearApiSession();
  storeAuthSession(authSession("race-old"));
  const originalFetch = globalThis.fetch;
  let resolveRefresh;
  let resolveLogout;
  let markRefreshStarted;
  let markLogoutStarted;
  const refreshStarted = new Promise((resolve) => {
    markRefreshStarted = resolve;
  });
  const logoutStarted = new Promise((resolve) => {
    markLogoutStarted = resolve;
  });
  let laterAuthorization = null;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/race-read")) {
      return Response.json(
        { code: "AUTH_TOKEN_EXPIRED", message: "expired" },
        { status: 401 },
      );
    }
    if (url.endsWith("/auth/refresh")) {
      markRefreshStarted();
      return new Promise((resolve) => {
        resolveRefresh = () =>
          resolve(Response.json({ data: authSession("race-new"), meta: {} }));
      });
    }
    if (url.endsWith("/auth/logout")) {
      markLogoutStarted();
      return new Promise((resolve) => {
        resolveLogout = () => resolve(Response.json({ data: null, meta: {} }));
      });
    }
    if (url.endsWith("/race-after")) {
      laterAuthorization = init.headers.Authorization;
      return Response.json({ data: { ok: true }, meta: {} });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  try {
    const pendingRead = request("/race-read");
    await refreshStarted;
    const pendingLogout = logoutApi();
    await logoutStarted;
    assert.equal(hasApiSession(), false);
    storeAuthSession(authSession("race-later"));
    resolveRefresh();
    await assert.rejects(pendingRead, /API_SESSION_EPOCH_CHANGED/);
    resolveLogout();
    await pendingLogout;
    assert.equal(hasApiSession(), true);
    await request("/race-after");
    assert.equal(laterAuthorization, "Bearer access-race-later");
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("active-session conflict fails closed without implicit cancellation", () => {
  assert.equal(
    isActiveSessionConflict(
      new ApiError(409, { code: "SESSION_ALREADY_ACTIVE" }),
    ),
    true,
  );
  assert.equal(
    isActiveSessionConflict(
      new ApiError(409, { code: "CONFLICT_VERSION_MISMATCH" }),
    ),
    false,
  );
  const startActionStart = checkinScreenSource.indexOf('"checkin.start":');
  const startActionEnd = checkinScreenSource.indexOf('"checkin.ackHealth":', startActionStart);
  const startActionSource = checkinScreenSource.slice(startActionStart, startActionEnd);
  assert.ok(startActionStart >= 0 && startActionEnd > startActionStart);
  assert.doesNotMatch(startActionSource, /getActiveSession|cancelServerSession|orphaned session cleanup/);
  assert.match(startActionSource, /showActiveSessionConflict\(app, error\)/);
  assert.match(checkinScreenSource, /checkin\.refreshActiveSessionConflict/);
  assert.match(checkinScreenSource, /checkin\.activeSessionHome/);
  assert.match(checkinScreenSource, /This device will not cancel, take over, or create a second session/u);
  assert.equal(
    isExactCancelledSession(
      { id: "session-1", enrollmentId: "enrollment-1", status: "CANCELLED" },
      "session-1",
      "enrollment-1",
    ),
    true,
  );
  assert.equal(
    isExactCancelledSession(
      { id: "session-1", enrollmentId: "enrollment-2", status: "CANCELLED" },
      "session-1",
      "enrollment-1",
    ),
    false,
  );
});

check("new QR student enters real email binding before protected workspace calls", async () => {
  clearApiSession();
  storeAuthSession(authSession("pending-binding", "PENDING_CONTACT_BINDING"));
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (!url.endsWith("/me")) throw new Error(`Unexpected protected request: ${url}`);
    return Response.json({
      data: {
        user: authSession("pending-binding", "PENDING_CONTACT_BINDING").user,
        studentProfile: {
          id: "profile-pending",
          organizationId: "organization-1",
          userId: "user-pending-binding",
          studentNumber: "S0001",
          fullName: "Pending Student",
          gender: "FEMALE",
          gradeYear: 2026,
          collegeName: null,
          majorName: null,
          administrativeClassName: null,
          status: "ACTIVE",
          createdAt: "2026-08-24T00:00:00Z",
          updatedAt: "2026-08-24T00:00:00Z",
          deletedAt: null,
          version: 1,
        },
        teacherProfile: null,
        adminProfile: null,
      },
      meta: {},
    });
  };
  const { app } = await import("./js/app.js");
  try {
    assert.equal(await app.completeApiLogin(), true);
    assert.equal(app.state.authenticated, true);
    assert.equal(app.state.requiresContactBinding, true);
    assert.equal(app.state.workspace.student.id, "S0001");
    assert.deepEqual(calls, ["/api/v1/me"]);
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
    localStore.clearSession();
    app.state.authenticated = false;
    app.state.requiresContactBinding = false;
  }
});

check("student account deletion uses the exact two-stage API flow and clears local auth only after a valid terminal result", async () => {
  clearApiSession();
  storeAuthSession(authSession("account-delete"));
  setLanguage("zh");
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith("/me/account-deletion-challenges")) {
      assert.equal(init.method, "POST");
      assert.match(String(init.headers.Authorization), /^Bearer access-account-delete$/u);
      assert.match(String(init.headers["Idempotency-Key"]), /\S/u);
      assert.deepEqual(JSON.parse(init.body), { expectedVersion: 7, locale: "zh-CN" });
      return Response.json({
        data: {
          challengeId: "550e8400-e29b-41d4-a716-446655440000",
          mode: "STUDENT_EMAIL_OTP",
          expiresAt: "2099-01-01T00:10:00Z",
          version: 2,
        },
        meta: {},
      }, { status: 202 });
    }
    if (url.endsWith("/me/account-deletion-challenges/550e8400-e29b-41d4-a716-446655440000/confirm")) {
      assert.equal(init.method, "POST");
      assert.match(String(init.headers.Authorization), /^Bearer access-account-delete$/u);
      assert.match(String(init.headers["Idempotency-Key"]), /\S/u);
      assert.deepEqual(JSON.parse(init.body), { expectedVersion: 2, verificationCode: "123456" });
      return Response.json({
        data: {
          status: "DELETED",
          deletedAt: "2099-01-01T00:01:00Z",
          allSessionsRevoked: true,
          newRegistrationRequired: true,
        },
        meta: {},
      });
    }
    throw new Error(`unexpected account deletion URL ${url}`);
  };
  try {
    const challenge = await requestCurrentUserAccountDeletionChallenge(7);
    assert.equal(challenge.mode, "STUDENT_EMAIL_OTP");
    assert.equal(hasApiSession(), true);
    const result = await confirmCurrentUserAccountDeletion(challenge.challengeId, challenge.version, "123456");
    assert.equal(result.status, "DELETED");
    assert.equal(hasApiSession(), false);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("student account deletion keeps local auth when the Backend terminal proof is incomplete", async () => {
  clearApiSession();
  storeAuthSession(authSession("account-delete-invalid"));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    data: {
      status: "DELETED",
      deletedAt: "not-a-date",
      allSessionsRevoked: false,
      newRegistrationRequired: true,
    },
    meta: { requestId: "request-invalid-result" },
  });
  try {
    await assert.rejects(
      confirmCurrentUserAccountDeletion("550e8400-e29b-41d4-a716-446655440001", 2, "123456"),
      (error) => error instanceof ApiError &&
        error.code === "SYSTEM_INVALID_RESPONSE" &&
        error.requestId === "request-invalid-result",
    );
    assert.equal(hasApiSession(), true);
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("student deletion re-authentication failure is never refreshed or replayed", async () => {
  clearApiSession();
  storeAuthSession(authSession("deletion-reauth"));
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    return Response.json({
      code: "ACCOUNT_DELETION_REAUTH_REQUIRED",
      message: "private verification detail",
      requestId: "request-deletion-reauth",
    }, { status: 401 });
  };
  try {
    await assert.rejects(
      confirmCurrentUserAccountDeletion("550e8400-e29b-41d4-a716-446655440002", 3, "123456"),
      (error) => error instanceof ApiError &&
        error.code === "ACCOUNT_DELETION_REAUTH_REQUIRED" &&
        error.requestId === "request-deletion-reauth",
    );
    assert.equal(calls.length, 1);
    assert.doesNotMatch(calls[0], /auth\/refresh/u);
    assert.equal(hasApiSession(), true);
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("invalid access token is terminal and is not refreshed", async () => {
  clearApiSession();
  storeAuthSession(authSession("invalid-access"));
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return Response.json({ code: "AUTH_TOKEN_INVALID", requestId: "request-invalid-access" }, { status: 401 });
  };
  try {
    await assert.rejects(
      request("/me"),
      (error) => error instanceof ApiError && error.code === "AUTH_TOKEN_INVALID",
    );
    assert.deepEqual(calls, ["/api/v1/me"]);
    assert.equal(hasApiSession(), false);
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("student account deletion strictly validates challenge data and keeps success requestId", async () => {
  clearApiSession();
  storeAuthSession(authSession("invalid-challenge"));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    data: {
      challengeId: "not-a-uuid",
      mode: "STUDENT_EMAIL_OTP",
      expiresAt: "not-a-date",
      version: 0,
    },
    meta: { requestId: "request-invalid-challenge" },
  }, { status: 202 });
  try {
    await assert.rejects(
      requestCurrentUserAccountDeletionChallenge(1),
      (error) => error instanceof ApiError &&
        error.code === "SYSTEM_INVALID_RESPONSE" &&
        error.requestId === "request-invalid-challenge",
    );
    assert.equal(hasApiSession(), true);
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});


check("deletion cleanup removes only the current account's durable workspace", () => {
  localStore.setExerciseSession("account-current", { id: "current-session" });
  localStore.setExerciseSession("account-other", { id: "other-session" });
  localStore.markPostEnrollmentGuideCompleted("account-current");
  localStore.markPostEnrollmentGuideCompleted("account-other");
  localStore.setOverlay({ healthReminderAck: true });
  assert.equal(localStore.clearAccountData("account-current"), true);
  assert.equal(localStore.getExerciseSession("account-current"), null);
  assert.deepEqual(localStore.getExerciseSession("account-other"), { id: "other-session" });
  assert.equal(localStore.hasCompletedPostEnrollmentGuide("account-current"), false);
  assert.equal(localStore.hasCompletedPostEnrollmentGuide("account-other"), true);
  assert.equal(localStore.getOverlay().healthReminderAck, false);
  localStore.clearExerciseSession("account-other");
  localStore.clearPostEnrollmentGuide("account-other");
});

check("account cleanup releases nested transient Blob URLs", async () => {
  const { revokeTransientBlobUrls } = await import("./js/app.js");
  const originalRevoke = globalThis.URL.revokeObjectURL;
  const revoked = [];
  globalThis.URL.revokeObjectURL = (value) => revoked.push(value);
  try {
    revokeTransientBlobUrls({
      checkin: { drafts: [{ url: "blob:checkin-proof" }] },
      nested: [{ preview: "blob:feedback-preview" }],
      safe: "https://example.invalid/not-revoked",
    });
    assert.deepEqual(revoked, ["blob:checkin-proof", "blob:feedback-preview"]);
  } finally {
    globalThis.URL.revokeObjectURL = originalRevoke;
  }
});

check("Student form primitives focus the first invalid control and endurance view hides scores", () => {
  const focused = [];
  const viewport = {
    querySelector(selector) {
      return selector === "#second" ? { focus: () => focused.push(selector) } : null;
    },
  };
  assert.equal(focusFirstInvalidField(viewport, ["#first", "#second"]), true);
  assert.deepEqual(focused, ["#second"]);

  const html = renderEnduranceScoring({
    ui: {},
    state: { workspace: { student: { gender: "male", gradeLevel: "freshman" }, grades: { enduranceRunStatus: "recorded", enduranceRunTimeSeconds: 210 } } },
  });
  assert.match(html, /3′30″/u);
  assert.doesNotMatch(html, /endurance-minutes|endurance\.convert|单项得分|优秀|良好|及格/u);
  assert.match(loginScreenSource, /focusFirstInvalidField\(app\._viewport, \["#login-privacy-check"\]\)/u);
  assert.match(verificationScreenSource, /\["#vlogin-contact", "#vlogin-code"\]/u);
  assert.match(joinScreenSource, /#manual-invite-code/u);
  assert.match(joinScreenSource, /#enter-invite-code/u);
  assert.match(servicesScreenSource, /#exemption-proof-trigger/u);
  assert.match(supportScreenSource, /#feedback-description/u);
});

check("feedback transport sends only the frozen privacy-bounded fields", async () => {
  clearApiSession();
  storeAuthSession(authSession("feedback"));
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (init.method === "POST") {
      assert.deepEqual(JSON.parse(init.body), {
        category: "BUG",
        content: "The submit button did not respond.",
        clientContext: { platform: "WEB" },
      });
      return Response.json({
        data: {
          id: "550e8400-e29b-41d4-a716-446655440010",
          category: "BUG",
          content: "The submit button did not respond.",
          status: "OPEN",
          publicReply: null,
          createdAt: "2026-08-24T00:00:00Z",
          updatedAt: "2026-08-24T00:00:00Z",
          version: 1,
        },
        meta: { requestId: "request-feedback-create" },
      }, { status: 201 });
    }
    return Response.json({
      data: [],
      meta: { requestId: "request-feedback-list", pagination: { nextCursor: null, hasMore: false, limit: 50 } },
    });
  };
  try {
    const created = await createFeedback({ category: "BUG", content: "The submit button did not respond." });
    assert.equal(created.status, "OPEN");
    assert.deepEqual(await listMyFeedback(), []);
    assert.equal(calls.length, 2);
    assert.match(String(calls[0].init.headers["Idempotency-Key"]), /\S/u);
    assert.doesNotMatch(JSON.stringify(JSON.parse(calls[0].init.body)), /email|phone|screenshot|token/iu);
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("exemption transport creates, uploads, associates, and submits one current draft", async () => {
  clearApiSession();
  storeAuthSession(authSession("exemption"));
  const originalFetch = globalThis.fetch;
  const calls = [];
  const applicationId = "550e8400-e29b-41d4-a716-446655440020";
  const mediaId = "550e8400-e29b-41d4-a716-446655440021";
  const uploadSessionId = "550e8400-e29b-41d4-a716-446655440022";
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === "/api/v1/exemption-applications" && init.method === "POST") {
      return Response.json({ data: { id: applicationId, mediaIds: [], version: 1 }, meta: {} }, { status: 201 });
    }
    if (url.endsWith(`/${applicationId}/media-uploads`)) {
      return Response.json({
        data: {
          mediaId,
          uploadSessionId,
          uploadUrl: "http://localhost:9000/bucket/proof.png",
          uploadMethod: "PUT",
          requiredHeaders: { "Content-Type": "image/png" },
        },
        meta: {},
      }, { status: 201 });
    }
    if (url === "/minio/bucket/proof.png") {
      return new Response(null, { status: 200, headers: { ETag: '"etag-proof"' } });
    }
    if (url.endsWith(`/media-uploads/${uploadSessionId}/confirm`)) {
      return Response.json({ data: { id: mediaId, uploadStatus: "PROCESSING", version: 2 }, meta: {} });
    }
    if (url.endsWith(`/media/${mediaId}`)) {
      return Response.json({ data: { id: mediaId, uploadStatus: "AVAILABLE", version: 3 }, meta: {} });
    }
    if (url.endsWith(`/exemption-applications/${applicationId}`) && init.method === "PATCH") {
      return Response.json({ data: { id: applicationId, mediaIds: [mediaId], version: 2 }, meta: {} });
    }
    if (url.endsWith(`/exemption-applications/${applicationId}/submit`)) {
      return Response.json({ data: { id: applicationId, mediaIds: [mediaId], status: "SUBMITTED", version: 3 }, meta: {} });
    }
    throw new Error(`Unexpected exemption request: ${url}`);
  };
  try {
    const created = await createExemptionApplication({
      enrollmentId: "550e8400-e29b-41d4-a716-446655440023",
      applicationType: "PHYSICAL_TEST",
      applicationSubtype: "RUN_800M",
      organizationName: null,
      reason: "Medical exemption evidence.",
      mediaIds: [],
    });
    const proof = { captureSource: "FILE_PICKER" };
    const uploaded = await uploadExemptionApplicationMediaDraft(
      created.id,
      proof,
      new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" }),
    );
    assert.equal(uploaded.mediaId, mediaId);
    const updated = await updateExemptionApplication(created.id, {
      mediaIds: [mediaId], expectedVersion: created.version,
    });
    const submitted = await submitExemptionApplication(created.id, updated.version);
    assert.equal(submitted.status, "SUBMITTED");
    assert.ok(calls.some((call) => call.url.endsWith(`/${applicationId}/media-uploads`)));
    assert.ok(calls.some((call) => call.url.endsWith(`/${applicationId}/submit`)));
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("structured exemption projection keeps subtype, immutable media references, and review status", () => {
  const mapped = mapStructuredExemptionApplication({
    id: "application-1",
    enrollmentId: "enrollment-1",
    classSectionId: "section-1",
    applicationType: "EXERCISE_CHECK_IN",
    applicationSubtype: "SCHOOL_TEAM",
    organizationName: "BNBU Team",
    reason: "Team participation",
    mediaIds: ["media-1"],
    status: "SUPPLEMENT_REQUIRED",
    publicComment: "Add a current roster letter.",
    submittedAt: "2026-08-24T00:00:00Z",
    decidedAt: null,
    version: 4,
  });
  assert.equal(mapped.type, "team");
  assert.equal(mapped.serverStatus, "SUPPLEMENT_REQUIRED");
  assert.deepEqual(mapped.mediaIds, ["media-1"]);
  assert.equal(mapped.reviewComment, "Add a current roster letter.");
});

check("student target reads use authenticated same-origin backend routes", async () => {
  clearApiSession();
  storeAuthSession(authSession("progress-target"));
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ url: String(input), authorization: new Headers(init.headers).get("authorization") });
    return Response.json({
      data: { id: "target-1", courseTargetSeconds: 28_800, generalTargetSeconds: 43_200, totalTargetSeconds: 72_000 },
      meta: { requestId: "request-progress-target" },
    });
  };
  try {
    assert.equal((await getClassProgressTarget("section-1")).id, "target-1");
    assert.deepEqual(calls.map(({ url }) => url), [
      "/api/v1/class-sections/section-1/progress-target",
    ]);
    assert.ok(calls.every(({ authorization }) => authorization === "Bearer access-progress-target"));
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("organization certification cards use only the signed-in student's backend applications", () => {
  const application = {
    id: "application-team-1",
    studentId: "student-profile-1",
    enrollmentId: "enrollment-1",
    classSectionId: "section-1",
    applicationType: "EXERCISE_CHECK_IN",
    applicationSubtype: "SCHOOL_TEAM",
    organizationName: "BNBU Badminton Team",
    reason: "Team participation",
    mediaIds: ["media-1"],
    status: "APPROVED",
    publicComment: "Certification approved.",
    submittedAt: "2026-08-24T00:00:00Z",
    decidedAt: "2026-08-25T00:00:00Z",
    version: 3,
  };
  const membership = mapStructuredOrganizationMembership(application, "student-profile-1");
  assert.equal(membership.type, "team");
  assert.equal(membership.organization, "BNBU Badminton Team");
  assert.equal(membership.status, "已通过");
  assert.equal(membership.dataSource, "backend");
  assert.equal(membership.offset, null);
  assert.equal(mapStructuredOrganizationMembership(application, "another-student"), null);
  assert.equal(mapStructuredOrganizationMembership({ ...application, applicationSubtype: "RUN_800M" }, "student-profile-1"), null);

  const currentMembership = mapActivityCertificationMembership({
    id: "certification-1",
    studentId: "student-profile-1",
    certificationType: "SCHOOL_TEAM",
    organizationName: "BNBU Badminton Team",
    validFrom: "2026-01-01",
    validTo: "2026-08-31",
    status: "APPROVED",
    currentDecisionReason: "Certification approved.",
    version: 4,
  }, [{
    id: "allocation-2",
    applicationId: "certification-1",
    courseSeconds: 7200,
    generalSeconds: 1800,
    effectiveContributionSeconds: 9000,
    revisionNumber: 2,
    reason: "Current allocation.",
  }], "student-profile-1");
  assert.equal(currentMembership.validUntil, "2026-08-31");
  assert.equal(currentMembership.offset, "课程相关时长 2 小时，其他运动时长 0.5 小时");
  assert.equal(currentMembership.recognitionRevisionId, "allocation-2");
  assert.equal(mapActivityCertificationMembership({ ...application, certificationType: "SCHOOL_TEAM" }, [], "another-student"), null);
});

check("organization certification and recognition reads use authenticated backend routes", async () => {
  clearApiSession();
  storeAuthSession(authSession("organization-certification"));
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    return Response.json({
      data: url.includes("recognition-allocation-revisions")
        ? [{ id: "allocation-1", applicationId: "certification-1", revisionNumber: 1 }]
        : [{ id: "certification-1", studentId: "student-profile-1" }],
      meta: { requestId: "request-organization-certification", pagination: { nextCursor: null } },
    });
  };
  try {
    const applications = await listMyActivityCertificationApplications();
    const revisions = await listRecognitionAllocationRevisions("certification-1");
    assert.equal(applications[0].id, "certification-1");
    assert.equal(revisions[0].id, "allocation-1");
    assert.deepEqual(calls, [
      "/api/v1/activity-certification-applications?limit=100",
      "/api/v1/activity-certification-applications/certification-1/recognition-allocation-revisions?limit=100",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    clearApiSession();
  }
});

check("student account deletion UI requires explanation, OTP, and final confirmation", async () => {
  const source = await readFile(new URL("./js/screens/profile.js", import.meta.url), "utf8");
  assert.match(source, /profile_account_security[\s\S]*profile_login_contacts[\s\S]*profile\.openBinding[\s\S]*注销账户[\s\S]*profile\.openAccountDeletion/u);
  assert.doesNotMatch(source, /logout-card pressable" data-action="profile\.openAccountDeletion"/u);
  assert.match(source, /requestCurrentUserAccountDeletionChallenge/u);
  assert.match(source, /confirmCurrentUserAccountDeletion/u);
  assert.match(source, /profile\.accountDeletionRequestConfirm/u);
  assert.match(source, /profile\.accountDeletionFinalConfirm/u);
  assert.match(source, /profile\.accountDeletionFinalize/u);
  assert.doesNotMatch(source, /DELETE\s+FROM\s+users/iu);
});

check("store self-heals corrupted keys and drops legacy synthetic overlay fields", () => {
  // Corrupted JSON → defaults returned and the bad key removed.
  memoryStorage.set("bnbu.student.web.workspaceOverlay", "{not json");
  let overlay = localStore.getOverlay();
  assert.equal(overlay.healthReminderAck, false);
  assert.equal(memoryStorage.has("bnbu.student.web.workspaceOverlay"), false);
  // A legacy synthetic overlay keeps only the local health acknowledgement.
  memoryStorage.set("bnbu.student.web.workspaceOverlay", JSON.stringify({ readNoticeIds: ["old"], newRecords: [{ id: "fake" }], healthReminderAck: true }));
  overlay = localStore.getOverlay();
  assert.deepEqual(overlay, { healthReminderAck: true });
  memoryStorage.delete("bnbu.student.web.workspaceOverlay");
});

check("exercise session round-trips through the store per account", () => {
  const session = startSession({ creditType: "course", sportType: "badminton" }, 5_000);
  localStore.setExerciseSession("acct-1", session);
  assert.deepEqual(localStore.getExerciseSession("acct-1"), session);
  assert.equal(localStore.getExerciseSession("acct-2"), null);
  localStore.clearExerciseSession("acct-1");
  assert.equal(localStore.getExerciseSession("acct-1"), null);
});

check("v8 contract-wired student pages keep grace non-refreshable and show server proof todos", () => {
  assert.match(joinScreenSource, /expiresAt: preview\.expiresAt/u);
  assert.match(joinScreenSource, /刷新宽限（业务不允许续期）/u);
  assert.match(joinScreenSource, /无需教师审批/u);
  assert.match(joinScreenSource, /服务端待审核（旧状态）/u);
  assert.match(dashboardScreenSource, /打开补证待办/u);
  assert.match(dashboardScreenSource, /data-action="dashboard.openProofTodo"/u);
  assert.doesNotMatch(dashboardScreenSource, /打开补证待办（当前接口没有）/u);
  assert.match(gradesScreenSource, /查看换算分 \/ 等级 \/ 排名（不向学生披露）/u);
  assert.match(coursesScreenSource, /加入另一门课（同学期已有课程）/u);
  assert.match(notificationsScreenSource, /补证倒计时/u);
  assert.doesNotMatch(notificationsScreenSource, /补证倒计时（当前接口没有）/u);
  assert.match(profileScreenSource, /不本地换算或伪造分钟/u);
});

check("v8.1 public reasons keep six bilingual categories and action scopes", () => {
  assert.deepEqual(
    PUBLIC_REASON_CATALOG.map((reason) => [reason.zh, reason.en]),
    [
      ["材料不清晰", "Unclear evidence"],
      ["必需材料缺失（含要求的前后照）", "Missing required evidence"],
      ["材料与本次运动不符", "Evidence does not match this session"],
      ["材料信息矛盾", "Inconsistent evidence"],
      ["材料真实性待核实", "Evidence authenticity requires clarification"],
      ["经核实存在重复使用或冒用材料", "Confirmed reuse or misuse of evidence"],
    ],
  );
  assert.equal(reasonsForAction(TEACHER_ACTIONS.ReturnForSupplement).length, 5);
  assert.equal(reasonsForAction(TEACHER_ACTIONS.MarkInvalid).length, 5);
  assert.equal(matchExactPublicReason("材料不清晰")?.id, "UnclearEvidence");
  assert.equal(matchExactPublicReason("凭证模糊"), null);
  assert.equal(SYSTEM_OVERDUE_REASON.zh, "补证逾期");
  assert.equal(resolvePublicReasonModel({ teacherPublicFeedback: "请补一张原图" }).kind, "unavailable");
  assert.equal(resolvePublicReasonModel({ studentVisibleReason: "材料不清晰\n请补一张原图" }).kind, "teacher");
  assert.equal(resolvePublicReasonModel({ reviewResult: "PROOF_OVERDUE_INVALID" }).kind, "systemOverdue");
});

check("v8.1 review stages stay separate and do not guess missing wire values", () => {
  assert.equal(reviewStageFromRecord({ reviewResult: "PENDING_AI" }).zh, "待 AI 检查");
  assert.equal(reviewStageFromRecord({ reviewResult: "AWAITING_TEACHER" }).zh, "待教师复核");
  assert.equal(reviewStageFromRecord({ reviewResult: "RETURN_FOR_PROOF" }).zh, "待补证");
  assert.equal(reviewStageFromRecord({ reviewResult: "TECHNICAL_PROCESSING" }).zh, "技术处理中");
  assert.equal(reviewStageFromRecord({ reviewResult: "VALID", hours: 1 }).zh, "有效 · 已计入");
  assert.equal(reviewStageFromRecord({ reviewResult: "VALID", hours: 0 }).zh, "有效 · 未计入");
  assert.equal(reviewStageFromRecord({ reviewResult: null, hours: 1 }).zh, "审核阶段暂不可用");
  assert.match(checkinScreenSource, /固定公开原因/u);
  assert.match(checkinScreenSource, /reviewStageFromRecord/u);
});

check("v8.1 notices keep proof wording and drop only explicit score disclosures", () => {
  const notices = toVisibleStudentNotices([
    { id: "upload-failed", title: "Evidence upload failed", message: "Try the same evidence batch again", category: "review", targetType: "exercise_record" },
    { id: "proof", title: "运动材料需要补证", message: "请在截止前补充原次运动材料。", category: "review", targetType: "exercise_record" },
    { id: "score", title: "成绩已发布", message: "本学期总分预估 85，等级良好。", category: "system" },
    { id: "grade-en", title: "Final grade available", message: "Open the app", category: "review", targetType: "exercise_record" },
    { id: "generic", title: "欢迎回来", message: "暂无待办", category: "system" },
  ]);
  assert.deepEqual(notices.map((notice) => notice.id), ["upload-failed", "proof"]);
  assert.equal(classifyStudentNotice({ title: "Evidence passed initial checks", message: "Waiting for teacher review" })?.kind, "review");
});

check("v8.1 maintenance page shows paused proof timing or an unavailable state", () => {
  const paused = maintenanceTimingPresentation(
    { kind: "paused", serverConfirmedRemainingSeconds: 18 * 3600 + 24 * 60 },
    false,
  );
  assert.equal(paused.status, "计时已暂停");
  assert.match(paused.remainingTime, /18小时24分钟/u);
  const unavailable = maintenanceTimingPresentation({ kind: "unavailable" }, false);
  assert.equal(unavailable.status, "状态暂不可确认");
  assert.match(startupScreenSource, /maintenance\.supplementTiming/u);
  assert.match(startupScreenSource, /预计恢复时间仅供参考/u);
});

for (const { name, fn } of checks) {
  await runCheck(name, fn);
}

if (failures.length) {
  console.error(`\n${failures.length} smoke check(s) failed`);
  process.exit(1);
}
console.log(`\nstudent smoke checks passed checks=${checks.length}`);
