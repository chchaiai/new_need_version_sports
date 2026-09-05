"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppSelect } from "./app-select";
import { apiErrorText, currentApiRequestMode } from "./api-client";
import { FormField } from "./form-field";
import {
  rosterReconciliationService,
  parseOfficialRosterFile,
  validateOfficialRosterFile,
} from "./roster-reconciliation-api-service";
import {
  ROSTER_IMPORT_FIELDS,
  RosterReconciliationStatus,
  RosterResolutionStatus,
  type ParsedRosterFile,
  type PlatformCourseMember,
  type RosterCourseReference,
  type RosterFieldMapping,
  type RosterImportField,
  type RosterReconciliationBundle,
  type RosterReconciliationResult,
  type ValidatedRosterImport,
} from "./roster-reconciliation-types";
import {
  DataTable,
  FilterToolbar,
  ManagementTableLayout,
  TableActionMenu,
  TableActionMenuItem,
} from "./teacher-ui";

const STATUS_LABELS: Record<RosterReconciliationStatus, string> = {
  MATCHED: "已正确加入",
  MISSING_IN_PLATFORM: "未加入课程",
  EXTRA_IN_PLATFORM: "非官方名单成员",
  WRONG_COURSE: "加错课程",
  IDENTITY_CONFLICT: "信息不一致",
  DUPLICATED: "重复记录",
};

const RESOLUTION_LABELS: Record<RosterResolutionStatus, string> = {
  PENDING: "待确认",
  CONFIRMED: "已确认",
  RESOLVED: "已处理",
  IGNORED: "已忽略",
};

const FIELD_LABELS: Record<RosterImportField, string> = {
  studentNumber: "学号",
  fullName: "姓名",
  gender: "性别",
  gradeYear: "入学年份",
  collegeName: "学院",
  majorName: "专业",
  administrativeClassName: "行政班",
};

const DIFFERENCE_LABELS: Record<RosterReconciliationResult["differences"][number]["field"], string> = {
  FULL_NAME: "姓名",
  GENDER: "性别",
  GRADE_YEAR: "入学年份",
  CLASS_SECTION: "教学班",
};

const PAGE_SIZE = 8;
const EMPTY_RESULTS: RosterReconciliationResult[] = [];
type StatusFilter = "ALL" | "OTHER" | RosterReconciliationStatus;

function statusTone(status: RosterReconciliationStatus) {
  if (status === RosterReconciliationStatus.MATCHED) return "success";
  if (status === RosterReconciliationStatus.MISSING_IN_PLATFORM) return "warning";
  if (status === RosterReconciliationStatus.WRONG_COURSE || status === RosterReconciliationStatus.DUPLICATED) return "danger";
  return "neutral";
}

function formatCourse(course: RosterCourseReference | undefined) {
  return course ? course.name : "—";
}

function primaryStudent(result: RosterReconciliationResult) {
  return {
    studentNumber: result.officialStudent?.studentNumber ?? result.platformMember?.studentNumber ?? "—",
    name: result.officialStudent?.name ?? result.platformMember?.name ?? "—",
  };
}

function importErrorMessage(error: unknown) {
  const code = error instanceof Error ? error.message : "FILE_PARSE_FAILED";
  const messages: Record<string, string> = {
    UNSUPPORTED_FILE_TYPE: "文件格式错误，请上传 .xlsx、.xls 或 .csv 文件。",
    EMPTY_FILE: "文件为空，或文件中没有可导入的数据。",
    FILE_TOO_LARGE: "文件过大，请将名单控制在 10 MB 以内。",
    FILE_PARSE_FAILED: "文件解析失败，请检查文件是否损坏或受密码保护。",
    MISSING_STUDENT_NUMBER_FIELD: "缺少必填字段：学号。",
    MISSING_FULL_NAME_FIELD: "缺少必填字段：姓名。",
    ROW_LIMIT_EXCEEDED: "名单超过 10,000 行，请拆分或整理后重新导入。",
    ROSTER_IMPORT_FAILED: "后端未接受该名单版本，请根据校验结果修正文件后重试。",
  };
  return messages[code] ?? apiErrorText(error);
}

