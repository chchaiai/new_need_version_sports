import type { components, operations } from "./phase5b-contract.generated";

type Schema<Name extends keyof components["schemas"]> = components["schemas"][Name];

export const ADMIN_GATED_OPERATION_IDS = [
  "authorizeAuditArchiveDownload",
  "changeOwnVerifiedEmail",
  "createHelpArticle",
  "createSemester",
  "createSubAdmin",
  "createTeacherAccountBatch",
  "deleteOwnAccount",
  "deleteSubAdmin",
  "deleteTeacherAccount",
  "getAdminDashboard",
  "getAuditArchiveJob",
  "getAuditEvent",
  "getCurrentCourseForAdmin",
  "getCurrentSemester",
  "getEnduranceRuleTable",
  "getFeedbackForAdmin",
  "getHelpArticleForAdmin",
  "getOwnAccountDeletionImpact",
  "getOwnUnreadNotificationCount",
  "getStudentAccount",
  "getSubAdmin",
  "getTeacherAccount",
  "listAuditEvents",
  "listCurrentCoursesForAdmin",
  "listEnduranceRuleTables",
  "listFeedbackForAdmin",
  "listHelpArticlesForAdmin",
  "listOwnNotifications",
  "listSemesters",
  "listStudentAccounts",
  "listSubAdmins",
  "listSystemModeTransitions",
  "listTeacherAccounts",
  "markOwnNotificationRead",
  "processFeedback",
  "requestAuditArchive",
  "reviseEnduranceRuleTable",
  "setSubAdminState",
  "switchCurrentSemester",
  "switchSystemMode",
  "transitionHelpArticleState",
  "updateHelpArticle",
  "updateSubAdmin",
  "updateUpcomingSemester",
  "validateTeacherAccountBatch",
] as const satisfies readonly (keyof operations)[];

export const GATE_SAFE_OPERATION_IDS = [
  "requestAuthChallenge",
  "createPasswordSession",
  "refreshSession",
  "resetPassword",
  "getCurrentActor",
  "changeOwnPassword",
  "logoutCurrentSession",
  "logoutAllSessions",
  "getAppReleasePolicy",
  "getSystemMode",
] as const satisfies readonly (keyof operations)[];

const teacherGatedActor = {
  userId: "81000000-0000-4000-8000-000000000001",
  organizationId: "81000000-0000-4000-8000-000000000002",
  role: "TEACHER",
  displayName: "王老师",
  verifiedEmail: "teacher.wang@bnbu.edu.cn",
  accountState: "ACTIVE",
  adminKind: null,
  adminPermissions: [],
  mustChangePassword: true,
  version: 5,
} satisfies Schema<"CurrentActor">;

const adminGatedActor = {
  userId: "82000000-0000-4000-8000-000000000001",
  organizationId: "81000000-0000-4000-8000-000000000002",
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
  mustChangePassword: true,
  version: 11,
} satisfies Schema<"CurrentActor">;

function sessionPair(
  tokenPrefix: string,
  actor: Schema<"CurrentActor">,
): Schema<"SessionTokenPair"> {
  return {
    accessToken: `${tokenPrefix}-access-not-rendered`,
    accessExpiresAt: "2026-09-01T03:30:00Z",
    refreshToken: `${tokenPrefix}-refresh-not-rendered`,
    refreshExpiresAt: "2026-10-01T03:00:00Z",
    actor,
  };
}

export const teacherGateRecovery = {
  login: sessionPair("teacher-login", teacherGatedActor),
  refresh: sessionPair("teacher-refresh", teacherGatedActor),
  me: teacherGatedActor,
  pageReload: teacherGatedActor,
  newSession: sessionPair("teacher-new-session", teacherGatedActor),
} as const;

export const adminGateRecovery = {
  login: sessionPair("admin-login", adminGatedActor),
  refresh: sessionPair("admin-refresh", adminGatedActor),
  me: adminGatedActor,
  pageReload: adminGatedActor,
  newSession: sessionPair("admin-new-session", adminGatedActor),
} as const;

