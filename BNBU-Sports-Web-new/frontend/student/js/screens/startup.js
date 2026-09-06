// Startup splash, maintenance blocking page and system banners
// replicated from feature/shell/AppRootScreen.kt.

import { tx, getLanguage } from "../i18n.js";
import { icon } from "../icons.js";
import { brandLockup, spinner, esc, userFacingErrorPanel } from "../ui.js";
import { maintenanceTimingPresentation, resolveMaintenanceTiming } from "../v81-review.js";

export function renderStartupSplash() {
  return `<div class="screen splash-screen">
    <div class="splash-center">
      ${brandLockup()}
      <div class="col" style="gap:12px;align-items:center">
        ${spinner(32)}
        <div class="body-medium text-muted">${tx("正在恢复登录状态…", "Restoring your sign-in…")}</div>
      </div>
    </div>
  </div>`;
}

export function renderMaintenancePage(app) {
  const { message, estimatedRecoveryTime } = app.state.systemModeStatus;
  const english = getLanguage() === "en-US";
  const recovery = estimatedRecoveryTime
    ? tx(`预计恢复时间：${estimatedRecoveryTime}`, `Estimated recovery time: ${estimatedRecoveryTime}`)
    : tx("预计恢复时间：请留意后续通知", "Estimated recovery time: watch for further notices.");
  const timing = maintenanceTimingPresentation(
    resolveMaintenanceTiming(app.state.systemModeStatus, app.state.workspace?.proofTodos),
    english
  );
  const timingPanel = timing
    ? `<div class="swiss-panel" data-testid="maintenance.supplementTiming" style="text-align:left;width:min(100%,420px)">
        <div class="label-large text-on-surface">${esc(timing.title)}</div>
        <div class="title-medium text-on-surface" style="margin-top:6px">${esc(timing.status)}</div>
        ${timing.remainingTime ? `<div class="title-small text-primary" style="margin-top:6px">${esc(timing.remainingTime)}</div>` : ""}
        <div class="body-medium text-muted" style="margin-top:8px">${esc(timing.detail)}</div>
      </div>`
    : "";
  return `<div class="screen maintenance-page">
    <div class="maintenance-center col" style="gap:14px;align-items:center;text-align:center">
      <span class="text-primary">${icon("cloud-off", 56)}</span>
      <div class="headline-small text-on-surface">${tx("系统维护中", "System maintenance")}</div>
      <div class="body-large text-muted">${esc(message) || tx("我们正在进行系统维护，请稍后再试。", "We are performing system maintenance. Try again later.")}</div>
      <div class="title-small text-primary">${recovery}</div>
      <div class="body-small text-muted">${tx("预计恢复时间仅供参考，不是实际恢复时间或补证截止时间。", "The estimated recovery time is informational; it is not the actual recovery time or a supplementary-evidence deadline.")}</div>
      ${timingPanel}
    </div>
  </div>`;
}

export function renderPlannedMaintenanceBanner(app) {
  const { plannedMaintenanceAt, message } = app.state.systemModeStatus;
  return `<div class="banner planned">
    ${icon("cloud-off", 20)}
    <div class="banner-text">
      <div class="banner-title">${tx("计划维护通知", "Planned maintenance")}</div>
      <div class="banner-body">${esc(message) || tx(`系统将于 ${plannedMaintenanceAt} 进行维护，请提前完成需要提交的操作。`, `The system will undergo maintenance at ${plannedMaintenanceAt}. Complete any submissions beforehand.`)}</div>
    </div>
  </div>`;
}

export function renderLocalPreviewBanner() {
  return `<div class="banner local-preview">
    ${icon("info-outline", 20)}
    <div class="banner-text">
      <div class="banner-title">${tx("本地界面预览", "Local UI preview")}</div>
      <div class="banner-body">${tx("不是正式入班或打卡，不写入 Backend。只用于查看当前规则和 UI。", "This is not a formal join or check-in and does not write to Backend. Use it only to review current rules and UI.")}</div>
    </div>
  </div>`;
}

export function renderSyncStatusBanner(app) {
  const message = tx("当前显示缓存数据，内容可能不是最新", "Cached data is shown and may not be up to date.");
  const content = app.state.lastError
    ? userFacingErrorPanel(app.state.lastError, { compact: true })
    : `<div class="banner-text"><div class="banner-body">${esc(message)}</div></div>`;
  const trailing = app.state.isLoading
    ? spinner(22, "on-error-container")
    : `<button class="icon-btn pressable" style="width:40px;height:40px" data-action="root.retrySync" aria-label="${tx("重新同步", "Sync again")}">${icon("refresh", 24)}</button>`;
  return `<div class="banner sync-error">
    ${icon("cloud-off", 20)}
    ${content}
    ${trailing}
  </div>`;
}
