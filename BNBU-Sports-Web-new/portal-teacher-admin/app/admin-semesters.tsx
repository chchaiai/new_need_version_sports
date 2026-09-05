"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AppSelect } from "./app-select";
import { adminCopy } from "./admin-i18n";
import { toUserFacingError, type UserFacingError } from "./api-client";
import {
  createSemester,
  getCurrentSemesterProjection,
  setCurrentSemester,
  updateSemester,
} from "./admin-service";
import type {
  AdminLocale,
  CurrentSemesterProjection,
  Semester,
  SemesterTerm,
} from "./admin-types";
import {
  AdminBadge,
  AdminDialog,
  AdminEmpty,
  AdminField,
  AdminLoadError,
  AdminLoading,
  AdminSectionHeading,
  formatAdminDate,
} from "./admin-components";
import { ErrorPanel } from "./error-panel";
import { useAdminStore } from "./admin-store";

type SemesterEditor = {
  id?: string;
  name: string;
  academicYear: string;
  term: SemesterTerm;
  startDate: string;
  endDate: string;
  expectedUpdatedAt?: string;
};

const emptyEditor = (): SemesterEditor => {
  const year = new Date().getFullYear();
  return {
    name: "",
    academicYear: `${year}-${year + 1}`,
    term: "first",
    startDate: "",
    endDate: "",
  };
};

