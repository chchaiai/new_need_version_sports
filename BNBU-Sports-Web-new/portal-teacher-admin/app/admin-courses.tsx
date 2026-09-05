"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppSelect } from "./app-select";
import {
  fetchClassProgressTarget,
  fetchClassSections,
  fetchCourses,
  fetchCurrentSemester,
  fetchEnrollments,
  fetchExerciseRecords,
} from "./teacher-data";
import { getTeacherProfile } from "./admin-service";
import { toUserFacingError, type UserFacingError } from "./api-client";
import { ErrorPanel } from "./error-panel";
import type { AdminLocale } from "./admin-types";
import type { WorkspaceMode } from "./portal-app";
import {
  AdminBadge,
  AdminEmpty,
  AdminField,
  AdminLoading,
  AdminSectionHeading,
} from "./admin-components";

type CourseDashboardRow = {
  id: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  semesterName: string;
  status: string;
  enrollmentOpen: boolean;
  activeStudents: number;
  activeStudentIds: string[];
  removedStudents: number;
  submittedStudents: number;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  creditedSeconds: number;
  courseTargetSeconds: number | null;
  generalTargetSeconds: number | null;
  checkInWindow: string;
};

const demoRows: CourseDashboardRow[] = [
  {
    id: "demo-section-pe101-01",
    courseName: "大学体育（一）",
    teacherId: "demo-teacher-zhang",
    teacherName: "张老师",
    semesterName: "2025-2026 第二学期",
    status: "ACTIVE",
    enrollmentOpen: true,
    activeStudents: 42,
    activeStudentIds: Array.from({ length: 42 }, (_, index) => `pe101-${index + 1}`),
    removedStudents: 1,
    submittedStudents: 38,
    totalRecords: 286,
    validRecords: 271,
    invalidRecords: 15,
    creditedSeconds: 1_842_600,
    courseTargetSeconds: 36_000,
    generalTargetSeconds: 36_000,
    checkInWindow: "2026年2月23日 – 2026年7月31日 · 06:00–22:00",
  },
  {
    id: "demo-section-pe204-02",
    courseName: "羽毛球基础",
    teacherId: "demo-teacher-li",
    teacherName: "李老师",
    semesterName: "2025-2026 第二学期",
    status: "ACTIVE",
    enrollmentOpen: true,
    activeStudents: 36,
    activeStudentIds: Array.from({ length: 36 }, (_, index) => `pe204-${index + 1}`),
    removedStudents: 0,
    submittedStudents: 32,
    totalRecords: 219,
    validRecords: 207,
    invalidRecords: 12,
    creditedSeconds: 1_386_000,
    courseTargetSeconds: 28_800,
    generalTargetSeconds: 43_200,
    checkInWindow: "2026年2月23日 – 2026年7月31日 · 06:30–21:30",
  },
  {
    id: "demo-section-pe310-01",
    courseName: "体能训练",
    teacherId: "demo-teacher-chen",
    teacherName: "陈老师",
    semesterName: "2025-2026 第二学期",
    status: "UPCOMING",
    enrollmentOpen: false,
    activeStudents: 33,
    activeStudentIds: Array.from({ length: 33 }, (_, index) => `pe310-${index + 1}`),
    removedStudents: 2,
    submittedStudents: 0,
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    creditedSeconds: 0,
    courseTargetSeconds: 36_000,
    generalTargetSeconds: 36_000,
    checkInWindow: "尚未开放",
  },
];

function durationLabel(locale: AdminLocale, seconds: number) {
  const hours = seconds / 3600;
  return locale === "zh"
    ? `${hours.toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 小时`
    : `${hours.toLocaleString("en", { maximumFractionDigits: 1 })} hours`;
}

