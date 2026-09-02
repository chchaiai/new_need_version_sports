// Profile tab (#26), account details (#27) and settings (#28)
// — feature/profile/ProfileScreen.kt, AccountDetailsScreen.kt.

import { t, tx, getLanguage, currentLocale } from "../i18n.js";
import { icon } from "../icons.js";
import { esc, brandMark, sectionTitle, statusBadge, emptyPlaceholder, segmented, spinner, fieldLabel, fieldControlAttrs, fieldSupport, userFacingErrorPanel, focusFirstInvalidField } from "../ui.js";
import { localStore } from "../store.js";
import {
  ApiError,
  requestCurrentUserAccountDeletionChallenge,
  confirmCurrentUserAccountDeletion,
  toUserFacingError,
} from "../api.js";

function localizedGradeLabel(student) {
  switch (student.gradeLevel) {
    case "freshman": return tx("大一", "Year 1");
    case "sophomore": return tx("大二", "Year 2");
    case "junior": return tx("大三", "Year 3");
    case "senior": return tx("大四", "Year 4");
    default: return student.gradeLevel;
  }
}

function localizedGenderLabel(student) {
  switch (String(student.gender || "").trim().toLowerCase()) {
    case "male": return tx("男", "Male");
    case "female": return tx("女", "Female");
    default: return t("profile_pending");
  }
}

function localizedStudentStatusLabel(status) {
  return status === "ACTIVE" ? tx("已进班", "Enrolled") : tx("已退班", "Withdrawn");
}

function studentNumberForDisplay(student) {
  const value = String(student.id || "").trim();
  const isInternalReviewId = value === "LOCAL-REVIEW-STUDENT";
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
  return value && !isInternalReviewId && !isUuid
    ? value
    : tx("学号未提供", "Student number unavailable");
}

function displayDate(value) {
  const raw = value.slice(0, 10);
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return raw;
  // Construct as local time so a date-only string never shifts by timezone.
  return new Date(year, month - 1, day).toLocaleDateString(currentLocale(), { year: "numeric", month: "short", day: "numeric" });
}

// ── #26 Profile tab ──

function serviceShortcut({ title, description, iconName, action }) {
  return `<button class="service-shortcut pressable" data-action="${action}">
    <span class="service-shortcut-icon">${icon(iconName, 21)}</span>
    <div class="col" style="gap:4px;text-align:left;min-width:0">
      <span class="title-small text-on-surface ellipsis">${esc(title)}</span>
      <span class="label-medium text-muted ellipsis">${esc(description)}</span>
    </div>
  </button>`;
}

