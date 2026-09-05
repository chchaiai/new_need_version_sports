import {
  ADMIN_STORAGE_EVENT,
  ADMIN_STORAGE_KEY,
  GRADE_CORRECTION_TRANSITIONS,
  HELP_ARTICLE_TRANSITIONS,
  SEMESTER_TRANSITIONS,
  USER_TRANSITIONS,
  assertAdminPermission,
  buildUserImportPreview,
  deepClone,
  enduranceTableKey,
  makeId,
  makeRequestId,
  migrateRemovedStudentAndSystemStates,
  nowIso,
  requireStudentStatus,
  requireSystemMode,
  todayIso,
  validateEnduranceTable,
  validateSemesterInput,
  validateUserInput,
} from "./admin-domain";
import { cloneInitialAdminState } from "./admin-mock-data";
import {
  apiErrorText,
  contractRequest,
  request,
  requestWithMeta,
} from "./api-client";
import {
  AdminServiceError,
  type AdminLocale,
  type AdminCourse,
  type AdminPermission,
  type AdminState,
  type AdminUser,
  type AuditLogProjection,
  type CreateSemesterInput,
  type CurrentSemesterProjection,
  type EnduranceRuleInput,
  type GradeCorrectionStatus,
  type HelpArticleInput,
  type MaintenanceAnnouncement,
  type SupportTicket,
  type StudentProfileProjection,
  type SystemModeProjection,
  type SystemMode,
  type TeacherProfileProjection,
  type TicketStatus,
  type UpdateSemesterInput,
  type UserInput,
  type UserRole,
} from "./admin-types";
import type { components } from "./openapi.generated";

type ContractSchemas = components["schemas"];
export type FeedbackProjection = ContractSchemas["Feedback"];
export type HelpArticleProjection = ContractSchemas["HelpArticle"];

export type AdminMutationResult<T = undefined> = {
  state: AdminState;
  value: T;
};

let memoryState: AdminState | null = null;
let adminDataMode: "real" | "demo" = "real";

const ENDURANCE_RULES_VERSION_KEY = `${ADMIN_STORAGE_KEY}:endurance-rules-version`;
const ENDURANCE_RULES_VERSION = "one-point-per-band-2026-08-25";
const FEEDBACK_CATEGORIES_VERSION_KEY = `${ADMIN_STORAGE_KEY}:feedback-categories-version`;
const FEEDBACK_CATEGORIES_VERSION = "shared-student-feedback-categories-2026-08-29";
const STUDENT_AND_SYSTEM_STATUS_VERSION_KEY = `${ADMIN_STORAGE_KEY}:student-system-status-version`;
const STUDENT_AND_SYSTEM_STATUS_VERSION = "student-active-pending-system-normal-maintenance-2026-08-30";

export function setAdminDataMode(mode: "real" | "demo") {
  adminDataMode = mode;
  if (mode === "real") memoryState = null;
}

function assertDemoMode() {
  if (adminDataMode !== "demo") {
    throw new AdminServiceError("DEPENDENCY", "BACKEND_REQUIRED");
  }
}

function readPersistedState() {
  assertDemoMode();
  if (typeof window === "undefined")
    return memoryState ?? cloneInitialAdminState();
  try {
    const saved = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!saved) return cloneInitialAdminState();
    const parsed = JSON.parse(saved) as Partial<AdminState>;
    if (
      parsed.schemaVersion !== 2 ||
      !Array.isArray(parsed.users) ||
      !Array.isArray(parsed.semesters)
    ) {
      return cloneInitialAdminState();
    }
    return parsed as AdminState;
  } catch {
    return memoryState ?? cloneInitialAdminState();
  }
}

function persistState(state: AdminState) {
  assertDemoMode();
  memoryState = deepClone(state);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent(ADMIN_STORAGE_EVENT, {
        detail: { revision: state.revision },
      }),
    );
  } catch {
    throw new AdminServiceError("STORAGE", "STORAGE_UNAVAILABLE");
  }
}

