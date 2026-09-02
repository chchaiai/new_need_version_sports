export type AuditStatus = "valid" | "invalid";

export interface AttendanceAuditState {
  auditStatus: AuditStatus;
  invalidReason?: string;
  auditRemark?: string;
}

export interface AuditableAttendanceRecord extends AttendanceAuditState {
  creditedMinutes: number;
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

export interface AttendanceAuditSummary {
  validCount: number;
  invalidCount: number;
  pendingCount: number;
  validMinutes: number;
  remainingMinutes: number;
  exceededMinutes: number;
  hasReachedTarget: boolean;
  progressPercent: number;
}

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
  requiredMinutes: number,
): AttendanceAuditSummary {
  const totals = records.reduce(
    (summary, record) => {
      if (record.auditStatus === "valid") {
        summary.validCount += 1;
        summary.validMinutes += Math.max(0, record.creditedMinutes);
      } else if (record.auditStatus === "invalid") {
        summary.invalidCount += 1;
      }
      return summary;
    },
    { validCount: 0, invalidCount: 0, pendingCount: 0, validMinutes: 0 },
  );

  const normalizedTarget = Math.max(0, requiredMinutes);
  const remainingMinutes = Math.max(0, normalizedTarget - totals.validMinutes);
  const exceededMinutes = Math.max(0, totals.validMinutes - normalizedTarget);
  const hasReachedTarget = totals.validMinutes >= normalizedTarget;
  const progressPercent = normalizedTarget === 0
    ? 100
    : Math.min(100, (totals.validMinutes / normalizedTarget) * 100);

  return {
    ...totals,
    remainingMinutes,
    exceededMinutes,
    hasReachedTarget,
    progressPercent,
  };
}
