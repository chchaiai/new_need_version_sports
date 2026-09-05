// Course join flow: QR scan (#9), manual invite code (#10), join confirm (#11)
// and join request status (#19) — feature/courses/ScanJoinScreen.kt,
// EnterInviteCodeScreen.kt, CourseJoinConfirmScreen.kt, JoinRequestStatusScreen.kt.
// Both scan and manual entry resolve through the same invite lookup (§7.2).

import { tx } from "../i18n.js";
import { icon } from "../icons.js";
import { esc, spinner, sectionTitle, statusBadge, validationPanel, actionButton, fieldLabel, fieldControlAttrs, fieldSupport, userFacingErrorPanel, focusFirstInvalidField } from "../ui.js";
import { previewInvite, previewCourseInvitation, joinWithInvite, storeJoinContext, ApiError, toUserFacingError } from "../api.js";

// Real backend invite tokens are "<id>.<secret>" — dots/underscores allowed.
const INVITE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]{15,199}$/;
const isInviteCode = (value) => INVITE_CODE_PATTERN.test(value.trim());
const MAX_NAME = 64;
const MAX_STUDENT_NUMBER = 32;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Extracts an invite code from the HTTPS /join/{code} QR URL, or accepts a
 *  bare backend invite token rendered directly as QR content. */
function inviteCodeFromQr(rawValue) {
  const raw = rawValue.trim();
  try {
    const uri = new URL(raw);
    if (uri.protocol !== "https:" || !uri.host) return null;
    const segments = uri.pathname.split("/").filter(Boolean);
    if (segments.length !== 2 || segments[0] !== "join") return null;
    return isInviteCode(segments[1]) ? segments[1] : null;
  } catch {
    return raw.includes(".") && isInviteCode(raw) ? raw : null;
  }
}

/** Every invite lookup uses the real backend. Failures never fall back to mock data. */
function lookupInvite(code, { onResolved, onUnavailable, onError }) {
  previewInvite(code).then(
    async (preview) => {
      if (!preview.enrollmentOpen) { onUnavailable(); return; }
      let contractPreview = null;
      try {
        contractPreview = await previewCourseInvitation(code, { auth: false });
      } catch {
        contractPreview = null;
      }
      onResolved(code, {
        name: preview.courseName,
        courseNumber: preview.courseCode,
        section: preview.displayName,
        teacher: preview.teacherDisplayName,
        semester: preview.semesterDisplayName,
        classSectionId: preview.classSectionId,
        expiresAt: preview.expiresAt || contractPreview?.expiresAt || null,
        enrollmentOpen: preview.enrollmentOpen,
        joinStartAllowed: contractPreview?.joinStartAllowed ?? preview.enrollmentOpen,
        inGrace: Boolean(contractPreview?.inGrace),
        graceExpiresAt: contractPreview?.graceExpiresAt || null,
        durationMinutes: contractPreview?.durationMinutes || null,
        real: true,
      });
    },
    (error) => {
      if (error instanceof ApiError && (error.status === 404 || error.status === 410)) onUnavailable();
      else onError(toUserFacingError(error));
    }
  );
}

const inviteExpiredMessage = () =>
  tx("该邀请已过期或已被撤销，请联系教师获取新二维码或邀请码", "This invitation has expired or was revoked. Contact the teacher for a new QR code or invitation code.");

const inviteApiLimitHint = () =>
  tx("邀请有效期 5–120 分钟，默认 30 分钟。到期前已登记的同一次流程可有 10 分钟宽限，且不得刷新续期。", "Invites last 5–120 minutes (default 30). A registration already started before expiry may use one 10-minute grace period that cannot be refreshed.");

function inviteExpiryCopy(invite) {
  if (invite?.inGrace && invite.graceExpiresAt) {
    const remainMs = Date.parse(invite.graceExpiresAt) - Date.now();
    const minutes = Number.isFinite(remainMs) ? Math.max(0, Math.ceil(remainMs / 60000)) : 0;
    return tx(`当前处于服务器登记的 10 分钟宽限，大约还剩 ${minutes} 分钟。宽限不得刷新续期。`, `You are in the server-registered 10-minute grace period, about ${minutes} min left. Grace cannot be refreshed.`);
  }
  const ms = Date.parse(invite?.expiresAt || "");
  if (!Number.isFinite(ms)) {
    return tx("有效期以服务端 expiresAt 为准。宽限不得刷新续期。", "Validity follows server expiresAt. Grace cannot be refreshed.");
  }
  const remainMs = ms - Date.now();
  if (remainMs <= 0) {
    return tx("邀请已到期。仅到期前已登记的同一次流程可继续宽限，不能新开入班或刷新宽限。", "This invite has expired. Only a registration already started may continue in grace; you cannot start a new join or refresh grace.");
  }
  const minutes = Math.max(1, Math.ceil(remainMs / 60000));
  const duration = invite?.durationMinutes ? tx(`（本次 ${invite.durationMinutes} 分钟）`, ` (${invite.durationMinutes} min window)`) : "";
  return tx(`服务端到期时间还剩约 ${minutes} 分钟${duration}。宽限不得刷新续期。`, `About ${minutes} min remain until server expiry${duration}. Grace cannot be refreshed.`);
}

