import {
  ApiError,
  apiErrorText,
  isUnsupported,
  request,
  requestWithMeta,
  uuid,
} from "./api-client";
import { ADMIN_STORAGE_EVENT, ADMIN_STORAGE_KEY } from "./admin-domain";
import { cloneInitialAdminState } from "./admin-mock-data";
import { businessDateTime } from "./business-time";
import type { AuditStatus } from "./checkin-audit";
import { semesterDisplayName } from "./semester-presentation";
import type {
  ClassSection,
  CourseCatalog,
  CourseInvite,
  CreateReviewBody,
  Enrollment,
  ExemptionApplication,
  ExerciseRecord,
  ExerciseRecordEvidenceContext,
  MediaAccess,
  ProgressTarget,
  ProgressTargetRevisionBody,
  ReviewReasonCode,
  ReviewExemptionApplicationBody,
  ReviewRecord,
  Semester,
  StudentProfileApi,
  StructuredExemptionApplication,
  StudentScore,
  UpdateClassSectionWindowBody,
} from "./teacher-api-types";

export { apiErrorText, isUnsupported };

function toTeacherSemester(
  semester: ReturnType<typeof cloneInitialAdminState>["semesters"][number],
): Semester {
  return {
    id: semester.id,
    organizationId: "demo-organization",
    code: `${semester.academicYear}-${semester.term.toUpperCase()}`,
    displayName: semesterDisplayName(semester),
    academicYear: semester.academicYear,
    termCode: semester.term.toUpperCase(),
    status: semester.status.toUpperCase(),
    startsOn: semester.startDate,
    endsOn: semester.endDate,
    version: 1,
  };
}

/** Reads the same persisted current-semester fact used by the demo admin UI. */
export function readDemoCurrentSemester(): Semester {
  const fallbackState = cloneInitialAdminState();
  let semesters = fallbackState.semesters;
  if (typeof globalThis.localStorage !== "undefined") {
    try {
      const stored = globalThis.localStorage.getItem(ADMIN_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) as { semesters?: typeof semesters } : null;
      if (Array.isArray(parsed?.semesters)) semesters = parsed.semesters;
    } catch {
      // A damaged local preview cache must not replace the known-safe fixture.
    }
  }
  const current = semesters.find((semester) => semester.status === "current")
    ?? fallbackState.semesters.find((semester) => semester.status === "current")!;
  return toTeacherSemester(current);
}

export function subscribeDemoCurrentSemester(
  onChange: (semester: Semester) => void,
): () => void {
  if (typeof globalThis.window === "undefined") return () => undefined;
  const sync = () => onChange(readDemoCurrentSemester());
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === ADMIN_STORAGE_KEY) sync();
  };
  globalThis.window.addEventListener("storage", handleStorage);
  globalThis.window.addEventListener(ADMIN_STORAGE_EVENT, sync);
  sync();
  return () => {
    globalThis.window.removeEventListener("storage", handleStorage);
    globalThis.window.removeEventListener(ADMIN_STORAGE_EVENT, sync);
  };
}

export type ReviewMutationIdempotencyKeys = {
  initial: string;
  conflictRetry: string;
};

export type InvalidToValidReviewOperation = {
  operationId: string;
  recordId: string;
  decideValid: ReviewMutationIdempotencyKeys;
};

export function tryAcquireReviewTransitionLock(lock: {
  current: boolean;
}): boolean {
  if (lock.current) return false;
  lock.current = true;
  return true;
}

/** A client-side fail-closed guard, not a Backend error envelope. */
export class ReviewTransitionConsistencyError extends Error {
  readonly code = "LOCAL_REVIEW_TRANSITION_STATE_MISMATCH";
  readonly stage: string;
  readonly recordStatus: string;
  readonly reviewResult: string | null;

  constructor(
    stage: string,
    recordStatus: string,
    reviewResult: string | null,
  ) {
    super(
      `Review transition stopped at ${stage}: record=${recordStatus}, review=${reviewResult ?? "missing"}`,
    );
    this.name = "ReviewTransitionConsistencyError";
    this.stage = stage;
    this.recordStatus = recordStatus;
    this.reviewResult = reviewResult;
  }
}

