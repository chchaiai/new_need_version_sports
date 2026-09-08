import type { AttendanceAuditSummary } from "./checkin-audit";

function hoursLabel(minutes: number) {
  return (Math.max(0, minutes) / 60).toFixed(1);
}

export function CheckinAuditSummary({
  summary,
  requiredMinutes,
}: {
  summary: AttendanceAuditSummary;
  requiredMinutes: number | null;
}) {
  if (summary.creditState === "UNAVAILABLE" || requiredMinutes === null) {
    return (
      <section className="checkin-audit-summary" aria-label="打卡审核汇总">
        <div className="audit-summary-heading">
          <span>计入时长汇总</span>
          <strong>待确认</strong>
        </div>
        <p role="status">计入数据或目标尚未完整，暂不显示总时长、剩余时长和达标结果。</p>
        <div className="audit-progress-note">
          <span>有效 {summary.validCount} · 无效 {summary.invalidCount} · 处理中 {summary.pendingCount}</span>
        </div>
      </section>
    );
  }
  return (
    <section className="checkin-audit-summary" aria-label="打卡审核汇总">
      <div className="audit-summary-progress">
        <div className="audit-summary-heading">
          <div>
            <span>有效时长</span>
            <strong>{hoursLabel(summary.validMinutes)}<small> / {hoursLabel(requiredMinutes)} 小时</small></strong>
          </div>
          <span className="audit-overall-status is-complete">有效学时汇总</span>
        </div>
        <div className="audit-progress-track" role="progressbar" aria-label="有效打卡时长进度"
          aria-valuemin={0} aria-valuemax={requiredMinutes}
          aria-valuenow={Math.min(summary.validMinutes, requiredMinutes)}>
          <span style={{ width: `${summary.progressPercent}%` }} />
        </div>
        <div className="audit-progress-note">
          <span>{summary.hasReachedTarget
            ? summary.exceededMinutes > 0
              ? `已超出目标 ${hoursLabel(summary.exceededMinutes)} 小时`
              : "已达到教师设置的学时目标"
            : `还差 ${hoursLabel(summary.remainingMinutes)} 小时`}</span>
          <span>有效 {summary.validCount} · 无效 {summary.invalidCount} · 处理中 {summary.pendingCount}</span>
        </div>
      </div>
    </section>
  );
}