function disabledGraceButton() {
  return `<button class="outlined-btn" type="button" disabled style="min-height:48px">${tx("刷新宽限（业务不允许续期）", "Refresh grace (not allowed)")}</button>`;
}

/** Backend invite tokens are opaque and case-sensitive. */
function normalizeInviteInput(value) { return value.trim(); }

// ═══════════════════════════════════════════════════════════════
//  #9 Scan to join
// ═══════════════════════════════════════════════════════════════

function scanState(app) {
  if (!app.ui.scan) {
    app.ui.scan = {
      permission: "prompt", // prompt | granted | denied
      resolving: false,
      message: null,
      showManualInput: false,
      manualCode: "",
      manualAttempted: false,
      lastScannedValue: null,
    };
  }
  return app.ui.scan;
}

function scanMessage(message) {
  if (typeof message !== "string") return userFacingErrorPanel(message, { compact: true });
  return `<div class="scan-message" role="status">
    <span class="text-error" style="display:inline-flex">${icon("error-outline", 20)}</span>
    <span class="body-medium text-on-surface">${esc(message)}</span>
  </div>`;
}

export function renderScanJoin(app, { preLogin = false } = {}) {
  const ui = scanState(app);
  const cameraArea = ui.permission === "denied"
    ? `<div class="scan-permission-card">
        <span class="scan-permission-icon">${icon("camera-alt", 28)}</span>
        <div style="height:20px"></div>
        <div class="title-large text-on-surface">${tx("需要相机权限", "Camera permission required")}</div>
        <div style="height:8px"></div>
        <div class="body-medium text-muted" style="text-align:center">${tx("仅用于扫描课程二维码，你也可以在下方手动输入邀请码。", "The camera is only used to scan course QR codes. You can also enter an invitation code manually.")}</div>
        <div style="height:20px"></div>
        <button class="primary-btn pressable" data-action="scan.requestPermission" style="width:auto;min-height:48px;padding:0 24px">${tx("允许使用相机", "Allow camera access")}</button>
      </div>`
    : `<div class="scan-camera" data-scan-camera>
        <video class="scan-video" autoplay playsinline muted></video>
        <svg class="scan-guide" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
        ${ui.resolving ? `<div class="scan-resolving">
          ${spinner(30, "on-primary")}
          <div style="height:14px"></div>
          <span class="label-large" style="color:#fff">${tx("正在识别", "Recognising")}</span>
        </div>` : ""}
      </div>`;

  const hint = ui.message
    ? scanMessage(ui.message)
    : `<div class="body-medium ${ui.resolving ? "text-primary" : "text-muted"}" style="width:100%">${ui.resolving ? tx("正在读取课程信息…", "Reading course information…") : tx("将二维码完整放入扫描框内", "Place the entire QR code inside the frame.")}</div>`;

  const manualDialog = ui.showManualInput ? renderManualInviteDialog(app, ui) : "";

  return `<div class="screen scan-screen">
    <div class="scan-topbar">
      <button class="icon-btn pressable" data-action="scan.back" ${ui.resolving ? "disabled" : ""} aria-label="${tx("返回", "Back")}">${icon("chevron-left", 28)}</button>
      <span class="title-medium" style="color:var(--color-on-background)">${tx("加入课程", "Join course")}</span>
      <span style="width:48px"></span>
    </div>
    <div class="scan-body">
      <div style="height:12px"></div>
      <div class="headline-small" style="color:var(--color-on-background)">${tx("扫描课程二维码", "Scan a course QR code")}</div>
      <div style="height:8px"></div>
      <div class="body-large text-muted">${tx("将老师提供的二维码对准扫描框，识别后可核对课程信息。", "Align the teacher's QR code in the frame to review the course details.")}</div>
      <div style="height:8px"></div>
      <div class="body-small text-muted">${inviteApiLimitHint()}</div>
      <div style="height:12px"></div>
      ${disabledGraceButton()}
      <div style="height:24px"></div>
      ${cameraArea}
      <div style="height:14px"></div>
      ${hint}
      <div style="height:20px"></div>
      <button class="outlined-btn pressable" data-action="scan.manual" ${ui.resolving ? "disabled" : ""} style="height:54px;border-radius:14px">
        ${icon("keyboard", 20)}<span class="label-large">${tx("手动输入邀请码", "Enter invitation code manually")}</span>
      </button>
      <div style="height:16px"></div>
    </div>
    ${manualDialog}
  </div>`;
}