export function AdminSemesters({ locale }: { locale: AdminLocale }) {
  const { mode, state, busyKey, error: storeError, clearError, run } = useAdminStore();
  const [projection, setProjection] = useState<CurrentSemesterProjection | null>(null);
  const [loading, setLoading] = useState(mode === "real");
  const [error, setError] = useState<UserFacingError | null>(null);
  const [editor, setEditor] = useState<SemesterEditor | null>(null);
  const [switchTarget, setSwitchTarget] = useState<Semester | null>(null);

  const load = useCallback(async () => {
    if (mode === "demo") return;
    setLoading(true);
    setError(null);
    try {
      setProjection(await getCurrentSemesterProjection());
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

  const current = useMemo(
    () => state?.semesters.find((semester) => semester.status === "current") ?? null,
    [state],
  );

  function beginCreate() {
    clearError();
    setEditor(emptyEditor());
  }

  function beginEdit(semester: Semester) {
    clearError();
    setEditor({
      id: semester.id,
      name: semester.name,
      academicYear: semester.academicYear,
      term: semester.term,
      startDate: semester.startDate,
      endDate: semester.endDate,
      expectedUpdatedAt: semester.updatedAt,
    });
  }

  async function saveSemester(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    const input = {
      name: editor.name,
      academicYear: editor.academicYear,
      term: editor.term,
      startDate: editor.startDate,
      endDate: editor.endDate,
    };
    const saved = editor.id
      ? await run(
          `semester:update:${editor.id}`,
          () => updateSemester({ ...input, id: editor.id!, expectedUpdatedAt: editor.expectedUpdatedAt! }),
          locale === "zh" ? "学期配置已更新" : "Semester configuration updated",
        )
      : await run(
          "semester:create",
          () => createSemester(input),
          locale === "zh" ? "新学期已创建" : "Semester created",
        );
    if (saved) setEditor(null);
  }

  async function confirmSwitch() {
    if (!switchTarget) return;
    const switched = await run(
      `semester:switch:${switchTarget.id}`,
      () => setCurrentSemester(switchTarget.id),
      locale === "zh" ? "当前学期已切换" : "Current semester changed",
    );
    if (switched) setSwitchTarget(null);
  }

  if (loading) return <AdminLoading locale={locale} />;
  if (error) return (
    <div className="admin-page-stack">
      <ErrorPanel error={error} locale={locale} />
      <div className="admin-form-actions">
        <button className="primary-button" type="button" onClick={() => void load()}>{adminCopy(locale, "retry")}</button>
      </div>
    </div>
  );

  if (mode === "real") {
    if (!projection) return <AdminLoadError locale={locale} message={adminCopy(locale, "no_current_semester")} retry={() => void load()} />;
    return (
      <div className="admin-page-stack admin-semester-management is-read-only">
        <section className="admin-management-hero admin-semester-hero">
          <div>
            <span>API · {locale === "zh" ? "当前学期" : "Current semester"}</span>
            <h2>{projection.displayName}</h2>
            <p>{locale === "zh" ? "正式登录当前从服务端读取学期事实；写操作需由服务端提供对应接口后才能提交。" : "The signed-in view reads the current semester from the server. Mutations require matching server operations."}</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => void load()}>{locale === "zh" ? "刷新数据" : "Refresh"}</button>
        </section>
        <section className="admin-surface admin-semester-current-details">
          <div className="admin-detail-list">
            <span><small>{locale === "zh" ? "学期名称" : "Semester name"}</small><b>{projection.displayName}</b></span>
            <span><small>{adminCopy(locale, "academic_year")}</small><b>{projection.academicYear}</b></span>
            <span><small>{adminCopy(locale, "term_code")}</small><code>{projection.termCode}</code></span>
            <span><small>{adminCopy(locale, "date_range")}</small><b>{formatAdminDate(locale, projection.startDate)} – {formatAdminDate(locale, projection.endDate)}</b></span>
            <span><small>{adminCopy(locale, "status")}</small><AdminBadge tone="green">{projection.status}</AdminBadge></span>
            <span><small>{adminCopy(locale, "updated_at")}</small><b>{formatAdminDate(locale, projection.updatedAt, true)}</b></span>
          </div>
        </section>
      </div>
    );
  }

  if (!state) return <AdminLoadError locale={locale} message={adminCopy(locale, "load_error")} retry={() => undefined} />;

  return (
    <div className="admin-page-stack admin-semester-management">
      <section className="admin-management-hero admin-semester-hero">
        <div>
          <span>{locale === "zh" ? "学期生命周期" : "Semester lifecycle"}</span>
          <div className="admin-semester-title-row"><h2>{current?.name ?? (locale === "zh" ? "尚未设置当前学期" : "No current semester")}</h2>{current && <AdminBadge tone="green">{locale === "zh" ? "当前" : "Current"}</AdminBadge>}</div>
          <p>{locale === "zh" ? "管理员创建和配置即将开始的学期，并在确认后切换当前学期；旧学期会自动归档。" : "Create and configure upcoming semesters, then switch the current semester after confirmation. The previous semester is archived automatically."}</p>
        </div>
        <button className="primary-button" type="button" onClick={beginCreate}>{locale === "zh" ? "新增学期" : "New semester"}</button>
      </section>

      <section className="admin-semester-summary" aria-label={locale === "zh" ? "学期概况" : "Semester summary"}>
        <article><span>{locale === "zh" ? "当前学期" : "Current"}</span><b>{current?.name ?? "—"}</b><small>{current ? `${formatAdminDate(locale, current.startDate)} – ${formatAdminDate(locale, current.endDate)}` : "—"}</small></article>
        <article><span>{locale === "zh" ? "即将开始" : "Upcoming"}</span><b>{state.semesters.filter((item) => item.status === "upcoming").length}</b><small>{locale === "zh" ? "可继续编辑配置" : "Editable configurations"}</small></article>
        <article><span>{locale === "zh" ? "已归档" : "Archived"}</span><b>{state.semesters.filter((item) => item.status === "archived").length}</b><small>{locale === "zh" ? "永久保留历史" : "History retained"}</small></article>
      </section>

      {storeError && <div className="admin-inline-error" role="alert">{storeError.message}</div>}

      <section className="admin-surface admin-table-surface admin-semester-list-surface">
        <AdminSectionHeading title={locale === "zh" ? "全部学期" : "All semesters"} description={locale === "zh" ? "现有学期创建与切换保持。已归档学期不可恢复或删除；不新开放无接口能力。" : "Existing semester create and switch stay. Archived semesters cannot be restored or deleted; capabilities without an API are not opened."} />
        {state.semesters.length === 0 ? <AdminEmpty locale={locale} /> : (
          <>
            <div className="table-wrap admin-semester-table-wrap"><table className="admin-table admin-semester-table"><thead><tr><th>{locale === "zh" ? "学期" : "Semester"}</th><th>{adminCopy(locale, "academic_year")}</th><th>{adminCopy(locale, "date_range")}</th><th>{locale === "zh" ? "课程 / 学生" : "Courses / students"}</th><th>{adminCopy(locale, "status")}</th><th>{locale === "zh" ? "操作" : "Actions"}</th></tr></thead><tbody>{state.semesters.map((item) => (
              <tr key={item.id}>
                <td><b>{item.name}</b><small className="table-sub">{item.term.toUpperCase()}</small></td>
                <td>{item.academicYear}</td>
                <td>{formatAdminDate(locale, item.startDate)} – {formatAdminDate(locale, item.endDate)}</td>
                <td>{item.courseCount} / {item.studentCount}</td>
                <td><AdminBadge tone={item.status === "current" ? "green" : item.status === "upcoming" ? "orange" : "gray"}>{item.status.toUpperCase()}</AdminBadge></td>
                <td>{item.status === "upcoming" ? <div className="admin-row-actions"><button className="text-button" type="button" onClick={() => beginEdit(item)}>{locale === "zh" ? "编辑配置" : "Edit"}</button><button className="text-button" type="button" onClick={() => setSwitchTarget(item)}>{locale === "zh" ? "设为当前学期" : "Make current"}</button></div> : <span className="admin-muted-text">{locale === "zh" ? "只读" : "Read-only"}</span>}</td>
              </tr>
            ))}</tbody></table></div>
            <div className="admin-semester-mobile-list">{state.semesters.map((item) => (
              <article key={item.id}>
                <header><div><h3>{item.name}</h3><p>{item.academicYear} · {item.term.toUpperCase()}</p></div><AdminBadge tone={item.status === "current" ? "green" : item.status === "upcoming" ? "orange" : "gray"}>{item.status.toUpperCase()}</AdminBadge></header>
                <dl><div><dt>{adminCopy(locale, "date_range")}</dt><dd>{formatAdminDate(locale, item.startDate)} – {formatAdminDate(locale, item.endDate)}</dd></div><div><dt>{locale === "zh" ? "课程 / 学生" : "Courses / students"}</dt><dd>{item.courseCount} / {item.studentCount}</dd></div></dl>
                <footer>{item.status === "upcoming" ? <div className="admin-row-actions"><button className="text-button" type="button" onClick={() => beginEdit(item)}>{locale === "zh" ? "编辑配置" : "Edit"}</button><button className="text-button" type="button" onClick={() => setSwitchTarget(item)}>{locale === "zh" ? "设为当前学期" : "Make current"}</button></div> : <span className="admin-muted-text">{locale === "zh" ? "只读" : "Read-only"}</span>}</footer>
              </article>
            ))}</div>
          </>
        )}
      </section>

      {editor && (
        <AdminDialog locale={locale} title={editor.id ? (locale === "zh" ? "编辑学期配置" : "Edit semester") : (locale === "zh" ? "新增学期" : "New semester")} close={() => setEditor(null)} dirty footer={<><button className="secondary-button" type="button" onClick={() => setEditor(null)}>{locale === "zh" ? "取消" : "Cancel"}</button><button className="primary-button" type="submit" form="semester-editor-form" disabled={Boolean(busyKey)}>{busyKey ? (locale === "zh" ? "保存中…" : "Saving…") : (locale === "zh" ? "保存学期" : "Save semester")}</button></>}>
          <form id="semester-editor-form" className="admin-form-grid two-columns admin-semester-editor-form" onSubmit={saveSemester}>
            <AdminField className="admin-semester-name-field" locale={locale} label={locale === "zh" ? "显示名称" : "Display name"} required error={storeError?.fieldErrors.name}><input value={editor.name} onChange={(event) => { setEditor({ ...editor, name: event.target.value }); clearError(); }} /></AdminField>
            <AdminField className="admin-semester-year-field" locale={locale} label={locale === "zh" ? "学年" : "Academic year"} required error={storeError?.fieldErrors.academicYear}><input value={editor.academicYear} placeholder="2026-2027" onChange={(event) => { setEditor({ ...editor, academicYear: event.target.value }); clearError(); }} /></AdminField>
            <AdminField className="admin-semester-term-field" locale={locale} label={locale === "zh" ? "学期" : "Term"} required><AppSelect label={locale === "zh" ? "学期" : "Term"} value={editor.term} options={[{ value: "first", label: locale === "zh" ? "第一学期" : "First semester" }, { value: "second", label: locale === "zh" ? "第二学期" : "Second semester" }, { value: "summer", label: locale === "zh" ? "暑期学期" : "Summer" }]} onChange={(value) => value && setEditor({ ...editor, term: String(value) as SemesterTerm })} /></AdminField>
            <AdminField className="admin-semester-start-field" locale={locale} label={locale === "zh" ? "开始日期" : "Start date"} required error={storeError?.fieldErrors.startDate}><input type="date" value={editor.startDate} onChange={(event) => { setEditor({ ...editor, startDate: event.target.value }); clearError(); }} /></AdminField>
            <AdminField className="admin-semester-end-field" locale={locale} label={locale === "zh" ? "结束日期" : "End date"} required error={storeError?.fieldErrors.endDate}><input type="date" value={editor.endDate} onChange={(event) => { setEditor({ ...editor, endDate: event.target.value }); clearError(); }} /></AdminField>
          </form>
        </AdminDialog>
      )}

      {switchTarget && (
        <AdminDialog locale={locale} title={locale === "zh" ? "确认切换当前学期" : "Confirm semester switch"} close={() => setSwitchTarget(null)} footer={<><button className="secondary-button" type="button" onClick={() => setSwitchTarget(null)}>{locale === "zh" ? "取消" : "Cancel"}</button><button className="primary-button" type="button" disabled={Boolean(busyKey)} onClick={() => void confirmSwitch()}>{locale === "zh" ? "确认切换" : "Confirm switch"}</button></>}>
          <div className="admin-confirm-card">
            <p>{locale === "zh" ? "切换成功后，原当前学期会自动归档，新学期成为全系统唯一当前学期。" : "After switching, the previous current semester is archived and the new semester becomes the only current semester."}</p>
            <div className="admin-switch-preview"><span><small>{locale === "zh" ? "原当前学期" : "Previous"}</small><b>{current?.name ?? "—"}</b></span><i aria-hidden="true">→</i><span><small>{locale === "zh" ? "新当前学期" : "New current"}</small><b>{switchTarget.name}</b></span></div>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
