export type CourseInviteStatus = "active" | "expired" | "revoked" | "invalid";

type CourseInviteState = {
  expiresAt: string;
  status: "active" | "revoked";
};

// Android's scanner deliberately accepts this exact HTTPS /join/{code} payload.
// It is a QR transport format only; this web portal has no student-facing /join page.
const ANDROID_COURSE_JOIN_QR_ORIGIN = "https://sports.example.com";

export function normalizeInviteCode(value: string) {
  // Real invite tokens are case-sensitive; do not force uppercase.
  return value.trim().replace(/\s+/g, "");
}

export function createAndroidInviteQrPayload(code: string) {
  const normalizedCode = normalizeInviteCode(code);
  return `${ANDROID_COURSE_JOIN_QR_ORIGIN}/join/${encodeURIComponent(normalizedCode)}`;
}

export function getInviteStatus(invite: CourseInviteState, now = Date.now()): CourseInviteStatus {
  if (invite.status === "revoked") return "revoked";
  const expiresAt = Date.parse(invite.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return "expired";
  return "active";
}

export function inviteStatusLabel(status: CourseInviteStatus) {
  return {
    active: "有效",
    expired: "已过期",
    revoked: "已撤销",
    invalid: "无效邀请码",
  }[status];
}

export function formatInviteExpiry(expiresAt: string) {
  const value = new Date(expiresAt);
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(value).replace(/\//g, "-");
}

export function formatInviteRemaining(expiresAt: string, now = Date.now()) {
  const remaining = Date.parse(expiresAt) - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "已到期";
  const totalMinutes = Math.ceil(remaining / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} 天 ${hours} 小时后到期`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟后到期`;
  return `${minutes} 分钟后到期`;
}
