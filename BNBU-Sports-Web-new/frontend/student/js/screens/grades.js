// Sports progress / grades (#25) — feature/grades/GradesScreen.kt.
// Server-owned visibility and copy; missing data keeps its real placeholder.

import { tx } from "../i18n.js";
import { icon } from "../icons.js";
import { esc, sectionTitle } from "../ui.js";

const formatHours = (value) => (value % 1 === 0 ? String(Math.trunc(value)) : value.toFixed(1));

function formatRunTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}′${String(seconds).padStart(2, "0")}″`;
}

function cardTitle(iconName, title, supporting) {
  return `<div class="row">
    <span class="grade-card-icon">${icon(iconName, 21)}</span>
    <span style="width:12px"></span>
    <div class="col" style="gap:2px">
      <span class="title-medium text-on-surface">${esc(title)}</span>
      <span class="body-small text-muted">${esc(supporting)}</span>
    </div>
  </div>`;
}

export function renderGrades(app) {
  const workspace = app.state.workspace;
  const student = workspace.student;
  const grades = workspace.grades;
  const progress = workspace.progress;
  const rule = workspace.hourRule;

  const calculatedAt = (student.gradeCalculatedAt || "").trim().replace("T", " ").slice(0, 16);
  const headerCaption = calculatedAt
    ? tx(`本学期完成情况 · 更新于 ${calculatedAt}`, `This semester's progress · Updated ${calculatedAt}`)
    : tx("本学期完成情况", "This semester's progress");

  // — Endurance run card —
  const gender = String(student.gender || "").trim().toLowerCase();
  const distance = gender === "male" ? tx("1000 米", "1000 m") : gender === "female" ? tx("800 米", "800 m") : tx("800 米 / 1000 米", "800 m / 1000 m");
  const recordedTime = grades.enduranceRunTimeSeconds > 0 ? formatRunTime(grades.enduranceRunTimeSeconds) : null;
  const status = grades.enduranceRunStatus;
  let primary;
  let supporting;
  let score = grades.enduranceRunScore;
  if (status === "recorded") {
    primary = recordedTime || tx("暂未记录", "Not recorded");
    supporting = tx("耐力跑测试用时", "Endurance run time");
  } else if (status === "exempt") {
    primary = tx("免测", "Exempt");
    supporting = tx("耐力跑免测 · 教师评分", "Endurance exemption · Teacher-assigned score");
  } else if (status === "absent") {
    primary = tx("缺考（计0分）", "Absent (0 points)");
    supporting = tx("耐力跑缺考状态", "Endurance run absence");
    score = 0;
  } else {
    primary = tx("暂未记录", "Not recorded");
    supporting = tx("耐力跑测试用时", "Endurance run time");
    score = null;
  }
  const enduranceCard = `<div class="swiss-panel"><div class="col" style="gap:16px">
    ${cardTitle("directions-run", tx(`${distance} 跑步`, `${distance} run`), supporting)}
    <span class="headline-medium text-on-surface">${esc(primary)}</span>
    ${status === "exempt" || status === "absent"
      ? `<span class="body-medium text-muted">${score !== null && score !== undefined ? tx(`成绩：${score} 分`, `Score: ${score} points`) : tx("成绩：暂未评分", "Score: not assigned")}</span>`
      : ""}
  </div></div>`;

  // — Check-in hours card —
  const hasAuthoritativeTotal = Number.isFinite(progress.totalValidHours);
  const completed = hasAuthoritativeTotal
    ? Math.max(0, progress.totalValidHours)
    : 0;
  const hasAuthoritativeTarget = Number.isFinite(rule.total) && rule.total > 0;
  const required = hasAuthoritativeTarget ? Math.max(0, rule.total) : null;
  const remaining = hasAuthoritativeTotal && hasAuthoritativeTarget
    ? Math.max(0, required - completed)
    : null;
  const isComplete = progress.qualificationStatus === "QUALIFIED";
  const ratio = hasAuthoritativeTotal && hasAuthoritativeTarget
    ? Math.min(1, completed / required)
    : 0;
  const hoursSupporting = !hasAuthoritativeTarget
      ? tx("有效打卡时长已累计；学时目标等待后端同步", "Valid check-in hours are summed; the target is waiting for backend sync")
      : isComplete
      ? tx("已完成本学期打卡要求", "Semester check-in requirement complete")
      : remaining === 0
        ? tx("等待后端确认达标状态", "Waiting for backend qualification confirmation")
        : tx(`已按有效打卡累计，还需 ${formatHours(remaining)} 小时`, `Summed from valid check-ins; ${formatHours(remaining)} hours remaining`);
  const hoursCard = `<div class="swiss-panel"><div class="col" style="gap:16px">
    ${cardTitle("check-circle", tx("打卡学时", "Check-in hours"), hoursSupporting)}
    <div class="row" style="align-items:flex-end">
      <span class="headline-medium text-on-surface">${formatHours(completed)}</span>
      <span class="body-large text-muted" style="padding:0 0 3px 4px">${hasAuthoritativeTarget ? tx(` / ${formatHours(required)} 小时`, ` / ${formatHours(required)} hours`) : tx(" / 待后端同步", " / waiting for backend")}</span>
    </div>
    ${hasAuthoritativeTotal && hasAuthoritativeTarget ? `<div class="hour-progress" style="height:4px"><div class="fill" style="transform:scaleX(${ratio})"></div></div>` : ""}
    <div class="row">
      <div class="col grow" style="gap:2px">
        <span class="label-medium text-muted">${tx("课程相关", "Course-related")}</span>
        <span class="body-medium text-on-surface" style="font-weight:500">${tx(`${formatHours(progress.course)} 小时`, `${formatHours(progress.course)} hours`)}</span>
      </div>
      <span style="width:16px"></span>
      <div class="col grow" style="gap:2px">
        <span class="label-medium text-muted">${tx("其他运动", "Other exercise")}</span>
        <span class="body-medium text-on-surface" style="font-weight:500">${tx(`${formatHours(progress.general)} 小时`, `${formatHours(progress.general)} hours`)}</span>
      </div>
    </div>
  </div></div>`;

  return `<div class="tab-content col" style="gap:16px">
    <div class="col" style="gap:4px;padding-top:4px">
      ${sectionTitle(tx("体测与打卡", "Fitness & check-ins"))}
      <span class="body-medium text-muted">${esc(headerCaption)}</span>
    </div>
    ${enduranceCard}
    ${hoursCard}
    <div style="height:32px"></div>
  </div>`;
}
