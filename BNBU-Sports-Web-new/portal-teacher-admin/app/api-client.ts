// Shared API client for the unified BNBU Sports backend (current API, /api/v1).
// Teacher and admin workspaces both build on this module; keep it UI-free.
//
// API rules baked in here so pages never re-implement them:
//   - success envelope {data, meta}; error envelope {code, message, details, requestId, timestamp}
//   - Authorization: Bearer <accessToken>; refresh once only when that token expired
//   - every write carries an Idempotency-Key header
//   - SYSTEM_MODE_UNSUPPORTED means "feature not yet opened", never a bug

const STORAGE_KEY = "bnbu-portal-tokens-v1";
const REFRESH_INTENT_STORAGE_KEY = "bnbu-portal-refresh-intent-v1";
// The browser always uses a same-origin API path. Local development selects a
// loopback backend explicitly in vite.config.ts via BNBU_LOCAL_BACKEND_ORIGIN;
// localStorage must never redirect authenticated traffic to another origin.
const DEFAULT_BASE = "/api/v1";
const DEFAULT_PORTAL_ORGANIZATION_CODE = "BNBU";
const PORTAL_ORGANIZATION_CODE = (
  process.env.NEXT_PUBLIC_BNBU_ORGANIZATION_CODE ??
  DEFAULT_PORTAL_ORGANIZATION_CODE
).trim().toUpperCase() || DEFAULT_PORTAL_ORGANIZATION_CODE;
const systemMaintenanceListeners = new Set<() => void>();

function publishSystemMaintenance(): void {
  systemMaintenanceListeners.forEach((listener) => listener());
}

export function subscribeSystemMaintenance(listener: () => void): () => void {
  systemMaintenanceListeners.add(listener);
  return () => systemMaintenanceListeners.delete(listener);
}

export type ApiRole = "STUDENT" | "TEACHER" | "ADMIN";

export interface ApiUser {
  id: string;
  role: ApiRole;
  status: string;
  version: number;
  primaryEmail?: string | null;
  primaryEmailMasked?: string | null;
  [key: string]: unknown;
}

export interface AuthSessionData {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  user: ApiUser;
}

export interface CurrentUserData {
  user: ApiUser;
  studentProfile: StudentProfileData | null;
  teacherProfile: TeacherProfileData | null;
  adminProfile: AdminProfileData | null;
}

export interface CurrentOrganizationData {
  id: string;
  organizationCode: string;
  displayName: string;
  legalName: string;
  timezone: string;
  defaultLocale: string;
  status: string;
  version: number;
}

export interface TeacherProfileData {
  id: string;
  organizationId: string;
  userId: string;
  employeeNumber: string;
  fullName: string;
  collegeName?: string | null;
  departmentName?: string | null;
  title?: string | null;
  status: string;
}

export interface AdminProfileData {
  id: string;
  organizationId: string;
  userId: string;
  employeeNumber: string;
  fullName: string;
  departmentName?: string | null;
  status: string;
}

export interface StudentProfileData {
  id: string;
  organizationId: string;
  userId: string;
  studentNumber: string;
  fullName: string;
  status: string;
}

export type ApiPaginationMeta = {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
};

export type ApiSuccessMeta = {
  requestId?: string;
  pagination?: ApiPaginationMeta;
  [key: string]: unknown;
};

export type ApiSuccessEnvelope<T> = {
  data: T;
  meta: ApiSuccessMeta;
};

type StoredTokens = {
  schemaVersion: 2;
  sessionId: string | null;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string | null;
  userId: string | null;
  role: ApiRole | null;
};

type StoredRefreshIntent = {
  sessionScope: string;
  idempotencyKey: string;
};

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;
  requestId: string | null;
  method: string | null;
  route: string | null;

  constructor(
    status: number,
    body: {
      code?: string;
      message?: string;
      details?: Record<string, unknown>;
      requestId?: string;
    } | null,
    context: { method?: string; route?: string } = {},
  ) {
    // Never retain a server-provided message on the public Error object. UI
    // must render the allowlisted UserFacingError projection below.
    super("Backend request failed");
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code || "UNKNOWN";
    this.details = body?.details || {};
    this.requestId = body?.requestId || null;
    this.method = context.method ?? null;
    this.route = context.route ?? null;
  }
}

export class ClientTransportError extends Error {
  method: string | null;
  route: string | null;
  cause: unknown;

  constructor(
    cause: unknown,
    context: { method?: string; route?: string } = {},
  ) {
    // Browser/network implementations may include URLs or internal details in
    // their message. Preserve only the timeout kind for safe categorisation.
    super("Network request failed");
    this.name = cause instanceof Error && ["AbortError", "TimeoutError"].includes(cause.name)
      ? cause.name
      : "ClientTransportError";
    this.method = context.method ?? null;
    this.route = context.route ?? null;
    this.cause = cause;
  }
}

export class LocalReviewApiBlockedError extends Error {
  method: string;
  route: string;

  constructor(method: string, route: string) {
    super("Local review mode blocked a Backend request");
    this.name = "LocalReviewApiBlockedError";
    this.method = method;
    this.route = route;
  }
}

export class AuthSessionSupersededError extends Error {
  constructor() {
    super("Authentication attempt was superseded");
    this.name = "AuthSessionSupersededError";
  }
}

