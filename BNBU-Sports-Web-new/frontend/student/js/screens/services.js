// Endurance / fitness-test view (#35). Students only see confirmed time or exemption.
// Exemption applications (#36) — exemption/ExemptionScreen.kt
// Exemption applications use the authenticated `/api/v1` draft/upload/update/submit workflow.

import { t, tx } from "../i18n.js";
import { icon } from "../icons.js";
import { validateProofFile } from "../proofs.js";
import { esc, spinner, emptyPlaceholder, validationPanel, sectionTitle, statusBadge, statusMessagePanel, segmented, actionButton, fieldLabel, fieldControlAttrs, fieldSupport, userFacingErrorPanel, focusFirstInvalidField } from "../ui.js";
import {
  ApiError,
  createExemptionApplication,
  createMediaAccessUrl,
  mapStructuredExemptionApplication,
  proxyObjectUrl,
  submitExemptionApplication,
  toUserFacingError,
  updateExemptionApplication,
  uploadExemptionApplicationMediaDraft,
} from "../api.js";

// ═══════════════════════════════════════════════════════════════
//  #35 Endurance scoring
// ═══════════════════════════════════════════════════════════════

function formatRunTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}′${String(seconds).padStart(2, "0")}″`;
}

function demographicLabel(student) {
  const gender = student.gender === "male" ? tx("男", "Male") : student.gender === "female" ? tx("女", "Female") : student.gender;
  const grade = { freshman: tx("大一", "Year 1"), sophomore: tx("大二", "Year 2"), junior: tx("大三", "Year 3"), senior: tx("大四", "Year 4") }[student.gradeLevel] || student.gradeLevel;
  return [gender, grade].filter(Boolean).join(" · ");
}

export function renderEnduranceScoring(app) {
  const student = app.state.workspace.student;
  const grades = app.state.workspace.grades || {};
  const runType = student.gender === "male" ? "1000m" : student.gender === "female" ? "800m" : "800m / 1000m";
  const label = demographicLabel(student);
  const status = grades.enduranceRunStatus;
  const recordedTime = grades.enduranceRunTimeSeconds > 0 ? formatRunTime(grades.enduranceRunTimeSeconds) : null;
  let primary = tx("暂未记录", "Not recorded");
  let hint = tx("只显示教师已确认的项目、用时或免测。没有换算分或等级。", "Only the confirmed event, time, or exemption is shown. No converted scores or bands.");
  if (status === "recorded") {
    primary = recordedTime || primary;
    hint = tx("已确认的测试用时", "Confirmed test time");
  } else if (status === "exempt") {
    primary = tx("免测", "Exempt");
    hint = tx("不记录真实用时，不产生换算分", "No recorded time and no converted score");
  }

  return `<div class="screen" style="background:transparent">
    <div class="screen-scroll" data-scroll-key="endurance">
      <div class="col" style="gap:0">
        <button class="row pressable" data-action="services.back" style="height:48px;width:100%;color:var(--color-on-surface)">
          ${icon("chevron-left", 24)}<span class="body-medium">${t("common_back")}</span>
        </button>
        <div style="height:16px"></div>
        ${sectionTitle(t("endurance_title"))}
        <div style="height:8px"></div>
        <div class="swiss-panel">
          <div class="row" style="gap:8px">
            <span class="text-primary" style="display:inline-flex;flex:none">${icon("fitness-center", 22)}</span>
            <div class="col">
              <span class="title-medium text-on-surface">${t("endurance_test", runType)}</span>
              <span class="body-medium text-muted">${esc(label)}</span>
            </div>
          </div>
        </div>
        <div style="height:12px"></div>
        <div class="swiss-panel">
          <div class="headline-medium text-on-surface">${esc(primary)}</div>
          <div style="height:8px"></div>
          <div class="body-small text-muted">${esc(hint)}</div>
        </div>
        <div style="height:28px"></div>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  #36 Exemptions
// ═══════════════════════════════════════════════════════════════

const EXEMPTION_TYPES = {
  "800m": { checkIn: false, applicationType: "PHYSICAL_TEST", applicationSubtype: "RUN_800M" },
  "1000m": { checkIn: false, applicationType: "PHYSICAL_TEST", applicationSubtype: "RUN_1000M" },
  team: { checkIn: true, applicationType: "EXERCISE_CHECK_IN", applicationSubtype: "SCHOOL_TEAM" },
  club: { checkIn: true, applicationType: "EXERCISE_CHECK_IN", applicationSubtype: "STUDENT_CLUB" },
};
const MAX_EXEMPTION_REASON = 1000;
const MAX_EXEMPTION_MEDIA_ITEMS = 20;

export function enduranceExemptionTypeForGender(gender) {
  switch (String(gender || "").trim().toLowerCase()) {
    case "male": return "1000m";
    case "female": return "800m";
    default: return null;
  }
}

