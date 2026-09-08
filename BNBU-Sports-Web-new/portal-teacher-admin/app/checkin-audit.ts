import { sumKnownCredits } from "./credit-values";

export type AuditStatus = "valid" | "invalid" | "processing";

export interface AttendanceAuditState {
  auditStatus: AuditStatus;
  invalidReason?: string;
  auditRemark?: string;
}

export interface AuditableAttendanceRecord extends AttendanceAuditState {
  creditedMinutes: number | null;
}

/**
 * Changes only the review conclusion. The server-awarded duration remains an
 * immutable record fact; whether it contributes to the summary is decided by
 * deriveAuditSummary from the current audit result.
 */
export function applyAttendanceAuditState<
  T extends AuditableAttendanceRecord,
>(record: T, state: AttendanceAuditState): T {
  return {
    ...record,
    auditStatus: state.auditStatus,
    invalidReason:
      state.auditStatus === "invalid" ? state.invalidReason : undefined,
    auditRemark: state.auditRemark,
  };
}

interface AuditCounts {
  validCount: number;
  invalidCount: number;
  pendingCount: number;
}

export type AttendanceAuditSummary = AuditCounts & ({
  creditState: "KNOWN";
  validMinutes: number;
  remainingMinutes: number;
  exceededMinutes: number;
  hasReachedTarget: boolean;
  progressPercent: number;
} | {
  creditState: "UNAVAILABLE";
  validMinutes: null;
  remainingMinutes: null;
  exceededMinutes: null;
  hasReachedTarget: null;
  progressPercent: null;
});

export type CreditedDurationHours = 0 | 1 | 2;

export function toCreditedDurationHours(
  minutes: number,
): CreditedDurationHours | null {
  if (minutes === 0 || minutes === 60 || minutes === 120)
    return (minutes / 60) as CreditedDurationHours;
  return null;
}

export function deriveAuditSummary(
  records: readonly AuditableAttendanceRecord[],
  requiredMinutes: number | null,
): AttendanceAuditSummary {
  const totals = records.reduce(
    (summary, record) => {
      if (record.auditStatus === "valid") {
        summary.validCount += 1;
      } else if (record.auditStatus === "invalid") {
        summary.invalidCount += 1;
      } else if (record.auditStatus === "processing") {
        summary.pendingCount += 1;
      }
      return summary;
    },
    { validCount: 0, invalidCount: 0, pendingCount: 0 },
  );

  const validMinutes = sumKnownCredits(
    records.filter((record) => record.auditStatus === "valid").map((record) => record.creditedMinutes),
  );
  if (validMinutes === null || requiredMinutes === null || !Number.isFinite(requiredMinutes) || requiredMinutes < 0) {
    return {
      ...totals,
      creditState: "UNAVAILABLE",
      validMinutes: null,
      remainingMinutes: null,
      exceededMinutes: null,
      hasReachedTarget: null,
      progressPercent: null,
    };
  }
  const normalizedTarget = requiredMinutes;
  const remainingMinutes = Math.max(0, normalizedTarget - validMinutes);
  const exceededMinutes = Math.max(0, validMinutes - normalizedTarget);
  const hasReachedTarget = validMinutes >= normalizedTarget;
  const progressPercent = normalizedTarget === 0
    ? 100
    : Math.min(100, (validMinutes / normalizedTarget) * 100);

  return {
    ...totals,
    creditState: "KNOWN",
    validMinutes,
    remainingMinutes,
    exceededMinutes,
    hasReachedTarget,
    progressPercent,
  };
}