export function renderProfile(app) {
  const workspace = app.state.workspace;
  const student = workspace.student;
  const grade = localizedGradeLabel(student) || t("profile_pending_calculation");
  const studentNumber = studentNumberForDisplay(student);

  const header = `<div class="col" style="gap:14px">
    <div class="row">
      <span class="headline-large text-on-surface grow">${t("profile_heading")}</span>
      <button class="icon-btn pressable" data-action="profile.openSettings" aria-label="${t("profile_settings")}">${icon("settings", 24)}</button>
    </div>
    <button class="swiss-panel pressable" data-action="profile.openAccount" style="text-align:left" aria-label="${t("profile_account_details")}">
      <div class="col" style="gap:18px">
        <div class="row" style="gap:14px">
          ${brandMark(true)}
          <span class="headline-small text-on-surface grow ellipsis">${esc(student.name)}</span>
          ${statusBadge(localizedStudentStatusLabel(student.status), true)}
          <span class="text-muted" style="display:inline-flex">${icon("chevron-right", 20)}</span>
        </div>
        <div class="profile-facts">
          <div class="profile-fact"><span class="label-small text-muted">${t("profile_student_id_short")}</span><span class="label-medium text-on-surface ellipsis">${esc(studentNumber)}</span></div>
          <div class="profile-facts-row">
            <div class="profile-fact"><span class="label-small text-muted">${t("profile_class_short")}</span><span class="label-medium text-on-surface ellipsis">${esc(student.className || "—")}</span></div>
            <div class="profile-fact"><span class="label-small text-muted">${t("profile_grade_short")}</span><span class="label-medium text-on-surface ellipsis">${esc(grade)}</span></div>
          </div>
        </div>
      </div>
    </button>
  </div>`;

  const services = `<div class="col" style="gap:12px">
    ${sectionTitle(t("profile_services_title"))}
    <div class="row" style="gap:12px;align-items:stretch">
      ${serviceShortcut({ title: t("profile_exemption"), description: t("profile_exemption_short_hint"), iconName: "fitness-center", action: "profile.openExemption" })}
      ${serviceShortcut({ title: t("profile_endurance"), description: t("profile_endurance_short_hint"), iconName: "timer", action: "profile.openEndurance" })}
    </div>
  </div>`;

  const currentCourse = workspace.courses.find(
    (course) => course.isCurrent && course.enrollmentStatus === "enrolled",
  );
  const teachers = currentCourse?.teacher
    ? [{ teacherId: currentCourse.teacherId, teacherName: currentCourse.teacher }]
    : workspace.teachers.filter((teacher) => teacher.teacherId === currentCourse?.teacherId);
  const teacherPanel = teachers.length === 0 ? "" : `<div class="col" style="gap:12px">
    ${sectionTitle(t("profile_teacher_title"))}
    <div class="swiss-panel">
      ${teachers
        .map(
          (teacher, index) => `${index > 0 ? '<div class="course-divider"></div>' : ""}
          <div class="row" style="padding:12px 0;gap:12px">
            <span class="text-primary" style="display:inline-flex;flex:none">${icon("check-circle", 22)}</span>
            <div class="col grow" style="gap:4px">
              <span class="title-medium text-on-surface">${esc(teacher.teacherName)}</span>
              <span class="label-medium text-muted">${t("profile_teacher_role")}</span>
            </div>
          </div>`
        )
        .join("")}
    </div>
  </div>`;

  const memberships = workspace.memberships;
  const identityPanel = `<div class="col" style="gap:12px">
    ${sectionTitle(t("profile_identity_title"))}
    ${memberships.length === 0
      ? emptyPlaceholder(t("profile_no_memberships"), t("profile_no_memberships_hint"))
      : `<div class="swiss-panel">${memberships
          .map(
            (membership, index) => `${index > 0 ? '<div class="course-divider"></div>' : ""}
            <div class="col" style="gap:12px;padding:12px 0">
              <div class="col" style="gap:6px">
                <span class="title-medium text-on-surface">${esc(`${membership.type === "team" ? "校队" : "社团"} · ${membership.organization}`)}</span>
                ${membership.validUntil
                  ? `<span class="label-medium text-muted">${t("profile_valid_until", displayDate(membership.validUntil))}</span>`
                  : membership.submittedAt
                    ? `<span class="label-medium text-muted">${tx(`提交时间：${membership.submittedAt}`, `Submitted: ${membership.submittedAt}`)}</span>`
                    : ""}
                <div class="row" style="gap:8px">
                  ${statusBadge(membership.status, ["认证有效", "有效", "已通过"].includes(membership.status))}
                  ${membership.offset ? `<span class="label-medium text-primary">${t("profile_offset", esc(membership.offset))}</span>` : ""}
                </div>
              </div>
              ${membership.comment && membership.comment !== "offset" ? `<div class="membership-comment">
                <span class="text-primary" style="display:inline-flex;flex:none">${icon("notifications", 16)}</span>
                <span class="body-medium text-muted grow">${esc(membership.comment)}</span>
              </div>` : ""}
            </div>`
          )
          .join("")}</div>`}
  </div>`;

  return `<div class="tab-content col" style="gap:24px">
    ${header}
    ${services}
    ${teacherPanel}
    ${identityPanel}
    <div style="height:40px"></div>
  </div>`;
}

// ── #27 Account details ──

function accountDetailRow(label, value) {
  return `<div class="row" style="align-items:flex-start">
    <span class="body-medium text-muted" style="flex:none">${esc(label)}</span>
    <span style="width:12px"></span>
    <span class="body-medium text-on-surface grow" style="text-align:right">${esc(value)}</span>
  </div>`;
}

export function renderAccountDetails(app) {
  const student = app.state.workspace.student;
  const grade = localizedGradeLabel(student) || t("profile_pending_calculation");
  const gender = localizedGenderLabel(student);
  const studentNumber = studentNumberForDisplay(student);
  return `<div class="screen" style="background:transparent">
    <div class="screen-scroll" data-scroll-key="account-details">
      <div class="col" style="gap:16px">
        <button class="row pressable" data-action="profile.subBack" style="gap:8px;padding:12px 0 4px;width:100%;color:var(--color-on-surface)">
          ${icon("chevron-left", 24)}<span class="body-large">${t("common_back")}</span>
        </button>
        <div class="headline-small text-on-surface">${t("profile_account_details")}</div>
        <div class="swiss-panel">
          <div class="row" style="gap:14px">
            ${brandMark(true)}
            <span class="title-large text-on-surface grow ellipsis">${esc(student.name)}</span>
          </div>
        </div>
        <div class="swiss-panel"><div class="col" style="gap:14px">
          ${accountDetailRow(t("profile_name"), student.name)}
          ${accountDetailRow(t("profile_student_id"), studentNumber)}
          ${accountDetailRow(tx("学生状态", "Student status"), localizedStudentStatusLabel(student.status))}
          ${accountDetailRow(tx("性别", "Gender"), gender)}
          ${accountDetailRow(t("profile_class"), student.className)}
          ${accountDetailRow(t("profile_admission_year"), student.admissionYear ? String(student.admissionYear) : t("profile_pending"))}
          ${accountDetailRow(t("profile_current_grade"), grade)}
          ${student.currentAcademicYear ? accountDetailRow(t("profile_calculation_year"), student.currentAcademicYear) : ""}
        </div></div>
      </div>
    </div>
  </div>`;
}