async function waitForMock() {
  await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 160));
}

function currentActor(state: AdminState) {
  return state.users.find((user) => user.id === state.currentAdminId) ?? null;
}

function addAudit(
  state: AdminState,
  action: string,
  resourceType: string,
  resourceId: string | null,
  metadata: Record<string, unknown>,
) {
  const actor = currentActor(state);
  state.auditLogs.unshift({
    id: makeId("AL"),
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? "System administrator",
    action,
    resourceType,
    resourceId,
    requestId: makeRequestId(),
    metadata,
    createdAt: nowIso(),
  });
}

function addNotification(
  state: AdminState,
  kind: AdminState["notifications"][number]["kind"],
  audience: AdminState["notifications"][number]["audience"],
  title: string,
  message: string,
) {
  state.notifications.unshift({
    id: makeId("notice"),
    kind,
    audience,
    title,
    message,
    createdAt: nowIso(),
  });
}

async function mutate<T>(
  permission: AdminPermission,
  operation: (draft: AdminState) => T,
): Promise<AdminMutationResult<T>> {
  await waitForMock();
  assertAdminPermission(permission);
  const draft = deepClone(readPersistedState());
  const value = operation(draft);
  draft.revision += 1;
  persistState(draft);
  return { state: deepClone(draft), value };
}

function findUser(state: AdminState, id: string) {
  const user = state.users.find((item) => item.id === id);
  if (!user) throw new AdminServiceError("NOT_FOUND", "USER_NOT_FOUND");
  return user;
}

function ensureExpectedVersion(actual: string, expected?: string) {
  if (expected && actual !== expected)
    throw new AdminServiceError("CONFLICT", "DATA_CHANGED");
}

function normalizeUserInput(input: UserInput, existing?: AdminUser): AdminUser {
  const stamp = nowIso();
  return {
    id: existing?.id ?? makeId("user"),
    account: input.account.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    name: input.name.trim(),
    college: input.college.trim(),
    ...(input.role === "student"
      ? {
          className: input.className?.trim(),
          gender: input.gender,
          gradeLevel: input.gradeLevel,
          admissionYear: input.admissionYear,
        }
      : {}),
    status: input.status,
    tokenVersion: existing?.tokenVersion ?? 0,
    verificationLock: existing?.verificationLock,
    assignedCourseCount: existing?.assignedCourseCount ?? 0,
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: stamp,
  };
}

export async function loadAdminState() {
  assertDemoMode();
  await waitForMock();
  let state = readPersistedState();
  if (
    typeof window !== "undefined" &&
    window.localStorage.getItem(STUDENT_AND_SYSTEM_STATUS_VERSION_KEY) !==
      STUDENT_AND_SYSTEM_STATUS_VERSION
  ) {
    const migrated = migrateRemovedStudentAndSystemStates(state);
    state = migrated.state;
    if (migrated.changed) persistState(state);
    window.localStorage.setItem(
      STUDENT_AND_SYSTEM_STATUS_VERSION_KEY,
      STUDENT_AND_SYSTEM_STATUS_VERSION,
    );
  }
  if (
    typeof window !== "undefined" &&
    window.localStorage.getItem(ENDURANCE_RULES_VERSION_KEY) !==
      ENDURANCE_RULES_VERSION
  ) {
    const migrated = deepClone(state);
    migrated.enduranceRules = cloneInitialAdminState().enduranceRules;
    migrated.revision += 1;
    persistState(migrated);
    window.localStorage.setItem(
      ENDURANCE_RULES_VERSION_KEY,
      ENDURANCE_RULES_VERSION,
    );
    state = migrated;
  }
  if (
    typeof window !== "undefined" &&
    window.localStorage.getItem(FEEDBACK_CATEGORIES_VERSION_KEY) !==
      FEEDBACK_CATEGORIES_VERSION
  ) {
    const migrated = deepClone(state);
    migrated.tickets = cloneInitialAdminState().tickets;
    migrated.revision += 1;
    persistState(migrated);
    window.localStorage.setItem(
      FEEDBACK_CATEGORIES_VERSION_KEY,
      FEEDBACK_CATEGORIES_VERSION,
    );
    state = migrated;
  }
  if (
    !memoryState &&
    typeof window !== "undefined" &&
    !window.localStorage.getItem(ADMIN_STORAGE_KEY)
  ) {
    persistState(state);
  }
  return deepClone(state);
}

