import type { components } from "./phase5b-contract.generated";
import {
  buildPhase5bCourseStatisticsScope,
  buildPhase5bMaterialVersion,
  buildPhase5bPublishedRule,
  buildPhase5bRecordReviewSummary,
  buildPhase5bStudentCourseProgress,
  phase5bCourseRuleConfiguration,
  phase5bUnclearEvidenceReason,
} from "./phase5b-contract-shared-fixtures";

type Schema<Name extends keyof components["schemas"]> = components["schemas"][Name];

export const portalPublishedRuleVersionId = "77000000-0000-4000-8000-000000000001";
export const portalMaterialVersionId = "78000000-0000-4000-8000-000000000001";

export const PHASE5B_CONTRACT = {
  version: "1.3.0-contract",
  status: "RC",
  publicBasePath: "/api/v1",
  openapiSha256: "5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed",
} as const;

export const teacherLoginRequest = {
  loginType: "TEACHER_EMAIL",
  identifier: "teacher.wang@bnbu.edu.cn",
  password: "Mock-only-password",
} satisfies Schema<"PasswordSessionRequest">;

export const adminLoginRequest = {
  loginType: "ADMIN_LOGIN_NAME",
  identifier: "super.admin",
  password: "Mock-only-password",
} satisfies Schema<"PasswordSessionRequest">;

export const teacherActor = {
  userId: "10000000-0000-4000-8000-000000000001",
  organizationId: "10000000-0000-4000-8000-000000000002",
  role: "TEACHER",
  displayName: "王老师",
  verifiedEmail: "teacher.wang@bnbu.edu.cn",
  accountState: "ACTIVE",
  adminKind: null,
  adminPermissions: [],
  mustChangePassword: false,
  version: 4,
} satisfies Schema<"CurrentActor">;

export const adminActor = {
  userId: "20000000-0000-4000-8000-000000000001",
  organizationId: "10000000-0000-4000-8000-000000000002",
  role: "ADMIN",
  displayName: "总管理员",
  verifiedEmail: "admin@bnbu.edu.cn",
  accountState: "ACTIVE",
  adminKind: "SUPER",
  adminPermissions: [
    "COURSE_VIEW",
    "SEMESTER",
    "USERS_ACCOUNTS",
    "FEEDBACK",
    "GLOBAL_RULES",
    "SYSTEM_MODE",
    "HELP_CENTER",
    "AUDIT_QUERY",
  ],
  mustChangePassword: false,
  version: 9,
} satisfies Schema<"CurrentActor">;

export const teacherLoginResponse = {
  accessToken: "mock-access-token-not-for-real-authentication",
  accessExpiresAt: "2026-08-31T05:30:00Z",
  refreshToken: "mock-refresh-token-not-for-real-authentication",
  refreshExpiresAt: "2026-09-30T05:00:00Z",
  actor: teacherActor,
} satisfies Schema<"SessionTokenPair">;

export const adminLoginResponse = {
  accessToken: "mock-admin-access-token-not-for-real-authentication",
  accessExpiresAt: "2026-08-31T05:30:00Z",
  refreshToken: "mock-admin-refresh-token-not-for-real-authentication",
  refreshExpiresAt: "2026-09-30T05:00:00Z",
  actor: adminActor,
} satisfies Schema<"SessionTokenPair">;

export const currentSemester = {
  semesterId: "30000000-0000-4000-8000-000000000001",
  academicYear: "2026-2027",
  termType: "FIRST",
  displayName: "2026-2027 学年第一学期",
  startDate: "2026-08-31",
  endDate: "2027-01-15",
  status: "CURRENT",
} satisfies Schema<"SemesterSummary">;

export const currentCourse = {
  courseId: "40000000-0000-4000-8000-000000000001",
  semester: currentSemester,
  name: "体育教学 01 班",
  description: "本学期体育教学与自主运动记录",
  responsibleTeacher: {
    teacherId: "10000000-0000-4000-8000-000000000001",
    name: "王老师",
  },
  checkinOpensAt: "2026-08-31T00:00:00Z",
  checkinClosesAt: "2027-01-15T15:59:59Z",
  closedAt: null,
  draftRule: null,
  publishedRule: buildPhase5bPublishedRule(
    "40000000-0000-4000-8000-000000000001",
    currentSemester.semesterId,
    portalPublishedRuleVersionId,
  ),
  status: "OPEN",
  displayStatus: "ACTIVE",
  joinOpen: true,
  targets: {
    courseRelatedTargetMinutes: 720,
    otherTargetMinutes: 480,
    totalTargetMinutes: 1200,
    revisionNumber: 2,
  },
  activeMemberCount: 32,
  removedMemberCount: 1,
  version: 7,
  updatedAt: "2026-08-31T04:00:00Z",
} satisfies Schema<"Course">;