function reviewMutationKeys(
  operationId: string,
  phase: "valid",
): ReviewMutationIdempotencyKeys {
  // A 409 retry carries refreshed optimistic-lock versions, so it is a new
  // normalized request and needs its own key. Both keys remain stable for the
  // lifetime of this UI operation, including recovery after a lost response.
  return {
    initial: `review-transition:${operationId}:${phase}:initial`,
    conflictRetry: `review-transition:${operationId}:${phase}:conflict-retry`,
  };
}

export function createInvalidToValidReviewOperation(
  recordId: string,
): InvalidToValidReviewOperation {
  const operationId = uuid();
  return {
    operationId,
    recordId,
    decideValid: reviewMutationKeys(operationId, "valid"),
  };
}

/** List endpoints may return a bare array or a cursor page object. */
function asList<T>(
  data: T[] | { items?: T[]; data?: T[] } | null | undefined,
): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

// API list endpoints page with an opaque `cursor` (limit 1–100, default
// 20). The workspace cross-checks records against the roster projection, so a
// partial first page is not just incomplete — it makes valid records look
// orphaned. Always drain every page before handing data to the UI.
const PAGE_LIMIT = 100;
const MAX_PAGES = 50;

async function fetchAllPages<T>(
  path: string,
  params?: URLSearchParams,
): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = new URLSearchParams(params);
    query.set("limit", String(PAGE_LIMIT));
    if (cursor) query.set("cursor", cursor);
    const envelope = await requestWithMeta<T[] | { items?: T[] }>(
      `${path}?${query.toString()}`,
    );
    rows.push(...asList(envelope.data));
    const pagination = envelope.meta?.pagination;
    if (!pagination?.hasMore || !pagination.nextCursor) return rows;
    cursor = pagination.nextCursor;
  }
  return rows;
}

export async function fetchClassSections(): Promise<ClassSection[]> {
  return fetchAllPages<ClassSection>("/class-sections");
}

export async function fetchCourse(courseId: string): Promise<CourseCatalog> {
  return request<CourseCatalog>(`/courses/${encodeURIComponent(courseId)}`);
}

export async function fetchCourses(): Promise<CourseCatalog[]> {
  return fetchAllPages<CourseCatalog>("/courses");
}

export async function fetchCurrentSemester(): Promise<Semester> {
  return request<Semester>("/semesters/current");
}

/**
 * Persists the check-in window a teacher configured. current API accepts both
 * organization-local wall clock ("HH:MM") and RFC3339 time for the daily
 * fields; the portal's <input type="time"> already produces wall clock.
 * Course/other hour targets are separate progress-policy concerns and stay out
 * of this call.
 */
export async function updateClassSectionWindow(
  classSectionId: string,
  body: UpdateClassSectionWindowBody,
): Promise<ClassSection> {
  return request<ClassSection>(
    `/class-sections/${encodeURIComponent(classSectionId)}`,
    {
      method: "PATCH",
      body,
    },
  );
}

export async function fetchClassProgressTarget(
  classSectionId: string,
): Promise<ProgressTarget> {
  return request<ProgressTarget>(
    `/class-sections/${encodeURIComponent(classSectionId)}/progress-target`,
  );
}

export async function reviseClassProgressTarget(
  classSectionId: string,
  body: ProgressTargetRevisionBody,
): Promise<ProgressTarget> {
  return request<ProgressTarget>(
    `/class-sections/${encodeURIComponent(classSectionId)}/progress-target/revisions`,
    { method: "POST", body },
  );
}

export async function createCourseInvite(
  classSectionId: string,
  expiresAt?: string | null,
): Promise<CourseInvite> {
  return request<CourseInvite>(
    `/class-sections/${encodeURIComponent(classSectionId)}/course-invites`,
    {
      method: "POST",
      body: expiresAt ? { expiresAt } : {},
    },
  );
}

export async function fetchExerciseRecords(
  classSectionId?: string,
): Promise<ExerciseRecord[]> {
  const query = new URLSearchParams();
  if (classSectionId) query.set("classSectionId", classSectionId);
  return fetchAllPages<ExerciseRecord>("/exercise-records", query);
}

export async function fetchExerciseRecord(
  recordId: string,
): Promise<ExerciseRecord> {
  return request<ExerciseRecord>(
    `/exercise-records/${encodeURIComponent(recordId)}`,
  );
}

