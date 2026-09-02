"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppSelect } from "./app-select";
import { adminCopy } from "./admin-i18n";
import { toUserFacingError, type UserFacingError } from "./api-client";
import {
  createRuntimeLogArchiveDownload,
  getAuditLogProjection,
  getRuntimeLogArchiveJob,
  listAuditLogProjections,
  requestRuntimeLogArchive,
  type AuditLogCursorPage,
  type AuditLogQueryFilters,
  type RuntimeLogArchiveJob,
} from "./admin-service";
import type { AdminLocale, AuditLogProjection } from "./admin-types";
import { AdminBadge, AdminDrawer, AdminEmpty, AdminField, AdminLoading, AdminSectionHeading, formatAdminDate } from "./admin-components";
import { ErrorPanel } from "./error-panel";
import { useAdminStore } from "./admin-store";

function demoAuditProjection(log: NonNullable<ReturnType<typeof useAdminStore>["state"]>["auditLogs"][number]): AuditLogProjection {
  return {
    id: log.id,
    organizationId: "org-bnbu-demo",
    actorUserId: log.actorId,
    actorRoleSnapshot: log.actorId?.startsWith("teacher") ? "TEACHER" : log.actorId?.startsWith("admin") ? "ADMIN" : null,
    permissionId: "admin.audit.read",
    actionType: log.action,
    targetType: log.resourceType,
    targetId: log.resourceId,
    requestId: log.requestId,
    idempotencyKeyReference: null,
    outcome: "SUCCESS",
    reasonCode: null,
    safeMetadata: { actorName: log.actorName, ...log.metadata },
    sourceIpHash: null,
    deviceFingerprintHash: null,
    occurredAt: log.createdAt,
  };
}

function filterDemoAuditRows(logs: AuditLogProjection[], filters: AuditLogQueryFilters): AuditLogProjection[] {
  return logs.filter((log) => {
    if (filters.action && log.actionType !== filters.action) return false;
    if (filters.targetType && log.targetType !== filters.targetType) return false;
    if (filters.q && !log.requestId.toLocaleLowerCase().includes(filters.q.toLocaleLowerCase())) return false;
    if (filters.occurredAtFrom && log.occurredAt < filters.occurredAtFrom) return false;
    if (filters.occurredAtTo && log.occurredAt > filters.occurredAtTo) return false;
    return true;
  });
}

function actorText(log: AuditLogProjection, fallback: string) {
  return [log.actorRoleSnapshot, log.actorUserId].filter(Boolean).join(" · ") || fallback;
}

const zhAuditActionLabels: Record<string, string> = {
  "semester.switch": "切换当前学期",
  "semester.create": "创建学期",
  "user.unlock_vcode": "解除验证码锁定",
  "record.adjust": "修正打卡记录",
  "help_article.publish": "发布帮助内容",
  "exemption.approve": "批准申请与材料",
};

const zhAuditTargetLabels: Record<string, string> = {
  semester: "学期",
  user: "用户账号",
  record: "打卡记录",
  help_article: "帮助文章",
  exemption: "申请与材料",
};