export const isUnsupported = (error: unknown): boolean =>
  error instanceof ApiError && error.code === "SYSTEM_MODE_UNSUPPORTED";

/** Human-readable message for any thrown error. */
function knownApiErrorMessage(error: unknown, locale: "zh" | "en" = "zh"): string {
  if (!(error instanceof ApiError)) {
    return locale === "en"
      ? "Network connection failed. Check your connection and try again."
      : "网络连接失败，请检查网络后重试。";
  }
  if (isUnsupported(error))
    return locale === "en"
      ? "This backend capability is not available."
      : "该功能后端暂未开放。";
  if (locale === "en") {
    const knownEnglish: Record<string, string> = {
      VALIDATION_FAILED: "The submitted content is invalid. Check it and try again.",
      AUTH_CREDENTIAL_INVALID: "The account or password is incorrect.",
      AUTH_REQUIRED: "Sign in before continuing.",
      AUTH_TOKEN_INVALID: "The sign-in credential is invalid. Sign in again.",
      AUTH_TOKEN_EXPIRED: "Your session has expired. Sign in again.",
      AUTH_SESSION_REVOKED: "This session is no longer valid. Sign in again.",
      AUTH_RATE_LIMITED: "Too many requests. Try again later.",
      AUTH_ACCOUNT_DISABLED: "This account has been disabled.",
      PERMISSION_DENIED: "You do not have permission to perform this action.",
      PERMISSION_RESOURCE_NOT_FOUND: "The resource does not exist or is not accessible.",
      CONFLICT_VERSION_MISMATCH: "The data changed elsewhere. Refresh and try again.",
      REVIEW_NOT_FOUND: "The review was not found.",
      REVIEW_ALREADY_COMPLETED: "This record has already been reviewed.",
      REVIEW_RESULT_REQUIRED: "Choose a review result.",
      REVIEW_INVALID_REASON_REQUIRED: "Choose a reason when marking a record invalid.",
      REVIEW_CHANGE_NOT_ALLOWED: "The review cannot be changed in its current state.",
      MEDIA_OBJECT_NOT_FOUND: "The evidence file was not found.",
      MEDIA_NOT_AVAILABLE: "The evidence is still being processed.",
      MEDIA_ACCESS_DENIED: "You are not allowed to view this evidence.",
      EXEMPTION_APPLICATION_NOT_FOUND: "The exemption application was not found.",
      EXEMPTION_APPLICATION_TRANSITION_NOT_ALLOWED: "The exemption application changed state. Refresh and try again.",
      EXEMPTION_APPLICATION_MEDIA_INVALID: "The evidence is not valid for this exemption application.",
      PERMISSION_EXEMPTION_REVIEW_SCOPE_DENIED: "You are not allowed to review this exemption application.",
      SYSTEM_MAINTENANCE: "The system is under maintenance. Try again later.",
      SYSTEM_SERVICE_UNAVAILABLE: "A required service is unavailable. Try again later.",
      SYSTEM_DEPENDENCY_TIMEOUT: "A required service timed out. Try again later.",
      SYSTEM_INTERNAL_ERROR: "The server encountered an internal error. Try again later.",
      SYSTEM_INVALID_RESPONSE: "The server returned an invalid response.",
    };
    const dependencyLabels: Record<string, string> = {
      DATABASE: "PostgreSQL",
      NOTIFICATION_QUEUE: "Notification queue",
      OBJECT_STORAGE: "Object storage",
      MEDIA_STORAGE: "Media storage",
    };
    const dependency =
      typeof error.details.dependency === "string"
        ? dependencyLabels[error.details.dependency]
        : undefined;
    const message =
      dependency && error.code === "SYSTEM_SERVICE_UNAVAILABLE"
        ? `${dependency} is unavailable.`
        : knownEnglish[error.code] || "The action could not be completed.";
    return message;
  }
  const known: Record<string, string> = {
    VALIDATION_FAILED: "提交的内容格式不正确，请检查后重试。",
    AUTH_CREDENTIAL_INVALID: "账号或密码不正确。",
    AUTH_REQUIRED: "请先登录后再继续操作。",
    AUTH_TOKEN_INVALID: "登录凭证无效，请重新登录。",
    AUTH_TOKEN_EXPIRED: "登录状态已过期，请重新登录。",
    AUTH_SESSION_REVOKED: "当前登录会话已失效，请重新登录。",
    AUTH_RATE_LIMITED: "操作过于频繁，请稍后再试。",
    AUTH_ACCOUNT_DISABLED: "该账号已被停用。",
    AUTH_VERIFICATION_CODE_INVALID: "验证码不正确或已过期。",
    VALIDATION_FIELD_REQUIRED: "有必填项未填写，请补充后重试。",
    VALIDATION_FORMAT_INVALID: "填写格式不正确，请检查后重试。",
    VALIDATION_ENUM_UNSUPPORTED: "选择的选项不受支持，请重新选择。",
    VALIDATION_DURATION_INVALID: "时长填写不正确。",
    PERMISSION_DENIED: "没有权限执行该操作。",
    PERMISSION_RESOURCE_NOT_FOUND: "资源不存在或无权访问。",
    PERMISSION_RESOURCE_SCOPE_DENIED: "该资源不在你的管理范围内。",
    PERMISSION_COURSE_SCOPE_DENIED: "该教学班不在你的任课范围内。",
    PERMISSION_REVIEW_SCOPE_DENIED: "该打卡记录不在你的审核范围内。",
    PERMISSION_AUDIT_SCOPE_DENIED: "审计日志仅限管理员查看。",
    USER_NOT_FOUND: "用户不存在或已被移除。",
    // Course & class section
    COURSE_NOT_FOUND: "课程不存在或已被移除。",
    COURSE_CLASS_SECTION_NOT_FOUND: "教学班不存在或已被移除。",
    COURSE_CLASS_SECTION_NOT_WRITABLE: "该教学班当前不可修改。",
    COURSE_CLASS_SECTION_NOT_JOINABLE: "该教学班未开放加入。",
    COURSE_SEMESTER_ARCHIVED: "该学期已归档，不能修改。",
    COURSE_TEACHER_ASSIGNMENT_CONFLICT: "任课教师无法变更。",
    COURSE_CHECKIN_WINDOW_CLOSED: "该教学班的打卡窗口已关闭。",
    COURSE_WRITE_DISABLED: "该课程当前禁止写入。",
    COURSE_DEADLINE_PASSED: "已超过课程提交截止时间。",
    COURSE_INVITE_INVALID: "邀请码无效。",
    COURSE_INVITE_EXPIRED: "邀请码已过期，请重新生成。",
    COURSE_INVITE_REVOKED: "邀请码已被撤销，请重新生成。",
    // Review（教师审核）
    REVIEW_NOT_FOUND: "审核记录不存在。",
    REVIEW_ALREADY_COMPLETED: "该记录已完成审核。",
    REVIEW_ALREADY_STARTED: "该审核已开始处理。",
    REVIEW_ALREADY_INITIALIZED: "该记录的初始审核已存在。",
    REVIEW_RESULT_REQUIRED: "请选择审核结果。",
    REVIEW_INVALID_REASON_REQUIRED: "判定无效时必须选择原因。",
    REVIEW_CHANGE_NOT_ALLOWED: "当前状态不允许修改审核结果。",
    REVIEW_BATCH_ITEM_FAILED: "批量审核中有记录处理失败，请查看明细。",
    REVIEW_CREDIT_OVERRIDE_NOT_APPROVED: "调整计入时长尚未获批准。",
    REVIEW_CREDIT_DURATION_INVALID: "填写的计入时长无效。",
    // Media（查看学生凭证）
    MEDIA_OBJECT_NOT_FOUND: "凭证文件不存在。",
    MEDIA_NOT_AVAILABLE: "凭证仍在处理中，请稍候。",
    MEDIA_ACCESS_DENIED: "无权查看该凭证。",
    // Exemption applications（免测申请）
    EXEMPTION_APPLICATION_NOT_FOUND: "免测申请不存在或已无法访问。",
    EXEMPTION_APPLICATION_TRANSITION_NOT_ALLOWED: "免测申请状态已变化，请刷新后重试。",
    EXEMPTION_APPLICATION_MEDIA_INVALID: "免测材料不符合当前申请要求，请重新选择或上传。",
    PERMISSION_EXEMPTION_REVIEW_SCOPE_DENIED: "当前账号无权审核这份免测申请。",
    // Concurrency
    CONFLICT_VERSION_MISMATCH: "数据已在别处更新，请刷新后重试。",
    CONFLICT_REQUEST_IN_PROGRESS: "上一次操作仍在处理中，请稍候再试。",
    CONFLICT_IDEMPOTENCY_KEY_REUSED: "请求重复，请刷新后重试。",
    CONFLICT_RESOURCE_ALREADY_EXISTS: "该资源已存在。",
    CONFLICT_STATE_TRANSITION: "当前状态不支持该操作。",
    CONFLICT_UNSUPPORTED_RESOURCE_STATE: "当前状态不支持该操作。",
    // current API documents the full 503 SystemMode family.
    SYSTEM_MAINTENANCE: "系统正在维护中，请稍后再试。",
    SYSTEM_SERVICE_UNAVAILABLE: "依赖服务暂时不可用，请稍后再试。",
    SYSTEM_DEPENDENCY_TIMEOUT: "依赖服务响应超时，请稍后再试。",
    SYSTEM_INTERNAL_ERROR: "服务器内部错误，请稍后再试。",
    SYSTEM_INVALID_RESPONSE: "服务器返回的账户注销结果不完整，未清理本地登录状态。",
  };
  const dependencyLabels: Record<string, string> = {
    DATABASE: "PostgreSQL",
    NOTIFICATION_QUEUE: "通知队列",
    OBJECT_STORAGE: "对象存储",
    MEDIA_STORAGE: "媒体存储",
  };
  const dependency =
    typeof error.details.dependency === "string"
      ? dependencyLabels[error.details.dependency]
      : undefined;
  const message =
    dependency && error.code === "SYSTEM_SERVICE_UNAVAILABLE"
      ? `${dependency}不可用。`
      : known[error.code] || "操作未完成。";
  return message;
}

