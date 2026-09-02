export type AdminLocale = "zh" | "en";

export type AdminRoute =
  | "overview"
  | "courses"
  | "semesters"
  | "accounts"
  | "support"
  | "rules"
  | "system"
  | "help"
  | "audit"
  | "subadmins";

export type SemesterStatus = "upcoming" | "current" | "archived";
export type SemesterTerm = "first" | "second" | "summer";
export type UserRole = "student" | "teacher" | "admin";
export type StudentStatus = "ACTIVE" | "PENDING";
export type StaffUserStatus = "ACTIVE" | "DISABLED" | "RECOVERY_REQUIRED";
export type UserStatus = StudentStatus | StaffUserStatus;
export type Gender = "male" | "female";
export type GradeLevel = "freshman" | "sophomore" | "junior" | "senior";
export type RecoveryStatus = "pending" | "approved" | "rejected";
export type SystemMode = "NORMAL" | "MAINTENANCE";
export type ApiRecordStatus = "ACTIVE" | "INACTIVE";
export type MaintenanceKind = "planned" | "emergency" | "recovery";
export type WindowMode = "available" | "unavailable";
export type GradeGroup = "freshman_sophomore" | "junior_senior";
export type RunType = "800m" | "1000m";
export type EnduranceTier = "excellent" | "good" | "pass" | "fail";
export type HelpArticleStatus = "draft" | "published" | "archived";
export type TicketStatus =
  "pending" | "in_progress" | "technical" | "resolved" | "closed";
export type TicketCategory =
  "BUG" | "SUGGESTION" | "ACCESSIBILITY" | "PRIVACY" | "OTHER";
export type GradeCorrectionStatus =
  "pending" | "approved" | "corrected" | "closed" | "rejected";

export type AdminPermission =
  | "admin.dashboard.read"
  | "admin.semesters.read"
  | "admin.semesters.write"
  | "admin.users.read"
  | "admin.users.write"
  | "admin.users.delete"
  | "admin.recovery.review"
  | "admin.config.read"
  | "admin.config.write"
  | "admin.system.read"
  | "admin.system.write"
  | "admin.system.purge"
  | "admin.help.read"
  | "admin.help.write"
  | "admin.audit.read"
  | "admin.support.read"
  | "admin.support.write";

export type Semester = {
  id: string;
  name: string;
  academicYear: string;
  term: SemesterTerm;
  startDate: string;
  endDate: string;
  status: SemesterStatus;
  courseCount: number;
  studentCount: number;
  updatedAt: string;
};

export type VerificationLock = {
  failedAttempts: number;
  lockedUntil: string;
};

export type AdminUser = {
  id: string;
  account: string;
  email: string;
  role: UserRole;
  name: string;
  college: string;
  className?: string;
  gender?: Gender;
  gradeLevel?: GradeLevel;
  admissionYear?: number;
  status: UserStatus;
  tokenVersion: number;
  verificationLock?: VerificationLock;
  assignedCourseCount: number;
  createdAt: string;
  updatedAt: string;
};

export type RecoveryRequest = {
  id: string;
  userId: string;
  requestedEmail?: string;
  requestedPhone?: string;
  submittedAt: string;
  status: RecoveryStatus;
  reviewedAt?: string;
  verificationMethod?: string;
  reviewReason?: string;
};

export type EnduranceRule = {
  id: string;
  gender: Gender;
  gradeGroup: GradeGroup;
  runType: RunType;
  minSeconds: number;
  maxSeconds: number;
  score: number;
  tier: EnduranceTier;
  note: string;
  updatedAt: string;
};

export type SystemModeRecord = {
  mode: SystemMode;
  reason: string;
  changedAt: string;
  changedBy: string;
};

export type MaintenanceAnnouncement = {
  id: string;
  kind: MaintenanceKind;
  titleZh: string;
  titleEn: string;
  messageZh: string;
  messageEn: string;
  startsAt: string;
  expectedRecoveryAt?: string;
  publishedAt: string;
  publishedBy: string;
};

export type HelpArticle = {
  id: string;
  titleZh: string;
  titleEn: string;
  bodyZh: string;
  bodyEn: string;
  keywords: string[];
  category: string;
  status: HelpArticleStatus;
  sortWeight: number;
  publishedAt?: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  actorId: string | null;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  requestId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  requester: string;
  account: string;
  category: TicketCategory;
  subject: string;
  content: string;
  source: "student" | "teacher";
  submittedAt: string;
  status: TicketStatus;
  replies: Array<{
    id: string;
    author: string;
    message: string;
    createdAt: string;
  }>;
};

