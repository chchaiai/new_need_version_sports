export type AdminSupportSearchRecord = {
  id: string;
  requester?: string | null;
  studentNumber?: string | null;
  email?: string | null;
  category?: string | null;
  categoryLabel?: string | null;
  summary: string;
};

function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase();
}

export function matchesAdminSupportSearch(
  record: AdminSupportSearchRecord,
  search: string,
) {
  const terms = normalizeSearchValue(search).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const index = [
    record.id,
    record.requester,
    record.studentNumber,
    record.email,
    record.category,
    record.categoryLabel,
    record.summary,
  ]
    .map(normalizeSearchValue)
    .join(" ");

  return terms.every((term) => index.includes(term));
}