export async function reloadAdminState() {
  assertDemoMode();
  return deepClone(readPersistedState());
}

export async function createSemester(input: CreateSemesterInput) {
  return mutate("admin.semesters.write", (state) => {
    validateSemesterInput(input, state.semesters);
    const semester = {
      ...input,
      id: makeId("semester"),
      name: input.name.trim(),
      status: "upcoming" as const,
      courseCount: 0,
      studentCount: 0,
      updatedAt: nowIso(),
    };
    state.semesters.unshift(semester);
    addAudit(state, "semester.create", "semester", semester.id, {
      after: semester,
    });
    return semester;
  });
}

export async function updateSemester(input: UpdateSemesterInput) {
  return mutate("admin.semesters.write", (state) => {
    const semester = state.semesters.find((item) => item.id === input.id);
    if (!semester)
      throw new AdminServiceError("NOT_FOUND", "SEMESTER_NOT_FOUND");
    ensureExpectedVersion(semester.updatedAt, input.expectedUpdatedAt);
    if (semester.status !== "upcoming")
      throw new AdminServiceError("DEPENDENCY", "SEMESTER_EDIT_LOCKED");
    validateSemesterInput(input, state.semesters, semester.id);
    const before = deepClone(semester);
    Object.assign(semester, {
      name: input.name.trim(),
      academicYear: input.academicYear,
      term: input.term,
      startDate: input.startDate,
      endDate: input.endDate,
      updatedAt: nowIso(),
    });
    addAudit(state, "semester.update", "semester", semester.id, {
      before,
      after: semester,
    });
    return semester;
  });
}

export async function setCurrentSemester(id: string) {
  return mutate("admin.semesters.write", (state) => {
    const target = state.semesters.find((semester) => semester.id === id);
    if (!target) throw new AdminServiceError("NOT_FOUND", "SEMESTER_NOT_FOUND");
    if (!SEMESTER_TRANSITIONS[target.status].includes("current"))
      throw new AdminServiceError("VALIDATION", "SEMESTER_TRANSITION_INVALID");
    if (target.startDate > todayIso())
      throw new AdminServiceError("VALIDATION", "SEMESTER_NOT_STARTED");
    const previous = state.semesters.find(
      (semester) => semester.status === "current",
    );
    if (previous) {
      previous.status = "archived";
      previous.updatedAt = nowIso();
    }
    target.status = "current";
    target.updatedAt = nowIso();
    addNotification(
      state,
      "semester",
      "all",
      "Current semester changed",
      target.name,
    );
    addAudit(state, "semester.switch", "semester", target.id, {
      previousSemesterId: previous?.id ?? null,
      nextSemesterId: target.id,
    });
    return target;
  });
}






export async function deleteTeacherUser(
  userId: string,
  confirmationAccount: string,
  reason: string,
) {
  return mutate("admin.users.delete", (state) => {
    const target = findUser(state, userId);
    if (target.role !== "teacher")
      throw new AdminServiceError("VALIDATION", "TEACHER_DELETION_ONLY");
    if (target.assignedCourseCount > 0)
      throw new AdminServiceError("DEPENDENCY", "TEACHER_HAS_COURSES");
    if (confirmationAccount.trim() !== target.account)
      throw new AdminServiceError("VALIDATION", "CONFIRM_ACCOUNT_MISMATCH", {
        confirmationAccount: "CONFIRM_ACCOUNT_MISMATCH",
      });
    if (!reason.trim())
      throw new AdminServiceError("VALIDATION", "REASON_REQUIRED", {
        reason: "REQUIRED",
      });
    const cascade = {
      recoveryRequests: state.recoveryRequests.filter(
        (request) => request.userId === target.id,
      ).length,
      assignedCourses: target.assignedCourseCount,
    };
    state.users = state.users.filter((user) => user.id !== target.id);
    addAudit(state, "user.delete", "user", target.id, {
      account: target.account,
      role: target.role,
      cascade,
      reason: reason.trim(),
    });
    return { target, cascade };
  });
}


