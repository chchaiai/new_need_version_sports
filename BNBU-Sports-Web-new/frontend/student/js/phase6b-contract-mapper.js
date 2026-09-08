// Phase 6B: strict read adapters for Contract 1.3.0 / RC wire shapes.
// Maps official DTO fields into the existing student workspace projection.
// Does not invent credit minutes, grades, or legacy 1.2.0-only fields.

export const PHASE6B_STUDENT_CONTRACT = Object.freeze({
  version: "1.3.0-contract",
  status: "RC",
  publicBasePath: "/api/v1",
  openapiSha256: "5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed",
});

const EXERCISE_RECORD_WIRE_KEYS = new Set([
  "recordId",
  "sessionId",
  "courseId",
  "enrollmentId",
  "ruleVersionId",
  "activityType",
  "student",
  "businessDate",
  "category",
  "description",
  "actualDurationSeconds",
  "currentMaterial",
  "currentReview",
  "submittedAt",
]);

const OFFICIAL_PUBLIC_REASON_CODES = new Set([
  "UNCLEAR_EVIDENCE",
  "MISSING_REQUIRED_EVIDENCE",
  "EVIDENCE_SESSION_MISMATCH",
  "INCONSISTENT_EVIDENCE",
  "AUTHENTICITY_REQUIRES_CLARIFICATION",
  "CONFIRMED_REUSE_OR_MISUSE",
  "SUPPLEMENT_DEADLINE_MISSED",
]);

const OFFICIAL_PROGRESS_STATES = new Set(["CURRENT", "RECOMPUTING", "UNAVAILABLE"]);

const OFFICIAL_REVIEW_RESULTS = new Set(["VALID", "INVALID"]);

const OFFICIAL_EXERCISE_CATEGORIES = new Set(["COURSE_RELATED", "OTHER"]);

const OFFICIAL_ACTIVITY_TYPES = new Set(["STANDARD", "SWIMMING"]);

const OFFICIAL_PROCESSING_STAGES = new Set([
  "MATERIAL_PROCESSING",
  "SYSTEM_CHECK_PENDING",
  "AI_REVIEW_PENDING",
  "TECHNICAL_PROCESSING",
  "TEACHER_REVIEW_REQUIRED",
  "SUPPLEMENT_REQUIRED",
  "SUPPLEMENT_REVIEW_REQUIRED",
  "VALID",
  "INVALID",
]);

function assertPlainObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
}

export function assertContractExerciseRecordWire(record) {
  assertPlainObject(record, "CONTRACT_EXERCISE_RECORD_INVALID:NOT_OBJECT");
  for (const key of Object.keys(record)) {
    if (!EXERCISE_RECORD_WIRE_KEYS.has(key)) {
      throw new Error(`CONTRACT_EXERCISE_RECORD_UNKNOWN_FIELD:${key}`);
    }
  }
  if (typeof record.recordId !== "string" || !record.recordId.trim()) {
    throw new Error("CONTRACT_EXERCISE_RECORD_INVALID:recordId");
  }
  if (!OFFICIAL_EXERCISE_CATEGORIES.has(String(record.category || "").trim())) {
    throw new Error(`CONTRACT_EXERCISE_RECORD_INVALID:category:${record.category}`);
  }
  if (!OFFICIAL_ACTIVITY_TYPES.has(String(record.activityType || "").trim())) {
    throw new Error(`CONTRACT_EXERCISE_RECORD_INVALID:activityType:${record.activityType}`);
  }
  if (!Number.isFinite(record.actualDurationSeconds)) {
    throw new Error(`CONTRACT_EXERCISE_RECORD_INVALID:actualDurationSeconds:${record.actualDurationSeconds}`);
  }
  assertPlainObject(record.currentMaterial, "CONTRACT_EXERCISE_RECORD_INVALID:currentMaterial");
  assertPlainObject(record.currentReview, "CONTRACT_EXERCISE_RECORD_INVALID:currentReview");
  const stage = String(record.currentReview.processingStage || "").trim();
  if (!OFFICIAL_PROCESSING_STAGES.has(stage)) {
    throw new Error(`CONTRACT_REVIEW_STAGE_INVALID:${stage}`);
  }
  if (record.currentReview.result != null && record.currentReview.result !== "") {
    readContractReviewResult(record.currentReview);
  }
  readContractPublicReason(record.currentReview);
  return record;
}