export type GradeCorrectionRequest = {
  id: string;
  teacherId: string;
  teacherName: string;
  semesterId: string;
  courseName: string;
  studentAccount: string;
  reason: string;
  status: GradeCorrectionStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewReason?: string;
};

export type AdminNotification = {
  id: string;
  kind: "system" | "maintenance" | "recovery" | "semester" | "account";
  audience: "students" | "teachers" | "all";
  title: string;
  message: string;
  createdAt: string;
};

export type AdminHealth = {
  apiStatus: "UP" | "DOWN";
  apiLatencyMs: number | null;
  databaseStatus: "UP" | "DOWN" | "NOT_CONFIGURED";
  databaseLatencyMs: number | null;
  notificationQueueStatus: "UP" | "DOWN" | "NOT_CONFIGURED";
  notificationBacklog: number;
  objectStorageStatus: "UP" | "DOWN" | "NOT_CONFIGURED";
  objectStorageLatencyMs: number | null;
  mediaStorageStatus: "UP" | "DOWN" | "NOT_CONFIGURED";
  mediaStorageLatencyMs: number | null;
  checkedAt: string;
  requestId: string | null;
  status: "UP" | "DEGRADED" | "DOWN";
};



export type AdminState = {
  schemaVersion: 2;
  revision: number;
  currentAdminId: string;
  semesters: Semester[];
  users: AdminUser[];
  recoveryRequests: RecoveryRequest[];
  enduranceRules: EnduranceRule[];
  systemMode: SystemModeRecord;
  maintenanceAnnouncements: MaintenanceAnnouncement[];
  helpArticles: HelpArticle[];
  auditLogs: AuditLog[];
  tickets: SupportTicket[];
  gradeCorrections: GradeCorrectionRequest[];
  notifications: AdminNotification[];
  health: AdminHealth;
};

// API-backed administrator projections. Keep these separate from the
// legacy demo state above so unsupported backend fields are never invented.
export type AdminCourse = {
  id: string;
  organizationId: string;
  courseCode: string;
  courseName: string;
  description?: string | null;
  status: ApiRecordStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
};

export type StudentProfileProjection = {
  id: string;
  organizationId: string;
  userId: string;
  studentNumber: string;
  fullName: string;
  gender: string;
  gradeYear: number;
  collegeName: string | null;
  majorName: string | null;
  administrativeClassName: string | null;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
};

export type TeacherProfileProjection = {
  id: string;
  organizationId: string;
  userId: string;
  employeeNumber: string;
  fullName: string;
  collegeName?: string | null;
  departmentName?: string | null;
  title?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
};

export type AuditLogProjection = {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  actorRoleSnapshot: string | null;
  permissionId: string;
  actionType: string;
  targetType: string;
  targetId: string | null;
  requestId: string;
  idempotencyKeyReference: string | null;
  outcome: string;
  reasonCode: string | null;
  safeMetadata: Record<string, unknown>;
  sourceIpHash: string | null;
  deviceFingerprintHash: string | null;
  occurredAt: string;
};

export type SystemModeProjection = {
  mode: SystemMode;
  policyVersion: number;
  updatedAt: string;
};

export type CurrentSemesterProjection = {
  id: string;
  organizationId: string;
  academicYear: string;
  termCode: string;
  displayName: string;
  startDate: string;
  endDate: string;
  status: string;
  isCurrent: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};



export type CreateSemesterInput = Omit<
  Semester,
  "id" | "status" | "courseCount" | "studentCount" | "updatedAt"
>;
export type UpdateSemesterInput = CreateSemesterInput & {
  id: string;
  expectedUpdatedAt: string;
};

export type UserInput = {
  id?: string;
  account: string;
  email: string;
  role: UserRole;
  name: string;
  college: string;
  className?: string;
  gender?: Gender;
  gradeLevel?: GradeLevel;
  admissionYear?: number;
  status: UserStatus;
  initialPassword?: string;
  expectedUpdatedAt?: string;
};


export type EnduranceRuleInput = Omit<EnduranceRule, "id" | "updatedAt"> & {
  id?: string;
};

export type HelpArticleInput = Omit<
  HelpArticle,
  "id" | "publishedAt" | "updatedAt"
> & {
  id?: string;
  expectedUpdatedAt?: string;
};

export type AdminServiceErrorCode =
  | "VALIDATION"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DEPENDENCY"
  | "STORAGE";

export class AdminServiceError extends Error {
  code: AdminServiceErrorCode;
  fieldErrors: Record<string, string>;

  constructor(
    code: AdminServiceErrorCode,
    message: string,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "AdminServiceError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