type RosterReconciliationPageProps = {
  course: RosterCourseReference;
  courses: RosterCourseReference[];
  platformMembers: PlatformCourseMember[];
  onBack: () => void;
  showToast: (message: string) => void;
  canManage?: boolean;
};

export function RosterReconciliationPage({
  course,
  courses,
  platformMembers,
  onBack,
  showToast,
  canManage = true,
}: RosterReconciliationPageProps) {
  const isDemo = currentApiRequestMode() === "demo";
  const [bundle, setBundle] = useState<RosterReconciliationBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reconciling, setReconciling] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [resolutionFilter, setResolutionFilter] = useState<"ALL" | RosterResolutionStatus>("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [sort, setSort] = useState<"ATTENTION" | "STUDENT_NUMBER" | "NAME" | "UPDATED_AT">("ATTENTION");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<RosterReconciliationResult | null>(null);

  const context = useMemo(() => ({ course, courses, platformMembers }), [course, courses, platformMembers]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBundle(await rosterReconciliationService.getBundle(course.id, context));
    } catch (loadError) {
      setError(apiErrorText(loadError));
    } finally {
      setLoading(false);
    }
  }, [context, course.id]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  const results = bundle?.results ?? EMPTY_RESULTS;
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return results
      .filter((result) => {
        const student = primaryStudent(result);
        const matchesSearch = !query || student.name.toLocaleLowerCase().includes(query) || student.studentNumber.toLocaleLowerCase().includes(query);
        const primaryStatus = result.status === RosterReconciliationStatus.MATCHED
          || result.status === RosterReconciliationStatus.MISSING_IN_PLATFORM
          || result.status === RosterReconciliationStatus.WRONG_COURSE;
        const matchesStatus = statusFilter === "ALL"
          || (statusFilter === "OTHER" ? !primaryStatus : result.status === statusFilter);
        const matchesResolution = resolutionFilter === "ALL" || result.resolutionStatus === resolutionFilter;
        const matchesCourse = courseFilter === "ALL"
          || result.officialStudent?.courseId === courseFilter
          || result.platformMember?.courseId === courseFilter;
        return matchesSearch && matchesStatus && matchesResolution && matchesCourse;
      })
      .sort((a, b) => {
        const studentA = primaryStudent(a);
        const studentB = primaryStudent(b);
        if (sort === "STUDENT_NUMBER") return studentA.studentNumber.localeCompare(studentB.studentNumber, "zh-CN", { numeric: true });
        if (sort === "NAME") return studentA.name.localeCompare(studentB.name, "zh-CN");
        if (sort === "UPDATED_AT") return b.updatedAt.localeCompare(a.updatedAt);
        const weight = (result: RosterReconciliationResult) => result.resolutionStatus === RosterResolutionStatus.PENDING
          ? result.status === RosterReconciliationStatus.MATCHED ? 2 : 0
          : 1;
        return weight(a) - weight(b);
      });
  }, [courseFilter, resolutionFilter, results, search, sort, statusFilter]);

  const resetResultNavigation = () => {
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const runReconciliation = async () => {
    if (!bundle?.currentRoster || reconciling) return;
    setReconciling(true);
    setError("");
    try {
      const next = await rosterReconciliationService.reconcile(context);
      setBundle(next);
      showToast(
        isDemo
          ? "对齐完成；结果已保存到当前前端演示会话，尚未写入服务器。"
          : "后端名单核对已完成，并生成新的不可变核对修订。",
      );
    } catch (reconcileError) {
      setError(apiErrorText(reconcileError));
    } finally {
      setReconciling(false);
    }
  };

  const updateResolution = async (
    ids: string[],
    status: RosterResolutionStatus,
    reason: string,
  ) => {
    if (!canManage || ids.length === 0) return;
    try {
      const next = await rosterReconciliationService.updateResolution(
        course.id,
        ids,
        status,
        reason,
      );
      setBundle(next);
      setDetail((current) => current ? next.results.find((item) => item.id === current.id) ?? null : null);
      showToast(
        status === RosterResolutionStatus.CONFIRMED
          ? isDemo
            ? "处理状态已保存在当前前端演示会话，尚未写入服务器。"
            : "已由后端记录确认原因。"
          : isDemo
            ? "处理状态已保存在当前前端演示会话，尚未写入服务器。"
            : "已由后端重新打开该核对结果。",
      );
    } catch (resolutionError) {
      setError(apiErrorText(resolutionError));
      throw resolutionError;
    }
  };

  const selectStatus = (status: StatusFilter) => {
    setStatusFilter(status);
    resetResultNavigation();
    document.querySelector<HTMLElement>(".roster-results-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return <RosterLoading course={course} onBack={onBack} />;
  }

  if (error && !bundle) {
    return <RosterError course={course} message={error} onBack={onBack} onRetry={() => void load()} />;
  }

  if (!bundle) {
    return <RosterError course={course} message="名单对齐数据暂时不可用。" onBack={onBack} onRetry={() => void load()} />;
  }

  if (!bundle.currentRoster) {
    return (
      <section className="roster-reconciliation-page">
        <RosterHeader course={course} onBack={onBack} />
        <div className="roster-empty-import">
          <span><FileSpreadsheet aria-hidden="true" /></span>
          <h2>尚未导入官方名单</h2>
          <p>{isDemo ? "导入学校提供的 Excel 或 CSV 名单后，系统会按学号自动比对当前课程成员。" : "导入学校提供的 Excel 或 CSV 名单后，后端会校验并创建不可变名单版本；教师确认后再运行名单核对。"}</p>
          <button className="primary-button" type="button" disabled={!canManage} onClick={() => setImportOpen(true)}><Upload size={17} aria-hidden="true" />导入官方名单</button>
          <small>{isDemo ? "当前为前端 Mock 服务；导入内容仅保存在本次浏览器会话，不会写入学校服务器。" : "文件和字段映射将提交到真实后端；导入不会直接增删课程成员。"}</small>
        </div>
        {importOpen && <RosterImportDialog course={course} currentBundle={bundle} onClose={() => setImportOpen(false)} onImported={(next) => { setBundle(next); setImportOpen(false); showToast(isDemo ? "导入成功并完成对齐；数据仅保存在当前前端演示会话。" : "后端已创建并验证新的官方名单版本；请点击“运行核对”生成结果。"); }} />}
      </section>
    );
  }

  const stats = bundle.stats;
  return (
    <section className="roster-reconciliation-page">
      <RosterHeader course={course} onBack={onBack}>
        <button className="secondary-button" type="button" disabled={reconciling || !canManage} onClick={() => void runReconciliation()}>
          <RefreshCw size={16} className={reconciling ? "is-spinning" : ""} aria-hidden="true" />{reconciling ? "正在核对" : results.length > 0 ? "重新核对" : "运行核对"}
        </button>
        <button className="secondary-button" type="button" disabled={!canManage} onClick={() => setImportOpen(true)}><Upload size={16} aria-hidden="true" />导入官方名单</button>
      </RosterHeader>

      {isDemo && <aside className="roster-mock-notice"><AlertTriangle size={18} aria-hidden="true" /><p>当前为前端 Mock 服务；导入内容仅保存在本次浏览器会话，不会写入学校服务器。</p></aside>}

      <section className="roster-version-strip" aria-label="名单版本和更新时间">
        <div><span>当前名单版本</span><b>v{bundle.currentRoster.version.versionNumber} · {bundle.currentRoster.version.status}</b></div>
        <div><span>官方名单更新时间</span><time>{bundle.currentRoster.version.importedAt}</time></div>
        <div><span>名单有效 / 异常</span><b>{bundle.currentRoster.version.validRows} / {bundle.currentRoster.version.invalidRows + bundle.currentRoster.version.duplicatedRows}</b></div>
        <div><span>最近一次对齐</span><time>{stats.lastReconciledAt ?? "—"}</time></div>
      </section>

      {error && <div className="roster-inline-error" role="alert"><AlertTriangle size={17} aria-hidden="true" /><span>{error}</span><button type="button" onClick={() => setError("")}>关闭</button></div>}

      <section className="roster-stat-grid" aria-label="名单对齐概览">
        <RosterStatCard label="官方名单总人数" value={stats.officialTotal} selected={statusFilter === "ALL"} onClick={() => selectStatus("ALL")} />
        <RosterStatCard label="平台当前人数" value={stats.platformTotal} selected={false} onClick={() => { setCourseFilter(course.id); selectStatus("ALL"); }} />
        <RosterStatCard label="已正确加入人数" value={stats.matched} tone="success" selected={statusFilter === RosterReconciliationStatus.MATCHED} onClick={() => selectStatus(RosterReconciliationStatus.MATCHED)} />
        <RosterStatCard label="未加入人数" value={stats.notJoined} tone="warning" selected={statusFilter === RosterReconciliationStatus.MISSING_IN_PLATFORM} onClick={() => selectStatus(RosterReconciliationStatus.MISSING_IN_PLATFORM)} />
        <RosterStatCard label="加错课程人数" value={stats.wrongCourse} tone="danger" selected={statusFilter === RosterReconciliationStatus.WRONG_COURSE} onClick={() => selectStatus(RosterReconciliationStatus.WRONG_COURSE)} />
        <RosterStatCard label="其他异常人数" value={stats.otherExceptions} tone="neutral" selected={statusFilter === "OTHER"} onClick={() => selectStatus("OTHER")} />
      </section>

      <ManagementTableLayout
        toolbar={
          <FilterToolbar ariaLabel="名单对齐筛选工具栏">
            <label className="search-field roster-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label="搜索姓名或学号" value={search} onChange={(event) => { setSearch(event.target.value); resetResultNavigation(); }} placeholder="搜索姓名或学号" /></label>
            <AppSelect className="roster-filter-select" label="对齐状态" value={statusFilter} options={[{ value: "ALL", label: "全部对齐状态" }, { value: "OTHER", label: "其他异常" }, ...Object.values(RosterReconciliationStatus).map((status) => ({ value: status, label: STATUS_LABELS[status] }))]} onChange={(value) => { if (value) { setStatusFilter(value as StatusFilter); resetResultNavigation(); } }} />
            <AppSelect className="roster-filter-select" label="处理状态" value={resolutionFilter} options={[{ value: "ALL", label: "全部处理状态" }, ...Object.values(RosterResolutionStatus).map((status) => ({ value: status, label: RESOLUTION_LABELS[status] }))]} onChange={(value) => { if (value) { setResolutionFilter(value as typeof resolutionFilter); resetResultNavigation(); } }} />
            <AppSelect className="roster-filter-select" label="课程筛选" value={courseFilter} options={[{ value: "ALL", label: "全部相关课程" }, ...courses.map((item) => ({ value: item.id, label: formatCourse(item) }))]} onChange={(value) => { if (value) { setCourseFilter(String(value)); resetResultNavigation(); } }} />
            <AppSelect className="roster-filter-select" label="排序" value={sort} options={[{ value: "ATTENTION", label: "待处理优先" }, { value: "STUDENT_NUMBER", label: "按学号" }, { value: "NAME", label: "按姓名" }, { value: "UPDATED_AT", label: "最近更新" }]} onChange={(value) => { if (value) { setSort(value as typeof sort); resetResultNavigation(); } }} />
          </FilterToolbar>
        }
      >
        <section className="roster-results-card">
          <div className="roster-results-heading"><div><h2>对齐结果</h2><p>共 {filtered.length} 条记录，异常和待处理记录优先显示。</p></div><button className="text-button" type="button" onClick={() => { setSearch(""); setStatusFilter("ALL"); setResolutionFilter("ALL"); setCourseFilter("ALL"); resetResultNavigation(); }}>清除筛选</button></div>
          {filtered.length === 0 ? <div className="roster-table-empty"><Check aria-hidden="true" /><h3>没有符合筛选条件的记录</h3><p>调整搜索或筛选条件后再试。</p></div> : <>
            <DataTable className="roster-reconciliation-table" minWidth={1460}>
              <thead><tr>
                <th>学号</th><th>姓名</th><th>官方课程</th><th>当前加入课程</th><th>官方信息</th><th>平台信息</th><th>对齐状态</th><th>差异说明</th><th>处理状态</th><th className="action-column">操作</th>
              </tr></thead>
              <tbody>{pageRows.map((result) => {
                const student = primaryStudent(result);
                const officialCourse = courses.find((item) => item.id === result.officialStudent?.courseId);
                const platformCourse = courses.find((item) => item.id === result.platformMember?.courseId);
                return <tr key={result.id} className={result.status === RosterReconciliationStatus.MATCHED ? "is-matched-row" : ""}>
                  <td><b className="roster-student-number" translate="no">{student.studentNumber}</b></td>
                  <td><button className="roster-student-link" type="button" onClick={() => setDetail(result)}>{student.name}</button></td>
                  <td>{formatCourse(officialCourse)}</td><td>{formatCourse(platformCourse)}</td>
                  <td><RosterIdentitySummary name={result.officialStudent?.name} gender={result.officialStudent?.gender} grade={result.officialStudent?.grade} /></td>
                  <td><RosterIdentitySummary name={result.platformMember?.name} gender={result.platformMember?.gender} grade={result.platformMember?.grade} /></td>
                  <td><span className={`roster-status is-${statusTone(result.status)}`}>{STATUS_LABELS[result.status]}</span></td>
                  <td><button className="roster-reason-link" type="button" onClick={() => setDetail(result)}>{result.reason}</button></td>
                  <td><span className={`resolution-status is-${result.resolutionStatus.toLocaleLowerCase()}`}>{RESOLUTION_LABELS[result.resolutionStatus]}</span></td>
                  <td className="action-column"><TableActionMenu iconOnly label={`处理 ${student.name}`}>
                    <TableActionMenuItem onClick={() => setDetail(result)}>查看差异详情</TableActionMenuItem>
                  </TableActionMenu></td>
                </tr>;
              })}</tbody>
            </DataTable>
            <div className="roster-pagination"><span>第 {page} / {totalPages} 页</span><div><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button><button type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>下一页</button></div></div>
          </>}
        </section>
      </ManagementTableLayout>

      {detail && <RosterDetailDrawer result={detail} courses={courses} canManage={canManage} onClose={() => setDetail(null)} onResolution={(status, reason) => updateResolution([detail.id], status, reason)} />}
      {importOpen && <RosterImportDialog course={course} currentBundle={bundle} onClose={() => setImportOpen(false)} onImported={(next) => { setBundle(next); setImportOpen(false); showToast(isDemo ? "导入成功并完成对齐；数据仅保存在当前前端演示会话。" : "后端已创建并验证新的官方名单版本；请运行核对生成最新结果。"); }} />}
    </section>
  );
}

function RosterHeader({ course, onBack, children }: { course: RosterCourseReference; onBack: () => void; children?: React.ReactNode }) {
  return <header className="roster-page-header"><div><button className="text-button roster-back-button" type="button" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" />返回课程管理</button><span className="eyebrow">课程管理 · 名单对齐</span><h1>名单对齐</h1><p>{course.name}</p></div>{children && <div className="roster-header-actions">{children}</div>}</header>;
}

function RosterLoading({ course, onBack }: { course: RosterCourseReference; onBack: () => void }) {
  return <section className="roster-reconciliation-page" aria-busy="true"><RosterHeader course={course} onBack={onBack} /><div className="roster-loading"><RefreshCw className="is-spinning" aria-hidden="true" /><h2>正在加载名单对齐数据</h2><p>正在获取官方名单、平台成员和最近一次对齐结果。</p></div></section>;
}

function RosterError({ course, message, onBack, onRetry }: { course: RosterCourseReference; message: string; onBack: () => void; onRetry: () => void }) {
  return <section className="roster-reconciliation-page"><RosterHeader course={course} onBack={onBack} /><div className="roster-loading is-error"><AlertTriangle aria-hidden="true" /><h2>名单对齐加载失败</h2><p>{message}</p><button className="primary-button" type="button" onClick={onRetry}>重新加载</button></div></section>;
}

function RosterStatCard({ label, value, tone = "default", selected, onClick }: { label: string; value: number; tone?: "default" | "success" | "warning" | "danger" | "neutral"; selected: boolean; onClick: () => void }) {
  return <button className={`roster-stat-card is-${tone} ${selected ? "is-selected" : ""}`} type="button" onClick={onClick} aria-pressed={selected}><span>{label}</span><b>{value}</b></button>;
}

function RosterIdentitySummary({ name, gender, grade }: { name?: string; gender?: string; grade?: string }) {
  if (!name && !gender && !grade) return <span>—</span>;
  return <span className="roster-identity-summary"><b>{name ?? "—"}</b><small>{[gender, grade].filter(Boolean).join(" · ") || "—"}</small></span>;
}

function RosterDetailDrawer({ result, courses, canManage, onClose, onResolution }: { result: RosterReconciliationResult; courses: RosterCourseReference[]; canManage: boolean; onClose: () => void; onResolution: (status: RosterResolutionStatus, reason: string) => Promise<void> }) {
  const isDemo = currentApiRequestMode() === "demo";
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const student = primaryStudent(result);
  const officialCourse = courses.find((course) => course.id === result.officialStudent?.courseId);
  const platformCourse = courses.find((course) => course.id === result.platformMember?.courseId);
  const submitResolution = async (status: RosterResolutionStatus) => {
    if (!reason.trim()) {
      setActionError("请填写本次确认或重新打开的原因。");
      return;
    }
    setSaving(true);
    setActionError("");
    try {
      await onResolution(status, reason);
      setReason("");
    } catch {
      setActionError(isDemo ? "处理状态更新失败，请重试。" : "后端未接受本次处理，请查看页面错误信息后重试。");
    } finally {
      setSaving(false);
    }
  };
  return <div className="modal-backdrop roster-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal teacher-dialog review-drawer roster-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="roster-detail-title">
      <div className="modal-head"><div><span className="eyebrow">差异详情</span><h2 id="roster-detail-title">{student.name} · {student.studentNumber}</h2><p>系统判定依据与教师处理记录</p></div><button className="icon-button" type="button" aria-label="关闭差异详情" onClick={onClose}><X aria-hidden="true" /></button></div>
      <div className="teacher-dialog-body">
        <section className="roster-decision-card"><span className={`roster-status is-${statusTone(result.status)}`}>{STATUS_LABELS[result.status]}</span><h3>系统判定原因</h3><p>{result.reason}</p></section>
        <div className="roster-comparison-grid">
          <section><h3>官方名单信息</h3><dl><div><dt>学号</dt><dd translate="no">{result.officialStudent?.studentNumber ?? "—"}</dd></div><div><dt>姓名</dt><dd>{result.officialStudent?.name ?? "—"}</dd></div><div><dt>性别</dt><dd>{result.officialStudent?.gender ?? "—"}</dd></div><div><dt>年级</dt><dd>{result.officialStudent?.grade ?? "—"}</dd></div><div><dt>官方归属课程</dt><dd>{formatCourse(officialCourse)}</dd></div></dl></section>
          <section><h3>平台学生信息</h3><dl><div><dt>学号</dt><dd translate="no">{result.platformMember?.studentNumber ?? "—"}</dd></div><div><dt>姓名</dt><dd>{result.platformMember?.name ?? "—"}</dd></div><div><dt>性别</dt><dd>{result.platformMember?.gender ?? "—"}</dd></div><div><dt>年级</dt><dd>{result.platformMember?.grade ?? "—"}</dd></div><div><dt>当前加入课程</dt><dd>{formatCourse(platformCourse)}</dd></div></dl></section>
        </div>
        <section className="roster-difference-list"><h3>差异字段</h3>{result.differences.length === 0 ? <p>主要身份字段无差异。</p> : result.differences.map((difference, index) => <div key={`${difference.field}-${index}`}><b>{DIFFERENCE_LABELS[difference.field]}</b><span>官方：{difference.officialValue ?? "—"}</span><span>平台：{difference.platformValue ?? "—"}</span></div>)}</section>
        {result.teacherNote && <section className="roster-operation-log"><h3>{isDemo ? "最近操作记录" : "后端最近处理说明"}</h3><p>{result.teacherNote}</p></section>}
        <FormField
          className="roster-note-field"
          label="本次处理原因"
          required
          hint={`${reason.length} / 1000`}
          error={actionError || undefined}
          controlId="roster-resolution-reason"
        >
          <textarea
            id="roster-resolution-reason"
            rows={4}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setActionError("");
            }}
            maxLength={1000}
            placeholder={isDemo ? "记录核实情况或后续处理计划" : "必填；说明核实依据。该原因会写入后端审计与处理历史。"}
          />
        </FormField>
        <section className="roster-future-actions"><h3>{isDemo ? "后续操作（等待真实后端）" : "受接口规则约束的处理范围"}</h3><p>{isDemo ? "当前使用前端 Mock Service。确认后会在本次浏览器会话中保存名单并自动重新对齐，不会修改学校服务器或真实学生成员关系。" : "当前页面仅开放后端已支持的“确认异常”和“重新打开”。“已处理”必须附带可追溯证据引用；现有页面尚不能安全采集该证据，因此不会显示伪造入口。完整历史可在审计日志中查询。"}</p></section>
      </div>
      <div className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>关闭</button>{(result.resolutionStatus === RosterResolutionStatus.RESOLVED || result.resolutionStatus === RosterResolutionStatus.IGNORED) && <button className="secondary-button" type="button" disabled={!canManage || saving} onClick={() => void submitResolution(RosterResolutionStatus.PENDING)}>{saving ? "正在提交" : "重新打开"}</button>}{result.status !== RosterReconciliationStatus.MATCHED && result.resolutionStatus === RosterResolutionStatus.PENDING && <button className="primary-button" type="button" disabled={!canManage || saving} onClick={() => void submitResolution(RosterResolutionStatus.CONFIRMED)}>{saving ? "正在提交" : "确认该异常"}</button>}</div>
    </section>
  </div>;
}