export async function importUsers(
  csvText: string,
  role: "teacher",
  fallbackPassword: string,
) {
  return mutate("admin.users.write", (state) => {
    if (role !== "teacher")
      throw new AdminServiceError("VALIDATION", "TEACHER_CREATION_ONLY", {
        role: "TEACHER_CREATION_ONLY",
      });
    const preview = buildUserImportPreview(
      csvText,
      role,
      state.users,
      fallbackPassword,
    );
    if (preview.length === 0)
      throw new AdminServiceError("VALIDATION", "CSV_EMPTY");
    if (preview.some((row) => row.errors.length > 0))
      throw new AdminServiceError("VALIDATION", "CSV_HAS_ERRORS");
    const created = preview.map((row) => normalizeUserInput(row.input));
    state.users.unshift(...created);
    addAudit(state, "user.batch_create", "user", null, {
      role,
      count: created.length,
      accounts: created.map((user) => user.account),
    });
    return {
      created,
      passwordRows: preview.map((row) => ({
        account: row.input.account,
        name: row.input.name,
        email: row.input.email,
        initialPassword: row.input.initialPassword ?? "",
      })),
    };
  });
}

function validateRuleMutation(
  state: AdminState,
  input: EnduranceRuleInput,
  replacingId?: string,
) {
  if (
    input.minSeconds < 0 ||
    input.maxSeconds < input.minSeconds ||
    input.score < 0 ||
    input.score > 100
  ) {
    throw new AdminServiceError("VALIDATION", "ENDURANCE_RULE_INVALID");
  }
  const nextRule = {
    ...input,
    id: replacingId ?? input.id ?? makeId("rule"),
    updatedAt: nowIso(),
  };
  const groupKey = enduranceTableKey(nextRule);
  const group = state.enduranceRules
    .filter(
      (rule) => rule.id !== replacingId && enduranceTableKey(rule) === groupKey,
    )
    .concat(nextRule);
  const issues = validateEnduranceTable(group);
  if (issues.length > 0)
    throw new AdminServiceError("VALIDATION", "ENDURANCE_TABLE_INVALID", {
      table: JSON.stringify(issues),
    });
  return nextRule;
}

export async function saveEnduranceRule(input: EnduranceRuleInput) {
  return mutate("admin.config.write", (state) => {
    const existing = input.id
      ? state.enduranceRules.find((rule) => rule.id === input.id)
      : undefined;
    if (input.id && !existing)
      throw new AdminServiceError("NOT_FOUND", "ENDURANCE_RULE_NOT_FOUND");
    const before = existing ? deepClone(existing) : null;
    const next = validateRuleMutation(state, input, existing?.id);
    if (existing) Object.assign(existing, next);
    else state.enduranceRules.push(next);
    addAudit(
      state,
      existing ? "endurance_rule.update" : "endurance_rule.create",
      "endurance_rule",
      next.id,
      { before, after: next },
    );
    return next;
  });
}

export async function deleteEnduranceRule(id: string) {
  return mutate("admin.config.write", (state) => {
    const target = state.enduranceRules.find((rule) => rule.id === id);
    if (!target)
      throw new AdminServiceError("NOT_FOUND", "ENDURANCE_RULE_NOT_FOUND");
    const remaining = state.enduranceRules.filter(
      (rule) =>
        enduranceTableKey(rule) === enduranceTableKey(target) && rule.id !== id,
    );
    const issues = validateEnduranceTable(remaining);
    if (remaining.length === 0 || issues.length > 0)
      throw new AdminServiceError(
        "DEPENDENCY",
        "ENDURANCE_DELETE_BREAKS_TABLE",
      );
    state.enduranceRules = state.enduranceRules.filter(
      (rule) => rule.id !== id,
    );
    addAudit(state, "endurance_rule.delete", "endurance_rule", id, {
      before: target,
    });
    return target;
  });
}

