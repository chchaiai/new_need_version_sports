// V8.1 student-facing review, notice, and maintenance projections.
// Labels follow docs/business/00-overview.md §12.1–12.3 and 10-student-flow.md.
// These names are display vocabulary, not Contract 1.2.0 wire values.
// Free text is never guessed into a fixed category; only an exact catalog
// label or an explicit system overdue marker becomes a structured reason.

export const TEACHER_ACTIONS = {
  ReturnForSupplement: "ReturnForSupplement",
  MarkInvalid: "MarkInvalid",
};

export const PUBLIC_REASON_CATALOG = [
  {
    id: "UnclearEvidence",
    zh: "材料不清晰",
    en: "Unclear evidence",
    actions: [TEACHER_ACTIONS.ReturnForSupplement, TEACHER_ACTIONS.MarkInvalid],
  },
  {
    id: "MissingRequiredEvidence",
    zh: "必需材料缺失（含要求的前后照）",
    en: "Missing required evidence",
    actions: [TEACHER_ACTIONS.ReturnForSupplement, TEACHER_ACTIONS.MarkInvalid],
  },
  {
    id: "EvidenceDoesNotMatchSession",
    zh: "材料与本次运动不符",
    en: "Evidence does not match this session",
    actions: [TEACHER_ACTIONS.ReturnForSupplement, TEACHER_ACTIONS.MarkInvalid],
  },
  {
    id: "InconsistentEvidence",
    zh: "材料信息矛盾",
    en: "Inconsistent evidence",
    actions: [TEACHER_ACTIONS.ReturnForSupplement, TEACHER_ACTIONS.MarkInvalid],
  },
  {
    id: "AuthenticityRequiresClarification",
    zh: "材料真实性待核实",
    en: "Evidence authenticity requires clarification",
    actions: [TEACHER_ACTIONS.ReturnForSupplement],
  },
  {
    id: "ConfirmedReuseOrMisuse",
    zh: "经核实存在重复使用或冒用材料",
    en: "Confirmed reuse or misuse of evidence",
    actions: [TEACHER_ACTIONS.MarkInvalid],
  },
];

export const SYSTEM_OVERDUE_REASON = {
  zh: "补证逾期",
  en: "Supplementary evidence deadline missed",
};

export function reasonsForAction(action) {
  return PUBLIC_REASON_CATALOG.filter((reason) => reason.actions.includes(action));
}

export function matchExactPublicReason(text) {
  const value = String(text || "").trim();
  if (!value) return null;
  return PUBLIC_REASON_CATALOG.find((reason) => reason.zh === value || reason.en === value) || null;
}

export function isSystemOverdueReason(text) {
  const value = String(text || "").trim();
  return value === SYSTEM_OVERDUE_REASON.zh || value === SYSTEM_OVERDUE_REASON.en;
}

export const REVIEW_STAGES = {
  PendingAiCheck: { zh: "待 AI 检查", en: "Awaiting AI check", final: false },
  PendingTeacherReview: { zh: "待教师复核", en: "Awaiting teacher review", final: false },
  PendingStudentSupplement: { zh: "待补证", en: "Awaiting supplementary evidence", final: false },
  SupplementReceivedPendingTeacherReview: {
    zh: "补证已接收 · 待教师复核",
    en: "Supplement received · Awaiting teacher review",
    final: false,
  },
  TechnicalProcessing: { zh: "技术处理中", en: "Technical processing", final: false },
  ValidCredited: { zh: "有效 · 已计入", en: "Valid · Credited", final: true },
  ValidNotCredited: { zh: "有效 · 未计入", en: "Valid · Not credited", final: true },
  Invalid: { zh: "无效", en: "Invalid", final: true },
  StageUnavailable: { zh: "审核阶段暂不可用", en: "Review stage unavailable", final: false },
};

export function reviewStageFromRecord(record = {}) {
  const raw = String(record.reviewResult || record.reviewStatus || "").trim().toUpperCase();
  const credited = Number(record.hours) > 0 || Number(record.creditedWholeMinutes) > 0;
  switch (raw) {
    case "PENDING_AI":
    case "PENDINGAICHECK":
      return REVIEW_STAGES.PendingAiCheck;
    case "AWAITING_TEACHER":
    case "PENDING_TEACHER":
      return REVIEW_STAGES.PendingTeacherReview;
    case "RETURN_FOR_PROOF":
    case "PENDING_STUDENT_SUPPLEMENT":
      return REVIEW_STAGES.PendingStudentSupplement;
    case "SUPPLEMENT_RECEIVED":
    case "SUPPLEMENT_RECEIVED_PENDING_TEACHER_REVIEW":
      return REVIEW_STAGES.SupplementReceivedPendingTeacherReview;
    case "TECHNICAL_PROCESSING":
      return REVIEW_STAGES.TechnicalProcessing;
    case "VALID":
      return credited ? REVIEW_STAGES.ValidCredited : REVIEW_STAGES.ValidNotCredited;
    case "INVALID":
    case "PROOF_OVERDUE_INVALID":
      return REVIEW_STAGES.Invalid;
    default:
      return REVIEW_STAGES.StageUnavailable;
  }
}

