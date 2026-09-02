import assert from "node:assert/strict";
import test from "node:test";

import { setApiRequestMode } from "../app/api-client.ts";
import {
  rosterReconciliationService,
} from "../app/roster-reconciliation-api-service.ts";
import {
  clearMockRosterReconciliationCache,
  rosterMockService,
} from "../app/roster-reconciliation-mock-service.ts";
import {
  ROSTER_IMPORT_FIELDS,
  RosterReconciliationStatus,
  RosterResolutionStatus,
} from "../app/roster-reconciliation-types.ts";

const courses = [
  {
    id: "demo-section-pe101-01",
    code: "demo-section-pe101-01",
    name: "大学体育（一）",
    teachingClassCode: "demo-section-pe101-01",
  },
  {
    id: "demo-section-badminton-02",
    code: "demo-section-badminton-02",
    name: "羽毛球基础",
    teachingClassCode: "demo-section-badminton-02",
  },
];

const platformMembers = [
  {
    id: "demo-enrollment-a",
    studentId: "demo-student-a",
    courseId: courses[0].id,
    studentNumber: "TEST2026001",
    name: "测试学生甲",
    gender: "女",
    grade: "2026级",
    joinedAt: "2026-08-24T09:10:00+08:00",
    joinMethod: "QR_CODE",
  },
  {
    id: "demo-enrollment-b",
    studentId: "demo-student-b",
    courseId: courses[0].id,
    studentNumber: "TEST2026002",
    name: "测试学生乙",
    gender: "男",
    grade: "2026级",
    joinedAt: "2026-08-24T10:22:00+08:00",
    joinMethod: "QR_CODE",
  },
  {
    id: "demo-enrollment-c",
    studentId: "demo-student-c",
    courseId: courses[0].id,
    studentNumber: "TEST2026003",
    name: "测试学生丙",
    gender: "其他",
    grade: "2026级",
    joinedAt: "2026-08-25T08:45:00+08:00",
    joinMethod: "IMPORT",
  },
  {
    id: "demo-enrollment-d",
    studentId: "demo-student-d",
    courseId: courses[1].id,
    studentNumber: "TEST2026004",
    name: "测试学生丁",
    gender: "未知",
    grade: "2025级",
    joinedAt: "2026-08-24T14:18:00+08:00",
    joinMethod: "QR_CODE",
  },
];

test("Mock 名单服务可以生成完整对齐结果并保留处理状态", async () => {
  clearMockRosterReconciliationCache();
  const context = {
    course: courses[0],
    courses,
    platformMembers,
  };

  const seeded = await rosterMockService.getBundle(courses[0].id, context);
  assert.equal(seeded.currentRoster?.version.versionNumber, 1);
  assert.equal(seeded.results.length, 0);

  const aligned = await rosterMockService.reconcile(context);
  assert.deepEqual(
    new Set(aligned.results.map((result) => result.status)),
    new Set([
      RosterReconciliationStatus.MATCHED,
      RosterReconciliationStatus.MISSING_IN_PLATFORM,
      RosterReconciliationStatus.EXTRA_IN_PLATFORM,
      RosterReconciliationStatus.WRONG_COURSE,
      RosterReconciliationStatus.IDENTITY_CONFLICT,
    ]),
  );
  assert.equal(aligned.stats.officialTotal, 4);
  assert.equal(aligned.stats.platformTotal, 3);
  assert.equal(aligned.stats.matched, 1);
  assert.equal(aligned.stats.notJoined, 1);
  assert.equal(aligned.stats.wrongCourse, 1);
  assert.equal(aligned.stats.otherExceptions, 2);

  const target = aligned.results.find(
    (result) => result.status === RosterReconciliationStatus.WRONG_COURSE,
  );
  assert.ok(target);
  const updated = await rosterMockService.updateResolution(
    courses[0].id,
    [target.id],
    RosterResolutionStatus.CONFIRMED,
    "Mock 演示：已与教务名单核实。",
  );
  const resolved = updated.results.find((result) => result.id === target.id);
  assert.equal(resolved?.resolutionStatus, RosterResolutionStatus.CONFIRMED);
  assert.equal(resolved?.teacherNote, "Mock 演示：已与教务名单核实。");
  assert.equal(resolved?.version, target.version + 1);
});

test("Mock 名单导入创建本地版本并自动运行一次核对", async () => {
  clearMockRosterReconciliationCache();
  const course = {
    id: "demo-custom-course",
    code: "demo-custom-course",
    name: "教师自定义课程",
    teachingClassCode: "demo-custom-course",
  };
  const context = {
    course,
    courses: [...courses, course],
    platformMembers: [
      {
        id: "demo-custom-enrollment",
        studentId: "demo-custom-student",
        courseId: course.id,
        studentNumber: "00001234",
        name: "导入测试学生",
        gender: "女",
        grade: "2026级",
        joinedAt: "2026-08-29T08:00:00+08:00",
        joinMethod: "IMPORT",
      },
    ],
  };
  await rosterMockService.getBundle(course.id, context);
  const suggestedMapping = Object.fromEntries(
    ROSTER_IMPORT_FIELDS.map((field) => [field, null]),
  );
  const parsed = {
    fileName: "教师自定义课程名单.csv",
    headers: ["学号", "姓名", "性别", "年级"],
    rows: [
      {
        学号: "00001234",
        姓名: "导入测试学生",
        性别: "女",
        年级: "2026级",
      },
    ],
    previewRows: [],
    suggestedMapping,
    sheetName: "名单",
    totalRows: 1,
  };
  const imported = await rosterMockService.importOfficialRoster({
    course,
    parsed,
    mapping: {
      ...suggestedMapping,
      studentNumber: "学号",
      fullName: "姓名",
      gender: "性别",
      gradeYear: "年级",
    },
  });

  assert.equal(imported.currentRoster?.version.versionNumber, 1);
  assert.equal(imported.currentRoster?.students[0].studentNumber, "00001234");
  assert.equal(imported.results.length, 1);
  assert.equal(imported.results[0].status, RosterReconciliationStatus.MATCHED);
});

test("模式路由只在 Mock 预览中选择本地名单服务", async () => {
  clearMockRosterReconciliationCache();
  setApiRequestMode("demo");
  try {
    const bundle = await rosterReconciliationService.getBundle(
      courses[1].id,
      {
        course: courses[1],
        courses,
        platformMembers,
      },
    );
    assert.equal(bundle.currentRoster?.version.courseId, courses[1].id);
  } finally {
    setApiRequestMode("real");
  }
});