const exemptionTypeLabel = (type) => ({
  "800m": tx("800m 免测", "800 m test exemption"),
  "1000m": tx("1000m 免测", "1000 m test exemption"),
  team: tx("校队免打卡", "Team check-in exemption"),
  club: tx("社团免打卡", "Club check-in exemption"),
}[type] || type);

const exemptionTypeOptionLabel = (type) => ({
  "800m": tx("800m 耐力跑免测", "800 m endurance-run exemption"),
  "1000m": tx("1000m 耐力跑免测", "1000 m endurance-run exemption"),
  team: tx("校队免打卡", "School-team check-in exemption"),
  club: tx("社团免打卡", "Student-club check-in exemption"),
}[type] || type);

function applicationFieldLabel(id, label) {
  return `<label class="application-field-label" for="${esc(id)}"><span>${esc(label)}</span><span>${tx("必填", "Required")}</span></label>`;
}

function applicationFieldSupport({ id, counterKey, error = null, helper, current, maximum }) {
  const counterPersistent = current >= Math.max(0, maximum - 16);
  return `<div id="${esc(id)}-support" class="application-field-support${error ? " error" : ""}" ${error ? 'role="alert"' : ""}>
    <span>${esc(error || helper)}</span>
    <span class="application-field-counter${counterPersistent ? " persistent" : ""}" data-exemption-counter="${esc(counterKey)}">${current}/${maximum}</span>
  </div>`;
}

const exemptionStatusLabel = (status) => ({
  待审核: tx("审核中", "Under review"), 审核中: tx("审核中", "Under review"),
  需补材料: tx("需补材料", "Additional materials required"),
  已通过: tx("已通过", "Approved"), 已驳回: tx("已驳回", "Rejected"), 已过期: tx("已过期", "Expired"),
}[status] || status);

function exemptionState(app, params = {}) {
  if (!app.ui.exemption) {
    const student = app.state.workspace.student;
    const enduranceType = enduranceExemptionTypeForGender(student.gender);
    app.ui.exemption = {
      tab: "applications",
      selectedId: params.targetId || null,
      resubmitting: null,
      error: null,
      errorField: null,
      success: null,
      submitting: false,
      serverDraft: null,
      proofPreviewUrls: {},
      proofPreviewLoading: false,
      proofPreviewError: null,
      form: {
        type: enduranceType || "team",
        organization: "",
        reason: "",
        proofs: [],
        notice: null,
      },
    };
  } else if (params.targetId && app.ui.exemption.selectedId !== params.targetId && !app.ui.exemption._consumedTarget) {
    app.ui.exemption.selectedId = params.targetId;
    app.ui.exemption._consumedTarget = true;
  }
  return app.ui.exemption;
}

function exemptionCard(exemption) {
  return `<button class="swiss-panel pressable" data-action="exemption.open" data-exemption-id="${esc(exemption.id)}" style="text-align:left">
    <div class="row" style="align-items:flex-start;gap:10px">
      <span class="text-primary" style="display:inline-flex;flex:none">${icon("fitness-center", 22)}</span>
      <div class="col grow" style="gap:8px">
        <div class="row">
          <span class="title-medium text-on-surface grow">${exemptionTypeLabel(exemption.type)}</span>
          ${statusBadge(exemptionStatusLabel(exemption.status), exemption.status === "已通过")}
        </div>
        ${exemption.reason ? `<div class="row" style="align-items:flex-start;gap:6px">
          <span class="text-muted" style="display:inline-flex;flex:none">${icon("description", 16)}</span>
          <span class="body-medium text-muted">${esc(exemption.reason)}</span>
        </div>` : ""}
        ${exemption.organization ? `<span class="body-medium text-muted">${tx(`所属组织：${exemption.organization}`, `Organization: ${exemption.organization}`)}</span>` : ""}
        ${exemption.proofFiles.length ? `<span class="label-medium text-primary">${tx(`已上传 ${exemption.proofFiles.length} 张证明图片`, `${exemption.proofFiles.length} proof image(s) uploaded`)}</span>` : ""}
        ${exemption.reviewComment ? `<div class="membership-comment">
          <span class="text-primary" style="display:inline-flex;flex:none">${icon("warning", 16)}</span>
          <div class="col">
            <span class="label-medium text-on-surface">${tx("审核意见", "Review comments")}</span>
            <span class="body-small text-muted">${esc(exemption.reviewComment)}</span>
          </div>
        </div>` : ""}
        <span class="label-medium text-muted">${tx(`提交时间：${exemption.createdAt} · 点击查看详情`, `Submitted: ${exemption.createdAt} · View details`)}</span>
      </div>
    </div>
  </button>`;
}