const emptyCursorPage = {
  limit: 20,
  nextCursor: null,
  previousCursor: null,
} satisfies Schema<"CursorPage">;

export const teacherCoursePage = {
  items: [currentCourse],
  page: emptyCursorPage,
} satisfies Schema<"CoursePage">;

export const emptyTeacherCoursePage = {
  items: [],
  page: emptyCursorPage,
} satisfies Schema<"CoursePage">;

export const exerciseRecord = {
  recordId: "50000000-0000-4000-8000-000000000001",
  sessionId: "50000000-0000-4000-8000-000000000002",
  courseId: "40000000-0000-4000-8000-000000000001",
  enrollmentId: "50000000-0000-4000-8000-000000000003",
  ruleVersionId: portalPublishedRuleVersionId,
  activityType: "STANDARD",
  student: {
    studentId: "50000000-0000-4000-8000-000000000004",
    studentNumber: "20260001",
    name: "陈同学",
    gender: "FEMALE",
    gradeYear: 1,
    college: "计算机学院",
    major: "计算机科学与技术",
    administrativeClass: "计科 2601",
    studentStatus: "ACTIVE",
  },
  businessDate: "2026-08-31",
  category: "COURSE_RELATED",
  description: "完成操场慢跑与拉伸训练",
  actualDurationSeconds: 4020,
  currentMaterial: buildPhase5bMaterialVersion(
    "50000000-0000-4000-8000-000000000001",
    "50000000-0000-4000-8000-000000000005",
    portalMaterialVersionId,
  ),
  currentReview: buildPhase5bRecordReviewSummary(portalMaterialVersionId, "VALID"),
  submittedAt: "2026-08-31T03:15:00Z",
} satisfies Schema<"ExerciseRecord">;

export const exerciseRecordPage = {
  items: [exerciseRecord],
  page: emptyCursorPage,
} satisfies Schema<"ExerciseRecordPage">;

export const emptyExerciseRecordPage = {
  items: [],
  page: emptyCursorPage,
} satisfies Schema<"ExerciseRecordPage">;

export const appendReviewRequest = {
  action: "INVALID",
  expectedRoundNo: 1,
  expectedVersion: 1,
  materialVersionId: portalMaterialVersionId,
  publicComment: "凭证不足以确认本次运动内容，请下一业务日期重新完成运动。",
  reasonCode: "UNCLEAR_EVIDENCE",
} satisfies Schema<"AppendRecordReviewRequest">;

export const appendReviewResponse = {
  reviewId: "60000000-0000-4000-8000-000000000001",
  recordId: "50000000-0000-4000-8000-000000000001",
  materialVersionId: portalMaterialVersionId,
  sequenceNumber: 2,
  roundNo: 1,
  fromResult: "VALID",
  result: "INVALID",
  source: "TEACHER",
  reviewer: {
    teacherId: "10000000-0000-4000-8000-000000000001",
    name: "王老师",
  },
  publicComment: "凭证不足以确认本次运动内容，请下一业务日期重新完成运动。",
  publicReason: phase5bUnclearEvidenceReason,
  occurredAt: "2026-08-31T04:20:00Z",
  correctedReviewId: null,
  expiryCorrection: null,
} satisfies Schema<"RecordReview">;

const portalCourseStatisticsScope = buildPhase5bCourseStatisticsScope(currentCourse.courseId);

export const courseProgressPage = {
  items: [
    buildPhase5bStudentCourseProgress(
      currentCourse.courseId,
      exerciseRecord.enrollmentId,
      exerciseRecord.student,
      portalPublishedRuleVersionId,
      [exerciseRecord.recordId],
      "2026-08-31T04:25:00Z",
    ),
  ],
  page: emptyCursorPage,
  scope: portalCourseStatisticsScope,
} satisfies Schema<"StudentCourseProgressPage">;

