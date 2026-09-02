import {
  AdminServiceError,
  type AdminPermission,
  type AdminRoute,
  type AdminState,
  type AdminUser,
  type CreateSemesterInput,
  type EnduranceRule,
  type GradeCorrectionStatus,
  type HelpArticleStatus,
  type SemesterStatus,
  type StudentStatus,
  type SystemMode,
  type UserInput,
  type UserRole,
  type UserStatus,
} from "./admin-types";

export const ADMIN_STORAGE_KEY = "bnbu-admin-console-v2";
export const ADMIN_SESSION_KEY = "bnbu-portal-session-v1";
export const ADMIN_STORAGE_EVENT = "bnbu-admin-state-change";

export const ADMIN_PERMISSIONS: ReadonlySet<AdminPermission> = new Set([
  "admin.dashboard.read",
  "admin.semesters.read",
  "admin.semesters.write",
  "admin.users.read",
  "admin.users.write",
  "admin.users.delete",
  "admin.recovery.review",
  "admin.config.read",
  "admin.config.write",
  "admin.system.read",
  "admin.system.write",
  "admin.system.purge",
  "admin.help.read",
  "admin.help.write",
  "admin.audit.read",
  "admin.support.read",
  "admin.support.write",
]);

export const ADMIN_ROUTE_PERMISSION: Record<AdminRoute, AdminPermission> = {
  overview: "admin.dashboard.read",
  courses: "admin.dashboard.read",
  semesters: "admin.semesters.read",
  accounts: "admin.users.read",
  support: "admin.support.read",
  rules: "admin.config.read",
  system: "admin.system.read",
  help: "admin.help.read",
  audit: "admin.audit.read",
  subadmins: "admin.users.write",
};

export const SEMESTER_TRANSITIONS: Record<SemesterStatus, readonly SemesterStatus[]> = {
  upcoming: ["current"],
  current: ["archived"],
  archived: [],
};

export const STUDENT_STATUSES = ["ACTIVE", "PENDING"] as const satisfies readonly StudentStatus[];
export const SYSTEM_MODES = ["NORMAL", "MAINTENANCE"] as const satisfies readonly SystemMode[];

export function requireStudentStatus(value: unknown): StudentStatus {
  if (typeof value === "string" && STUDENT_STATUSES.includes(value as StudentStatus))
    return value as StudentStatus;
  throw new AdminServiceError("DEPENDENCY", "STUDENT_STATUS_UNSUPPORTED");
}

export function requireSystemMode(value: unknown): SystemMode {
  if (typeof value === "string" && SYSTEM_MODES.includes(value as SystemMode))
    return value as SystemMode;
  throw new AdminServiceError("DEPENDENCY", "SYSTEM_MODE_UNSUPPORTED");
}

export const USER_TRANSITIONS: Record<UserStatus, readonly UserStatus[]> = {
  ACTIVE: ["PENDING", "DISABLED", "RECOVERY_REQUIRED"],
  PENDING: ["ACTIVE"],
  DISABLED: ["ACTIVE", "RECOVERY_REQUIRED"],
  RECOVERY_REQUIRED: ["ACTIVE", "DISABLED"],
};

/** Migrates only synthetic preview state; real Backend facts are never rewritten. */
export function migrateRemovedStudentAndSystemStates(state: AdminState): {
  state: AdminState;
  changed: boolean;
} {
  const next = deepClone(state);
  let changed = false;
  next.users = next.users.map((user) => {
    if (user.role !== "student") return user;
    const status: StudentStatus = user.status === "ACTIVE" ? "ACTIVE" : "PENDING";
    if (status === user.status) return user;
    changed = true;
    return { ...user, status };
  });
  if (String(next.systemMode.mode) === "READ_ONLY") {
    next.systemMode = {
      ...next.systemMode,
      mode: "NORMAL",
      reason: "已恢复正常模式",
      changedBy: "本地预览状态迁移",
    };
    changed = true;
  }
  const auditLogs = next.auditLogs.filter((entry) =>
    entry.action !== "system_mode.change" ||
    (entry.metadata.before !== "READ_ONLY" && entry.metadata.after !== "READ_ONLY"));
  if (auditLogs.length !== next.auditLogs.length) {
    next.auditLogs = auditLogs;
    changed = true;
  }
  if (changed) next.revision += 1;
  return { state: next, changed };
}

