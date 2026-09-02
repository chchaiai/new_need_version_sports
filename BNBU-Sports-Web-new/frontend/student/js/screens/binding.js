// current API email-only first binding and verified-email change flow.

import { tx } from "../i18n.js";
import { icon } from "../icons.js";
import {
  esc,
  spinner,
  fieldLabel,
  fieldControlAttrs,
  fieldSupport,
  userFacingErrorPanel,
} from "../ui.js";
import {
  requestEmailVerificationChallenge,
  verifyEmailVerificationChallenge,
  toUserFacingError,
} from "../api.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^\d{4,10}$/;

function bindingState(app, mode) {
  const student = app.state.workspace.student;
  if (!app.ui.binding || app.ui.binding.mode !== mode) {
    app.ui.binding = {
      mode,
      currentEmail: student.email || "",
      initiallyVerified: Boolean(student.emailVerified),
      email: "",
      currentEmailCode: "",
      newEmailCode: "",
      challengeId: null,
      expiresAt: null,
      sending: false,
      verifying: false,
      resend: 0,
      message: null,
      error: null,
    };
  }
  return app.ui.binding;
}

function messagePanel(message) {
  return `<div class="binding-message is-info" role="status"><span class="body-small" style="white-space:pre-line">${esc(message)}</span></div>`;
}

function backendFieldError(error, ...fieldNames) {
  if (!Array.isArray(error?.fieldErrors)) return null;
  const accepted = new Set(fieldNames.map((name) => name.toLowerCase()));
  return error.fieldErrors.find((item) => {
    const fieldName = typeof item?.field === "string" ? item.field.toLowerCase() : "";
    const leaf = fieldName.split(".").pop();
    return accepted.has(fieldName) || accepted.has(leaf);
  })?.message || null;
}

function field({
  id,
  label,
  value,
  disabled,
  inputMode = "text",
  autocomplete = "off",
  type = "text",
  maxLength = null,
  placeholder = null,
  error = null,
  helper = null,
}) {
  const controlId = `binding-${id}`;
  return `<div class="binding-form-field col">
    ${fieldLabel({ id: controlId, label, required: true })}
    <input ${fieldControlAttrs({ id: controlId, error, helper, required: true })} class="text-field${error ? " error" : ""}" type="${type}" inputmode="${inputMode}" autocomplete="${autocomplete}" value="${esc(value)}" data-input="binding.field" data-field="${id}" ${placeholder ? `placeholder="${esc(placeholder)}"` : ""} ${maxLength ? `maxlength="${maxLength}"` : ""} ${disabled ? "disabled" : ""} />
    ${fieldSupport({ id: controlId, error, helper })}
  </div>`;
}

function workspaceReloadError() {
  return {
    code: "WORKSPACE_RELOAD_FAILED",
    title: tx("课程数据未加载", "Course data not loaded"),
    message: tx(
      "邮箱已验证，但课程数据暂时未加载成功。",
      "Your email was verified, but course data could not be loaded.",
    ),
    action: tx("请检查网络后重试。", "Check your connection and try again."),
    requestId: null,
    retryable: true,
    category: "NETWORK",
    fieldErrors: [],
  };
}

function startResendTicker(app, state) {
  state.resend = 60;
  const timer = setInterval(() => {
    state.resend -= 1;
    if (state.resend <= 0) {
      state.resend = 0;
      clearInterval(timer);
      app.render();
      return;
    }
    const label = app._viewport?.querySelector('[data-action="binding.sendCode"] span');
    if (label) label.textContent = tx(`${state.resend} 秒后可重发`, `Resend in ${state.resend}s`);
  }, 1000);
}

function challengeSecondsRemaining(expiresAt) {
  const expiresAtMillis = Date.parse(expiresAt || "");
  if (!Number.isFinite(expiresAtMillis)) return 0;
  return Math.max(0, Math.ceil((expiresAtMillis - Date.now()) / 1000));
}

