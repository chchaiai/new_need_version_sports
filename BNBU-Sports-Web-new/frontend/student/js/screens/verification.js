// current API email-only student verification-code sign-in.

import { t, tx } from "../i18n.js";
import { icon } from "../icons.js";
import { brandMark, esc, spinner, fieldLabel, fieldControlAttrs, fieldSupport, userFacingErrorPanel, focusFirstInvalidField } from "../ui.js";
import {
  requestStudentSignInCode,
  verifyStudentSignInCode,
  toUserFacingError,
} from "../api.js";

const CODE_MAX_LENGTH = 10;
const RESEND_COOLDOWN = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function verificationState(app) {
  if (!app.ui.verification) {
    app.ui.verification = {
      contact: "",
      code: "",
      challengeId: null,
      expiresAt: null,
      cooldown: 0,
      sending: false,
      loggingIn: false,
      error: null,
      info: null,
      contactAttempted: false,
      codeAttempted: false,
    };
  }
  return app.ui.verification;
}

function derived(state) {
  const emailValid = EMAIL_PATTERN.test(state.contact.trim());
  const contactInvalid = (state.contactAttempted || state.contact.trim() !== "") && !emailValid;
  const codeValid = /^\d{4,10}$/.test(state.code);
  const codeInvalid = (state.codeAttempted || state.code !== "") && !codeValid;
  return {
    contactInvalid,
    codeInvalid,
    canSend: emailValid && state.cooldown === 0 && !state.sending && !state.loggingIn,
    canLogin: emailValid && codeValid && Boolean(state.challengeId) && !state.sending && !state.loggingIn,
  };
}

function inputField({ id, label, value, placeholder, iconName, invalid, errorText, disabled, inputMode, maxlength, action, trailing, codeStyle }) {
  return `<div class="col" style="width:100%">
    ${fieldLabel({ id, label, required: true })}
    <div style="height:8px"></div>
    <div class="vfield${invalid ? " error" : ""}${disabled ? " disabled" : ""}">
      <span class="vfield-icon">${icon(iconName, 20)}</span>
      <input ${fieldControlAttrs({ id, error: invalid ? errorText : null, required: true })} class="vfield-input${codeStyle ? " code-style" : ""}" type="text" inputmode="${inputMode}" ${maxlength ? `maxlength="${maxlength}"` : ""}
        value="${esc(value)}" placeholder="${esc(placeholder)}" data-input="${action}" ${disabled ? "disabled" : ""} autocomplete="${codeStyle ? "one-time-code" : "email"}" />
      ${trailing || ""}
    </div>
    ${fieldSupport({ id, error: invalid ? errorText : null })}
  </div>`;
}

function statusBanner(message, isError) {
  return `<div class="vlogin-banner ${isError ? "is-error" : "is-info"}">
    ${icon(isError ? "error-outline" : "check-circle", 18)}
    <span class="body-small grow" style="white-space:pre-line">${esc(message)}</span>
  </div>`;
}

