"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppSelect } from "./app-select";
import { pageItems } from "./admin-domain";
import { adminCopy, adminErrorCopy } from "./admin-i18n";
import { toUserFacingError, type UserFacingError } from "./api-client";
import { deleteTeacherUser, getStudentProfile, importUsers, listAssociatedTeacherProfiles, listStudentProfiles, previewUserImport } from "./admin-service";
import { AdminServiceError, type AdminLocale, type AdminUser, type StudentProfileProjection, type TeacherProfileProjection } from "./admin-types";
import { AdminBadge, AdminDialog, AdminDrawer, AdminEmpty, AdminField, AdminLoading, AdminPagination, AdminSectionHeading, formatAdminDate } from "./admin-components";
import { ErrorPanel } from "./error-panel";
import { useAdminStore } from "./admin-store";

const demoOrganizationId = "org-bnbu-demo";
const teacherCsvTemplate = "employee_id,name,email,college\nT2026001,教师姓名,teacher@bnbu.edu.cn,体育部";

function demoStudent(user: AdminUser): StudentProfileProjection {
  return {
    id: user.id,
    organizationId: demoOrganizationId,
    userId: user.id,
    studentNumber: user.account,
    fullName: user.name,
    gender: user.gender?.toUpperCase() ?? "UNKNOWN",
    gradeYear: user.admissionYear ?? 0,
    collegeName: user.college,
    majorName: null,
    administrativeClassName: user.className ?? null,
    status: user.status === "ACTIVE" ? "ACTIVE" : "PENDING",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: null,
    version: user.tokenVersion + 1,
  };
}

function demoTeacher(user: AdminUser): TeacherProfileProjection {
  return {
    id: user.id,
    organizationId: demoOrganizationId,
    userId: user.id,
    employeeNumber: user.account,
    fullName: user.name,
    collegeName: user.college,
    departmentName: user.college,
    title: "体育教师",
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: null,
    version: user.tokenVersion + 1,
  };
}