export function isContractExerciseRecord(record) {
  return Boolean(
    record &&
    typeof record === "object" &&
    typeof record.recordId === "string" &&
    record.currentMaterial &&
    typeof record.currentMaterial === "object",
  );
}

export function isContractStudentProgress(progress) {
  return Boolean(
    progress &&
    typeof progress === "object" &&
    typeof progress.state === "string" &&
    typeof progress.observedAt === "string" &&
    typeof progress.courseId === "string" &&
    typeof progress.enrollmentId === "string",
  );
}

export function rejectUnknownPublicReasonCode(code) {
  const normalized = String(code || "").trim();
  if (!normalized) return null;
  if (!OFFICIAL_PUBLIC_REASON_CODES.has(normalized)) {
    throw new Error(`CONTRACT_PUBLIC_REASON_INVALID:${normalized}`);
  }
  return normalized;
}

export function readContractPublicReason(review = {}) {
  if (review.publicReason && typeof review.publicReason === "object") {
    const code = rejectUnknownPublicReasonCode(review.publicReason.code);
    return {
      code,
      labelZh: typeof review.publicReason.label?.zh === "string" ? review.publicReason.label.zh : null,
      labelEn: typeof review.publicReason.label?.en === "string" ? review.publicReason.label.en : null,
    };
  }
  const legacyCode = String(review.reasonCode || "").trim();
  if (!legacyCode) return { code: null, labelZh: null, labelEn: null };
  return {
    code: rejectUnknownPublicReasonCode(legacyCode),
    labelZh: null,
    labelEn: null,
  };
}

export function readContractReviewResult(review = {}) {
  const result = review.result == null ? null : String(review.result).trim();
  if (result === null || result === "") return null;
  if (!OFFICIAL_REVIEW_RESULTS.has(result)) {
    throw new Error(`CONTRACT_REVIEW_RESULT_INVALID:${result}`);
  }
  return result;
}

function unavailableProgressProjection(state, unavailableReason = null) {
  return {
    course: null,
    general: null,
    rawCourse: null,
    rawGeneral: null,
    rawCountedCourseMinutes: null,
    rawCountedGeneralMinutes: null,
    totalValidHours: null,
    qualificationStatus: null,
    scoreAvailable: false,
    contractState: state,
    unavailableReason,
    displayPercent: null,
    targetMet: null,
    progressUnavailable: true,
    progressRecomputing: state === "RECOMPUTING",
  };
}

export function normalizeContractExerciseRecord(record, { courseIdBySection = {} } = {}) {
  const wire = assertContractExerciseRecordWire(record);
  const review = wire.currentReview || {};
  const publicReason = readContractPublicReason(review);
  const result = readContractReviewResult(review);
  const sectionId = Object.entries(courseIdBySection).find(([, courseId]) => courseId === wire.courseId)?.[0] || null;
  const creditType = wire.category === "COURSE_RELATED" ? "COURSE_RELATED" : "OTHER";
  const sportType = wire.activityType === "SWIMMING" ? "SWIMMING" : "OTHER";

  return {
    id: wire.recordId,
    enrollmentId: wire.enrollmentId,
    sessionId: wire.sessionId,
    version: review.version ?? null,
    status: result ? "REVIEWED" : "SUBMITTED",
    creditType,
    classSectionId: sectionId,
    courseId: wire.courseId,
    sportType,
    sportName: null,
    actualDurationSeconds: wire.actualDurationSeconds ?? null,
    // 1.3.0 does not expose per-record credited seconds on ExerciseRecord.
    creditedDurationSeconds: null,
    businessDate: wire.businessDate,
    submittedAt: wire.submittedAt,
    description: wire.description || "",
    currentReview: {
      result,
      reasonCode: publicReason.code,
      publicComment: review.publicComment ?? publicReason.labelZh ?? publicReason.labelEn ?? null,
      processingStage: review.processingStage ?? null,
      materialVersionId: review.materialVersionId ?? wire.currentMaterial?.materialVersionId ?? null,
    },
  };
}