function exemptionProofDescriptor(proof, index, previewUrls = {}) {
  const objectProof = proof && typeof proof === "object" ? proof : null;
  const rawSource = String(objectProof?.source || objectProof?.previewUrl || proof || "");
  const mediaId = String(objectProof?.mediaId || (rawSource.startsWith("media:") ? rawSource.slice(6) : ""));
  const source = mediaId ? String(previewUrls[mediaId] || "") : rawSource;
  const sourceName = rawSource.split(/[\\/]/).pop()?.split("?")[0] || "";
  const name = String(objectProof?.name || objectProof?.fileName || (
    /\.(?:jpe?g|png)$/iu.test(sourceName)
      ? sourceName
      : tx(`证明图片 ${index + 1}`, `Proof image ${index + 1}`)
  ));
  return { mediaId, name, source };
}

function exemptionDetail(app, exemption) {
  const ui = exemptionState(app);
  const proofs = exemption.proofFiles.map((proof, index) =>
    exemptionProofDescriptor(proof, index, ui.proofPreviewUrls));
  return `<div class="col exemption-detail">
    <button class="row pressable exemption-detail-back" data-action="exemption.detailBack">
      ${icon("chevron-left", 24)}<span class="body-medium">${tx("返回我的申请", "Back to my applications")}</span>
    </button>
    <div class="swiss-panel exemption-detail-hero">
      <div class="exemption-detail-hero-row">
        <span class="exemption-detail-hero-icon">${icon("fitness-center", 23)}</span>
        <div class="col grow exemption-detail-heading">
          <span class="label-medium text-primary">${tx("申请详情", "Application details")}</span>
          <span class="headline-small text-on-surface">${esc(exemptionTypeLabel(exemption.type))}</span>
        </div>
        ${statusBadge(exemptionStatusLabel(exemption.status), exemption.status === "已通过")}
      </div>
    </div>
    <div class="swiss-panel exemption-detail-card">
      <div class="exemption-detail-section-head">
        <span class="exemption-detail-section-icon">${icon("assignment", 20)}</span>
        <span class="title-medium text-on-surface grow">${tx("申请信息", "Application information")}</span>
      </div>
      <div class="exemption-detail-field">
        <span class="label-medium text-muted">${tx("申请理由", "Application reason")}</span>
        <span class="body-medium text-on-surface">${esc(exemption.reason || tx("未填写申请理由", "No application reason provided"))}</span>
      </div>
      ${exemption.organization ? `<div class="exemption-detail-field">
        <span class="label-medium text-muted">${tx("所属组织", "Organization")}</span>
        <span class="body-medium text-on-surface">${esc(exemption.organization)}</span>
      </div>` : ""}
      <div class="exemption-detail-time">
        <span class="text-primary exemption-detail-time-icon">${icon("schedule", 20)}</span>
        <div class="col exemption-detail-time-copy">
          <span class="label-medium text-muted">${tx("提交时间", "Submitted")}</span>
          <span class="body-medium text-on-surface">${esc(exemption.createdAt)}</span>
        </div>
      </div>
    </div>
    <div class="swiss-panel exemption-detail-card">
      <div class="exemption-detail-section-head">
        <span class="exemption-detail-section-icon">${icon("description", 20)}</span>
        <span class="title-medium text-on-surface grow">${tx("证明材料", "Supporting documents")}</span>
        <span class="exemption-detail-count">${tx(`${proofs.length} 张图片`, `${proofs.length} image(s)`)}</span>
      </div>
      ${proofs.length === 0
        ? `<div class="body-medium text-muted exemption-detail-empty">${tx("尚未上传证明图片", "No supporting images uploaded")}</div>`
        : `<div class="col exemption-detail-files">${proofs.map((proof, index) => `<div class="exemption-detail-file">
            <span class="exemption-detail-thumbnail" data-exemption-proof-thumbnail="${index + 1}">${proof.source
              ? `<img src="${esc(proof.source)}" alt="${esc(tx(`证明图片 ${index + 1} 缩略图`, `Proof image ${index + 1} thumbnail`))}" loading="lazy" />`
              : ui.proofPreviewLoading
                ? spinner(22)
                : icon("photo", 24)}</span>
            <div class="col grow exemption-detail-file-copy">
              <span class="body-medium text-on-surface exemption-detail-file-name">${esc(proof.name)}</span>
              <span class="body-small text-muted">${tx(`证明图片 ${index + 1}`, `Supporting image ${index + 1}`)}</span>
            </div>
          </div>`).join("")}</div>`}
      ${ui.proofPreviewError ? `<div class="body-small text-muted exemption-detail-preview-note">${esc(ui.proofPreviewError)}</div>` : ""}
    </div>
    <div class="swiss-panel exemption-detail-card">
      <div class="exemption-detail-section-head">
        <span class="exemption-detail-section-icon">${icon("info-outline", 20)}</span>
        <span class="title-medium text-on-surface grow">${tx("处理意见", "Review comments")}</span>
      </div>
      <div class="exemption-detail-review">
        <span class="exemption-detail-review-icon">${icon("info-outline", 20)}</span>
        <div class="col grow exemption-detail-review-copy">
          <span class="label-medium text-on-surface">${tx("当前处理意见", "Current review comment")}</span>
          <span class="body-medium text-muted">${esc(exemption.reviewComment || tx("暂无处理意见", "No review comment yet"))}</span>
        </div>
      </div>
    </div>
    ${exemption.serverStatus === "SUPPLEMENT_REQUIRED" || exemption.status === "需补材料"
      ? actionButton({ label: tx("补交证明材料", "Submit additional documents"), iconName: "upload-file", action: "exemption.supplement", filled: true })
      : ""}
  </div>`;
}

