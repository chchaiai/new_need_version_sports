"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { adminCopy } from "./admin-i18n";
import { toUserFacingError, type UserFacingError } from "./api-client";
import { getSystemModeProjection, switchSystemMode } from "./admin-service";
import type { AdminLocale, SystemMode, SystemModeProjection } from "./admin-types";
import {
  AdminBadge,
  AdminDialog,
  AdminField,
  AdminLoadError,
  AdminLoading,
  formatAdminDate,
} from "./admin-components";
import { ErrorPanel } from "./error-panel";
import { useAdminStore } from "./admin-store";

type ModeEditor = {
  target: SystemMode;
  reason: string;
  titleZh: string;
  titleEn: string;
  messageZh: string;
  messageEn: string;
  expectedRecoveryAt: string;
};

const modeMeta: Record<SystemMode, { zh: string; en: string; detailZh: string; detailEn: string }> = {
  NORMAL: {
    zh: "正常模式",
    en: "Normal",
    detailZh: "全部已开放业务按权限正常运行。",
    detailEn: "All available business capabilities operate normally.",
  },
  MAINTENANCE: {
    zh: "维护模式",
    en: "Maintenance",
    detailZh: "暂停业务访问，并向用户展示维护公告。",
    detailEn: "Business access pauses and a maintenance notice is shown.",
  },
};

const modes: SystemMode[] = ["NORMAL", "MAINTENANCE"];

function isSystemMode(value: unknown): value is SystemMode {
  return typeof value === "string" && modes.includes(value as SystemMode);
}

