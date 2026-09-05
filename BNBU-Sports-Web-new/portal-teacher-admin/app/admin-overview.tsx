"use client";

import { adminCopy, adminLabel } from "./admin-i18n";
import { useAdminStore } from "./admin-store";
import type { AdminLocale, AdminRoute } from "./admin-types";
import type { WorkspaceMode } from "./portal-app";
import {
  AdminBadge,
  AdminSectionHeading,
  formatAdminDate,
} from "./admin-components";
import { AiOcrServiceDialog, LimitedReviewGrantDialog, LimitedReviewGrantListDialog, SportTemplatePublishDialog } from "./admin-v8-governance";
import { useState } from "react";

export function AdminOverview({
  locale,
  mode,
  onNavigate,
}: {
  locale: AdminLocale;
  mode: WorkspaceMode;
  onNavigate: (route: AdminRoute) => void;
}) {
  const { state, loading, refresh } = useAdminStore();
  const [publishingTemplate, setPublishingTemplate] = useState(false);
  const [grantingReview, setGrantingReview] = useState(false);
  const [listingGrants, setListingGrants] = useState(false);
  const [editingAiOcr, setEditingAiOcr] = useState(false);
  if (!state) return null;
  const current = state.semesters.find(
    (semester) => semester.status === "current",
  );
  const students = state.users.filter((user) => user.role === "student");
  const teachers = state.users.filter((user) => user.role === "teacher");
  const activeStudents = students.filter((user) => user.status === "ACTIVE").length;
  const studentsWithClass = students.filter((student) => Boolean(student.className)).length;
  const classCount = new Set(students.map((student) => student.className).filter(Boolean)).size;

  const healthRows = [
    {
      label: adminCopy(locale, "api_service"),
      status: state.health.apiStatus,
      value:
        state.health.apiLatencyMs === null
          ? adminCopy(locale, "not_available")
          : `${state.health.apiLatencyMs} ms`,
    },
    {
      label: adminCopy(locale, "database"),
      status: state.health.databaseStatus,
      value:
        state.health.databaseLatencyMs === null
          ? adminCopy(locale, "not_available")
          : `${state.health.databaseLatencyMs} ms`,
    },
    {
      label: adminCopy(locale, "notification_queue"),
      status: state.health.notificationQueueStatus,
      value:
        state.health.notificationQueueStatus === "UP"
          ? adminCopy(locale, "backlog", {
              count: state.health.notificationBacklog,
            })
          : adminCopy(locale, "not_available"),
    },
    {
      label: adminCopy(locale, "object_storage"),
      status: state.health.objectStorageStatus,
      value:
        state.health.objectStorageLatencyMs === null
          ? adminCopy(locale, "not_available")
          : `${state.health.objectStorageLatencyMs} ms`,
    },
    {
      label: adminCopy(locale, "media_storage"),
      status: state.health.mediaStorageStatus,
      value:
        state.health.mediaStorageLatencyMs === null
          ? adminCopy(locale, "not_available")
          : `${state.health.mediaStorageLatencyMs} ms`,
    },
  ];
  const healthTone = (status: "UP" | "DOWN" | "NOT_CONFIGURED") =>
    status === "UP"
      ? ("green" as const)
      : status === "DOWN"
        ? ("red" as const)
        : ("gray" as const);
  const healthLabel = (status: "UP" | "DOWN" | "NOT_CONFIGURED") =>
    status === "UP"
      ? adminCopy(locale, "normal")
      : status === "DOWN"
        ? adminCopy(locale, "health_down")
        : adminCopy(locale, "health_not_configured");

  const enduranceTableCount = 4;
  const enduranceBandsPerTable =
    state.enduranceRules.length > 0 && state.enduranceRules.length % enduranceTableCount === 0
      ? state.enduranceRules.length / enduranceTableCount
      : null;

  const governanceActions = (
    <div className="admin-governance-actions">
      <button className="secondary-button" type="button" onClick={() => setPublishingTemplate(true)}>
        {adminCopy(locale, "publish_sport_template")}
      </button>
      <button className="secondary-button" type="button" onClick={() => setGrantingReview(true)}>
        {adminCopy(locale, "limited_review_grant")}
      </button>
      <button className="secondary-button" type="button" onClick={() => setListingGrants(true)}>
        {adminCopy(locale, "grant_list")}
      </button>
      <button className="secondary-button" type="button" onClick={() => setEditingAiOcr(true)}>
        {adminCopy(locale, "ai_ocr_service")}
      </button>
    </div>
  );

  const governanceDialogs = (
    <>
      {publishingTemplate ? (
        <SportTemplatePublishDialog locale={locale} demo={mode === "demo"} close={() => setPublishingTemplate(false)} />
      ) : null}
      {grantingReview ? (
        <LimitedReviewGrantDialog locale={locale} demo={mode === "demo"} close={() => setGrantingReview(false)} />
      ) : null}
      {listingGrants ? (
        <LimitedReviewGrantListDialog locale={locale} demo={mode === "demo"} close={() => setListingGrants(false)} />
      ) : null}
      {editingAiOcr ? (
        <AiOcrServiceDialog locale={locale} demo={mode === "demo"} close={() => setEditingAiOcr(false)} />
      ) : null}
    </>
  );

  if (mode === "real") {
    return (
      <div className="admin-page-stack">
        <aside className="admin-readonly-banner">
          <span aria-hidden="true">API</span>
          <b>{adminCopy(locale, "api_data_notice")}</b>
        </aside>
        <section className="admin-surface">
          <AdminSectionHeading
            title={adminCopy(locale, "health")}
            description={`${adminCopy(locale, "health_hint", { time: formatAdminDate(locale, state.health.checkedAt, true) })} · requestId: ${state.health.requestId ?? adminCopy(locale, "not_available")}`}
            action={
              <button
                className="text-button"
                type="button"
                disabled={loading}
                onClick={() => void refresh()}
              >
                {loading
                  ? adminCopy(locale, "processing")
                  : adminCopy(locale, "refresh_health")}
              </button>
            }
          />
          <div className="admin-health-list">
            {healthRows.map((row) => (
              <div key={row.label}>
                <span className="status-dot" />
                <b>{row.label}</b>
                <small>{row.value}</small>
                <AdminBadge tone={healthTone(row.status)}>
                  {healthLabel(row.status)}
                </AdminBadge>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-surface">
          <p className="admin-quiet-empty">
            {locale === "zh"
              ? "真实模式可查看支持反馈与已发布帮助内容，并管理服务端总学时规则审批。运动模板、有限审核授权走 Contract；Backend 未实现时显示真实错误，不在本地假装已发布。"
              : "Real mode can read support feedback and published help content and manage approval of total-hours score rules. Sport templates and limited review grants use Contract; unimplemented Backend responses show the real error and are not faked locally."}
          </p>
          <div className="admin-subadmin-heading-actions" style={{ marginTop: 12 }}>
            {governanceActions}
          </div>
        </section>
        {governanceDialogs}
      </div>
    );
  }

  return (
    <div className="admin-page-stack admin-overview-page">
      <section
        className="admin-summary-grid"
        aria-label={adminCopy(locale, "overview_metrics")}
      >
        <button type="button" onClick={() => onNavigate("system")}>
          <span>{adminCopy(locale, "system_mode")}</span>
          <b>{adminLabel(locale, "systemMode", state.systemMode.mode)}</b>
          <small>
            {formatAdminDate(locale, state.systemMode.changedAt, true)}
          </small>
        </button>
        <button type="button" onClick={() => onNavigate("semesters")}>
          <span>{adminCopy(locale, "current_semester")}</span>
          <b>{current?.name ?? adminCopy(locale, "no_current_semester")}</b>
          <small>
            {current
              ? `${formatAdminDate(locale, current.startDate)} – ${formatAdminDate(locale, current.endDate)}`
              : adminCopy(locale, "not_available")}
          </small>
        </button>
      </section>

      <div className="admin-overview-layout">
        <section className="admin-surface admin-overview-insights">
          <AdminSectionHeading
            title={locale === "zh" ? "学生与班级数据" : "Student and class data"}
            description={locale === "zh" ? "根据当前管理空间内的学生、教师和行政班级资料实时汇总。" : "Calculated from the student, teacher, and administrative-class records in this workspace."}
          />
          <div className="admin-overview-insight-grid">
            <article><span>{locale === "zh" ? "学生总数" : "Students"}</span><b>{students.length}</b><small>{locale === "zh" ? `已进班 ${activeStudents} 人` : `${activeStudents} enrolled`}</small></article>
            <article><span>{locale === "zh" ? "行政班级" : "Classes"}</span><b>{classCount}</b><small>{locale === "zh" ? `${studentsWithClass} 人已有班级资料` : `${studentsWithClass} students assigned`}</small></article>
            <article><span>{locale === "zh" ? "教师总数" : "Teachers"}</span><b>{teachers.length}</b><small>{locale === "zh" ? "当前教师账号" : "Current teacher accounts"}</small></article>
          </div>
        </section>

        <section className="admin-surface admin-overview-health">
          <AdminSectionHeading
            title={adminCopy(locale, "health")}
            description={adminCopy(locale, "health_hint", {
              time: formatAdminDate(locale, state.health.checkedAt, true),
            })}
            action={
              <button
                className="text-button"
                type="button"
                disabled={loading}
                onClick={() => void refresh()}
              >
                {loading
                  ? adminCopy(locale, "processing")
                  : adminCopy(locale, "refresh_health")}
              </button>
            }
          />
          <div className="admin-health-list">
            {healthRows.map((row) => (
              <div key={row.label}>
                <span className="status-dot" />
                <b>{row.label}</b>
                <small>{row.value}</small>
                <AdminBadge tone={healthTone(row.status)}>
                  {healthLabel(row.status)}
                </AdminBadge>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-surface admin-overview-rules">
          <AdminSectionHeading
            title={adminCopy(locale, "endurance_table")}
            action={
              <button
                className="text-button"
                type="button"
                onClick={() => onNavigate("rules")}
              >
                {locale === "zh" ? "管理换算表" : "Manage conversion tables"} →
              </button>
            }
          />
          <div className="admin-rule-snapshot">
            <span>
              <small>{locale === "zh" ? "已配置规则" : "Configured rules"}</small>
              <b>
                {enduranceBandsPerTable !== null
                  ? locale === "zh"
                    ? `每套 ${enduranceBandsPerTable} 档`
                    : `${enduranceBandsPerTable} bands per table`
                  : locale === "zh"
                    ? `${state.enduranceRules.length} 条`
                    : `${state.enduranceRules.length} rules`}
              </b>
            </span>
            <span>
              <small>{locale === "zh" ? "适用分组" : "Applicable groups"}</small>
              <b>{locale === "zh" ? "4 套" : "4 groups"}</b>
            </span>
          </div>
        </section>
      </div>
      <section className="admin-surface">
        {governanceActions}
      </section>
      {governanceDialogs}
    </div>
  );
}