export type UserErrorCategory =
  | "NETWORK"
  | "TIMEOUT"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "CONFLICT"
  | "VALIDATION"
  | "RATE_LIMIT"
  | "SERVER"
  | "UNKNOWN";

export type UserFacingFieldError = { field: string; message: string };

export type UserFacingError = {
  code: string;
  title: string;
  message: string;
  action: string;
  requestId: string | null;
  retryable: boolean;
  category: UserErrorCategory;
  fieldErrors: UserFacingFieldError[];
};

const SAFE_LOG_ROUTE_SEGMENTS = new Set([
  "auth", "password-login", "logout", "refresh", "account-recovery", "complete", "me",
  "confirm",
  "semesters", "current", "organizations", "users", "students", "teachers", "student-profiles", "teacher-profiles",
  "admin-profiles", "enrollments", "remove", "class-sections", "courses", "course-invites",
  "rotate", "revoke", "exercise-records", "review", "reopen", "evidence-context",
  "student-scores", "recalculate", "publish", "media", "access-url", "exemption-applications",
  "exemption-application-details", "system-mode", "audit-logs", "client-errors", "feedback", "help-articles",
  "approve", "reject", "roster-imports", "reconcile", "resolutions",
]);

/** Removes query data and replaces every non-route literal with :id. */
export function safeLogRoute(route: string | null | undefined): string | null {
  if (typeof route !== "string") return null;
  const pathname = route.split("?", 1)[0];
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => (SAFE_LOG_ROUTE_SEGMENTS.has(segment) ? segment : ":id"));
  return segments.length ? `/${segments.join("/")}` : "/";
}