export const HELP_ARTICLE_TRANSITIONS: Record<HelpArticleStatus, readonly HelpArticleStatus[]> = {
  draft: ["published"],
  published: ["archived"],
  archived: ["published"],
};

export const GRADE_CORRECTION_TRANSITIONS: Record<GradeCorrectionStatus, readonly GradeCorrectionStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["corrected"],
  corrected: ["closed"],
  closed: [],
  rejected: [],
};

export function assertAdminPermission(permission: AdminPermission) {
  if (!ADMIN_PERMISSIONS.has(permission)) {
    throw new AdminServiceError("FORBIDDEN", "PERMISSION_DENIED");
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function todayIso() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function makeId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

export function makeRequestId() {
  return `req_${makeId("admin").replace(/-/g, "").slice(-18)}`;
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function pageItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    page: safePage,
    pageSize,
    total: items.length,
    totalPages,
  };
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isPasswordComplexEnough(value: string) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function validateSemesterInput(input: CreateSemesterInput, semesters: AdminState["semesters"], editingId?: string) {
  const errors: Record<string, string> = {};
  const yearMatch = input.academicYear.match(/^(\d{4})-(\d{4})$/);
  if (!input.name.trim()) errors.name = "REQUIRED";
  if (!yearMatch || Number(yearMatch[2]) !== Number(yearMatch[1]) + 1) errors.academicYear = "ACADEMIC_YEAR_FORMAT";
  if (!input.startDate) errors.startDate = "REQUIRED";
  if (!input.endDate) errors.endDate = "REQUIRED";
  if (input.startDate && input.endDate && input.endDate < input.startDate) errors.endDate = "DATE_ORDER";
  if (semesters.some((semester) => semester.id !== editingId && semester.academicYear === input.academicYear && semester.term === input.term)) {
    errors.term = "SEMESTER_DUPLICATE";
  }
  if (Object.keys(errors).length) throw new AdminServiceError("VALIDATION", "FORM_INVALID", errors);
}

export function validateUserInput(input: UserInput, users: AdminUser[], editingId?: string) {
  const errors: Record<string, string> = {};
  if (!input.account.trim()) errors.account = "REQUIRED";
  if (!input.name.trim()) errors.name = "REQUIRED";
  if (!isEmail(input.email)) errors.email = "EMAIL_FORMAT";
  if (!input.college.trim()) errors.college = "REQUIRED";
  if (!editingId && input.role !== "student" && !isPasswordComplexEnough(input.initialPassword ?? "")) {
    errors.initialPassword = "PASSWORD_COMPLEXITY";
  }
  if (input.role === "student") {
    if (!STUDENT_STATUSES.includes(input.status as StudentStatus)) errors.status = "STUDENT_STATUS_UNSUPPORTED";
    if (!input.className?.trim()) errors.className = "REQUIRED";
    if (!input.gender) errors.gender = "REQUIRED";
    if (!input.gradeLevel) errors.gradeLevel = "REQUIRED";
    if (!input.admissionYear || input.admissionYear < 2000 || input.admissionYear > new Date().getFullYear() + 1) {
      errors.admissionYear = "ADMISSION_YEAR_RANGE";
    }
  } else if (input.status === "PENDING") errors.status = "USER_STATUS_UNSUPPORTED";
  if (users.some((user) => user.id !== editingId && user.account.toLowerCase() === input.account.trim().toLowerCase())) {
    errors.account = "ACCOUNT_DUPLICATE";
  }
  if (users.some((user) => user.id !== editingId && user.email.toLowerCase() === input.email.trim().toLowerCase())) {
    errors.email = "EMAIL_DUPLICATE";
  }
  if (Object.keys(errors).length) throw new AdminServiceError("VALIDATION", "FORM_INVALID", errors);
}

export type EnduranceValidationIssue = {
  type: "gap" | "overlap" | "range" | "score" | "duplicate" | "combination";
  ruleIds: string[];
  from?: number;
  to?: number;
};

export function validateEnduranceTable(rules: EnduranceRule[]): EnduranceValidationIssue[] {
  const issues: EnduranceValidationIssue[] = [];
  const sorted = [...rules].sort((left, right) => left.minSeconds - right.minSeconds || left.maxSeconds - right.maxSeconds);
  sorted.forEach((rule, index) => {
    if (rule.maxSeconds < rule.minSeconds || rule.minSeconds < 0) issues.push({ type: "range", ruleIds: [rule.id] });
    if (rule.score < 0 || rule.score > 100) issues.push({ type: "score", ruleIds: [rule.id] });
    const invalidCombination = (rule.gender === "male" && rule.runType !== "1000m") || (rule.gender === "female" && rule.runType !== "800m");
    if (invalidCombination) issues.push({ type: "combination", ruleIds: [rule.id] });
    const duplicate = sorted.find((candidate, candidateIndex) => candidateIndex < index
      && candidate.gender === rule.gender
      && candidate.gradeGroup === rule.gradeGroup
      && candidate.runType === rule.runType
      && candidate.minSeconds === rule.minSeconds
      && candidate.maxSeconds === rule.maxSeconds);
    if (duplicate) issues.push({ type: "duplicate", ruleIds: [duplicate.id, rule.id] });
    const previous = sorted[index - 1];
    if (!previous) return;
    if (rule.minSeconds <= previous.maxSeconds) {
      issues.push({ type: "overlap", ruleIds: [previous.id, rule.id], from: rule.minSeconds, to: previous.maxSeconds });
    } else if (rule.minSeconds > previous.maxSeconds + 1) {
      issues.push({ type: "gap", ruleIds: [previous.id, rule.id], from: previous.maxSeconds + 1, to: rule.minSeconds - 1 });
    }
  });
  return issues;
}

export function enduranceTableKey(rule: Pick<EnduranceRule, "gender" | "gradeGroup" | "runType">) {
  return `${rule.gender}:${rule.gradeGroup}:${rule.runType}`;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  row.push(field.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

export type CsvPreviewRow = {
  line: number;
  input: UserInput;
  errors: string[];
};

const studentHeaders = ["student_number", "name", "email", "college", "class_name", "gender", "grade_level", "admission_year"];
const teacherHeaders = ["employee_id", "name", "email", "college", "initial_password"];

export function buildUserImportPreview(text: string, role: Exclude<UserRole, "admin">, users: AdminUser[], fallbackPassword = ""): CsvPreviewRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new AdminServiceError("VALIDATION", "CSV_EMPTY");
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const required = role === "teacher" ? teacherHeaders.slice(0, 3) : studentHeaders;
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) throw new AdminServiceError("VALIDATION", "CSV_HEADERS", { csv: missing.join(",") });
  const value = (cells: string[], key: string) => cells[headers.indexOf(key)]?.trim() ?? "";
  const preview: CsvPreviewRow[] = [];

  rows.slice(1).forEach((cells, rowIndex) => {
    const account = value(cells, role === "teacher" ? "employee_id" : "student_number");
    const password = value(cells, "initial_password") || fallbackPassword;
    const admissionYearValue = Number(value(cells, "admission_year"));
    const input: UserInput = {
      account,
      name: value(cells, "name"),
      email: value(cells, "email"),
      college: value(cells, "college"),
      role,
      status: "ACTIVE",
      initialPassword: role === "teacher" ? password : undefined,
      ...(role === "student" ? {
        className: value(cells, "class_name"),
        gender: value(cells, "gender") as UserInput["gender"],
        gradeLevel: value(cells, "grade_level") as UserInput["gradeLevel"],
        admissionYear: Number.isFinite(admissionYearValue) ? admissionYearValue : undefined,
      } : {}),
    };
    const errors: string[] = [];
    try {
      validateUserInput(input, [
        ...users,
        ...preview.filter((item) => item.errors.length === 0).map((item) => ({
          id: `preview-${item.line}`,
          account: item.input.account,
          email: item.input.email,
        } as AdminUser)),
      ]);
    } catch (error) {
      if (error instanceof AdminServiceError) errors.push(...Object.values(error.fieldErrors));
      else errors.push("FORM_INVALID");
    }
    preview.push({ line: rowIndex + 2, input, errors: [...new Set(errors)] });
  });
  return preview;
}

export function currentSemester(state: AdminState) {
  return state.semesters.find((semester) => semester.status === "current");
}

export function userDisplayAccountLabel(role: UserRole) {
  return role === "student" ? "student_number" : "employee_id";
}