export function reviewStageLabel(stage, english) {
  return english ? stage.en : stage.zh;
}

function splitExactReasonAndNote(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const exact = matchExactPublicReason(raw);
  if (exact) return { reason: exact, publicNote: "" };
  const [firstLine, ...rest] = raw.split(/\r?\n/);
  const matched = matchExactPublicReason(firstLine);
  if (!matched) return null;
  return { reason: matched, publicNote: rest.join("\n").trim() };
}

export function resolvePublicReasonModel(record = {}) {
  const result = String(record.reviewResult || "").trim().toUpperCase();
  const candidates = [
    record.reviewReasonCode,
    record.studentVisibleReason,
    record.reviewPublicComment,
    record.teacherPublicFeedback,
  ];
  if (result === "PROOF_OVERDUE_INVALID" || candidates.some((value) => isSystemOverdueReason(value))) {
    return { kind: "systemOverdue" };
  }
  for (const value of candidates) {
    const parsed = splitExactReasonAndNote(value);
    if (parsed) {
      const extra = [record.reviewPublicComment, record.teacherPublicFeedback]
        .map((item) => String(item || "").trim())
        .find((item) => item && item !== parsed.reason.zh && item !== parsed.reason.en && item !== String(value || "").trim()) || "";
      return {
        kind: "teacher",
        reason: parsed.reason,
        publicNote: parsed.publicNote || extra || null,
      };
    }
  }
  const note = String(record.reviewPublicComment || record.teacherPublicFeedback || "").trim();
  return { kind: "unavailable", publicNote: note || null };
}

const FORBIDDEN_ZH = /成绩|得分|分数|换算分|等级|排名|名次|绩点|及格|不及格|优秀|良好/;
const FORBIDDEN_EN = /\b(final\s+(?:grade|score)|converted\s+(?:endurance\s+)?score|endurance\s+(?:converted\s+)?score|grade\s+point\s+average|gpa|(?:class|course|overall)\s+rank(?:ing)?)\b/i;
const MAINTENANCE_TERMS = /维护|服务恢复|系统模式|maintenance|service restoration/i;
const FEEDBACK_TERMS = /反馈|工单|feedback|support ticket/i;
const DEADLINE_TERMS = /截止|到期|剩余时间|deadline|expires?|time remaining/i;
const REVIEW_TERMS = /审核|材料|补充|补证|复核|有效|无效|免测|认证|review|material|supplement|evidence|valid|invalid|exemption|certification/i;
const MEMBERSHIP_TERMS = /入班|退班|课程成员|邀请|enrol|enroll|membership|invitation/i;
const PROGRESS_TERMS = /分钟|运动进度|原始用时|minutes?|activity progress|raw time/i;

function containsAny(value, ...needles) {
  return needles.some((needle) => value.includes(needle));
}

export function classifyStudentNotice(notice = {}) {
  const title = String(notice.title || "").trim();
  const message = String(notice.message || "").trim();
  if (!title || !message) return null;
  const searchable = `${title}\n${message}`;
  const target = String(notice.targetType || "").trim().toLowerCase();
  const category = String(notice.category || "").trim().toLowerCase();
  const kind = (() => {
    if (containsAny(target, "maintenance", "system_mode")) return "maintenance";
    if (target.includes("feedback")) return "feedback";
    if (containsAny(target, "membership", "enrollment", "course_invite", "invitation")) return "membership";
    if (containsAny(target, "exercise", "record", "supplement", "exemption", "certification", "application")) {
      return "review";
    }
    if (category === "deadline") return "deadline";
    if (category === "review") return "review";
    if (category === "organization") return "membership";
    if (MAINTENANCE_TERMS.test(searchable)) return "maintenance";
    if (FEEDBACK_TERMS.test(searchable)) return "feedback";
    if (DEADLINE_TERMS.test(searchable)) return "deadline";
    if (REVIEW_TERMS.test(searchable)) return "review";
    if (MEMBERSHIP_TERMS.test(searchable)) return "membership";
    if (PROGRESS_TERMS.test(searchable)) return "progress";
    return null;
  })();
  if (!kind) return null;
  if (FORBIDDEN_ZH.test(searchable) || FORBIDDEN_EN.test(searchable)) return null;
  const exemptionTerms = /免测|认证|exemption|certification/i;
  const opensExemption = ["exemption", "physical_test_exemption", "checkin_exemption", "certification", "application"].includes(target)
    && (target !== "application" || exemptionTerms.test(searchable));
  return { ...notice, kind, opensExemption };
}

