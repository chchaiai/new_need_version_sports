// Real backend client for the unified BNBU Sports backend (current API,
// NestJS `/api/v1`). Envelope: success `{data, meta}` / error
// `{code, message, details, requestId, timestamp}`. Student sessions are
// established by the student email challenge flow or by the QR/invite join
// flow. Password login stays TEACHER/ADMIN-only.

import { currentLocale, tx } from "./i18n.js";
import { validateProofFile } from "./proofs.js";
import { semesterDisplayName } from "./semester.js";

const NS = "bnbu.student.web.";
const API_TOKENS_STORAGE_KEY = `${NS}apiTokens`;

function readRaw(key) {
  try { return globalThis.localStorage?.getItem(NS + key) ?? null; } catch { return null; }
}
function writeRaw(key, value) {
  try {
    if (value === null || value === undefined) globalThis.localStorage?.removeItem(NS + key);
    else globalThis.localStorage?.setItem(NS + key, value);
  } catch { /* storage unavailable */ }
}

// ── Base URL ─────────────────────────────────────────────────────
// Always same-origin in the browser. Local development selects its loopback
// backend explicitly on the preview server (API_PORT); query strings and
// localStorage must never turn an authenticated browser into an API proxy for
// an arbitrary origin.
const DEFAULT_BASE = "/api/v1";

const systemMaintenanceListeners = new Set();

function publishSystemMaintenance() {
  for (const listener of systemMaintenanceListeners) listener();
}

export function subscribeSystemMaintenance(listener) {
  if (typeof listener !== "function") return () => {};
  systemMaintenanceListeners.add(listener);
  return () => systemMaintenanceListeners.delete(listener);
}

export function apiBaseUrl() {
  return DEFAULT_BASE;
}

/** Rewrites direct MinIO object URLs onto the same-origin /minio proxy. */
export function proxyObjectUrl(url) {
  const raw = String(url);
  const match = raw.match(/^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):(\d{1,5})(?=[/?#]|$)/i);
  if (!match) return raw;
  const port = Number(match[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return raw;
  return `/minio${raw.slice(match[0].length)}`;
}

// ── Token storage ────────────────────────────────────────────────
let volatileTokens = null;

function normalizeStoredTokens(value) {
  if (!value || typeof value !== "object") return null;
  const accessToken = typeof value.accessToken === "string" ? value.accessToken.trim() : "";
  const refreshToken = typeof value.refreshToken === "string" ? value.refreshToken.trim() : "";
  const accessTokenExpiresAt = typeof value.accessTokenExpiresAt === "string"
    ? value.accessTokenExpiresAt.trim()
    : "";
  const refreshTokenExpiresAt = typeof value.refreshTokenExpiresAt === "string"
    ? value.refreshTokenExpiresAt.trim()
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
    sessionId: typeof value.sessionId === "string" && value.sessionId.trim()
      ? value.sessionId.trim()
      : null,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    // Legacy persisted sessions did not retain this Contract field. They stay
    // recoverable until the Backend rotates them, after which the expiry is
    // stored and enforced locally as well.
    refreshTokenExpiresAt,
    userId: typeof value.userId === "string" && value.userId.trim()
      ? value.userId.trim()
      : null,
  };
}

function readTokens() {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return volatileTokens;
    const raw = storage.getItem(API_TOKENS_STORAGE_KEY);
    if (!raw) {
      volatileTokens = null;
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      storage.removeItem(API_TOKENS_STORAGE_KEY);
      volatileTokens = null;
      return null;
    }
    const normalized = normalizeStoredTokens(parsed);
    if (!normalized) {
      storage.removeItem(API_TOKENS_STORAGE_KEY);
      volatileTokens = null;
      return null;
    }
    volatileTokens = normalized;
    return normalized;
  } catch {
    return volatileTokens;
  }
}
function writeTokens(tokens) {
  volatileTokens = tokens ? normalizeStoredTokens(tokens) : null;
  try {
    const storage = globalThis.localStorage;
    if (!storage) return;
    if (volatileTokens) storage.setItem(API_TOKENS_STORAGE_KEY, JSON.stringify(volatileTokens));
    else storage.removeItem(API_TOKENS_STORAGE_KEY);
  } catch { /* storage unavailable — retain this tab's in-memory session */ }
}
function readRefreshIntent() {
  try {
    const parsed = JSON.parse(readRaw("refreshIntent") || "null");
    if (
      typeof parsed?.sessionScope !== "string" ||
      parsed.sessionScope.length === 0 ||
      typeof parsed?.idempotencyKey !== "string" ||
      parsed.idempotencyKey.length === 0
    ) return null;
    return parsed;
  } catch { return null; }
}
function writeRefreshIntent(intent) {
  writeRaw("refreshIntent", intent ? JSON.stringify(intent) : null);
}

// Logical-session generation. A refresh rotates tokens inside the same epoch;
// login and logout start a new epoch. Async work can therefore discard stale
// results without confusing a normal refresh with a different signed-in user.
let authSessionEpoch = 0;

export function hasApiSession() { return !!readTokens(); }
export function clearApiSession() {
  authSessionEpoch += 1;
  writeTokens(null);
  writeRefreshIntent(null);
  writeRaw("apiJoinContext", null);
}

export function currentApiSessionEpoch() { return authSessionEpoch; }
export function isCurrentApiSessionEpoch(epoch) { return epoch === authSessionEpoch; }

export function storeAuthSession(authSession) {
  authSessionEpoch += 1;
  writeRefreshIntent(null);
  writeTokens({
    sessionId: authSession.sessionId || null,
    accessToken: authSession.accessToken,
    refreshToken: authSession.refreshToken,
    accessTokenExpiresAt: authSession.accessTokenExpiresAt,
    refreshTokenExpiresAt: authSession.refreshTokenExpiresAt || null,
    userId: authSession.user?.id || null,
  });
}

function rotateAuthSession(authSession, expectedEpoch, expectedRefreshToken) {
  const current = readTokens();
  if (
    authSessionEpoch !== expectedEpoch ||
    !current ||
    current.refreshToken !== expectedRefreshToken
  ) {
    return false;
  }
  writeTokens({
    sessionId: authSession.sessionId || current.sessionId || null,
    accessToken: authSession.accessToken,
    refreshToken: authSession.refreshToken,
    accessTokenExpiresAt: authSession.accessTokenExpiresAt,
    refreshTokenExpiresAt: authSession.refreshTokenExpiresAt || null,
    userId: authSession.user?.id || null,
  });
  return true;
}

// Invite preview facts cached at join time (course/teacher display names are
// not readable through student projections afterwards).
export function storeJoinContext(context) { writeRaw("apiJoinContext", JSON.stringify(context)); }
export function readJoinContext() {
  try { return JSON.parse(readRaw("apiJoinContext") || "null"); } catch { return null; }
}

export function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

function apiLocale() { return currentLocale() === "en-US" ? "en" : "zh-CN"; }

function organizationCode() {
  const fromQuery = new URLSearchParams(globalThis.location?.search || "").get("org");
  if (fromQuery) {
    writeRaw("organizationCode", fromQuery.toUpperCase());
    return fromQuery.toUpperCase();
  }
  return (readRaw("organizationCode") || "BNBU").toUpperCase();
}

function stableDeviceId() {
  let value = readRaw("deviceId");
  if (!value) {
    value = `web-${uuid()}`.slice(0, 128);
    writeRaw("deviceId", value);
  }
  return value;
}

// ── Errors ───────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(status, body, context = {}) {
    // Never retain a server-provided message on the public Error object. Pages
    // must render the allowlisted UserFacingError projection below.
    super("Backend request failed");
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code || "UNKNOWN";
    this.details = body?.details || {};
    this.requestId = body?.requestId || null;
    this.method = context.method || null;
    this.route = context.route || null;
  }
}

export class ClientTransportError extends Error {
  constructor(cause, { method = null, route = null } = {}) {
    // Transport implementations can include URLs, credentials, or browser
    // internals in their message. Preserve only the error kind for mapping.
    super("Network request failed");
    this.name = cause instanceof Error && ["AbortError", "TimeoutError"].includes(cause.name)
      ? cause.name
      : "ClientTransportError";
    this.method = method;
    this.route = route;
    this.cause = cause;
  }
}

export const isUnsupported = (error) => error instanceof ApiError && error.code === "SYSTEM_MODE_UNSUPPORTED";

// ── Backend business limits mirrored for client-side messaging ───
// Keep these client-side hints synchronized with the unified business rules.
export const QUALIFYING_TOTAL_SECONDS = 72_000;   // 20 h — no new check-ins after this
export const MAX_PROOF_VIDEO_SECONDS = 15;        // EXERCISE_RECORD video hard cap
export const MAX_PROOF_IMAGES = 6;
export const MAX_PROOF_VIDEOS = 1;
export const CHECK_IN_WINDOW_START = "06:00";     // Beijing time, inclusive
export const CHECK_IN_WINDOW_END = "22:00";       // Beijing time, inclusive

/**
 * True when starting an exercise was refused because the student already met
 * the qualifying total. The backend reuses SESSION_ALREADY_COMPLETED for this
 * and sends no distinguishing details, so the meaning comes from the operation:
 * only `startExerciseSession` can fail this way for a qualified student.
 */
export const isQualificationReached = (error) =>
  error instanceof ApiError && error.status === 409 && error.code === "SESSION_ALREADY_COMPLETED";

/** Message for a failure raised while starting an exercise session. */
export function sessionStartErrorText(error) {
  if (isQualificationReached(error)) {
    return tx("已达到合格打卡时长，无需继续打卡。", "You have reached the qualifying hours. No further check-ins are needed.");
  }
  return apiErrorText(error);
}

function knownApiErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return tx("网络连接失败，请检查网络后重试。", "Network connection failed. Check your connection and try again.");
  }
  if (isUnsupported(error)) return tx("该功能暂未开放。", "This feature is not yet available.");
  // Keys are the backend's stable current API error codes.
  const known = {
    // Auth / session
    AUTH_REQUIRED: tx("请先登录后再继续操作。", "Sign in before continuing."),
    AUTH_TOKEN_INVALID: tx("登录凭证无效，请重新加入课程登录。", "Your credential is invalid. Join the course again to sign in."),
    AUTH_TOKEN_EXPIRED: tx("登录状态已过期，请重新加入课程登录。", "Your session expired. Join the course again to sign in."),
    AUTH_SESSION_REVOKED: tx("当前登录会话已失效，请重新登录。", "This session was revoked. Sign in again."),
    AUTH_ACCOUNT_DISABLED: tx("账号已被停用，请联系管理员。", "This account is disabled. Contact an administrator."),
    AUTH_RATE_LIMITED: tx("操作过于频繁，请稍后再试。", "Too many attempts. Try again later."),
    AUTH_CREDENTIAL_INVALID: tx("账号或凭证不正确。", "The account or credential is incorrect."),
    AUTH_VERIFICATION_CODE_INVALID: tx("验证码不正确或已过期。", "The verification code is incorrect or expired."),
    ACCOUNT_DELETION_REAUTH_REQUIRED: tx("注销验证无效或已过期，请重新验证当前邮箱。", "The deletion verification is invalid or expired. Verify your current email again."),
    ACCOUNT_DELETION_ACTIVE_SESSION: tx("账号还有一条正在进行的运动，请先结束或主动取消。", "An exercise is still active. Finish or explicitly cancel it first."),
    ACCOUNT_DELETION_PENDING_REVIEW: tx("账号仍有待审核事项，暂时不能注销。", "The account still has work awaiting review and cannot be deleted yet."),
    USER_IDENTITY_CONFLICT: tx("身份信息与已有账号冲突，请联系教师核对。", "Your identity conflicts with an existing account. Ask your teacher to check."),
    USER_NOT_FOUND: tx("账号不存在或已被移除。", "The account does not exist or was removed."),
    USER_STATUS_NOT_ACTIVE: tx("账号状态不允许该操作。", "Your account status does not allow this action."),
    // Permission
    PERMISSION_DENIED: tx("没有权限执行该操作。", "You do not have permission for this action."),
    PERMISSION_RESOURCE_NOT_FOUND: tx("资源不存在或无权访问。", "The resource does not exist or is not accessible."),
    PERMISSION_RESOURCE_SCOPE_DENIED: tx("无权访问该资源。", "You cannot access this resource."),
    PERMISSION_COURSE_SCOPE_DENIED: tx("无权访问该教学班。", "This class section is outside your scope."),
    // Validation / concurrency
    VALIDATION_FAILED: tx("提交的资料格式不正确，请检查后重试。", "Some fields are invalid. Check and try again."),
    VALIDATION_FIELD_REQUIRED: tx("有必填项未填写，请补充后重试。", "A required field is missing."),
    VALIDATION_FORMAT_INVALID: tx("填写格式不正确，请检查后重试。", "The format is invalid. Check and try again."),
    VALIDATION_ENUM_UNSUPPORTED: tx("选择的选项不受支持，请重新选择。", "That option is not supported. Choose another."),
    VALIDATION_DURATION_INVALID: tx("时长填写不正确。", "The duration is invalid."),
    CONFLICT_VERSION_MISMATCH: tx("数据已在别处更新，请刷新后重试。", "The data changed elsewhere. Refresh and try again."),
    CONFLICT_REQUEST_IN_PROGRESS: tx("上一次操作仍在处理中，请稍候再试。", "The previous request is still processing. Try again shortly."),
    CONFLICT_IDEMPOTENCY_KEY_REUSED: tx("请求重复，请刷新后重试。", "Duplicate request. Refresh and try again."),
    CONFLICT_RESOURCE_ALREADY_EXISTS: tx("该资源已存在。", "This resource already exists."),
    CONFLICT_STATE_TRANSITION: tx("当前状态不支持该操作。", "This action is not allowed in the current state."),
    CONFLICT_UNSUPPORTED_RESOURCE_STATE: tx("当前状态不支持该操作。", "The resource is not in a supported state."),
    // Course invite / enrollment
    COURSE_INVITE_INVALID: tx("邀请码无效，请向教师确认。", "This invitation code is invalid. Check with your teacher."),
    AUTH_JOIN_CAPABILITY_INVALID: tx("加入凭证无效，请重新扫码或输入邀请码。", "The join credential is invalid. Scan or enter the code again."),
    COURSE_CLASS_SECTION_NOT_FOUND: tx("教学班不存在或已被移除。", "The class section does not exist or was removed."),
    COURSE_CLASS_SECTION_NOT_WRITABLE: tx("该教学班当前不可写入。", "This class section is not writable."),
    COURSE_CHECKIN_WINDOW_CLOSED: tx("该课程的打卡窗口已关闭。", "The check-in window for this course is closed."),
    COURSE_DEADLINE_PASSED: tx("已超过课程提交截止时间。", "The course submission deadline has passed."),
    COURSE_SEMESTER_ARCHIVED: tx("该学期已归档。", "This semester is archived."),
    ENROLLMENT_NOT_FOUND: tx("选课记录不存在。", "The enrollment was not found."),
    COURSE_INVITE_EXPIRED: tx("邀请码已过期，请向教师索取新的邀请。", "This invitation expired. Ask your teacher for a new one."),
    COURSE_INVITE_REVOKED: tx("邀请码已被撤销，请向教师索取新的邀请。", "This invitation was revoked. Ask your teacher for a new one."),
    COURSE_CLASS_SECTION_NOT_JOINABLE: tx("该教学班当前不开放加入。", "This class section is not open for joining."),
    AUTH_JOIN_CAPABILITY_EXPIRED: tx("加入凭证已过期，请重新扫码或输入邀请码。", "The join credential expired. Scan or enter the code again."),
    AUTH_JOIN_CAPABILITY_ALREADY_USED: tx("该加入凭证已被使用，请重新获取。", "That join credential was already used. Request a new one."),
    ENROLLMENT_ALREADY_ACTIVE: tx("你已加入该课程，无需重复加入。", "You have already joined this course."),
    ENROLLMENT_SEMESTER_CONFLICT: tx("本学期已加入其他体育课程，不能重复选课。", "You already joined another PE course this term."),
    ENROLLMENT_NOT_ACTIVE: tx("你的选课状态不是在读，无法执行该操作。", "Your enrollment is not active."),
    // Exercise session. Note: SESSION_ALREADY_COMPLETED means "qualification
    // reached" when it comes back from starting a session — see
    // sessionStartErrorText below.
    SESSION_OUTSIDE_TIME_WINDOW: tx("当前不在可打卡时段内（北京时间 06:00–22:00）。", "Outside the check-in window (06:00–22:00 Beijing time)."),
    SESSION_ALREADY_ACTIVE: tx("已有进行中的运动，请先结束当前运动。", "An exercise session is already running. Finish it first."),
    SESSION_ALREADY_COMPLETED: tx("本次运动已结束。", "This exercise session is already completed."),
    SESSION_DURATION_CAP_REACHED: tx("本次运动已达时长上限。", "This session reached the duration cap."),
    SESSION_ALREADY_USED: tx("该运动已用于提交打卡，无法重复使用。", "This session was already used for a submission."),
    SESSION_NOT_COMPLETED: tx("请先结束运动再提交打卡。", "Finish the exercise before submitting."),
    SESSION_NOT_FOUND: tx("运动记录不存在或已结束。", "The exercise session was not found."),
    SESSION_TRANSITION_NOT_ALLOWED: tx("当前运动状态不支持该操作。", "This action is not allowed in the current session state."),
    SESSION_RESUME_WINDOW_EXPIRED: tx("暂停时间过长，无法继续本次运动。", "This session can no longer be resumed."),
    SESSION_RECONCILIATION_REQUIRED: tx("运动数据需要校准，请重新进入打卡页。", "This session needs reconciliation. Reopen the check-in page."),
    SESSION_TIMELINE_INVALID: tx("运动时间数据异常，请重新开始。", "The session timeline is invalid. Start again."),
    SESSION_EVENT_OUT_OF_ORDER: tx("操作顺序异常，请刷新后重试。", "The action arrived out of order. Refresh and try again."),
    // Exercise record
    EXERCISE_RECORD_DURATION_NOT_CREDITABLE: tx("本次运动时长不足，不能计入打卡。", "This session is too short to be credited."),
    EXERCISE_RECORD_DAILY_LIMIT_REACHED: tx("今日打卡次数已达上限。", "You reached today's check-in limit."),
    EXERCISE_RECORD_DUPLICATE_SUBMISSION: tx("该打卡已提交，请勿重复提交。", "This record was already submitted."),
    EXERCISE_RECORD_MEDIA_INCOMPLETE: tx("凭证尚未处理完成，请稍后再提交。", "The proof is still processing. Try submitting again shortly."),
    EXERCISE_RECORD_NOT_FOUND: tx("打卡记录不存在。", "The check-in record was not found."),
    EXERCISE_RECORD_ALREADY_EXISTS_FOR_SESSION: tx("本次运动已创建过打卡记录。", "A record already exists for this session."),
    MEDIA_EVIDENCE_REQUIRED: tx("请至少上传一项打卡凭证。", "At least one proof item is required."),
    // Media
    MEDIA_NOT_AVAILABLE: tx("凭证仍在处理中，请稍候。", "The proof is still being processed."),
    MEDIA_SIZE_EXCEEDED: tx("文件超过大小上限。", "The file exceeds the size limit."),
    MEDIA_TYPE_NOT_ALLOWED: tx("不支持该文件格式。", "This file type is not supported."),
    MEDIA_COUNT_LIMIT_EXCEEDED: tx(`凭证数量超过上限（最多 ${MAX_PROOF_IMAGES} 张照片、${MAX_PROOF_VIDEOS} 个视频）。`, `Too many proof items (up to ${MAX_PROOF_IMAGES} photos and ${MAX_PROOF_VIDEOS} video).`),
    MEDIA_UPLOAD_SESSION_EXPIRED: tx("上传已超时，请重新拍摄上传。", "The upload expired. Capture and upload again."),
    MEDIA_ETAG_MISSING: tx("对象存储未返回完整性标识，本次上传已停止，请重试。", "Object storage did not return an integrity identifier. This upload was stopped; try again."),
    // Media rules added by the backend's 15-second exercise-video update
    MEDIA_VIDEO_DURATION_EXCEEDED: tx(`打卡视频最长 ${MAX_PROOF_VIDEO_SECONDS} 秒，请重新录制。`, `Check-in videos may be at most ${MAX_PROOF_VIDEO_SECONDS} seconds. Record again.`),
    MEDIA_AUDIO_TRACK_REQUIRED: tx("打卡视频必须包含声音，请开启麦克风后重新录制。", "Check-in videos must contain sound. Enable the microphone and record again."),
    MEDIA_LOCATION_METADATA_NOT_ALLOWED: tx("凭证包含位置元数据，请重新拍摄或使用不含位置信息的文件。", "The proof contains location metadata. Capture it again or use a file without location data."),
    MEDIA_CAPTURE_SOURCE_NOT_ALLOWED: tx("打卡凭证必须现场拍摄，不能从相册选择。", "Proof must be captured in the app, not chosen from the gallery."),
    MEDIA_INTEGRITY_MISMATCH: tx("上传的文件与声明不一致，请重新上传。", "The uploaded file does not match its declaration. Upload again."),
    MEDIA_OBJECT_NOT_FOUND: tx("凭证文件丢失，请重新上传。", "The proof file is missing. Upload again."),
    MEDIA_ALREADY_BOUND: tx("该凭证已绑定到其他记录。", "This proof is already bound to another record."),
    MEDIA_PURPOSE_MISMATCH: tx("凭证用途不匹配。", "The proof purpose does not match."),
    MEDIA_ACCESS_DENIED: tx("无权查看该凭证。", "You are not allowed to view this proof."),
    MEDIA_BIND_TARGET_INVALID: tx("凭证绑定目标无效，请重新提交。", "The proof binding target is invalid. Submit again."),
    MEDIA_PROCESSING_INCOMPLETE: tx("凭证仍在处理中，请稍候再提交。", "The proof is still processing. Try again shortly."),
    MEDIA_VERIFICATION_INCOMPLETE: tx("凭证校验尚未完成，请稍候。", "Proof verification is not finished yet."),
    MEDIA_TRANSITION_NOT_ALLOWED: tx("凭证当前状态不支持该操作。", "This action is not allowed for the proof's current state."),
    MEDIA_FAILURE_NOT_RETRYABLE: tx("该凭证上传失败且无法重试，请重新拍摄。", "This upload failed permanently. Capture it again."),
    // Exemption applications
    EXEMPTION_APPLICATION_NOT_FOUND: tx("免测申请不存在或已无法访问。", "The exemption application does not exist or is no longer accessible."),
    EXEMPTION_APPLICATION_TRANSITION_NOT_ALLOWED: tx("免测申请状态已变化，当前操作无法继续。", "The exemption application changed state, so this action cannot continue."),
    EXEMPTION_APPLICATION_MEDIA_INVALID: tx("免测材料不符合当前申请要求，请重新选择或上传。", "The exemption evidence is not valid for this application. Select or upload it again."),
    PERMISSION_EXEMPTION_REVIEW_SCOPE_DENIED: tx("当前账号无权审核这份免测申请。", "This account is not allowed to review the exemption application."),
    // System availability
    SYSTEM_MAINTENANCE: tx("系统正在维护中，请稍后再试。", "The system is under maintenance. Try again later."),
    SYSTEM_SERVICE_UNAVAILABLE: tx("依赖服务暂时不可用，请稍后再试。", "A required service is unavailable. Try again later."),
    SYSTEM_DEPENDENCY_TIMEOUT: tx("服务响应超时，请稍后再试。", "The service timed out. Try again later."),
    SYSTEM_INVALID_RESPONSE: tx("服务返回的数据不完整，本次操作已安全停止。", "The service returned incomplete data, so this action was stopped safely."),
    RESOURCE_NOT_FOUND: tx("请求的资源不存在。", "The requested resource was not found."),
    AUTHENTICATION_REQUIRED: tx("请先登录后再继续操作。", "Sign in before continuing."),
    PROOF_WINDOW_CLOSED: tx("补证窗口已关闭。", "The proof window has closed."),
    PROOF_ALREADY_SUBMITTED: tx("本次退回已提交过补证。", "Proof was already submitted for this return."),
    SWIM_SUBMIT_WINDOW_EXPIRED: tx("游泳须在结束后 15 分钟内由服务器受理提交。", "Swimming must be accepted by the server within 15 minutes after the session ends."),
    INVITATION_INVALID: tx("邀请码无效或当前不能加入。", "This invitation is invalid or not joinable."),
  };
  if (known[error.code]) return known[error.code];
  if (error.status === 401) return tx("登录状态已失效。", "Your sign-in session is no longer valid.");
  if (error.status === 403) return tx("当前账号没有权限执行此操作。", "Your account cannot perform this action.");
  if (error.status === 409) return tx("数据状态已发生变化。", "The data state has changed.");
  if (error.status === 422) return tx("提交的内容未通过校验。", "The submitted content did not pass validation.");
  if (error.status === 429) return tx("操作过于频繁。", "Too many requests were made.");
  if (error.status >= 500) return tx("服务暂时不可用。", "The service is temporarily unavailable.");
  return tx("操作未完成。", "The action could not be completed.");
}