export async function fetchExerciseRecordEvidenceContext(
  recordId: string,
): Promise<ExerciseRecordEvidenceContext> {
  return request<ExerciseRecordEvidenceContext>(
    `/exercise-records/${encodeURIComponent(recordId)}/evidence-context`,
  );
}



export async function openTeacherMedia(mediaId: string): Promise<string> {
  const access = await createMediaAccessUrl(mediaId, "VIEW_ORIGINAL");
  return access.accessUrl;
}

async function createMediaAccessUrl(
  mediaId: string,
  purpose: string,
): Promise<MediaAccess> {
  return request<MediaAccess>(
    `/media/${encodeURIComponent(mediaId)}/access-url`,
    {
      method: "POST",
      body: { purpose },
    },
  );
}

export async function submitExerciseReview(
  recordId: string,
  body: CreateReviewBody,
  idempotencyKey?: string,
): Promise<unknown> {
  return request(`/exercise-records/${encodeURIComponent(recordId)}/reviews`, {
    method: "POST",
    body,
    headers: idempotencyKey
      ? { "Idempotency-Key": idempotencyKey }
      : undefined,
  });
}

export async function fetchLatestExerciseReview(
  recordId: string,
): Promise<ReviewRecord | null> {
  const reviews = asList(
    await request<ReviewRecord[] | { items?: ReviewRecord[] }>(
      `/exercise-records/${encodeURIComponent(recordId)}/reviews?limit=1&sort=-reviewVersion`,
    ),
  );
  return reviews[0] ?? null;
}

/** Retry once on CONFLICT_VERSION_MISMATCH after re-fetching the record. */
export async function submitExerciseReviewWithRetry(
  recordId: string,
  buildBody: (
    record: ExerciseRecord,
    currentReviewVersion: number,
  ) => CreateReviewBody,
  idempotencyKeys?: ReviewMutationIdempotencyKeys,
): Promise<ExerciseRecord> {
  let [record, latestReview] = await Promise.all([
    fetchExerciseRecord(recordId),
    fetchLatestExerciseReview(recordId),
  ]);
  try {
    await submitExerciseReview(
      recordId,
      buildBody(record, latestReview?.reviewVersion ?? 0),
      idempotencyKeys?.initial,
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "CONFLICT_VERSION_MISMATCH"
    ) {
      [record, latestReview] = await Promise.all([
        fetchExerciseRecord(recordId),
        fetchLatestExerciseReview(recordId),
      ]);
      await submitExerciseReview(
        recordId,
        buildBody(record, latestReview?.reviewVersion ?? 0),
        idempotencyKeys?.conflictRetry,
      );
    } else {
      throw error;
    }
  }
  return fetchExerciseRecord(recordId);
}

type ExerciseReviewState = {
  record: ExerciseRecord;
  latestReview: ReviewRecord | null;
};

async function fetchExerciseReviewState(
  recordId: string,
): Promise<ExerciseReviewState> {
  const [record, latestReview] = await Promise.all([
    fetchExerciseRecord(recordId),
    fetchLatestExerciseReview(recordId),
  ]);
  return { record, latestReview };
}

function isInvalidReviewState(state: ExerciseReviewState): boolean {
  return (
    state.record.status === "REVIEWED" &&
    state.latestReview?.result === "INVALID"
  );
}

function isValidReviewState(state: ExerciseReviewState): boolean {
  return (
    state.record.status === "REVIEWED" &&
    state.latestReview?.result === "VALID"
  );
}

function stopReviewTransition(
  stage: string,
  state: ExerciseReviewState,
): never {
  throw new ReviewTransitionConsistencyError(
    stage,
    state.record.status,
    state.latestReview?.result ?? null,
  );
}

async function submitInvalidReviewAsValid(
  recordId: string,
  initialState: ExerciseReviewState,
  idempotencyKeys: ReviewMutationIdempotencyKeys,
  publicComment: string,
): Promise<ExerciseReviewState> {
  let state = initialState;
  if (!isInvalidReviewState(state)) {
    stopReviewTransition("before-valid", state);
  }
  const decideValid = (key: string) =>
    submitExerciseReview(
      recordId,
      {
        result: "VALID",
        publicComment: publicComment.trim() || null,
        reasonCode: null,
        reason: null,
        expectedReviewVersion: state.latestReview!.reviewVersion,
        expectedVersion: state.record.version,
      },
      key,
    );
  try {
    await decideValid(idempotencyKeys.initial);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "CONFLICT_VERSION_MISMATCH"
    ) {
      state = await fetchExerciseReviewState(recordId);
      if (!isInvalidReviewState(state)) {
        stopReviewTransition("after-valid-conflict", state);
      }
      await decideValid(idempotencyKeys.conflictRetry);
    } else {
      throw error;
    }
  }
  state = await fetchExerciseReviewState(recordId);
  if (!isValidReviewState(state)) {
    stopReviewTransition("after-valid", state);
  }
  return state;
}