function dateLabel(locale: AdminLocale, value: string | null | undefined) {
  if (!value) return locale === "zh" ? "未设置" : "Not set";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function timeLabel(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return value.slice(0, 5);
}

async function loadRealRows(locale: AdminLocale): Promise<CourseDashboardRow[]> {
  const [sections, catalog, semester] = await Promise.all([
    fetchClassSections(),
    fetchCourses(),
    fetchCurrentSemester(),
  ]);
  const courseById = new Map(catalog.map((course) => [course.id, course]));
  const semesterSections = semester?.id
    ? sections.filter((section) => section.semesterId === semester.id)
    : sections;
  const currentSections = semesterSections.filter(
    (section) => section.status !== "CLOSED" && section.status !== "ARCHIVED",
  );

  return Promise.all(
    currentSections.map(async (section) => {
      const [enrollments, records, target, teacher] = await Promise.all([
        fetchEnrollments(section.id),
        fetchExerciseRecords(section.id),
        fetchClassProgressTarget(section.id).catch(() => null),
        getTeacherProfile(section.teacherId).catch(() => null),
      ]);
      const course = courseById.get(section.courseId);
      const countedRecords = records.filter(
        (record) => record.status !== "DRAFT" && record.status !== "CANCELLED",
      );
      const validRecords = countedRecords.filter(
        (record) => record.currentReview?.result === "VALID",
      );
      const invalidRecords = countedRecords.filter(
        (record) => record.currentReview?.result === "INVALID",
      );
      const submittedStudents = new Set(
        countedRecords.map((record) => record.studentId),
      ).size;
      const activeEnrollments = enrollments.filter((item) => item.status === "ACTIVE");
      const startDate = dateLabel(locale, section.checkInStartDate);
      const endDate = dateLabel(locale, section.checkInEndDate);
      const timeRange = `${timeLabel(section.dailyStartTime, "—")}–${timeLabel(section.dailyEndTime, "—")}`;

      return {
        id: section.id,
        courseName: course?.courseName ?? section.displayName,
        teacherId: section.teacherId,
        teacherName: teacher?.fullName ?? (locale === "zh" ? "教师信息暂不可用" : "Teacher unavailable"),
        semesterName: semester?.displayName ?? semester?.name ?? (locale === "zh" ? "当前学期" : "Current semester"),
        status: section.status,
        enrollmentOpen: section.isEnrollmentOpen,
        activeStudents: activeEnrollments.length,
        activeStudentIds: activeEnrollments.map((item) => item.studentId),
        removedStudents: enrollments.filter((item) => item.status !== "ACTIVE").length,
        submittedStudents,
        totalRecords: countedRecords.length,
        validRecords: validRecords.length,
        invalidRecords: invalidRecords.length,
        creditedSeconds: validRecords.reduce(
          (total, record) => total + record.creditedDurationSeconds,
          0,
        ),
        courseTargetSeconds: target?.courseTargetSeconds ?? null,
        generalTargetSeconds: target?.generalTargetSeconds ?? null,
        checkInWindow:
          section.checkInWindowMode === "UNAVAILABLE"
            ? locale === "zh" ? "未开放" : "Unavailable"
            : `${startDate} – ${endDate} · ${timeRange}`,
      };
    }),
  );
}

export function AdminCourses({
  locale,
  mode,
}: {
  locale: AdminLocale;
  mode: WorkspaceMode;
}) {
  const [rows, setRows] = useState<CourseDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UserFacingError | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = mode === "demo" ? demoRows : await loadRealRows(locale);
      setRows([...loaded].sort((left, right) => left.courseName.localeCompare(right.courseName)));
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

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      return !normalized || `${row.courseName} ${row.teacherName}`.toLocaleLowerCase().includes(normalized);
    });
  }, [query, rows, status]);

  const summary = useMemo(() => ({
    courses: rows.length,
    students: new Set(rows.flatMap((row) => row.activeStudentIds)).size,
    teachers: new Set(rows.map((row) => row.teacherId)).size,
  }), [rows]);
  if (loading) return <AdminLoading locale={locale} />;

  return (
    <div className="admin-page-stack admin-course-dashboard">
      <section className="admin-course-hero">
        <div>
          <span>{locale === "zh" ? "当前学期 · 只读看板" : "Current semester · Read-only"}</span>
          <h2>{locale === "zh" ? "课程目录看板" : "Course directory dashboard"}</h2>
          <p>{locale === "zh" ? "查看当前课程、学生参与和打卡运行情况。管理员只能查看，不能创建、编辑、关闭或删除课程。" : "Review current courses, student participation, and check-in activity. Administrators cannot create, edit, close, or delete courses."}</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void load()}>
          {locale === "zh" ? "刷新数据" : "Refresh"}
        </button>
      </section>

      <ErrorPanel error={error} locale={locale} />

      <section className="admin-course-metrics" aria-label={locale === "zh" ? "课程汇总" : "Course summary"}>
        <article><span>{locale === "zh" ? "当前课程数" : "Current courses"}</span><b>{summary.courses}</b><small>{locale === "zh" ? "当前学期未关闭课程" : "Open courses this semester"}</small></article>
        <article><span>{locale === "zh" ? "总学生数" : "Total students"}</span><b>{summary.students}</b><small>{locale === "zh" ? "当前课程有效成员去重" : "Unique active course members"}</small></article>
        <article><span>{locale === "zh" ? "总教师数" : "Total teachers"}</span><b>{summary.teachers}</b><small>{locale === "zh" ? "当前课程责任教师去重" : "Unique responsible teachers"}</small></article>
      </section>

      <section className="admin-surface admin-course-list-surface">
        <AdminSectionHeading
          title={locale === "zh" ? "课程列表" : "Courses"}
          description={locale === "zh" ? "只读查看当前全部课程。现有接口继续用；不新开放无接口能力。" : "Read-only view of current courses. Existing APIs stay in use; capabilities without an API are not opened."}
        />
        <div className="admin-audit-filters admin-course-filters">
          <AdminField locale={locale} label={locale === "zh" ? "搜索课程" : "Search courses"}>
            <input type="search" value={query} placeholder={locale === "zh" ? "课程名称或教师" : "Course name or teacher"} onChange={(event) => setQuery(event.target.value)} />
          </AdminField>
          <AppSelect
            label={locale === "zh" ? "课程状态" : "Course status"}
            value={status}
            options={[
              { value: "all", label: locale === "zh" ? "全部状态" : "All statuses" },
              { value: "ACTIVE", label: locale === "zh" ? "进行中" : "Active" },
              { value: "UPCOMING", label: locale === "zh" ? "即将开始" : "Upcoming" },
            ]}
            onChange={(value) => value && setStatus(String(value))}
          />
        </div>

        {filtered.length === 0 ? <AdminEmpty locale={locale} filtered={Boolean(query || status !== "all")} /> : (
          <div className="admin-course-cards">
            {filtered.map((row) => {
              const expanded = expandedId === row.id;
              const tone = row.status === "ACTIVE" ? "green" : row.status === "UPCOMING" ? "orange" : "gray";
              const averageSeconds = row.activeStudents > 0 ? row.creditedSeconds / row.activeStudents : 0;
              return (
                <article className={`admin-course-card${expanded ? " is-expanded" : ""}`} key={row.id}>
                  <div className="admin-course-card-head">
                    <div className="admin-course-identity">
                      <div><h3>{row.courseName}</h3><p>{row.teacherName}</p></div>
                    </div>
                    <AdminBadge tone={tone}>{row.status}</AdminBadge>
                  </div>
                  <div className="admin-course-card-stats">
                    <span><small>{locale === "zh" ? "有效学生" : "Students"}</small><b>{row.activeStudents}</b></span>
                    <span><small>{locale === "zh" ? "已提交学生" : "Submitted"}</small><b>{row.submittedStudents}</b></span>
                    <span><small>{locale === "zh" ? "打卡记录" : "Records"}</small><b>{row.totalRecords}</b></span>
                    <span><small>{locale === "zh" ? "有效 / 无效" : "Valid / invalid"}</small><b>{row.validRecords} / {row.invalidRecords}</b></span>
                    <span><small>{locale === "zh" ? "计入时长" : "Credited"}</small><b>{durationLabel(locale, row.creditedSeconds)}</b></span>
                  </div>
                  <div className="admin-course-hours admin-course-completion" aria-label={locale === "zh" ? `${row.courseName}完成全部打卡学生占比暂不可用` : `${row.courseName} full check-in completion rate unavailable`}>
                    <div>
                      <span>{locale === "zh" ? "完成全部打卡学生占比" : "Students completing all check-ins"}</span>
                      <b>—</b>
                      <small>{locale === "zh" ? "当前数据未提供完成全部目标的学生人数" : "The current data does not provide the number of students completing every target"}</small>
                    </div>
                    <div className="admin-course-hours-track is-unavailable" role="img" aria-label={locale === "zh" ? "暂无完成率数据" : "Completion-rate data unavailable"}>
                      <i />
                    </div>
                  </div>
                  <button className="admin-course-expand" type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : row.id)}>
                    {expanded ? (locale === "zh" ? "收起详情" : "Hide details") : (locale === "zh" ? "查看详情" : "View details")}
                    <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                  </button>
                  {expanded && (
                    <div className="admin-course-detail-grid">
                      <span><small>{locale === "zh" ? "当前学期" : "Semester"}</small><b>{row.semesterName}</b></span>
                      <span><small>{locale === "zh" ? "责任教师" : "Teacher"}</small><b>{row.teacherName}</b></span>
                      <span><small>{locale === "zh" ? "允许打卡时间" : "Check-in window"}</small><b>{row.checkInWindow}</b></span>
                      <span><small>{locale === "zh" ? "成员状态" : "Membership"}</small><b>{row.activeStudents} {locale === "zh" ? "名有效" : "active"} · {row.removedStudents} {locale === "zh" ? "名已移出" : "removed"}</b></span>
                      <span><small>{locale === "zh" ? "课程相关目标" : "Course target"}</small><b>{row.courseTargetSeconds === null ? "—" : durationLabel(locale, row.courseTargetSeconds)}</b></span>
                      <span><small>{locale === "zh" ? "其他运动目标" : "General target"}</small><b>{row.generalTargetSeconds === null ? "—" : durationLabel(locale, row.generalTargetSeconds)}</b></span>
                      <span><small>{locale === "zh" ? "人均计入时长" : "Average credited duration"}</small><b>{durationLabel(locale, averageSeconds)}</b></span>
                      <span><small>{locale === "zh" ? "入班状态" : "Enrollment"}</small><b>{row.enrollmentOpen ? (locale === "zh" ? "开放" : "Open") : (locale === "zh" ? "关闭" : "Closed")}</b></span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
