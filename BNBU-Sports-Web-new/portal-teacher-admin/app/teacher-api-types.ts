// UI adapter shapes used by the teacher workspace.
// Canonical current API models are generated in openapi.generated.ts; keep
// additions here limited to explicit view-only compatibility fields.

import type { components } from "./openapi.generated";

type ContractSchemas = components["schemas"];

export type ContractClassSection = ContractSchemas["ClassSection"];
export type ContractEnrollment = ContractSchemas["Enrollment"];
export type ContractExerciseRecord = ContractSchemas["ExerciseRecord"];
export type ContractStudentScore = ContractSchemas["StudentScore"];
export type ReviewRecord = ContractSchemas["ReviewRecord"];
export type ExemptionApplication = ContractSchemas["ExemptionApplication"];
export type StructuredExemptionApplication =
  ContractSchemas["StructuredExemptionApplication"];
export type ReviewExemptionApplicationBody =
  ContractSchemas["ReviewExemptionApplicationRequest"];

export type OpaqueId = string;

// Enum members mirror the API schemas of the same name
// (ClassSectionStatus, EnrollmentStatus, ExerciseRecordStatus, ReviewResult,
// ReviewReasonCode in openapi.snapshot.yaml). The trailing `string` keeps the
// client tolerant of values a newer contract may add.
export type ClassSectionStatus =
  | "UPCOMING"
  | "ACTIVE"
  | "CLOSED"
  | "ARCHIVED"
  | string;
export type EnrollmentStatus = "ACTIVE" | "WITHDRAWN" | "REMOVED" | string;
export type ExerciseRecordStatus = "DRAFT" | "SUBMITTED" | "REVIEWED" | "CANCELLED" | string;
export type ReviewResult = "VALID" | "INVALID";
export type ReviewReasonCode =
  | "INSUFFICIENT_EVIDENCE"
  | "INVALID_MEDIA"
  | "DURATION_INCONSISTENT"
  | "IDENTITY_MISMATCH"
  | "DUPLICATE_SUBMISSION"
  | "OUTSIDE_ALLOWED_SCOPE"
  | "OTHER";

export type ClassSection = {
  id: OpaqueId;
  organizationId: OpaqueId;
  courseId: OpaqueId;
  semesterId: OpaqueId;
  teacherId: OpaqueId;
  classCode: string;
  displayName: string;
  status: ClassSectionStatus;
  isEnrollmentOpen: boolean;
  checkInWindowMode?: string | null;
  checkInStartDate?: string | null;
  checkInEndDate?: string | null;
  dailyStartTime?: string | null;
  dailyEndTime?: string | null;
  submissionDeadlineAt?: string | null;
  excludedDates?: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type CourseCatalog = {
  id: OpaqueId;
  organizationId: OpaqueId;
  courseCode: string;
  courseName: string;
  description?: string | null;
  status: string;
  version: number;
};

export type Semester = {
  id: OpaqueId;
  organizationId: OpaqueId;
  code?: string;
  displayName?: string;
  name?: string;
  academicYear?: string;
  termCode?: string;
  status?: string;
  startsOn?: string | null;
  endsOn?: string | null;
  version?: number;
};

export type CourseInvite = {
  inviteToken: string;
  classSectionId: OpaqueId;
  expiresAt: string;
};

export type Enrollment = {
  id: OpaqueId;
  organizationId: OpaqueId;
  semesterId: OpaqueId;
  classSectionId: OpaqueId;
  studentId: OpaqueId;
  source: string;
  sourceReferenceId: string | null;
  status: EnrollmentStatus;
  joinedAt: string;
  endedAt: string | null;
  endReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type StudentCurrentReview = {
  result: ReviewResult;
  reasonCode: ReviewReasonCode | null;
  publicComment: string | null;
};

export type ExerciseRecord = {
  id: OpaqueId;
  organizationId: OpaqueId;
  semesterId: OpaqueId;
  studentId: OpaqueId;
  enrollmentId: OpaqueId;
  classSectionId: OpaqueId;
  courseId: OpaqueId;
  teacherId: OpaqueId;
  sessionId: OpaqueId;
  businessDate: string;
  creditType: "COURSE_RELATED" | "GENERAL" | string;
  sportType: string;
  sportName: string | null;
  description: ContractExerciseRecord["description"];
  studentRemark: string | null;
  actualDurationSeconds: number;
  pausedDurationSeconds: number;
  creditedDurationSeconds: number;
  status: ExerciseRecordStatus;
  submittedAt: string | null;
  cancelledAt: string | null;
  clientRequestId: string;
  currentReview: StudentCurrentReview | null;
  version: number;
};

// Additive sidecar introduced after the frozen ExerciseRecord projection.
// Do not merge these fields into ExerciseRecord: legacy list/detail responses
// deliberately remain byte-compatible with the published baseline.
export type ExerciseRecordEvidenceContext = {
  recordId: OpaqueId;
  sessionId: OpaqueId;
  startedAt: string;
  endedAt: string | null;
  mediaIds: OpaqueId[];
};

export type MediaAccess = {
  mediaId: OpaqueId;
  accessUrl: string;
  expiresAt: string;
};

export type StudentScore = {
  id: OpaqueId;
  organizationId: OpaqueId;
  enrollmentId: OpaqueId;
  scoreRuleId: OpaqueId;
  calculationRevision: number;
  validCourseDurationSeconds: number;
  validGeneralDurationSeconds: number;
  totalValidDurationSeconds: number;
  scoringSeconds: number;
  excessSeconds: number;
  qualificationStatus: string;
  baseScore: number | null;
  adjustmentTotal: number | null;
  finalScore: number | null;
  status: string;
  calculatedAt: string | null;
  publishedAt: string | null;
  lockedAt: string | null;
  sourceFingerprint: string | null;
  version: number;
};

export type StudentProfileApi = {
  id: OpaqueId;
  fullName?: string | null;
  studentNumber?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | string | null;
  gradeYear?: number | null;
  primaryEmail?: string | null;
  [key: string]: unknown;
};

export type VersionedReasonBody = ContractSchemas["VersionedReasonRequest"];
export type ExpectedVersionBody = ContractSchemas["ExpectedVersionRequest"];

/** Check-in window subset of UpdateClassSectionRequest (兼容逻辑). */
export type UpdateClassSectionWindowBody = {
  checkInWindowMode?: "AVAILABLE" | "UNAVAILABLE";
  checkInStartDate?: string | null;
  checkInEndDate?: string | null;
  dailyStartTime?: string | null;
  dailyEndTime?: string | null;
  submissionDeadlineAt?: string | null;
  excludedDates?: string[];
  expectedVersion: number;
};

export type ProgressTarget = {
  id: OpaqueId;
  classSectionId: OpaqueId;
  courseTargetSeconds: number;
  generalTargetSeconds: number;
  totalTargetSeconds: number;
  effectiveFrom: string;
  version: number;
};

export type ProgressTargetRevisionBody = {
  courseTargetSeconds: number;
  generalTargetSeconds: number;
  reason: string;
  expectedVersion: number;
};

export type CreateReviewBody = {
  result: "VALID" | "INVALID";
  publicComment?: string | null;
  reasonCode?: ReviewReasonCode | null;
  reason?: string | null;
  internalNote?: string | null;
  expectedReviewVersion: number;
  expectedVersion: number;
};
