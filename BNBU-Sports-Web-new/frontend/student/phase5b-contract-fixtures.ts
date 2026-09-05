import type { components, operations } from "./phase5b-contract.generated";

type Schema<Name extends keyof components["schemas"]> = components["schemas"][Name];

// openapi-typescript 7.13 infers the schema name as the discriminator literal
// when no explicit mapping exists. Keep that codegen quirk behind this adapter:
// the immutable Contract wire value is still CERTIFICATION.
export type CreateCertificationApplicationWireRequest = Omit<
  Schema<"CreateCertificationApplicationRequest">,
  "applicationType"
> & {
  readonly applicationType: "CERTIFICATION";
};

export const PHASE5B_STUDENT_CONTRACT = {
  version: "1.3.0-contract",
  status: "RC",
  publicBasePath: "/api/v1",
  openapiSha256: "b6bdcad2196dfdd5bccf3c50dc02cf69f5bc431ca4b7d7147efc652004406093",
} as const;

export const studentActor = {
  userId: "71000000-0000-4000-8000-000000000001",
  organizationId: "71000000-0000-4000-8000-000000000002",
  role: "STUDENT",
  displayName: "陈同学",
  verifiedEmail: "student.chen@bnbu.edu.cn",
  accountState: "ACTIVE",
  adminKind: null,
  adminPermissions: [],
  mustChangePassword: false,
  version: 8,
} satisfies Schema<"CurrentActor">;

export const studentCurrentSemester = {
  semesterId: "72000000-0000-4000-8000-000000000001",
  academicYear: "2026-2027",
  termType: "FIRST",
  displayName: "2026-2027 学年第一学期",
  startDate: "2026-08-31",
  endDate: "2027-01-15",
  status: "CURRENT",
} satisfies Schema<"SemesterSummary">;

export const activeStudent = {
  studentId: "71000000-0000-4000-8000-000000000001",
  studentNumber: "20260001",
  name: "陈同学",
  gender: "FEMALE",
  gradeYear: 1,
  college: "计算机学院",
  major: "计算机科学与技术",
  administrativeClass: "计科 2601",
  studentStatus: "ACTIVE",
} satisfies Schema<"StudentSummary">;

export const pendingStudent = {
  ...activeStudent,
  studentStatus: "PENDING",
} satisfies Schema<"StudentSummary">;

export const studentCourse = {
  courseId: "73000000-0000-4000-8000-000000000001",
  semester: studentCurrentSemester,
  name: "体育教学 01 班",
  description: "本学期体育教学与自主运动记录",
  responsibleTeacher: {
    teacherId: "73000000-0000-4000-8000-000000000002",
    name: "王老师",
  },
  checkinOpensAt: "2026-08-31T00:00:00Z",
  checkinClosesAt: "2027-01-15T15:59:59Z",
  targets: {
    courseRelatedTargetMinutes: 720,
    otherTargetMinutes: 480,
    totalTargetMinutes: 1200,
  },
  creditPolicy: {
    minCreditThresholdMinutes: 30,
    maxCreditMinutes: 60,
    weeklySessionFrequency: 3,
    sportTemplateId: null,
  },
} satisfies Schema<"StudentCourse">;

export const activeStudentProgress = {
  courseId: studentCourse.courseId,
  enrollmentId: "73000000-0000-4000-8000-000000000003",
  student: activeStudent,
  categories: [
    {
      category: "COURSE_RELATED",
      targetMinutes: 720,
      validRecordMinutes: 300,
      activeCertificationMinutes: 60,
      rawCombinedMinutes: 360,
      cappedCompletedMinutes: 360,
      remainingMinutes: 360,
    },
    {
      category: "OTHER",
      targetMinutes: 480,
      validRecordMinutes: 180,
      activeCertificationMinutes: 0,
      rawCombinedMinutes: 180,
      cappedCompletedMinutes: 180,
      remainingMinutes: 300,
    },
  ],
  totalTargetMinutes: 1200,
  totalCompletedMinutes: 540,
  completionRatio: 0.45,
  displayPercent: 45,
  targetMet: false,
  newSessionAllowed: true,
  computedAt: "2026-09-01T00:20:00Z",
} satisfies Schema<"StudentCourseProgress">;

