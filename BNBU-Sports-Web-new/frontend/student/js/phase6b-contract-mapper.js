// Phase 6B: strict read adapters for Contract 1.3.0 / RC wire shapes.
// Maps official DTO fields into the existing student workspace projection.
// Does not invent credit minutes, grades, or legacy 1.2.0-only fields.

export const PHASE6B_STUDENT_CONTRACT = Object.freeze({
  version: "1.3.0-contract",
  status: "RC",
  publicBasePath: "/api/v1",
  openapiSha256: "5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed",
});

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

export function normalizeContractExerciseRecord(record, { courseIdBySection = {} } = {}) {
  const review = record.currentReview || {};
  const publicReason = readContractPublicReason(review);
  const result = readContractReviewResult(review);
  const sectionId = Object.entries(courseIdBySection).find(([, courseId]) => courseId === record.courseId)?.[0] || null;
  const creditType = record.category === "COURSE_RELATED" ? "COURSE_RELATED" : "OTHER";
  const sportType = record.activityType === "SWIMMING" ? "SWIMMING" : "OTHER";

  return {
    id: record.recordId,
    enrollmentId: record.enrollmentId,
    sessionId: record.sessionId,
    version: review.version ?? null,
    status: "REVIEWED",
    creditType,
    classSectionId: sectionId,
    courseId: record.courseId,
    sportType,
    sportName: null,
    actualDurationSeconds: record.actualDurationSeconds ?? null,
    // 1.3.0 does not expose per-record credited seconds on ExerciseRecord.
    creditedDurationSeconds: null,
    businessDate: record.businessDate,
    submittedAt: record.submittedAt,
    description: record.description || "",
    currentReview: {
      result,
      reasonCode: publicReason.code,
      publicComment: review.publicComment ?? publicReason.labelZh ?? publicReason.labelEn ?? null,
      processingStage: review.processingStage ?? null,
      materialVersionId: review.materialVersionId ?? record.currentMaterial?.materialVersionId ?? null,
    },
  };
}

export function mapContractStudentProgressProjection(progress) {
  if (!isContractStudentProgress(progress)) return null;
  const state = String(progress.state || "").trim();
  if (!OFFICIAL_PROGRESS_STATES.has(state)) {
    throw new Error(`CONTRACT_PROGRESS_STATE_INVALID:${state}`);
  }

  const empty = {
    course: 0,
    general: 0,
    rawCourse: 0,
    rawGeneral: 0,
    totalValidHours: null,
    qualificationStatus: null,
    scoreAvailable: false,
    contractState: state,
    unavailableReason: progress.unavailableReason ?? null,
    displayPercent: null,
    targetMet: null,
  };

  if (state === "UNAVAILABLE" || state === "RECOMPUTING") return empty;

  const totals = progress.checkpoint?.totals;
  if (!totals || !Array.isArray(totals.categories)) return empty;

  const courseCategory = totals.categories.find((item) => item.category === "COURSE_RELATED");
  const otherCategory = totals.categories.find((item) => item.category === "OTHER");
  const courseHours = Math.max(0, Number(courseCategory?.countedRecordMinutes) || 0) / 60;
  const generalHours = Math.max(0, Number(otherCategory?.countedRecordMinutes) || 0) / 60;
  const totalHours = Math.max(0, Number(totals.totalCompletedMinutes) || 0) / 60;

  return {
    course: courseHours,
    general: generalHours,
    rawCourse: courseHours,
    rawGeneral: generalHours,
    totalValidHours: totalHours,
    qualificationStatus: totals.targetMet ? "QUALIFIED" : "NOT_QUALIFIED",
    scoreAvailable: true,
    contractState: state,
    unavailableReason: null,
    displayPercent: Number(totals.displayPercent),
    targetMet: Boolean(totals.targetMet),
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