function formatDuration(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function renderContactBinding(app, { mode }) {
  const state = bindingState(app, mode);
  const required = mode === "requiredActivation";
  const busy = state.sending || state.verifying;
  const emailValid = EMAIL_PATTERN.test(state.email.trim());
  const currentCodeValid = !state.initiallyVerified || CODE_PATTERN.test(state.currentEmailCode);
  const newCodeValid = CODE_PATTERN.test(state.newEmailCode);
  const emailError = state.email.trim() && !emailValid
    ? tx("请输入有效的邮箱地址。", "Enter a valid email address.")
    : backendFieldError(state.error, "email", "newEmail");
  const currentCodeError = state.currentEmailCode && !currentCodeValid
    ? tx("请输入收到的完整验证码。", "Enter the complete code you received.")
    : backendFieldError(state.error, "currentEmailCode");
  const newCodeError = state.newEmailCode && !newCodeValid
    ? tx("请输入收到的完整验证码。", "Enter the complete code you received.")
    : backendFieldError(state.error, "newEmailCode", "verificationCode", "code");

  const expirySeconds = challengeSecondsRemaining(state.expiresAt);
  const challengeExpired = Boolean(state.challengeId) && expirySeconds <= 0;
  const title = required ? tx("验证邮箱", "Verify email") : tx("修改邮箱", "Change email");
  const description = state.initiallyVerified
    ? tx("修改邮箱时，需要验证当前邮箱和新邮箱。", "Changing your email requires codes from both addresses.")
    : tx("绑定学校登记邮箱，用于身份验证及重要通知。", "Bind the email registered with your school for identity checks and important notices.");
  const currentEmailStatus = state.initiallyVerified
    ? tx(`当前邮箱：${state.currentEmail || "已验证"}`, `Current email: ${state.currentEmail || "verified"}`)
    : tx("尚未验证邮箱", "Email not verified");
  const emailPlaceholder = state.initiallyVerified
    ? tx("请输入新的学校登记邮箱", "Enter your new school-registered email")
    : tx("请输入学校登记邮箱", "Enter the email registered with your school");
  const emailHelper = state.initiallyVerified
    ? tx("验证码将分别发送到当前邮箱和新邮箱。", "Codes will be sent separately to your current and new email addresses.")
    : tx("请输入学校登记邮箱", "Enter the email registered with your school");
  const deliveryStatus = state.initiallyVerified
    ? tx(`验证码已发送到当前邮箱和 ${state.email.trim()}`, `Codes were sent to your current email and ${state.email.trim()}`)
    : tx(`验证码已发送到 ${state.email.trim()}`, `Code sent to ${state.email.trim()}`);

  const formPanel = `<div class="binding-form col">
    ${field({ id: "email", label: state.initiallyVerified ? tx("新邮箱", "New email") : tx("邮箱", "Email"), value: state.email, disabled: busy, inputMode: "email", autocomplete: "email", type: "email", maxLength: 254, placeholder: emailPlaceholder, error: emailError, helper: emailHelper })}
    ${state.challengeId ? `<div class="binding-delivery col" role="status">
        <div class="body-medium text-on-surface">${esc(deliveryStatus)}</div>
        <div class="body-small ${challengeExpired ? "text-error" : "text-muted"}">${challengeExpired
          ? tx("验证码已过期，请重新发送。", "The code expired. Send a new one.")
          : tx(`验证码 ${formatDuration(expirySeconds)} 后失效`, `Code expires in ${formatDuration(expirySeconds)}`)}</div>
      </div>
      ${state.initiallyVerified ? field({ id: "currentEmailCode", label: tx("当前邮箱验证码", "Current-email code"), value: state.currentEmailCode, disabled: busy, inputMode: "numeric", autocomplete: "one-time-code", maxLength: 10, placeholder: tx("输入验证码", "Enter code"), error: currentCodeError, helper: tx("输入当前邮箱收到的 4–10 位验证码。", "Enter the 4–10 digit code sent to your current address.") }) : ""}
      ${field({ id: "newEmailCode", label: state.initiallyVerified ? tx("新邮箱验证码", "New-email code") : tx("邮箱验证码", "Email code"), value: state.newEmailCode, disabled: busy, inputMode: "numeric", autocomplete: "one-time-code", maxLength: 10, placeholder: tx("输入验证码", "Enter code"), error: newCodeError, helper: tx("输入新邮箱收到的 4–10 位验证码。", "Enter the 4–10 digit code sent to your new address.") })}
      <button class="primary-btn pressable binding-primary-action" data-action="binding.verifyCode" ${!currentCodeValid || !newCodeValid || challengeExpired || busy ? "disabled" : ""}>
        ${state.verifying ? spinner(18, "on-primary") : `<span>${tx("验证并继续", "Verify and continue")}</span>`}
      </button>
      <button class="text-btn pressable binding-resend" data-action="binding.sendCode" ${busy || state.resend > 0 ? "disabled" : ""}>${state.resend > 0 ? tx(`重新发送 ${state.resend}s`, `Resend in ${state.resend}s`) : tx("重新发送验证码", "Resend verification code")}</button>`
      : `<button class="primary-btn pressable binding-primary-action" data-action="binding.sendCode" ${!emailValid || busy || state.resend > 0 ? "disabled" : ""}>
          ${state.sending ? spinner(18, "on-primary") : `<span>${tx("发送验证码", "Send verification code")}</span>`}
        </button>`}
    ${state.message ? messagePanel(state.message) : ""}
    ${state.error ? userFacingErrorPanel(state.error, { compact: true }) : ""}
  </div>`;

  const footer = required
    ? `<div class="col" style="gap:4px;align-items:center">
        <button class="text-btn pressable" data-action="binding.logout" style="min-height:48px">${tx("退出登录", "Sign out")}</button>
        <div class="row"><button class="text-btn pressable" data-action="binding.openPrivacy" style="min-height:48px">${tx("隐私说明", "Privacy")}</button><span class="body-small text-muted">·</span><button class="text-btn pressable" data-action="binding.openHelp" style="min-height:48px">${tx("需要帮助", "Get help")}</button></div>
      </div>`
    : "";

  return `<div class="screen binding-screen"><div class="screen-scroll" data-scroll-key="binding-${mode}"><div class="binding-column col">
    <div class="binding-topbar row">
      ${mode === "manageContacts" ? `<button class="icon-btn pressable" data-action="binding.back" aria-label="${tx("返回", "Back")}">${icon("arrow-back", 24)}</button>` : ""}
      <div class="headline-large" style="color:var(--color-on-background)">${title}</div>
    </div>
    <div class="binding-intro col">
      <div class="body-large text-muted">${description}</div>
      <div class="body-small text-muted">${esc(currentEmailStatus)}</div>
    </div>
    ${formPanel}
    ${footer}
  </div></div></div>`;
}

export function renderActivationHelp(app) {
  return `<div class="screen binding-screen"><div class="screen-scroll" data-scroll-key="activation-help"><div class="binding-column col" style="gap:24px">
    <button class="icon-btn pressable" data-action="binding.helpBack" aria-label="${tx("返回", "Back")}" style="margin-left:-12px">${icon("arrow-back", 24)}</button>
    <div class="col" style="gap:8px"><div class="headline-large">${tx("邮箱验证帮助", "Email verification help")}</div><div class="body-large text-muted">${tx("验证码有有效期并受发送频率和失败次数限制。没有收到时，请检查垃圾邮件或等待 60 秒后重发。", "Codes expire and are protected by send-frequency and failure-attempt limits. Check spam or wait 60 seconds before resending.")}</div></div>
    <div class="swiss-panel"><div class="body-medium text-muted">${tx("仍然无法验证时，请联系学校体育教学部或账户管理员，并提供学号和可脱敏的错误码/requestId。", "If verification still fails, contact the sports office or account administrator with your student ID and the redacted error code/requestId.")}</div></div>
  </div></div></div>`;
}

export const bindingActions = {
  "binding.back": (app) => app.handleBack(),
  "binding.helpBack": (app) => app.handleBack(),
  "binding.field": (app, element) => {
    const state = app.ui.binding;
    if (!state) return;
    const fieldName = element.dataset.field;
    if (fieldName === "email") {
      state.email = element.value;
      state.challengeId = null;
      state.currentEmailCode = "";
      state.newEmailCode = "";
    } else {
      state[fieldName] = element.value.replace(/\D/g, "").slice(0, 10);
      if (state[fieldName] !== element.value) element.value = state[fieldName];
    }
    state.message = null;
    state.error = null;
  },
  "binding.sendCode": async (app) => {
    const state = app.ui.binding;
    if (!state || !EMAIL_PATTERN.test(state.email.trim()) || state.sending || state.resend > 0) return;
    state.sending = true;
    state.message = null;
    state.error = null;
    app.render();
    try {
      const accepted = await requestEmailVerificationChallenge(state.email.trim(), app.state.workspace.student.userVersion);
      state.challengeId = accepted.challengeId;
      state.expiresAt = accepted.expiresAt;
      state.message = state.initiallyVerified ? tx("验证码已分别发送到当前邮箱和新邮箱。", "Codes were sent separately to the current and new email addresses.") : tx("验证码已发送到邮箱。", "A verification code was sent to the email address.");
      startResendTicker(app, state);
    } catch (error) {
      state.error = toUserFacingError(error);
    } finally {
      state.sending = false;
      app.render();
    }
  },
  "binding.verifyCode": async (app) => {
    const state = app.ui.binding;
    if (!state?.challengeId || !CODE_PATTERN.test(state.newEmailCode) || (state.initiallyVerified && !CODE_PATTERN.test(state.currentEmailCode))) return;
    state.verifying = true;
    state.message = null;
    state.error = null;
    app.render();
    try {
      await verifyEmailVerificationChallenge(state.challengeId, {
        currentEmailCode: state.initiallyVerified ? state.currentEmailCode : null,
        newEmailCode: state.newEmailCode,
      });
      state.message = tx("邮箱验证成功。", "Email verification succeeded.");
      const workspaceLoaded = await app.reloadApiWorkspace();
      if (!workspaceLoaded) {
        state.verifying = false;
        state.message = null;
        state.error = app.state.lastError || workspaceReloadError();
        app.render();
        return;
      }
      app.ui.binding = null;
      app.state.requiresContactBinding = false;
      app.navDirection = "forward";
      app.render();
    } catch (error) {
      state.verifying = false;
      state.error = toUserFacingError(error);
      app.render();
    }
  },
  "binding.logout": (app) => { app.ui.binding = null; app.logout(); },
  "binding.openPrivacy": (app) => { app.state.activationSupportScreen = "privacy"; app.navDirection = "forward"; app.render(); },
  "binding.openHelp": (app) => { app.state.activationSupportScreen = "help"; app.navDirection = "forward"; app.render(); },
};
