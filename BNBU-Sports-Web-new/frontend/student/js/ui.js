// Shared HTML builders for Components.kt composables.

import { icon } from "./icons.js";
import { t, tx } from "./i18n.js";

export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function emblemSvg(size, cls = "") {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 83 83" fill="currentColor" aria-hidden="true"><use href="#bnbu-emblem-path"/></svg>`;
}

/** BrandMark — white rounded surface with the emblem. */
export function brandMark(compact = false) {
  const size = compact ? 44 : 64;
  const pad = compact ? 5 : 7;
  return `<span class="brand-mark" style="width:${size}px;height:${size}px;padding:${pad}px">${emblemSvg(size - pad * 2, "brand-official")}</span>`;
}

/** SportsSeal — official-blue circular companion mark. */
export function sportsSeal(size = 34) {
  return `<span class="sports-seal" style="width:${size}px;height:${size}px">
    <span class="sports-seal-inner">${icon("directions-run", size - 18)}</span>
  </span>`;
}

/** BnbuSportsBrandLockup — startup identity stack. */
export function brandLockup(emblemSize = 84, sealSize = 34) {
  return `<div class="brand-lockup">
    ${emblemSvg(emblemSize, "brand-official")}
    <div class="brand-lockup-name display-small">BNBU</div>
    <div class="row" style="gap:10px">${sportsSeal(sealSize)}<span class="brand-lockup-sports label-large">SPORTS</span></div>
  </div>`;
}

/** UniversityBrandLockup — compact mark + bilingual school name. */
export function universityLockup() {
  return `<div class="row" style="gap:12px">
    ${brandMark(true)}
    <div class="col grow" style="gap:2px">
      <div class="title-medium text-on-surface ellipsis">${tx("北师香港浸会大学", "Beijing Normal University–Hong Kong Baptist University")}</div>
      <div class="label-small text-muted ellipsis" style="letter-spacing:0.6px">${tx("BNBU · 学生体育", "BNBU · STUDENT SPORTS")}</div>
    </div>
  </div>`;
}

/** Top back row used by sub screens. */
export function backRow(action, label = null, extra = "") {
  return `<button class="back-row pressable" data-action="${action}" ${extra}>
    ${icon("chevron-left", 28)}<span>${label ?? t("common_back")}</span>
  </button>`;
}

export function sectionTitle(title) {
  return `<div class="headline-small text-on-surface" style="width:100%">${esc(title)}</div>`;
}

export function statusBadge(text, filled = false) {
  return `<span class="status-badge${filled ? " filled" : ""}">${esc(text)}</span>`;
}

export function hourProgressBar(value, total) {
  const progress = total <= 0 ? 0 : Math.min(Math.max(value / total, 0), 1);
  return `<div class="hour-progress"><div class="fill" style="transform:scaleX(${progress})"></div></div>`;
}

export function spinner(size = 32, variant = "") {
  const cls = size === 32 ? "" : `s${size}`;
  return `<span class="spinner ${cls} ${variant}" role="progressbar"></span>`;
}

export function primaryButton({ label, iconName = null, action, loading = false, disabled = false, shapeXl = false, extra = "" }) {
  return `<button class="primary-btn pressable${loading ? " is-loading" : ""}${shapeXl ? " shape-xl" : ""}" data-action="${action}" ${disabled || loading ? "disabled" : ""} ${extra}>
    ${loading ? spinner(18, "on-primary") : iconName ? icon(iconName, 20) : ""}
    <span>${esc(label)}</span>
  </button>`;
}

export function tonalButton({ label, iconName = null, action, disabled = false, extra = "" }) {
  return `<button class="tonal-btn pressable" data-action="${action}" ${disabled ? "disabled" : ""} ${extra}>
    ${iconName ? icon(iconName, 18) : ""}<span>${esc(label)}</span>
  </button>`;
}

export function actionButton({ label, iconName, action, filled, disabled = false, extra = "" }) {
  if (filled) {
    return `<button class="primary-btn pressable" data-action="${action}" ${disabled ? "disabled" : ""} ${extra}>${iconName ? icon(iconName, 18) : ""}<span class="ellipsis">${esc(label)}</span></button>`;
  }
  return tonalButton({ label, iconName, action, disabled, extra });
}