/**
 * Correct INVALID directly to VALID by appending one new authoritative review.
 * There is no intermediate PENDING state and no reopen mutation.
 */
export async function transitionInvalidExerciseReviewToValid(
  recordId: string,
  reason: string,
  operation: InvalidToValidReviewOperation,
): Promise<ExerciseRecord> {
  if (operation.recordId !== recordId) {
    throw new ReviewTransitionConsistencyError(
      "operation-record-mismatch",
      "UNKNOWN",
      null,
    );
  }
  const state = await fetchExerciseReviewState(recordId);
  if (!isInvalidReviewState(state)) stopReviewTransition("before-valid", state);
  return (
    await submitInvalidReviewAsValid(
      recordId,
      state,
      operation.decideValid,
      reason,
    )
  ).record;
}

export async function fetchEnrollments(
  classSectionId: string,
): Promise<Enrollment[]> {
  const query = new URLSearchParams({ classSectionId });
  return fetchAllPages<Enrollment>("/enrollments", query);
}

export async function fetchStudentProfile(
  studentId: string,
): Promise<StudentProfileApi> {
  return request<StudentProfileApi>(
    `/students/${encodeURIComponent(studentId)}`,
  );
}

export async function fetchStudentScores(
  classSectionId?: string,
): Promise<StudentScore[]> {
  const query = new URLSearchParams();
  if (classSectionId) query.set("classSectionId", classSectionId);
  return fetchAllPages<StudentScore>("/student-scores", query);
}

export async function removeEnrollment(
  enrollmentId: string,
  expectedVersion: number,
  reason: string,
): Promise<Enrollment> {
  return request<Enrollment>(
    `/enrollments/${encodeURIComponent(enrollmentId)}/remove`,
    { method: "POST", body: { expectedVersion, reason } },
  );
}

export async function fetchExemptionApplications(
  classSectionId?: string,
): Promise<StructuredExemptionApplication[]> {
  const query = new URLSearchParams();
  if (classSectionId) query.set("classSectionId", classSectionId);
  return fetchAllPages<StructuredExemptionApplication>(
    "/exemption-application-details",
    query,
  );
}

export async function reviewExemptionApplication(
  applicationId: string,
  body: ReviewExemptionApplicationBody,
): Promise<ExemptionApplication> {
  return request<ExemptionApplication>(
    `/exemption-applications/${encodeURIComponent(applicationId)}/review`,
    { method: "POST", body },
  );
}

export async function recalculateStudentScore(
  scoreId: string,
  expectedVersion: number,
): Promise<StudentScore> {
  return request<StudentScore>(
    `/student-scores/${encodeURIComponent(scoreId)}/recalculate`,
    { method: "POST", body: { expectedVersion } },
  );
}

export async function publishStudentScore(
  scoreId: string,
  expectedVersion: number,
): Promise<StudentScore> {
  return request<StudentScore>(
    `/student-scores/${encodeURIComponent(scoreId)}/publish`,
    { method: "POST", body: { expectedVersion } },
  );
}

export type TeacherCourseView = {
  id: string;
  code: string;
  section: string;
  name: string;
  semester: string;
  semesterId: string;
  courseId: string;
  status: "ACTIVE";
  courseTarget: number;
  otherTarget: number;
  version: number;
  checkinWindow: {
    windowMode: "available" | "unavailable";
    dateRangeStart: string;
    dateRangeEnd: string;
    dailyStartTime: string;
    dailyEndTime: string;
    excludedDates: { date: string; reason: string }[];
    semesterDeadline: string;
  };
  invite?: { code: string; expiresAt: string; status: "active" | "revoked" };
};