export const activeStudentDashboard = {
  actor: studentActor,
  currentSemester: studentCurrentSemester,
  student: activeStudent,
  studentStatus: "ACTIVE",
  course: studentCourse,
  progress: activeStudentProgress,
  enduranceOutcome: null,
  finalGrade: null,
  unreadNotificationCount: 2,
  generatedAt: "2026-09-01T00:20:00Z",
} satisfies Schema<"StudentDashboard">;

export const pendingStudentDashboard = {
  actor: studentActor,
  currentSemester: studentCurrentSemester,
  student: pendingStudent,
  studentStatus: "PENDING",
  course: null,
  progress: null,
  enduranceOutcome: null,
  finalGrade: null,
  unreadNotificationCount: 0,
  generatedAt: "2026-09-01T00:21:00Z",
} satisfies Schema<"StudentDashboard">;

export const activeExerciseSession = {
  sessionId: "74000000-0000-4000-8000-000000000001",
  courseId: studentCourse.courseId,
  enrollmentId: activeStudentProgress.enrollmentId,
  sportType: "RUNNING",
  status: "ACTIVE",
  startedAt: "2026-09-01T00:00:00Z",
  pausedAt: null,
  completedAt: null,
  businessDate: "2026-09-01",
  elapsedActiveSeconds: 1200,
  actualDurationSeconds: null,
  creditedMinutesPreview: null,
  stateVersion: 3,
} satisfies Schema<"ExerciseSession">;

export const startExerciseSessionRequest = {
  courseId: studentCourse.courseId,
  sportType: "RUNNING",
} satisfies Schema<"StartExerciseSessionRequest">;

