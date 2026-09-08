import { assertContractWire, isContractExerciseRecord, isContractStudentProgress } from "./contract/wire.js";

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

export { isContractExerciseRecord, isContractStudentProgress };

export function assertContractExerciseRecordWire(record) {
  return assertContractWire("ExerciseRecord", record);
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
    assertContractWire("PublicReviewReason", review.publicReason);
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
  assertContractWire("RecordReviewSummary", review);
  return review.result;
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

function requireConsistentProgress(condition, rule) {
  if (condition) return;
  const error = new Error(`CONTRACT_PROGRESS_INCONSISTENT:${rule}`);
  error.name = "ContractProgressConsistencyError";
  throw error;
}

function assertContractStudentProgress(progress) {
  assertContractWire("StudentCourseProgress", progress);
  const checkpoint = progress.checkpoint;
  if (checkpoint === null) return;

  // Match Android's checkpoint ownership and source-sum checks, including
  // historical checkpoints carried by RECOMPUTING. Never repair server values.
  requireConsistentProgress(
    checkpoint.courseId.toLowerCase() === progress.courseId.toLowerCase() &&
    checkpoint.enrollmentId.toLowerCase() === progress.enrollmentId.toLowerCase(),
    "CHECKPOINT_OWNER",
  );
  const totals = checkpoint.totals;
  for (const category of totals.categories) {
    requireConsistentProgress(
      category.cappedCompletedMinutes === category.countedRecordMinutes + category.countedCertificationMinutes &&
      category.remainingMinutes === category.targetMinutes - category.cappedCompletedMinutes,
      "CATEGORY_TOTALS",
    );
  }
  for (const [categoryField, totalField] of [
    ["targetMinutes", "totalTargetMinutes"],
    ["cappedCompletedMinutes", "totalCompletedMinutes"],
    ["countedRecordMinutes", "countedRecordMinutes"],
    ["countedCertificationMinutes", "countedCertificationMinutes"],
  ]) {
    requireConsistentProgress(
      totals.categories.reduce((sum, category) => sum + category[categoryField], 0) === totals[totalField],
      "PROGRESS_TOTALS",
    );
  }
}

export function mapContractStudentProgressProjection(progress) {
  if (!isContractStudentProgress(progress)) return null;
  assertContractStudentProgress(progress);
  const state = progress.state;

  if (state === "UNAVAILABLE") {
    return unavailableProgressProjection(state, progress.unavailableReason ?? null);
  }
  if (state === "RECOMPUTING") {
    return unavailableProgressProjection(state, progress.unavailableReason ?? null);
  }

  const totals = progress.checkpoint?.totals;
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
  if (studentCourse == null) return null;
  assertContractWire("StudentCourse", studentCourse);
  const rule = studentCourse.publishedRule;
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
  const rows = Array.isArray(progressRows) ? progressRows : [];
  for (const progress of rows) {
    if (isContractStudentProgress(progress)) assertContractStudentProgress(progress);
  }
  return rows.find((progress) =>
    isContractStudentProgress(progress) &&
    progress.enrollmentId === enrollmentId &&
    progress.courseId === courseId,
  ) || null;
}