function isTimeoutError(error: unknown): boolean {
  return (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) ||
    (error instanceof ApiError && ["SYSTEM_DEPENDENCY_TIMEOUT", "NETWORK_TIMEOUT"].includes(error.code));
}

function userErrorCategory(error: unknown): UserErrorCategory {
  if (isTimeoutError(error)) return "TIMEOUT";
  if (!(error instanceof ApiError)) return "NETWORK";
  if (error.status === 401) return "AUTHENTICATION";
  if (error.status === 403) return "AUTHORIZATION";
  if (error.status === 409) return "CONFLICT";
  if (error.status === 422) return "VALIDATION";
  if (error.status === 429) return "RATE_LIMIT";
  if (error.status >= 500) return "SERVER";
  return "UNKNOWN";
}

const SAFE_USER_FIELD_NAMES = new Set([
  "account", "email", "password", "currentPassword", "newPassword", "passwordConfirmation",
  "verificationCode", "code", "currentEmailCode", "newEmailCode", "organizationCode", "requestedRole",
  "inviteCode", "fullName", "studentNumber", "gender", "grade", "courseId", "semesterId",
  "classCode", "displayName", "courseCode", "courseName", "description", "sportType",
  "exerciseType", "durationSeconds", "sessionId", "mediaIds", "mediaId", "result",
  "reviewResult", "reasonCode", "reason", "publicComment", "internalNote", "decision",
  "applicationSubtype", "organizationName", "applicationType", "enrollmentId", "expectedVersion",
  "role", "status", "query", "search", "startDate", "endDate", "dailyStartTime",
  "dailyEndTime", "submissionDeadlineAt", "excludedDates", "course.code",
]);

function safeFieldErrors(error: unknown, locale: "zh" | "en"): UserFacingFieldError[] {
  if (!(error instanceof ApiError) || !Array.isArray(error.details.fieldErrors)) return [];
  return error.details.fieldErrors.slice(0, 20).map((item) => {
    const value = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const rawField = typeof value.field === "string" ? value.field : "";
    const leaf = rawField.split(".").pop() || "";
    return {
      field: SAFE_USER_FIELD_NAMES.has(rawField)
        ? rawField
        : SAFE_USER_FIELD_NAMES.has(leaf)
          ? leaf
          : locale === "en" ? "Related field" : "相关字段",
      message: locale === "en" ? "Check this field and try again." : "请检查此字段后重试。",
    };
  });
}

/** Returns the first allowlisted field error for a concrete form control. */
export function userFacingFieldError(
  error: UserFacingError | null | undefined,
  ...fieldNames: string[]
): string | undefined {
  if (!error) return undefined;
  const accepted = new Set(fieldNames.map((field) => field.toLowerCase()));
  return error.fieldErrors.find((item) => {
    const field = item.field.toLowerCase();
    const leaf = field.split(".").pop() ?? field;
    return accepted.has(field) || accepted.has(leaf);
  })?.message;
}

const loggedClientErrors = new WeakSet<object>();