function newExemptionForm(app, ui) {
  const student = app.state.workspace.student;
  const form = ui.form;
  const initial = ui.resubmitting;
  const draftLocked = Boolean(initial || ui.serverDraft);
  const exemptions = app.state.workspace.exemptions;
  const pendingTypes = new Set(exemptions.filter((e) => e.status === "待审核" || e.status === "审核中").map((e) => e.type));
  const hasPendingSameType = !initial && pendingTypes.has(form.type);
  const enduranceType = enduranceExemptionTypeForGender(student.gender);
  const runTypes = enduranceType ? [enduranceType] : [];
  const availableTypes = [...runTypes, "team", "club"];
  const isCheckInType = EXEMPTION_TYPES[form.type]?.checkIn;
  const maxAttachments = MAX_EXEMPTION_MEDIA_ITEMS;
  const typeRows = [];
  for (let i = 0; i < availableTypes.length; i += 2) typeRows.push(availableTypes.slice(i, i + 2));

  return `<div class="swiss-panel"><div class="col" style="gap:16px">
    ${draftLocked ? `<span class="body-medium text-primary">${initial
      ? tx(`正在为 ${exemptionTypeLabel(initial.type)} 补交证明，请上传新的有效材料。`, `Submitting additional documents for ${exemptionTypeLabel(initial.type)}. Upload new valid documents.`)
      : tx(`正在继续 ${exemptionTypeLabel(form.type)} 草稿，申请类型已锁定。`, `Continuing the ${exemptionTypeLabel(form.type)} draft; its type is locked.`)}</span>` : `
      <span class="label-medium text-muted">${tx("选择申请类型", "Select application type")}</span>
      <div class="col" style="gap:10px">
        ${typeRows.map((row) => `<div class="row" style="gap:10px">${row
          .map((type) => `<button class="exemption-type-btn pressable${form.type === type ? " selected" : ""}" data-action="exemption.selectType" data-value="${type}" ${ui.submitting || pendingTypes.has(type) ? "disabled" : ""}>${exemptionTypeOptionLabel(type)}</button>`)
          .join("")}</div>`).join("")}
      </div>
      ${hasPendingSameType ? validationPanel(tx("你已有一个相同类型的待审核申请，请等待教师处理后再提交新申请。", "You already have a pending application of this type. Wait for the teacher's decision before submitting another.")) : ""}`}
    ${isCheckInType ? `<div class="col application-form-field" style="gap:8px">
      ${applicationFieldLabel("exemption-organization", tx("组织名称", "Organization name"))}
      <input ${fieldControlAttrs({ id: "exemption-organization", error: ui.errorField === "organization" ? tx("请填写相关组织名称", "Enter the organization name.") : null, helper: tx("请填写申请对应的组织全称。", "Enter the full organization name."), required: true })} class="text-field${ui.errorField === "organization" ? " error" : ""}" maxlength="128" value="${esc(form.organization)}" placeholder="${tx("填写相关组织名称", "Enter the organization name")}" data-input="exemption.organization" ${ui.submitting ? "disabled" : ""} />
      ${applicationFieldSupport({ id: "exemption-organization", counterKey: "organization", error: ui.errorField === "organization" ? tx("请填写相关组织名称", "Enter the organization name.") : null, helper: tx("请填写申请对应的组织全称。", "Enter the full organization name."), current: form.organization.length, maximum: 128 })}
    </div>` : ""}
    <div class="col application-form-field" style="gap:8px">
      ${applicationFieldLabel("exemption-reason", initial ? tx("补充说明", "Additional notes") : tx("申请理由", "Application reason"))}
      <textarea ${fieldControlAttrs({ id: "exemption-reason", error: ui.errorField === "reason" ? tx("请填写申请理由或补充说明", "Enter an application reason or additional notes.") : null, helper: tx("请只填写审核所需信息，避免加入无关敏感资料。", "Include only information needed for review and avoid unrelated sensitive data."), required: true })} class="text-field${ui.errorField === "reason" ? " error" : ""}" rows="3" maxlength="${MAX_EXEMPTION_REASON}" data-input="exemption.reason" ${ui.submitting ? "disabled" : ""} placeholder="${initial
        ? tx("请说明本次补充材料的内容...", "Describe the additional documents...")
        : isCheckInType
          ? tx("请说明组织身份及申请原因...", "Describe your organization identity and reason...")
          : tx("请说明申请免测的原因...", "Explain why you are applying for an exemption...")}">${esc(form.reason)}</textarea>
      ${applicationFieldSupport({ id: "exemption-reason", counterKey: "reason", error: ui.errorField === "reason" ? tx("请填写申请理由或补充说明", "Enter an application reason or additional notes.") : null, helper: tx("请只填写审核所需信息，避免加入无关敏感资料。", "Include only information needed for review and avoid unrelated sensitive data."), current: form.reason.length, maximum: MAX_EXEMPTION_REASON })}
    </div>
    <div class="col application-proof-section" style="gap:6px">
      <div class="row">
        <span class="label-medium text-muted grow">${tx("证明材料", "Supporting documents")}</span>
        <span class="label-medium text-muted">${tx(`${form.proofs.length} / ${maxAttachments} 张图片`, `${form.proofs.length} / ${maxAttachments} images`)}</span>
      </div>
      <div class="application-proof-actions">
        ${actionButton({ label: tx("拍照", "Take photo"), iconName: "camera-alt", action: "exemption.takePhoto", filled: form.proofs.length < maxAttachments, disabled: ui.submitting || form.proofs.length >= maxAttachments, extra: `id="exemption-proof-trigger" aria-describedby="exemption-proof-support"` })}
        ${actionButton({ label: tx("选择照片", "Choose photos"), iconName: "upload-file", action: "exemption.choosePhotos", filled: form.proofs.length < maxAttachments, disabled: ui.submitting || form.proofs.length >= maxAttachments })}
      </div>
      <input type="file" accept="image/jpeg,image/png" capture="environment" style="display:none" data-change="exemption.photoPicked" data-exemption-input="camera" />
      <input type="file" accept="image/jpeg,image/png" multiple style="display:none" data-change="exemption.photosPicked" data-exemption-input="gallery" />
      ${form.notice ? `<span class="label-medium text-primary">${esc(form.notice)}</span>` : ""}
      ${form.proofs.length === 0
        ? `<span id="exemption-proof-support" class="body-small ${ui.errorField === "proofs" ? "text-error" : "text-muted"}" ${ui.errorField === "proofs" ? 'role="alert"' : ""}>${isCheckInType
            ? tx("必填：至少上传一张能够证明相关组织身份的 JPEG 或 PNG 图片。", "Required: upload at least one JPEG or PNG image proving organization membership.")
            : tx("必填：至少上传一张耐力跑免测 JPEG 或 PNG 证明图片。", "Required: upload at least one JPEG or PNG image for the endurance-run exemption.")}</span>`
        : form.proofs.map((proof) => `<div class="exemption-proof-row">
            <span class="text-on-surface" style="display:inline-flex;flex:none">${icon("photo", 24)}</span>
            <div class="col grow" style="gap:3px;min-width:0">
              <span style="font-size:13px;font-weight:500;color:var(--color-on-surface)" class="ellipsis">${esc(proof.name)}</span>
              <span class="label-medium text-muted">${tx("图片", "Image")} · ${(proof.size / 1_000_000).toFixed(1)} MB</span>
            </div>
            <button class="icon-btn pressable" data-action="exemption.removeProof" data-proof-id="${esc(proof.id)}" ${ui.submitting ? "disabled" : ""} aria-label="${tx("移除", "Remove")}" style="width:32px;height:32px">${icon("delete", 18)}</button>
          </div>`).join("")}
    </div>
    <button class="primary-btn pressable${ui.submitting ? " is-loading" : ""}" data-action="exemption.submit" ${!ui.submitting && app.isWriteAllowed() && !hasPendingSameType ? "" : "disabled"}>
      ${ui.submitting ? spinner(18, "on-primary") : icon("add", 20)}
      <span>${ui.submitting ? tx("提交中...", "Submitting...") : initial ? tx("提交补充材料", "Submit additional documents") : tx("提交申请", "Submit application")}</span>
    </button>
  </div></div>`;
}