export type TeacherStudentView = {
  id: string;
  enrollmentId: string;
  name: string;
  number: string;
  email: string;
  gender: "男" | "女" | "其他" | "未知";
  grade: string;
  courseId: string;
  status: "active" | "removed" | "exited" | "disabled";
  joinedAt: string;
  joinMethod: "qr" | "manual_import";
  courseHours: number;
  otherHours: number;
  version: number;
};

export type TeacherCheckinView = {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentId: string;
  creditType: "课程相关" | "其他运动" | "系统抵扣";
  sport: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  creditedMinutes: number;
  originalHours: number;
  approvedHours: number;
  description: string;
  submittedAt: string;
  status: "有效" | "已调整" | "系统抵扣";
  risk: "低风险" | "需关注" | "凭证模糊" | null;
  confidence: number | null;
  proof: string[];
  mediaIds: string[];
  locationExpired: boolean | null;
  reviewComment?: string;
  source: "student" | "system";
  auditStatus: AuditStatus;
  invalidReason?: string;
  auditRemark?: string;
  version: number;
  reviewVersion: number;
};

export type TeacherGradeView = {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentId: string;
  gender: "男" | "女" | "其他" | "未知";
  gradeGroup: "大一/大二" | "大三/大四" | "未知";
  enduranceStatus: "NotRecorded" | "Recorded" | "Exempt" | "Absent" | "Unavailable";
  minutes?: number;
  seconds?: number;
  physicalScore?: number;
  published: boolean;
  scoreStatus?: string;
  qualificationStatus?: string;
  validCourseDurationSeconds?: number;
  validGeneralDurationSeconds?: number;
  totalValidDurationSeconds?: number;
  scoringSeconds?: number;
  excessSeconds?: number;
  baseScore?: number | null;
  adjustmentTotal?: number | null;
  calculatedAt?: string | null;
  publishedAt?: string | null;
  version: number;
};

export type TeacherExemptionView = {
  id: string;
  studentId: string;
  courseId: string;
  kind:
    | "耐力跑免测"
    | "校队认证"
    | "社团认证"
    | "体测免测"
    | "运动打卡减免"
    | "特殊情况";
  organization?: string;
  reason: string;
  material: string[];
  mediaIds: string[];
  submittedAt: string;
  status: "pending" | "supplement_required" | "approved" | "rejected";
  reviewComment?: string;
  version: number;
};

const defaultWindow = {
  windowMode: "available" as const,
  dateRangeStart: "",
  dateRangeEnd: "",
  dailyStartTime: "06:00",
  dailyEndTime: "22:00",
  excludedDates: [] as { date: string; reason: string }[],
  semesterDeadline: "",
};

function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

export function mapClassSectionToCourse(
  section: ClassSection,
  course: CourseCatalog | null,
  semesterLabel: string,
  progressTarget: ProgressTarget,
): TeacherCourseView {
  return {
    id: section.id,
    code: course?.courseCode ?? section.classCode,
    section: section.classCode,
    name: course?.courseName ?? section.displayName,
    semester: semesterLabel,
    semesterId: section.semesterId,
    courseId: section.courseId,
    status: "ACTIVE",
    courseTarget: progressTarget.courseTargetSeconds / 3600,
    otherTarget: progressTarget.generalTargetSeconds / 3600,
    version: section.version,
    checkinWindow: {
      ...defaultWindow,
      windowMode:
        section.checkInWindowMode === "UNAVAILABLE"
          ? "unavailable"
          : "available",
      dateRangeStart: section.checkInStartDate ?? "",
      dateRangeEnd: section.checkInEndDate ?? "",
      dailyStartTime: formatTime(section.dailyStartTime) || "06:00",
      dailyEndTime: formatTime(section.dailyEndTime) || "22:00",
      excludedDates: (section.excludedDates ?? []).map((date) => ({
        date,
        reason: "—",
      })),
      semesterDeadline:
        section.submissionDeadlineAt?.slice(0, 10) ??
        section.checkInEndDate ??
        "",
    },
  };
}