/** Allowlisted client diagnostics; never logs messages, details, stack, or credentials. */
export function logSafeClientError(error: unknown, model: UserFacingError): void {
  if (error && typeof error === "object") {
    if (loggedClientErrors.has(error)) return;
    loggedClientErrors.add(error);
  }
  const payload = {
    timestamp: new Date().toISOString(),
    level: "ERROR",
    requestId: model.requestId,
    errorCode: model.code,
    category: model.category,
    httpStatus: error instanceof ApiError ? error.status : null,
    method: (error instanceof ApiError || error instanceof ClientTransportError) &&
      /^(GET|POST|PATCH|PUT|DELETE)$/.test(error.method ?? "") ? error.method : null,
    route: error instanceof ApiError || error instanceof ClientTransportError
      ? safeLogRoute(error.route)
      : null,
    retryable: model.retryable,
    client: "WEB_PORTAL",
  };
  globalThis.console?.error?.("[BNBU_WEB_CLIENT_ERROR]", payload);
  if (
    apiRequestMode === "real" &&
    typeof window !== "undefined" &&
    readTokens()?.accessToken &&
    !((error instanceof ApiError || error instanceof ClientTransportError) &&
      typeof error.route === "string" && error.route.startsWith("/audit-logs/client-errors"))
  ) {
    const role = apiSessionRole();
    if (role !== "ADMIN" && role !== "TEACHER") return;
    const platform = role === "ADMIN" ? "WEB_ADMIN" : "WEB_TEACHER";
    void rawRequest<{ auditLogId: string; receivedAt: string }>(
      "/audit-logs/client-errors",
      {
        method: "POST",
        body: {
          platform,
          level: "ERROR",
          errorCode: payload.errorCode,
          category: payload.category,
          retryable: payload.retryable,
          clientOccurredAt: payload.timestamp,
          ...(payload.httpStatus === null ? {} : { httpStatus: payload.httpStatus }),
          ...(payload.method === null ? {} : { method: payload.method }),
          ...(payload.route === null ? {} : { route: payload.route }),
          ...(payload.requestId === null ? {} : { relatedRequestId: payload.requestId }),
        },
      },
    ).catch(() => { /* diagnostics must never replace the user-facing error */ });
  }
}

export function toUserFacingError(
  error: unknown,
  locale: "zh" | "en" = "zh",
  { log = true }: { log?: boolean } = {},
): UserFacingError {
  if (error instanceof LocalReviewApiBlockedError) {
    return {
      code: "LOCAL_REVIEW_API_BLOCKED",
      title: locale === "en" ? "Test mode protected real data" : "测试模式已保护真实数据",
      message:
        locale === "en"
          ? "This action needs the real Backend and is unavailable in password-free test mode."
          : "此操作需要真实 Backend，免登录测试模式已在发出请求前阻止。",
      action:
        locale === "en"
          ? "Exit test mode and sign in with an authorized account if you need this action."
          : "如需执行该操作，请退出测试并使用有权限的真实账号登录。",
      requestId: null,
      retryable: false,
      category: "AUTHORIZATION",
      fieldErrors: [],
    };
  }
  if (error instanceof AuthSessionSupersededError) {
    return {
      code: "AUTH_ATTEMPT_SUPERSEDED",
      title: locale === "en" ? "Sign-in was cancelled" : "登录已取消",
      message:
        locale === "en"
          ? "A newer navigation replaced this sign-in attempt."
          : "新的页面操作已替代本次登录，返回的会话没有被保存。",
      action:
        locale === "en" ? "Continue with the current page." : "请继续使用当前页面。",
      requestId: null,
      retryable: false,
      category: "AUTHENTICATION",
      fieldErrors: [],
    };
  }
  const category = userErrorCategory(error);
  const code = error instanceof ApiError && /^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)
    ? error.code
    : category === "NETWORK" ? "NETWORK_UNAVAILABLE" : category === "TIMEOUT" ? "NETWORK_TIMEOUT" : "UNKNOWN";
  const requestId = error instanceof ApiError &&
    typeof error.requestId === "string" && /^[A-Za-z0-9_.:-]{1,64}$/.test(error.requestId)
    ? error.requestId
    : null;
  const retryable = ["NETWORK", "TIMEOUT", "CONFLICT", "RATE_LIMIT", "SERVER"].includes(category);
  const zh = locale !== "en";
  const categoryTitle = {
    NETWORK: zh ? "网络连接失败" : "Connection failed",
    TIMEOUT: zh ? "请求超时" : "Request timed out",
    AUTHENTICATION: zh ? "需要重新登录" : "Sign in again",
    AUTHORIZATION: zh ? "无法执行此操作" : "Action not permitted",
    CONFLICT: zh ? "数据状态已变化" : "Data changed",
    VALIDATION: zh ? "请检查提交内容" : "Check the submitted content",
    RATE_LIMIT: zh ? "操作过于频繁" : "Too many attempts",
    SERVER: zh ? "服务暂时不可用" : "Service unavailable",
    UNKNOWN: zh ? "操作未完成" : "Action not completed",
  }[category];
  const title = categoryTitle;
  const defaultAction = {
    NETWORK: zh ? "检查网络连接后重试。" : "Check your connection and try again.",
    TIMEOUT: zh ? "稍后重试；请勿连续重复提交。" : "Try again later and avoid repeated submissions.",
    AUTHENTICATION: zh ? "返回登录页重新登录。" : "Return to sign-in and authenticate again.",
    AUTHORIZATION: zh ? "确认账号身份和管理范围。" : "Confirm the account role and management scope.",
    CONFLICT: zh ? "刷新最新状态后再试。" : "Refresh the latest state and try again.",
    VALIDATION: zh ? "修正标记的字段后重新提交。" : "Correct the marked fields and submit again.",
    RATE_LIMIT: zh ? "请稍后再试。" : "Wait before trying again.",
    SERVER: zh ? "稍后重试；持续失败时提供诊断编号。" : "Try again later; provide the diagnostic reference if it continues.",
    UNKNOWN: zh ? "稍后重试；持续失败时提供诊断编号。" : "Try again later; provide the diagnostic reference if it continues.",
  }[category];
  const model: UserFacingError = {
    code,
    title,
    message: isTimeoutError(error)
      ? zh ? "服务器未在预期时间内响应。" : "The server did not respond in time."
      : knownApiErrorMessage(error, locale),
    action: defaultAction,
    requestId,
    retryable,
    category,
    fieldErrors: safeFieldErrors(error, locale),
  };
  if (log) logSafeClientError(error, model);
  return model;
}

