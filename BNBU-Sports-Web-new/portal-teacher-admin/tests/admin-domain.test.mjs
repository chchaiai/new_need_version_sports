import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GRADE_CORRECTION_TRANSITIONS,
  HELP_ARTICLE_TRANSITIONS,
  SEMESTER_TRANSITIONS,
  STUDENT_STATUSES,
  SYSTEM_MODES,
  USER_TRANSITIONS,
  buildUserImportPreview,
  migrateRemovedStudentAndSystemStates,
  parseCsv,
  validateEnduranceTable,
  validateSemesterInput,
} from "../app/admin-domain.ts";
import { createInitialAdminState } from "../app/admin-mock-data.ts";
import { AdminServiceError } from "../app/admin-types.ts";
import { HELP_CATEGORIES, helpCategoryLabel, parseHelpMarkdown } from "../app/help-content.tsx";
import {
  blockedSystemModeStatus,
  normalizeSystemModeProjection,
} from "../app/system-mode-service.ts";

function captureServiceError(operation) {
  try {
    operation();
  } catch (error) {
    assert.ok(error instanceof AdminServiceError);
    return error;
  }
  assert.fail("Expected an AdminServiceError");
}

test("the mock state uses role-specific student states and two system modes", () => {
  const state = createInitialAdminState();
  assert.equal(state.schemaVersion, 2);
  assert.equal(state.semesters.filter((semester) => semester.status === "current").length, 1);
  const students = state.users.filter((user) => user.role === "student");
  const staff = state.users.filter((user) => user.role !== "student");
  assert.deepEqual(STUDENT_STATUSES, ["ACTIVE", "PENDING"]);
  assert.ok(students.every((user) => STUDENT_STATUSES.includes(user.status)));
  assert.ok(students.some((user) => user.status === "PENDING"));
  assert.ok(staff.every((user) => ["ACTIVE", "DISABLED", "RECOVERY_REQUIRED"].includes(user.status)));
  assert.deepEqual(SYSTEM_MODES, ["NORMAL", "MAINTENANCE"]);
  assert.ok(SYSTEM_MODES.includes(state.systemMode.mode));
});

test("system availability opens only for an explicit NORMAL projection", () => {
  assert.deepEqual(normalizeSystemModeProjection({
    mode: "NORMAL",
    policyVersion: 5,
    updatedAt: "2026-08-31T00:00:00Z",
  }), {
    mode: "NORMAL",
    policyVersion: 5,
    updatedAt: "2026-08-31T00:00:00Z",
    checked: true,
  });
  assert.equal(normalizeSystemModeProjection({ mode: "MAINTENANCE" }).mode, "MAINTENANCE");
  assert.equal(normalizeSystemModeProjection({ mode: "READ_ONLY" }).mode, "MAINTENANCE");
  assert.equal(normalizeSystemModeProjection(undefined).mode, "MAINTENANCE");
  assert.equal(blockedSystemModeStatus().mode, "MAINTENANCE");
});

test("persisted preview state removes legacy student and read-only states", () => {
  const legacy = createInitialAdminState();
  legacy.users.find((user) => user.role === "student").status = "RECOVERY_REQUIRED";
  legacy.systemMode.mode = "READ_ONLY";
  legacy.auditLogs.unshift({
    id: "legacy-read-only",
    actorId: "admin-001",
    actorName: "系统管理员",
    action: "system_mode.change",
    resourceType: "system",
    resourceId: "global",
    requestId: "req_legacy",
    metadata: { before: "NORMAL", after: "READ_ONLY" },
    createdAt: "2026-08-30T00:00:00.000Z",
  });
  const migrated = migrateRemovedStudentAndSystemStates(legacy);
  assert.equal(migrated.changed, true);
  assert.ok(migrated.state.users.filter((user) => user.role === "student").every((user) => STUDENT_STATUSES.includes(user.status)));
  assert.equal(migrated.state.systemMode.mode, "NORMAL");
  assert.equal(migrated.state.auditLogs.some((entry) => entry.metadata.after === "READ_ONLY"), false);
});

test("help authoring categories and Markdown projection match student clients", () => {
  assert.deepEqual(HELP_CATEGORIES, [
    "login", "enrollment", "checkin", "evidence", "course", "exemption",
    "organization", "notification", "maintenance", "feedback",
  ]);
  assert.equal(helpCategoryLabel("zh", "checkin"), "打卡与学时");
  assert.equal(helpCategoryLabel("en", "checkin"), "Check-ins & credits");
  const blocks = parseHelpMarkdown("# 提交步骤\n\n1. **核对课程**\n2. 上传 `凭证`\n\n> 提交前检查");
  assert.deepEqual(blocks.map((block) => block.kind), ["heading", "list", "quote"]);

  const published = createInitialAdminState().helpArticles
    .filter((article) => article.status === "published")
    .sort((left, right) => right.sortWeight - left.sortWeight);
  assert.deepEqual(published.map((article) => article.id), ["HA-001", "HA-006", "HA-002", "HA-003"]);
  assert.deepEqual(published.map((article) => article.category), ["checkin", "enrollment", "login", "exemption"]);
});