export function segmented({ items, selected, action, cls = "" }) {
  return `<div class="segmented ${cls}" role="radiogroup">${items
    .map(
      (item) => `<button class="segment pressable" role="radio" aria-checked="${item.value === selected}" data-action="${action}" data-value="${item.value}">${esc(item.label)}</button>`
    )
    .join("")}</div>`;
}

export function emptyPlaceholder(title, message) {
  return `<div class="empty-placeholder">
    <div class="title-medium text-on-surface">${esc(title)}</div>
    <div class="body-medium text-muted" style="margin-top:8px">${esc(message)}</div>
  </div>`;
}

export function validationPanel(message) {
  return `<div class="validation-panel" role="alert">${icon("error", 20)}<span>${esc(message)}</span></div>`;
}

/** Shared accessible label for Student forms. */
export function fieldLabel({ id, label, required = false }) {
  return `<label class="field-label" for="${esc(id)}">${esc(label)}${required ? `<span class="field-required" aria-hidden="true"> *</span><span class="sr-only">${esc(tx("必填", "Required"))}</span>` : ""}</label>`;
}

/** Shared ARIA attributes for native Student controls. */
export function fieldControlAttrs({ id, error = null, helper = null, required = false }) {
  const supportId = error || helper ? `${id}-support` : null;
  return [
    `id="${esc(id)}"`,
    required ? 'aria-required="true"' : "",
    error ? 'aria-invalid="true"' : 'aria-invalid="false"',
    supportId ? `aria-describedby="${esc(supportId)}"` : "",
  ].filter(Boolean).join(" ");
}

/** Helper/error text paired with fieldControlAttrs. Errors are not color-only. */
export function fieldSupport({ id, error = null, helper = null }) {
  const text = error || helper;
  if (!text) return "";
  return `<div id="${esc(id)}-support" class="field-supporting${error ? " error" : ""}" ${error ? 'role="alert"' : ""}>${error ? `${icon("error-outline", 15)}<span class="sr-only">${esc(tx("错误：", "Error:"))}</span>` : ""}<span>${esc(text)}</span></div>`;
}

/** Focuses the first invalid control after the caller has synchronously rendered. */
export function focusFirstInvalidField(viewport, selectors = []) {
  if (!viewport?.querySelector) return false;
  for (const selector of selectors) {
    const control = viewport.querySelector(selector);
    if (control && typeof control.focus === "function") {
      control.focus();
      return true;
    }
  }
  return false;
}

/** Unified rendering for a safe UserFacingError model. */
export function userFacingErrorPanel(error, { compact = false } = {}) {
  if (!error) return "";
  const model = typeof error === "string"
    ? {
        title: tx("操作未完成", "Action not completed"),
        message: tx("暂时无法完成此操作。", "This action cannot be completed right now."),
        action: tx("请检查输入后重试。", "Check your input and try again."),
        requestId: null,
        retryable: false,
        fieldErrors: [],
      }
    : error;
  const fieldErrors = Array.isArray(model.fieldErrors) ? model.fieldErrors.slice(0, 20) : [];
  return `<section class="user-facing-error-panel${compact ? " compact" : ""}" role="alert" aria-live="assertive">
    <div class="user-facing-error-heading">${icon("error-outline", 20)}<strong>${esc(model.title)}</strong></div>
    <p>${esc(model.message)}</p>
    ${model.action ? `<p class="user-facing-error-action">${esc(model.action)}</p>` : ""}
    ${fieldErrors.length ? `<ul>${fieldErrors.map((item) => `<li><b>${esc(item.field)}</b>：${esc(item.message)}</li>`).join("")}</ul>` : ""}
    ${model.requestId ? `<p class="user-facing-error-request">${esc(tx("诊断编号", "Diagnostic reference"))}：<code>${esc(model.requestId)}</code></p>` : ""}
  </section>`;
}

export function statusMessagePanel(message, dismissAction) {
  return `<div class="status-message-panel">
    <div class="row">
      <span class="icon-check">${icon("check-circle", 24)}</span>
      <span class="body-medium text-on-surface grow" style="margin-left:10px">${esc(message)}</span>
      ${statusBadge(tx("完成", "Complete"), true)}
    </div>
    <div style="height:10px"></div>
    ${tonalButton({ label: tx("知道了", "Got it"), iconName: "close", action: dismissAction })}
  </div>`;
}