const SAFE_USER_FIELD_NAMES = new Set([
  "email", "password", "verificationCode", "code", "currentEmailCode", "newEmailCode",
  "inviteCode", "fullName", "studentNumber", "gender", "grade", "gradeYear", "courseId", "semesterId",
  "classCode", "displayName", "courseCode", "courseName", "description", "sportType",
  "exerciseType", "durationSeconds", "sessionId", "mediaIds", "mediaId", "result",
  "reviewResult", "reasonCode", "reason", "publicComment", "internalNote", "decision",
  "applicationSubtype", "organizationName", "applicationType", "enrollmentId", "expectedVersion",
  "role", "status", "query", "search", "startDate", "endDate", "dailyStartTime",
  "dailyEndTime", "submissionDeadlineAt", "excludedDates", "course.code",
  "category", "content", "clientContext",
]);

function safeFieldErrors(error) {
  if (!(error instanceof ApiError) || !Array.isArray(error.details?.fieldErrors)) return [];
  return error.details.fieldErrors.slice(0, 20).map((item) => {
    const rawField = typeof item?.field === "string" ? item.field : "";
    const leaf = rawField.split(".").pop() || "";
    const field = SAFE_USER_FIELD_NAMES.has(rawField)
      ? rawField
      : SAFE_USER_FIELD_NAMES.has(leaf)
        ? leaf
        : tx("相关字段", "Related field");
    return {
      field,
      message: tx("请检查此字段后重试。", "Check this field and try again."),
    };
  });
}

function isTimeoutError(error) {
  return error?.name === "AbortError" || error?.name === "TimeoutError" ||
    (error instanceof ApiError && ["SYSTEM_DEPENDENCY_TIMEOUT", "NETWORK_TIMEOUT"].includes(error.code));
}

function userErrorCategory(error) {
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

const loggedClientErrors = new WeakSet();
const SAFE_LOG_ROUTE_SEGMENTS = new Set([
  "auth", "login", "logout", "refresh", "student-sign-in-challenges", "verify",
  "course-invites", "preview", "join-capabilities", "join", "me", "semesters", "current",
  "enrollments", "class-sections", "courses", "exercise-sessions", "active", "pause", "resume",
  "finish", "cancel", "exercise-records", "submit", "evidence-context", "student-scores",
  "media-uploads", "confirm", "media", "bind", "access-url", "system-mode", "app-release-policy",
  "exemption-applications", "exemption-application-details", "review", "notifications", "preferences", "feedback", "help-articles", "audit-logs", "client-errors",
]);

/** Removes query data and replaces every non-route literal with :id. */
export function safeLogRoute(route) {
  if (typeof route !== "string") return null;
  const pathname = route.split("?", 1)[0];
  const segments = pathname.split("/").filter(Boolean).map((segment) =>
    SAFE_LOG_ROUTE_SEGMENTS.has(segment) ? segment : ":id"
  );
  return segments.length ? `/${segments.join("/")}` : "/";
}

/**
 * Structured, allowlisted browser diagnostics. Never log messages, details,
 * stack traces, credentials, form values, tokens, OTPs, or secrets.
 */
export function logSafeClientError(error, userError = null) {
  if (error && typeof error === "object") {
    if (loggedClientErrors.has(error)) return;
    loggedClientErrors.add(error);
  }
  const model = userError || toUserFacingError(error, { log: false });
  const payload = {
    timestamp: new Date().toISOString(),
    level: "ERROR",
    requestId: model.requestId,
    errorCode: model.code,
    category: model.category,
    httpStatus: error instanceof ApiError ? error.status : null,
    method: (error instanceof ApiError || error instanceof ClientTransportError) &&
      /^(GET|POST|PATCH|PUT|DELETE)$/.test(error.method || "") ? error.method : null,
    route: error instanceof ApiError || error instanceof ClientTransportError
      ? safeLogRoute(error.route)
      : null,
    retryable: model.retryable,
    client: "WEB_STUDENT",
  };
  globalThis.console?.error?.("[BNBU_WEB_CLIENT_ERROR]", payload);
  if (
    apiRequestMode === "real" &&
    readTokens()?.accessToken &&
    !(typeof error?.route === "string" && error.route.startsWith("/audit-logs/client-errors"))
  ) {
    void rawRequest("/audit-logs/client-errors", {
      method: "POST",
      idempotent: true,
      body: {
        platform: "WEB_STUDENT",
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
    }).catch(() => { /* diagnostics must never break the user operation */ });
  }
}

/** Maps flat ADR-015 errors into a safe, page-independent UI model. */
export function toUserFacingError(error, { log = true } = {}) {
  const category = userErrorCategory(error);
  const code = error instanceof ApiError && /^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)
    ? error.code
    : category === "NETWORK"
      ? "NETWORK_UNAVAILABLE"
      : category === "TIMEOUT"
        ? "NETWORK_TIMEOUT"
        : "UNKNOWN";
  const requestId = error instanceof ApiError &&
    typeof error.requestId === "string" && /^[A-Za-z0-9_.:-]{1,64}$/.test(error.requestId)
    ? error.requestId
    : null;
  const accountDeletionTitle = {
    ACCOUNT_DELETION_REAUTH_REQUIRED: tx("需要重新验证身份", "Verify your identity again"),
    ACCOUNT_DELETION_ACTIVE_SESSION: tx("请先结束正在进行的运动", "Finish the active exercise first"),
    ACCOUNT_DELETION_PENDING_REVIEW: tx("暂时不能注销", "Account deletion is temporarily blocked"),
  }[code];
  const accountDeletionAction = {
    ACCOUNT_DELETION_REAUTH_REQUIRED: tx("重新获取邮箱验证码后再次完成最终确认。", "Request a new email code, then complete the final confirmation again."),
    ACCOUNT_DELETION_ACTIVE_SESSION: tx("回到运动页结束或主动取消当前运动，再重新发起注销。", "Return to the exercise screen, finish or explicitly cancel it, then restart deletion."),
    ACCOUNT_DELETION_PENDING_REVIEW: tx("等待审核完成；教师账号还需先移交或关闭当前教学责任。", "Wait for reviews to finish; teacher accounts must also transfer or close current teaching responsibilities."),
  }[code];
  const retryable = category === "NETWORK" || category === "TIMEOUT" ||
    category === "RATE_LIMIT" || category === "SERVER" || category === "CONFLICT";
  const title = accountDeletionTitle || {
    NETWORK: tx("网络连接失败", "Connection failed"),
    TIMEOUT: tx("请求超时", "Request timed out"),
    AUTHENTICATION: tx("需要重新登录", "Sign in again"),
    AUTHORIZATION: tx("无法执行此操作", "Action not permitted"),
    CONFLICT: tx("数据状态已变化", "Data changed"),
    VALIDATION: tx("请检查提交内容", "Check the submitted content"),
    RATE_LIMIT: tx("操作过于频繁", "Too many attempts"),
    SERVER: tx("服务暂时不可用", "Service unavailable"),
    UNKNOWN: tx("操作未完成", "Action not completed"),
  }[category];
  const action = accountDeletionAction || {
    NETWORK: tx("检查网络连接后重试。", "Check your connection and try again."),
    TIMEOUT: tx("稍后重试；请勿连续重复提交。", "Try again later and avoid repeated submissions."),
    AUTHENTICATION: tx("返回登录页重新登录。", "Return to sign-in and authenticate again."),
    AUTHORIZATION: tx("确认账号身份，或联系课程负责人。", "Confirm your account role or contact the course owner."),
    CONFLICT: tx("刷新最新状态后再试。", "Refresh the latest state and try again."),
    VALIDATION: tx("修正标记的字段后重新提交。", "Correct the marked fields and submit again."),
    RATE_LIMIT: tx("请稍后再试。", "Wait before trying again."),
    SERVER: tx("稍后重试；持续失败时提供诊断编号。", "Try again later; provide the diagnostic reference if it continues."),
    UNKNOWN: tx("稍后重试；持续失败时提供诊断编号。", "Try again later; provide the diagnostic reference if it continues."),
  }[category];
  const model = {
    code,
    title,
    message: isTimeoutError(error)
      ? tx("服务器未在预期时间内响应。", "The server did not respond in time.")
      : knownApiErrorMessage(error),
    action,
    requestId,
    retryable,
    category,
    fieldErrors: safeFieldErrors(error),
  };
  if (log) logSafeClientError(error, model);
  return model;
}

/** Compatibility text for legacy views; never includes raw Backend messages. */
export function apiErrorText(error) {
  const model = toUserFacingError(error);
  return [
    model.message,
    model.action,
    model.requestId ? tx(`诊断编号：${model.requestId}`, `Diagnostic reference: ${model.requestId}`) : null,
  ].filter(Boolean).join("\n");
}

// ── Request core ─────────────────────────────────────────────────
let refreshAttempt = null;

function refreshSessionScope(tokens) {
  return tokens.sessionId || `legacy-user:${tokens.userId || "unknown"}`;
}

function refreshIntentFor(tokens) {
  const sessionScope = refreshSessionScope(tokens);
  const current = readRefreshIntent();
  if (current?.sessionScope === sessionScope) return current;
  const created = { sessionScope, idempotencyKey: uuid() };
  writeRefreshIntent(created);
  return created;
}

function isTerminalRefreshFailure(error) {
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

function isRefreshableAccessFailure(error) {
  return error instanceof ApiError &&
    error.status === 401 &&
    error.code === "AUTH_TOKEN_EXPIRED";
}

function isTerminalAccessFailure(error) {
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

function hasIdempotencyKey(headers) {
  return Object.keys(headers).some((name) => name.toLowerCase() === "idempotency-key");
}

function stableRequestOptions(options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.idempotent && !hasIdempotencyKey(headers)) {
    headers["Idempotency-Key"] = uuid();
  }
  return { ...options, headers };
}

async function rawRequest(path, {
  method = "GET", body, headers = {}, auth = true, idempotent = false,
  includeMeta = false,
} = {}) {
  const tokens = readTokens();
  const requestHeaders = { ...headers };
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  if (idempotent && !hasIdempotencyKey(requestHeaders)) requestHeaders["Idempotency-Key"] = uuid();
  if (auth && tokens?.accessToken) requestHeaders["Authorization"] = `Bearer ${tokens.accessToken}`;
  let response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ClientTransportError(error, { method, route: path });
  }
  let parsed = null;
  try { parsed = await response.json(); } catch { /* empty body */ }
  if (!response.ok) {
    const error = new ApiError(response.status, parsed, { method, route: path });
    if (error.code === "SYSTEM_MAINTENANCE") publishSystemMaintenance();
    throw error;
  }
  return includeMeta ? parsed : parsed?.data;
}

async function rawContractRequest(path, {
  method = "GET", body, headers = {}, auth = true, idempotent = false,
} = {}) {
  const tokens = readTokens();
  const requestHeaders = { ...headers };
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  if (idempotent && !hasIdempotencyKey(requestHeaders)) requestHeaders["Idempotency-Key"] = uuid();
  if (auth && tokens?.accessToken) requestHeaders["Authorization"] = `Bearer ${tokens.accessToken}`;
  let response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ClientTransportError(error, { method, route: path });
  }
  let parsed = null;
  try { parsed = await response.json(); } catch { /* empty body */ }
  if (!response.ok) {
    const error = new ApiError(response.status, parsed, { method, route: path });
    if (error.code === "SYSTEM_MAINTENANCE") publishSystemMaintenance();
    throw error;
  }
  return parsed;
}

