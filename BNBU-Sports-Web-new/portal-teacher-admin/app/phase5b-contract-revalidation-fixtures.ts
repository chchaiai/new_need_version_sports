import type { components } from "./phase5b-contract.generated";
import {
  adminActor,
  currentCourse,
  currentSemester,
  dependencyError,
  exerciseRecord,
  teacherActor,
} from "./phase5b-contract-fixtures";

type Schema<Name extends keyof components["schemas"]> = components["schemas"][Name];

const page = {
  limit: 20,
  nextCursor: null,
  previousCursor: null,
} satisfies Schema<"CursorPage">;

export const teacherInvitationPage = {
  items: [
    {
      invitationId: "81000000-0000-4000-8000-000000000001",
      courseId: currentCourse.courseId,
      displaySuffix: "7K9M",
      status: "ACTIVE",
      durationMinutes: 30,
      expiresAt: "2026-09-30T15:59:59Z",
      revocable: true,
      version: 4,
    },
    {
      invitationId: "81000000-0000-4000-8000-000000000002",
      courseId: currentCourse.courseId,
      displaySuffix: "2Q4R",
      status: "REVOKED",
      durationMinutes: 30,
      expiresAt: "2026-09-15T15:59:59Z",
      revocable: false,
      version: 6,
    },
  ],
  page,
} satisfies Schema<"CourseInvitationPage">;

export const emptyTeacherInvitationPage = {
  items: [],
  page,
} satisfies Schema<"CourseInvitationPage">;

export const revokeInvitationRequest = {
  expectedVersion: 4,
} satisfies Schema<"CourseInvitationRevokeRequest">;