export async function loadTeacherCourses(): Promise<{
  courses: TeacherCourseView[];
  catalog: CourseCatalog[];
  semester: Semester | null;
}> {
  const [sections, catalog, semester] = await Promise.all([
    fetchClassSections(),
    fetchCourses(),
    fetchCurrentSemester(),
  ]);
  const semesterLabel = semesterDisplayName(semester, "当前学期");
  const courseCache = new Map<string, CourseCatalog>();
  for (const item of catalog) courseCache.set(item.id, item);

  const courses: TeacherCourseView[] = [];
  for (const section of sections.filter(
    (item) => item.status !== "CLOSED" && item.status !== "ARCHIVED",
  )) {
    let course = courseCache.get(section.courseId) ?? null;
    if (!course) {
      course = await fetchCourse(section.courseId);
      courseCache.set(course.id, course);
    }
    const progressTarget = await fetchClassProgressTarget(section.id);
    courses.push(mapClassSectionToCourse(section, course, semesterLabel, progressTarget));
  }
  return { courses, catalog: [...courseCache.values()], semester };
}

function mapGender(value: string | null | undefined): "男" | "女" | "其他" | "未知" {
  if (value === "MALE" || value === "男") return "男";
  if (value === "FEMALE" || value === "女") return "女";
  if (value === "OTHER" || value === "其他") return "其他";
  return "未知";
}

function mapEnrollmentStatus(status: string): TeacherStudentView["status"] {
  const upper = status.toUpperCase();
  if (upper === "ACTIVE") return "active";
  if (upper === "REMOVED") return "removed";
  // WITHDRAWN is the API's member (EnrollmentStatus enum
  // [ACTIVE, WITHDRAWN, REMOVED]); ENDED/EXITED are tolerated legacy spellings.
  if (upper === "WITHDRAWN" || upper === "ENDED" || upper === "EXITED")
    return "exited";
  return "disabled";
}

function mapJoinMethod(source: string): "qr" | "manual_import" {
  return /INVITE|QR/i.test(source) ? "qr" : "manual_import";
}

export async function loadTeacherStudents(
  classSectionIds: string[],
): Promise<TeacherStudentView[]> {
  const rows: TeacherStudentView[] = [];
  const profileCache = new Map<string, StudentProfileApi>();

  for (const classSectionId of classSectionIds) {
    const enrollments = await fetchEnrollments(classSectionId);
    for (const enrollment of enrollments) {
      if (!profileCache.has(enrollment.studentId)) {
        profileCache.set(
          enrollment.studentId,
          await fetchStudentProfile(enrollment.studentId),
        );
      }
      const profile = profileCache.get(enrollment.studentId);
      if (!profile?.fullName?.trim() || !profile.studentNumber?.trim()) {
        throw new Error("STUDENT_PROFILE_IDENTITY_INCOMPLETE");
      }
      rows.push({
        id: enrollment.studentId,
        enrollmentId: enrollment.id,
        name: profile.fullName.trim(),
        number: profile.studentNumber.trim(),
        email:
          (profile.primaryEmail as string | null | undefined)?.trim() || "",
        gender: mapGender(profile.gender ?? null),
        grade: profile.gradeYear ? `${profile.gradeYear}级` : "—",
        courseId: enrollment.classSectionId,
        status: mapEnrollmentStatus(enrollment.status),
        joinedAt: enrollment.joinedAt,
        joinMethod: mapJoinMethod(enrollment.source),
        courseHours: 0,
        otherHours: 0,
        version: enrollment.version,
      });
    }
  }
  return rows;
}

export class ReviewProjectionConsistencyError extends Error {
  readonly code = "LOCAL_REVIEW_PROJECTION_STATE_MISMATCH";
  readonly recordId: string;

  constructor(recordId: string) {
    super(`REVIEWED record ${recordId} is missing currentReview`);
    this.name = "ReviewProjectionConsistencyError";
    this.recordId = recordId;
  }
}

function reviewToAuditStatus(record: ExerciseRecord): AuditStatus {
  const result = record.currentReview?.result;
  if (result === "VALID") return "valid";
  if (result === "INVALID") return "invalid";
  // Every submitted record is REVIEWED with a system VALID row. A missing or
  // unknown review is an invariant breach, never a third display state.
  throw new ReviewProjectionConsistencyError(record.id);
}

const exerciseSportLabels: Record<string, string> = {
  RUNNING: "跑步",
  BASKETBALL: "篮球",
  FOOTBALL: "足球",
  BADMINTON: "羽毛球",
  TABLE_TENNIS: "乒乓球",
  SWIMMING: "游泳",
  FITNESS: "健身",
  CYCLING: "骑行",
  OTHER: "其他",
};

