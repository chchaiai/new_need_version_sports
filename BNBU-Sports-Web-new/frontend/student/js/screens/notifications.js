// Notification bottom sheet (#16) — feature/notifications/NotificationSheet.kt.
// Full-expand sheet at 82% height; filter chips All/Unread/Deadline/Application;
// tapping an unread notice marks it read first; Review notices close the sheet
// and open the exemption screen; others open the in-sheet detail.

import { t, tx } from "../i18n.js";
import { icon } from "../icons.js";
import { esc, statusBadge, emptyPlaceholder } from "../ui.js";

const FILTERS = [
  { id: "all", labelKey: "notification_all" },
  { id: "unread", labelKey: "notification_unread" },
  { id: "deadline", labelKey: "notification_deadline" },
  { id: "application", labelKey: "notification_application" },
];

function notificationsState(app) {
  if (!app.ui.notifications) app.ui.notifications = { filter: "all", selectedNoticeId: null };
  return app.ui.notifications;
}

function proofCountdown(app) {
  const todos = Array.isArray(app.state.workspace?.proofTodos) ? app.state.workspace.proofTodos : [];
  if (!todos.length) {
    return `<button class="outlined-btn" type="button" disabled style="min-height:44px;margin-bottom:8px">${tx("补证倒计时（当前无待办）", "Proof countdown (none open)")}</button>`;
  }
  const nearest = todos.reduce((best, item) => {
    const remain = Number(item.remainingSeconds);
    if (!Number.isFinite(remain)) return best;
    if (!best || remain < Number(best.remainingSeconds)) return item;
    return best;
  }, null);
  const minutes = nearest ? Math.max(0, Math.ceil(Number(nearest.remainingSeconds) / 60)) : 0;
  return `<div class="body-medium" style="min-height:44px;margin-bottom:8px">${tx(`最近补证截止还剩约 ${minutes} 分钟（服务器 remainingSeconds）`, `Nearest proof deadline: about ${minutes} min (server remainingSeconds)`)}</div>`;
}

/** Refresh only the sheet body so its open animation and the page below stay intact. */
function refreshNotificationSheet(app) {
  const currentSheet = app._viewport?.querySelector(".sheet-scrim > .sheet");
  if (!currentSheet) {
    app.render();
    return;
  }
  const template = document.createElement("template");
  template.innerHTML = renderNotificationSheet(app).trim();
  const nextBody = template.content.querySelector(".sheet-scrim > .sheet > .col");
  const currentBody = currentSheet.querySelector(":scope > .col");
  if (!nextBody || !currentBody) {
    app.render();
    return;
  }
  currentBody.replaceWith(nextBody);
}

function studentVisibleNoticeText(text) {
  return String(text || "");
}

function noticeRow(notice) {
  return `<button class="swiss-panel pressable notice-row" data-action="notifications.openNotice" data-notice-id="${esc(notice.id)}">
    <div class="row" style="align-items:flex-start;gap:10px">
      <span style="display:inline-flex;flex:none;color:${notice.isUnread ? "var(--color-primary)" : "var(--color-on-surface-variant)"}">${icon(notice.isUnread ? "notifications" : "check-circle", 20)}</span>
      <div class="col grow" style="gap:6px;text-align:left">
        <div class="row">
          <span class="body-medium grow" style="color:var(--color-on-surface);font-weight:${notice.isUnread ? 600 : 400}">${esc(studentVisibleNoticeText(notice.title))}</span>
          <span class="label-small text-muted">${esc(notice.time)}</span>
        </div>
        <span class="body-small text-muted">${esc(studentVisibleNoticeText(notice.message))}</span>
      </div>
    </div>
  </button>`;
}