export function AdminUsers({ locale }: { locale: AdminLocale }) {
  const { mode, state, busyKey, error: mutationError, clearError, run } = useAdminStore();
  const [students, setStudents] = useState<StudentProfileProjection[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfileProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [view, setView] = useState<"students" | "teacher">("students");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [college, setCollege] = useState("all");
  const [page, setPage] = useState(1);
  const [studentDetail, setStudentDetail] = useState<StudentProfileProjection | null>(null);
  const [teacherDetail, setTeacherDetail] = useState<TeacherProfileProjection | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState(teacherCsvTemplate);
  const [initialPassword, setInitialPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [importPreview, setImportPreview] = useState<ReturnType<typeof previewUserImport>>([]);
  const [importIssue, setImportIssue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ teacher: TeacherProfileProjection; assignedCourseCount: number } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "demo") {
        setStudents((state?.users ?? []).filter((user) => user.role === "student").map(demoStudent).sort((left, right) => left.studentNumber.localeCompare(right.studentNumber)));
        setTeachers((state?.users ?? []).filter((user) => user.role === "teacher").map(demoTeacher).sort((left, right) => left.employeeNumber.localeCompare(right.employeeNumber)));
        return;
      }
      const [loadedStudents, loadedTeachers] = await Promise.all([
        listStudentProfiles(),
        listAssociatedTeacherProfiles(),
      ]);
      setStudents([...loadedStudents].sort((left, right) => left.studentNumber.localeCompare(right.studentNumber)));
      setTeachers(loadedTeachers);
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

  const statuses = useMemo(() => [...new Set(students.map((student) => student.status))].sort(), [students]);
  const colleges = useMemo(() => [...new Set(students.map((student) => student.collegeName).filter((value): value is string => Boolean(value)))].sort(), [students]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return students.filter((student) => {
      if (status !== "all" && student.status !== status) return false;
      if (college !== "all" && student.collegeName !== college) return false;
      return !normalized || [student.studentNumber, student.fullName, student.collegeName, student.majorName, student.administrativeClassName]
        .filter(Boolean).join(" ").toLocaleLowerCase().includes(normalized);
    });
  }, [college, query, status, students]);
  const paged = pageItems(filtered, page, 10);
  const studentTitle = locale === "zh" ? "学生账户" : "Student accounts";
  const teacherTitle = locale === "zh" ? "教师账户" : "Teacher accounts";
  const studentDescription = locale === "zh"
    ? "仅查看学生资料与当前状态：ACTIVE 表示已进班，PENDING 表示已绑定邮箱但已退班。"
    : "View student profiles and current status only: ACTIVE means enrolled; PENDING means email-bound but withdrawn.";
  const teacherDescription = locale === "zh"
    ? "批量建立教师账号；无课程职责的教师账号可以删除。"
    : "Create teacher accounts in batches. Accounts without course responsibilities can be deleted.";

  async function openStudent(id: string) {
    setError(null);
    try {
      if (mode === "demo") {
        setStudentDetail(students.find((student) => student.id === id) ?? null);
        return;
      }
      setStudentDetail(await getStudentProfile(id));
    } catch (failure) {
      setError(toUserFacingError(failure, locale));
    }
  }

  function openTeacherImport() {
    clearError();
    setImportIssue("");
    setImportPreview([]);
    setCsvText(teacherCsvTemplate);
    setInitialPassword("");
    setShowPassword(false);
    setImportOpen(true);
  }

  async function readTeacherCsv(file: File | null) {
    if (!file) return;
    setImportIssue("");
    setImportPreview([]);
    setCsvText(await file.text());
  }

  function buildTeacherPreview() {
    clearError();
    setImportIssue("");
    try {
      setImportPreview(previewUserImport(csvText, "teacher", state?.users ?? [], initialPassword));
    } catch (failure) {
      setImportPreview([]);
      setImportIssue(failure instanceof AdminServiceError
        ? adminErrorCopy(locale, failure.message)
        : (locale === "zh" ? "无法读取导入内容，请检查 CSV 格式。" : "The import could not be read. Check the CSV format."));
    }
  }

  async function confirmTeacherImport() {
    if (mode !== "demo") return;
    const imported = await run(
      "teacher-import",
      () => importUsers(csvText, "teacher", initialPassword),
      locale === "zh" ? "教师账号已批量建立" : "Teacher accounts created",
    );
    if (!imported) return;
    setImportOpen(false);
    setImportPreview([]);
    setInitialPassword("");
  }

  function beginTeacherDelete(teacher: TeacherProfileProjection) {
    clearError();
    setDeleteReason("");
    setDeleteConfirmation("");
    setDeleteTarget({
      teacher,
      assignedCourseCount: state?.users.find((user) => user.id === teacher.userId && user.role === "teacher")?.assignedCourseCount ?? 0,
    });
  }

  async function confirmTeacherDelete() {
    if (mode !== "demo" || !deleteTarget) return;
    const existing = state?.users.find((user) => user.id === deleteTarget.teacher.userId && user.role === "teacher");
    if (!existing) return;
    const deleted = await run(
      `teacher-delete-${existing.id}`,
      () => deleteTeacherUser(existing.id, deleteConfirmation, deleteReason),
      locale === "zh" ? "教师账号已删除" : "Teacher account deleted",
    );
    if (!deleted) return;
    setTeacherDetail(null);
    setDeleteTarget(null);
    setDeleteReason("");
    setDeleteConfirmation("");
  }

  if (loading) return <AdminLoading locale={locale} />;
  if (error && students.length === 0) return (
    <div className="admin-page-stack">
      <ErrorPanel error={error} locale={locale} />
      <div className="admin-form-actions">
        <button className="primary-button" type="button" onClick={() => void load()}>{adminCopy(locale, "retry")}</button>
      </div>
    </div>
  );

  return (
    <div className="admin-page-stack admin-users-page">
      <ErrorPanel error={error} locale={locale} />
      <nav className="admin-profile-switcher" aria-label={locale === "zh" ? "账户类型" : "Account type"}>
        <button type="button" className={view === "students" ? "is-active" : ""} aria-pressed={view === "students"} onClick={() => { setView("students"); setPage(1); }}>
          <span>{studentTitle}</span><small>{students.length}</small>
        </button>
        <button type="button" className={view === "teacher" ? "is-active" : ""} aria-pressed={view === "teacher"} onClick={() => { setView("teacher"); setPage(1); }}>
          <span>{teacherTitle}</span><small>{teachers.length}</small>
        </button>
      </nav>

      {view === "students" ? (
        <section className="admin-surface admin-table-surface">
          <AdminSectionHeading title={studentTitle} description={studentDescription} action={<button className="text-button" type="button" onClick={() => void load()}>{adminCopy(locale, "refresh_data")}</button>} />
          <div className="admin-audit-filters">
            <AdminField locale={locale} label={adminCopy(locale, "search")}><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={adminCopy(locale, "account_search")} /></AdminField>
            <AppSelect label={adminCopy(locale, "status_filter")} value={status} options={[{ value: "all", label: adminCopy(locale, "all") }, ...statuses.map((value) => ({ value, label: value }))]} onChange={(value) => { if (value) { setStatus(String(value)); setPage(1); } }} />
            <AppSelect label={adminCopy(locale, "college")} value={college} searchable options={[{ value: "all", label: adminCopy(locale, "all") }, ...colleges.map((value) => ({ value, label: value }))]} onChange={(value) => { if (value) { setCollege(String(value)); setPage(1); } }} />
          </div>
          {paged.items.length === 0 ? <AdminEmpty locale={locale} filtered={Boolean(query || status !== "all" || college !== "all")} /> : <div className="table-wrap"><table className="admin-table"><thead><tr><th>{adminCopy(locale, "student_number")}</th><th>{adminCopy(locale, "name")}</th><th>{adminCopy(locale, "college")}</th><th>{adminCopy(locale, "class_name")}</th><th>{adminCopy(locale, "status")}</th><th>{adminCopy(locale, "details")}</th></tr></thead><tbody>{paged.items.map((student) => <tr key={student.id}><td><code>{student.studentNumber}</code></td><td><b>{student.fullName}</b><small className="table-sub">{student.majorName ?? adminCopy(locale, "not_available")}</small></td><td>{student.collegeName ?? adminCopy(locale, "not_available")}</td><td>{student.administrativeClassName ?? adminCopy(locale, "not_available")}</td><td><AdminBadge tone={student.status === "ACTIVE" ? "green" : "gray"}>{student.status}</AdminBadge><small className="table-sub">{student.status === "ACTIVE" ? (locale === "zh" ? "已进班" : "Enrolled") : (locale === "zh" ? "已退班" : "Withdrawn")}</small></td><td><button className="text-button" type="button" onClick={() => void openStudent(student.id)}>{adminCopy(locale, "details")} →</button></td></tr>)}</tbody></table></div>}
          <AdminPagination locale={locale} page={paged.page} totalPages={paged.totalPages} total={paged.total} onPage={setPage} />
        </section>
      ) : (
        <section className="admin-surface admin-table-surface">
          <AdminSectionHeading
            title={teacherTitle}
            description={teacherDescription}
            action={<div className="admin-heading-actions"><button className="text-button" type="button" onClick={() => void load()}>{adminCopy(locale, "refresh_data")}</button><button className="primary-button" type="button" disabled={mode !== "demo"} onClick={openTeacherImport}>{locale === "zh" ? "批量建立教师" : "Create teachers"}</button></div>}
          />
          {mode !== "demo" && <aside className="admin-readonly-banner admin-teacher-api-note" role="note">{locale === "zh" ? "当前正式 API 仅提供教师资料查询，批量建立与账号删除尚未开放。" : "The formal API currently supports teacher profile queries only. Batch creation and account deletion are not yet available."}</aside>}
          {teachers.length === 0 ? <AdminEmpty locale={locale} /> : <div className="table-wrap"><table className="admin-table"><thead><tr><th>{adminCopy(locale, "employee_number")}</th><th>{adminCopy(locale, "name")}</th><th>{adminCopy(locale, "college")}</th><th>{adminCopy(locale, "department")}</th><th>{adminCopy(locale, "status")}</th><th>{locale === "zh" ? "账号管理" : "Account management"}</th></tr></thead><tbody>{teachers.map((teacher) => <tr key={teacher.id}><td><code>{teacher.employeeNumber}</code></td><td><b>{teacher.fullName}</b><small className="table-sub">{teacher.title ?? adminCopy(locale, "not_available")}</small></td><td>{teacher.collegeName ?? adminCopy(locale, "not_available")}</td><td>{teacher.departmentName ?? adminCopy(locale, "not_available")}</td><td><AdminBadge tone={teacher.status === "ACTIVE" ? "green" : "gray"}>{teacher.status}</AdminBadge></td><td><button className="text-button" type="button" onClick={() => setTeacherDetail(teacher)}>{locale === "zh" ? "管理账号" : "Manage"} →</button></td></tr>)}</tbody></table></div>}
        </section>
      )}

      {studentDetail && <StudentDrawer locale={locale} student={studentDetail} close={() => setStudentDetail(null)} />}
      {teacherDetail && <TeacherDrawer locale={locale} teacher={teacherDetail} mode={mode} assignedCourseCount={state?.users.find((user) => user.id === teacherDetail.userId && user.role === "teacher")?.assignedCourseCount ?? 0} close={() => setTeacherDetail(null)} onDelete={() => beginTeacherDelete(teacherDetail)} />}

      {importOpen && (
        <AdminDialog
          locale={locale}
          title={locale === "zh" ? "批量建立教师账号" : "Create teacher accounts"}
          description={locale === "zh" ? "导入教师资料，并为本批账号设置统一初始密码。" : "Import teacher profiles and set one initial password for this batch."}
          close={() => { setImportOpen(false); clearError(); }}
          dirty={Boolean(initialPassword || csvText !== teacherCsvTemplate)}
          wide
          footer={<><button className="secondary-button" type="button" onClick={() => { setImportOpen(false); clearError(); }}>{adminCopy(locale, "cancel")}</button><button className="secondary-button" type="button" onClick={buildTeacherPreview}>{locale === "zh" ? "校验导入内容" : "Validate import"}</button><button className="primary-button" type="button" disabled={mode !== "demo" || Boolean(busyKey) || importPreview.length === 0 || importPreview.some((row) => row.errors.length > 0)} onClick={() => void confirmTeacherImport()}>{busyKey === "teacher-import" ? (locale === "zh" ? "建立中…" : "Creating…") : (locale === "zh" ? `确认建立 ${importPreview.length} 个账号` : `Create ${importPreview.length} accounts`)}</button></>}
        >
          <div className="admin-teacher-import">
            <aside className="admin-info-banner" role="note">{locale === "zh" ? "学生账户不通过此入口创建。教师首次登录后必须修改初始密码；系统不会在账号建立后展示密码。" : "Student accounts are not created here. Teachers must change the initial password at first sign-in, and the password is not shown after creation."}</aside>
            <div className="admin-form-grid two-columns">
              <AdminField locale={locale} label={locale === "zh" ? "教师 CSV 文件" : "Teacher CSV file"} hint={locale === "zh" ? "UTF-8 CSV；必填列：employee_id、name、email" : "UTF-8 CSV; required: employee_id, name, email"}>
                <input type="file" accept=".csv,text/csv" onChange={(event) => void readTeacherCsv(event.target.files?.[0] ?? null)} />
              </AdminField>
              <AdminField locale={locale} label={locale === "zh" ? "统一初始密码" : "Shared initial password"} required errorCode={mutationError?.fieldErrors.initialPassword} hint={locale === "zh" ? "至少 8 位，并包含大写、小写字母和数字" : "At least 8 characters with uppercase, lowercase, and a number"}>
                <input type={showPassword ? "text" : "password"} value={initialPassword} autoComplete="new-password" onChange={(event) => { setInitialPassword(event.target.value); setImportPreview([]); clearError(); }} />
              </AdminField>
            </div>
            <label className="admin-password-toggle"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />{locale === "zh" ? "显示初始密码" : "Show initial password"}</label>
            <AdminField locale={locale} label={locale === "zh" ? "CSV 内容" : "CSV content"} required hint={locale === "zh" ? "可直接粘贴多位教师；college 为可选列。" : "Paste multiple teachers directly; college is optional."}>
              <textarea className="admin-teacher-csv" value={csvText} spellCheck={false} onChange={(event) => { setCsvText(event.target.value); setImportPreview([]); setImportIssue(""); clearError(); }} />
            </AdminField>
            <div className="admin-import-tools"><a className="text-button" download="bnbu-teacher-import-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(teacherCsvTemplate)}`}>{locale === "zh" ? "下载 CSV 模板" : "Download CSV template"}</a><span>{locale === "zh" ? "初始密码不会写入下载文件。" : "The initial password is never written to the download."}</span></div>
            {(importIssue || mutationError) && <p className="admin-inline-error" role="alert">{importIssue || adminErrorCopy(locale, mutationError?.message ?? "FORM_INVALID")}</p>}
            {importPreview.length > 0 && <div className="admin-import-preview"><div><b>{locale === "zh" ? "校验结果" : "Validation result"}</b><span><AdminBadge tone={importPreview.some((row) => row.errors.length > 0) ? "red" : "green"}>{importPreview.filter((row) => row.errors.length === 0).length} / {importPreview.length}</AdminBadge></span></div><div className="table-wrap"><table className="admin-table admin-import-preview-table"><thead><tr><th>{locale === "zh" ? "行" : "Line"}</th><th>{adminCopy(locale, "employee_number")}</th><th>{adminCopy(locale, "name")}</th><th>{locale === "zh" ? "邮箱" : "Email"}</th><th>{adminCopy(locale, "status")}</th></tr></thead><tbody>{importPreview.map((row) => <tr key={`${row.line}-${row.input.account}`}><td>{row.line}</td><td><code>{row.input.account || "—"}</code></td><td>{row.input.name || "—"}</td><td>{row.input.email || "—"}</td><td>{row.errors.length === 0 ? <AdminBadge tone="green">{locale === "zh" ? "可建立" : "Ready"}</AdminBadge> : <span className="admin-row-error">{row.errors.map((code) => adminErrorCopy(locale, code)).join("；")}</span>}</td></tr>)}</tbody></table></div></div>}
          </div>
        </AdminDialog>
      )}

      {deleteTarget && (
        <AdminDialog
          locale={locale}
          title={locale === "zh" ? "删除教师账号" : "Delete teacher account"}
          description={`${deleteTarget.teacher.fullName} · ${deleteTarget.teacher.employeeNumber}`}
          close={() => { setDeleteTarget(null); setDeleteReason(""); setDeleteConfirmation(""); clearError(); }}
          dirty={Boolean(deleteReason || deleteConfirmation)}
          footer={<><button className="secondary-button" type="button" onClick={() => { setDeleteTarget(null); setDeleteReason(""); setDeleteConfirmation(""); clearError(); }}>{adminCopy(locale, "cancel")}</button><button className="danger-button" type="button" disabled={mode !== "demo" || Boolean(busyKey) || deleteTarget.assignedCourseCount > 0 || !deleteReason.trim() || deleteConfirmation.trim() !== deleteTarget.teacher.employeeNumber} onClick={() => void confirmTeacherDelete()}>{busyKey?.startsWith("teacher-delete-") ? (locale === "zh" ? "删除中…" : "Deleting…") : (locale === "zh" ? "确认删除账号" : "Delete account")}</button></>}
        >
          <div className="admin-teacher-delete-form">
            {deleteTarget.assignedCourseCount > 0 ? <aside className="admin-cascade-warning" role="alert"><b>{locale === "zh" ? `该教师仍负责 ${deleteTarget.assignedCourseCount} 门课程，必须先完成课程交接，当前不能删除。` : `This teacher still owns ${deleteTarget.assignedCourseCount} classes. Complete the handover before deletion.`}</b></aside> : <aside className="admin-cascade-warning" role="note"><b>{locale === "zh" ? "删除后教师不能登录，账号不会出现在教师列表中。课程、学生关系、打卡、审核和审计历史继续保留。" : "After deletion, the teacher cannot sign in and the account leaves the teacher list. Courses, enrollments, check-ins, reviews, and audit history remain."}</b></aside>}
            <AdminField locale={locale} label={locale === "zh" ? "删除原因" : "Deletion reason"} required errorCode={mutationError?.fieldErrors.reason}><textarea value={deleteReason} placeholder={locale === "zh" ? "说明删除教师账号的原因" : "Explain why this teacher account is being deleted"} onChange={(event) => { setDeleteReason(event.target.value); clearError(); }} /></AdminField>
            <AdminField locale={locale} label={locale === "zh" ? `输入工号 ${deleteTarget.teacher.employeeNumber} 确认` : `Enter ${deleteTarget.teacher.employeeNumber} to confirm`} required errorCode={mutationError?.fieldErrors.confirmationAccount}><input value={deleteConfirmation} autoComplete="off" onChange={(event) => { setDeleteConfirmation(event.target.value); clearError(); }} /></AdminField>
            {mutationError && <p className="admin-inline-error" role="alert">{adminErrorCopy(locale, mutationError.message)}</p>}
          </div>
        </AdminDialog>
      )}
    </div>
  );
}