export function renderVerificationLogin(app) {
  const state = verificationState(app);
  const rules = derived(state);
  const formEnabled = !state.sending && !state.loggingIn;
  const resendLabel = state.cooldown > 0 ? t("login_verification_resend_countdown", state.cooldown) : t("login_verification_send_code");

  return `<div class="screen vlogin-screen">
    <div class="screen-scroll" data-scroll-key="vlogin-email">
      <div class="vlogin-topbar">
        <button class="icon-btn pressable" data-action="verification.back" aria-label="${t("common_back")}">${icon("arrow-back", 24)}</button>
      </div>
      <div class="auth-column" style="padding-top:30px">
        ${brandMark(true)}
        <div style="height:22px"></div>
        <div class="headline-large" style="color:var(--color-on-background);font-weight:600">${t("login_verification_email_title")}</div>
        <div style="height:10px"></div>
        <div class="body-large text-muted">${t("login_verification_email_subtitle")}</div>
        <div style="height:28px"></div>
        <div class="vlogin-card">
          ${inputField({
            id: "vlogin-contact", label: t("login_verification_email_label"), value: state.contact,
            placeholder: t("login_verification_email_placeholder"), iconName: "email",
            invalid: rules.contactInvalid, errorText: t("login_verification_email_invalid"),
            disabled: !formEnabled, inputMode: "email", action: "verification.contact",
          })}
          <div style="height:20px"></div>
          ${inputField({
            id: "vlogin-code", label: t("login_verification_code_label"), value: state.code,
            placeholder: t("login_verification_code_placeholder"), iconName: "lock",
            invalid: rules.codeInvalid, errorText: t("login_verification_code_invalid"),
            disabled: !formEnabled, inputMode: "numeric", maxlength: CODE_MAX_LENGTH,
            action: "verification.code", codeStyle: true,
             trailing: `<button class="text-btn pressable vfield-trailing" data-action="verification.sendCode" ${state.cooldown > 0 || state.sending || state.loggingIn ? "disabled" : ""} style="min-height:48px;padding:0 8px">
              ${state.sending ? spinner(18) : `<span class="label-large" style="font-weight:500;white-space:nowrap">${resendLabel}</span>`}
            </button>`,
          })}
          <div style="height:14px"></div>
          <div class="row" style="gap:8px"><span class="text-muted" style="display:inline-flex">${icon("info-outline", 17)}</span><span class="body-small text-muted grow">${t("login_verification_code_expiry")}</span></div>
          ${state.info || state.error ? `<div style="padding-top:18px" class="col gap8">${state.info ? statusBanner(state.info, false) : ""}${state.error ? userFacingErrorPanel(state.error, { compact: true }) : ""}</div>` : ""}
          <div style="height:24px"></div>
          <button class="vlogin-submit pressable" data-action="verification.submit" ${state.sending || state.loggingIn || !state.challengeId ? "disabled" : ""}>
            ${state.loggingIn ? `${spinner(18, "on-primary")}<span style="width:10px"></span>` : ""}
            <span class="title-medium">${t("login_verification_submit")}</span>
          </button>
        </div>
        <div style="height:12px"></div>
        <div class="body-small text-muted" style="text-align:center;width:100%">${t("login_verification_privacy_notice")}</div>
      </div>
    </div>
  </div>`;
}

function startCooldown(app, state) {
  state.cooldown = RESEND_COOLDOWN;
  const timer = setInterval(() => {
    state.cooldown -= 1;
    if (state.cooldown <= 0) {
      state.cooldown = 0;
      clearInterval(timer);
      app.render();
      return;
    }
    const label = app._viewport?.querySelector('[data-action="verification.sendCode"] .label-large');
    if (label) label.textContent = t("login_verification_resend_countdown", state.cooldown);
  }, 1000);
}

function syncControls(app) {
  const state = verificationState(app);
  const send = app._viewport?.querySelector('[data-action="verification.sendCode"]');
  if (send) send.disabled = state.cooldown > 0 || state.sending || state.loggingIn;
  const submit = app._viewport?.querySelector('[data-action="verification.submit"]');
  if (submit) submit.disabled = state.sending || state.loggingIn || !state.challengeId;
}

export const verificationActions = {
  "verification.back": (app) => app.handleBack(),
  "verification.contact": (app, element) => {
    const state = verificationState(app);
    state.contact = element.value;
    state.challengeId = null;
    state.code = "";
    state.error = null;
    state.info = null;
    syncControls(app);
  },
  "verification.code": (app, element) => {
    const state = verificationState(app);
    state.code = element.value.replace(/\D/g, "").slice(0, CODE_MAX_LENGTH);
    if (state.code !== element.value) element.value = state.code;
    state.error = null;
    syncControls(app);
  },
  "verification.sendCode": async (app) => {
    const state = verificationState(app);
    state.contactAttempted = true;
    if (!derived(state).canSend) {
      app.render();
      focusFirstInvalidField(app._viewport, ["#vlogin-contact"]);
      return;
    }
    state.sending = true;
    state.error = null;
    state.info = null;
    app.render();
    try {
      const accepted = await requestStudentSignInCode(state.contact.trim());
      state.challengeId = accepted.challengeId;
      state.expiresAt = accepted.expiresAt;
      state.info = t("login_verification_email_code_sent");
      startCooldown(app, state);
    } catch (error) {
      state.error = toUserFacingError(error);
    } finally {
      state.sending = false;
      app.render();
      if (state.challengeId) app._viewport?.querySelector("#vlogin-code")?.focus();
    }
  },
  "verification.submit": async (app) => {
    const state = verificationState(app);
    state.contactAttempted = true;
    state.codeAttempted = true;
    if (!derived(state).canLogin) {
      app.render();
      focusFirstInvalidField(app._viewport, ["#vlogin-contact", "#vlogin-code"]);
      return;
    }
    state.loggingIn = true;
    state.error = null;
    app.render();
    try {
      await verifyStudentSignInCode(state.challengeId, state.code);
      app.state.showEmailLogin = false;
      await app.completeApiLogin();
    } catch (error) {
      state.loggingIn = false;
      state.error = toUserFacingError(error);
      app.render();
    }
  },
};