async function refreshSession(expectedEpoch) {
  const tokens = readTokens();
  if (!tokens?.refreshToken) throw new ApiError(401, { code: "AUTH_REQUIRED", message: "No refresh token" });
  const intent = refreshIntentFor(tokens);
  const data = await rawRequest("/auth/refresh", {
    method: "POST",
    auth: false,
    idempotent: true,
    headers: { "Idempotency-Key": intent.idempotencyKey },
    body: { refreshToken: tokens.refreshToken },
  });
  if (!rotateAuthSession(data, expectedEpoch, tokens.refreshToken)) {
    throw new Error("API_SESSION_EPOCH_CHANGED");
  }
  if (readRefreshIntent()?.idempotencyKey === intent.idempotencyKey) {
    writeRefreshIntent(null);
  }
  return data;
}

export async function request(path, options = {}) {
  // Materialize the key once outside the retry closure. A 401 refresh retries
  // the exact same mutation with the exact same Idempotency-Key.
  const stableOptions = stableRequestOptions(options);
  try {
    return await rawRequest(path, stableOptions);
  } catch (error) {
    const authenticated = stableOptions.auth !== false && readTokens();
    if (authenticated && isTerminalAccessFailure(error)) {
      clearApiSession();
      throw error;
    }
    // A deletion re-authentication failure describes the one-time challenge,
    // not the bearer token. Only explicit access-token expiry is safe to
    // refresh and replay; all other 401 responses are returned exactly once.
    if (authenticated && isRefreshableAccessFailure(error)) {
      const epoch = authSessionEpoch;
      if (!refreshAttempt || refreshAttempt.epoch !== epoch) {
        const attempt = { epoch, promise: null };
        attempt.promise = refreshSession(epoch).finally(() => {
          if (refreshAttempt === attempt) refreshAttempt = null;
        });
        refreshAttempt = attempt;
      }
      const attempt = refreshAttempt;
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
      return rawRequest(path, stableOptions);
    }
    throw error;
  }
}

export async function contractRequest(path, options = {}) {
  const stableOptions = stableRequestOptions(options);
  try {
    return await rawContractRequest(path, stableOptions);
  } catch (error) {
    const authenticated = stableOptions.auth !== false && readTokens();
    if (authenticated && isTerminalAccessFailure(error)) {
      clearApiSession();
      throw error;
    }
    if (authenticated && isRefreshableAccessFailure(error)) {
      const epoch = authSessionEpoch;
      if (!refreshAttempt || refreshAttempt.epoch !== epoch) {
        const attempt = { epoch, promise: null };
        attempt.promise = refreshSession(epoch).finally(() => {
          if (refreshAttempt === attempt) refreshAttempt = null;
        });
        refreshAttempt = attempt;
      }
      const attempt = refreshAttempt;
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
      return rawContractRequest(path, stableOptions);
    }
    throw error;
  }
}

const CURSOR_PAGE_LIMIT = 100;

function withCursor(path, cursor) {
  return `${path}${path.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}`;
}