function auditActionLabel(locale: AdminLocale, action: string): string {
  if (locale === "zh") return zhAuditActionLabels[action] ?? action;
  return action.replaceAll(/[._]/g, " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function auditTargetLabel(locale: AdminLocale, targetType: string): string {
  if (locale === "zh") return zhAuditTargetLabels[targetType] ?? targetType;
  return targetType.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function auditOutcomeLabel(locale: AdminLocale, outcome: string): string {
  if (locale !== "zh") return outcome;
  return ({ SUCCESS: "成功", FAILED: "失败", ERROR: "错误", DENIED: "已拒绝", REJECTED: "已驳回" } as Record<string, string>)[outcome] ?? outcome;
}

function auditOutcomeTone(outcome: string): "green" | "orange" | "red" | "gray" {
  if (outcome === "SUCCESS") return "green";
  if (["FAILED", "ERROR"].includes(outcome)) return "red";
  if (["DENIED", "REJECTED"].includes(outcome)) return "orange";
  return "gray";
}

function endOfLocalDayIso(date: string): string {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + 1);
  value.setMilliseconds(value.getMilliseconds() - 1);
  return value.toISOString();
}

function auditServerFilters(values: {
  action: string;
  targetType: string;
  requestId: string;
  dateFrom: string;
  dateTo: string;
}): AuditLogQueryFilters {
  return {
    ...(values.action === "all" ? {} : { action: values.action }),
    ...(values.targetType === "all" ? {} : { targetType: values.targetType }),
    ...(values.requestId.trim() ? { q: values.requestId.trim() } : {}),
    ...(values.dateFrom ? { occurredAtFrom: new Date(`${values.dateFrom}T00:00:00`).toISOString() } : {}),
    ...(values.dateTo ? { occurredAtTo: endOfLocalDayIso(values.dateTo) } : {}),
  };
}

function filterAuditRows(
  logs: AuditLogProjection[],
  values: { outcome: string; actor: string; targetId: string },
): AuditLogProjection[] {
  return logs.filter((log) => {
    if (values.outcome !== "all" && log.outcome !== values.outcome) return false;
    if (values.actor.trim() && !actorText(log, "").toLocaleLowerCase().includes(values.actor.trim().toLocaleLowerCase())) return false;
    if (values.targetId.trim() && !String(log.targetId ?? "").toLocaleLowerCase().includes(values.targetId.trim().toLocaleLowerCase())) return false;
    return true;
  });
}

const archiveReadyStatuses = new Set(["COMPLETED", "READY", "SUCCEEDED"]);
const archiveFailedStatuses = new Set(["FAILED", "CANCELLED", "EXPIRED"]);

const waitForArchive = () => new Promise<void>((resolve) => {
  globalThis.setTimeout(resolve, 650);
});

function openRuntimeArchive(downloadUrl: string) {
  const parsed = new URL(downloadUrl, window.location.href);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("UNSAFE_DOWNLOAD_URL");
  const anchor = document.createElement("a");
  anchor.href = parsed.href;
  anchor.rel = "noopener noreferrer";
  anchor.click();
}

export function AdminAudit({ locale }: { locale: AdminLocale }) {
  const { mode, state } = useAdminStore();
  const [pages, setPages] = useState<AuditLogCursorPage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageBusy, setPageBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [action, setAction] = useState("all");
  const [targetType, setTargetType] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [actor, setActor] = useState("");
  const [targetId, setTargetId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detail, setDetail] = useState<AuditLogProjection | null>(null);
  const [detailError, setDetailError] = useState<UserFacingError | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [archiveJob, setArchiveJob] = useState<RuntimeLogArchiveJob | null>(null);
  const [archiveMessage, setArchiveMessage] = useState("");
  const [appliedServerFilters, setAppliedServerFilters] = useState<AuditLogQueryFilters>({});

  const load = useCallback(async (filters: AuditLogQueryFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "demo") {
        const items = filterDemoAuditRows((state?.auditLogs ?? []).map(demoAuditProjection), filters)
          .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
        setPages([{ items, nextCursor: null, hasMore: false, limit: 50 }]);
        setPageIndex(0);
        setAppliedServerFilters(filters);
        return;
      }
      const loaded = await listAuditLogProjections(null, filters);
      setPages([{ ...loaded, items: [...loaded.items].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)) }]);
      setPageIndex(0);
      setAppliedServerFilters(filters);
    } catch (failure) {
      setError(toUserFacingError(failure, locale));
    } finally {
      setLoading(false);
    }
  }, [locale, mode, state]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => { void load(); }, 0);
    return () => globalThis.clearTimeout(timer);
  }, [load]);

  const currentPage = pages[pageIndex] ?? { items: [], nextCursor: null, hasMore: false, limit: 50 };
  const logs = currentPage.items;
  const actions = useMemo(() => [...new Set(logs.map((log) => log.actionType))].sort(), [logs]);
  const targetTypes = useMemo(() => [...new Set(logs.map((log) => log.targetType))].sort(), [logs]);
  const outcomes = useMemo(() => [...new Set(logs.map((log) => log.outcome))].sort(), [logs]);
  const filtered = useMemo(() => filterAuditRows(logs, { outcome, actor, targetId }), [actor, logs, outcome, targetId]);
  const filteredActive = Boolean(action !== "all" || targetType !== "all" || outcome !== "all" || actor || targetId || requestId || dateFrom || dateTo);

  function clear() {
    setAction("all"); setTargetType("all"); setOutcome("all"); setActor(""); setTargetId(""); setRequestId(""); setDateFrom(""); setDateTo("");
    void load();
  }

  function currentServerFilters(): AuditLogQueryFilters {
    return auditServerFilters({ action, targetType, requestId, dateFrom, dateTo });
  }

  async function downloadRuntimeArchive() {
    if (downloadBusy) return;
    if (mode === "demo") {
      setArchiveMessage(locale === "zh" ? "正式登录并连接服务器后才能请求运行日志压缩包。" : "Sign in and connect to the server to request a runtime log archive.");
      return;
    }
    setDownloadBusy(true);
    setError(null);
    setArchiveMessage(locale === "zh" ? "正在向服务器申请脱敏日志压缩包…" : "Requesting a redacted server log archive…");
    try {
      let job = archiveJob ?? await requestRuntimeLogArchive(currentServerFilters());
      setArchiveJob(job);
      for (let attempt = 0; attempt < 9; attempt += 1) {
        const normalizedStatus = job.status.toLocaleUpperCase();
        if (archiveReadyStatuses.has(normalizedStatus)) {
          const download = await createRuntimeLogArchiveDownload(job.id);
          openRuntimeArchive(download.downloadUrl);
          setArchiveJob(null);
          setArchiveMessage(locale === "zh" ? "压缩包下载已开始。下载链接由服务器短时签发。" : "The ZIP download has started using a short-lived server URL.");
          return;
        }
        if (archiveFailedStatuses.has(normalizedStatus)) throw new Error(`EXPORT_${normalizedStatus}`);
        await waitForArchive();
        job = await getRuntimeLogArchiveJob(job.id);
        setArchiveJob(job);
      }
      setArchiveMessage(locale === "zh" ? "服务器仍在生成压缩包，请稍后再次点击检查并下载。" : "The server is still building the archive. Check again shortly.");
    } catch (failure) {
      setArchiveJob(null);
      setError(toUserFacingError(failure, locale));
      setArchiveMessage(locale === "zh" ? "服务器未生成压缩包，未创建本地替代文件。" : "The server did not produce an archive; no local substitute was created.");
    } finally {
      setDownloadBusy(false);
    }
  }

  async function nextPage() {
    if (pageBusy) return;
    if (pages[pageIndex + 1]) {
      setPageIndex((value) => value + 1);
      return;
    }
    if (!currentPage.hasMore || !currentPage.nextCursor) return;
    setPageBusy(true);
    setError(null);
    try {
      const loaded = await listAuditLogProjections(currentPage.nextCursor, appliedServerFilters);
      const next = { ...loaded, items: [...loaded.items].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)) };
      setPages((items) => [...items, next]);
      setPageIndex((value) => value + 1);
    } catch (failure) {
      setError(toUserFacingError(failure, locale));
    } finally {
      setPageBusy(false);
    }
  }

  async function openDetail(id: string) {
    setDetailError(null);
    try {
      if (mode === "demo") {
        setDetail((state?.auditLogs ?? []).map(demoAuditProjection).find((log) => log.id === id) ?? null);
        return;
      }
      setDetail(await getAuditLogProjection(id));
    } catch (failure) {
      setDetailError(toUserFacingError(failure, locale));
    }
  }

  if (loading) return <AdminLoading locale={locale} />;
  if (error && pages.length === 0) return (
    <div className="admin-page-stack">
      <ErrorPanel error={error} locale={locale} />
      <div className="admin-form-actions">
        <button className="primary-button" type="button" onClick={() => void load()}>{adminCopy(locale, "retry")}</button>
      </div>
    </div>
  );

  return (
    <div className="admin-page-stack admin-audit-page">
      <ErrorPanel error={error} locale={locale} />
      <ErrorPanel error={detailError} locale={locale} />
      <section className="admin-surface admin-table-surface admin-audit-workspace">
        <AdminSectionHeading
          title={locale === "zh" ? "审计事件" : "Audit events"}
          description={locale === "zh" ? "追踪谁在什么时间对哪个业务对象执行了操作；所有事件永久只读。" : "Trace who acted on which business object and when. Every event is immutable."}
          action={(
            <div className="admin-audit-heading-actions">
              <button className="text-button" type="button" onClick={() => void load(currentServerFilters())}>{adminCopy(locale, "refresh_data")}</button>
              <button className="secondary-button" type="button" disabled={mode === "demo" || downloadBusy} onClick={() => void downloadRuntimeArchive()}>
                {mode === "demo"
                  ? (locale === "zh" ? "正式登录后可下载" : "Available after sign-in")
                  : downloadBusy
                    ? (locale === "zh" ? "服务器生成中…" : "Building archive…")
                    : archiveJob
                      ? (locale === "zh" ? "检查并下载 ZIP" : "Check and download ZIP")
                      : (locale === "zh" ? "下载运行日志 ZIP" : "Download runtime ZIP")}
              </button>
            </div>
          )}
        />
        <section className="admin-log-archive" aria-label={locale === "zh" ? "服务器运行日志压缩包" : "Server runtime log archive"}>
          <div>
            <span aria-hidden="true">ZIP</span>
            <div>
              <h3>{locale === "zh" ? "服务器运行日志压缩包" : "Server runtime log archive"}</h3>
              <p>{locale === "zh" ? "由服务器汇总应用日志、健康摘要、请求关联和审计事件；敏感字段必须在服务端脱敏。" : "The server bundles application logs, health summaries, request correlation, and audit events, with mandatory server-side redaction."}</p>
              <ul><li>{locale === "zh" ? "ZIP 压缩包" : "ZIP archive"}</li><li>{locale === "zh" ? "短时下载链接" : "Short-lived link"}</li><li>{locale === "zh" ? "按当前日期条件" : "Current date scope"}</li></ul>
            </div>
          </div>
          {archiveMessage && <p className="admin-log-archive-status" role="status">{archiveMessage}</p>}
        </section>
        <section className="admin-audit-query" aria-labelledby="admin-audit-query-title">
          <header>
            <div>
              <h3 id="admin-audit-query-title">{locale === "zh" ? "筛选审计事件" : "Filter audit events"}</h3>
              <p>{locale === "zh" ? "先按时间和结果缩小范围，再使用请求或资源标识精确定位。" : "Narrow the range by time and outcome, then locate an exact request or resource."}</p>
            </div>
            <span aria-live="polite"><b>{filtered.length}</b>{locale === "zh" ? " 条当前结果" : " current results"}</span>
          </header>
          <div className="admin-audit-filter-grid is-primary">
            <AppSelect label={adminCopy(locale, "outcome")} value={outcome} options={[{ value: "all", label: adminCopy(locale, "all") }, ...outcomes.map((value) => ({ value, label: value }))]} onChange={(value) => { if (value) setOutcome(String(value)); }} />
            <AdminField locale={locale} label={adminCopy(locale, "request_id_filter")}><input type="search" value={requestId} onChange={(event) => setRequestId(event.target.value)} /></AdminField>
            <AdminField locale={locale} label={adminCopy(locale, "date_from")}><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></AdminField>
            <AdminField locale={locale} label={adminCopy(locale, "date_to")}><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></AdminField>
          </div>
          <div className="admin-audit-filter-grid is-secondary">
            <AppSelect label={adminCopy(locale, "action_filter")} value={action} options={[{ value: "all", label: adminCopy(locale, "all") }, ...actions.map((value) => ({ value, label: auditActionLabel(locale, value) }))]} onChange={(value) => { if (value) setAction(String(value)); }} />
            <AppSelect label={adminCopy(locale, "resource_type_filter")} value={targetType} options={[{ value: "all", label: adminCopy(locale, "all") }, ...targetTypes.map((value) => ({ value, label: auditTargetLabel(locale, value) }))]} onChange={(value) => { if (value) setTargetType(String(value)); }} />
            <AdminField locale={locale} label={adminCopy(locale, "actor_filter")}><input type="search" value={actor} onChange={(event) => setActor(event.target.value)} /></AdminField>
            <AdminField locale={locale} label={adminCopy(locale, "resource_id_filter")}><input type="search" value={targetId} onChange={(event) => setTargetId(event.target.value)} /></AdminField>
          </div>
          <footer>
            <button className="primary-button" type="button" onClick={() => void load(currentServerFilters())}>{adminCopy(locale, "apply_filters")}</button>
            {filteredActive && <button className="text-button" type="button" onClick={clear}>{adminCopy(locale, "clear_filters")}</button>}
            <span>{filteredActive ? (locale === "zh" ? "正在显示筛选结果" : "Showing filtered results") : (locale === "zh" ? "当前未设置筛选条件" : "No filters are active")}</span>
          </footer>
        </section>
        {filtered.length === 0 ? <AdminEmpty locale={locale} filtered={filteredActive} /> : (
          <div className="table-wrap admin-audit-table-wrap">
            <table className="admin-table admin-audit-table">
              <caption className="sr-only">{locale === "zh" ? "审计事件列表" : "Audit event list"}</caption>
              <thead><tr><th>{adminCopy(locale, "created_at")}</th><th>{adminCopy(locale, "action")}</th><th>{adminCopy(locale, "actor")}</th><th>{adminCopy(locale, "resource")}</th><th>{adminCopy(locale, "request_id")}</th><th>{adminCopy(locale, "details")}</th></tr></thead>
              <tbody>{filtered.map((log) => (
                <tr key={log.id}>
                  <td data-label={adminCopy(locale, "created_at")} className="admin-audit-time"><b>{formatAdminDate(locale, log.occurredAt, true)}</b></td>
                  <td data-label={adminCopy(locale, "action")}><div className="admin-audit-action-cell"><b>{auditActionLabel(locale, log.actionType)}</b><code>{log.actionType}</code><AdminBadge tone={auditOutcomeTone(log.outcome)}>{auditOutcomeLabel(locale, log.outcome)}</AdminBadge></div></td>
                  <td data-label={adminCopy(locale, "actor")}><div className="admin-audit-actor-cell"><b>{actorText(log, adminCopy(locale, "not_available"))}</b><small>{locale === "zh" ? "操作主体" : "Actor"}</small></div></td>
                  <td data-label={adminCopy(locale, "resource")}><div className="admin-audit-resource-cell"><b>{auditTargetLabel(locale, log.targetType)}</b><code>{log.targetId ?? adminCopy(locale, "not_available")}</code></div></td>
                  <td data-label={adminCopy(locale, "request_id")}><code className="admin-audit-request-id">{log.requestId}</code></td>
                  <td data-label={adminCopy(locale, "details")}><button className="text-button admin-audit-detail-button" type="button" aria-label={`${adminCopy(locale, "details")}：${auditActionLabel(locale, log.actionType)}`} onClick={() => void openDetail(log.id)}>{adminCopy(locale, "details")} <span aria-hidden="true">→</span></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination admin-audit-pagination" aria-label={adminCopy(locale, "cursor_pagination", { page: pageIndex + 1, limit: currentPage.limit })}>
          <span><b>{locale === "zh" ? `第 ${pageIndex + 1} 批` : `Batch ${pageIndex + 1}`}</b><small>{locale === "zh" ? `当前显示 ${filtered.length} 条 · 每批上限 ${currentPage.limit} 条` : `${filtered.length} shown · up to ${currentPage.limit} per batch`}</small></span>
          <div>
            <button type="button" disabled={pageIndex === 0 || pageBusy} onClick={() => setPageIndex((value) => Math.max(0, value - 1))}>{adminCopy(locale, "previous")}</button>
            <button type="button" disabled={pageBusy || (!pages[pageIndex + 1] && (!currentPage.hasMore || !currentPage.nextCursor))} onClick={() => void nextPage()}>{pageBusy ? adminCopy(locale, "processing") : adminCopy(locale, "next")}</button>
          </div>
        </div>
      </section>
      {detail && <AuditDrawer locale={locale} log={detail} close={() => setDetail(null)} />}
    </div>
  );
}

function AuditDrawer({ locale, log, close }: { locale: AdminLocale; log: AuditLogProjection; close: () => void }) {
  return (
    <AdminDrawer locale={locale} title={adminCopy(locale, "audit_detail")} description={log.id} close={close}>
      <section className="admin-audit-detail-summary" aria-label={locale === "zh" ? "审计事件摘要" : "Audit event summary"}>
        <AdminBadge tone={auditOutcomeTone(log.outcome)}>{auditOutcomeLabel(locale, log.outcome)}</AdminBadge>
        <h3>{auditActionLabel(locale, log.actionType)}</h3>
        <p>{locale === "zh"
          ? `${actorText(log, adminCopy(locale, "not_available"))} 于 ${formatAdminDate(locale, log.occurredAt, true)} 执行此操作。`
          : `${actorText(log, adminCopy(locale, "not_available"))} performed this action at ${formatAdminDate(locale, log.occurredAt, true)}.`}</p>
      </section>
      <div className="admin-detail-list admin-audit-detail-list">
        <span><small>{adminCopy(locale, "created_at")}</small><b>{formatAdminDate(locale, log.occurredAt, true)}</b></span>
        <span><small>{adminCopy(locale, "actor")}</small><b>{actorText(log, adminCopy(locale, "not_available"))}</b></span>
        <span><small>{adminCopy(locale, "action")}</small><b>{auditActionLabel(locale, log.actionType)}</b><code>{log.actionType}</code></span>
        <span><small>{adminCopy(locale, "resource")}</small><b>{auditTargetLabel(locale, log.targetType)}</b><code>{log.targetId ?? adminCopy(locale, "not_available")}</code></span>
        <span><small>{adminCopy(locale, "outcome")}</small><AdminBadge tone={auditOutcomeTone(log.outcome)}>{auditOutcomeLabel(locale, log.outcome)}</AdminBadge></span>
        <span><small>{adminCopy(locale, "reason_code")}</small><code>{log.reasonCode ?? adminCopy(locale, "not_available")}</code></span>
        <span className="is-wide"><small>{adminCopy(locale, "request_id")}</small><code>{log.requestId}</code></span>
      </div>
      <section className="admin-json-panel admin-audit-metadata"><h3>{adminCopy(locale, "safe_metadata")}</h3><p>{locale === "zh" ? "仅展示可安全用于排查的结构化字段，不包含敏感原始值。" : "Structured fields safe for diagnostics only; sensitive raw values are excluded."}</p><pre>{JSON.stringify(log.safeMetadata, null, 2)}</pre></section>
    </AdminDrawer>
  );
}
