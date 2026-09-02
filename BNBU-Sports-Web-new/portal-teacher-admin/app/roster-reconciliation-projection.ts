import type { components } from "./openapi.generated";
import type {
  OfficialRosterSnapshot,
  OfficialRosterStudent,
  PlatformCourseMember,
  RosterCourseReference,
  RosterReconciliationResult,
  RosterReconciliationStatus,
} from "./roster-reconciliation-types";

type ApiRosterImport = components["schemas"]["OfficialRosterImport"];
type ApiRosterEntry = components["schemas"]["OfficialRosterEntry"];
type ApiAlignmentResult = components["schemas"]["RosterAlignmentResult"];

export const ROSTER_API_PATHS = {
  rosterVersions: (classSectionId: string) =>
    `/class-sections/${encodeURIComponent(classSectionId)}/roster-imports`,
  currentRoster: (classSectionId: string) =>
    `/class-sections/${encodeURIComponent(classSectionId)}/roster-imports/current`,
  uploadRoster: (classSectionId: string) =>
    `/class-sections/${encodeURIComponent(classSectionId)}/roster-imports`,
  rosterEntries: (rosterImportId: string) =>
    `/roster-imports/${encodeURIComponent(rosterImportId)}/entries`,
  align: (rosterImportId: string) =>
    `/roster-imports/${encodeURIComponent(rosterImportId)}/align`,
  alignmentResults: "/roster-alignment-results",
  confirm: (resultId: string) =>
    `/roster-alignment-results/${encodeURIComponent(resultId)}/confirm`,
  reopen: (resultId: string) =>
    `/roster-alignment-results/${encodeURIComponent(resultId)}/reopen`,
} as const;

function mapGender(value: string | null): string | undefined {
  if (value === "MALE") return "男";
  if (value === "FEMALE") return "女";
  if (value === "OTHER") return "其他";
  return undefined;
}

export function mapRosterVersion(value: ApiRosterImport) {
  return {
    id: value.id,
    courseId: value.classSectionId,
    versionNumber: value.versionNumber,
    importedAt: value.importedAt,
    totalRows: value.totalRowCount,
    validRows: value.validRowCount,
    invalidRows: value.invalidRowCount,
    duplicatedRows: value.duplicatedRowCount,
    isCurrent: value.isCurrent,
    source: value.source,
    status: value.status,
    version: value.version,
  };
}

export function mapRosterEntry(
  value: ApiRosterEntry,
  course?: RosterCourseReference,
): OfficialRosterStudent {
  return {
    id: value.id,
    courseId: value.classSectionId,
    studentNumber: value.studentNumber ?? "",
    name: value.fullName ?? "",
    gender: mapGender(value.gender),
    grade: value.gradeYear === null ? undefined : `${value.gradeYear}级`,
    college: value.collegeName ?? undefined,
    major: value.majorName ?? undefined,
    administrativeClass: value.administrativeClassName ?? undefined,
    courseName: course?.name,
    courseCode: course?.code,
    teachingClassCode: course?.teachingClassCode,
    sourceRow: value.sourceRowNumber,
  };
}

const STATUS_REASON: Record<RosterReconciliationStatus, string> = {
  MATCHED: "后端核对结果：官方名单与平台成员一致。",
  MISSING_IN_PLATFORM: "后端核对结果：官方名单中存在，但当前平台成员中不存在。",
  EXTRA_IN_PLATFORM: "后端核对结果：平台成员中存在，但当前官方名单中不存在。",
  WRONG_COURSE: "后端核对结果：学生当前加入的教学班与官方名单归属不一致。",
  IDENTITY_CONFLICT: "后端核对结果：学号匹配，但主要身份字段不一致。",
  DUPLICATED: "后端核对结果：官方名单或平台成员存在重复身份记录。",
};

function findPlatformMember(
  raw: ApiAlignmentResult,
  members: PlatformCourseMember[],
): PlatformCourseMember | undefined {
  if (raw.enrollmentId) {
    const byEnrollment = members.find((member) => member.id === raw.enrollmentId);
    if (byEnrollment) return byEnrollment;
  }
  if (raw.studentId)
    return members.find((member) => member.studentId === raw.studentId);
  return undefined;
}

export function mapAlignmentResult(
  raw: ApiAlignmentResult,
  entriesById: Map<string, OfficialRosterStudent>,
  members: PlatformCourseMember[],
): RosterReconciliationResult {
  return {
    id: raw.id,
    courseId: raw.classSectionId,
    officialStudent: raw.rosterEntryId
      ? entriesById.get(raw.rosterEntryId)
      : undefined,
    platformMember: findPlatformMember(raw, members),
    status: raw.status,
    differences: raw.differences.map((difference) => ({
      field: difference.field,
      officialValue: difference.officialValue,
      platformValue: difference.platformValue,
    })),
    reason: STATUS_REASON[raw.status],
    resolutionStatus: raw.resolutionStatus,
    teacherNote: raw.resolutionNote ?? undefined,
    updatedAt: raw.createdAt,
    version: raw.version,
    lastResolutionAction: raw.lastResolutionAction ?? undefined,
  };
}

export function deriveStats(
  currentRoster: OfficialRosterSnapshot | null,
  results: RosterReconciliationResult[],
  members: PlatformCourseMember[],
  courseId: string,
  latestAlignmentAt?: string,
) {
  const count = (status: RosterReconciliationStatus) =>
    results.filter((result) => result.status === status).length;
  const resultTimestamp = results.reduce<string | undefined>(
    (latest, result) =>
      latest === undefined || result.updatedAt > latest
        ? result.updatedAt
        : latest,
    undefined,
  );
  return {
    officialTotal: currentRoster?.version.validRows ?? 0,
    platformTotal: members.filter((member) => member.courseId === courseId)
      .length,
    matched: count("MATCHED"),
    notJoined: count("MISSING_IN_PLATFORM"),
    wrongCourse: count("WRONG_COURSE"),
    otherExceptions:
      count("EXTRA_IN_PLATFORM") +
      count("IDENTITY_CONFLICT") +
      count("DUPLICATED"),
    pending: results.filter((result) => result.resolutionStatus === "PENDING")
      .length,
    lastReconciledAt: latestAlignmentAt ?? resultTimestamp,
  };
}
