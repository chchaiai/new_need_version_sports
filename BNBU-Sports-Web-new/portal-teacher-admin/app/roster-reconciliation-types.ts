export const RosterReconciliationStatus = {
  MATCHED: "MATCHED",
  MISSING_IN_PLATFORM: "MISSING_IN_PLATFORM",
  EXTRA_IN_PLATFORM: "EXTRA_IN_PLATFORM",
  WRONG_COURSE: "WRONG_COURSE",
  IDENTITY_CONFLICT: "IDENTITY_CONFLICT",
  DUPLICATED: "DUPLICATED",
} as const;

export type RosterReconciliationStatus = (typeof RosterReconciliationStatus)[keyof typeof RosterReconciliationStatus];

export const RosterResolutionStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  RESOLVED: "RESOLVED",
  IGNORED: "IGNORED",
} as const;

export type RosterResolutionStatus = (typeof RosterResolutionStatus)[keyof typeof RosterResolutionStatus];

export type JoinMethod = "QR_CODE" | "MANUAL" | "IMPORT";

export interface OfficialRosterStudent {
  id: string;
  courseId: string;
  studentNumber: string;
  name: string;
  gender?: string;
  grade?: string;
  college?: string;
  major?: string;
  administrativeClass?: string;
  courseName?: string;
  courseCode?: string;
  teachingClassCode?: string;
  sourceRow?: number;
}

export interface PlatformCourseMember {
  id: string;
  courseId: string;
  studentId?: string;
  studentNumber: string;
  name: string;
  gender?: string;
  grade?: string;
  joinedAt: string;
  joinMethod: JoinMethod;
}

export interface RosterCourseReference {
  id: string;
  code: string;
  name: string;
  teachingClassCode: string;
}

export interface RosterDifference {
  field: "FULL_NAME" | "GENDER" | "GRADE_YEAR" | "CLASS_SECTION";
  officialValue?: string | number | null;
  platformValue?: string | number | null;
}

export interface RosterReconciliationResult {
  id: string;
  courseId: string;
  officialStudent?: OfficialRosterStudent;
  platformMember?: PlatformCourseMember;
  status: RosterReconciliationStatus;
  differences: RosterDifference[];
  reason: string;
  resolutionStatus: RosterResolutionStatus;
  teacherNote?: string;
  updatedAt: string;
  version: number;
  lastResolutionAction?: "CONFIRM" | "RESOLVE" | "REOPEN";
}

export interface OfficialRosterVersion {
  id: string;
  courseId: string;
  versionNumber: number;
  importedAt: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicatedRows: number;
  isCurrent: boolean;
  source: "FILE" | "OFFICIAL_API";
  status: "RECEIVED" | "VALIDATING" | "VALIDATED" | "FAILED";
  version: number;
}

export interface OfficialRosterSnapshot {
  version: OfficialRosterVersion;
  students: OfficialRosterStudent[];
}

export interface RosterReconciliationStats {
  officialTotal: number;
  platformTotal: number;
  matched: number;
  notJoined: number;
  wrongCourse: number;
  otherExceptions: number;
  pending: number;
  lastReconciledAt?: string;
}

export interface RosterReconciliationBundle {
  currentRoster: OfficialRosterSnapshot | null;
  versions: OfficialRosterVersion[];
  results: RosterReconciliationResult[];
  stats: RosterReconciliationStats;
  platformUpdatedAt?: string;
}

export const ROSTER_IMPORT_FIELDS = [
  "studentNumber",
  "fullName",
  "gender",
  "gradeYear",
  "collegeName",
  "majorName",
  "administrativeClassName",
] as const;

export type RosterImportField = (typeof ROSTER_IMPORT_FIELDS)[number];
export type RosterFieldMapping = Record<RosterImportField, string | null>;

export interface RosterImportRowError {
  rowNumber: number;
  code:
    | "MISSING_STUDENT_NUMBER"
    | "MISSING_FULL_NAME"
    | "INVALID_STUDENT_NUMBER"
    | "DUPLICATE_STUDENT_NUMBER"
    | "EMPTY_ROW";
  message: string;
}

export interface ParsedRosterFile {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  previewRows: Record<string, string>[];
  suggestedMapping: RosterFieldMapping;
  sheetName: string;
  totalRows: number;
}

export interface ValidatedRosterImport {
  students: Omit<OfficialRosterStudent, "id" | "courseId">[];
  errors: RosterImportRowError[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export interface ImportOfficialRosterInput {
  course: RosterCourseReference;
  parsed: ParsedRosterFile;
  mapping: RosterFieldMapping;
}

export interface ReconciliationContext {
  course: RosterCourseReference;
  courses: RosterCourseReference[];
  platformMembers: PlatformCourseMember[];
}

export interface RosterApiAdapter {
  getBundle(
    courseId: string,
    context?: ReconciliationContext,
  ): Promise<RosterReconciliationBundle>;
  getOfficialRoster(courseId: string): Promise<OfficialRosterSnapshot | null>;
  getVersions(courseId: string): Promise<OfficialRosterVersion[]>;
  getStats(courseId: string): Promise<RosterReconciliationStats>;
  getResults(courseId: string): Promise<RosterReconciliationResult[]>;
  importOfficialRoster(input: ImportOfficialRosterInput): Promise<RosterReconciliationBundle>;
  reconcile(context: ReconciliationContext): Promise<RosterReconciliationBundle>;
  updateResolution(
    courseId: string,
    resultIds: string[],
    resolutionStatus: RosterResolutionStatus,
    reason: string,
  ): Promise<RosterReconciliationBundle>;
}
