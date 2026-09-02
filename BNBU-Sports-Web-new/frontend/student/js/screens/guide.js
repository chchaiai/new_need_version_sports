// Onboarding guides (#4 pre-login, #14 post-enrollment)
// replicated from feature/guide/OnboardingGuideScreen.kt.

import { tx } from "../i18n.js";
import { icon } from "../icons.js";
import { esc } from "../ui.js";
import { localStore } from "../store.js";

function preLoginSteps() {
  return [
    {
      title: tx("先加入课程", "Join your course first"),
      eyebrow: tx("准备课程二维码或邀请码", "Have a course QR code or invitation code ready"),
      description: tx(
        "老师会提供课程二维码或邀请码。扫码或手动输入后，即可找到对应课程。",
        "Your teacher provides a course QR code or invitation code. Scan it or enter it manually to find the right course."
      ),
      artwork: "courseJoin",
    },
    {
      title: tx("确认并直接加入", "Confirm and join"),
      eyebrow: tx("核对信息后再加入", "Review before you join"),
      description: tx(
        "核对课程和个人资料后直接加入教学班；Backend 会校验身份、学期冲突和课程开放状态。",
        "Review the course and your details, then join the class section directly. Backend validates identity, semester conflicts, and enrolment availability."
      ),
      artwork: "joinRequest",
    },
  ];
}

function postEnrollmentSteps() {
  return [
    {
      title: tx("开始一次运动", "Start an activity"),
      eyebrow: tx("从首页或“运动”开始", "Start from Home or Exercise"),
      description: tx("选择课程和运动项目后开始计时，完成本次运动任务。", "Choose a course and an activity, then start timing your workout."),
      artwork: "startExercise",
    },
    {
      title: tx("记录运动过程", "Record your activity"),
      eyebrow: tx("计时、暂停后继续", "Time, pause, and resume"),
      description: tx("运动中可暂停后继续，并使用照片或视频记录现场过程。", "Pause and resume while you exercise, then use photos or video to capture the activity."),
      artwork: "exerciseRecord",
    },
    {
      title: tx("提交并查看记录", "Submit and review records"),
      eyebrow: tx("完成后确认并提交", "Confirm and submit when finished"),
      description: tx(
        "补充运动说明后，系统会提交当前保留的全部凭证；在“记录”中查看历史运动、时长和媒体。",
        "Add the exercise notes, then the app submits every retained proof item. Use Records to review exercise history, duration, and media."
      ),
      artwork: "submittedRecords",
    },
    {
      title: tx("需要时提交申请", "Apply when you need to"),
      eyebrow: tx("个人中心 · 服务", "Profile · Services"),
      description: tx(
        "可提交免测、校队或社团认证申请，并查看状态、补充材料或重新提交。",
        "Submit test-exemption, team, or club verification requests when needed, then review their status, add documents, or resubmit."
      ),
      artwork: "applications",
    },
  ];
}

// ── Artwork builders (schematic illustrations, no fabricated data) ──

function artworkIcon(name, container = "var(--color-primary-container)", content = "var(--color-primary)") {
  return `<span class="art-icon" style="background:${container};color:${content}">${icon(name, 21)}</span>`;
}

function statusArtworkRow(name, text, container, content, iconColor) {
  return `<div class="art-status-row" style="background:${container};color:${content}">
    <span style="color:${iconColor};display:inline-flex">${icon(name, 18)}</span>
    <span class="label-medium">${esc(text)}</span>
  </div>`;
}

function guideInfoRow(name, title) {
  return `<div class="row" style="gap:8px">
    <span class="text-primary" style="display:inline-flex">${icon(name, 18)}</span>
    <span class="label-medium text-on-surface grow">${esc(title)}</span>
    <span class="text-success" style="display:inline-flex">${icon("check", 16)}</span>
  </div>`;
}

function courseCodeMark() {
  let cells = "";
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 5; column++) {
      const filled = row === 0 || column === 0 || row === 4 || column === 4 || (row + column) % 3 === 0;
      cells += `<span class="qr-cell${filled ? " filled" : ""}"></span>`;
    }
  }
  return `<div class="course-code-mark">${cells}</div>`;
}

function evidencePill(name, label) {
  return `<span class="evidence-pill">${icon(name, 16)}<span class="label-medium">${esc(label)}</span></span>`;
}