export function AdminSystem({ locale }: { locale: AdminLocale }) {
  const { mode, state, busyKey, error: storeError, clearError, run } = useAdminStore();
  const [realProjection, setRealProjection] = useState<SystemModeProjection | null>(null);
  const [loading, setLoading] = useState(mode === "real");
  const [error, setError] = useState<UserFacingError | null>(null);
  const [editor, setEditor] = useState<ModeEditor | null>(null);

  const load = useCallback(async () => {
    if (mode === "demo") return;
    setLoading(true);
    setError(null);
    try {
      setRealProjection(await getSystemModeProjection());
    } catch (failure) {
      setError(toUserFacingError(failure, locale));
    } finally {
      setLoading(false);
    }
  }, [locale, mode]);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => { void load(); }, 0);
    return () => globalThis.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const projection = useMemo<SystemModeProjection | null>(() => {
    if (mode === "real") return realProjection;
    if (!state) return null;
    return {
      mode: state.systemMode.mode,
      policyVersion: state.revision,
      updatedAt: state.systemMode.changedAt,
    };
  }, [mode, realProjection, state]);

  function beginChange(target: SystemMode) {
    if (target === projection?.mode || mode !== "demo") return;
    clearError();
    setEditor({
      target,
      reason: "",
      titleZh: "系统维护通知",
      titleEn: "System maintenance notice",
      messageZh: "系统正在维护，请稍后再试。",
      messageEn: "The system is under maintenance. Please try again later.",
      expectedRecoveryAt: "",
    });
  }

  async function submitChange(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    const changed = await run(
      `system-mode:${editor.target}`,
      () => switchSystemMode(
        editor.target,
        editor.reason,
        editor.target === "MAINTENANCE"
          ? {
              kind: "planned",
              titleZh: editor.titleZh,
              titleEn: editor.titleEn,
              messageZh: editor.messageZh,
              messageEn: editor.messageEn,
              startsAt: new Date().toISOString(),
              expectedRecoveryAt: editor.expectedRecoveryAt,
            }
          : undefined,
      ),
      locale === "zh" ? "系统模式已更新" : "System mode updated",
    );
    if (changed) setEditor(null);
  }

  if (loading) return <AdminLoading locale={locale} />;
  if (error) return (
    <div className="admin-page-stack">
      <ErrorPanel error={error} locale={locale} />
      <div className="admin-form-actions"><button className="primary-button" type="button" onClick={() => void load()}>{adminCopy(locale, "retry")}</button></div>
    </div>
  );
  if (!projection) return <AdminLoadError locale={locale} message={adminCopy(locale, "load_error")} retry={() => void load()} />;

  const currentMeta = modeMeta[projection.mode];
  const modeChangeHistory = state?.auditLogs
    .filter((entry) => entry.action === "system_mode.change")
    .map((entry) => ({
      ...entry,
      before: isSystemMode(entry.metadata.before) ? entry.metadata.before : null,
      after: isSystemMode(entry.metadata.after) ? entry.metadata.after : null,
      reason: typeof entry.metadata.reason === "string" ? entry.metadata.reason : null,
      hasAnnouncement: typeof entry.metadata.announcementId === "string",
    })) ?? [];
  return (
    <div className="admin-page-stack admin-system-console">
      <section className={`admin-system-hero mode-${projection.mode.toLowerCase().replace("_", "-")}`}>
        <div className="admin-system-hero-copy">
          <span>{locale === "zh" ? "全局运行状态" : "Global operating status"}</span>
          <div className="admin-system-title-row">
            <h2>{locale === "zh" ? currentMeta.zh : currentMeta.en}</h2>
            <AdminBadge tone={projection.mode === "NORMAL" ? "green" : "red"}>{projection.mode}</AdminBadge>
          </div>
          <p>{locale === "zh" ? currentMeta.detailZh : currentMeta.detailEn}</p>
        </div>
        <div className="admin-system-meta">
          <span><small>{locale === "zh" ? "策略版本" : "Policy version"}</small><b>{projection.policyVersion}</b></span>
          <span><small>{locale === "zh" ? "更新时间" : "Updated"}</small><b>{formatAdminDate(locale, projection.updatedAt, true)}</b></span>
          <button className="secondary-button" type="button" onClick={() => void load()}>{locale === "zh" ? "刷新状态" : "Refresh"}</button>
        </div>
      </section>

      {mode === "real" && (
        <aside className="admin-readonly-banner">
          <span aria-hidden="true">API</span>
          <b>{locale === "zh" ? "当前服务端只提供系统模式查询。前端不会伪造切换成功；写接口开放后可直接接入下方同一业务流程。" : "The server currently provides system-mode reads only. The client never fabricates a successful switch."}</b>
        </aside>
      )}
      {storeError && <div className="admin-inline-error" role="alert">{storeError.message}</div>}

      <section className="admin-surface admin-mode-control">
        <div className="admin-mode-control-heading">
          <div><span>{locale === "zh" ? "模式控制" : "Mode control"}</span><h3>{locale === "zh" ? "选择目标运行状态" : "Choose the target state"}</h3><p>{locale === "zh" ? "每次切换都必须填写原因；进入维护模式还必须同时发布中英文公告和预计恢复时间。" : "Every change requires a reason. Maintenance mode also requires bilingual notices and an expected recovery time."}</p></div>
          {mode === "demo" && <small>{locale === "zh" ? "本地预览可操作" : "Interactive local preview"}</small>}
        </div>
        <div className="admin-mode-options" role="list">
          {modes.map((item) => {
            const meta = modeMeta[item];
            const current = item === projection.mode;
            return (
              <button type="button" role="listitem" className={current ? "is-current" : ""} disabled={mode !== "demo" || current} key={item} onClick={() => beginChange(item)}>
                <span className={`admin-mode-dot mode-${item.toLowerCase().replace("_", "-")}`} />
                <span><b>{locale === "zh" ? meta.zh : meta.en}</b><small>{locale === "zh" ? meta.detailZh : meta.detailEn}</small></span>
                <i aria-hidden="true">{current ? "✓" : "→"}</i>
              </button>
            );
          })}
        </div>
      </section>

      {mode === "demo" && state && (
        <section className="admin-surface admin-system-change-history">
          <header>
            <div><span>{locale === "zh" ? "历史变更" : "Change history"}</span><h3>{locale === "zh" ? "系统模式全部变更记录" : "All system-mode changes"}</h3></div>
            <small>{locale === "zh" ? `${modeChangeHistory.length} 条记录` : `${modeChangeHistory.length} records`}</small>
          </header>
          {modeChangeHistory.length > 0 ? (
            <ol>
              {modeChangeHistory.map((entry) => (
                <li key={entry.id}>
                  <div className="admin-system-history-summary">
                    <span>{locale === "zh" ? "变更原因" : "Reason"}</span>
                    <b>{entry.reason ?? (locale === "zh" ? "未提供原因" : "No reason provided")}</b>
                    <small>
                      {entry.before ? (locale === "zh" ? modeMeta[entry.before].zh : modeMeta[entry.before].en) : (locale === "zh" ? "未知状态" : "Unknown")}
                      {" → "}
                      {entry.after ? (locale === "zh" ? modeMeta[entry.after].zh : modeMeta[entry.after].en) : (locale === "zh" ? "未知状态" : "Unknown")}
                    </small>
                  </div>
                  <dl>
                    <div><dt>{locale === "zh" ? "操作人" : "Changed by"}</dt><dd>{entry.actorName}</dd></div>
                    <div><dt>{locale === "zh" ? "变更时间" : "Changed at"}</dt><dd>{formatAdminDate(locale, entry.createdAt, true)}</dd></div>
                    <div><dt>{locale === "zh" ? "维护公告" : "Maintenance notice"}</dt><dd>{entry.hasAnnouncement ? (locale === "zh" ? "已发布" : "Published") : (locale === "zh" ? "未发布" : "Not published")}</dd></div>
                  </dl>
                </li>
              ))}
            </ol>
          ) : <p className="admin-system-history-empty">{locale === "zh" ? "暂无系统模式变更记录。" : "No system-mode changes have been recorded."}</p>}
        </section>
      )}

      {editor && (
        <AdminDialog locale={locale} title={`${locale === "zh" ? "切换为" : "Change to"} ${locale === "zh" ? modeMeta[editor.target].zh : modeMeta[editor.target].en}`} close={() => setEditor(null)} dirty footer={<><button className="secondary-button" type="button" onClick={() => setEditor(null)}>{locale === "zh" ? "取消" : "Cancel"}</button><button className="primary-button" type="submit" form="system-mode-editor-form" disabled={Boolean(busyKey)}>{busyKey ? (locale === "zh" ? "切换中…" : "Changing…") : (locale === "zh" ? "确认切换" : "Confirm change")}</button></>}>
          <form id="system-mode-editor-form" className="admin-form-grid admin-system-change-form" onSubmit={submitChange}>
            <div className="admin-system-change-preview" aria-label={locale === "zh" ? "系统模式变更预览" : "System mode change preview"}>
              <span><small>{locale === "zh" ? "当前模式" : "Current mode"}</small><b>{locale === "zh" ? currentMeta.zh : currentMeta.en}</b></span>
              <i aria-hidden="true">→</i>
              <span><small>{locale === "zh" ? "目标模式" : "Target mode"}</small><b>{locale === "zh" ? modeMeta[editor.target].zh : modeMeta[editor.target].en}</b></span>
            </div>
            <AdminField locale={locale} label={locale === "zh" ? "变更原因" : "Reason"} required error={storeError?.fieldErrors.reason} className="admin-system-reason-field"><textarea value={editor.reason} placeholder={locale === "zh" ? "说明切换原因、影响范围和恢复条件" : "Explain the reason, impact, and recovery condition"} onChange={(event) => { setEditor({ ...editor, reason: event.target.value }); clearError(); }} /></AdminField>
            {editor.target === "MAINTENANCE" && <section className="admin-maintenance-editor">
              <header><h3>{locale === "zh" ? "维护公告" : "Maintenance notice"}</h3><p>{locale === "zh" ? "系统会同步发布以下中英文内容，并在预计恢复时间前保持维护状态。" : "The bilingual notice below will be published while maintenance remains active."}</p></header>
              <div className="admin-form-grid two-columns admin-maintenance-editor-fields">
                <AdminField locale={locale} label={locale === "zh" ? "中文公告标题" : "Chinese title"} required><input value={editor.titleZh} onChange={(event) => setEditor({ ...editor, titleZh: event.target.value })} /></AdminField>
                <AdminField locale={locale} label={locale === "zh" ? "英文公告标题" : "English title"} required><input value={editor.titleEn} onChange={(event) => setEditor({ ...editor, titleEn: event.target.value })} /></AdminField>
                <AdminField locale={locale} label={locale === "zh" ? "中文公告内容" : "Chinese message"} required><textarea value={editor.messageZh} onChange={(event) => setEditor({ ...editor, messageZh: event.target.value })} /></AdminField>
                <AdminField locale={locale} label={locale === "zh" ? "英文公告内容" : "English message"} required><textarea value={editor.messageEn} onChange={(event) => setEditor({ ...editor, messageEn: event.target.value })} /></AdminField>
                <AdminField locale={locale} label={locale === "zh" ? "预计恢复时间" : "Expected recovery"} required className="admin-maintenance-recovery-field"><input type="datetime-local" value={editor.expectedRecoveryAt} onChange={(event) => setEditor({ ...editor, expectedRecoveryAt: event.target.value })} /></AdminField>
              </div>
            </section>}
          </form>
        </AdminDialog>
      )}
    </div>
  );
}
