/**
 * The organization's business timezone, matching the backend's
 * `organization.timezone` (Asia/Shanghai).
 *
 * Teacher and admin screens render every instant in this timezone, regardless
 * of where the browser is: staff must read a record at the same wall-clock time
 * the backend recorded it, and two staff members in different places must never
 * see different times for the same record.
 *
 * Student-facing timestamps stay in the student's own local time by design;
 * only date-based business rules (the daily check-in day) follow Beijing.
 */
export const BUSINESS_TIME_ZONE = "Asia/Shanghai";

/** True for a bare business day (YYYY-MM-DD) rather than an instant. */
export const isBusinessDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * Parses a backend value into a Date. Bare business dates are anchored at
 * Beijing noon so no timezone conversion can shift them a day either way.
 */
export function toBusinessInstant(value: string): Date | null {
  const date = isBusinessDate(value) ? new Date(`${value}T12:00:00+08:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "YYYY-MM-DD HH:mm" in Beijing time; empty string when there is no value. */
export function businessDateTime(value?: string | null): string {
  if (!value) return "";
  const date = toBusinessInstant(value);
  if (!date) return value;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: BUSINESS_TIME_ZONE,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
}