export function renderExemption(app, params) {
  const ui = exemptionState(app, params);
  const exemptions = app.state.workspace.exemptions;
  const selected = ui.selectedId ? exemptions.find((e) => e.id === ui.selectedId) : null;

  let inner;
  if (selected) {
    inner = exemptionDetail(app, selected);
  } else {
    const listBody = ui.tab === "applications"
      ? exemptions.length === 0
        ? emptyPlaceholder(tx("暂无申请", "No applications"), tx("你还没有提交过免测或免打卡申请。", "You have not submitted a test- or check-in-exemption application."))
        : exemptions.map(exemptionCard).join("")
      : newExemptionForm(app, ui);
    inner = `<div class="col" style="gap:16px">
      <button class="row pressable" data-action="exemption.back" ${ui.submitting ? "disabled" : ""} style="height:48px;width:100%;color:var(--color-on-surface)">
        ${icon("chevron-left", 24)}<span class="body-medium">${tx("返回", "Back")}</span>
      </button>
      ${sectionTitle(tx("体育免测与免打卡申请", "Test and check-in exemptions"))}
      <div class="swiss-panel"><div class="col" style="gap:8px">
        <span class="label-medium text-primary">${tx("后端权威申请", "Backend-authoritative applications")}</span>
        <span class="body-medium text-on-surface">${tx("耐力跑免测仅适用于 800m / 1000m；通过后耐力跑位置显示免测，不记录用时。", "Endurance-run exemptions apply only to 800 m / 1000 m. After approval, the endurance slot shows exemption and records no time.")}</span>
        <span class="body-small text-muted">${tx("校队或社团免打卡须填写组织名称并上传证明，审核通过后由教师确认可抵扣的运动时长。", "Team or club check-in exemptions require an organization name and proof. The instructor confirms any eligible hour offset after approval.")}</span>
        <span class="body-small text-muted">${tx("申请、材料状态和审核结果均以后端为准；提交失败不会在本地伪造成功记录。", "Applications, evidence status, and review results are backend-authoritative. A failed submission never creates a local success record.")}</span>
      </div></div>
      ${segmented({
        items: [
          { value: "applications", label: tx("我的申请", "My applications") },
          { value: "new", label: tx("提交申请", "New application") },
        ],
        selected: ui.tab,
        action: "exemption.tab",
      })}
      ${ui.success ? statusMessagePanel(ui.success, "exemption.dismissSuccess") : ""}
      ${ui.error ? userFacingErrorPanel(ui.error, { compact: true }) : ""}
      ${listBody}
    </div>`;
  }

  return `<div class="screen" style="background:transparent">
    <div class="screen-scroll" data-scroll-key="exemption">${inner}<div style="height:28px"></div></div>
  </div>`;
}