async function listAllCursorPages(path) {
  const items = [];
  const seenCursors = new Set();
  let cursor = null;

  for (let page = 0; page < CURSOR_PAGE_LIMIT; page += 1) {
    const envelope = await request(cursor ? withCursor(path, cursor) : path, { includeMeta: true });
    if (!Array.isArray(envelope?.data)) throw invalidSuccessResponse(envelope, path, "GET");
    items.push(...envelope.data);

    const pagination = envelope?.meta?.pagination;
    if (!pagination || !("nextCursor" in pagination)) {
      throw invalidSuccessResponse(envelope, path, "GET");
    }
    const nextCursor = pagination.nextCursor;
    if (nextCursor === null) return items;
    if (typeof nextCursor !== "string" || nextCursor.length === 0) {
      throw invalidSuccessResponse(envelope, path, "GET");
    }
    if (seenCursors.has(nextCursor)) throw new Error("API_PAGINATION_CURSOR_REPEATED");
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  throw new Error("API_PAGINATION_PAGE_LIMIT_EXCEEDED");
}

// ── Auth & join flow ─────────────────────────────────────────────
export const previewInvite = (inviteToken) =>
  request(`/course-invites/${encodeURIComponent(inviteToken)}/preview`, { auth: false });

export const previewCourseInvitation = (invitationCode, { auth = false } = {}) =>
  contractRequest(`/course-invitations/${encodeURIComponent(invitationCode)}`, { auth });

export const listOwnProofTodos = () =>
  contractRequest("/student/proof-todos");

export const submitExerciseProof = (recordId, mediaAssetIds, expectedVersion) =>
  contractRequest(`/student/exercise-records/${encodeURIComponent(recordId)}/proof`, {
    method: "POST",
    idempotent: true,
    body: { mediaAssetIds, expectedVersion },
  });

export const getOwnExerciseRecord = (recordId) =>
  contractRequest(`/student/exercise-records/${encodeURIComponent(recordId)}`);

export const getOwnCurrentCourseContract = () =>
  contractRequest("/student/course");

export async function joinWithInvite(inviteToken, profile) {
  // 1. one-time join capability from the public profile facts
  const capability = await request(`/course-invites/${encodeURIComponent(inviteToken)}/join-capabilities`, {
    method: "POST", auth: false, idempotent: true, body: profile,
  });
  // 2. consume it — atomically creates User/StudentProfile/Enrollment/AuthSession
  const joined = await rawRequest(`/course-invites/${encodeURIComponent(inviteToken)}/join`, {
    method: "POST", auth: false, idempotent: true,
    headers: { "X-Join-Capability": capability.joinCapability },
  });
  storeAuthSession(joined.authSession);
  return joined;
}

export async function logoutApi() {
  const tokens = readTokens();
  // Invalidate the local session synchronously. The best-effort server revoke
  // uses the captured bearer token and can no longer clear a later login.
  clearApiSession();
  try {
    if (tokens?.refreshToken && tokens.accessToken) {
      await rawRequest("/auth/logout", {
        method: "POST",
        auth: false,
        idempotent: true,
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
        body: { refreshToken: tokens.refreshToken },
      });
    }
  } catch { /* best effort */ }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function isApiDateTime(value) {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value) &&
    Number.isFinite(Date.parse(value));
}

function hasExactKeys(value, expectedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function invalidSuccessResponse(envelope, route, method = "POST") {
  const requestId = typeof envelope?.meta?.requestId === "string" && envelope.meta.requestId.length > 0
    ? envelope.meta.requestId.slice(0, 128)
    : null;
  return new ApiError(502, { code: "SYSTEM_INVALID_RESPONSE", requestId }, {
    method,
    route,
  });
}

function validateAccountDeletionChallenge(envelope) {
  const value = envelope?.data;
  if (!hasExactKeys(value, ["challengeId", "mode", "expiresAt", "version"]) ||
      !UUID_PATTERN.test(value.challengeId) ||
      value.mode !== "STUDENT_EMAIL_OTP" ||
      !isApiDateTime(value.expiresAt) ||
      !Number.isInteger(value.version) || value.version <= 0) {
    throw invalidSuccessResponse(envelope, "/me/account-deletion-challenges");
  }
  return value;
}

function validateAccountDeletionResult(envelope) {
  const value = envelope?.data;
  if (!hasExactKeys(value, ["status", "deletedAt", "allSessionsRevoked", "newRegistrationRequired"]) ||
      value.status !== "DELETED" ||
      !isApiDateTime(value.deletedAt) ||
      value.allSessionsRevoked !== true ||
      value.newRegistrationRequired !== true) {
    throw invalidSuccessResponse(envelope, "/me/account-deletion-challenges/:id/confirm");
  }
  return value;
}

export function requestCurrentUserAccountDeletionChallenge(expectedVersion) {
  if (!Number.isInteger(expectedVersion) || expectedVersion <= 0) {
    throw new ApiError(422, { code: "VALIDATION_FAILED" }, {
      method: "POST",
      route: "/me/account-deletion-challenges",
    });
  }
  return request("/me/account-deletion-challenges", {
    method: "POST",
    idempotent: true,
    includeMeta: true,
    body: {
      expectedVersion,
      locale: currentLocale() === "en-US" ? "en" : "zh-CN",
    },
  }).then(validateAccountDeletionChallenge);
}

export async function confirmCurrentUserAccountDeletion(challengeId, expectedVersion, verificationCode) {
  const code = String(verificationCode || "").trim();
  if (!UUID_PATTERN.test(String(challengeId || "")) ||
      !Number.isInteger(expectedVersion) || expectedVersion <= 0 ||
      !/^\d{4,10}$/u.test(code)) {
    throw new ApiError(422, { code: "VALIDATION_FAILED" }, {
      method: "POST",
      route: "/me/account-deletion-challenges/:id/confirm",
    });
  }
  const envelope = await request(
    `/me/account-deletion-challenges/${encodeURIComponent(challengeId)}/confirm`,
    {
      method: "POST",
      idempotent: true,
      includeMeta: true,
      body: { expectedVersion, verificationCode: code },
    },
  );
  const result = validateAccountDeletionResult(envelope);
  clearApiSession();
  return result;
}

// ── Student data ─────────────────────────────────────────────────
export const getMe = () => request("/me");
export const getCurrentSemester = () => request("/semesters/current");
export const listMyEnrollments = () => listAllCursorPages("/enrollments");
export const listMyClassSections = () => listAllCursorPages("/class-sections");
export const getCourseById = (courseId) => request(`/courses/${courseId}`);
export const listMyRecords = () => listAllCursorPages("/exercise-records?limit=50&sort=-businessDate");
export const getRecordEvidenceContext = (recordId) =>
  request(`/exercise-records/${recordId}/evidence-context`);
export const listMyScores = () => listAllCursorPages("/student-scores");
export const listMyStudentProgress = () => listAllCursorPages("/student-progress?limit=100");
export const getClassProgressTarget = (classSectionId) =>
  request(`/class-sections/${encodeURIComponent(classSectionId)}/progress-target`);
export const getActiveSession = () => request("/exercise-sessions/active");
export const listMyActivityCertificationApplications = () =>
  listAllCursorPages("/activity-certification-applications?limit=100");
export const listRecognitionAllocationRevisions = (applicationId) =>
  listAllCursorPages(`/activity-certification-applications/${encodeURIComponent(applicationId)}/recognition-allocation-revisions?limit=100`);
export const previewEnduranceConversion = ({ timeSeconds, gender, gradeLevel }) =>
  request("/activity-conversion-rules/preview", {
    method: "POST",
    body: {
      timeSeconds,
      gender: String(gender || "").toUpperCase(),
      gradeLevel: String(gradeLevel || "").toUpperCase(),
    },
  });

// ── Student feedback ─────────────────────────────────────────────
export const listMyFeedback = () => listAllCursorPages("/feedback");
export const createFeedback = ({ category, content }) =>
  request("/feedback", {
    method: "POST",
    idempotent: true,
    body: {
      category,
      content,
      clientContext: { platform: "WEB" },
    },
  });

// ── Published help content ──────────────────────────────────────
function isHelpArticleProjection(value, locale) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    typeof value.id === "string" && value.id.length > 0 &&
    typeof value.category === "string" && value.category.length > 0 &&
    value.locale === locale &&
    typeof value.title === "string" && value.title.trim().length > 0 &&
    typeof value.bodyMarkdown === "string" && value.bodyMarkdown.trim().length > 0 &&
    isApiDateTime(value.publishedAt) &&
    Number.isInteger(value.version) && value.version > 0;
}

export function normalizeSystemModeProjection(projection) {
  const rawMode = typeof projection?.mode === "string"
    ? projection.mode.trim().toUpperCase()
    : "";
  return {
    // Missing, retired, or unknown values fail closed. Only an explicit
    // NORMAL projection may open the student workspace.
    mode: rawMode === "NORMAL" ? "NORMAL" : "MAINTENANCE",
    policyVersion: Number.isInteger(projection?.policyVersion)
      ? projection.policyVersion
      : null,
    updatedAt: typeof projection?.updatedAt === "string"
      ? projection.updatedAt
      : null,
  };
}

export async function getSystemModeStatus() {
  return normalizeSystemModeProjection(
    await request("/system-mode", { auth: false }),
  );
}

/** Current-language, published-only projections from the administrator source. */
export async function listHelpArticles() {
  const locale = apiLocale();
  const route = `/help-articles?locale=${encodeURIComponent(locale)}`;
  const envelope = await request(route, { includeMeta: true });
  if (!Array.isArray(envelope?.data) || !envelope.data.every((item) => isHelpArticleProjection(item, locale))) {
    throw invalidSuccessResponse(envelope, route, "GET");
  }
  return envelope.data;
}

// ── Student exemption applications ──────────────────────────────
export const listMyStructuredExemptionApplications = () =>
  listAllCursorPages("/exemption-application-details");
export const createExemptionApplication = (input) =>
  request("/exemption-applications", {
    method: "POST",
    idempotent: true,
    body: input,
  });
export const updateExemptionApplication = (applicationId, input) =>
  request(`/exemption-applications/${encodeURIComponent(applicationId)}`, {
    method: "PATCH",
    idempotent: true,
    body: input,
  });
export const submitExemptionApplication = (applicationId, expectedVersion) =>
  request(`/exemption-applications/${encodeURIComponent(applicationId)}/submit`, {
    method: "POST",
    idempotent: true,
    body: { expectedVersion },
  });

// ── Exercise sessions ────────────────────────────────────────────
export const startServerSession = (enrollmentId) =>
  request("/exercise-sessions", {
    method: "POST", idempotent: true,
    body: { enrollmentId, clientObservedAt: new Date().toISOString() },
  });
export const pauseServerSession = (sessionId, expectedVersion) =>
  request(`/exercise-sessions/${sessionId}/pause`, {
    method: "POST", idempotent: true,
    body: { expectedVersion, clientObservedAt: new Date().toISOString() },
  });
export const resumeServerSession = (sessionId, expectedVersion) =>
  request(`/exercise-sessions/${sessionId}/resume`, {
    method: "POST", idempotent: true,
    body: { expectedVersion, clientObservedAt: new Date().toISOString() },
  });
export const finishServerSession = (sessionId, expectedVersion) =>
  request(`/exercise-sessions/${sessionId}/finish`, {
    method: "POST", idempotent: true,
    body: { expectedVersion, clientObservedAt: new Date().toISOString() },
  });
export const cancelServerSession = (sessionId, expectedVersion, reason) =>
  request(`/exercise-sessions/${sessionId}/cancel`, {
    method: "POST", idempotent: true,
    body: { expectedVersion, reason: reason || "student cancelled" },
  });

// ── Exercise records ─────────────────────────────────────────────
const SPORT_TYPE_MAP = {
  running: "RUNNING", basketball: "BASKETBALL", football: "FOOTBALL",
  badminton: "BADMINTON", table_tennis: "TABLE_TENNIS", swimming: "SWIMMING",
  fitness: "FITNESS", cycling: "CYCLING", other: "OTHER",
};
export const toServerSportType = (value) => SPORT_TYPE_MAP[value] || "OTHER";

export const createRecordDraft = ({ sessionId, creditType, sportType, sportName, description }) =>
  request("/exercise-records", {
    method: "POST", idempotent: true,
    body: {
      sessionId,
      creditType: creditType === "course" ? "COURSE_RELATED" : "GENERAL",
      sportType: toServerSportType(sportType),
      sportName: sportName || null,
      description,
      clientRequestId: uuid(),
    },
  });
export const submitRecord = (recordId, mediaIds, expectedVersion) =>
  request(`/exercise-records/${recordId}/submit`, {
    method: "POST", idempotent: true,
    body: { mediaIds, expectedVersion },
  });
// ── Media evidence ───────────────────────────────────────────────
async function sha256Hex(blob) {
  if (!globalThis.crypto?.subtle) {
    throw new ApiError(0, {
      code: "MEDIA_HASH_UNAVAILABLE",
      message: tx("当前页面无法安全计算文件摘要，请使用 HTTPS 或本机地址后重试。", "This page cannot securely hash the file. Use HTTPS or a local address and try again."),
    });
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function normalizeUploadEtag(value) {
  const etag = String(value || "").trim().replaceAll('"', "").trim();
  return etag || null;
}

/**
 * Applies the worker's authoritative status without forgetting confirmed
 * evidence. FAILED/PROCESSING remain attached to the retained Session set so
 * neither the UI nor a retry can silently exclude them from final submission.
 */
export function applyMediaVerificationState(draft, media) {
  const status = media?.uploadStatus || "PROCESSING";
  if (status === "AVAILABLE") {
    draft.mediaId = media.id || draft.pendingUpload?.initiated?.mediaId || null;
    draft.pendingUpload = null;
    return "AVAILABLE";
  }
  if (draft.pendingUpload) draft.pendingUpload.verificationStatus = status;
  return status;
}

export async function uploadMediaDraft(serverSessionId, draft, blob) {
  const isVideo = draft.type === "video";
  const verdict = validateProofFile(blob, draft.type, { durationSeconds: draft.durationSeconds });
  if (!verdict.ok) {
    const code = verdict.error === "duration" ? "MEDIA_VIDEO_DURATION_EXCEEDED" : verdict.error === "size" ? "MEDIA_SIZE_EXCEEDED" : "MEDIA_TYPE_NOT_ALLOWED";
    throw new ApiError(422, { code, message: "Media draft failed current API validation" });
  }

  const declaredContentSha256 = await sha256Hex(blob);
  const signature = `${verdict.mimeType}:${blob.size}:${declaredContentSha256}:${verdict.durationSeconds ?? "image"}`;
  if (draft.pendingUpload?.signature !== signature) draft.pendingUpload = null;

  if (!draft.pendingUpload) {
    draft.initiateIdempotencyKey ||= uuid();
    const initiated = await request("/media-uploads", {
      method: "POST",
      headers: { "Idempotency-Key": draft.initiateIdempotencyKey },
      body: {
        sessionId: serverSessionId,
        businessPurpose: "EXERCISE_RECORD",
        mediaType: isVideo ? "VIDEO" : "IMAGE",
        mimeType: verdict.mimeType,
        fileSizeBytes: blob.size,
        captureSource: "IN_APP_CAMERA",
        declaredContentSha256,
        durationSeconds: isVideo ? verdict.durationSeconds : null,
      },
    });
    draft.pendingUpload = {
      signature,
      initiated,
      objectUploaded: false,
      confirmed: null,
      bound: false,
      confirmIdempotencyKey: uuid(),
      bindIdempotencyKey: uuid(),
    };
  }

  const pending = draft.pendingUpload;
  const initiated = pending.initiated;
  try {
    if (!pending.objectUploaded) {
      const put = await fetch(proxyObjectUrl(initiated.uploadUrl), {
        method: initiated.uploadMethod || "PUT",
        headers: initiated.requiredHeaders || {},
        body: blob,
      });
      if (!put.ok) throw new ApiError(put.status, { code: "MEDIA_UPLOAD_FAILED", message: `Object upload failed (${put.status})` });
      pending.etag = normalizeUploadEtag(put.headers.get("ETag"));
      if (!pending.etag) {
        throw new ApiError(502, {
          code: "MEDIA_ETAG_MISSING",
          message: "Object upload response did not include the required ETag",
        });
      }
      pending.objectUploaded = true;
    }

    if (!pending.confirmed) {
      pending.confirmed = await request(`/media-uploads/${initiated.uploadSessionId}/confirm`, {
        method: "POST",
        headers: { "Idempotency-Key": pending.confirmIdempotencyKey },
        body: { etag: pending.etag },
      });
    }

    if (!pending.bound) {
      await request(`/media/${initiated.mediaId}/bind`, {
        method: "POST",
        headers: { "Idempotency-Key": pending.bindIdempotencyKey },
        body: { sessionId: serverSessionId, expectedVersion: pending.confirmed.version },
      });
      pending.bound = true;
    }
  } catch (error) {
    if (error instanceof ApiError && ["MEDIA_UPLOAD_SESSION_EXPIRED", "MEDIA_INTEGRITY_MISMATCH", "MEDIA_VIDEO_DURATION_EXCEEDED", "MEDIA_AUDIO_TRACK_REQUIRED", "MEDIA_LOCATION_METADATA_NOT_ALLOWED"].includes(error.code)) {
      draft.pendingUpload = null;
      draft.initiateIdempotencyKey = uuid();
    }
    throw error;
  }

  // The media worker verifies bytes asynchronously; submission requires the
  // media to be AVAILABLE, so wait for verification to land (max ~15s).
  for (let attempt = 0; attempt < 20; attempt++) {
    const current = await request(`/media/${initiated.mediaId}`);
    const verificationStatus = applyMediaVerificationState(draft, current);
    if (verificationStatus === "AVAILABLE") {
      draft.mediaId ||= initiated.mediaId;
      return { mediaId: initiated.mediaId, media: current };
    }
    if (verificationStatus === "FAILED") {
      throw new ApiError(422, { code: "MEDIA_FAILURE_NOT_RETRYABLE", message: "Media verification failed" });
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  if (draft.pendingUpload) draft.pendingUpload.verificationStatus = "PROCESSING";
  throw new ApiError(422, { code: "MEDIA_VERIFICATION_INCOMPLETE", message: "Media verification did not finish in time" });
}

/** Uploads one proof into an owned exemption draft; association is performed
 * by the subsequent versioned PATCH so removed draft evidence stays auditable. */
export async function uploadExemptionApplicationMediaDraft(applicationId, draft, blob) {
  const verdict = validateProofFile(blob, "image");
  if (!verdict.ok) {
    const code = verdict.error === "size" ? "MEDIA_SIZE_EXCEEDED" : "MEDIA_TYPE_NOT_ALLOWED";
    throw new ApiError(422, { code });
  }

  const declaredContentSha256 = await sha256Hex(blob);
  const signature = `${verdict.mimeType}:${blob.size}:${declaredContentSha256}`;
  if (draft.pendingUpload?.signature !== signature) draft.pendingUpload = null;
  if (!draft.pendingUpload) {
    draft.initiateIdempotencyKey ||= uuid();
    const initiated = await request(
      `/exemption-applications/${encodeURIComponent(applicationId)}/media-uploads`,
      {
        method: "POST",
        headers: { "Idempotency-Key": draft.initiateIdempotencyKey },
        body: {
          mediaType: "IMAGE",
          mimeType: verdict.mimeType,
          fileSizeBytes: blob.size,
          captureSource: draft.captureSource === "IN_APP_CAMERA" ? "IN_APP_CAMERA" : "FILE_PICKER",
          declaredContentSha256,
          durationSeconds: null,
        },
      },
    );
    draft.pendingUpload = {
      signature,
      initiated,
      objectUploaded: false,
      confirmed: null,
      confirmIdempotencyKey: uuid(),
    };
  }

  const pending = draft.pendingUpload;
  const initiated = pending.initiated;
  try {
    if (!pending.objectUploaded) {
      const put = await fetch(proxyObjectUrl(initiated.uploadUrl), {
        method: initiated.uploadMethod || "PUT",
        headers: initiated.requiredHeaders || {},
        body: blob,
      });
      if (!put.ok) throw new ApiError(put.status, { code: "MEDIA_UPLOAD_FAILED" });
      pending.etag = normalizeUploadEtag(put.headers.get("ETag"));
      if (!pending.etag) throw new ApiError(502, { code: "MEDIA_ETAG_MISSING" });
      pending.objectUploaded = true;
    }
    if (!pending.confirmed) {
      pending.confirmed = await request(`/media-uploads/${initiated.uploadSessionId}/confirm`, {
        method: "POST",
        headers: { "Idempotency-Key": pending.confirmIdempotencyKey },
        body: { etag: pending.etag },
      });
    }
  } catch (error) {
    if (error instanceof ApiError && [
      "MEDIA_UPLOAD_SESSION_EXPIRED",
      "MEDIA_INTEGRITY_MISMATCH",
      "MEDIA_LOCATION_METADATA_NOT_ALLOWED",
    ].includes(error.code)) {
      draft.pendingUpload = null;
      draft.initiateIdempotencyKey = uuid();
    }
    throw error;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = await request(`/media/${encodeURIComponent(initiated.mediaId)}`);
    if (current?.uploadStatus === "AVAILABLE") {
      draft.mediaId = initiated.mediaId;
      draft.pendingUpload = null;
      return { mediaId: initiated.mediaId, media: current };
    }
    if (current?.uploadStatus === "FAILED") {
      throw new ApiError(422, { code: "MEDIA_FAILURE_NOT_RETRYABLE" });
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new ApiError(422, { code: "MEDIA_VERIFICATION_INCOMPLETE" });
}

export const createMediaAccessUrl = (mediaId) =>
  request(`/media/${mediaId}/access-url`, {
    method: "POST", idempotent: true, body: { purpose: "VIEW_ORIGINAL" },
  });
export const getMediaEvidence = (mediaId) => request(`/media/${mediaId}`);

export function mapMediaEvidenceProof(media, index = 0) {
  const type = media.mediaType === "VIDEO" ? "video" : "image";
  const duration = type === "video"
    ? Number(media.verifiedDurationSeconds ?? media.declaredDurationSeconds ?? 0)
    : 0;
  return {
    id: media.id,
    mediaId: media.id,
    type,
    fileName: type === "video"
      ? tx(`运动视频 ${index + 1}`, `Exercise video ${index + 1}`)
      : tx(`运动照片 ${index + 1}`, `Exercise photo ${index + 1}`),
    durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : null,
    source: `media:${media.id}`,
  };
}

/**
 * Reloads private proof metadata from the authoritative record relation. This
 * is required after signing in on a different browser/device: the local draft
 * cache only describes uploads made by this browser and is never the record of
 * truth for already submitted evidence.
 */
export async function loadServerRecordProofs(recordId) {
  const context = await getRecordEvidenceContext(recordId);
  const media = await Promise.all((context.mediaIds || []).map(getMediaEvidence));
  return media.map(mapMediaEvidenceProof);
}

// Local per-record proof metadata cache keeps a fast same-device preview. The
// authoritative cross-device list is reloaded through evidence-context above.
export function cacheRecordProofs(recordId, proofs) {
  try {
    const all = JSON.parse(readRaw("recordProofCache") || "{}");
    all[recordId] = proofs;
    writeRaw("recordProofCache", JSON.stringify(all));
  } catch { /* ignore */ }
}
export function readRecordProofs(recordId) {
  try { return JSON.parse(readRaw("recordProofCache") || "{}")[recordId] || []; } catch { return []; }
}

// ── Email-only student authentication and binding ────────────────
export const requestStudentSignInCode = (account) =>
  request("/auth/student-sign-in-codes", {
    method: "POST", auth: false, idempotent: true,
    body: { organizationCode: organizationCode(), account: account.trim(), channel: "EMAIL", locale: apiLocale() },
  });

export async function verifyStudentSignInCode(challengeId, code) {
  const authSession = await request("/auth/student-sign-in-codes/verify", {
    method: "POST", auth: false, idempotent: true,
    body: { challengeId, code, deviceId: stableDeviceId() },
  });
  storeAuthSession(authSession);
  return authSession;
}

export const requestEmailVerificationChallenge = (email, expectedVersion) =>
  request("/me/email-verification-challenges", {
    method: "POST", idempotent: true,
    body: { email: email.trim(), locale: apiLocale(), expectedVersion },
  });

export const verifyEmailVerificationChallenge = (challengeId, { newEmailCode, currentEmailCode = null }) =>
  request(`/me/email-verification-challenges/${challengeId}/verify`, {
    method: "POST", idempotent: true,
    body: currentEmailCode ? { currentEmailCode, newEmailCode } : { newEmailCode },
  });

// ── Workspace assembly ───────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, "0");
function formatLocal(dateInput) {
  if (!dateInput) return "";
  // A bare business date (YYYY-MM-DD) is a calendar day, not an instant:
  // `new Date("2026-08-09")` parses as UTC midnight and would render as the
  // previous day west of Greenwich. Pass it through untouched.
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateInput))) return String(dateInput);
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const SERVER_SPORT_LABELS = {
  RUNNING: ["跑步", "Running"], BASKETBALL: ["篮球", "Basketball"], FOOTBALL: ["足球", "Football"],
  BADMINTON: ["羽毛球", "Badminton"], TABLE_TENNIS: ["乒乓球", "Table tennis"], SWIMMING: ["游泳", "Swimming"],
  FITNESS: ["健身", "Fitness"], CYCLING: ["骑行", "Cycling"], OTHER: ["其他", "Other"],
};

export function mapServerRecord(record, { courseIdBySection = {} } = {}) {
  const credited = (record.creditedDurationSeconds || 0) / 3600;
  const actual = (record.actualDurationSeconds || 0) / 3600;
  const review = record.currentReview;
  const reviewText = review
    ? review.result === "VALID"
      ? review.publicComment || tx("记录有效，已计入运动时长。", "Record valid; hours credited.")
      : review.result === "INVALID"
        ? (review.publicComment ? tx(`未通过：${review.publicComment}`, `Rejected: ${review.publicComment}`) : tx("记录未通过审核。", "Record was rejected."))
        : tx("记录审核状态异常。", "The record review state is invalid.")
    : tx("记录缺少有效审核状态。", "The record has no valid review state.");
  const label = record.sportName || (SERVER_SPORT_LABELS[record.sportType] ? tx(...SERVER_SPORT_LABELS[record.sportType]) : record.sportType);
  const proofs = readRecordProofs(record.id);
  return {
    id: record.id,
    enrollmentId: record.enrollmentId,
    sessionId: record.sessionId,
    version: record.version,
    serverStatus: record.status,
    reviewResult: review?.result || null,
    reviewReasonCode: review?.reasonCode || null,
    reviewPublicComment: review?.publicComment || null,
    courseId: record.creditType === "COURSE_RELATED" ? (courseIdBySection[record.classSectionId] || null) : null,
    taskTitle: record.description || tx("运动打卡", "Exercise check-in"),
    creditType: record.creditType === "COURSE_RELATED" ? "course" : "general",
    // creditedDurationSeconds is the Backend's authoritative credit. Falling
    // back to the actual duration would be a second, client-side derivation of
    // a value only the server owns (current API). The raw activity time is
    // still available below as actualDurationSeconds.
    hours: credited,
    // The backend's business day (Beijing). Daily rules are evaluated against
    // this, never against the device date.
    businessDate: record.businessDate,
    // Timestamps stay in the student's local time; only the daily rules and the
    // teacher/admin portal are pinned to Beijing.
    submittedAt: formatLocal(record.submittedAt || record.businessDate),
    proofSummary: proofs.length ? "" : tx("凭证已提交", "Proof submitted"),
    proofPhotoCount: proofs.filter((p) => p.type === "image").length,
    proofVideoCount: proofs.filter((p) => p.type === "video").length,
    proofFiles: proofs.map((p) => ({ ...p, source: p.mediaId ? `media:${p.mediaId}` : p.source || "" })),
    serverProofsLoaded: false,
    teacherPublicFeedback: reviewText,
    teacherInternalNote: null,
    note: record.description || "",
    remark: "",
    sportType: label,
    sportCode: String(record.sportType || "").toLowerCase() || "other",
    customSportName: record.sportType === "OTHER" ? record.sportName || "" : "",
    startTime: null,
    endTime: record.submittedAt,
    actualDurationSeconds: record.actualDurationSeconds ?? null,
  };
}

/** Student membership has only two user-visible states. */
export function deriveStudentStatus(enrollments = []) {
  return enrollments.some((enrollment) =>
    ["ACTIVE", "ENROLLED"].includes(String(enrollment?.status ?? enrollment?.enrollmentStatus ?? "").toUpperCase()),
  ) ? "ACTIVE" : "PENDING";
}

/** Maps the exact current API `/me` projection without inventing plaintext contacts. */
export function mapServerStudent(me, profile, semester = null, studentStatus = "PENDING") {
  const admissionYear = Number(profile.gradeYear) || null;
  const academicYearStart = Number.parseInt(String(semester?.academicYear || "").slice(0, 4), 10);
  const yearIndex = admissionYear && Number.isInteger(academicYearStart)
    ? academicYearStart - admissionYear
    : null;
  const gradeLevel = ["freshman", "sophomore", "junior", "senior"][yearIndex] || "";
  return {
    id: profile.studentNumber,
    name: profile.fullName,
    email: me.user?.primaryEmailMasked || "",
    emailVerified: Boolean(me.user?.emailVerified),
    userVersion: me.user?.version || 1,
    college: profile.collegeName || "",
    className: profile.administrativeClassName || "",
    status: studentStatus === "ACTIVE" ? "ACTIVE" : "PENDING",
    gender: String(profile.gender || "").toLowerCase(),
    gradeLevel,
    admissionYear,
    currentAcademicYear: semester?.academicYear || "",
    gradeCalculatedAt: "",
    accountStatus: me.user?.status || "ACTIVE",
  };
}

/**
 * StudentScore carries baseScore/adjustmentTotal/finalScore — there is no
 * `totalScore` or `score` field. Both stay nullable even once the score is
 * PUBLISHED, so a missing value must read as "not calculated" rather than 0.
 */
export function mapPublishedScore(publishedScore) {
  if (!publishedScore) {
    return { totalScore: null, totalDisplay: tx("未开放", "Not available") };
  }
  const totalScore = publishedScore.finalScore ?? publishedScore.baseScore ?? null;
  return {
    totalScore,
    totalDisplay: totalScore === null ? tx("待计算", "Not calculated") : String(totalScore),
  };
}

/** Read only the identity projection allowed during first contact binding. */
export async function loadApiStudentIdentity() {
  const me = await getMe();
  const profile = me.studentProfile;
  if (!profile) throw new ApiError(403, { code: "FORBIDDEN", message: "Not a student account" });
  return { me, profile, student: mapServerStudent(me, profile) };
}

export function selectCurrentStudentScore(scores, enrollments, sections, semester) {
  if (!semester?.id) return null;
  const currentSectionIds = new Set(
    sections
      .filter((section) => section.semesterId === semester.id)
      .map((section) => section.id),
  );
  const currentEnrollment = enrollments.find(
    (enrollment) =>
      enrollment.status === "ACTIVE" &&
      currentSectionIds.has(enrollment.classSectionId),
  );
  if (!currentEnrollment) return null;
  return scores.find((score) => score.enrollmentId === currentEnrollment.id) || null;
}

export function mapStudentScoreProgress(score) {
  if (!score) {
    return {
      course: 0,
      general: 0,
      rawCourse: 0,
      rawGeneral: 0,
      totalValidHours: null,
      qualificationStatus: null,
      scoreAvailable: false,
    };
  }
  const course = Math.max(0, Number(score.validCourseDurationSeconds) || 0) / 3600;
  const general = Math.max(0, Number(score.validGeneralDurationSeconds) || 0) / 3600;
  return {
    course,
    general,
    rawCourse: course,
    rawGeneral: general,
    totalValidHours:
      Math.max(0, Number(score.totalValidDurationSeconds) || 0) / 3600,
    qualificationStatus: score.qualificationStatus || null,
    scoreAvailable: true,
  };
}

const EXEMPTION_SUBTYPE_TO_UI = Object.freeze({
  RUN_800M: "800m",
  RUN_1000M: "1000m",
  SCHOOL_TEAM: "team",
  STUDENT_CLUB: "club",
  SPECIAL_CIRCUMSTANCE: "special",
});

function exemptionStatusToUi(status) {
  return {
    DRAFT: tx("草稿", "Draft"),
    SUBMITTED: tx("待审核", "Under review"),
    SUPPLEMENT_REQUIRED: tx("需补材料", "Additional materials required"),
    APPROVED: tx("已通过", "Approved"),
    REJECTED: tx("已驳回", "Rejected"),
    REVOKED: tx("已撤销", "Revoked"),
  }[status] || status;
}

export function mapClassSectionCheckInTimeWindow(section) {
  const start = typeof section?.dailyStartTime === "string"
    ? section.dailyStartTime.slice(0, 5)
    : null;
  const end = typeof section?.dailyEndTime === "string"
    ? section.dailyEndTime.slice(0, 5)
    : null;
  return {
    windowMode: section?.checkInWindowMode === "AVAILABLE" ? "semester_wide" : "unavailable",
    dateRangeStart: section?.checkInStartDate || null,
    dateRangeEnd: section?.checkInEndDate || null,
    dailyStartTime: start,
    dailyEndTime: end,
    excludedDates: Array.isArray(section?.excludedDates) ? section.excludedDates : [],
    semesterDeadline: section?.submissionDeadlineAt
      ? String(section.submissionDeadlineAt).slice(0, 10)
      : null,
  };
}

export function selectCurrentStudentProgress(progressRows, enrollment, section, semester) {
  if (!enrollment?.id || !section?.id || !semester?.id) return null;
  return progressRows.find((progress) =>
    progress.enrollmentId === enrollment.id &&
    progress.classSectionId === section.id &&
    progress.semesterId === semester.id,
  ) || null;
}

export function mapStudentProgressProjection(progress) {
  if (!progress) return null;
  const courseSeconds = Math.max(0, Number(progress.courseRelated?.validExerciseSeconds) || 0);
  const generalSeconds = Math.max(0, Number(progress.general?.validExerciseSeconds) || 0);
  return {
    course: courseSeconds / 3600,
    general: generalSeconds / 3600,
    rawCourse: courseSeconds / 3600,
    rawGeneral: generalSeconds / 3600,
    totalValidHours: (courseSeconds + generalSeconds) / 3600,
    qualificationStatus: progress.status === "COMPLETED" ? "QUALIFIED" : "NOT_QUALIFIED",
    scoreAvailable: true,
  };
}

export function mapProgressTarget(target, progress = null) {
  const courseSeconds = target?.courseTargetSeconds ?? progress?.courseRelated?.targetSeconds;
  const generalSeconds = target?.generalTargetSeconds ?? progress?.general?.targetSeconds;
  const totalSeconds = target?.totalTargetSeconds ?? (
    Number.isFinite(Number(courseSeconds)) && Number.isFinite(Number(generalSeconds))
      ? Number(courseSeconds) + Number(generalSeconds)
      : undefined
  );
  const toHours = (seconds) => Number.isFinite(Number(seconds))
    ? Math.max(0, Number(seconds)) / 3600
    : null;
  return {
    total: toHours(totalSeconds),
    courseRequired: toHours(courseSeconds),
    generalRequired: toHours(generalSeconds),
    dailyLimit: null,
    categoryAllocationMode:
      Number.isFinite(Number(courseSeconds)) && Number.isFinite(Number(generalSeconds))
        ? "CATEGORY_TARGETS"
        : "TOTAL_ONLY",
    source: target || progress ? "student-progress" : null,
  };
}

export function mapStructuredExemptionApplication(application) {
  const type = EXEMPTION_SUBTYPE_TO_UI[application.applicationSubtype] || "special";
  return {
    id: application.id,
    type,
    applicationType: application.applicationType,
    applicationSubtype: application.applicationSubtype,
    enrollmentId: application.enrollmentId,
    classSectionId: application.classSectionId,
    organization: application.organizationName || "",
    reason: application.reason,
    mediaIds: Array.isArray(application.mediaIds) ? [...application.mediaIds] : [],
    proofFiles: Array.isArray(application.mediaIds)
      ? application.mediaIds.map((mediaId) => `media:${mediaId}`)
      : [],
    status: exemptionStatusToUi(application.status),
    serverStatus: application.status,
    reviewComment: application.publicComment || null,
    createdAt: application.submittedAt ? formatLocal(application.submittedAt) : tx("尚未提交", "Not submitted"),
    submittedAt: application.submittedAt || null,
    decidedAt: application.decidedAt || null,
    version: application.version,
  };
}

export function mapStructuredOrganizationMembership(application, expectedStudentId = null) {
  const type = {
    SCHOOL_TEAM: "team",
    STUDENT_CLUB: "club",
  }[application?.applicationSubtype];
  if (
    application?.applicationType !== "EXERCISE_CHECK_IN" ||
    !type ||
    typeof application.organizationName !== "string" ||
    application.organizationName.trim().length === 0 ||
    (expectedStudentId && application.studentId !== expectedStudentId)
  ) return null;

  return {
    id: application.id,
    type,
    organization: application.organizationName.trim(),
    studentId: application.studentId,
    status: exemptionStatusToUi(application.status),
    validUntil: null,
    offset: null,
    comment: application.publicComment || "",
    submittedAt: application.submittedAt ? formatLocal(application.submittedAt) : null,
    decidedAt: application.decidedAt ? formatLocal(application.decidedAt) : null,
    version: application.version,
    dataSource: "backend",
  };
}

function recognitionHoursText(seconds) {
  const hours = Math.max(0, Number(seconds) || 0) / 3600;
  return Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(2)));
}

export function mapActivityCertificationMembership(application, revisions = [], expectedStudentId = null) {
  const type = {
    SCHOOL_TEAM: "team",
    STUDENT_CLUB: "club",
  }[application?.certificationType];
  if (
    !type ||
    typeof application.organizationName !== "string" ||
    application.organizationName.trim().length === 0 ||
    (expectedStudentId && application.studentId !== expectedStudentId)
  ) return null;

  const latestRevision = revisions
    .filter((revision) => revision?.applicationId === application.id)
    .sort((left, right) => Number(right.revisionNumber) - Number(left.revisionNumber))[0] || null;
  let offset = null;
  if (application.status === "APPROVED" && latestRevision) {
    const parts = [];
    if (Number(latestRevision.courseSeconds) > 0) {
      parts.push(tx(`课程相关时长 ${recognitionHoursText(latestRevision.courseSeconds)} 小时`, `${recognitionHoursText(latestRevision.courseSeconds)} course-related hour(s)`));
    }
    if (Number(latestRevision.generalSeconds) > 0) {
      parts.push(tx(`其他运动时长 ${recognitionHoursText(latestRevision.generalSeconds)} 小时`, `${recognitionHoursText(latestRevision.generalSeconds)} other-exercise hour(s)`));
    }
    offset = parts.length > 0 ? parts.join(tx("，", ", ")) : tx("未抵扣学时", "No recognized hours");
  }

  return {
    id: application.id,
    type,
    organization: application.organizationName.trim(),
    studentId: application.studentId,
    status: exemptionStatusToUi(application.status),
    validFrom: application.validFrom || null,
    validUntil: application.validTo || null,
    offset,
    comment: application.currentDecisionReason || latestRevision?.reason || "",
    submittedAt: null,
    decidedAt: null,
    version: application.version,
    recognitionRevisionId: latestRevision?.id || null,
    dataSource: "backend",
  };
}

function notificationCategory(notification) {
  const facts = `${notification.notificationType || ""} ${notification.title || ""} ${notification.body || ""}`.toUpperCase();
  if (/EXEMPTION|CERTIFICATION|APPLICATION|SUPPLEMENT|MATERIAL|REVIEW|免测|免打卡|认证|材料|申请/u.test(facts)) return "review";
  if (/DEADLINE|EXPIR|CLOSING|截止|到期/u.test(facts)) return "deadline";
  return "general";
}

export function mapServerNotification(notification) {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.body,
    time: formatLocal(notification.createdAt),
    createdAt: notification.createdAt,
    category: notificationCategory(notification),
    notificationType: notification.notificationType,
    targetType: notification.targetType,
    targetId: notification.targetId,
    isUnread: notification.readAt === null,
    readAt: notification.readAt,
  };
}

export const listMyNotifications = () => listAllCursorPages("/notifications?limit=100");

export const markNotificationRead = (notificationId) =>
  request(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
    idempotent: true,
  });

/** Builds the workspace shape every screen already consumes from live data. */
export async function loadApiWorkspace(preloadedIdentity = null) {
  const identity = preloadedIdentity || (await loadApiStudentIdentity());
  const { me, profile } = identity;

  const optionalNotFound = (promise) => promise.catch((error) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });
  const optionalCapability = (promise) => promise.catch((error) => {
    if (error instanceof ApiError && [404, 501, 503].includes(error.status)) return null;
    throw error;
  });
  const [semester, enrollments, sections, records, scores, studentProgressRows, activeSession, exemptions, activityCertifications, notifications] = await Promise.all([
    optionalNotFound(getCurrentSemester()),
    listMyEnrollments(),
    listMyClassSections(),
    listMyRecords(),
    listMyScores(),
    optionalCapability(listMyStudentProgress()),
    optionalNotFound(getActiveSession()),
    listMyStructuredExemptionApplications(),
    optionalNotFound(listMyActivityCertificationApplications()),
    listMyNotifications(),
  ]);

  const joinContext = readJoinContext();
  const activeEnrollments = enrollments.filter((e) => e.status === "ACTIVE");
  const courseCache = {};
  for (const section of sections) {
    if (!courseCache[section.courseId]) {
      courseCache[section.courseId] = await getCourseById(section.courseId);
    }
  }

  const courseIdBySection = {};
  const courses = sections.map((section) => {
    const course = courseCache[section.courseId];
    const enrollment = activeEnrollments.find((e) => e.classSectionId === section.id) || null;
    courseIdBySection[section.id] = section.courseId;
    const fromInvite = joinContext?.classSectionId === section.id ? joinContext : null;
    const isCurrent = Boolean(semester?.id && section.semesterId === semester.id);
    const checkInTimeWindow = mapClassSectionCheckInTimeWindow(section);
    return {
      id: section.courseId,
      classSectionId: section.id,
      enrollmentId: enrollment?.id || null,
      code: course?.courseCode || fromInvite?.courseCode || section.classCode,
      section: section.classCode,
      name: course?.courseName || fromInvite?.courseName || section.displayName,
      semester: (isCurrent ? semesterDisplayName(semester) : "") || fromInvite?.semesterDisplayName || "",
      teacher: section.teacherDisplayName || section.teacherName || fromInvite?.teacherDisplayName || "",
      teacherId: section.teacherId,
      checkInTimeWindow,
      semesterId: section.semesterId,
      academicYear: isCurrent ? semester?.academicYear || "" : "",
      term: isCurrent ? semester?.termCode || "" : "",
      semesterStatus: isCurrent ? "current" : null,
      status: section.status === "ACTIVE" ? "active" : String(section.status).toLowerCase(),
      enrollmentStatus: enrollment ? "enrolled" : "ended",
      isCurrent,
      deadline: section.submissionDeadlineAt ? formatLocal(section.submissionDeadlineAt) : "",
      students: null, pending: null, completion: null, missing: null,
      finalGrade: null, gradeStatus: null,
    };
  });

  // Only submitted work counts as a check-in record. DRAFT (never submitted)
  // and CANCELLED rows stay out of the list so the record page and the
  // dashboard progress can never disagree.
  const mappedRecords = records
    .filter((r) => r.status === "REVIEWED" && ["VALID", "INVALID"].includes(r.currentReview?.result))
    .map((r) => mapServerRecord(r, { courseIdBySection }));
  // Check-in window from the first ACTIVE enrolled section.
  const activeSection = sections.find((s) => activeEnrollments.some((e) => e.classSectionId === s.id) && s.status === "ACTIVE");
  const timeWindow = activeSection
    ? courses.find((course) => course.classSectionId === activeSection.id)?.checkInTimeWindow || {
        windowMode: "unavailable", dateRangeStart: null, dateRangeEnd: null,
        dailyStartTime: "", dailyEndTime: "", excludedDates: [], semesterDeadline: null,
      }
    : { windowMode: "unavailable", dateRangeStart: null, dateRangeEnd: null, dailyStartTime: "", dailyEndTime: "", excludedDates: [], semesterDeadline: null };

  const currentScore = selectCurrentStudentScore(
    scores,
    activeEnrollments,
    sections,
    semester,
  );
  const currentEnrollment = activeEnrollments.find((enrollment) =>
    sections.some((section) => section.id === enrollment.classSectionId && section.semesterId === semester?.id),
  );
  const currentSection = sections.find((section) => section.id === currentEnrollment?.classSectionId) || null;
  const currentStudentProgress = selectCurrentStudentProgress(
    studentProgressRows || [],
    currentEnrollment,
    currentSection,
    semester,
  );
  const validCurrentRecords = mappedRecords.filter((record) =>
    record.enrollmentId === currentEnrollment?.id && record.reviewResult === "VALID",
  );
  const validCourseHours = validCurrentRecords
    .filter((record) => record.creditType === "course")
    .reduce((total, record) => total + Math.max(0, Number(record.hours) || 0), 0);
  const validGeneralHours = validCurrentRecords
    .filter((record) => record.creditType === "general")
    .reduce((total, record) => total + Math.max(0, Number(record.hours) || 0), 0);
  const recordProgress = {
    course: validCourseHours,
    general: validGeneralHours,
    rawCourse: validCourseHours,
    rawGeneral: validGeneralHours,
    totalValidHours: validCourseHours + validGeneralHours,
    qualificationStatus: currentScore?.qualificationStatus || null,
    scoreAvailable: true,
  };
  const scoreProgress = mapStudentProgressProjection(currentStudentProgress) || recordProgress;
  const progressTarget = currentSection
    ? await optionalCapability(getClassProgressTarget(currentSection.id))
    : null;
  const hourRule = mapProgressTarget(progressTarget, currentStudentProgress);
  const publishedScore = currentScore?.status === "PUBLISHED" ? currentScore : null;
  const { totalScore, totalDisplay } = mapPublishedScore(publishedScore);
  let memberships;
  if (activityCertifications !== null) {
    const ownedCertifications = activityCertifications.filter((application) => application.studentId === profile.id);
    const revisionLists = await Promise.all(ownedCertifications.map((application) =>
      optionalNotFound(listRecognitionAllocationRevisions(application.id))));
    memberships = ownedCertifications
      .map((application, index) => mapActivityCertificationMembership(application, revisionLists[index] || [], profile.id))
      .filter(Boolean);
  } else {
    // Activity-certification reads are not yet available in the
    // current Backend. Until they are, show only the signed-in student's real
    // legacy SCHOOL_TEAM/STUDENT_CLUB applications and never invent offsets.
    memberships = exemptions
      .map((application) => mapStructuredOrganizationMembership(application, profile.id))
      .filter(Boolean);
  }
  const progressStatus =
    scoreProgress.qualificationStatus === "QUALIFIED"
      ? tx("已达标", "Qualified")
      : scoreProgress.qualificationStatus === "NOT_QUALIFIED"
        ? tx("进行中", "In progress")
        : tx("已按有效打卡累计", "Summed from valid check-ins");

  const [proofTodoPage, contractCourse] = await Promise.all([
    optionalCapability(listOwnProofTodos()),
    optionalCapability(getOwnCurrentCourseContract()),
  ]);

  return {
    workspace: {
      student: mapServerStudent(me, profile, semester, deriveStudentStatus(activeEnrollments)),
      courses,
      progress: {
        id: profile.studentNumber, name: profile.fullName,
        college: profile.collegeName || "", className: profile.administrativeClassName || "",
        ...scoreProgress,
        exam: 0, attendance: 0, physical: 0,
        status: progressStatus,
        source: tx("真实后端数据", "Live backend data"),
        organizationCredit: null,
      },
      hourRule,
      records: mappedRecords,
      grades: {
        studentId: profile.studentNumber,
        studentName: profile.fullName,
        visibleBlocks: [],
        totalScore,
        totalDisplay,
        isPassed: null,
        courseGradeStatus: publishedScore ? "published" : "rules_not_published",
        displayConfigVersion: 0,
        sourceTrace: publishedScore ? tx("成绩来自后端计分。", "Score from backend calculation.") : tx("成绩规则发布后可查看。", "Available after score rules are published."),
        enduranceRunTimeSeconds: null, enduranceRunStatus: "not_recorded", enduranceRunScore: null,
      },
      memberships,
      notices: notifications.map(mapServerNotification),
      teachers: courses
        .filter((course) => course.isCurrent && course.enrollmentStatus === "enrolled" && course.teacher)
        .map((course) => ({ teacherId: course.teacherId, teacherName: course.teacher })),
      exemptions: exemptions.map(mapStructuredExemptionApplication),
      checkInTimeWindow: timeWindow,
      courseJoinRequest: null,
      proofTodos: Array.isArray(proofTodoPage?.items) ? proofTodoPage.items : [],
      creditPolicy: contractCourse?.creditPolicy || null,
    },
    activeServerSession: activeSession,
  };
}
