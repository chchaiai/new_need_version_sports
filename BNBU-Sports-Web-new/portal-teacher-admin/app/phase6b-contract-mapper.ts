// Phase 6B: strict read adapters for Contract 1.3.0 / RC wire shapes on Portal.
// Normalizes official ExerciseRecord into the legacy teacher-api projection input.
// Does not invent credited minutes, grades, or legacy 1.2.0-only fields.

import type { ExerciseRecord, ReviewReasonCode } from "./teacher-api-types";

export const PHASE6B_PORTAL_CONTRACT = Object.freeze({
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

const PUBLIC_REASON_WIRE_LABELS: Record<string, string> = {
  UNCLEAR_EVIDENCE: "材料不清晰",
  MISSING_REQUIRED_EVIDENCE: "必需材料缺失（含要求的前后照）",
  EVIDENCE_SESSION_MISMATCH: "材料与本次运动不符",
  INCONSISTENT_EVIDENCE: "材料信息矛盾",
  AUTHENTICITY_REQUIRES_CLARIFICATION: "材料真实性待核实",
  CONFIRMED_REUSE_OR_MISUSE: "经核实存在重复使用或冒用材料",
  SUPPLEMENT_DEADLINE_MISSED: "补证逾期",
};

export const PUBLIC_REASON_ID_TO_WIRE = Object.freeze({
  UnclearEvidence: "UNCLEAR_EVIDENCE",
  MissingRequiredEvidence: "MISSING_REQUIRED_EVIDENCE",
  EvidenceDoesNotMatchSession: "EVIDENCE_SESSION_MISMATCH",
  InconsistentEvidence: "INCONSISTENT_EVIDENCE",
  AuthenticityRequiresClarification: "AUTHENTICITY_REQUIRES_CLARIFICATION",
  ConfirmedReuseOrMisuse: "CONFIRMED_REUSE_OR_MISUSE",
});

type UnknownRecord = Record<string, unknown>;

export function isContractExerciseRecord(record: unknown): boolean {
  return Boolean(
    record &&
    typeof record === "object" &&
    typeof (record as UnknownRecord).recordId === "string" &&
    (record as UnknownRecord).currentMaterial &&
    typeof (record as UnknownRecord).currentMaterial === "object",
  );
}

export function rejectUnknownPublicReasonCode(code: string | null | undefined): string | null {
  const normalized = String(code || "").trim();
  if (!normalized) return null;
  if (!OFFICIAL_PUBLIC_REASON_CODES.has(normalized)) {
    throw new Error(`CONTRACT_PUBLIC_REASON_INVALID:${normalized}`);
  }
  return normalized;
}

export function readContractPublicReason(review: UnknownRecord = {}) {
  const publicReason = review.publicReason;
  if (publicReason && typeof publicReason === "object") {
    const reason = publicReason as UnknownRecord;
    const code = rejectUnknownPublicReasonCode(
      typeof reason.code === "string" ? reason.code : null,
    );
    const label = reason.label;
    const labelRecord =
      label && typeof label === "object" ? (label as UnknownRecord) : {};
    return {
      code,
      labelZh: typeof labelRecord.zh === "string" ? labelRecord.zh : null,
      labelEn: typeof labelRecord.en === "string" ? labelRecord.en : null,
    };
  }
  const legacyCode = typeof review.reasonCode === "string" ? review.reasonCode : "";
  if (!legacyCode.trim()) {
    return { code: null, labelZh: null, labelEn: null };
  }
  return {
    code: rejectUnknownPublicReasonCode(legacyCode),
    labelZh: null,
    labelEn: null,
  };
}

export function publicReasonDisplayLabel(
  review: UnknownRecord | null | undefined,
): string | undefined {
  if (!review) return undefined;
  const publicReason = readContractPublicReason(review);
  if (publicReason.labelZh) return publicReason.labelZh;
  if (publicReason.code && PUBLIC_REASON_WIRE_LABELS[publicReason.code]) {
    return PUBLIC_REASON_WIRE_LABELS[publicReason.code];
  }
  return undefined;
}

function mapPublicReasonToLegacyCode(code: string | null): ReviewReasonCode | null {
  if (!code) return null;
  const map: Record<string, ReviewReasonCode> = {
    UNCLEAR_EVIDENCE: "INSUFFICIENT_EVIDENCE",
    MISSING_REQUIRED_EVIDENCE: "INSUFFICIENT_EVIDENCE",
    EVIDENCE_SESSION_MISMATCH: "OUTSIDE_ALLOWED_SCOPE",
    INCONSISTENT_EVIDENCE: "DURATION_INCONSISTENT",
    AUTHENTICITY_REQUIRES_CLARIFICATION: "IDENTITY_MISMATCH",
    CONFIRMED_REUSE_OR_MISUSE: "DUPLICATE_SUBMISSION",
    SUPPLEMENT_DEADLINE_MISSED: "OTHER",
  };
  return map[code] ?? "OTHER";
}

export function normalizeContractExerciseRecordForTeacher(
  record: UnknownRecord,
  context: { classSectionId?: string; studentId?: string } = {},
): ExerciseRecord {
  const review = (record.currentReview || {}) as UnknownRecord;
  const publicReason = readContractPublicReason(review);
  const student =
    record.student && typeof record.student === "object"
      ? (record.student as UnknownRecord)
      : null;
  const studentId =
    context.studentId ||
    (typeof student?.studentId === "string" ? student.studentId : "") ||
    (typeof student?.id === "string" ? student.id : "");
  const result =
    review.result == null || review.result === ""
      ? null
      : String(review.result).trim();
  if (result && result !== "VALID" && result !== "INVALID") {
    throw new Error(`CONTRACT_REVIEW_RESULT_INVALID:${result}`);
  }

  return {
    id: String(record.recordId),
    organizationId: "",
    semesterId: "",
    studentId,
    enrollmentId: String(record.enrollmentId || ""),
    classSectionId: context.classSectionId || "",
    courseId: String(record.courseId || ""),
    teacherId: "",
    sessionId: String(record.sessionId || ""),
    businessDate: String(record.businessDate || ""),
    creditType: record.category === "COURSE_RELATED" ? "COURSE_RELATED" : "GENERAL",
    sportType: record.activityType === "SWIMMING" ? "SWIMMING" : "OTHER",
    sportName: null,
    description: typeof record.description === "string" ? record.description : "",
    studentRemark: null,
    actualDurationSeconds: Number(record.actualDurationSeconds || 0),
    pausedDurationSeconds: 0,
    // 1.3.0 does not expose per-record credited seconds on ExerciseRecord.
    creditedDurationSeconds: 0,
    status: result ? "REVIEWED" : "SUBMITTED",
    submittedAt: typeof record.submittedAt === "string" ? record.submittedAt : null,
    cancelledAt: null,
    clientRequestId: "",
    currentReview: result
      ? {
          result: result as "VALID" | "INVALID",
          reasonCode: mapPublicReasonToLegacyCode(publicReason.code),
          publicComment:
            typeof review.publicComment === "string" ? review.publicComment : null,
        }
      : null,
    version: Number(review.version || 0),
  };
}