function StudentDrawer({ locale, student, close }: { locale: AdminLocale; student: StudentProfileProjection; close: () => void }) {
  return (
    <AdminDrawer locale={locale} title={student.fullName} description={student.studentNumber} close={close}>
      <div className="admin-detail-list">
        <Detail label={adminCopy(locale, "user_id")} value={student.userId} />
        <Detail label={adminCopy(locale, "organization")} value={student.organizationId} />
        <Detail label={adminCopy(locale, "gender")} value={student.gender} />
        <Detail label={adminCopy(locale, "grade_year")} value={student.gradeYear} />
        <Detail label={adminCopy(locale, "college")} value={student.collegeName} />
        <Detail label={adminCopy(locale, "major")} value={student.majorName} />
        <Detail label={adminCopy(locale, "class_name")} value={student.administrativeClassName} />
        <Detail label={adminCopy(locale, "status")} value={`${student.status} · ${student.status === "ACTIVE" ? (locale === "zh" ? "已进班" : "Enrolled") : (locale === "zh" ? "已绑定邮箱但已退班" : "Email-bound but withdrawn")}`} />
        <Detail label={adminCopy(locale, "updated_at")} value={formatAdminDate(locale, student.updatedAt, true)} />
        <Detail label={adminCopy(locale, "record_version")} value={student.version} />
      </div>
    </AdminDrawer>
  );
}