function exerciseSportLabel(sportType: string): string {
  const normalized = sportType.trim().toUpperCase();
  return exerciseSportLabels[normalized] ?? (sportType.trim() || "运动");
}

function reasonCodeLabel(
  code: ReviewReasonCode | null | undefined,
): string | undefined {
  if (!code) return undefined;
  const map: Record<ReviewReasonCode, string> = {
    INSUFFICIENT_EVIDENCE: "图片或视频无法证明运动过程",
    INVALID_MEDIA: "媒体内容与运动无关",
    DURATION_INCONSISTENT: "运动时长不符合要求",
    IDENTITY_MISMATCH: "疑似代打卡",
    DUPLICATE_SUBMISSION: "重复提交",
    OUTSIDE_ALLOWED_SCOPE: "运动记录异常",
    OTHER: "其他",
  };
  return map[code];
}

export const INVALID_REASON_TO_CODE: Record<string, ReviewReasonCode> = {
  运动时长不符合要求: "DURATION_INCONSISTENT",
  图片或视频无法证明运动过程: "INSUFFICIENT_EVIDENCE",
  媒体内容与运动无关: "INVALID_MEDIA",
  重复提交: "DUPLICATE_SUBMISSION",
  疑似代打卡: "IDENTITY_MISMATCH",
  运动记录异常: "OUTSIDE_ALLOWED_SCOPE",
  其他: "OTHER",
};

export function mapExerciseRecordToCheckin(
  record: ExerciseRecord,
  evidenceContext?: ExerciseRecordEvidenceContext,
  currentReviewVersion = 0,
): TeacherCheckinView {
  const durationMinutes = Math.round((record.actualDurationSeconds || 0) / 60);
  const creditedMinutes = Math.round(
    (record.creditedDurationSeconds || 0) / 60,
  );
  const mediaIds = evidenceContext?.mediaIds ?? [];
  const auditStatus = reviewToAuditStatus(record);
  return {
    id: record.id,
    studentId: record.studentId,
    courseId: record.classSectionId,
    enrollmentId: record.enrollmentId,
    creditType:
      record.creditType === "COURSE_RELATED" ? "课程相关" : "其他运动",
    sport: record.sportName?.trim() || exerciseSportLabel(record.sportType),
    // Slicing the raw ISO string would show UTC (8 hours behind Beijing);
    // teachers must read the record in the organization's time.
    startAt:
      businessDateTime(evidenceContext?.startedAt) || record.businessDate,
    endAt: businessDateTime(evidenceContext?.endedAt) || record.businessDate,
    durationMinutes,
    creditedMinutes,
    originalHours: Math.max(0, record.actualDurationSeconds) / 3600,
    approvedHours: Math.max(0, record.creditedDurationSeconds) / 3600,
    description: record.description ?? "",
    // The backend's business day is authoritative for "which day this counts
    // as"; the UTC date of the timestamp can fall on the previous day.
    submittedAt:
      record.businessDate || businessDateTime(record.submittedAt).slice(0, 10),
    status: auditStatus === "valid" ? "有效" : "已调整",
    risk: null,
    confidence: null,
    proof: mediaIds.length
      ? mediaIds.map((_, index) => `凭证 ${index + 1}`)
      : [],
    mediaIds,
    locationExpired: null,
    reviewComment: record.currentReview?.publicComment ?? undefined,
    source: "student",
    auditStatus,
    invalidReason: reasonCodeLabel(record.currentReview?.reasonCode),
    auditRemark:
      record.currentReview?.reasonCode === "OTHER"
        ? (record.currentReview.publicComment ?? undefined)
        : undefined,
    version: record.version,
    reviewVersion: currentReviewVersion,
  };
}

export async function loadSubmittedCheckins(): Promise<TeacherCheckinView[]> {
  // The backend also returns DRAFT and CANCELLED records to the teacher, but
  // neither is reviewable (the review endpoint requires SUBMITTED), so they
  // must never enter the audit workspace.
  const records = (await fetchExerciseRecords()).filter(
    (item) => item.status === "SUBMITTED" || item.status === "REVIEWED",
  );
  const detailed = await Promise.all(
    records.map(async (item) => {
      const [detail, evidenceContext, latestReview] = await Promise.all([
        fetchExerciseRecord(item.id),
        fetchExerciseRecordEvidenceContext(item.id),
        fetchLatestExerciseReview(item.id),
      ]);
      return mapExerciseRecordToCheckin(
        { ...item, ...detail },
        evidenceContext,
        latestReview?.reviewVersion ?? 0,
      );
    }),
  );
  return detailed;
}

