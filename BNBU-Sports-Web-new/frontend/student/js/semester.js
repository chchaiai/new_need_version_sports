const ADMIN_TERM_LABELS = Object.freeze({
  FIRST: "第一学期",
  FIRST_SEMESTER: "第一学期",
  SECOND: "第二学期",
  SECOND_SEMESTER: "第二学期",
  SUMMER: "暑期学期",
  SUMMER_TERM: "暑期学期",
});

/**
 * Keep the administrator-managed display name intact. Structured fields only
 * provide a fallback for older responses that do not include displayName.
 */
export function semesterDisplayName(semester, fallback = "") {
  const managedName = String(semester?.displayName || semester?.name || "").trim();
  if (managedName) return managedName;

  const academicYear = String(semester?.academicYear || "").trim();
  const rawTerm = String(semester?.termCode || semester?.term || "").trim();
  const normalizedTerm = rawTerm.replace(/[\s-]+/g, "_").toUpperCase();
  const termLabel = ADMIN_TERM_LABELS[normalizedTerm] || rawTerm;
  return [academicYear, termLabel].filter(Boolean).join(" ") || fallback;
}