export async function switchSystemMode(
  mode: SystemMode,
  reason: string,
  announcement?: Omit<
    MaintenanceAnnouncement,
    "id" | "publishedAt" | "publishedBy"
  >,
) {
  return mutate("admin.system.write", (state) => {
    if (state.systemMode.mode === mode)
      throw new AdminServiceError("VALIDATION", "SYSTEM_MODE_UNCHANGED");
    if (!reason.trim())
      throw new AdminServiceError("VALIDATION", "REASON_REQUIRED", {
        reason: "REQUIRED",
      });
    if (
      mode === "MAINTENANCE" &&
      (!announcement?.messageZh.trim() ||
        !announcement.messageEn.trim() ||
        !announcement.expectedRecoveryAt)
    ) {
      throw new AdminServiceError("VALIDATION", "MAINTENANCE_NOTICE_REQUIRED");
    }
    const before = deepClone(state.systemMode);
    state.systemMode = {
      mode,
      reason: reason.trim(),
      changedAt: nowIso(),
      changedBy: currentActor(state)?.name ?? "System administrator",
    };
    if (announcement) {
      const item = {
        ...announcement,
        id: makeId("ANN"),
        publishedAt: nowIso(),
        publishedBy: currentActor(state)?.name ?? "System administrator",
      };
      state.maintenanceAnnouncements.unshift(item);
      addNotification(
        state,
        "maintenance",
        "all",
        item.titleZh,
        item.messageZh,
      );
    } else if (mode === "NORMAL") {
      addNotification(state, "maintenance", "all", "系统已恢复", reason.trim());
    }
    addAudit(state, "system_mode.change", "system", "global", {
      before: before.mode,
      after: mode,
      reason: reason.trim(),
      announcementId: announcement
        ? state.maintenanceAnnouncements[0]?.id
        : null,
    });
    return state.systemMode;
  });
}


function validateHelpArticle(input: HelpArticleInput) {
  const errors: Record<string, string> = {};
  if (!input.titleZh.trim()) errors.titleZh = "REQUIRED";
  if (!input.titleEn.trim()) errors.titleEn = "REQUIRED";
  if (!input.category.trim()) errors.category = "REQUIRED";
  if (!Number.isFinite(input.sortWeight)) errors.sortWeight = "NUMBER_REQUIRED";
  if (input.status === "published") {
    if (!input.bodyZh.trim()) errors.bodyZh = "REQUIRED";
    if (!input.bodyEn.trim()) errors.bodyEn = "REQUIRED";
    if (input.keywords.length === 0) errors.keywords = "REQUIRED";
  }
  if (Object.keys(errors).length)
    throw new AdminServiceError("VALIDATION", "FORM_INVALID", errors);
}

export async function saveHelpArticle(input: HelpArticleInput) {
  return mutate("admin.help.write", (state) => {
    validateHelpArticle(input);
    const existing = input.id
      ? state.helpArticles.find((article) => article.id === input.id)
      : undefined;
    if (input.id && !existing)
      throw new AdminServiceError("NOT_FOUND", "HELP_ARTICLE_NOT_FOUND");
    if (existing)
      ensureExpectedVersion(existing.updatedAt, input.expectedUpdatedAt);
    if (
      existing &&
      existing.status !== input.status &&
      !HELP_ARTICLE_TRANSITIONS[existing.status].includes(input.status)
    ) {
      throw new AdminServiceError("VALIDATION", "HELP_TRANSITION_INVALID");
    }
    const before = existing ? deepClone(existing) : null;
    const article = {
      ...input,
      id: existing?.id ?? makeId("HA"),
      titleZh: input.titleZh.trim(),
      titleEn: input.titleEn.trim(),
      bodyZh: input.bodyZh.trim(),
      bodyEn: input.bodyEn.trim(),
      keywords: [
        ...new Set(
          input.keywords.map((keyword) => keyword.trim()).filter(Boolean),
        ),
      ],
      category: input.category.trim(),
      publishedAt:
        input.status === "published"
          ? (existing?.publishedAt ?? nowIso())
          : existing?.publishedAt,
      updatedAt: nowIso(),
    };
    delete (article as Partial<HelpArticleInput>).expectedUpdatedAt;
    if (existing) Object.assign(existing, article);
    else state.helpArticles.unshift(article);
    const action = !existing
      ? "help_article.create"
      : before?.status !== article.status
        ? article.status === "published"
          ? "help_article.publish"
          : "help_article.archive"
        : "help_article.update";
    addAudit(state, action, "help_article", article.id, {
      before,
      after: article,
    });
    return article;
  });
}