/** Compatibility text for legacy views; never includes raw Backend messages. */
export function apiErrorText(error: unknown, locale: "zh" | "en" = "zh"): string {
  const model = toUserFacingError(error, locale);
  return [
    model.message,
    model.action,
    model.requestId
      ? locale === "en" ? `Diagnostic reference: ${model.requestId}` : `诊断编号：${model.requestId}`
      : null,
  ].filter(Boolean).join("\n");
}

let volatileTokens: StoredTokens | null = null;

function normalizeStoredTokens(value: unknown): StoredTokens | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StoredTokens>;
  const accessToken = typeof candidate.accessToken === "string"
    ? candidate.accessToken.trim()
    : "";
  const refreshToken = typeof candidate.refreshToken === "string"
    ? candidate.refreshToken.trim()
    : "";
  const accessTokenExpiresAt = typeof candidate.accessTokenExpiresAt === "string"
    ? candidate.accessTokenExpiresAt.trim()
    : "";
  const refreshTokenExpiresAt = typeof candidate.refreshTokenExpiresAt === "string"
    ? candidate.refreshTokenExpiresAt.trim()
    : null;
  const role = candidate.role === "STUDENT" || candidate.role === "TEACHER" || candidate.role === "ADMIN"
    ? candidate.role
    : null;
  if (
    !accessToken ||
    !refreshToken ||
    !accessTokenExpiresAt ||
    !Number.isFinite(Date.parse(accessTokenExpiresAt)) ||
    (refreshTokenExpiresAt !== null && !Number.isFinite(Date.parse(refreshTokenExpiresAt))) ||
    (refreshTokenExpiresAt !== null && Date.parse(refreshTokenExpiresAt) <= Date.now())
  ) return null;
  return {
    schemaVersion: 2,
    sessionId: typeof candidate.sessionId === "string" && candidate.sessionId.trim()
      ? candidate.sessionId.trim()
      : null,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    // v1 browser storage omitted this Contract field. Preserve those legacy
    // sessions until the Backend rotates them, then persist and enforce it.
    refreshTokenExpiresAt,
    userId: typeof candidate.userId === "string" && candidate.userId.trim()
      ? candidate.userId.trim()
      : null,
    role,
  };
}

function readTokens(): StoredTokens | null {
  try {
    if (typeof window === "undefined") return volatileTokens;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      volatileTokens = null;
      return null;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      volatileTokens = null;
      return null;
    }
    const normalized = normalizeStoredTokens(parsed);
    if (!normalized) {
      window.localStorage.removeItem(STORAGE_KEY);
      volatileTokens = null;
      return null;
    }
    volatileTokens = normalized;
    return normalized;
  } catch {
    return volatileTokens;
  }
}

function writeTokens(tokens: StoredTokens | null) {
  volatileTokens = tokens ? normalizeStoredTokens(tokens) : null;
  try {
    if (typeof window === "undefined") return;
    if (volatileTokens)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(volatileTokens));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — retain this tab's in-memory session */
  }
}

function readRefreshIntent(): StoredRefreshIntent | null {
  try {
    const raw = window.localStorage.getItem(REFRESH_INTENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRefreshIntent>;
    if (
      typeof parsed.sessionScope !== "string" ||
      parsed.sessionScope.length === 0 ||
      typeof parsed.idempotencyKey !== "string" ||
      parsed.idempotencyKey.length === 0
    ) {
      return null;
    }
    return parsed as StoredRefreshIntent;
  } catch {
    return null;
  }
}

function writeRefreshIntent(intent: StoredRefreshIntent | null): void {
  try {
    if (intent)
      window.localStorage.setItem(
        REFRESH_INTENT_STORAGE_KEY,
        JSON.stringify(intent),
      );
    else window.localStorage.removeItem(REFRESH_INTENT_STORAGE_KEY);
  } catch {
    /* storage unavailable — the in-flight attempt still reuses its key */
  }
}

// Login/logout replace the logical session and advance this generation.
// Refresh only rotates tokens inside the same generation.
let authSessionEpoch = 0;
let apiRequestMode: "real" | "demo" = "real";

export function setApiRequestMode(mode: "real" | "demo"): void {
  apiRequestMode = mode;
}

export const currentApiRequestMode = (): "real" | "demo" => apiRequestMode;

export function apiBaseUrl(): string {
  return DEFAULT_BASE;
}

export const hasApiSession = (): boolean => readTokens() !== null;
export const apiSessionRole = (): ApiRole | null => readTokens()?.role ?? null;
export function clearApiSession() {
  authSessionEpoch += 1;
  writeTokens(null);
  writeRefreshIntent(null);
}

export const currentApiSessionEpoch = (): number => authSessionEpoch;

export function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

function storeAuthSession(session: AuthSessionData) {
  authSessionEpoch += 1;
  writeRefreshIntent(null);
  writeTokens({
    schemaVersion: 2,
    sessionId: session.sessionId ?? null,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt ?? null,
    userId: session.user?.id ?? null,
    role: session.user?.role ?? null,
  });
}

function rotateAuthSession(
  session: AuthSessionData,
  expectedEpoch: number,
  expectedRefreshToken: string,
): boolean {
  const current = readTokens();
  if (
    authSessionEpoch !== expectedEpoch ||
    !current ||
    current.refreshToken !== expectedRefreshToken
  ) {
    return false;
  }
  writeTokens({
    schemaVersion: 2,
    sessionId: session.sessionId ?? current.sessionId ?? null,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt ?? null,
    userId: session.user?.id ?? null,
    role: session.user?.role ?? null,
  });
  return true;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
  asContractDto?: boolean;
};

function hasIdempotencyKey(headers: Record<string, string>): boolean {
  return Object.keys(headers).some(
    (name) => name.toLowerCase() === "idempotency-key",
  );
}

function stableRequestOptions(options: RequestOptions = {}): RequestOptions {
  const headers = { ...(options.headers ?? {}) };
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET" && !hasIdempotencyKey(headers)) {
    headers["Idempotency-Key"] = uuid();
  }
  return { ...options, headers };
}