// ── #28 Settings ──

function navigationRow(title, iconName, action, last = false) {
  return `<button class="settings-row pressable" data-action="${action}">
      <span class="text-primary" style="display:inline-flex;flex:none">${icon(iconName, 20)}</span>
      <span style="width:10px"></span>
      <span class="body-medium text-on-surface grow" style="text-align:left">${esc(title)}</span>
      <span class="text-muted" style="display:inline-flex">${icon("chevron-right", 18)}</span>
    </button>${last ? "" : '<div class="course-divider"></div>'}`;
}

export function renderSettings(app) {
  const themeMode = localStore.getThemeMode();
  const language = getLanguage();
  return `<div class="screen" style="background:transparent">
    <div class="screen-scroll" data-scroll-key="settings">
      <div class="col" style="gap:16px">
        <button class="row pressable" data-action="profile.settingsBack" style="gap:8px;padding:12px 0 4px;width:100%;color:var(--color-on-surface)">
          ${icon("chevron-left", 24)}<span class="body-large">${t("common_back")}</span>
        </button>
        <div class="headline-small text-on-surface">${t("profile_settings")}</div>

        <div class="swiss-panel">
          <div class="title-medium text-on-surface" style="padding-bottom:4px">${t("profile_account_security")}</div>
          ${navigationRow(t("profile_login_contacts"), "email", "profile.openBinding")}
          ${navigationRow(tx("注销账户", "Delete account"), "delete", "profile.openAccountDeletion", true)}
        </div>

        <div class="swiss-panel"><div class="col" style="gap:12px">
          <div class="title-medium text-on-surface">${t("profile_preferences")}</div>
          <div class="title-medium text-on-surface">${t("profile_appearance")}</div>
          ${segmented({
            items: [
              { value: "light", label: t("theme_light") },
              { value: "dark", label: t("theme_dark") },
              { value: "system", label: t("theme_system") },
            ],
            selected: themeMode,
            action: "profile.theme",
          })}
          <div class="body-small text-muted">${t("profile_appearance_hint")}</div>
          <div class="course-divider"></div>
          <div class="title-medium text-on-surface">${t("profile_language")}</div>
          ${segmented({
            items: [
              { value: "zh", label: t("profile_chinese") },
              { value: "en", label: t("profile_english") },
            ],
            selected: language,
            action: "profile.language",
          })}
          <div class="body-small text-muted">${t("profile_language_hint")}</div>
        </div></div>

        <div class="swiss-panel">
          <div class="title-medium text-on-surface" style="padding-bottom:4px">${t("profile_help_support")}</div>
          ${navigationRow(t("profile_help_center"), "help-outline", "profile.openHelp")}
          ${navigationRow(t("profile_privacy"), "fitness-center", "profile.openPrivacy")}
          ${navigationRow(t("profile_feedback"), "notifications", "profile.openFeedback")}
          ${navigationRow(t("profile_about"), "info-outline", "profile.openAbout", true)}
        </div>

        <button class="logout-card pressable" data-action="profile.logoutConfirm">
          <span class="text-error" style="display:inline-flex">${icon("close", 20)}</span>
          <span class="title-medium grow" style="color:var(--color-on-error-container);text-align:left">${t("profile_logout")}</span>
          <span class="text-error" style="display:inline-flex">${icon("chevron-right", 20)}</span>
        </button>
        <div style="height:40px"></div>
      </div>
    </div>
  </div>`;
}

function accountDeletionState(app) {
  if (!app.ui.accountDeletion) {
    app.ui.accountDeletion = {
      challengeId: null,
      challengeVersion: null,
      expiresAt: null,
      code: "",
      busy: false,
      error: null,
    };
  }
  return app.ui.accountDeletion;
}