function RosterImportDialog({ course, currentBundle, onClose, onImported }: { course: RosterCourseReference; currentBundle: RosterReconciliationBundle; onClose: () => void; onImported: (bundle: RosterReconciliationBundle) => void }) {
  const isDemo = currentApiRequestMode() === "demo";
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedRosterFile | null>(null);
  const [mapping, setMapping] = useState<RosterFieldMapping | null>(null);
  const [validation, setValidation] = useState<ValidatedRosterImport | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    setError("");
    setValidation(null);
    try {
      const next = await parseOfficialRosterFile(file);
      setParsed(next);
      setMapping(next.suggestedMapping);
    } catch (nextError) {
      setParsed(null);
      setMapping(null);
      setError(importErrorMessage(nextError));
    } finally {
      setParsing(false);
    }
  };

  const validate = () => {
    if (!parsed || !mapping) return;
    setError("");
    try {
      setValidation(validateOfficialRosterFile(parsed, mapping));
    } catch (nextError) {
      setError(importErrorMessage(nextError));
    }
  };

  const confirmImport = async () => {
    if (!parsed || !mapping || !validation || validation.validRows === 0) return;
    setImporting(true);
    setError("");
    try {
      const next = await rosterReconciliationService.importOfficialRoster({ course, parsed, mapping });
      onImported(next);
    } catch (nextError) {
      setError(importErrorMessage(nextError));
    } finally {
      setImporting(false);
    }
  };

  const step = !parsed ? 1 : !validation ? 2 : 3;
  return <div className="modal-backdrop roster-import-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !importing && onClose()}>
    <section className="modal teacher-dialog teacher-dialog-wide roster-import-dialog" role="dialog" aria-modal="true" aria-labelledby="roster-import-title">
      <div className="modal-head"><div><span className="eyebrow">官方名单导入 · 第 {step} 步，共 3 步</span><h2 id="roster-import-title">导入官方名单</h2><p>{course.name}</p></div><button className="icon-button" type="button" disabled={importing} aria-label="关闭导入" onClick={onClose}><X aria-hidden="true" /></button></div>
      <div className="teacher-dialog-body">
        <ol className="roster-import-steps" aria-label="导入进度"><li className={step >= 1 ? "active" : ""}>1 选择并预览</li><li className={step >= 2 ? "active" : ""}>2 字段映射</li><li className={step >= 3 ? "active" : ""}>3 校验并导入</li></ol>
        {!parsed && <section className="roster-file-picker"><input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" aria-label="选择学校官方课程名单文件" aria-describedby="roster-file-help" onChange={(event) => void chooseFile(event.target.files?.[0])} /><FileSpreadsheet aria-hidden="true" /><h3>{parsing ? "正在解析文件" : "选择学校官方课程名单"}</h3><p id="roster-file-help">支持 .xlsx、.xls 和 .csv，最大 10 MB、最多 10,000 行。学号始终按字符串处理。</p><button className="primary-button" type="button" disabled={parsing} onClick={() => inputRef.current?.click()}><Upload size={17} aria-hidden="true" />{parsing ? "正在解析" : "选择文件"}</button></section>}
        {parsed && !validation && mapping && <>
          <section className="roster-file-summary"><FileSpreadsheet aria-hidden="true" /><div><h3>{parsed.fileName}</h3><p>{parsed.sheetName} · {parsed.totalRows} 行数据</p></div><button className="text-button" type="button" onClick={() => { setParsed(null); setMapping(null); }}>更换文件</button></section>
          <section className="roster-preview-section"><div><h3>数据预览</h3><p>显示前 {parsed.previewRows.length} 行；确认表头和学号前导零是否正确。</p></div><DataTable minWidth={Math.max(720, parsed.headers.length * 150)}><thead><tr>{parsed.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{parsed.previewRows.map((row, index) => <tr key={index}>{parsed.headers.map((header) => <td key={header} translate={mapping.studentNumber === header ? "no" : undefined}>{row[header] || "—"}</td>)}</tr>)}</tbody></DataTable></section>
          <section className="roster-mapping-section"><div><h3>字段映射</h3><p>{isDemo ? "系统已自动识别常见表头。学号为必填核心匹配字段，姓名仅用于辅助校验。" : "字段名与服务端 API一致；学号和姓名均为必填字段，最终校验结果以后端为准。"}</p></div><div className="roster-mapping-grid">{ROSTER_IMPORT_FIELDS.map((field) => <AppSelect key={field} label={`${FIELD_LABELS[field]}${field === "studentNumber" || field === "fullName" ? " *" : ""}`} value={mapping[field] ?? ""} options={[{ value: "", label: "不导入此字段" }, ...parsed.headers.map((header) => ({ value: header, label: header }))]} onChange={(value) => setMapping((current) => current ? { ...current, [field]: value ? String(value) : null } : current)} />)}</div></section>
        </>}
        {validation && parsed && <>
          <section className="roster-validation-summary"><div className="is-success"><span>有效数据</span><b>{validation.validRows}</b></div><div className={validation.invalidRows > 0 ? "is-warning" : ""}><span>异常数据</span><b>{validation.invalidRows}</b></div><div><span>总数据行</span><b>{validation.totalRows}</b></div></section>
          {validation.errors.length > 0 && <section className="roster-validation-errors"><h3>异常数据</h3><p>异常行不会导入；重复学号的所有相关记录需要先在源文件中确认。</p><div>{validation.errors.slice(0, 12).map((item) => <span key={`${item.rowNumber}-${item.code}`}><b>第 {item.rowNumber} 行</b>{item.message}</span>)}</div>{validation.errors.length > 12 && <small>另有 {validation.errors.length - 12} 条异常未展开。</small>}</section>}
          {currentBundle.currentRoster && <section className="roster-version-conflict"><h3>该课程已有官方名单</h3><p>{isDemo ? `当前 Mock 版本为 v${currentBundle.currentRoster.version.versionNumber}；本次导入会在浏览器会话中创建新版本。` : `当前版本为 v${currentBundle.currentRoster.version.versionNumber}。后端只允许创建新的不可变版本；历史版本会保留，本次导入验证通过后成为当前版本。`}</p></section>}
          <aside className="roster-mock-notice"><AlertTriangle size={18} aria-hidden="true" /><p>{isDemo ? "当前使用前端 Mock Service。确认后会在本次浏览器会话中保存名单并自动重新对齐，不会修改学校服务器或真实学生成员关系。" : "确认后会把规范化 CSV 和字段映射提交到真实后端。后端负责校验、版本切换、审计与存储；该操作不会直接增删 Enrollment。"}</p></aside>
        </>}
        {error && <p className="form-error roster-import-error" role="alert">{error}</p>}
      </div>
      <div className="modal-footer"><button className="secondary-button" type="button" disabled={importing} onClick={onClose}>取消导入</button>{parsed && !validation && <button className="primary-button" type="button" onClick={validate}>本地预检</button>}{validation && <button className="primary-button" type="button" disabled={importing || validation.validRows === 0} onClick={() => void confirmImport()}>{importing ? isDemo ? "正在导入并对齐" : "正在提交后端" : "确认创建新版本"}</button>}</div>
    </section>
  </div>;
}