async function rawEnvelopeRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiSuccessEnvelope<T>> {
  const { method = "GET", body, auth = true, headers = {} } = options;
  if (apiRequestMode === "demo") {
    throw new LocalReviewApiBlockedError(method.toUpperCase(), path);
  }
  const requestHeaders: Record<string, string> = { ...headers };
  const isFormDataBody =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormDataBody)
    requestHeaders["Content-Type"] = "application/json";
  if (method !== "GET" && !hasIdempotencyKey(requestHeaders))
    requestHeaders["Idempotency-Key"] = uuid();
  const tokens = readTokens();
  if (auth && tokens?.accessToken)
    requestHeaders["Authorization"] = `Bearer ${tokens.accessToken}`;
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers: requestHeaders,
      body:
        body === undefined
          ? undefined
          : isFormDataBody
            ? body
            : JSON.stringify(body),
    });
  } catch (error) {
    throw new ClientTransportError(error, { method, route: path });
  }
  let parsed: {
    data?: T;
    meta?: ApiSuccessMeta;
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
    requestId?: string;
  } | null = null;
  try {
    parsed = await response.json();
  } catch {
    /* empty body */
  }
  if (!response.ok) {
    const error = new ApiError(response.status, parsed, { method, route: path });
    if (error.code === "SYSTEM_MAINTENANCE") publishSystemMaintenance();
    throw error;
  }
  if (options.asContractDto) {
    return { data: parsed as T, meta: {} };
  }
  return { data: parsed?.data as T, meta: parsed?.meta ?? {} };
}

async function rawRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return (await rawEnvelopeRequest<T>(path, options)).data;
}

type RefreshAttempt = { epoch: number; promise: Promise<void> };
let refreshInFlight: RefreshAttempt | null = null;

function refreshSessionScope(tokens: StoredTokens): string {
  return tokens.sessionId ?? `legacy-user:${tokens.userId ?? "unknown"}`;
}

function refreshIntentFor(tokens: StoredTokens): StoredRefreshIntent {
  const sessionScope = refreshSessionScope(tokens);
  const current = readRefreshIntent();
  if (current?.sessionScope === sessionScope) return current;
  const created = { sessionScope, idempotencyKey: uuid() };
  writeRefreshIntent(created);
  return created;
}

function isTerminalRefreshFailure(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 403 && error.code === "AUTH_ACCOUNT_DISABLED") return true;
  if (error.status !== 401) return false;
  return [
    "AUTH_CREDENTIAL_INVALID",
    "AUTH_REQUIRED",
    "AUTH_SESSION_REVOKED",
    "AUTH_TOKEN_INVALID",
  ].includes(error.code);
}

function isRefreshableAccessTokenFailure(error: unknown): error is ApiError {
  return error instanceof ApiError &&
    error.status === 401 &&
    error.code === "AUTH_TOKEN_EXPIRED";
}

function isTerminalAccessTokenFailure(error: unknown): error is ApiError {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 403 && error.code === "AUTH_ACCOUNT_DISABLED") return true;
  return error.status === 401 && [
    "AUTH_CREDENTIAL_INVALID",
    "AUTH_REQUIRED",
    "AUTH_SESSION_REVOKED",
    "AUTH_TOKEN_INVALID",
  ].includes(error.code);
}

async function refreshSession(expectedEpoch: number): Promise<void> {
  const tokens = readTokens();
  if (!tokens?.refreshToken)
    throw new ApiError(401, {
      code: "AUTH_REQUIRED",
      message: "no refresh token",
    });
  const intent = refreshIntentFor(tokens);
  const session = await rawRequest<AuthSessionData>("/auth/refresh", {
    method: "POST",
    auth: false,
    headers: { "Idempotency-Key": intent.idempotencyKey },
    body: { refreshToken: tokens.refreshToken },
  });
  if (!rotateAuthSession(session, expectedEpoch, tokens.refreshToken)) {
    throw new Error("API_SESSION_EPOCH_CHANGED");
  }
  if (readRefreshIntent()?.idempotencyKey === intent.idempotencyKey) {
    writeRefreshIntent(null);
  }
}

