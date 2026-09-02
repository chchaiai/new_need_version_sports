// Privacy consent (#2) — AppRootScreen.kt / PrivacyConsentScreen
// Privacy policy reader (#3/#30) — profile/PrivacyPolicyScreen.kt
// Policy text comes from the bundled Markdown assets, not an API.

import { t, tx, getLanguage } from "../i18n.js";
import { icon } from "../icons.js";
import { esc } from "../ui.js";
import { localStore, BUILD } from "../store.js";

const policyCache = { zh: null, en: null };

export function loadPolicyMarkdown() {
  for (const lang of ["zh", "en"]) {
    if (policyCache[lang]) continue;
    const file = lang === "en" ? "privacy_policy_en.md" : "privacy_policy_zh_cn.md";
    fetch(`./assets/${file}`)
      .then((res) => (res.ok ? res.text() : ""))
      .then((text) => { policyCache[lang] = text || ""; })
      .catch(() => { policyCache[lang] = ""; });
  }
}

/** parsePrivacyPolicy replicated from PrivacyPolicyScreen.kt. */
function parsePolicy(markdown) {
  const sections = [];
  let title = tx("BNBU Sports 用户隐私政策", "BNBU Sports Privacy Policy");
  let paragraphs = [];
  const commit = () => {
    if (paragraphs.length || sections.length === 0) sections.push({ title, paragraphs: [...paragraphs] });
    paragraphs = [];
  };
  for (const sourceLine of String(markdown || "").split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line) continue;
    if (line.startsWith("# ") && sections.length === 0 && paragraphs.length === 0) {
      title = line.slice(2).trim();
    } else if (line.startsWith("## ")) {
      commit();
      title = line.slice(3).trim();
    } else if (line.startsWith("### ")) {
      paragraphs.push(line.slice(4).trim());
    } else {
      paragraphs.push(line);
    }
  }
  commit();
  return sections;
}

const SUBHEADING = /^\d{1,2}\.\d{1,2}\s.+/;

export function renderPrivacyPolicy(app, { context } = {}) {
  const markdown = policyCache[getLanguage()];
  const sections = markdown === null ? null : parsePolicy(markdown);
  let body;
  if (sections === null) {
    body = `<div class="row" style="justify-content:center;padding:40px 0"><span class="spinner"></span></div>`;
  } else {
    const head = sections[0];
    const rest = sections.slice(1);
    body = `
      <div class="headline-small text-on-surface">${esc(head?.title || tx("BNBU Sports 用户隐私政策", "BNBU Sports Privacy Policy"))}</div>
      ${head && head.paragraphs.length ? policySection(tx("版本与适用说明", "Version and scope"), head.paragraphs) : ""}
      ${rest.map((s) => policySection(s.title, s.paragraphs)).join("")}
      <div style="height:40px"></div>`;
  }
  return `<div class="screen policy-screen">
    <div class="screen-scroll" data-scroll-key="privacy-policy-${context || "root"}">
      <div class="policy-column col" style="gap:16px">
        <button class="row pressable policy-back" data-action="privacy.back" style="gap:8px;padding:12px 0;width:100%">
          ${icon("chevron-left", 24)}
          <span class="body-medium text-on-surface">${tx("返回", "Back")}</span>
        </button>
        ${body}
      </div>
    </div>
  </div>`;
}

function policySection(title, paragraphs) {
  return `<div class="swiss-panel">
    <div class="title-medium text-on-surface">${esc(title)}</div>
    <div style="height:12px"></div>
    ${paragraphs
      .map((p) => `<div class="${SUBHEADING.test(p) ? "title-small text-muted" : "body-medium text-muted"}" style="margin-bottom:8px">${esc(p)}</div>`)
      .join("")}
  </div>`;
}

export function renderPrivacyConsent(app) {
  if (app.ui.consent?.showFullPolicy) return renderPrivacyPolicy(app, { context: "consent" });
  return `<div class="screen consent-screen">
    <div class="screen-scroll" data-scroll-key="consent">
      <div class="consent-column">
        <div class="label-medium text-primary">${t("privacy_consent_eyebrow")}</div>
        <div style="height:20px"></div>
        <div class="headline-large" style="color:var(--color-on-background)">${t("privacy_consent_title")}</div>
        <div style="height:12px"></div>
        <div class="body-large text-muted">${t("privacy_consent_intro")}</div>
        <div style="height:32px"></div>
        <div class="swiss-panel">
          <div class="title-medium text-on-surface">${t("privacy_consent_summary_title")}</div>
          <div style="height:12px"></div>
          <div class="body-medium text-muted">${t("privacy_consent_summary")}</div>
          <div style="height:16px"></div>
          <button class="text-btn compact pressable" data-action="consent.openPolicy" style="padding:8px 0">${t("privacy_consent_full_policy")}</button>
        </div>
        <div style="height:32px"></div>
        <button class="primary-btn pressable" data-action="consent.agree" style="height:52px">${t("privacy_consent_agree")}</button>
        <button class="text-btn pressable" data-action="consent.decline" style="width:100%;height:48px">${t("privacy_consent_decline")}</button>
        <div class="body-small text-muted" style="padding-top:12px">${t("privacy_consent_footer")}</div>
      </div>
    </div>
  </div>`;
}

export const consentActions = {
  "consent.openPolicy": (app) => {
    app.ui.consent = { ...(app.ui.consent || {}), showFullPolicy: true };
    app.navDirection = "forward";
    app.render();
  },
  "consent.agree": (app) => {
    localStore.agreePrivacyPolicy(BUILD.PRIVACY_POLICY_VERSION, new Date().toISOString());
    app.state.loginPrivacyAccepted = true;
    app.state.needsPrivacyConsent = false;
    app.navDirection = "forward";
    app.render();
  },
  "consent.decline": (app) => {
    // Android: logout + finishAndRemoveTask. The web equivalent signs out and
    // shows the exit notice; the tab cannot close itself.
    app.logout();
    document.body.innerHTML = `<div style="height:100dvh;display:flex;align-items:center;justify-content:center;background:var(--color-background);color:var(--color-on-surface-variant);font-family:var(--font-family);padding:32px;text-align:center">${tx("你已选择不同意隐私政策，应用已退出。可关闭此页面。", "You declined the Privacy Policy and the app has exited. You can close this page.")}</div>`;
  },
  "privacy.back": (app) => {
    // Return to whichever screen opened the policy (login / consent /
    // settings / activation).
    if (app.ui.consent?.showFullPolicy) {
      app.ui.consent.showFullPolicy = false;
      app.navDirection = "back";
      app.render();
      return;
    }
    app.handleBack();
  },
};