const ARTWORKS = {
  courseJoin: () => `
    <div class="art-col">
      <div class="art-card row" style="gap:12px">
        ${artworkIcon("qr-code-scanner")}
        <div class="col">
          <div class="title-small text-on-surface">${tx("课程二维码或邀请码", "Course QR code or invitation code")}</div>
          <div class="body-small text-muted">${tx("由老师提供", "Provided by your teacher")}</div>
        </div>
      </div>
      <div class="row" style="gap:16px">
        ${courseCodeMark()}
        <div class="col grow" style="gap:8px">
          <div class="title-small text-on-surface">${tx("扫码或手动输入", "Scan or enter it manually")}</div>
          <span class="art-chip">${tx("下一步核对课程信息", "Next, review course details")}</span>
        </div>
      </div>
      ${statusArtworkRow("check", tx("两种方式都可加入课程", "Both options let you join"), "var(--color-secondary-container)", "var(--color-on-secondary-container)", "var(--color-secondary)")}
    </div>`,
  joinRequest: () => `
    <div class="art-col">
      <div class="art-card row" style="gap:12px">
        ${artworkIcon("menu-book")}
        <div class="col">
          <div class="title-small text-on-surface">${tx("核对课程信息", "Review course details")}</div>
          <div class="body-small text-muted">${tx("课程、教学班和老师", "Course, section, and instructor")}</div>
        </div>
      </div>
      <div class="art-card col" style="gap:8px">
        ${guideInfoRow("person", tx("确认个人资料", "Confirm your details"))}
        ${guideInfoRow("assignment", tx("确认身份并加入", "Confirm identity and join"))}
      </div>
      ${statusArtworkRow("check-circle", tx("加入成功后完成邮箱验证", "Verify email after joining"), "var(--color-secondary-container)", "var(--color-on-secondary-container)", "var(--color-secondary)")}
    </div>`,
  startExercise: () => `
    <div class="art-col" style="align-items:center">
      <div class="art-card row" style="gap:12px;width:100%">
        ${artworkIcon("menu-book")}
        <div class="col grow">
          <div class="title-small text-on-surface">${tx("选择课程和运动项目", "Choose a course and activity")}</div>
          <div class="body-small text-muted">${tx("从首页或“运动”进入", "Open it from Home or Exercise")}</div>
        </div>
      </div>
      <span class="art-play-circle">${icon("play-arrow", 48)}</span>
      ${statusArtworkRow("timer", tx("开始运动计时", "Start activity timing"), "var(--color-tertiary-container)", "var(--color-on-tertiary-container)", "var(--color-tertiary)")}
    </div>`,
  exerciseRecord: () => `
    <div class="art-col">
      <div class="row" style="gap:12px">
        ${artworkIcon("directions-run")}
        <span class="title-medium text-on-surface">${tx("运动中", "While exercising")}</span>
      </div>
      <div class="art-card col" style="gap:12px;padding:16px">
        <div class="row" style="gap:8px">
          <span class="text-primary" style="display:inline-flex">${icon("timer", 20)}</span>
          <span class="headline-small text-on-surface">00:32:18</span>
          <span class="grow"></span>
          <span class="art-pause-circle">${icon("pause", 20)}</span>
        </div>
        <div class="art-progress-track"><span style="width:62%"></span></div>
        <div class="row" style="gap:8px">
          ${evidencePill("camera-alt", tx("拍照", "Photo"))}
          ${evidencePill("videocam", tx("录像", "Video"))}
        </div>
      </div>
      <div class="row" style="gap:8px">
        <span class="text-muted" style="display:inline-flex">${icon("pause", 18)}</span>
        <span class="label-medium text-muted">${tx("暂停后可继续本次运动", "Resume this activity after a pause")}</span>
      </div>
    </div>`,
  submittedRecords: () => `
    <div class="art-col">
      <div class="row" style="gap:12px">
        ${artworkIcon("history")}
        <span class="title-medium text-on-surface">${tx("完成记录", "Complete record")}</span>
      </div>
      <div class="art-card col" style="gap:8px">
        ${guideInfoRow("description", tx("补充说明", "Add notes"))}
        ${guideInfoRow("camera-alt", tx("提交全部保留凭证", "Submit all retained proof"))}
        ${guideInfoRow("check", tx("提交本次打卡", "Submit this check-in"))}
      </div>
      ${statusArtworkRow("history", tx("在“记录”中查看历史", "Review history in Records"), "var(--color-tertiary-container)", "var(--color-on-tertiary-container)", "var(--color-tertiary)")}
    </div>`,
  applications: () => `
    <div class="art-col">
      <div class="row" style="gap:12px">
        ${artworkIcon("assignment")}
        <span class="title-medium text-on-surface">${tx("个人中心 · 服务", "Profile · Services")}</span>
      </div>
      <div class="row" style="gap:12px">
        <div class="art-card col grow" style="gap:8px;border-radius:var(--shape-medium)">
          <span class="text-primary" style="display:inline-flex">${icon("fitness-center", 22)}</span>
          <span class="label-medium text-on-surface">${tx("免测申请", "Test exemption")}</span>
        </div>
        <div class="art-card col grow" style="gap:8px;border-radius:var(--shape-medium)">
          <span class="text-primary" style="display:inline-flex">${icon("assignment", 22)}</span>
          <span class="label-medium text-on-surface">${tx("校队或社团", "Team or club")}</span>
        </div>
      </div>
      ${statusArtworkRow("upload-file", tx("查看状态、补充材料或重新提交", "Check status, add documents, or resubmit"), "var(--color-secondary-container)", "var(--color-on-secondary-container)", "var(--color-secondary)")}
    </div>`,
};

// ── Pager screen ──

function guideState(app, kind) {
  if (!app.ui.guide || app.ui.guide.kind !== kind) app.ui.guide = { kind, page: 0 };
  return app.ui.guide;
}