test("the new endurance tables use one point per three-second band", () => {
  const state = createInitialAdminState();
  assert.equal(state.enduranceRules.length, 404);
  const rules = state.enduranceRules
    .filter((rule) => rule.gender === "male" && rule.gradeGroup === "freshman_sophomore")
    .sort((left, right) => left.minSeconds - right.minSeconds);

  assert.equal(rules.length, 101);
  assert.deepEqual(
    rules.slice(0, 11).map(({ minSeconds, maxSeconds, score, tier, note }) => ({ minSeconds, maxSeconds, score, tier, note })),
    [
      { minSeconds: 0, maxSeconds: 239, score: 100, tier: "excellent", note: "国家学生体质健康标准满分区间" },
      { minSeconds: 240, maxSeconds: 242, score: 99, tier: "excellent", note: "" },
      { minSeconds: 243, maxSeconds: 245, score: 98, tier: "excellent", note: "" },
      { minSeconds: 246, maxSeconds: 248, score: 97, tier: "excellent", note: "" },
      { minSeconds: 249, maxSeconds: 251, score: 96, tier: "excellent", note: "" },
      { minSeconds: 252, maxSeconds: 254, score: 95, tier: "excellent", note: "" },
      { minSeconds: 255, maxSeconds: 257, score: 94, tier: "good", note: "" },
      { minSeconds: 258, maxSeconds: 260, score: 93, tier: "good", note: "" },
      { minSeconds: 261, maxSeconds: 263, score: 92, tier: "good", note: "" },
      { minSeconds: 264, maxSeconds: 266, score: 91, tier: "pass", note: "" },
      { minSeconds: 267, maxSeconds: 269, score: 90, tier: "pass", note: "" },
    ],
  );
  assert.deepEqual(validateEnduranceTable(rules), []);
  assert.deepEqual(
    { minSeconds: rules.at(-1).minSeconds, maxSeconds: rules.at(-1).maxSeconds, score: rules.at(-1).score, tier: rules.at(-1).tier },
    { minSeconds: 537, maxSeconds: 600, score: 0, tier: "fail" },
  );
});

test("business state machines expose only documented transitions", () => {
  assert.deepEqual(SEMESTER_TRANSITIONS, {
    upcoming: ["current"],
    current: ["archived"],
    archived: [],
  });
  assert.deepEqual(USER_TRANSITIONS.ACTIVE, ["PENDING", "DISABLED", "RECOVERY_REQUIRED"]);
  assert.deepEqual(USER_TRANSITIONS.PENDING, ["ACTIVE"]);
  assert.deepEqual(HELP_ARTICLE_TRANSITIONS, {
    draft: ["published"],
    published: ["archived"],
    archived: ["published"],
  });
  assert.deepEqual(GRADE_CORRECTION_TRANSITIONS.pending, ["approved", "rejected"]);
  assert.deepEqual(GRADE_CORRECTION_TRANSITIONS.corrected, ["closed"]);
});

test("semester validation rejects invalid years, reversed dates, and duplicate terms", () => {
  const state = createInitialAdminState();
  const error = captureServiceError(() => validateSemesterInput({
    name: "重复学期",
    academicYear: state.semesters[0].academicYear,
    term: state.semesters[0].term,
    startDate: "2026-09-10",
    endDate: "2026-09-01",
  }, state.semesters));
  assert.equal(error.fieldErrors.endDate, "DATE_ORDER");
  assert.equal(error.fieldErrors.term, "SEMESTER_DUPLICATE");

  const yearError = captureServiceError(() => validateSemesterInput({
    name: "Test",
    academicYear: "2026-2028",
    term: "summer",
    startDate: "2026-07-01",
    endDate: "2026-08-01",
  }, []));
  assert.equal(yearError.fieldErrors.academicYear, "ACADEMIC_YEAR_FORMAT");
});

test("CSV parsing preserves quoted commas and import preview catches duplicates atomically", () => {
  assert.deepEqual(parseCsv('id,name,note\r\n1,"Doe, Jane","said ""hello"""'), [
    ["id", "name", "note"],
    ["1", "Doe, Jane", 'said "hello"'],
  ]);

  const csv = [
    "employee_id,name,email,college,initial_password",
    "T2026991,Teacher One,teacher.one@example.edu,体育部,Temp2026!",
    "T2026991,Teacher Two,teacher.two@example.edu,体育部,Temp2026!",
  ].join("\n");
  const preview = buildUserImportPreview(csv, "teacher", []);
  assert.equal(preview.length, 2);
  assert.deepEqual(preview[0].errors, []);
  assert.ok(preview[1].errors.includes("ACCOUNT_DUPLICATE"));
});

test("endurance tables detect gaps and overlaps while accepting continuous ranges", () => {
  const base = {
    gender: "male",
    gradeGroup: "freshman_sophomore",
    runType: "1000m",
    tier: "pass",
    note: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const rule = (id, minSeconds, maxSeconds, score) => ({ ...base, id, minSeconds, maxSeconds, score });

  assert.deepEqual(validateEnduranceTable([rule("a", 0, 299, 100), rule("b", 300, 399, 80)]), []);
  assert.ok(validateEnduranceTable([rule("a", 0, 299, 100), rule("b", 301, 399, 80)]).some((issue) => issue.type === "gap"));
  assert.ok(validateEnduranceTable([rule("a", 0, 299, 100), rule("b", 299, 399, 80)]).some((issue) => issue.type === "overlap"));
});

test("real admin mutations preserve UserFacingError details while demo errors stay local", async () => {
  const source = await readFile(
    new URL("../app/admin-store.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /failure instanceof AdminServiceError[\s\S]*userFacingError: null/u);
  assert.match(source, /const userFacingError = toUserFacingError\(failure, locale\)/u);
  assert.match(source, /userFacingError\.requestId[\s\S]*"Diagnostic reference" : "诊断编号"/u);
  assert.doesNotMatch(source, /const message = adminErrorCopy\(locale, "OPERATION_FAILED"\)/u);
});