export function mapStudentScoreToGrade(
  score: StudentScore,
  meta: {
    studentId: string;
    classSectionId: string;
    gender?: "男" | "女" | "其他" | "未知";
    gradeGroup?: "大一/大二" | "大三/大四" | "未知";
  },
): TeacherGradeView {
  return {
    id: score.id,
    studentId: meta.studentId,
    courseId: meta.classSectionId,
    enrollmentId: score.enrollmentId,
    gender: meta.gender ?? "未知",
    gradeGroup: meta.gradeGroup ?? "未知",
    enduranceStatus: "Unavailable",
    physicalScore: score.finalScore ?? score.baseScore ?? undefined,
    published:
      Boolean(score.publishedAt) ||
      score.status === "PUBLISHED" ||
      score.status === "LOCKED",
    scoreStatus: score.status,
    qualificationStatus: score.qualificationStatus,
    validCourseDurationSeconds: score.validCourseDurationSeconds,
    validGeneralDurationSeconds: score.validGeneralDurationSeconds,
    totalValidDurationSeconds: score.totalValidDurationSeconds,
    scoringSeconds: score.scoringSeconds,
    excessSeconds: score.excessSeconds,
    baseScore: score.baseScore,
    adjustmentTotal: score.adjustmentTotal,
    calculatedAt: score.calculatedAt,
    publishedAt: score.publishedAt,
    version: score.version,
  };
}

export async function loadTeacherGrades(
  students: TeacherStudentView[],
  classSectionId?: string,
): Promise<TeacherGradeView[]> {
  const scores = await fetchStudentScores(classSectionId);
  const byEnrollment = new Map(
    students.map((student) => [student.enrollmentId, student]),
  );
  const byScoreEnrollment = new Map(
    scores.map((score) => [score.enrollmentId, score]),
  );
  const mapped = scores.map((score) => {
    const student = byEnrollment.get(score.enrollmentId);
    return mapStudentScoreToGrade(score, {
      studentId: student?.id ?? score.enrollmentId,
      classSectionId: student?.courseId ?? classSectionId ?? "",
      gender: student?.gender ?? "未知",
    });
  });
  for (const student of students) {
    if (byScoreEnrollment.has(student.enrollmentId)) continue;
    mapped.push({
      id: `pending:${student.enrollmentId}`,
      studentId: student.id,
      courseId: student.courseId,
      enrollmentId: student.enrollmentId,
      gender: student.gender,
      gradeGroup: "未知",
      enduranceStatus: "Unavailable",
      published: false,
      version: student.version,
    });
  }
  return mapped;
}

export async function loadTeacherExemptions(): Promise<TeacherExemptionView[]> {
  const applications = await fetchExemptionApplications();
  return applications.map((application) => ({
    id: application.id,
    studentId: application.studentId,
    courseId: application.classSectionId,
    kind:
      application.applicationSubtype === "RUN_800M" ||
      application.applicationSubtype === "RUN_1000M"
        ? "耐力跑免测"
        : application.applicationSubtype === "SCHOOL_TEAM"
          ? "校队认证"
          : application.applicationSubtype === "STUDENT_CLUB"
            ? "社团认证"
            : application.applicationType === "PHYSICAL_TEST"
              ? "体测免测"
              : application.applicationType === "EXERCISE_CHECK_IN"
                ? "运动打卡减免"
                : "特殊情况",
    organization:
      application.organizationName ??
      (application.applicationSubtype === "RUN_800M"
        ? "800m"
        : application.applicationSubtype === "RUN_1000M"
          ? "1000m"
          : undefined),
    reason: application.reason,
    material: application.mediaIds.map((_, index) => `申请图片 ${index + 1}.jpg`),
    mediaIds: [...application.mediaIds],
    submittedAt: application.submittedAt ?? "",
    status:
      application.status === "APPROVED"
        ? "approved"
        : application.status === "REJECTED"
          ? "rejected"
          : application.status === "SUPPLEMENT_REQUIRED"
            ? "supplement_required"
            : "pending",
    reviewComment: application.publicComment ?? undefined,
    version: application.version,
  }));
}