export async function transitionHelpArticle(
  id: string,
  nextStatus: "published" | "archived",
) {
  return mutate("admin.help.write", (state) => {
    const article = state.helpArticles.find((item) => item.id === id);
    if (!article)
      throw new AdminServiceError("NOT_FOUND", "HELP_ARTICLE_NOT_FOUND");
    if (!HELP_ARTICLE_TRANSITIONS[article.status].includes(nextStatus))
      throw new AdminServiceError("VALIDATION", "HELP_TRANSITION_INVALID");
    if (nextStatus === "published")
      validateHelpArticle({ ...article, status: "published" });
    const before = article.status;
    article.status = nextStatus;
    article.updatedAt = nowIso();
    if (nextStatus === "published" && !article.publishedAt)
      article.publishedAt = nowIso();
    addAudit(
      state,
      nextStatus === "published"
        ? "help_article.publish"
        : "help_article.archive",
      "help_article",
      article.id,
      { before, after: nextStatus },
    );
    return article;
  });
}

export async function updateTicket(
  ticketId: string,
  status: TicketStatus,
  reply: string,
) {
  return mutate("admin.support.write", (state) => {
    const ticket = state.tickets.find((item) => item.id === ticketId);
    if (!ticket) throw new AdminServiceError("NOT_FOUND", "TICKET_NOT_FOUND");
    if (!reply.trim())
      throw new AdminServiceError("VALIDATION", "REPLY_REQUIRED", {
        reply: "REQUIRED",
      });
    const before = ticket.status;
    ticket.status = status;
    ticket.replies.push({
      id: makeId("reply"),
      author: currentActor(state)?.name ?? "System administrator",
      message: reply.trim(),
      createdAt: nowIso(),
    });
    addAudit(state, "feedback.update", "feedback", ticket.id, {
      before,
      after: status,
      reply: reply.trim(),
    });
    return ticket;
  });
}


export async function refreshHealth() {
  const startedAt = performance.now();
  const response = await requestWithMeta<{
    kind: "ADMIN";
    status: "UP" | "DEGRADED" | "DOWN";
    checkedAt: string;
    dependencies: {
      database: {
        status: "UP" | "DOWN" | "NOT_CONFIGURED";
        latencyMs: number | null;
      };
      notificationQueue: {
        status: "UP" | "DOWN" | "NOT_CONFIGURED";
        latencyMs: number | null;
        backlog?: number;
      };
      objectStorage: {
        status: "UP" | "DOWN" | "NOT_CONFIGURED";
        latencyMs: number | null;
      };
      mediaStorage: {
        status: "UP" | "DOWN" | "NOT_CONFIGURED";
        latencyMs: number | null;
      };
    };
  }>("/health/admin");
  const dependencies = response.data.dependencies;
  return {
    apiStatus: "UP",
    apiLatencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
    databaseStatus: dependencies.database.status,
    databaseLatencyMs: dependencies.database.latencyMs,
    notificationQueueStatus: dependencies.notificationQueue.status,
    notificationBacklog: dependencies.notificationQueue.backlog ?? 0,
    objectStorageStatus: dependencies.objectStorage.status,
    objectStorageLatencyMs: dependencies.objectStorage.latencyMs,
    mediaStorageStatus: dependencies.mediaStorage.status,
    mediaStorageLatencyMs: dependencies.mediaStorage.latencyMs,
    checkedAt: response.data.checkedAt,
    requestId: response.meta.requestId ?? null,
    status: response.data.status,
  } satisfies AdminState["health"];
}

