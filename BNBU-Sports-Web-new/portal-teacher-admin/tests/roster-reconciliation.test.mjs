import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ROSTER_API_PATHS,
  deriveStats,
  mapAlignmentResult,
  mapRosterEntry,
} from "../app/roster-reconciliation-projection.ts";
import { parseRosterFile, validateRosterImport } from "../app/roster-import.ts";
import {
  ROSTER_IMPORT_FIELDS,
  RosterReconciliationStatus,
  RosterResolutionStatus,
} from "../app/roster-reconciliation-types.ts";

const course1 = { id: "1", code: "PE101", name: "大学体育（一）", teachingClassCode: "01班" };

function official(id, courseId, studentNumber, name, extra = {}) {
  return { id, courseId, studentNumber, name, ...extra };
}

function member(id, courseId, studentNumber, name, extra = {}) {
  return { id, courseId, studentNumber, name, joinedAt: "2026-08-02T08:00:00+08:00", joinMethod: "QR_CODE", ...extra };
}

test("maps every authoritative Backend reconciliation status without reclassifying it in the browser", () => {
  const officialStudents = new Map([
    [
      "o1",
      mapRosterEntry(
        {
          id: "o1",
          classSectionId: "1",
          studentNumber: "000123",
          fullName: "Alice",
          gender: "FEMALE",
          gradeYear: 2025,
          collegeName: "School",
          majorName: "Major",
          administrativeClassName: "Class 1",
          sourceRowNumber: 2,
        },
        course1,
      ),
    ],
  ]);
  const platformMembers = [
    member("p1", "1", "000123", "Alice", { studentId: "student-1" }),
  ];
  const backendStatuses = Object.values(RosterReconciliationStatus);
  const results = backendStatuses.map((status, index) =>
    mapAlignmentResult(
      {
        id: `result-${index}`,
        classSectionId: "1",
        rosterEntryId: index === 2 ? null : "o1",
        enrollmentId: index === 1 ? null : "p1",
        studentId: index === 1 ? null : "student-1",
        status,
        differences:
          status === RosterReconciliationStatus.IDENTITY_CONFLICT
            ? [{ field: "FULL_NAME", officialValue: "Alice", platformValue: "Alicia" }]
            : [],
        resolutionStatus: RosterResolutionStatus.PENDING,
        resolutionNote: null,
        createdAt: `2026-08-02T10:00:0${index}.000Z`,
        version: 1,
        lastResolutionAction: null,
      },
      officialStudents,
      platformMembers,
    ),
  );

  assert.deepEqual(results.map((result) => result.status), backendStatuses);
  assert.equal(results[0].officialStudent.studentNumber, "000123");
  assert.equal(results[0].officialStudent.name, "Alice");
  assert.equal(results[0].platformMember.id, "p1");
  assert.equal(
    results.find((result) => result.status === RosterReconciliationStatus.IDENTITY_CONFLICT).differences[0].field,
    "FULL_NAME",
  );
  assert.ok(results.every((result) => result.reason.startsWith("后端核对结果：")));
});

test("uses the latest server resolution version and note instead of browser-persisted state", () => {
  const raw = {
    id: "result-1",
    classSectionId: "1",
    rosterEntryId: null,
    enrollmentId: null,
    studentId: null,
    status: RosterReconciliationStatus.MISSING_IN_PLATFORM,
    differences: [],
    createdAt: "2026-08-02T10:00:00.000Z",
    lastResolutionAction: "CONFIRM",
  };
  const first = mapAlignmentResult(
    { ...raw, resolutionStatus: RosterResolutionStatus.PENDING, resolutionNote: null, version: 1 },
    new Map(),
    [],
  );
  const latest = mapAlignmentResult(
    {
      ...raw,
      resolutionStatus: RosterResolutionStatus.CONFIRMED,
      resolutionNote: "Confirmed by registrar",
      version: 2,
    },
    new Map(),
    [],
  );

  assert.equal(first.teacherNote, undefined);
  assert.equal(latest.resolutionStatus, RosterResolutionStatus.CONFIRMED);
  assert.equal(latest.teacherNote, "Confirmed by registrar");
  assert.equal(latest.version, 2);
});

test("student numbers remain strings with leading zeros and duplicate rows are excluded", () => {
  const headers = ["学号", "姓名"];
  const parsed = {
    fileName: "roster.csv",
    headers,
    rows: [
      { 学号: "000123", 姓名: "A" },
      { 学号: "A-002", 姓名: "B" },
      { 学号: "000123", 姓名: "A" },
    ],
    previewRows: [],
    suggestedMapping: Object.fromEntries(ROSTER_IMPORT_FIELDS.map((field) => [field, null])),
    sheetName: "Sheet1",
    totalRows: 3,
  };
  const mapping = { ...parsed.suggestedMapping, studentNumber: "学号", fullName: "姓名" };
  const validation = validateRosterImport(parsed, mapping);

  assert.equal(validation.validRows, 1);
  assert.equal(validation.students[0].studentNumber, "A-002");
  assert.ok(validation.errors.some((error) => error.code === "DUPLICATE_STUDENT_NUMBER"));
});