/**
 * The one entry point pages should use.
 *   request<Course[]>("/courses")
 *   request<ClassSection>("/class-sections", { method: "POST", body: {...} })
 * Handles the envelope, bearer token, idempotency key, and a single automatic
 * refresh-and-retry when the access token expired.
 */
async function requestWithRefresh<T>(
  operation: () => Promise<T>,
  options: RequestOptions,
): Promise<T> {
  const requestEpoch = authSessionEpoch;
  try {
    return await operation();
  } catch (error) {
    const canRefresh =
      options.auth !== false &&
      authSessionEpoch === requestEpoch &&
      readTokens() !== null;
    if (canRefresh && isTerminalAccessTokenFailure(error)) {
      clearApiSession();
      throw error;
    }
    if (isRefreshableAccessTokenFailure(error) && canRefresh) {
      const epoch = requestEpoch;
      if (!refreshInFlight || refreshInFlight.epoch !== epoch) {
        const attempt = { epoch, promise: Promise.resolve() };
        attempt.promise = refreshSession(epoch).finally(() => {
          if (refreshInFlight === attempt) refreshInFlight = null;
        });
        refreshInFlight = attempt;
      }
      const attempt = refreshInFlight;
      try {
        await attempt.promise;
      } catch (refreshError) {
        if (
          authSessionEpoch === attempt.epoch &&
          isTerminalRefreshFailure(refreshError)
        ) {
          clearApiSession();
        }
        throw refreshError;
      }
      return operation();
    }
    throw error;
  }
}

export function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const stableOptions = stableRequestOptions(options);
  return requestWithRefresh(
    () => rawRequest<T>(path, stableOptions),
    stableOptions,
  );
}

export function contractRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const stableOptions = stableRequestOptions({ ...options, asContractDto: true });
  return requestWithRefresh(
    () => rawRequest<T>(path, stableOptions),
    stableOptions,
  );
}

/** Use for cursor-paginated endpoints that need success-envelope metadata. */
export function requestWithMeta<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiSuccessEnvelope<T>> {
  const stableOptions = stableRequestOptions(options);
  return requestWithRefresh(
    () => rawEnvelopeRequest<T>(path, stableOptions),
    stableOptions,
  );
}

/**
 * Upload multipart/form-data through the same authenticated, idempotent and
 * single-refresh path as JSON mutations. The browser must set the multipart
 * boundary, so callers must not provide a Content-Type header themselves.
 */
export function requestFormData<T>(
  path: string,
  formData: FormData,
  options: Omit<RequestOptions, "body"> = {},
): Promise<T> {
  return request<T>(path, { ...options, body: formData });
}

// ── Auth ─────────────────────────────────────────────────────────
export async function passwordLogin(
  account: string,
  password: string,
): Promise<AuthSessionData> {
  const expectedEpoch = authSessionEpoch;
  const session = await rawRequest<AuthSessionData>("/auth/password-login", {
    method: "POST",
    auth: false,
    body: { account, password },
  });
  if (authSessionEpoch !== expectedEpoch || apiRequestMode !== "real") {
    throw new AuthSessionSupersededError();
  }
  storeAuthSession(session);
  return session;
}

export interface AccountRecoveryAcceptedData {
  recoveryId: string;
  expiresAt: string;
}

export async function requestAccountRecovery(input: {
  organizationCode?: string;
  account: string;
  requestedRole: "TEACHER" | "ADMIN";
  locale: "zh-CN" | "en";
}): Promise<AccountRecoveryAcceptedData> {
  const { organizationCode: organizationCodeOverride, ...recovery } = input;
  const organizationCode = (
    organizationCodeOverride ?? PORTAL_ORGANIZATION_CODE
  ).trim().toUpperCase();
  return rawRequest<AccountRecoveryAcceptedData>(
    "/auth/account-recovery-requests",
    {
      method: "POST",
      auth: false,
      body: { ...recovery, organizationCode, channel: "EMAIL" },
    },
  );
}

export async function completeAccountRecovery(input: {
  recoveryId: string;
  verificationCode: string;
  newPassword: string;
}): Promise<void> {
  await rawRequest<null>("/auth/account-recovery-requests/complete", {
    method: "POST",
    auth: false,
    body: input,
  });
}

export async function logoutApi(): Promise<void> {
  const tokens = readTokens();
  // Clear synchronously so an in-flight refresh cannot restore this session,
  // and so completion of this logout can never erase a later login.
  clearApiSession();
  try {
    if (tokens?.refreshToken && tokens.accessToken) {
      await rawRequest<null>("/auth/logout", {
        method: "POST",
        auth: false,
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        body: { refreshToken: tokens.refreshToken },
      });
    }
  } catch {
    /* best effort */
  }
}

export const getMe = () => request<CurrentUserData>("/me");
export const getCurrentOrganization = () =>
  request<CurrentOrganizationData>("/organizations/current");