export function previewUserImport(
  csvText: string,
  role: Exclude<UserRole, "admin">,
  users: AdminUser[],
  fallbackPassword: string,
) {
  return buildUserImportPreview(csvText, role, users, fallbackPassword);
}


export type TicketMutationInput = Pick<SupportTicket, "id" | "status"> & {
  reply: string;
};

// ---------------------------------------------------------------------------
// Unified backend API: administrator API-backed capabilities.
// These functions intentionally do not use or update the legacy localStorage
// demo state. Unsupported capabilities remain explicit in the UI.

export const adminApiErrorText = (error: unknown, locale: AdminLocale = "zh") =>
  apiErrorText(error, locale);

async function listAllCursorPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  const visitedCursors = new Set<string>();
  let cursor: string | null = null;

  do {
    const query = new URLSearchParams({ limit: "100" });
    if (cursor) query.set("cursor", cursor);
    const response = await requestWithMeta<T[]>(`${path}?${query.toString()}`);
    items.push(...response.data);
    const pagination = response.meta.pagination;
    const nextCursor = pagination?.hasMore ? pagination.nextCursor : null;
    if (!nextCursor || visitedCursors.has(nextCursor)) break;
    visitedCursors.add(nextCursor);
    cursor = nextCursor;
  } while (cursor);

  return items;
}




export function listStudentProfiles() {
  return listAllCursorPages<Omit<StudentProfileProjection, "status"> & { status: string }>("/students")
    .then((profiles) => profiles.map((profile) => ({
      ...profile,
      status: requireStudentStatus(profile.status),
    })));
}

export async function getStudentProfile(studentId: string) {
  const profile = await request<Omit<StudentProfileProjection, "status"> & { status: string }>(
    `/students/${encodeURIComponent(studentId)}`,
  );
  return { ...profile, status: requireStudentStatus(profile.status) };
}

export function getTeacherProfile(teacherId: string) {
  return request<TeacherProfileProjection>(
    `/teachers/${encodeURIComponent(teacherId)}`,
  );
}

type ClassSectionTeacherReference = { teacherId: string };

export async function listAssociatedTeacherProfiles() {
  const teacherIds = new Set<string>();
  const sections =
    await listAllCursorPages<ClassSectionTeacherReference>("/class-sections");
  sections.forEach((section) => {
    if (section.teacherId) teacherIds.add(section.teacherId);
  });

  const teachers = await Promise.all(
    [...teacherIds].map((teacherId) => getTeacherProfile(teacherId)),
  );
  return teachers.sort((left, right) =>
    left.employeeNumber.localeCompare(right.employeeNumber),
  );
}

export type AuditLogCursorPage = {
  items: AuditLogProjection[];
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
};

export type AuditLogQueryFilters = {
  q?: string;
  actorUserId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  occurredAtFrom?: string;
  occurredAtTo?: string;
};

export async function listAuditLogProjections(
  cursor: string | null = null,
  filters: AuditLogQueryFilters = {},
  limit = 50,
): Promise<AuditLogCursorPage> {
  const query = new URLSearchParams({ limit: String(limit), sort: "-occurredAt" });
  if (cursor) query.set("cursor", cursor);
  Object.entries(filters).forEach(([name, value]) => {
    if (value) query.set(name, value);
  });
  const response = await requestWithMeta<AuditLogProjection[]>(
    `/audit-logs?${query.toString()}`,
  );
  return {
    items: response.data,
    nextCursor: response.meta.pagination?.nextCursor ?? null,
    hasMore: response.meta.pagination?.hasMore ?? false,
    limit: response.meta.pagination?.limit ?? limit,
  };
}