function renderManualInviteDialog(app, ui) {
  const normalized = normalizeInviteInput(ui.manualCode);
  const showFormatError = (ui.manualAttempted || ui.manualCode.trim() !== "") && !isInviteCode(normalized);
  return `<div class="dialog-scrim" data-action="scan.dialogScrim">
    <div class="dialog" role="dialog" aria-modal="true">
      <div class="dialog-title">${tx("输入邀请码", "Enter invitation code")}</div>
      <div class="dialog-body">
        <div>${tx("请输入老师提供的邀请码，下一步将核对课程信息。", "Enter the invitation code from your teacher. You will review the course details next.")}</div>
        <div style="height:20px"></div>
        ${fieldLabel({ id: "manual-invite-code", label: tx("邀请码", "Invitation code"), required: true })}
        <input ${fieldControlAttrs({ id: "manual-invite-code", error: showFormatError ? tx("请输入有效的邀请码", "Enter a valid invitation code.") : null, required: true })} class="text-field${showFormatError ? " error" : ""}" style="border-radius:12px" type="text"
          value="${esc(ui.manualCode)}" placeholder="invite_xxx.secret_xxx" data-input="scan.manualCode" autocomplete="off" spellcheck="false" />
        ${fieldSupport({ id: "manual-invite-code", error: showFormatError ? tx("请输入有效的邀请码", "Enter a valid invitation code.") : null })}
      </div>
      <div class="dialog-actions">
        <button class="text-btn pressable" data-action="scan.dialogCancel" ${ui.resolving ? "disabled" : ""}>${tx("取消", "Cancel")}</button>
        <button class="primary-btn pressable" data-action="scan.dialogSubmit" ${ui.resolving ? "disabled" : ""} style="width:auto;min-height:44px;border-radius:12px;padding:0 20px">${tx("查询课程", "Find course")}</button>
      </div>
    </div>
  </div>`;
}

