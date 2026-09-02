// Startup splash, maintenance blocking page and system banners
// replicated from feature/shell/AppRootScreen.kt.

import { tx } from "../i18n.js";
import { icon } from "../icons.js";
import { brandLockup, spinner, esc, userFacingErrorPanel } from "../ui.js";

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
  const recovery = estimatedRecoveryTime
    ? tx(`预计恢复时间：${estimatedRecoveryTime}`, `Estimated recovery time: ${estimatedRecoveryTime}`)
    : tx("预计恢复时间：请留意后续通知", "Estimated recovery time: watch for further notices.");
  return `<div class="screen maintenance-page">
    <div class="maintenance-center col" style="gap:14px;align-items:center;text-align:center">
      <span class="text-primary">${icon("cloud-off", 56)}</span>
      <div class="headline-small text-on-surface">${tx("系统维护中", "System maintenance")}</div>
      <div class="body-large text-muted">${esc(message) || tx("我们正在进行系统维护，请稍后再试。", "We are performing system maintenance. Try again later.")}</div>
      <div class="title-small text-primary">${recovery}</div>
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