export async function listAllAuditLogProjections(
  filters: AuditLogQueryFilters = {},
): Promise<AuditLogProjection[]> {
  const items: AuditLogProjection[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = await listAuditLogProjections(cursor, filters, 100);
    items.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    if (seen.has(page.nextCursor)) throw new AdminServiceError("DEPENDENCY", "CURSOR_LOOP");
    seen.add(page.nextCursor);
    cursor = page.nextCursor;
  } while (true);
  return items;
}

export function getAuditLogProjection(auditLogId: string) {
  return request<AuditLogProjection>(
    `/audit-logs/${encodeURIComponent(auditLogId)}`,
  );
}

export type RuntimeLogArchiveJob = ContractSchemas["ExportJob"];
export type RuntimeLogArchiveDownload = ContractSchemas["ExportDownload"];

export function requestRuntimeLogArchive(filters: AuditLogQueryFilters) {
  return request<RuntimeLogArchiveJob>("/exports", {
    method: "POST",
    body: {
      exportType: "AUDIT_LOGS",
      filters: {
        ...filters,
        format: "ZIP",
        bundle: "RUNTIME_DIAGNOSTICS",
        include: [
          "APPLICATION_LOGS",
          "HEALTH_SUMMARY",
          "REQUEST_CORRELATION",
          "AUDIT_EVENTS",
        ],
        redaction: "REQUIRED",
      },
      purpose: "ADMIN_RUNTIME_DIAGNOSTICS",
    },
  });
}

export function getRuntimeLogArchiveJob(exportId: string) {
  return request<RuntimeLogArchiveJob>(
    `/exports/${encodeURIComponent(exportId)}`,
  );
}

export function createRuntimeLogArchiveDownload(exportId: string) {
  return request<RuntimeLogArchiveDownload>(
    `/exports/${encodeURIComponent(exportId)}/download-url`,
    {
      method: "POST",
      body: { purpose: "ADMIN_RUNTIME_DIAGNOSTICS_DOWNLOAD" },
    },
  );
}

export async function getSystemModeProjection() {
  const projection = await request<Omit<SystemModeProjection, "mode"> & { mode: string }>("/system-mode");
  return { ...projection, mode: requireSystemMode(projection.mode) };
}

export function getCurrentSemesterProjection() {
  return request<CurrentSemesterProjection>("/semesters/current");
}






export function listFeedbackProjections() {
  return listAllCursorPages<FeedbackProjection>("/feedback");
}

export async function listHelpArticleProjections(locale: "zh-CN" | "en") {
  const response = await requestWithMeta<HelpArticleProjection[]>(
    `/help-articles?locale=${encodeURIComponent(locale)}`,
  );
  return response.data;
}

export function publishSportTemplate(body: {
  name: string;
  minCreditThresholdMinutes: 30 | 45 | 60;
  weeklySessionFrequency: 2 | 3 | 4;
  courseRelatedTargetMinutes: number;
  otherTargetMinutes: number;
}) {
  return contractRequest("/admin/sport-templates", { method: "POST", body });
}

export function createLimitedReviewGrant(body: {
  courseId: string;
  granteeTeacherId: string;
  recordIds: string[];
  note: string | null;
}) {
  return contractRequest("/admin/limited-review-grants", { method: "POST", body });
}

export function listLimitedReviewGrants() {
  return contractRequest("/admin/limited-review-grants");
}

export function revokeLimitedReviewGrant(
  grantId: string,
  body: { expectedVersion: number },
) {
  return contractRequest(
    `/admin/limited-review-grants/${encodeURIComponent(grantId)}/revocation`,
    { method: "POST", body },
  );
}

export function getAiOcrServiceStatus() {
  return contractRequest("/admin/ai-ocr-service");
}

export function updateAiOcrServiceConfig(body: {
  aiEnabled: boolean;
  ocrEnabled: boolean;
  note: string | null;
  expectedVersion: number;
}) {
  return contractRequest("/admin/ai-ocr-service", { method: "PUT", body });
}