export function renderAccountDeletion(app) {
  const state = accountDeletionState(app);
  const student = app.state.workspace.student;
  const codeError = state.code !== "" && !/^\d{4,10}$/u.test(state.code);
  const challengeReady = typeof state.challengeId === "string" && Number.isInteger(state.challengeVersion) && state.challengeVersion > 0;
  return `<div class="screen" style="background:transparent">
    <div class="screen-scroll" data-scroll-key="account-deletion">
      <div class="col" style="gap:16px">
        <button class="row pressable" data-action="profile.accountDeletionBack" ${state.busy ? "disabled" : ""} style="gap:8px;padding:12px 0 4px;width:100%;color:var(--color-on-surface)">
          ${icon("chevron-left", 24)}<span class="body-large">${t("common_back")}</span>
        </button>
        <div class="headline-small text-on-surface">${tx("注销账户", "Delete account")}</div>
        <div class="swiss-panel col" style="gap:12px;border:1px solid var(--color-error)">
          <div class="title-medium text-error">${tx("这是不可恢复的危险操作", "This is an irreversible action")}</div>
          <div class="body-medium text-on-surface">${tx("注销后，当前账号会立即停用，所有设备的登录会话、刷新令牌和推送设备关联都会失效。", "Deletion immediately disables this account and revokes sign-ins, refresh tokens, and push-device links on every device.")}</div>
          <div class="body-medium text-on-surface">${tx("可识别个人资料会删除或去标识化；为保证成绩、审核和审计完整性必须保留的记录会以匿名方式继续保存。", "Identifying profile data is removed or de-identified. Records required for grades, reviews, and audit integrity remain anonymously.")}</div>
          <div class="body-medium text-on-surface">${tx("以后再次注册会创建全新的账号，不会恢复这一个账号或它的历史身份。", "A later registration creates a new account; this identity and its old account are never restored.")}</div>
        </div>
        ${challengeReady ? `<div class="swiss-panel col" style="gap:14px">
          <div class="title-medium text-on-surface">${tx("验证当前邮箱", "Verify your current email")}</div>
          <div class="body-small text-muted">${tx(`验证码已发送到当前已验证邮箱 ${student.email || ""}，有效期约 10 分钟。`, `A code was sent to the current verified email ${student.email || ""} and is valid for about 10 minutes.`)}</div>
          <div class="col">
            ${fieldLabel({ id: "account-deletion-code", label: tx("邮箱验证码", "Email verification code"), required: true })}
            <div style="height:8px"></div>
            <div class="vfield${codeError ? " error" : ""}${state.busy ? " disabled" : ""}">
              <span class="vfield-icon">${icon("lock", 20)}</span>
              <input ${fieldControlAttrs({ id: "account-deletion-code", error: codeError ? tx("请输入 4–10 位数字验证码。", "Enter the 4–10 digit code.") : null, required: true })} class="vfield-input code-style" type="text" inputmode="numeric" maxlength="10" autocomplete="one-time-code" value="${esc(state.code)}" data-input="profile.accountDeletionCode" ${state.busy ? "disabled" : ""} />
            </div>
            ${fieldSupport({ id: "account-deletion-code", error: codeError ? tx("请输入 4–10 位数字验证码。", "Enter the 4–10 digit code.") : null, helper: tx("验证码只用于这次注销确认。", "The code is used only for this deletion confirmation.") })}
          </div>
          <button class="vlogin-submit pressable" data-action="profile.accountDeletionFinalConfirm" ${state.busy ? "disabled" : ""} style="background:var(--color-error)">
            ${state.busy ? `${spinner(18, "on-primary")}<span style="width:10px"></span>` : ""}<span class="title-medium">${tx("最终确认注销", "Final deletion confirmation")}</span>
          </button>
        </div>` : `<button class="vlogin-submit pressable" data-action="profile.accountDeletionRequestConfirm" ${state.busy ? "disabled" : ""} style="background:var(--color-error)">
          ${state.busy ? `${spinner(18, "on-primary")}<span style="width:10px"></span>` : ""}<span class="title-medium">${tx("开始注销验证", "Start deletion verification")}</span>
        </button>`}
        ${state.error ? userFacingErrorPanel(state.error, { compact: true }) : ""}
        <div style="height:40px"></div>
      </div>
    </div>
  </div>`;
}