function TeacherDrawer({ locale, teacher, mode, assignedCourseCount, close, onDelete }: { locale: AdminLocale; teacher: TeacherProfileProjection; mode: "demo" | "real"; assignedCourseCount: number; close: () => void; onDelete: () => void }) {
  const deletionBlocked = assignedCourseCount > 0;
  return <AdminDrawer locale={locale} title={teacher.fullName} description={teacher.employeeNumber} close={close} footer={<div className="admin-drawer-actions admin-teacher-drawer-actions"><span>{mode !== "demo" ? (locale === "zh" ? "正式 API 尚未开放账号删除。" : "Account deletion is not available in the formal API.") : deletionBlocked ? (locale === "zh" ? `仍负责 ${assignedCourseCount} 门课程，完成交接后才可删除。` : `Still owns ${assignedCourseCount} classes. Complete handover before deletion.`) : (locale === "zh" ? "删除登录账号，但保留全部课程和业务历史。" : "Delete the sign-in account while preserving course and business history.")}</span><button className="danger-button" type="button" disabled={mode !== "demo" || deletionBlocked} onClick={onDelete}>{locale === "zh" ? "删除教师账号" : "Delete account"}</button></div>}>
    <div className="admin-detail-list">
      <Detail label={adminCopy(locale, "user_id")} value={teacher.userId} />
      <Detail label={adminCopy(locale, "organization")} value={teacher.organizationId} />
      <Detail label={adminCopy(locale, "college")} value={teacher.collegeName} />
      <Detail label={adminCopy(locale, "department")} value={teacher.departmentName} />
      <Detail label={adminCopy(locale, "job_title")} value={teacher.title} />
      <Detail label={adminCopy(locale, "status")} value={teacher.status} />
      <Detail label={adminCopy(locale, "updated_at")} value={formatAdminDate(locale, teacher.updatedAt, true)} />
      <Detail label={adminCopy(locale, "record_version")} value={teacher.version} />
    </div>
  </AdminDrawer>;
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <span><small>{label}</small><b>{value ?? "—"}</b></span>;
}