export const firstPasswordChangeRequiredError = {
  code: "FIRST_PASSWORD_CHANGE_REQUIRED",
  message: "请先修改本人临时密码。",
  requestId: "req_phase5gb_first_password_gate",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const accountDisabledChangeError = {
  code: "ACCOUNT_DISABLED",
  message: "停用账号不能修改密码。",
  requestId: "req_phase5gb_disabled_change",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const accountDisabledResetError = {
  code: "ACCOUNT_DISABLED",
  message: "停用账号不能通过密码重置恢复访问。",
  requestId: "req_phase5gb_disabled_reset",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const changeOwnPasswordRequest = {
  currentPassword: "temporary-password",
  newPassword: "personal-password",
  expectedVersion: teacherGatedActor.version,
} satisfies operations["changeOwnPassword"]["requestBody"]["content"]["application/json"];

export const changedTeacherActor = {
  ...teacherGatedActor,
  mustChangePassword: false,
  version: teacherGatedActor.version + 1,
} satisfies operations["changeOwnPassword"]["responses"][200]["content"]["application/json"];

export const changeOwnPasswordSessionOutcome = {
  currentSession: "PRESERVED",
  otherSessions: "REVOKED",
  actor: changedTeacherActor,
} as const;

export const resetPasswordRequest = {
  otpProof: {
    challengeId: "83000000-0000-4000-8000-000000000001",
    code: "246810",
  },
  newPassword: "personal-password-after-reset",
} satisfies operations["resetPassword"]["requestBody"]["content"]["application/json"];

export const resetPasswordAccepted = {
  accepted: true,
} satisfies operations["resetPassword"]["responses"][200]["content"]["application/json"];

export const resetPasswordSessionOutcome = {
  allOldSessions: "REVOKED",
  issuedSession: null,
  actorAtNextAuthenticatedRead: {
    ...adminGatedActor,
    mustChangePassword: false,
    version: adminGatedActor.version + 1,
  } satisfies Schema<"CurrentActor">,
} as const;

export const createSubAdminRequest = {
  loginName: "student.services",
  name: "学生服务管理员",
  verifiedEmail: "student.services@bnbu.edu.cn",
  department: "学生工作部",
  initialPassword: "temporary-credential",
  confirmInitialPassword: "temporary-credential",
  permissions: ["FEEDBACK", "HELP_CENTER", "AUDIT_QUERY"],
} satisfies operations["createSubAdmin"]["requestBody"]["content"]["application/json"];

export const createdSubAdmin = {
  adminId: "84000000-0000-4000-8000-000000000001",
  loginName: createSubAdminRequest.loginName,
  name: createSubAdminRequest.name,
  verifiedEmail: createSubAdminRequest.verifiedEmail,
  department: createSubAdminRequest.department,
  permissions: createSubAdminRequest.permissions,
  state: "ACTIVE",
  createdAt: "2026-09-01T03:00:00Z",
  updatedAt: "2026-09-01T03:00:00Z",
  version: 1,
} satisfies operations["createSubAdmin"]["responses"][201]["content"]["application/json"];

export const createdSubAdminFirstActor = {
  userId: createdSubAdmin.adminId,
  organizationId: adminGatedActor.organizationId,
  role: "ADMIN",
  displayName: createdSubAdmin.name,
  verifiedEmail: createdSubAdmin.verifiedEmail,
  accountState: "ACTIVE",
  adminKind: "SUB",
  adminPermissions: createdSubAdmin.permissions,
  mustChangePassword: true,
  version: 1,
} satisfies Schema<"CurrentActor">;

export const updateSubAdminRequest = {
  name: "学生服务与帮助管理员",
  verifiedEmail: "student.services@bnbu.edu.cn",
  department: "学生工作部",
  permissions: ["FEEDBACK", "HELP_CENTER", "AUDIT_QUERY"],
  expectedVersion: createdSubAdmin.version,
} satisfies operations["updateSubAdmin"]["requestBody"]["content"]["application/json"];

export const phase5gbPasswordFixtures = {
  teacherGateRecovery,
  adminGateRecovery,
  firstPasswordChangeRequiredError,
  accountDisabledChangeError,
  accountDisabledResetError,
  changeOwnPasswordRequest,
  changeOwnPasswordSessionOutcome,
  resetPasswordRequest,
  resetPasswordAccepted,
  resetPasswordSessionOutcome,
  createSubAdminRequest,
  createdSubAdmin,
  createdSubAdminFirstActor,
  updateSubAdminRequest,
} as const;