export function renderNotificationSheet(app) {
  const ui = notificationsState(app);
  const notices = app.visibleNotices();
  const unread = app.unreadNoticeCount();
  const selectedNotice = ui.selectedNoticeId ? notices.find((n) => n.id === ui.selectedNoticeId) : null;
  const showingDetail = !!selectedNotice;

  let content;
  if (showingDetail) {
    content = `<div class="col" style="gap:14px;overflow-y:auto">
      <div class="swiss-panel">
        <div class="title-large text-on-surface">${esc(studentVisibleNoticeText(selectedNotice.title))}</div>
        <div style="height:4px"></div>
        <div class="label-medium text-muted">${esc(selectedNotice.time)}</div>
        <div style="height:6px"></div>
        <div class="body-medium text-muted">${esc(studentVisibleNoticeText(selectedNotice.message))}</div>
      </div>
      ${selectedNotice.isUnread ? `<button class="text-btn pressable" data-action="notifications.markRead" data-notice-id="${esc(selectedNotice.id)}" style="width:100%">
        ${icon("check-circle", 20)}<span>${t("notification_mark_read")}</span>
      </button>` : ""}
    </div>`;
  } else {
    const filtered = notices.filter((notice) => {
      switch (ui.filter) {
        case "unread": return notice.isUnread;
        case "deadline": return notice.category === "deadline";
        case "application": return notice.category === "review";
        default: return true;
      }
    });
    content = `
      <div class="row notification-filters" style="gap:8px;padding:10px 0;overflow-x:auto">
        ${FILTERS.map((f) => `<button class="filter-chip pressable" aria-pressed="${ui.filter === f.id}" data-action="notifications.filter" data-filter="${f.id}">
          ${ui.filter === f.id ? icon("check", 16) : ""}<span class="label-medium">${t(f.labelKey)}</span>
        </button>`).join("")}
      </div>
      ${filtered.length === 0
        ? emptyPlaceholder(t("notification_empty"), t("notification_empty_hint"))
        : `<div class="col" style="gap:10px;overflow-y:auto;flex:1;min-height:0">${filtered.map(noticeRow).join("")}</div>`}
    `;
  }

  return `<div class="sheet-scrim" data-action="notifications.scrim">
    <div class="sheet" role="dialog" aria-modal="true">
      <div class="drag-handle"></div>
      <div class="col" style="flex:1;min-height:0;padding:0 18px 12px">
        <div class="row" style="min-height:56px">
          ${showingDetail
            ? `<button class="icon-btn pressable" data-action="notifications.backToList" aria-label="${t("notification_back_list")}">${icon("chevron-left", 24)}</button>`
            : `<span class="text-primary" style="display:inline-flex">${icon("notifications", 24)}</span><span style="width:10px"></span>`}
          <span class="title-large text-on-surface grow">${t(showingDetail ? "notification_detail" : "notification_title")}</span>
          <button class="icon-btn pressable" data-action="notifications.close" aria-label="${t("notification_close")}">${icon("close", 24)}</button>
        </div>
        ${showingDetail ? "" : `<p class="body-small text-muted" style="margin:0 0 8px">${tx("通知不含分数。补证截止只使用服务器 proof-todos。", "Notices do not include scores. Proof deadlines use server proof-todos only.")}</p>`}
        ${showingDetail ? "" : proofCountdown(app)}
        ${showingDetail ? "" : `<div class="row">
          ${statusBadge(unread > 0 ? t("notification_unread_count", unread) : t("notification_none_unread"))}
          <span class="grow"></span>
          <button class="text-btn pressable" data-action="notifications.markAll" ${unread > 0 ? "" : "disabled"}>${t("notification_mark_all")}</button>
        </div>`}
        <div class="col" style="flex:1;min-height:0">${content}</div>
      </div>
    </div>
  </div>`;
}

export const notificationActions = {
  "notifications.scrim": (app, el, event) => {
    if (event.target === el) notificationActions["notifications.close"](app);
  },
  "notifications.close": (app) => {
    app.state.notificationSheetOpen = false;
    app.ui.notifications = null;
    app.render();
  },
  "notifications.backToList": (app) => {
    notificationsState(app).selectedNoticeId = null;
    refreshNotificationSheet(app);
  },
  "notifications.filter": (app, el) => {
    notificationsState(app).filter = el.dataset.filter;
    refreshNotificationSheet(app);
  },
  "notifications.openNotice": async (app, el) => {
    const ui = notificationsState(app);
    const notice = app.visibleNotices().find((n) => n.id === el.dataset.noticeId);
    if (!notice) return;
    if (notice.isUnread && !(await app.markNoticeRead(notice.id))) {
      refreshNotificationSheet(app);
      return;
    }
    if (notice.opensExemption) {
      app.state.notificationSheetOpen = false;
      app.ui.notifications = null;
      app.openSub("exemption", { targetId: notice.targetId || null });
    } else if (notice.kind === "review" && notice.targetId) {
      app.state.notificationSheetOpen = false;
      app.ui.notifications = null;
      if (!app.ui.checkin) app.ui.checkin = {};
      app.ui.checkin.selectedRecordId = notice.targetId;
      app.selectTab("checkin");
    } else {
      ui.selectedNoticeId = notice.id;
      refreshNotificationSheet(app);
    }
  },
  "notifications.markRead": async (app, el) => {
    await app.markNoticeRead(el.dataset.noticeId);
    refreshNotificationSheet(app);
  },
  "notifications.markAll": async (app) => {
    await app.markAllNoticesRead();
    refreshNotificationSheet(app);
  },
};