export const profileActions = {
  "profile.openSettings": (app) => app.openSub("settings"),
  "profile.openAccount": (app) => app.openSub("account"),
  "profile.openExemption": (app) => app.openSub("exemption", { targetId: null }),
  "profile.openEndurance": (app) => {
    app.ui.endurance = null;
    app.openSub("endurance");
  },
  "profile.subBack": (app) => app.closeSub(),
  "profile.settingsBack": (app) => app.closeSub(),
  "profile.openBinding": (app) => {
    app.ui.binding = null;
    app.openSub("binding");
  },
  "profile.openHelp": (app) => {
    app.ui.help = null;
    app.openSub("help");
  },
  "profile.openPrivacy": (app) => app.openSub("privacy"),
  "profile.openFeedback": (app) => {
    app.ui.feedback = null;
    app.openSub("feedback");
  },
  "profile.openAbout": (app) => app.openSub("about"),
  "profile.openAccountDeletion": (app) => {
    app.ui.accountDeletion = null;
    app.openSub("accountDeletion");
  },
  "profile.accountDeletionBack": (app) => {
    if (accountDeletionState(app).busy) return;
    app.ui.accountDeletion = null;
    app.closeSub();
  },
  "profile.accountDeletionCode": (app, el) => {
    const state = accountDeletionState(app);
    state.code = String(el.value || "").replace(/\D/gu, "").slice(0, 10);
    state.error = null;
    app.render();
  },
  "profile.accountDeletionRequestConfirm": (app) => {
    app.showDialog({
      title: tx("确认开始注销验证", "Start deletion verification?"),
      body: tx("下一步会向当前已验证邮箱发送验证码。账号此时还不会注销。", "The next step sends a code to the current verified email. The account is not deleted yet."),
      buttons: [
        { label: t("common_cancel"), action: "dialog.close" },
        { label: tx("发送验证码", "Send code"), action: "profile.accountDeletionRequest" },
      ],
    });
  },
  "profile.accountDeletionRequest": async (app) => {
    app.state.dialog = null;
    const state = accountDeletionState(app);
    state.busy = true;
    state.error = null;
    app.render();
    try {
      const result = await requestCurrentUserAccountDeletionChallenge(
        app.state.workspace.student.userVersion,
      );
      state.challengeId = result.challengeId;
      state.challengeVersion = result.version;
      state.expiresAt = result.expiresAt || null;
      state.code = "";
    } catch (error) {
      state.error = toUserFacingError(error);
    } finally {
      state.busy = false;
      app.render();
    }
  },
  "profile.accountDeletionFinalConfirm": (app) => {
    const state = accountDeletionState(app);
    if (!/^\d{4,10}$/u.test(state.code)) {
      app.render();
      focusFirstInvalidField(app._viewport, ["#account-deletion-code"]);
      return;
    }
    app.showDialog({
      title: tx("最后确认：注销账户", "Final confirmation: delete account"),
      body: tx("确认后账号立即停用，所有设备退出登录，且无法恢复。", "Confirming immediately disables the account, signs out every device, and cannot be undone."),
      dismissible: false,
      buttons: [
        { label: t("common_cancel"), action: "dialog.close" },
        { label: tx("确认永久注销", "Permanently delete"), action: "profile.accountDeletionFinalize" },
      ],
    });
  },
  "profile.accountDeletionFinalize": async (app) => {
    app.state.dialog = null;
    const state = accountDeletionState(app);
    if (!state.challengeId || !Number.isInteger(state.challengeVersion)) return;
    state.busy = true;
    state.error = null;
    app.render();
    try {
      await confirmCurrentUserAccountDeletion(
        state.challengeId,
        state.challengeVersion,
        state.code,
      );
      app.logout({ clearAccountData: true });
    } catch (error) {
      if (error instanceof ApiError && Number.isInteger(error.details?.actualVersion)) {
        state.challengeVersion = error.details.actualVersion;
      }
      if (error instanceof ApiError && error.code === "ACCOUNT_DELETION_REAUTH_REQUIRED") {
        state.challengeId = null;
        state.challengeVersion = null;
        state.expiresAt = null;
        state.code = "";
      }
      state.error = toUserFacingError(error);
      state.busy = false;
      app.render();
    }
  },
  "profile.theme": (app, el) => {
    app.setThemeMode(el.dataset.value);
  },
  "profile.language": (app, el) => {
    if (el.dataset.value !== getLanguage()) app.setAppLanguage(el.dataset.value);
  },
  "profile.logoutConfirm": (app) => {
    app.showDialog({
      title: t("profile_logout"),
      body: t("profile_logout_confirmation_message"),
      buttons: [
        { label: t("common_cancel"), action: "dialog.close" },
        { label: t("profile_logout"), action: "profile.logout" },
      ],
    });
  },
  "profile.logout": (app) => {
    app.state.dialog = null;
    app.logout();
  },
};
