// Login method chooser (#5) — feature/login/LoginScreen.kt

import { t, tx } from "../i18n.js";
import { icon } from "../icons.js";
import { universityLockup, focusFirstInvalidField } from "../ui.js";

export function realTestEntryEnabled(config = globalThis.__BNBU_PUBLIC_CONFIG__) {
  return config?.appEnv === "local";
}

function loginMethodButton({ title, subtitle, iconName, primary, enabled, action }) {
  const stateCls = !enabled ? "is-disabled" : primary ? "is-primary" : "is-plain";
  return `<button class="login-method pressable ${stateCls}" data-action="${action}" aria-disabled="${enabled ? "false" : "true"}">
    <span class="login-method-icon">${icon(iconName, 19)}</span>
    <span class="col grow" style="text-align:left">
      <span class="title-medium">${title}</span>
      <span class="body-small login-method-sub">${subtitle}</span>
    </span>
    ${icon("chevron-right", 19, "login-method-chevron")}
  </button>`;
}

export function renderLogin(app) {
  const accepted = app.state.loginPrivacyAccepted;
  const showRealTestEntry = realTestEntryEnabled();
  return `<div class="screen login-screen">
    <div class="screen-scroll" data-scroll-key="login">
      <div class="auth-column">
        ${universityLockup()}
        <div style="height:40px"></div>
        <div class="headline-large" style="color:var(--color-on-background);font-weight:600">${t("login_title")}</div>
        <div style="height:10px"></div>
        <div class="body-large text-muted">${t("login_subtitle")}</div>
        <div style="height:32px"></div>
        <div class="swiss-panel" style="padding:20px">
          <div class="title-large text-on-surface">${t("login_choose_method")}</div>
          <div style="height:20px"></div>
          <div class="privacy-consent-row">
            <input type="checkbox" id="login-privacy-check" class="checkbox" data-change="login.privacyToggle" aria-required="true" aria-invalid="${accepted ? "false" : "true"}" aria-describedby="login-privacy-support" ${accepted ? "checked" : ""} />
            <label for="login-privacy-check" class="col grow" style="padding-top:2px;gap:0">
              <span class="body-medium text-on-surface">${t("login_privacy_prefix")} <button class="privacy-link" data-action="login.openPrivacy">${t("login_privacy_policy")}</button></span>
              <span id="login-privacy-support" class="body-small ${accepted ? "text-muted" : "text-error"}" style="padding-top:4px">${accepted ? tx("已同意隐私政策", "Privacy policy accepted") : t("login_privacy_required")}</span>
            </label>
          </div>
          <div style="height:24px"></div>
          ${loginMethodButton({ title: t("login_email_button"), subtitle: t("login_email_hint"), iconName: "email", primary: true, enabled: accepted, action: "login.email" })}
          <div class="login-divider"></div>
          <div class="label-large text-muted" style="font-weight:500;padding:28px 0 12px">${t("login_other_methods")}</div>
          ${loginMethodButton({ title: t("login_scan_button"), subtitle: t("login_scan_hint"), iconName: "qr-code-scanner", primary: false, enabled: accepted, action: "login.scan" })}
          ${showRealTestEntry ? `
            <div class="local-test-divider" aria-hidden="true"></div>
            <details class="local-test-access">
              <summary>${tx("学生端测试入口", "Student test entry")}</summary>
              <div class="local-test-access-body">
                <div class="title-medium">${tx("真实账号测试", "Real-account testing")}</div>
                <div class="body-small text-muted">${tx("使用真实学生账号和密码登录；登录后所有数据均通过 HTTP API 从 Backend 获取。", "Sign in with a real student account and password; all signed-in data is loaded from Backend HTTP APIs.")}</div>
                ${loginMethodButton({
                  title: tx("进入账号密码登录", "Open account sign-in"),
                  subtitle: tx("不提供免登录账号，不使用本地合成业务数据", "No password-free account or local synthetic business data"),
                  iconName: "email",
                  primary: false,
                  enabled: accepted,
                  action: "login.testEntry",
                })}
              </div>
            </details>` : ""}
        </div>
        <div style="height:12px"></div>
        <button class="text-btn pressable" data-action="login.recovery" style="align-self:center;min-height:48px;padding:10px 4px;margin:0 auto;display:flex">
          <span class="label-large">${t("login_recovery")}</span>
        </button>
      </div>
    </div>
  </div>`;
}

export const loginActions = {
  "login.privacyToggle": (app, el) => {
    app.state.loginPrivacyAccepted = el.checked;
    app.render();
  },
  "login.openPrivacy": (app, el, event) => {
    event.preventDefault();
    app.state.showLoginPrivacy = true;
    app.navDirection = "forward";
    app.render();
  },
  "login.email": (app) => {
    if (!app.state.loginPrivacyAccepted) {
      app.render();
      focusFirstInvalidField(app._viewport, ["#login-privacy-check"]);
      return;
    }
    app.state.showEmailLogin = true; app.ui.verification = null; app.navDirection = "forward"; app.render();
  },
  "login.scan": (app) => {
    if (!app.state.loginPrivacyAccepted) {
      app.render();
      focusFirstInvalidField(app._viewport, ["#login-privacy-check"]);
      return;
    }
    app.state.showScanJoin = true; app.ui.scan = null; app.navDirection = "forward"; app.render();
  },
  "login.recovery": (app) => { app.state.showRecoveryRequest = true; app.ui.recovery = null; app.navDirection = "forward"; app.render(); },
  "login.testEntry": (app) => {
    if (!app.state.loginPrivacyAccepted) {
      app.render();
      focusFirstInvalidField(app._viewport, ["#login-privacy-check"]);
      return;
    }
    app.state.showEmailLogin = true;
    app.navDirection = "forward";
    app.render();
  },
};