function drawScanGuide(app) {
  const svg = app._viewport?.querySelector(".scan-guide");
  const box = app._viewport?.querySelector("[data-scan-camera]");
  if (!svg || !box) return;
  const w = box.clientWidth;
  const h = box.clientHeight;
  if (!w || !h) return;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const guide = Math.min(w, h) * 0.68;
  const left = (w - guide) / 2;
  const top = (h - guide) / 2;
  const right = left + guide;
  const bottom = top + guide;
  const corner = 30;
  const lines = [
    [left, top + corner, left, top], [left, top, left + corner, top],
    [right - corner, top, right, top], [right, top, right, top + corner],
    [left, bottom - corner, left, bottom], [left, bottom, left + corner, bottom],
    [right - corner, bottom, right, bottom], [right, bottom, right, bottom - corner],
  ];
  svg.innerHTML = lines
    .map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`)
    .join("");
}

let mediaStream = null;
let detectTimer = null;

function stopCamera() {
  if (detectTimer) { clearInterval(detectTimer); detectTimer = null; }
  if (mediaStream) {
    for (const track of mediaStream.getTracks()) track.stop();
    mediaStream = null;
  }
}

async function startCamera(app) {
  const ui = scanState(app);
  const video = app._viewport?.querySelector(".scan-video");
  if (!video || mediaStream) return;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = mediaStream;
    ui.permission = "granted";
    // Continuous QR decoding via the platform BarcodeDetector when available.
    if ("BarcodeDetector" in globalThis) {
      const detector = new globalThis.BarcodeDetector({ formats: ["qr_code"] });
      detectTimer = setInterval(async () => {
        if (ui.resolving || !video.videoWidth) return;
        try {
          const codes = await detector.detect(video);
          const value = codes[0]?.rawValue;
          if (value && value !== ui.lastScannedValue) {
            ui.lastScannedValue = value;
            resolveQrValue(app, value);
          }
        } catch { /* frame not ready */ }
      }, 400);
    }
  } catch {
    ui.permission = "denied";
    ui.message = tx("需要相机权限才能扫描二维码，也可以手动输入邀请码", "Camera permission is required to scan a QR code. You can also enter an invitation code manually.");
    app.render();
  }
}

function resolveQrValue(app, value) {
  const ui = scanState(app);
  const code = inviteCodeFromQr(value);
  if (!code) {
    ui.message = tx("无效的课程二维码，请确认后重试", "Invalid course QR code. Check it and try again.");
    app.render();
    return;
  }
  resolveCode(app, code);
}

function resolveCode(app, code) {
  const ui = scanState(app);
  if (ui.resolving) return;
  if (!isInviteCode(code)) {
    ui.message = tx("请输入有效的邀请码", "Enter a valid invitation code.");
    app.render();
    return;
  }
  ui.message = null;
  ui.resolving = true;
  app.render();
  lookupInvite(code, {
    onResolved: (inviteCode, course) => {
      ui.resolving = false;
      onInviteResolved(app, inviteCode, course);
    },
    onUnavailable: () => {
      ui.resolving = false;
      onInviteUnavailable(app);
    },
    onError: (error) => {
      ui.resolving = false;
      ui.message = error;
      app.render();
    },
  });
}

function onInviteResolved(app, code, course) {
  stopCamera();
  app.ui.joinConfirm = null;
  if (app.state.authenticated) {
    app.openSub("joinConfirm", { inviteCode: code, course });
  } else {
    app.state.showScanJoin = false;
    app.state.pendingInvite = { code, course };
    app.navDirection = "forward";
    app.render();
  }
}

function onInviteUnavailable(app) {
  const ui = scanState(app);
  if (app.state.authenticated) {
    stopCamera();
    app.openSub("joinStatus", { inviteUnavailable: true });
  } else {
    // Pre-login scanning has no status page; the message shows inline.
    ui.message = inviteExpiredMessage();
    app.render();
  }
}

// Keep the camera stream in sync with what is rendered.
export function attachScanCamera(app) {
  const camera = app._viewport?.querySelector("[data-scan-camera]");
  if (camera) {
    drawScanGuide(app);
    startCamera(app);
    const video = app._viewport.querySelector(".scan-video");
    if (video && mediaStream && !video.srcObject) video.srcObject = mediaStream;
  } else {
    stopCamera();
  }
}

// ═══════════════════════════════════════════════════════════════
//  #10 Enter invitation code
// ═══════════════════════════════════════════════════════════════

function enterCodeState(app) {
  if (!app.ui.enterCode) app.ui.enterCode = { code: "", resolving: false, error: null, attempted: false };
  return app.ui.enterCode;
}

export function renderEnterInviteCode(app) {
  const ui = enterCodeState(app);
  const normalized = normalizeInviteInput(ui.code);
  const hasFormatError = (ui.attempted || ui.code.trim() !== "") && !isInviteCode(normalized);
  return `<div class="screen enter-code-screen" style="background:transparent">
    <div class="screen-scroll" data-scroll-key="enter-code">
      <div class="col" style="gap:16px;padding:8px 4px 24px">
        <button class="text-btn pressable" data-action="enterCode.back" ${ui.resolving ? "disabled" : ""} style="align-self:flex-start;padding:0 8px 0 0">
          ${icon("chevron-left", 24)}<span>${tx("返回", "Back")}</span>
        </button>
        <span class="text-primary" style="display:inline-flex">${icon("keyboard", 24)}</span>
        <div class="headline-small text-on-surface">${tx("输入邀请码", "Enter invitation code")}</div>
        <div class="body-large text-muted">${tx("请输入老师提供的邀请码。查询后请核对课程名称、教师和学期信息，再确认加入。", "Enter the token from your teacher. Review the course name, instructor, and term before joining.")}</div>
        <div class="body-small text-muted">${inviteApiLimitHint()}</div>
        <div style="height:8px"></div>
        ${disabledGraceButton()}
        <div style="height:8px"></div>
        <div class="col">
          ${fieldLabel({ id: "enter-invite-code", label: tx("邀请码", "Invitation code"), required: true })}
          <input ${fieldControlAttrs({ id: "enter-invite-code", error: hasFormatError ? tx("请输入教师提供的完整邀请码。", "Enter the complete invitation token supplied by your teacher.") : null, required: true })} class="text-field${hasFormatError ? " error" : ""}" type="text" value="${esc(ui.code)}"
            placeholder="invite_xxx.secret_xxx" data-input="enterCode.input" ${ui.resolving ? "disabled" : ""} autocomplete="off" spellcheck="false" />
          ${fieldSupport({ id: "enter-invite-code", error: hasFormatError ? tx("请输入教师提供的完整邀请码。", "Enter the complete invitation token supplied by your teacher.") : null })}
        </div>
        ${ui.error ? (typeof ui.error === "string" ? validationPanel(ui.error) : userFacingErrorPanel(ui.error, { compact: true })) : ""}
        <button class="primary-btn pressable" data-action="enterCode.submit" ${ui.resolving ? "disabled" : ""} style="height:52px">
          ${ui.resolving ? spinner(20, "on-primary") : `<span>${tx("查询课程", "Find course")}</span>`}
        </button>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  #11 Course join confirm
// ═══════════════════════════════════════════════════════════════

function joinConfirmState(app, params) {
  if (!app.ui.joinConfirm) {
    const request = params.correctionRequest;
    app.ui.joinConfirm = {
      name: request ? request.studentName : "",
      studentNumber: request ? request.studentNumber : "",
      email: request ? request.email : "",
      gender: "",
      gradeYear: "",
      submitting: false,
      submitted: false,
      error: null,
      invalidField: null,
    };
  }
  return app.ui.joinConfirm;
}

function joinSelect({ id, label, value, options, disabled, error = null }) {
  const fieldId = `join-${id}`;
  return `<div class="col">
    ${fieldLabel({ id: fieldId, label, required: true })}
    <select ${fieldControlAttrs({ id: fieldId, error, required: true })} class="text-field" data-change="joinConfirm.select" data-field="${id}" ${disabled ? "disabled" : ""}>
      <option value="" ${value === "" ? "selected" : ""}>${tx("请选择", "Select")}</option>
      ${options.map((o) => `<option value="${esc(o.value)}" ${value === o.value ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
    </select>
    ${fieldSupport({ id: fieldId, error })}
  </div>`;
}

const GENDER_OPTIONS = () => [
  { value: "FEMALE", label: tx("女", "Female") },
  { value: "MALE", label: tx("男", "Male") },
];

const GRADE_YEAR_OPTIONS = () => {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current + 1; y >= current - 6; y--) years.push({ value: String(y), label: tx(`${y} 级`, `Class of ${y}`) });
  return years;
};

function joinFact(label, value) {
  return `<div class="col" style="gap:3px">
    <span class="label-medium text-muted">${esc(label)}</span>
    <span class="body-large text-on-surface">${esc(value)}</span>
  </div>`;
}

function joinField({ id, label, value, supporting, disabled, inputMode, maxlength, required = true, error = null }) {
  const fieldId = `join-${id}`;
  return `<div class="col">
    ${fieldLabel({ id: fieldId, label, required })}
    <input ${fieldControlAttrs({ id: fieldId, error, helper: supporting, required })} class="text-field" type="text" inputmode="${inputMode || "text"}" ${maxlength ? `maxlength="${maxlength}"` : ""}
      value="${esc(value)}" data-input="joinConfirm.field" data-field="${id}" ${disabled ? "disabled" : ""} />
    ${fieldSupport({ id: fieldId, error, helper: supporting }).replace("class=\"field-supporting\"", `class="field-supporting" data-join-counter="${id}"`)}
  </div>`;
}

export function renderCourseJoinConfirm(app, params) {
  const ui = joinConfirmState(app, params);
  const course = params.correctionRequest
    ? {
        name: params.correctionRequest.courseName,
        courseNumber: params.correctionRequest.courseCode,
        section: params.correctionRequest.section,
        teacher: params.correctionRequest.teacherName,
        semester: params.correctionRequest.semester,
      }
    : params.course;
  const writeEnabled = app.isWriteAllowed();
  const canSubmitNew = params.correctionRequest ? true : (app.state.authenticated ? app.canStartNewCourseJoin() : true);
  const formEnabled = !ui.submitting && writeEnabled && canSubmitNew;

  const identityContent = ui.submitted
    ? `<div class="col" style="align-items:center;gap:12px">
        <span class="text-primary" style="display:inline-flex">${icon("check-circle", 24)}</span>
        <div class="title-medium text-on-surface">${tx("已加入课程。", "Course joined.")}</div>
      </div>`
    : `<div class="col" style="gap:14px">
        ${!canSubmitNew ? validationPanel(tx("本学期仅可选择一门课程。你已有课程或待处理申请，不能重复提交。", "You can choose only one course per term. You already have a course or a pending request.")) : ""}
        ${ui.error ? (typeof ui.error === "string" ? validationPanel(ui.error) : userFacingErrorPanel(ui.error, { compact: true })) : ""}
        ${joinField({ id: "name", label: tx("姓名（必填）", "Name (required)"), value: ui.name, supporting: `${ui.name.length} / ${MAX_NAME}`, disabled: !formEnabled, maxlength: MAX_NAME, error: ui.invalidField === "name" ? tx("请填写姓名。", "Enter your name.") : null })}
        ${joinField({ id: "studentNumber", label: tx("学号（必填）", "Student ID (required)"), value: ui.studentNumber, supporting: `${ui.studentNumber.length} / ${MAX_STUDENT_NUMBER}`, disabled: ui.submitting || !writeEnabled, maxlength: MAX_STUDENT_NUMBER, error: ui.invalidField === "studentNumber" ? tx("请填写学号。", "Enter your student ID.") : null })}
        ${course && course.real
          ? joinSelect({ id: "gender", label: tx("性别（必填）", "Gender (required)"), value: ui.gender, options: GENDER_OPTIONS(), disabled: ui.submitting || !writeEnabled, error: ui.invalidField === "gender" ? tx("请选择性别。", "Select your gender.") : null })
            + joinSelect({ id: "gradeYear", label: tx("入学年份（必填）", "Admission year (required)"), value: ui.gradeYear, options: GRADE_YEAR_OPTIONS(), disabled: ui.submitting || !writeEnabled, error: ui.invalidField === "gradeYear" ? tx("请选择入学年份。", "Select your admission year.") : null })
          : joinField({ id: "email", label: tx("邮箱（选填）", "Email (optional)"), value: ui.email, disabled: ui.submitting || !writeEnabled, inputMode: "email", required: false, error: ui.invalidField === "email" ? tx("请输入有效的邮箱地址。", "Enter a valid email address.") : null })}
        <div style="height:2px"></div>
        <button class="primary-btn pressable" data-action="joinConfirm.submit" ${!ui.submitting && writeEnabled ? "" : "disabled"}>
          ${ui.submitting ? spinner(18, "on-primary") : icon("send", 18)}
          <span class="ellipsis">${ui.submitting ? tx("加入中…", "Joining…") : tx("确认并加入课程", "Confirm and join course")}</span>
        </button>
      </div>`;

  return `<div class="screen join-confirm-screen" style="background:${params.preLogin ? "var(--color-background)" : "transparent"}">
    <div class="screen-scroll" data-scroll-key="join-confirm">
      <div class="col" style="gap:16px;padding:${params.preLogin ? "24px" : "0 4px 24px"}">
        <button class="text-btn pressable" data-action="joinConfirm.back" ${ui.submitting ? "disabled" : ""} style="align-self:flex-start;padding:0 8px 0 0">
          ${icon("chevron-left", 24)}<span>${tx("返回", "Back")}</span>
        </button>
        ${sectionTitle(tx("确认课程信息", "Confirm course information"))}
        <div class="swiss-panel"><div class="col" style="gap:14px">
          ${joinFact(tx("课程名称", "Course name"), course.name)}
          ${joinFact(tx("授课老师", "Instructor"), course.teacher)}
          ${joinFact(tx("学期", "Term"), course.semester)}
          ${joinFact(tx("邀请有效期", "Invitation validity"), inviteExpiryCopy(course))}
          <div class="body-medium text-muted">${tx("核对无误后加入即为有效成员，无需教师审批。本页仍调用现有 preview / join 接口。", "After you confirm, a successful join is an active membership with no teacher approval. This page still calls the current preview / join APIs.")}</div>
          ${disabledGraceButton()}
        </div></div>
        ${sectionTitle(tx("填写身份资料", "Enter identity details"))}
        <div class="swiss-panel">${identityContent}</div>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  #19 Join request status
// ═══════════════════════════════════════════════════════════════

function statusHeading(title, iconName) {
  return `<div class="row" style="gap:10px">
    <span class="text-primary" style="display:inline-flex;flex:none">${icon(iconName, 24)}</span>
    <span class="title-large text-on-surface">${esc(title)}</span>
  </div>`;
}

function factList(facts) {
  return `<div class="col" style="gap:10px">${facts
    .map(
      ([label, value]) => `<div class="row" style="align-items:flex-start">
        <span class="body-medium text-muted" style="width:76px;flex:none">${esc(label)}：</span>
        <span class="body-medium text-on-surface grow">${esc(value) || tx("待公布", "To be announced")}</span>
      </div>`
    )
    .join("")}</div>`;
}

function reviewComment(label, comment) {
  return `<div class="col" style="gap:6px">
    <span class="label-large text-muted">${esc(label)}：</span>
    <span class="body-large text-on-surface">${esc(comment) || tx("教师暂未填写说明，请联系教师确认。", "The teacher has not provided a note. Please contact the teacher.")}</span>
  </div>`;
}

export function localizedJoinStatus(status) {
  switch (status) {
    case "PENDING": return tx("服务端待审核（旧状态）", "Server pending (legacy)");
    case "ACTIVE": return tx("已通过", "Approved");
    case "REJECTED": return tx("已拒绝", "Rejected");
    case "NEEDS_CORRECTION": return tx("需补正", "Information needed");
    default: return status;
  }
}

/** Compact entry card shared by Dashboard and Courses. */
export function joinRequestEntryPanel(request) {
  return `<button class="swiss-panel pressable" data-action="join.openStatus" style="text-align:left">
    <div class="row">
      <div class="col grow" style="gap:4px">
        <span class="title-medium text-on-surface">${tx("加入申请", "Join request")}</span>
        <span class="body-medium text-muted">${esc(request.courseName)} · ${localizedJoinStatus(request.status)}</span>
      </div>
      ${statusBadge(localizedJoinStatus(request.status), request.status === "PENDING")}
    </div>
  </button>`;
}

export function renderJoinRequestStatus(app, params) {
  const request = app.state.workspace.courseJoinRequest;
  const inviteUnavailable = !!params.inviteUnavailable;
  if (request && request.status === "ACTIVE" && !inviteUnavailable) {
    // Approved students belong in the normal course experience.
    setTimeout(() => app.closeSub(), 0);
    return "";
  }
  let panel;
  if (inviteUnavailable) {
    panel = `<div class="swiss-panel"><div class="col" style="gap:16px">
      ${statusHeading(tx("该邀请已过期或已被教师撤销", "This invitation expired or was revoked by the teacher"), "error-outline")}
      <div class="body-large text-muted">${tx("请联系教师获取新的二维码或邀请码", "Contact the teacher for a new QR code or invitation code.")}</div>
      ${actionButton({ label: tx("联系教师", "Contact teacher"), iconName: "email", action: "join.contactTeacher", filled: true })}
    </div></div>`;
  } else if (!request) {
    panel = `<div class="swiss-panel"><div class="col" style="gap:16px">
      ${statusHeading(tx("暂时无法获取申请状态", "Unable to load request status"), "error-outline")}
      <div class="body-large text-muted">${tx("请返回后刷新页面，或联系教师确认申请情况。", "Go back and refresh the page, or contact the teacher to confirm the request.")}</div>
      ${actionButton({ label: tx("返回", "Back"), iconName: "arrow-back", action: "join.statusBack", filled: false })}
    </div></div>`;
  } else if (request.status === "PENDING") {
    panel = `<div class="swiss-panel"><div class="col" style="gap:16px">
      ${statusHeading(tx("申请状态：服务端仍返回待审核", "Status: server still returns pending review"), "error-outline")}
      <div class="body-medium text-muted">${tx("v8.0 正常加入无需教师审批。若仍看到待审核，这是旧接口状态，本页不能改成直接有效。", "v8.0 joins do not need teacher approval. If this still shows pending, it is a legacy API status and this page cannot turn it into an active membership.")}</div>
      ${factList([
        [tx("课程", "Course"), request.courseName],
        [tx("教师", "Teacher"), request.teacherName],
        [tx("学期", "Term"), request.semester],
        [tx("提交时间", "Submitted"), request.submittedAt],
      ])}
      ${actionButton({ label: tx("联系教师", "Contact teacher"), iconName: "email", action: "join.contactTeacher", filled: false })}
    </div></div>`;
  } else if (request.status === "NEEDS_CORRECTION") {
    panel = `<div class="swiss-panel"><div class="col" style="gap:16px">
      ${statusHeading(tx("申请状态：需补正资料", "Status: information needed"), "edit")}
      ${reviewComment(tx("教师原因", "Teacher's note"), request.reviewComment)}
      ${actionButton({ label: tx("修改并重新提交", "Edit and resubmit"), iconName: "edit", action: "join.editResubmit", filled: true })}
    </div></div>`;
  } else if (request.status === "REJECTED") {
    panel = `<div class="swiss-panel"><div class="col" style="gap:16px">
      ${statusHeading(tx("申请状态：已拒绝", "Status: rejected"), "error-outline")}
      ${reviewComment(tx("拒绝原因", "Reason for rejection"), request.reviewComment)}
      ${actionButton({ label: tx("联系教师", "Contact teacher"), iconName: "email", action: "join.contactTeacher", filled: false })}
      ${actionButton({ label: tx("使用新邀请码重新申请", "Apply again with a new invitation code"), iconName: "refresh", action: "join.useNewInvite", filled: true })}
    </div></div>`;
  } else {
    panel = "";
  }
  return `<div class="screen" style="background:transparent">
    <div class="screen-scroll" data-scroll-key="join-status">
      <div class="col" style="gap:16px;padding:4px 0">
        <div class="row">
          <button class="icon-btn pressable" data-action="join.statusBack" aria-label="${tx("返回", "Back")}">${icon("arrow-back", 24)}</button>
          <span style="width:4px"></span>
          ${sectionTitle(tx("加入申请", "Join request"))}
        </div>
        ${panel}
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  Actions
// ═══════════════════════════════════════════════════════════════

export const joinActions = {
  // — Scan —
  "scan.back": (app) => {
    stopCamera();
    app.ui.scan = null;
    app.handleBack();
  },
  "scan.requestPermission": (app) => {
    const ui = scanState(app);
    ui.permission = "prompt";
    app.render();
  },
  "scan.manual": (app) => {
    const ui = scanState(app);
    ui.showManualInput = true;
    app.render();
  },
  "scan.manualCode": (app, el) => {
    const ui = scanState(app);
    ui.manualCode = el.value;
    const normalized = normalizeInviteInput(ui.manualCode);
    const submit = app._viewport?.querySelector('[data-action="scan.dialogSubmit"]');
    if (submit) submit.disabled = ui.resolving;
    el.classList.toggle("error", ui.manualCode.trim() !== "" && !isInviteCode(normalized));
  },
  "scan.dialogScrim": (app, el, event) => {
    if (event.target !== el) return;
    const ui = scanState(app);
    if (!ui.resolving) {
      ui.showManualInput = false;
      app.render();
    }
  },
  "scan.dialogCancel": (app) => {
    const ui = scanState(app);
    if (!ui.resolving) {
      ui.showManualInput = false;
      app.render();
    }
  },
  "scan.dialogSubmit": (app) => {
    const ui = scanState(app);
    const normalized = normalizeInviteInput(ui.manualCode);
    ui.manualAttempted = true;
    if (!isInviteCode(normalized) || ui.resolving) {
      app.render();
      focusFirstInvalidField(app._viewport, ["#manual-invite-code"]);
      return;
    }
    ui.showManualInput = false;
    resolveCode(app, normalized);
  },

  // — Enter code —
  "enterCode.back": (app) => {
    app.ui.enterCode = null;
    app.handleBack();
  },
  "enterCode.input": (app, el) => {
    const ui = enterCodeState(app);
    ui.code = el.value;
    ui.error = null;
    const normalized = normalizeInviteInput(ui.code);
    const submit = app._viewport?.querySelector('[data-action="enterCode.submit"]');
    if (submit) submit.disabled = ui.resolving;
    el.classList.toggle("error", ui.code.trim() !== "" && !isInviteCode(normalized));
  },
  "enterCode.submit": (app) => {
    const ui = enterCodeState(app);
    if (ui.resolving) return;
    const normalized = normalizeInviteInput(ui.code);
    ui.attempted = true;
    if (!isInviteCode(normalized)) {
      ui.error = tx("请输入教师提供的完整邀请码。", "Enter the complete invitation token supplied by your teacher.");
      app.render();
      focusFirstInvalidField(app._viewport, ["#enter-invite-code"]);
      return;
    }
    ui.error = null;
    ui.resolving = true;
    app.render();
    lookupInvite(normalized, {
      onResolved: (code, course) => {
        ui.resolving = false;
        app.ui.enterCode = null;
        app.ui.joinConfirm = null;
        app.openSub("joinConfirm", { inviteCode: code, course });
      },
      onUnavailable: () => {
        ui.resolving = false;
        app.ui.enterCode = null;
        app.openSub("joinStatus", { inviteUnavailable: true });
      },
      onError: (error) => {
        ui.resolving = false;
        ui.error = error;
        app.render();
      },
    });
  },

  // — Join confirm —
  "joinConfirm.back": (app) => {
    app.ui.joinConfirm = null;
    if (app.state.authenticated) {
      if (app.state.subParams.correctionRequest) {
        app.navDirection = "back";
        app.openSub("joinStatus", {});
      } else {
        // Back returns to the scan screen (§7.2).
        app.ui.scan = null;
        app.navDirection = "back";
        app.openSub("scan", {});
      }
    } else {
      app.handleBack();
    }
  },
  "joinConfirm.field": (app, el) => {
    const ui = app.ui.joinConfirm;
    if (!ui) return;
    const field = el.dataset.field;
    let value = el.value;
    if (field === "name") value = value.slice(0, MAX_NAME);
    if (field === "studentNumber") value = value.slice(0, MAX_STUDENT_NUMBER);
    ui[field] = value;
    if (ui.invalidField === field) ui.invalidField = null;
    const counter = app._viewport?.querySelector(`[data-join-counter="${field}"]`);
    if (counter) counter.textContent = `${value.length} / ${field === "name" ? MAX_NAME : MAX_STUDENT_NUMBER}`;
  },
  "joinConfirm.select": (app, el) => {
    const ui = app.ui.joinConfirm;
    if (!ui) return;
    ui[el.dataset.field] = el.value;
    if (ui.invalidField === el.dataset.field) ui.invalidField = null;
  },
  "joinConfirm.submit": (app) => {
    const ui = app.ui.joinConfirm;
    const params = app.state.authenticated
      ? app.state.subParams
      : { inviteCode: app.state.pendingInvite?.code, course: app.state.pendingInvite?.course, preLogin: true };
    if (!ui || ui.submitting || ui.submitted) return;
    if (!app.isWriteAllowed()) return;
    const canSubmitNew = params.correctionRequest ? true : (app.state.authenticated ? app.canStartNewCourseJoin() : true);
    if (!canSubmitNew) {
      ui.error = tx("本学期已选择课程或已有待处理申请，不能重复选课。", "You already have a course or a pending request this term and cannot submit another request.");
      app.render();
      return;
    }
    const name = ui.name.trim();
    const studentNumber = ui.studentNumber.trim();
    const email = ui.email.trim();
    const realJoin = !params.correctionRequest && params.course?.real;
    ui.invalidField = !name || name.length > MAX_NAME
      ? "name"
      : !studentNumber || studentNumber.length > MAX_STUDENT_NUMBER
        ? "studentNumber"
        : realJoin && !ui.gender
          ? "gender"
          : realJoin && !ui.gradeYear
            ? "gradeYear"
            : !realJoin && email && !EMAIL_PATTERN.test(email)
              ? "email"
              : null;
    ui.error = null;
    if (ui.invalidField) {
      app.render();
      focusFirstInvalidField(app._viewport, [`#join-${ui.invalidField}`]);
      return;
    }
    ui.submitting = true;
    app.render();
    if (realJoin) {
      // Real backend join: capability + atomic join establishes the student
      // session directly — no teacher approval step (v6.1 direct join).
      const course = params.course;
      joinWithInvite(params.inviteCode, {
        fullName: name,
        studentNumber,
        gender: ui.gender,
        gradeYear: Number(ui.gradeYear),
      }).then((joined) => {
        storeJoinContext({
          classSectionId: course.classSectionId,
          courseName: course.name,
          courseCode: course.courseNumber,
          teacherDisplayName: course.teacher,
          semesterDisplayName: course.semester,
        });
        app.ui.joinConfirm = null;
        app.state.pendingInvite = null;
        app.state.showScanJoin = false;
        app.state.subScreen = null;
        app.state.subParams = {};
        return app.completeApiLogin(joined);
      }).catch((error) => {
        ui.submitting = false;
        if (error instanceof ApiError && error.status === 410) {
          ui.error = inviteExpiredMessage();
        } else {
          ui.error = toUserFacingError(error);
          const firstField = ui.error.fieldErrors?.[0]?.field;
          ui.invalidField = ["fullName", "studentNumber", "gender", "gradeYear"].includes(firstField)
            ? (firstField === "fullName" ? "name" : firstField)
            : null;
        }
        app.render();
        if (ui.invalidField) focusFirstInvalidField(app._viewport, [`#join-${ui.invalidField}`]);
      });
      return;
    }
    ui.submitting = false;
    ui.error = tx("该旧版更正入口已停用，请使用新的有效邀请码重新加入课程。", "This legacy correction entry is disabled. Join again with a new valid invitation.");
    app.render();
  },

  // — Status —
  "join.openStatus": (app) => {
    app.openSub("joinStatus", {});
  },
  "join.statusBack": (app) => {
    app.closeSub();
  },
  "join.contactTeacher": (app) => {
    app.state.subScreen = null;
    app.state.subParams = {};
    app.state.tab = "profile";
    app.navDirection = "back";
    app.render();
  },
  "join.editResubmit": (app) => {
    const request = app.state.workspace.courseJoinRequest;
    if (!request) return;
    app.ui.joinConfirm = null;
    app.openSub("joinConfirm", { correctionRequest: request });
  },
  "join.useNewInvite": (app) => {
    app.ui.scan = null;
    app.openSub("scan", {});
  },
};

// Back interception: an in-flight lookup/submission locks back navigation
// (扫码/邀请码查询中禁用返回); an open manual dialog closes first.
export function joinBackInterceptor(app) {
  if (app.ui.scan?.resolving || app.ui.enterCode?.resolving || app.ui.joinConfirm?.submitting) return true;
  if (app.ui.scan?.showManualInput) {
    app.ui.scan.showManualInput = false;
    app.render();
    return true;
  }
  return false;
}