export const idleSessionError = {
  code: "RESOURCE_NOT_FOUND",
  message: "当前没有进行中的运动",
  requestId: "req_phase5b_session_idle",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const sessionAuthenticationError = {
  code: "AUTHENTICATION_REQUIRED",
  message: "登录状态已失效",
  requestId: "req_phase5b_session_auth",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const sessionMaintenanceError = {
  code: "SYSTEM_MAINTENANCE",
  message: "系统当前处于维护模式",
  requestId: "req_phase5b_session_maintenance",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const sessionDependencyError = {
  code: "DEPENDENCY_UNAVAILABLE",
  message: "暂时无法取得运动状态",
  requestId: "req_phase5b_session_dependency",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const invitationCourse = {
  courseId: studentCourse.courseId,
  name: studentCourse.name,
  responsibleTeacher: studentCourse.responsibleTeacher,
  semester: studentCurrentSemester,
} satisfies Schema<"InvitationCourseSummary">;

const invitationStatuses = ["ACTIVE", "EXPIRED", "REVOKED", "COURSE_CLOSED", "NOT_CURRENT"] as const;

export const invitationPreviews = invitationStatuses.map((status) => ({
  course: invitationCourse,
  durationMinutes: 30,
  expiresAt: "2026-09-30T15:59:59Z",
  joinStartAllowed: status === "ACTIVE",
  inGrace: false,
  graceExpiresAt: null,
  status,
})) satisfies readonly Schema<"CourseInvitationPreview">[];

export const invalidInvitationError = {
  code: "INVITATION_INVALID",
  message: "邀请码无效或无法安全预览",
  requestId: "req_phase5b_invitation_invalid",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const recordImageAllocationRequest = {
  purpose: "RECORD_EVIDENCE",
  mediaKind: "IMAGE",
  declaredContentType: "image/jpeg",
  declaredByteSize: 4_096,
  sessionId: activeExerciseSession.sessionId,
} satisfies Schema<"RecordImageMediaAllocationRequest">;

export const recordVideoAllocationRequest = {
  purpose: "RECORD_EVIDENCE",
  mediaKind: "VIDEO",
  declaredContentType: "video/mp4",
  declaredByteSize: 8_192,
  sessionId: activeExerciseSession.sessionId,
} satisfies Schema<"RecordVideoMediaAllocationRequest">;

export const applicationImageAllocationRequest = {
  purpose: "APPLICATION_EVIDENCE",
  mediaKind: "IMAGE",
  declaredContentType: "image/webp",
  declaredByteSize: 2_048,
} satisfies Schema<"ApplicationMediaAllocationRequest">;

export const recordImageAllocation = {
  mediaAssetId: "75000000-0000-4000-8000-000000000001",
  purpose: "RECORD_EVIDENCE",
  status: "ALLOCATED",
  uploadMethod: "PUT",
  uploadUrl: "https://upload.invalid/record-image-v1",
  requiredHeaders: {
    "content-type": "image/jpeg",
    "x-upload-checksum": "record-image-checksum",
  },
  expiresAt: "2026-09-01T00:30:00Z",
} satisfies Schema<"MediaAllocation">;

export const recordImageReallocation = {
  ...recordImageAllocation,
  mediaAssetId: "75000000-0000-4000-8000-000000000002",
  uploadUrl: "https://upload.invalid/record-image-v2",
  expiresAt: "2026-09-01T00:45:00Z",
} satisfies Schema<"MediaAllocation">;

export const recordVideoAllocation = {
  mediaAssetId: "75000000-0000-4000-8000-000000000003",
  purpose: "RECORD_EVIDENCE",
  status: "ALLOCATED",
  uploadMethod: "PUT",
  uploadUrl: "https://upload.invalid/record-video",
  requiredHeaders: {
    "content-type": "video/mp4",
    "x-upload-checksum": "record-video-checksum",
  },
  expiresAt: "2026-09-01T00:30:00Z",
} satisfies Schema<"MediaAllocation">;

export const applicationImageAllocation = {
  mediaAssetId: "75000000-0000-4000-8000-000000000004",
  purpose: "APPLICATION_EVIDENCE",
  status: "ALLOCATED",
  uploadMethod: "PUT",
  uploadUrl: "https://upload.invalid/application-image",
  requiredHeaders: {
    "content-type": "image/webp",
    "x-upload-checksum": "application-image-checksum",
  },
  expiresAt: "2026-09-01T00:30:00Z",
} satisfies Schema<"MediaAllocation">;

export function buildDirectUploadRequest(allocation: Schema<"MediaAllocation">, bytes: Uint8Array) {
  return {
    method: allocation.uploadMethod,
    headers: { ...allocation.requiredHeaders },
    body: bytes,
  } as const;
}

export const verifiedMediaResult = {
  mediaAssetId: recordImageAllocation.mediaAssetId,
  purpose: "RECORD_EVIDENCE",
  mediaKind: "IMAGE",
  contentType: "image/jpeg",
  byteSize: 4_096,
  checksumSha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  durationMilliseconds: null,
  hasAudio: null,
  widthPixels: 1600,
  heightPixels: 1200,
  status: "VERIFIED",
  rejectionCode: null,
  version: 2,
} satisfies Schema<"MediaFinalizationResult">;

export const rejectedMediaResult = {
  ...verifiedMediaResult,
  mediaAssetId: recordVideoAllocation.mediaAssetId,
  mediaKind: "VIDEO",
  contentType: "video/mp4",
  durationMilliseconds: 16_000,
  hasAudio: true,
  widthPixels: 1920,
  heightPixels: 1080,
  status: "REJECTED",
  rejectionCode: "MEDIA_CONTENT_INVALID",
  version: 3,
} satisfies Schema<"MediaFinalizationResult">;

export const expiredMediaResult = {
  mediaAssetId: applicationImageAllocation.mediaAssetId,
  purpose: "APPLICATION_EVIDENCE",
  mediaKind: "IMAGE",
  contentType: null,
  byteSize: null,
  checksumSha256: null,
  durationMilliseconds: null,
  hasAudio: null,
  widthPixels: null,
  heightPixels: null,
  status: "EXPIRED",
  rejectionCode: "MEDIA_ALLOCATION_EXPIRED",
  version: 2,
} satisfies Schema<"MediaFinalizationResult">;

export const mediaDependencyError = {
  code: "DEPENDENCY_UNAVAILABLE",
  message: "对象存储暂时不可用",
  requestId: "req_phase5b_media_dependency",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

const certificationDetailsKeys = [
  "certificationKind",
  "organizationOrTeamName",
  "validFrom",
  "validTo",
] as const;

const certificationRequestKeys = [
  "applicationType",
  "courseId",
  "certification",
  "evidenceAssetIds",
] as const;

function requireClosedObject(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}_OBJECT_REQUIRED`);
  }
  const record = value as Record<string, unknown>;
  const actualKeys = Object.keys(record).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpectedKeys.length ||
    actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
  ) {
    throw new Error(`${label}_CLOSED_OBJECT_VIOLATION`);
  }
  return record;
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label}_REQUIRED`);
  }
  return value;
}

export function parseCertificationDetails(value: unknown): Schema<"CertificationDetails"> {
  const record = requireClosedObject(value, certificationDetailsKeys, "CERTIFICATION_DETAILS");
  const certificationKind = record.certificationKind;
  if (certificationKind !== "SCHOOL_TEAM" && certificationKind !== "STUDENT_CLUB") {
    throw new Error("CERTIFICATION_KIND_INVALID");
  }
  return {
    certificationKind,
    organizationOrTeamName: requireNonEmptyString(record.organizationOrTeamName, "ORGANIZATION_OR_TEAM_NAME"),
    validFrom: requireNonEmptyString(record.validFrom, "VALID_FROM"),
    validTo: requireNonEmptyString(record.validTo, "VALID_TO"),
  };
}

export function parseCreateCertificationApplicationRequest(
  value: unknown,
): CreateCertificationApplicationWireRequest {
  const record = requireClosedObject(value, certificationRequestKeys, "CERTIFICATION_REQUEST");
  if (record.applicationType !== "CERTIFICATION") {
    throw new Error("CERTIFICATION_APPLICATION_TYPE_REQUIRED");
  }
  const evidenceAssetIds = record.evidenceAssetIds;
  if (
    !Array.isArray(evidenceAssetIds) ||
    evidenceAssetIds.length < 1 ||
    evidenceAssetIds.length > 3 ||
    evidenceAssetIds.some((assetId) => typeof assetId !== "string" || assetId.length === 0)
  ) {
    throw new Error("CERTIFICATION_EVIDENCE_INVALID");
  }
  return {
    applicationType: "CERTIFICATION",
    courseId: requireNonEmptyString(record.courseId, "COURSE_ID"),
    certification: parseCertificationDetails(record.certification),
    evidenceAssetIds,
  };
}

export const schoolTeamCertificationRequest = {
  applicationType: "CERTIFICATION",
  courseId: studentCourse.courseId,
  certification: {
    certificationKind: "SCHOOL_TEAM",
    organizationOrTeamName: "BNBU 羽毛球校队",
    validFrom: "2026-09-01",
    validTo: "2027-01-15",
  },
  evidenceAssetIds: [applicationImageAllocation.mediaAssetId],
} satisfies CreateCertificationApplicationWireRequest;

export const studentClubCertificationRequest = {
  applicationType: "CERTIFICATION",
  courseId: studentCourse.courseId,
  certification: {
    certificationKind: "STUDENT_CLUB",
    organizationOrTeamName: "BNBU 跑步社",
    validFrom: "2026-09-01",
    validTo: "2027-01-15",
  },
  evidenceAssetIds: [applicationImageAllocation.mediaAssetId],
} satisfies CreateCertificationApplicationWireRequest;

const certificationEvidence = {
  mediaAssetId: applicationImageAllocation.mediaAssetId,
  purpose: "APPLICATION_EVIDENCE",
  mediaKind: "IMAGE",
  contentType: "image/webp",
  byteSize: 2_048,
  checksumSha256: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
  durationMilliseconds: null,
  hasAudio: null,
  widthPixels: 1200,
  heightPixels: 900,
  status: "BOUND",
  rejectionCode: null,
  version: 2,
} satisfies Schema<"MediaAsset">;

function createCertificationApplicationFixture(
  applicationId: string,
  applicationNumber: string,
  request: CreateCertificationApplicationWireRequest,
): Schema<"StudentApplication"> {
  return {
    applicationId,
    applicationNumber,
    applicationType: "CERTIFICATION",
    courseId: request.courseId,
    enrollmentId: activeStudentProgress.enrollmentId,
    student: activeStudent,
    status: "SUBMITTED",
    certification: request.certification,
    evidence: [certificationEvidence],
    decisions: [],
    certificationCredit: null,
    submittedAt: "2026-09-01T01:00:00Z",
    updatedAt: "2026-09-01T01:00:00Z",
    version: 1,
  };
}

export const schoolTeamCertificationApplication = createCertificationApplicationFixture(
  "76000000-0000-4000-8000-000000000001",
  "APP-2026-0001",
  schoolTeamCertificationRequest,
);

export const studentClubCertificationApplication = createCertificationApplicationFixture(
  "76000000-0000-4000-8000-000000000002",
  "APP-2026-0002",
  studentClubCertificationRequest,
);

export function readCertificationKind(
  application: Schema<"StudentApplication">,
): Schema<"CertificationKind"> {
  if (application.applicationType !== "CERTIFICATION" || application.certification === null) {
    throw new Error("CERTIFICATION_DETAILS_REQUIRED");
  }
  return application.certification.certificationKind;
}

const certificationApplicationPage = {
  items: [schoolTeamCertificationApplication, studentClubCertificationApplication],
  page: {
    limit: 20,
    nextCursor: null,
    previousCursor: null,
  },
} satisfies Schema<"StudentApplicationPage">;

type CertificationResponseSurfaceBindings = {
  createStudentApplication: operations["createStudentApplication"]["responses"][201]["content"]["application/json"];
  supplementStudentApplication: operations["supplementStudentApplication"]["responses"][200]["content"]["application/json"];
  listOwnApplications: operations["listOwnApplications"]["responses"][200]["content"]["application/json"];
  getOwnApplication: operations["getOwnApplication"]["responses"][200]["content"]["application/json"];
  listCourseApplications: operations["listCourseApplications"]["responses"][200]["content"]["application/json"];
  getCourseApplication: operations["getCourseApplication"]["responses"][200]["content"]["application/json"];
  decideStudentApplication: operations["decideStudentApplication"]["responses"][200]["content"]["application/json"];
};

export const certificationResponseSurfaceFixtures = {
  createStudentApplication: schoolTeamCertificationApplication,
  supplementStudentApplication: studentClubCertificationApplication,
  listOwnApplications: certificationApplicationPage,
  getOwnApplication: schoolTeamCertificationApplication,
  listCourseApplications: certificationApplicationPage,
  getCourseApplication: studentClubCertificationApplication,
  decideStudentApplication: schoolTeamCertificationApplication,
} satisfies CertificationResponseSurfaceBindings;

export const phase5bStudentFixtures = {
  activeStudentDashboard,
  pendingStudentDashboard,
  activeExerciseSession,
  startExerciseSessionRequest,
  idleSessionError,
  sessionAuthenticationError,
  sessionMaintenanceError,
  sessionDependencyError,
  invitationPreviews,
  invalidInvitationError,
  recordImageAllocationRequest,
  recordVideoAllocationRequest,
  applicationImageAllocationRequest,
  recordImageAllocation,
  recordImageReallocation,
  recordVideoAllocation,
  applicationImageAllocation,
  verifiedMediaResult,
  rejectedMediaResult,
  expiredMediaResult,
  mediaDependencyError,
  schoolTeamCertificationRequest,
  studentClubCertificationRequest,
  schoolTeamCertificationApplication,
  studentClubCertificationApplication,
  certificationResponseSurfaceFixtures,
} as const;
