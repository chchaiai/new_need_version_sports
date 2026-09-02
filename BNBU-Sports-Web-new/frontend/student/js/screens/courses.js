// Course list (#17) and course detail (#18) — feature/courses/CoursesScreen.kt.

import { tx } from "../i18n.js";
import { icon } from "../icons.js";
import { esc } from "../ui.js";
import { localizedJoinStatus } from "./join.js";

function enrollmentStatusLabel(status) {
  switch (status) {
    case "enrolled": return tx("修读中", "In progress");
    case "completed": return tx("已完成", "Complete");
    case "withdrawn": return tx("已退课", "Withdrawn");
    default: return status || tx("待确认", "Pending");
  }
}

function statusPill(text, { emphasized = false, destructive = false } = {}) {
  const cls = destructive ? "destructive" : emphasized ? "emphasized" : "";
  return `<span class="course-pill ${cls}">${esc(text)}</span>`;
}

function courseMetaLine(iconName, text) {
  return `<div class="row" style="gap:10px">
    <span class="text-muted" style="display:inline-flex;flex:none">${icon(iconName, 19)}</span>
    <span class="ellipsis" style="font-size:15px;line-height:20px;color:var(--color-on-surface)">${esc(text)}</span>
  </div>`;
}

function courseCard(course) {
  return `<button class="course-card pressable" data-action="courses.open" data-course-id="${esc(course.id)}">
    <div class="row" style="align-items:flex-start">
      <div class="col grow" style="gap:5px;text-align:left">
        <span style="font-size:20px;line-height:26px;font-weight:600;color:var(--color-on-surface)">${esc(course.name)}</span>
      </div>
      <span style="width:10px"></span>
      <span class="text-muted" style="display:inline-flex;padding-top:2px">${icon("chevron-right", 22)}</span>
    </div>
    <div class="course-divider"></div>
    <div class="col" style="gap:10px;text-align:left">
      ${courseMetaLine("person-outline", course.teacher || tx("任课教师待公布", "Instructor to be announced"))}
      ${courseMetaLine("event", course.semester || tx("学期待定", "Semester pending"))}
    </div>
    <div class="row" style="gap:10px">
      ${statusPill(enrollmentStatusLabel(course.enrollmentStatus), { emphasized: course.enrollmentStatus === "enrolled" })}
      <span class="grow ellipsis" style="font-size:13px;line-height:18px;color:var(--color-on-surface-variant);text-align:left">${esc(course.semester || tx("学期待定", "Semester pending"))}</span>
    </div>
  </button>`;
}

function sectionHeader(title, count, unit) {
  return `<div class="row" style="padding-top:4px">
    <span class="grow" style="font-size:20px;line-height:25px;font-weight:600;color:var(--color-on-background)">${esc(title)}</span>
    <span style="font-size:15px;line-height:20px;color:var(--color-on-surface-variant)">${count} ${esc(unit)}</span>
  </div>`;
}

