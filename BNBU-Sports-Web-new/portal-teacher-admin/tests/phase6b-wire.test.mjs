import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { publishedCases, publishedFixture, recordWithReview, studentCourseFixture } from "../../frontend/student/phase6b-test-fixtures.mjs";
import { assertContractWire } from "../../frontend/student/js/contract/wire.js";
import { mapServerRecord, mapStudentProgressProjection } from "../../frontend/student/js/api.js";
import { mapContractCourseTargets, selectContractStudentProgress } from "../../frontend/student/js/phase6b-contract-mapper.js";
import { reviewStageFromRecord } from "../../frontend/student/js/v81-review.js";
import { mapExerciseRecordToCheckin } from "../app/teacher-data.ts";

const schemas = new Set(["ExerciseRecord", "RecordReviewSummary", "PublicReviewReason", "StudentCourseProgress", "StudentCourse"]);
const isWireError = (error) => error.name === "ContractWireValidationError" && error.issues.length > 0;
for (const row of publishedCases.filter((item) => schemas.has(item.schema))) {
  test("published Contract case: " + row.name, () => {
    const input = structuredClone(row.payload), before = JSON.stringify(input);
    if (row.expectedValid) assert.equal(assertContractWire(row.schema, input), input);
    else assert.throws(() => assertContractWire(row.schema, input), isWireError);
    assert.equal(JSON.stringify(input), before, "validation cannot change the payload");
  });
}

const mutations = [
  ["missing recordId", (p) => delete p.recordId],
  ["missing courseId", (p) => delete p.courseId],
  ["missing student", (p) => delete p.student],
  ["missing currentMaterial", (p) => delete p.currentMaterial],
  ["string duration", (p) => p.actualDurationSeconds = "1800"],
  ["negative duration", (p) => p.actualDurationSeconds = -1],
  ["fractional duration", (p) => p.actualDurationSeconds = 1.5],
  ["null duration", (p) => p.actualDurationSeconds = null],
  ["unknown category", (p) => p.category = "BOGUS"],
  ["trimmed category", (p) => p.category = " COURSE_RELATED "],
  ["bad date", (p) => p.businessDate = "2026-02-30"],
  ["invalid leap date", (p) => p.submittedAt = "2025-02-29T00:00:00Z"],
  ["non-UTC time", (p) => p.submittedAt = "2026-09-07T10:00:00+08:00"],
  ["unknown top-level field", (p) => p.extra = true],
  ["unknown nested field", (p) => p.currentReview.extra = true],
  ["empty material", (p) => p.currentMaterial = {}],
  ["student missing name", (p) => delete p.student.student.name],
  ["missing result", (p) => delete p.currentReview.result],
  ["empty result", (p) => p.currentReview.result = ""],
  ["pending but valid", (p) => p.currentReview.processingStage = "SYSTEM_CHECK_PENDING"],
  ["final but null", (p) => p.currentReview.result = null],
  ["invalid without public reason", (p) => { p.currentReview.result = "INVALID"; p.currentReview.processingStage = "INVALID"; }],
];
for (const [name, mutate] of mutations) {
  test("both consumers reject " + name, () => {
    const value = recordWithReview();
    assertContractWire("ExerciseRecord", value);
    mutate(value);
    const before = JSON.stringify(value);
    assert.throws(() => mapServerRecord(value), isWireError);
    assert.throws(() => mapExerciseRecordToCheckin(value), isWireError);
    assert.equal(JSON.stringify(value), before);
  });
}

for (const name of ["pending_material", "teacher_round1", "await_supplement", "round2", "valid"]) {
  test("both consumers preserve published review branch " + name, () => {
    const value = recordWithReview("prior-workflow/review/" + name);
    assertContractWire("ExerciseRecord", value);
    const student = mapServerRecord(value);
    const portal = mapExerciseRecordToCheckin(value);
    assert.equal(student.reviewResult, value.currentReview.result);
    assert.equal(portal.auditStatus, value.currentReview.result === "VALID" ? "valid" : "processing");
    assert.equal(portal.creditedMinutes, null);
    assert.notEqual(reviewStageFromRecord(student).zh, "审核阶段暂不可用");
  });
}
for (const stage of ["SYSTEM_CHECK_PENDING", "AI_REVIEW_PENDING", "TECHNICAL_PROCESSING"]) {
  test("nonterminal review stage " + stage, () => {
    const value = recordWithReview("prior-workflow/review/teacher_round1");
    value.currentReview.processingStage = stage;
    value.currentReview.teacherSla = null;
    assertContractWire("ExerciseRecord", value);
    assert.equal(mapExerciseRecordToCheckin(value).auditStatus, "processing");
    assert.notEqual(reviewStageFromRecord(mapServerRecord(value)).zh, "审核阶段暂不可用");
  });
}

test("progress and course input boundaries reject incomplete DTOs instead of defaulting", () => {
  const progress = publishedFixture("prior-courses/progress/current");
  const projected = mapStudentProgressProjection(progress);
  assert.equal(projected.course, 10);
  assert.equal(projected.general, 599 / 60);
  assert.equal(projected.targetMet, false);
  assert.equal(projected.displayPercent, 100);
  for (const key of ["observedAt", "checkpoint", "state"]) {
    const bad = structuredClone(progress); delete bad[key];
    assert.throws(() => mapStudentProgressProjection(bad), isWireError);
    assert.throws(() => selectContractStudentProgress([bad], progress.enrollmentId, progress.courseId), isWireError);
  }
  const course = studentCourseFixture();
  assertContractWire("StudentCourse", course);
  assert.equal(mapContractCourseTargets(course).total, 20);
  delete course.publishedRule;
  assert.throws(() => mapContractCourseTargets(course), isWireError);
});

