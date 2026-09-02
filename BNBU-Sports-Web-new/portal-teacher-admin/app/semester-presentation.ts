export type SemesterPresentationSource = {
  displayName?: string | null;
  name?: string | null;
  academicYear?: string | null;
  termCode?: string | null;
  term?: string | null;
};

const ADMIN_TERM_LABELS: Record<string, string> = {
  FIRST: "第一学期",
  FIRST_SEMESTER: "第一学期",
  SECOND: "第二学期",
  SECOND_SEMESTER: "第二学期",
  SUMMER: "暑期学期",
  SUMMER_TERM: "暑期学期",
};

/**
 * The administrator-owned display name is authoritative. Structured semester
 * fields are used only as a safe fallback when an older response omits it.
 */
export function semesterDisplayName(
  semester: SemesterPresentationSource | null | undefined,
  fallback = "—",
): string {
  const managedName = semester?.displayName?.trim() || semester?.name?.trim();
  if (managedName) return managedName;

  const academicYear = semester?.academicYear?.trim() ?? "";
  const rawTerm = semester?.termCode?.trim() || semester?.term?.trim() || "";
  const normalizedTerm = rawTerm.replace(/[\s-]+/g, "_").toUpperCase();
  const termLabel = ADMIN_TERM_LABELS[normalizedTerm] || rawTerm;
  const generated = [academicYear, termLabel].filter(Boolean).join(" ");
  return generated || fallback;
}
