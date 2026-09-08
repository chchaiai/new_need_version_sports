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
  ["student missing name", (p) => delete p.student.name],
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

test("generated runtime artifact works as a native browser module without dynamic compilation", async () => {
  const code = readFileSync(new URL("../../frontend/student/js/contract/validators.generated.js", import.meta.url), "utf8");
  assert.doesNotMatch(code, /\beval\s*\(|new Function\s*\(/);
  const module = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
  assert.equal(module.validateExerciseRecord(recordWithReview()), true);
});