export const servicesActions = {
  "services.back": (app) => {
    app.ui.endurance = null;
    app.closeSub();
  },
  // — Exemption —
  "exemption.back": (app) => {
    app.ui.exemption = null;
    app.closeSub();
  },
  "exemption.tab": (app, el) => {
    const ui = exemptionState(app);
    if (ui.submitting) return;
    ui.tab = el.dataset.value;
    app.render();
  },
  "exemption.open": async (app, el) => {
    const ui = exemptionState(app);
    ui.selectedId = el.dataset.exemptionId;
    ui.proofPreviewUrls = {};
    ui.proofPreviewError = null;
    const selectedId = ui.selectedId;
    const exemption = app.state.workspace.exemptions.find((item) => item.id === selectedId);
    const mediaIds = (exemption?.proofFiles || [])
      .map((proof) => exemptionProofDescriptor(proof, 0).mediaId)
      .filter(Boolean);
    ui.proofPreviewLoading = mediaIds.length > 0;
    app.navDirection = "forward";
    app.render();
    if (!ui.proofPreviewLoading) return;
    const results = await Promise.all(mediaIds.map(async (mediaId) => {
      try {
        const access = await createMediaAccessUrl(mediaId);
        return [mediaId, proxyObjectUrl(access.accessUrl), null];
      } catch (error) {
        return [mediaId, "", error];
      }
    }));
    if (ui.selectedId !== selectedId) return;
    ui.proofPreviewUrls = Object.fromEntries(results.filter(([, url]) => url).map(([mediaId, url]) => [mediaId, url]));
    ui.proofPreviewLoading = false;
    if (results.some(([, , error]) => error)) {
      ui.proofPreviewError = tx("部分证明图片暂时无法加载。", "Some proof images are temporarily unavailable.");
    }
    app.render();
  },
  "exemption.detailBack": (app) => {
    const ui = exemptionState(app);
    ui.selectedId = null;
    app.navDirection = "back";
    app.render();
  },
  "exemption.supplement": (app) => {
    const ui = exemptionState(app);
    ui.resubmitting = app.state.workspace.exemptions.find((e) => e.id === ui.selectedId) || null;
    if (ui.resubmitting?.serverStatus && ui.resubmitting.serverStatus !== "SUPPLEMENT_REQUIRED") return;
    ui.selectedId = null;
    ui.tab = "new";
    ui.form.reason = "";
    ui.form.organization = ui.resubmitting?.organization || "";
    ui.form.type = ui.resubmitting?.type || ui.form.type;
    ui.form.proofs = [];
    ui.serverDraft = ui.resubmitting;
    ui.error = null;
    ui.errorField = null;
    app.render();
  },
  "exemption.selectType": (app, el) => {
    const ui = exemptionState(app);
    if (ui.serverDraft) return;
    ui.form.type = el.dataset.value;
    if (!EXEMPTION_TYPES[ui.form.type]?.checkIn) ui.form.organization = "";
    app.render();
  },
  "exemption.organization": (app, el) => {
    const ui = exemptionState(app);
    ui.form.organization = el.value.slice(0, 128);
    if (ui.errorField === "organization") ui.errorField = null;
    const counter = app._viewport?.querySelector('[data-exemption-counter="organization"]');
    if (counter) {
      counter.textContent = `${ui.form.organization.length}/128`;
      counter.classList.toggle("persistent", ui.form.organization.length >= 112);
    }
  },
  "exemption.reason": (app, el) => {
    const ui = exemptionState(app);
    ui.form.reason = el.value.slice(0, MAX_EXEMPTION_REASON);
    if (ui.errorField === "reason") ui.errorField = null;
    const counter = app._viewport?.querySelector('[data-exemption-counter="reason"]');
    if (counter) {
      counter.textContent = `${ui.form.reason.length}/${MAX_EXEMPTION_REASON}`;
      counter.classList.toggle("persistent", ui.form.reason.length >= MAX_EXEMPTION_REASON - 16);
    }
  },
  "exemption.takePhoto": (app) => app._viewport?.querySelector('[data-exemption-input="camera"]')?.click(),
  "exemption.choosePhotos": (app) => app._viewport?.querySelector('[data-exemption-input="gallery"]')?.click(),
  "exemption.photoPicked": (app, el) => {
    const ui = exemptionState(app);
    const file = el.files?.[0];
    el.value = "";
    if (!file) return;
    const verdict = validateProofFile(file, "image");
    if (!verdict.ok) {
      ui.form.notice = verdict.error === "size"
        ? tx("图片不能超过 10 MB。", "Images must not exceed 10 MB.")
        : tx("材料仅支持 JPEG 或 PNG 图片。", "Supporting material must be a JPEG or PNG image.");
      app.render();
      return;
    }
    if (ui.form.proofs.length >= MAX_EXEMPTION_MEDIA_ITEMS) {
      ui.form.notice = tx(`已达到 ${MAX_EXEMPTION_MEDIA_ITEMS} 个凭证上限。`, `Maximum of ${MAX_EXEMPTION_MEDIA_ITEMS} proof items reached.`);
    } else {
      ui.form.proofs.push({ id: `proof-${Date.now()}`, name: file.name, size: file.size, file, captureSource: "IN_APP_CAMERA" });
      ui.errorField = null;
      ui.form.notice = tx("已拍摄 1 张凭证照片。", "Captured 1 proof photo.");
    }
    app.render();
  },
  "exemption.photosPicked": (app, el) => {
    const ui = exemptionState(app);
    const remaining = Math.max(0, MAX_EXEMPTION_MEDIA_ITEMS - ui.form.proofs.length);
    const selected = [...(el.files || [])];
    const files = selected.filter((file) => validateProofFile(file, "image").ok).slice(0, remaining);
    el.value = "";
    for (const file of files) {
      ui.form.proofs.push({ id: `proof-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: file.name, size: file.size, file, captureSource: "FILE_PICKER" });
    }
    const rejected = selected.length - files.length;
    ui.form.notice = files.length
      ? tx(`已添加 ${files.length} 张图片${rejected ? `，另有 ${rejected} 个文件因格式、大小或数量限制未添加` : ""}。`, `Added ${files.length} image(s)${rejected ? `; ${rejected} file(s) were rejected by format, size, or count limits` : ""}.`)
      : tx("材料仅支持不超过 10 MB 的 JPEG 或 PNG 图片。", "Supporting material must be a JPEG or PNG image up to 10 MB.");
    app.render();
  },
  "exemption.removeProof": (app, el) => {
    const ui = exemptionState(app);
    const removed = ui.form.proofs.find((proof) => proof.id === el.dataset.proofId);
    ui.form.proofs = ui.form.proofs.filter((p) => p.id !== el.dataset.proofId);
    if (removed?.mediaId && Array.isArray(ui.serverDraft?.mediaIds)) {
      ui.serverDraft.mediaIds = ui.serverDraft.mediaIds.filter((mediaId) => mediaId !== removed.mediaId);
    }
    app.render();
  },
  "exemption.dismissSuccess": (app) => {
    exemptionState(app).success = null;
    app.render();
  },
  "exemption.submit": async (app) => {
    const ui = exemptionState(app);
    if (ui.submitting || !app.isWriteAllowed()) return;
    const reason = ui.form.reason.trim();
    if (EXEMPTION_TYPES[ui.form.type]?.checkIn && !ui.form.organization.trim()) {
      ui.error = null;
      ui.errorField = "organization";
      app.render();
      focusFirstInvalidField(app._viewport, ["#exemption-organization"]);
      return;
    }
    if (!reason) {
      ui.error = null;
      ui.errorField = "reason";
      app.render();
      focusFirstInvalidField(app._viewport, ["#exemption-reason"]);
      return;
    }
    if (ui.form.proofs.length === 0) {
      ui.error = null;
      ui.errorField = "proofs";
      app.render();
      focusFirstInvalidField(app._viewport, ["#exemption-proof-trigger"]);
      return;
    }
    const enrollmentId = app.state.workspace.courses.find(
      (course) => course.isCurrent && course.enrollmentStatus === "enrolled" && course.enrollmentId,
    )?.enrollmentId;
    if (!enrollmentId) {
      ui.error = toUserFacingError(new ApiError(409, { code: "ENROLLMENT_NOT_ACTIVE" }));
      app.render();
      return;
    }

    const facts = EXEMPTION_TYPES[ui.form.type];
    const organizationName = facts.checkIn ? ui.form.organization.trim() : null;
    ui.submitting = true;
    ui.error = null;
    ui.errorField = null;
    app.render();
    try {
      let draft = ui.serverDraft;
      if (!draft) {
        const created = await createExemptionApplication({
          enrollmentId,
          applicationType: facts.applicationType,
          applicationSubtype: facts.applicationSubtype,
          organizationName,
          reason,
          mediaIds: [],
        });
        draft = { ...created, mediaIds: Array.isArray(created.mediaIds) ? created.mediaIds : [] };
        ui.serverDraft = draft;
      }

      for (const proof of ui.form.proofs) {
        if (proof.mediaId) continue;
        if (!proof.file) throw new ApiError(422, { code: "EXEMPTION_APPLICATION_MEDIA_INVALID" });
        const uploaded = await uploadExemptionApplicationMediaDraft(draft.id, proof, proof.file);
        proof.mediaId = uploaded.mediaId;
      }

      const mediaIds = [...new Set([
        ...(Array.isArray(draft.mediaIds) ? draft.mediaIds : []),
        ...ui.form.proofs.map((proof) => proof.mediaId).filter(Boolean),
      ])];
      const updated = await updateExemptionApplication(draft.id, {
        applicationSubtype: facts.applicationSubtype,
        organizationName,
        reason,
        mediaIds,
        expectedVersion: draft.version,
      });
      ui.serverDraft = { ...draft, ...updated, mediaIds };
      const submitted = await submitExemptionApplication(updated.id, updated.version);
      ui.success = tx("申请已提交，教师审核结果会以后端记录为准。", "Application submitted. The backend review record is authoritative.");
      ui.resubmitting = null;
      ui.serverDraft = null;
      ui.tab = "applications";
      await app.reloadApiWorkspace();
      const mapped = mapStructuredExemptionApplication({
        ...submitted,
        applicationSubtype: facts.applicationSubtype,
        organizationName,
      });
      if (!app.state.workspace.exemptions.some((item) => item.id === mapped.id)) {
        app.state.workspace.exemptions.unshift(mapped);
      }
      ui.form.organization = "";
      ui.form.reason = "";
      ui.form.proofs = [];
    } catch (error) {
      ui.error = toUserFacingError(error);
      const firstField = ui.error.fieldErrors?.[0]?.field;
      ui.errorField = firstField === "organizationName"
        ? "organization"
        : firstField === "reason"
          ? "reason"
          : firstField === "mediaIds"
            ? "proofs"
            : null;
    } finally {
      ui.submitting = false;
      app.render();
      if (ui.errorField) {
        focusFirstInvalidField(app._viewport, [{ organization: "#exemption-organization", reason: "#exemption-reason", proofs: "#exemption-proof-trigger" }[ui.errorField]]);
      }
    }
  },
};

// Detail back and submitting lock (免测详情返回列表；提交中禁用返回).
export function servicesBackInterceptor(app) {
  if (app.state.subScreen === "exemption" && app.ui.exemption) {
    if (app.ui.exemption.submitting) {
      app.ui.exemption.error = tx("申请正在提交，请等待完成后再返回", "Your application is being submitted. Please wait.");
      app.render();
      return true;
    }
    if (app.ui.exemption.selectedId) {
      app.ui.exemption.selectedId = null;
      app.navDirection = "back";
      app.render();
      return true;
    }
  }
  return false;
}