function renderGuidePager(app, { kind, headerTitle, steps, skipLabel, finalActionLabel }) {
  const ui = guideState(app, kind);
  const page = ui.page;
  const isLast = page === steps.length - 1;
  const dots = steps
    .map((_, index) => `<span class="guide-dot${index === page ? " active" : ""}"></span>`)
    .join("");
  return `<div class="screen guide-screen">
    <div class="guide-header">
      ${page > 0
        ? `<button class="icon-btn pressable guide-back" data-action="guide.back" aria-label="${tx("上一步", "Previous step")}">${icon("arrow-back", 24)}</button>`
        : `<span class="guide-back"></span>`}
      <span class="title-medium text-on-surface grow" style="text-align:center">${esc(headerTitle)}</span>
      <button class="text-btn pressable guide-skip" data-action="guide.skip">${esc(skipLabel)}</button>
    </div>
    <div class="guide-pager" data-guide-pager>
      <div class="guide-track" style="transform:translateX(-${page * 100}%)">
        ${steps
          .map(
            (step, index) => `<div class="guide-page${index === page ? " active" : ""}">
              <div class="guide-artwork">${ARTWORKS[step.artwork]()}</div>
              <div class="guide-detail">
                <div class="label-medium text-primary" style="font-weight:600;text-align:center">${esc(step.eyebrow)}</div>
                <div class="headline-large text-on-surface" style="text-align:center;margin-top:8px">${esc(step.title)}</div>
                <div class="body-large text-muted" style="text-align:center;margin-top:12px;max-width:340px">${esc(step.description)}</div>
              </div>
            </div>`
          )
          .join("")}
      </div>
    </div>
    <div class="guide-actions">
      <div class="row" style="gap:12px;justify-content:center">
        <span class="label-medium text-muted">${page + 1} / ${steps.length}</span>
        <span class="row" style="gap:6px">${dots}</span>
      </div>
      <div style="height:16px"></div>
      <button class="primary-btn pressable" data-action="guide.continue" style="height:52px">${isLast ? esc(finalActionLabel) : tx("继续", "Continue")}</button>
    </div>
  </div>`;
}

export function renderPreLoginGuide(app) {
  return renderGuidePager(app, {
    kind: "preLogin",
    headerTitle: tx("加入课程", "Join a course"),
    steps: preLoginSteps(),
    skipLabel: tx("直接登录", "Go to sign in"),
    finalActionLabel: tx("开始加入课程", "Start joining a course"),
  });
}

export function renderPostEnrollmentGuide(app) {
  return renderGuidePager(app, {
    kind: "postEnrollment",
    headerTitle: tx("运动指引", "Activity guide"),
    steps: postEnrollmentSteps(),
    skipLabel: tx("跳过", "Skip"),
    finalActionLabel: tx("进入首页", "Go to Home"),
  });
}

function stepsFor(app) {
  return app.ui.guide?.kind === "postEnrollment" ? postEnrollmentSteps() : preLoginSteps();
}

function completeGuide(app, finish) {
  const kind = app.ui.guide?.kind;
  app.ui.guide = null;
  if (kind === "postEnrollment") {
    localStore.markPostEnrollmentGuideCompleted(app.state.workspace.student.id);
    app.state.postEnrollmentGuideCompleted = true;
    app.navDirection = "forward";
    app.render();
    return;
  }
  localStore.markPreLoginCourseGuideCompleted();
  app.state.preLoginGuideCompleted = true;
  if (finish) {
    // Final action of the pre-login guide starts the QR join flow.
    app.state.showScanJoin = true;
    app.ui.scan = null;
  }
  app.navDirection = "forward";
  app.render();
}

export const guideActions = {
  "guide.back": (app) => {
    const ui = app.ui.guide;
    if (ui && ui.page > 0) {
      ui.page -= 1;
      app.render();
    }
  },
  "guide.skip": (app) => completeGuide(app, false),
  "guide.continue": (app) => {
    const ui = app.ui.guide;
    const steps = stepsFor(app);
    if (!ui) return;
    if (ui.page >= steps.length - 1) {
      completeGuide(app, true);
    } else {
      ui.page += 1;
      app.render();
    }
  },
};

// Pager back interception: page > 0 goes to the previous guide page.
export function guideBackInterceptor(app) {
  const key = app.screenKey();
  if ((key === "pre-guide" || key === "post-guide") && app.ui.guide && app.ui.guide.page > 0) {
    app.ui.guide.page -= 1;
    app.render();
    return true;
  }
  return false;
}

// Horizontal swipe support for the pager.
export function attachGuideSwipe(app) {
  const pager = app._viewport?.querySelector("[data-guide-pager]");
  if (!pager || pager.dataset.swipeBound) return;
  pager.dataset.swipeBound = "1";
  let startX = null;
  let startY = null;
  pager.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });
  pager.addEventListener("touchend", (event) => {
    if (startX === null) return;
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    startX = startY = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    const ui = app.ui.guide;
    if (!ui) return;
    const steps = stepsFor(app);
    if (dx < 0 && ui.page < steps.length - 1) { ui.page += 1; app.render(); }
    else if (dx > 0 && ui.page > 0) { ui.page -= 1; app.render(); }
  }, { passive: true });
}