export function renderCourses(app) {
  if (!app.ui.courses) app.ui.courses = { selectedCourseId: null };
  const ui = app.ui.courses;
  const workspace = app.state.workspace;
  const currentCourses = workspace.courses.filter((course) => course.isCurrent && course.enrollmentStatus === "enrolled");
  const selected = ui.selectedCourseId ? currentCourses.find((course) => course.id === ui.selectedCourseId) : null;
  if (selected) return renderCourseDetail(app, selected);

  const subtitle = currentCourses.length === 0
    ? tx("课程同步后将在这里显示", "Your courses will appear here after syncing.")
    : tx(`${currentCourses.length} 门课程正在修读`, `${currentCourses.length} courses in progress`);

  const request = workspace.courseJoinRequest;
  const hasPendingJoinRequest = request && request.status !== "ACTIVE";

  let listBody = "";
  if (currentCourses.length === 0) {
    listBody = `<div class="course-card" style="padding:24px 20px">
      <div class="col" style="gap:7px">
        <span style="font-size:20px;line-height:25px;font-weight:600;color:var(--color-on-surface)">${tx("还没有课程", "No courses yet")}</span>
        <span style="font-size:15px;line-height:22px;color:var(--color-on-surface-variant)">${tx("扫描教师提供的二维码或输入邀请码，加入体育教学班。", "Scan your instructor's QR code or enter an invitation code to join a class.")}</span>
      </div>
    </div>`;
  } else {
    listBody = sectionHeader(tx("本学期", "This semester"), currentCourses.length, tx("门", "courses"));
    listBody += currentCourses.map((course) => courseCard(course)).join("");
  }

  return `<div class="tab-content col" style="gap:20px;padding-top:8px">
    <div class="col" style="gap:5px">
      <span class="course-large-title">${tx("我的课程", "My courses")}</span>
      <span style="font-size:17px;line-height:23px;color:var(--color-on-surface)">${esc(subtitle)}</span>
      <span style="font-size:13px;line-height:18px;color:var(--color-on-surface-variant)">${tx("每学期仅可选择一门课程", "You may select one course per semester.")}</span>
    </div>
    ${hasPendingJoinRequest ? `
      <button class="course-card pressable" data-action="join.openStatus" style="padding:16px 18px">
        <div class="row">
          <div class="col grow" style="gap:5px;text-align:left">
            <span style="font-size:17px;line-height:22px;font-weight:600;color:var(--color-on-surface)">${tx("课程加入申请", "Course join request")}</span>
            <span style="font-size:14px;line-height:19px;color:var(--color-on-surface-variant)">${esc(request.courseName || tx("课程", "Course"))}</span>
          </div>
          ${statusPill(localizedJoinStatus(request.status), { emphasized: request.status === "PENDING" })}
          <span style="width:8px"></span>
          <span class="text-muted" style="display:inline-flex">${icon("chevron-right", 20)}</span>
        </div>
      </button>` : ""}
    ${listBody}
    ${app.canStartNewCourseJoin() ? `<div class="col" style="gap:10px">
      <button class="primary-btn pressable" data-action="courses.scan" style="min-height:52px">
        ${icon("qr-code-scanner", 20)}<span style="font-size:16px;font-weight:600">${tx("扫描二维码", "Scan QR code")}</span>
      </button>
      <button class="outlined-btn pressable" data-action="courses.enterCode" style="min-height:52px;border-radius:14px">
        ${icon("text-fields", 20)}<span style="font-size:16px;font-weight:600">${tx("输入邀请码", "Enter invitation code")}</span>
      </button>
    </div>` : ""}
  </div>`;
}

function detailFactRow(label, value, last) {
  return `<div class="row" style="min-height:48px;padding:12px 0;align-items:flex-start">
      <span style="width:80px;flex:none;font-size:14px;line-height:20px;color:var(--color-on-surface-variant)">${esc(label)}</span>
      <span style="width:12px"></span>
      <span class="grow" style="font-size:15px;line-height:20px;color:var(--color-on-surface)">${esc(value)}</span>
    </div>${last ? "" : `<div class="course-divider" style="margin-left:92px"></div>`}`;
}

function renderCourseDetail(app, course) {
  const facts = [
    [tx("任课教师", "Instructor"), course.teacher || tx("待公布", "To be announced")],
    [tx("开课学期", "Teaching term"), course.semester || tx("学期待定", "Semester pending")],
  ];
  return `<div class="tab-content col anim-enter-forward" style="gap:18px;padding-top:2px">
    <button class="row pressable" data-action="courses.backToList" style="min-height:48px;color:var(--color-primary)">
      <span style="display:inline-flex;padding:0 10px">${icon("arrow-back", 24)}</span>
      <span style="font-size:17px;line-height:22px">${tx("我的课程", "My courses")}</span>
    </button>
    <div class="col" style="gap:8px">
      <span style="font-size:30px;line-height:37px;font-weight:700;letter-spacing:-0.25px;color:var(--color-on-background)">${esc(course.name)}</span>
      <div class="row" style="gap:10px">
        ${statusPill(enrollmentStatusLabel(course.enrollmentStatus), { emphasized: course.enrollmentStatus === "enrolled" })}
        <span class="grow ellipsis" style="font-size:13px;line-height:18px;color:var(--color-on-surface-variant)">${esc(course.semester || tx("学期待定", "Semester pending"))}</span>
      </div>
    </div>
    <div class="course-card" style="padding:16px 18px">${facts.map((f, i) => detailFactRow(f[0], f[1], i === facts.length - 1)).join("")}</div>
  </div>`;
}

export const coursesActions = {
  "courses.open": (app, el) => {
    app.ui.courses.selectedCourseId = el.dataset.courseId;
    app.navDirection = "forward";
    app.render();
  },
  "courses.backToList": (app) => {
    app.ui.courses.selectedCourseId = null;
    app.navDirection = "back";
    app.render();
  },
  "courses.scan": (app) => {
    app.ui.scan = null;
    app.openSub("scan", {});
  },
  "courses.enterCode": (app) => {
    app.ui.enterCode = null;
    app.openSub("enterCode", {});
  },
};

// Course detail intercepts back to return to the list (返回规则).
export function coursesBackInterceptor(app) {
  if (app.screenKey() === "tab-courses" && app.ui.courses?.selectedCourseId) {
    app.ui.courses.selectedCourseId = null;
    app.navDirection = "back";
    app.render();
    return true;
  }
  return false;
}