export function toVisibleStudentNotices(notices) {
  return (Array.isArray(notices) ? notices : []).map(classifyStudentNotice).filter(Boolean);
}

export function formatRemainingTime(seconds, english) {
  const safe = Math.max(0, Number(seconds) || 0);
  const roundedMinutes = Math.floor(safe / 60) + (safe % 60 === 0 ? 0 : 1);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  if (hours > 0 && minutes > 0) return english ? `${hours}h ${minutes}m` : `${hours}小时${minutes}分钟`;
  if (hours > 0) return english ? `${hours}h` : `${hours}小时`;
  return english ? `${minutes}m` : `${minutes}分钟`;
}

export function maintenanceTimingPresentation(model, english) {
  if (!model || model.kind === "noActiveTask") return null;
  if (model.kind === "paused") {
    const remaining = formatRemainingTime(model.serverConfirmedRemainingSeconds, english);
    return {
      title: english ? "Supplementary evidence timing" : "补证计时",
      status: english ? "Timing paused" : "计时已暂停",
      remainingTime: english
        ? `Time remaining (server confirmed): ${remaining}`
        : `剩余时间（服务器确认）：${remaining}`,
      detail: english
        ? "Maintenance does not consume this time. After the server restores NORMAL, the app will query again and continue from the remainder; it will not reset the full window or deduct maintenance time."
        : "维护期间不消耗剩余时间。系统恢复 NORMAL 后将重新查询服务器，并按剩余时间继续；不会重置完整窗口或补扣维护时间。",
      isPaused: true,
    };
  }
  if (model.kind === "expiredBeforeMaintenance") {
    return {
      title: english ? "Supplementary evidence timing" : "补证计时",
      status: english ? "Expired before maintenance" : "维护前已逾期",
      remainingTime: null,
      detail: english
        ? "This maintenance does not reopen the supplementary-evidence opportunity. The server-recorded final state remains authoritative."
        : "本次维护不会重新开放补证机会；仍以服务器记录的终结事实为准。",
      isPaused: false,
    };
  }
  if (model.kind === "receivedBeforeMaintenance") {
    return {
      title: english ? "Supplementary evidence timing" : "补证计时",
      status: english ? "Supplementary evidence received" : "补证已受理",
      remainingTime: null,
      detail: english
        ? "The student timer has ended. Waiting for further processing will not cause a supplementary-evidence deadline miss."
        : "学生补证计时已经结束。等待后续处理不会造成补证逾期。",
      isPaused: false,
    };
  }
  return {
    title: english ? "Supplementary evidence timing" : "补证计时",
    status: english ? "Status temporarily unavailable" : "状态暂不可确认",
    remainingTime: null,
    detail: english
      ? "If you have an unfinished supplementary-evidence task, its timer and automatic expiry should be paused during maintenance. The app has not received server-confirmed remaining time and will query again after recovery instead of deciding expiry locally."
      : "若你有尚未结束的补证任务，维护期间计时和自动逾期均应暂停。当前客户端尚未取得服务器确认的剩余时间，恢复后将重新查询，不会在本机自行判定逾期。",
    isPaused: false,
  };
}

export function resolveMaintenanceTiming(systemModeStatus = {}, proofTodos = []) {
  if (String(systemModeStatus.mode || "").toUpperCase() !== "MAINTENANCE") return { kind: "noActiveTask" };
  const explicit = systemModeStatus.supplementTiming;
  if (explicit && typeof explicit === "object") return explicit;
  const remaining = (Array.isArray(proofTodos) ? proofTodos : [])
    .map((item) => Number(item.remainingSeconds))
    .filter((value) => Number.isFinite(value) && value >= 0);
  if (remaining.length) {
    return { kind: "paused", serverConfirmedRemainingSeconds: Math.min(...remaining) };
  }
  return { kind: "unavailable" };
}