export function mapContractStudentProgressProjection(progress) {
  if (!isContractStudentProgress(progress)) return null;
  const state = String(progress.state || "").trim();
  if (!OFFICIAL_PROGRESS_STATES.has(state)) {
    throw new Error(`CONTRACT_PROGRESS_STATE_INVALID:${state}`);
  }

  if (state === "UNAVAILABLE") {
    return unavailableProgressProjection(state, progress.unavailableReason ?? null);
  }
  if (state === "RECOMPUTING") {
    return unavailableProgressProjection(state, progress.unavailableReason ?? null);
  }

  const totals = progress.checkpoint?.totals;
  if (!totals || !Array.isArray(totals.categories)) {
    return unavailableProgressProjection("RECOMPUTING", progress.unavailableReason ?? null);
  }

  const courseCategory = totals.categories.find((item) => item.category === "COURSE_RELATED");
  const otherCategory = totals.categories.find((item) => item.category === "OTHER");
  const courseHours = Math.max(0, Number(courseCategory?.cappedCompletedMinutes) || 0) / 60;
  const generalHours = Math.max(0, Number(otherCategory?.cappedCompletedMinutes) || 0) / 60;
  const rawCourseHours = Math.max(0, Number(courseCategory?.countedRecordMinutes) || 0) / 60;
  const rawGeneralHours = Math.max(0, Number(otherCategory?.countedRecordMinutes) || 0) / 60;
  const totalHours = Math.max(0, Number(totals.totalCompletedMinutes) || 0) / 60;

  return {
    course: courseHours,
    general: generalHours,
    rawCourse: rawCourseHours,
    rawGeneral: rawGeneralHours,
    rawCountedCourseMinutes: courseCategory?.countedRecordMinutes ?? null,
    rawCountedGeneralMinutes: otherCategory?.countedRecordMinutes ?? null,
    totalValidHours: totalHours,
    qualificationStatus: totals.targetMet ? "QUALIFIED" : "NOT_QUALIFIED",
    scoreAvailable: true,
    contractState: state,
    unavailableReason: null,
    displayPercent: Number(totals.displayPercent),
    targetMet: Boolean(totals.targetMet),
    progressUnavailable: false,
    progressRecomputing: false,
  };
}

export function mapContractCourseTargets(studentCourse) {
  const rule = studentCourse?.publishedRule;
  if (!rule) return null;
  const toHours = (minutes) => Math.max(0, Number(minutes) || 0) / 60;
  return {
    total: toHours((Number(rule.courseRelatedTargetMinutes) || 0) + (Number(rule.otherTargetMinutes) || 0)),
    courseRequired: toHours(rule.courseRelatedTargetMinutes),
    generalRequired: toHours(rule.otherTargetMinutes),
    dailyLimit: null,
    categoryAllocationMode: "CATEGORY_TARGETS",
    source: "contract-student-course",
    ruleVersionId: rule.ruleVersionId,
  };
}

export function selectContractStudentProgress(progressRows, enrollmentId, courseId) {
  if (!enrollmentId || !courseId) return null;
  return (Array.isArray(progressRows) ? progressRows : []).find((progress) =>
    isContractStudentProgress(progress) &&
    progress.enrollmentId === enrollmentId &&
    progress.courseId === courseId,
  ) || null;
}