const progressMutations = [
  ["checkpoint enrollment differs", (p) => p.checkpoint.enrollmentId = "00000000-0000-4000-8000-000000000002"],
  ["checkpoint course differs", (p) => p.checkpoint.courseId = "00000000-0000-4000-8000-000000000002"],
  ["remaining minutes contradict completion", (p) => p.checkpoint.totals.categories[1].remainingMinutes = 2],
  ["category sources contradict completion", (p) => p.checkpoint.totals.categories[0].countedRecordMinutes = 29],
  ["completed total contradicts categories", (p) => p.checkpoint.totals.totalCompletedMinutes = 1198],
  ["record total contradicts categories", (p) => p.checkpoint.totals.countedRecordMinutes = 29],
  ["certification total contradicts categories", (p) => p.checkpoint.totals.countedCertificationMinutes = 1168],
  ["category targets do not total 1200", (p) => {
    p.checkpoint.totals.categories[1].targetMinutes = 601;
    p.checkpoint.totals.categories[1].remainingMinutes = 2;
  }],
];
for (const state of ["CURRENT", "RECOMPUTING"]) {
  for (const [name, mutate] of progressMutations) {
    test(`progress ${state} rejects inconsistent input: ${name}`, () => {
      const value = publishedFixture(state === "CURRENT"
        ? "prior-courses/progress/current" : "prior-courses/progress/recomputing_old_checkpoint");
      mutate(value);
      const before = JSON.stringify(value);
      // These fields are individually schema-valid; their relationship is invalid.
      assertContractWire("StudentCourseProgress", value);
      const isConsistencyError = (error) => error.name === "ContractProgressConsistencyError" &&
        error.message.startsWith("CONTRACT_PROGRESS_INCONSISTENT:");
      assert.throws(() => mapStudentProgressProjection(value), isConsistencyError);
      assert.throws(() => selectContractStudentProgress([value], value.enrollmentId, value.courseId), isConsistencyError);
      assert.equal(JSON.stringify(value), before, "reject without correcting or replacing input values");
    });
  }
}

test("consistent 1200-minute progress remains qualified", () => {
  const value = publishedFixture("prior-courses/progress/current");
  const totals = value.checkpoint.totals;
  Object.assign(totals.categories[1], {
    activeCertificationMinutes: 600, countedCertificationMinutes: 600,
    cappedCompletedMinutes: 600, remainingMinutes: 0,
  });
  Object.assign(totals, {
    totalCompletedMinutes: 1200, completionRatio: 1, targetMet: true, countedCertificationMinutes: 1170,
  });
  const before = JSON.stringify(value);
  const result = mapStudentProgressProjection(value);
  assert.equal(result.targetMet, true);
  assert.equal(result.totalValidHours, 20);
  assert.equal(result.qualificationStatus, "QUALIFIED");
  assert.equal(selectContractStudentProgress([value], value.enrollmentId, value.courseId), value);
  assert.equal(JSON.stringify(value), before);
});

test("consistent progress accepts either category order and equivalent UUID casing", () => {
  const value = publishedFixture("prior-courses/progress/current");
  value.courseId = "abcdef01-0000-4000-8000-000000000001";
  value.enrollmentId = "abcdef02-0000-4000-8000-000000000001";
  value.checkpoint.courseId = value.courseId.toUpperCase();
  value.checkpoint.enrollmentId = value.enrollmentId.toUpperCase();
  value.checkpoint.totals.categories.reverse();
  const before = JSON.stringify(value);
  const result = mapStudentProgressProjection(value);
  assert.equal(result.course, 10);
  assert.equal(result.general, 599 / 60);
  assert.equal(result.displayPercent, 100);
  assert.equal(result.targetMet, false);
  assert.equal(selectContractStudentProgress([value], value.enrollmentId, value.courseId), value);
  assert.equal(JSON.stringify(value), before);
});

for (const [state, hasCheckpoint] of [["RECOMPUTING", true], ["RECOMPUTING", false], ["UNAVAILABLE", false]]) {
  test(`consistent ${state}, checkpoint=${hasCheckpoint}, preserves unavailable presentation`, () => {
    const value = publishedFixture(state === "UNAVAILABLE"
      ? "prior-courses/progress/no_zero_fallback" : "prior-courses/progress/recomputing_old_checkpoint");
    if (!hasCheckpoint) value.checkpoint = null;
    const before = JSON.stringify(value);
    const result = mapStudentProgressProjection(value);
    assert.equal(result.contractState, state);
    assert.equal(result.scoreAvailable, false);
    assert.equal(result.totalValidHours, null);
    assert.equal(result.targetMet, null);
    assert.equal(result.progressRecomputing, state === "RECOMPUTING");
    assert.equal(selectContractStudentProgress([value], value.enrollmentId, value.courseId), value);
    assert.equal(JSON.stringify(value), before);
  });
}

test("generated runtime artifact works as a native browser module without dynamic compilation", async () => {
  const code = readFileSync(new URL("../../frontend/student/js/contract/validators.generated.js", import.meta.url), "utf8");
  assert.doesNotMatch(code, /\beval\s*\(|new Function\s*\(/);
  const module = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
  assert.equal(module.validateExerciseRecord(recordWithReview()), true);
});