test("the import adapter parses xlsx, legacy xls, and csv rosters", async () => {
  const XLSX = await import("xlsx");
  const cptable = await import("xlsx/dist/cpexcel.full.mjs");
  XLSX.set_cptable(cptable);
  for (const extension of ["xlsx", "xls", "csv"]) {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["学号", "姓名", "年级"],
      ["000123", "测试学生", "2025级"],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "名单");
    const bytes = XLSX.write(workbook, { type: "buffer", bookType: extension });
    const file = new File([bytes], `roster.${extension}`);
    const parsed = await parseRosterFile(file);

    assert.equal(parsed.totalRows, 1);
    assert.equal(parsed.suggestedMapping.studentNumber, "学号");
    assert.equal(parsed.rows[0].学号, "000123");
  }
});

test("statistics keep official members, platform members, and resolution state separate", () => {
  const members = [member("p1", "1", "001", "A")];
  const currentRoster = {
    version: {
      id: "import-1",
      courseId: "1",
      versionNumber: 1,
      importedAt: "2026-08-02T09:00:00.000Z",
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      duplicatedRows: 0,
      isCurrent: true,
      source: "FILE",
      status: "VALIDATED",
      version: 1,
    },
    students: [official("o1", "1", "001", "A"), official("o2", "1", "002", "B")],
  };
  const results = [
    {
      status: RosterReconciliationStatus.MATCHED,
      resolutionStatus: RosterResolutionStatus.PENDING,
      updatedAt: "2026-08-02T10:00:00.000Z",
    },
    {
      status: RosterReconciliationStatus.MISSING_IN_PLATFORM,
      resolutionStatus: RosterResolutionStatus.PENDING,
      updatedAt: "2026-08-02T10:00:01.000Z",
    },
  ];
  const stats = deriveStats(currentRoster, results, members, "1");

  assert.equal(stats.officialTotal, 2);
  assert.equal(stats.platformTotal, 1);
  assert.equal(stats.matched, 1);
  assert.equal(stats.notJoined, 1);
  assert.equal(stats.pending, 2);
  assert.equal(stats.lastReconciledAt, "2026-08-02T10:00:01.000Z");
});

test("teacher roster flow keeps authoritative API and synthetic Mock adapters separated", async () => {
  const [workspace, page, apiService, mock, mockService] = await Promise.all([
    readFile(new URL("../app/teacher-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/roster-reconciliation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/roster-reconciliation-api-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/roster-reconciliation-mock-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/roster-reconciliation-mock-service.ts", import.meta.url), "utf8"),
  ]);

  assert.match(workspace, /course-roster-reconciliation-button/);
  assert.match(workspace, /RosterReconciliationPage/);
  assert.match(page, /rosterReconciliationService/);
  assert.match(page, /parseOfficialRosterFile/);
  assert.match(page, /validateOfficialRosterFile/);
  assert.match(page, /rosterReconciliationService\.importOfficialRoster/);
  assert.match(page, /rosterReconciliationService\.reconcile/);
  assert.match(page, /rosterReconciliationService\.updateResolution/);
  assert.doesNotMatch(page, /roster-reconciliation-mock-data/);
  assert.match(apiService, /ROSTER_API_PATHS/);
  assert.match(apiService, /requestFormData<ApiRosterImport>/);
  assert.match(apiService, /expectedRosterImportVersion: current\.version/);
  assert.match(apiService, /expectedVersion: result\.version/);
  assert.match(apiService, /currentOnly: "true"/);
  assert.match(apiService, /currentApiRequestMode\(\) === "demo"/);
  assert.match(apiService, /rosterMockService/);
  assert.doesNotMatch(
    [page, apiService].join("\n"),
    /localStorage|sessionStorage|createInitialRosterSnapshots|reconcileRosters/,
  );
  assert.match(mock, /Synthetic roster snapshots/);
  assert.match(mock, /TEST2026001/);
  assert.match(mockService, /sessionStorage/);
  assert.match(mockService, /reconcileMockRosters/);
});

test("encodes every roster API identifier before building the API path", () => {
  assert.equal(
    ROSTER_API_PATHS.rosterVersions("section/1"),
    "/class-sections/section%2F1/roster-imports",
  );
  assert.equal(
    ROSTER_API_PATHS.rosterEntries("import/1"),
    "/roster-imports/import%2F1/entries",
  );
  assert.equal(
    ROSTER_API_PATHS.confirm("result/1"),
    "/roster-alignment-results/result%2F1/confirm",
  );
});
