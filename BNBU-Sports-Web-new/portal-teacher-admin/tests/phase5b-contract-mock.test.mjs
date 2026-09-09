import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PHASE5B_CONTRACT,
  adminCurrentCourseDirectory,
  adminDashboard,
  appendReviewRequest,
  courseProgressPage,
  dependencyError,
  emptyAdminCurrentCourseDirectory,
  emptyCourseProgressPage,
  emptyExerciseRecordPage,
  emptyTeacherCoursePage,
  exerciseRecord,
  phase5bFixtures,
} from "../app/phase5b-contract-fixtures.ts";

test("Phase 5B fixtures pin the root RC Contract version and SHA", () => {
  assert.deepEqual(PHASE5B_CONTRACT, {
    version: "1.4.0-contract",
    status: "RC",
    publicBasePath: "/api/v1",
    openapiSha256: "0528389bb8b72714d9a4af35ffc66c87503560d41c58ad968b1713b39ff3da2d",
  });
});

test("Phase 5B Mock payloads do not restore legacy Web DTO fields", () => {
  const serialized = JSON.stringify(phase5bFixtures);
  for (const forbidden of [
    "creditedDurationSeconds",
    "courseCode",
    "teachingClassNumber",
    "reviewStatus",
    "resubmission",
    "creditedMinutes",
    "studentVisibleReason",
    "finalGrade",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `unexpected legacy field: ${forbidden}`);
  }
});

test("teacher Record keeps actual duration, review stage, and material version separate", () => {
  assert.equal(exerciseRecord.actualDurationSeconds, 4020);
  assert.equal(exerciseRecord.currentReview.result, "VALID");
  assert.equal(exerciseRecord.currentReview.processingStage, "VALID");
  assert.equal(exerciseRecord.currentMaterial.materialVersionId, exerciseRecord.currentReview.materialVersionId);
  assert.deepEqual(Object.keys(appendReviewRequest).sort(), [
    "action",
    "expectedRoundNo",
    "expectedVersion",
    "materialVersionId",
    "publicComment",
    "reasonCode",
  ]);
});

test("content and empty states use the Contract page shapes without synthetic rows", () => {
  assert.equal(adminCurrentCourseDirectory.items.length, 1);
  assert.equal(courseProgressPage.items.length, 1);
  assert.deepEqual(emptyTeacherCoursePage.items, []);
  assert.deepEqual(emptyExerciseRecordPage.items, []);
  assert.deepEqual(emptyCourseProgressPage.items, []);
  assert.deepEqual(emptyAdminCurrentCourseDirectory.items, []);
  assert.equal(emptyAdminCurrentCourseDirectory.summary.currentCourseCount, 0);
});

test("administrator health renders explicit states and preserves unavailable measurements as null", () => {
  assert.deepEqual(adminDashboard.health.map((item) => item.component), [
    "API",
    "DATABASE",
    "NOTIFICATION_CENTER",
    "OBJECT_STORAGE",
    "MEDIA_STORAGE",
  ]);
  const media = adminDashboard.health.find((item) => item.component === "MEDIA_STORAGE");
  assert.equal(media?.status, "NOT_CONFIGURED");
  assert.equal(media?.latencyMilliseconds, null);
  assert.equal(media?.backlogCount, null);
});

test("error fixtures use only the ErrorEnvelope fields", () => {
  assert.deepEqual(Object.keys(dependencyError).sort(), ["code", "details", "message", "requestId"]);
  assert.equal(dependencyError.code, "DEPENDENCY_UNAVAILABLE");
  assert.equal(dependencyError.details, null);
});

test("the preview names the record surface as post-submit review and never renders tokens", async () => {
  const source = await readFile(new URL("../app/phase5b-contract-mock.tsx", import.meta.url), "utf8");
  assert.match(source, /打卡复核列表与详情/);
  assert.match(source, /不新增 PENDING\/待审核业务状态/);
  assert.doesNotMatch(source, /response\.accessToken|response\.refreshToken/);
  assert.match(source, /Mock 通过不等于 Backend、鉴权、Staging 或发布通过/);
});