export const invitationVersionConflictError = {
  code: "VERSION_CONFLICT",
  message: "邀请已被其他操作更新，请重新读取",
  requestId: "req_phase5b_invitation_conflict",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const semesterCurrentItem = {
  ...currentSemester,
  courseCount: 12,
  studentCount: 368,
  updatedAt: "2026-09-01T00:30:00Z",
  version: 5,
} satisfies Schema<"Semester">;

export const semesterUpcomingItems = [
  {
    semesterId: "82000000-0000-4000-8000-000000000001",
    academicYear: "2026-2027",
    termType: "SECOND",
    displayName: "2026-2027 学年第二学期",
    startDate: "2027-02-22",
    endDate: "2027-06-30",
    status: "UPCOMING",
    courseCount: 0,
    studentCount: 0,
    updatedAt: "2026-09-01T00:31:00Z",
    version: 1,
  },
  {
    semesterId: "82000000-0000-4000-8000-000000000002",
    academicYear: "2027-2028",
    termType: "FIRST",
    displayName: "2027-2028 学年第一学期",
    startDate: "2027-08-30",
    endDate: "2028-01-14",
    status: "UPCOMING",
    courseCount: 0,
    studentCount: 0,
    updatedAt: "2026-09-01T00:32:00Z",
    version: 1,
  },
] satisfies readonly Schema<"Semester">[];

export const semesterArchivedItems = [
  {
    semesterId: "82000000-0000-4000-8000-000000000003",
    academicYear: "2025-2026",
    termType: "SECOND",
    displayName: "2025-2026 学年第二学期",
    startDate: "2026-02-23",
    endDate: "2026-06-30",
    status: "ARCHIVED",
    courseCount: 10,
    studentCount: 320,
    updatedAt: "2026-08-31T23:59:59Z",
    version: 9,
  },
  {
    semesterId: "82000000-0000-4000-8000-000000000004",
    academicYear: "2025-2026",
    termType: "FIRST",
    displayName: "2025-2026 学年第一学期",
    startDate: "2025-09-01",
    endDate: "2026-01-16",
    status: "ARCHIVED",
    courseCount: 9,
    studentCount: 301,
    updatedAt: "2026-02-23T00:00:00Z",
    version: 8,
  },
] satisfies readonly Schema<"Semester">[];

export const semesterSummaryWithCurrent = {
  currentSemester,
  upcomingCount: 2,
  archivedCount: 2,
  generatedAt: "2026-09-01T00:35:00Z",
} satisfies Schema<"SemesterManagementSummary">;

export const semesterSummaryWithoutCurrent = {
  currentSemester: null,
  upcomingCount: 2,
  archivedCount: 2,
  generatedAt: "2026-09-01T00:36:00Z",
} satisfies Schema<"SemesterManagementSummary">;

export const semesterPageWithCurrent = {
  items: [semesterCurrentItem, ...semesterUpcomingItems, ...semesterArchivedItems],
  page,
  summary: semesterSummaryWithCurrent,
} satisfies Schema<"SemesterPage">;

export const semesterPageWithoutCurrent = {
  items: [...semesterUpcomingItems, ...semesterArchivedItems],
  page,
  summary: semesterSummaryWithoutCurrent,
} satisfies Schema<"SemesterPage">;

export const semesterFilteredPage = {
  items: semesterUpcomingItems,
  page,
  summary: semesterSummaryWithCurrent,
} satisfies Schema<"SemesterPage">;

export const semesterPagedResult = {
  items: [semesterArchivedItems[1]],
  page: { limit: 1, previousCursor: "semester-prev", nextCursor: "semester-next" },
  summary: semesterSummaryWithCurrent,
} satisfies Schema<"SemesterPage">;

const feedbackStatuses = ["WAITING", "IN_PROGRESS", "WAITING_TECH", "COMPLETED", "CLOSED"] as const;

export const feedbackTickets = feedbackStatuses.map((status, index) => ({
  feedbackId: `83000000-0000-4000-8000-00000000000${index + 1}`,
  feedbackNumber: `FB-20260901-00${index + 1}`,
  category: index === 1 ? "FEATURE_SUGGESTION" as const : "FUNCTION_BUG" as const,
  description: `Phase 5B feedback ${status}`,
  status,
  student: exerciseRecord.student,
  currentVerifiedEmail: "student.chen@bnbu.edu.cn",
  replies: [],
  submittedAt: `2026-09-01T00:0${index}:00Z`,
  updatedAt: `2026-09-01T00:1${index}:00Z`,
  version: 1,
})) satisfies readonly Schema<"FeedbackTicket">[];

export const feedbackSummary = {
  totalCount: 5,
  pendingCount: 3,
  waitingTechCount: 1,
  completedCount: 1,
  generatedAt: "2026-09-01T00:40:00Z",
} satisfies Schema<"AdminFeedbackSummary">;

export const feedbackPage = {
  items: feedbackTickets,
  page,
  summary: feedbackSummary,
} satisfies Schema<"AdminFeedbackPage">;

export const emptyFeedbackPage = {
  items: [],
  page,
  summary: {
    totalCount: 0,
    pendingCount: 0,
    waitingTechCount: 0,
    completedCount: 0,
    generatedAt: "2026-09-01T00:41:00Z",
  },
} satisfies Schema<"AdminFeedbackPage">;

export const filteredFeedbackPage = {
  items: feedbackTickets.filter((ticket) => ticket.status === "WAITING_TECH"),
  page,
  summary: feedbackSummary,
} satisfies Schema<"AdminFeedbackPage">;

export const pagedFeedbackPage = {
  items: feedbackTickets.slice(1, 3),
  page: { limit: 2, previousCursor: "feedback-prev", nextCursor: "feedback-next" },
  summary: feedbackSummary,
} satisfies Schema<"AdminFeedbackPage">;

export const feedbackAfterMutationPage = {
  items: feedbackTickets.map((ticket, index) => ({
    ...ticket,
    status: index === 0 || index === 3 ? "COMPLETED" as const : index === 4 ? "IN_PROGRESS" as const : ticket.status,
    updatedAt: "2026-09-01T00:45:00Z",
    version: 2,
  })),
  page,
  summary: {
    totalCount: 5,
    pendingCount: 3,
    waitingTechCount: 1,
    completedCount: 2,
    generatedAt: "2026-09-01T00:45:00Z",
  },
} satisfies Schema<"AdminFeedbackPage">;

function helpArticle(index: number, status: Schema<"HelpArticleStatus">): Schema<"HelpArticleAdmin"> {
  return {
    articleId: `84000000-0000-4000-8000-00000000000${index}`,
    titleZh: `帮助文章 ${index}`,
    titleEn: `Help article ${index}`,
    bodyZh: status === "DRAFT" ? null : `帮助正文 ${index}`,
    bodyEn: status === "DRAFT" ? null : `Help body ${index}`,
    keywords: status === "DRAFT" ? [] : ["phase5b"],
    category: "CHECKIN_AND_HOURS",
    sortWeight: 100 - index,
    status,
    firstPublishedAt: status === "DRAFT" ? null : "2026-09-01T00:00:00Z",
    revisionNumber: 1,
    updatedAt: "2026-09-01T00:50:00Z",
    version: 1,
  };
}

export const helpArticles = [
  helpArticle(1, "PUBLISHED"),
  helpArticle(2, "DRAFT"),
  helpArticle(3, "ARCHIVED"),
] satisfies readonly Schema<"HelpArticleAdmin">[];

export const helpSummary = {
  publishedCount: 1,
  draftCount: 1,
  archivedCount: 1,
  generatedAt: "2026-09-01T00:50:00Z",
} satisfies Schema<"HelpArticleAdminSummary">;

function helpPage(items: readonly Schema<"HelpArticleAdmin">[], summary: Schema<"HelpArticleAdminSummary">): Schema<"HelpArticleAdminPage"> {
  return { items, page, summary };
}

export const helpArticlePage = helpPage(helpArticles, helpSummary);
export const emptyHelpArticlePage = helpPage([], {
  publishedCount: 0,
  draftCount: 0,
  archivedCount: 0,
  generatedAt: "2026-09-01T00:51:00Z",
});
export const filteredHelpArticlePage = helpPage([helpArticles[0]], helpSummary);
export const pagedHelpArticlePage = {
  items: [helpArticles[2]],
  page: { limit: 1, previousCursor: "help-prev", nextCursor: "help-next" },
  summary: helpSummary,
} satisfies Schema<"HelpArticleAdminPage">;

const newDraft = helpArticle(4, "DRAFT");
export const helpAfterCreatePage = helpPage([...helpArticles, newDraft], {
  publishedCount: 1,
  draftCount: 2,
  archivedCount: 1,
  generatedAt: "2026-09-01T00:52:00Z",
});
export const helpAfterPublishPage = helpPage([
  helpArticles[0],
  { ...helpArticles[1], status: "PUBLISHED", firstPublishedAt: "2026-09-01T00:53:00Z", bodyZh: "已发布正文", bodyEn: "Published body", keywords: ["phase5b"] },
  helpArticles[2],
  newDraft,
], {
  publishedCount: 2,
  draftCount: 1,
  archivedCount: 1,
  generatedAt: "2026-09-01T00:53:00Z",
});
export const helpAfterArchivePage = helpPage([
  { ...helpArticles[0], status: "ARCHIVED" },
  helpArticles[1],
  helpArticles[2],
], {
  publishedCount: 0,
  draftCount: 1,
  archivedCount: 2,
  generatedAt: "2026-09-01T00:54:00Z",
});
export const helpAfterRepublishPage = helpPage([
  helpArticles[0],
  helpArticles[1],
  { ...helpArticles[2], status: "PUBLISHED" },
], {
  publishedCount: 2,
  draftCount: 1,
  archivedCount: 0,
  generatedAt: "2026-09-01T00:55:00Z",
});

export const ADMIN_PERMISSION_VALUES = [
  "COURSE_VIEW",
  "SEMESTER",
  "USERS_ACCOUNTS",
  "FEEDBACK",
  "GLOBAL_RULES",
  "SYSTEM_MODE",
  "HELP_CENTER",
  "AUDIT_QUERY",
] satisfies readonly Schema<"AdminPermission">[];

export const subAdminPage = {
  items: [
    {
      adminId: "85000000-0000-4000-8000-000000000001",
      loginName: "student.services",
      name: "学生服务管理员",
      verifiedEmail: "student.services@bnbu.edu.cn",
      department: "体育部",
      permissions: ["FEEDBACK", "HELP_CENTER", "AUDIT_QUERY"],
      state: "ACTIVE",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-09-01T00:56:00Z",
      version: 3,
    },
    {
      adminId: "85000000-0000-4000-8000-000000000002",
      loginName: "readonly.audit",
      name: "只读核查管理员",
      verifiedEmail: "readonly.audit@bnbu.edu.cn",
      department: null,
      permissions: ["COURSE_VIEW", "AUDIT_QUERY"],
      state: "DISABLED",
      createdAt: "2026-08-02T00:00:00Z",
      updatedAt: "2026-09-01T00:57:00Z",
      version: 5,
    },
  ],
  page,
  summary: {
    totalCount: 2,
    activeCount: 1,
    generatedAt: "2026-09-01T00:57:00Z",
  },
} satisfies Schema<"SubAdminPage">;

export const filteredSubAdminPage = {
  items: subAdminPage.items.filter((item) => item.state === "ACTIVE"),
  page,
  summary: subAdminPage.summary,
} satisfies Schema<"SubAdminPage">;

export const emptySubAdminPage = {
  items: [],
  page,
  summary: {
    totalCount: 0,
    activeCount: 0,
    generatedAt: "2026-09-01T00:58:00Z",
  },
} satisfies Schema<"SubAdminPage">;

export const teacherDashboardWithCurrent = {
  actor: teacherActor,
  currentSemester,
  openCourseCount: 2,
  memberCount: 64,
  unresolvedRosterFindingCount: 3,
  pendingEnduranceCount: 4,
  pendingApplicationCount: 5,
  unpublishedFinalGradeCount: 6,
  unreadNotificationCount: 7,
  generatedAt: "2026-09-01T01:00:00Z",
} satisfies Schema<"TeacherDashboard">;

export const teacherDashboardWithoutCurrent = {
  actor: teacherActor,
  currentSemester: null,
  openCourseCount: 0,
  memberCount: 0,
  unresolvedRosterFindingCount: 0,
  pendingEnduranceCount: 0,
  pendingApplicationCount: 0,
  unpublishedFinalGradeCount: 0,
  unreadNotificationCount: 0,
  generatedAt: "2026-09-01T01:01:00Z",
} satisfies Schema<"TeacherDashboard">;

export const currentSemesterNotFoundError = {
  code: "RESOURCE_NOT_FOUND",
  message: "当前没有 CURRENT 学期",
  requestId: "req_phase5b_current_semester_empty",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const createCourseRequest = {
  semesterId: currentSemester.semesterId,
  name: "体育教学 02 班",
  description: "Phase 5B re-validation",
  checkinOpensAt: "2026-09-01T00:00:00Z",
  checkinClosesAt: "2027-01-15T15:59:59Z",
  courseRelatedTargetMinutes: 720,
  otherTargetMinutes: 480,
  minCreditThresholdMinutes: 30,
  weeklySessionFrequency: 3,
  sportTemplateId: null,
} satisfies Schema<"CourseCreateRequest">;

export const semesterNotCurrentError = {
  code: "SEMESTER_NOT_CURRENT",
  message: "目标学期不是唯一 CURRENT 学期",
  requestId: "req_phase5b_create_course_non_current",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const unknownSemesterError = {
  code: "RESOURCE_NOT_FOUND",
  message: "目标学期不存在",
  requestId: "req_phase5b_create_course_unknown",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const createCourseVersionConflictError = {
  code: "VERSION_CONFLICT",
  message: "学期在创建过程中发生切换，请重新读取",
  requestId: "req_phase5b_create_course_conflict",
  details: null,
} satisfies Schema<"ErrorEnvelope">;

export const rosterAllocationRequest = {
  fileName: "official-roster.csv",
  contentType: "text/csv",
  byteSize: 128,
} satisfies Schema<"RosterImportAllocationRequest">;

export const rosterXlsxAllocationRequest = {
  fileName: "official-roster.xlsx",
  contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  byteSize: 256,
} satisfies Schema<"RosterImportAllocationRequest">;

export const rosterUploadAllocation = {
  allocationId: "86000000-0000-4000-8000-000000000001",
  uploadMethod: "PUT",
  uploadUrl: "https://upload.invalid/roster-csv",
  requiredHeaders: {
    "content-type": "text/csv",
    "x-upload-checksum": "roster-checksum",
  },
  expiresAt: "2026-09-01T01:15:00Z",
} satisfies Schema<"UploadAllocation">;

export const rosterXlsxUploadAllocation = {
  allocationId: "86000000-0000-4000-8000-000000000003",
  uploadMethod: "PUT",
  uploadUrl: "https://upload.invalid/roster-xlsx",
  requiredHeaders: {
    "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "x-upload-checksum": "roster-xlsx-checksum",
  },
  expiresAt: "2026-09-01T01:15:00Z",
} satisfies Schema<"UploadAllocation">;

export const rosterUploadReallocation = {
  ...rosterUploadAllocation,
  allocationId: "86000000-0000-4000-8000-000000000002",
  uploadUrl: "https://upload.invalid/roster-csv-v2",
  expiresAt: "2026-09-01T01:30:00Z",
} satisfies Schema<"UploadAllocation">;

export const phase5bPortalRevalidationFixtures = {
  teacherInvitationPage,
  emptyTeacherInvitationPage,
  revokeInvitationRequest,
  invitationVersionConflictError,
  semesterPageWithCurrent,
  semesterPageWithoutCurrent,
  semesterFilteredPage,
  semesterPagedResult,
  feedbackPage,
  emptyFeedbackPage,
  filteredFeedbackPage,
  pagedFeedbackPage,
  feedbackAfterMutationPage,
  helpArticlePage,
  emptyHelpArticlePage,
  filteredHelpArticlePage,
  pagedHelpArticlePage,
  helpAfterCreatePage,
  helpAfterPublishPage,
  helpAfterArchivePage,
  helpAfterRepublishPage,
  subAdminPage,
  filteredSubAdminPage,
  emptySubAdminPage,
  teacherDashboardWithCurrent,
  teacherDashboardWithoutCurrent,
  currentSemesterNotFoundError,
  createCourseRequest,
  currentCourse,
  semesterNotCurrentError,
  unknownSemesterError,
  createCourseVersionConflictError,
  rosterAllocationRequest,
  rosterXlsxAllocationRequest,
  rosterUploadAllocation,
  rosterXlsxUploadAllocation,
  rosterUploadReallocation,
  dependencyError,
  adminActor,
} as const;