export const emptyCourseProgressPage = {
  items: [],
  page: emptyCursorPage,
  scope: portalCourseStatisticsScope,
} satisfies Schema<"StudentCourseProgressPage">;

export const adminDashboard = {
  actor: adminActor,
  currentSystemMode: {
    mode: "NORMAL",
    policyVersion: 3,
    announcement: null,
    updatedAt: "2026-08-31T04:30:00Z",
    version: 3,
  },
  currentSemester: {
    ...currentSemester,
    courseCount: 12,
    studentCount: 368,
    version: 5,
    updatedAt: "2026-08-31T04:00:00Z",
  },
  studentCount: 3500,
  activeStudentCount: 3368,
  distinctAdministrativeClassCount: 84,
  studentsWithAdministrativeClassCount: 3482,
  teacherCount: 46,
  enduranceRuleCount: 404,
  enduranceRuleGroupCount: 4,
  health: [
    { component: "API", status: "UP", latencyMilliseconds: 38, backlogCount: null, checkedAt: "2026-08-31T04:30:00Z" },
    { component: "DATABASE", status: "UP", latencyMilliseconds: 21, backlogCount: null, checkedAt: "2026-08-31T04:30:00Z" },
    { component: "NOTIFICATION_CENTER", status: "UP", latencyMilliseconds: null, backlogCount: 2, checkedAt: "2026-08-31T04:30:00Z" },
    { component: "OBJECT_STORAGE", status: "UP", latencyMilliseconds: 64, backlogCount: null, checkedAt: "2026-08-31T04:30:00Z" },
    { component: "MEDIA_STORAGE", status: "NOT_CONFIGURED", latencyMilliseconds: null, backlogCount: null, checkedAt: "2026-08-31T04:30:00Z" },
  ],
  generatedAt: "2026-08-31T04:30:00Z",
} satisfies Schema<"AdminDashboard">;

export const emptyAdminDashboard = {
  ...adminDashboard,
  currentSemester: null,
  studentCount: 0,
  activeStudentCount: 0,
  distinctAdministrativeClassCount: 0,
  studentsWithAdministrativeClassCount: 0,
  teacherCount: 0,
  enduranceRuleCount: 0,
  enduranceRuleGroupCount: 0,
} satisfies Schema<"AdminDashboard">;

export const adminCurrentCourseDirectory = {
  summary: {
    currentCourseCount: 12,
    distinctActiveStudentCount: 368,
    distinctResponsibleTeacherCount: 12,
  },
  items: [
    {
      course: currentCourse,
      metrics: {
        submittedStudentCount: 27,
        recordCount: 93,
        validRecordCount: 88,
        invalidRecordCount: 5,
        totalCreditedMinutes: 6420,
        averageCreditedMinutes: 200.625,
        scope: portalCourseStatisticsScope,
      },
    },
  ],
  page: emptyCursorPage,
} satisfies Schema<"AdminCurrentCourseDirectory">;

export const emptyAdminCurrentCourseDirectory = {
  summary: {
    currentCourseCount: 0,
    distinctActiveStudentCount: 0,
    distinctResponsibleTeacherCount: 0,
  },
  items: [],
  page: emptyCursorPage,
} satisfies Schema<"AdminCurrentCourseDirectory">;

export const loginError = {
  code: "INVALID_CREDENTIALS",
  message: "账号或密码不正确",
  requestId: "req_phase5b_login_error",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const dependencyError = {
  code: "DEPENDENCY_UNAVAILABLE",
  message: "暂时无法取得数据，请稍后重试",
  requestId: "req_phase5b_dependency_error",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const phase5bFixtures = {
  teacherLoginRequest,
  adminLoginRequest,
  teacherLoginResponse,
  adminLoginResponse,
  teacherCoursePage,
  emptyTeacherCoursePage,
  exerciseRecord,
  exerciseRecordPage,
  emptyExerciseRecordPage,
  appendReviewRequest,
  appendReviewResponse,
  courseProgressPage,
  emptyCourseProgressPage,
  adminDashboard,
  emptyAdminDashboard,
  adminCurrentCourseDirectory,
  emptyAdminCurrentCourseDirectory,
  loginError,
  dependencyError,
} as const;
