import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  applyAttendanceAuditState,
  deriveAuditSummary,
  toCreditedDurationHours,
} from "../app/checkin-audit.ts";
import {
  createInvalidToValidReviewOperation,
  mapExerciseRecordToCheckin,
  ReviewProjectionConsistencyError,
  ReviewTransitionConsistencyError,
  transitionInvalidExerciseReviewToValid,
  tryAcquireReviewTransitionLock,
} from "../app/teacher-data.ts";

const record = (auditStatus, creditedMinutes) => ({ auditStatus, creditedMinutes });

function reviewApiMock(recordId, state, onValid) {
  const calls = [];
  return {
    calls,
    fetch: async (input, init = {}) => {
      const url = String(input);
      const method = init.method ?? "GET";
      const call = { url, method, headers: init.headers ?? {}, body: init.body };
      calls.push(call);
      if (method === "GET" && url.endsWith(`/exercise-records/${recordId}`)) {
        return Response.json({
          data: { id: recordId, status: state.recordStatus, version: state.recordVersion },
          meta: {},
        });
      }
      if (method === "GET" && url.includes(`/exercise-records/${recordId}/reviews?`)) {
        return Response.json({
          data: state.reviewResult
            ? [{ reviewVersion: state.reviewVersion, result: state.reviewResult }]
            : [],
          meta: {},
        });
      }
      if (method === "POST" && url.endsWith(`/exercise-records/${recordId}/reviews`)) {
        if (!onValid) throw new Error("Unexpected review mutation");
        return onValid(call, state, calls);
      }
      throw new Error(`Unexpected request: ${method} ${url}`);
    },
  };
}

async function withFetchMock(mock, operation) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock.fetch;
  try {
    return await operation();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("only VALID records contribute credited minutes and progress", () => {
  const summary = deriveAuditSummary([
    record("valid", 120),
    record("invalid", 600),
  ], 1200);
  assert.equal(summary.validCount, 1);
  assert.equal(summary.invalidCount, 1);
  assert.equal(summary.pendingCount, 0);
  assert.equal(summary.validMinutes, 120);
  assert.equal(summary.remainingMinutes, 1080);
  assert.equal(summary.progressPercent, 10);
});

test("valid duration is restored after a valid record is marked invalid and corrected", () => {
  const original = record("valid", 60);
  const invalid = applyAttendanceAuditState(original, {
    auditStatus: "invalid",
    invalidReason: "凭证不完整",
  });
  assert.equal(invalid.creditedMinutes, 60);
  assert.equal(deriveAuditSummary([invalid], 1200).validMinutes, 0);

  const corrected = applyAttendanceAuditState(invalid, {
    auditStatus: "valid",
    auditRemark: "复核通过",
  });
  assert.equal(corrected.creditedMinutes, 60);
  assert.equal(corrected.invalidReason, undefined);
  assert.equal(deriveAuditSummary([corrected], 1200).validMinutes, 60);
});

test("single-record credited duration only accepts 0, 1, or 2 hour bands", () => {
  assert.equal(toCreditedDurationHours(0), 0);
  assert.equal(toCreditedDurationHours(60), 1);
  assert.equal(toCreditedDurationHours(120), 2);
  assert.equal(toCreditedDurationHours(90), null);
});

test("teacher review surfaces group image and video evidence without 1.5-hour credit", async () => {
  const workspace = await readFile(
    new URL("../app/teacher-workspace.tsx", import.meta.url),
    "utf8",
  );
  assert.match(workspace, /creditedMinutes: 60,[\s\S]*?originalHours: 1\.5,[\s\S]*?approvedHours: 1,/);
  assert.match(workspace, /checkin-evidence-preview\.svg[\s\S]*?checkin-finish-preview\.mp4/);
  assert.match(workspace, /className="checkin-album-content"/);
  assert.match(workspace, /singleRecordCreditedDurationLabel\([\s\S]*?record\.creditedMinutes/);
  assert.doesNotMatch(workspace, /attendanceHoursLabel\((?:record|selectedRecord)\.creditedMinutes\)/);
});

test("the teacher-configured target caps progress at 100 percent", () => {
  const exact = deriveAuditSummary([record("valid", 900)], 900);
  assert.equal(exact.progressPercent, 100);
  assert.equal(exact.hasReachedTarget, true);
  assert.equal(exact.exceededMinutes, 0);
  const over = deriveAuditSummary([record("valid", 960)], 900);
  assert.equal(over.progressPercent, 100);
  assert.equal(over.exceededMinutes, 60);
});

test("the synchronous operation lock rejects a second same-frame click", () => {
  const lock = { current: false };
  assert.equal(tryAcquireReviewTransitionLock(lock), true);
  assert.equal(tryAcquireReviewTransitionLock(lock), false);
  lock.current = false;
  assert.equal(tryAcquireReviewTransitionLock(lock), true);
});

test("maps backend sport and two-state review enums", () => {
  const checkin = mapExerciseRecordToCheckin({
    id: "record-1",
    studentId: "student-1",
    classSectionId: "class-1",
    enrollmentId: "enrollment-1",
    creditType: "COURSE_RELATED",
    sportType: "RUNNING",
    sportName: null,
    actualDurationSeconds: 60,
    creditedDurationSeconds: 60,
    businessDate: "2026-08-15",
    submittedAt: "2026-08-15T10:00:00.000Z",
    description: null,
    currentReview: { result: "VALID" },
  });
  assert.equal(checkin.sport, "跑步");
  assert.equal(checkin.status, "有效");
});


test("REVIEWED without currentReview fails closed instead of inventing VALID", () => {
  assert.throws(
    () => mapExerciseRecordToCheckin({
      id: "record-missing-review",
      studentId: "student-1",
      classSectionId: "class-1",
      enrollmentId: "enrollment-1",
      creditType: "GENERAL",
      sportType: "RUNNING",
      sportName: null,
      actualDurationSeconds: 3600,
      creditedDurationSeconds: 3600,
      businessDate: "2026-08-24",
      submittedAt: "2026-08-24T02:00:00.000Z",
      description: null,
      status: "REVIEWED",
      currentReview: null,
    }),
    (error) => error instanceof ReviewProjectionConsistencyError,
  );
});

test("INVALID is corrected directly to VALID with no reopen or PENDING request", async () => {
  const state = {
    recordStatus: "REVIEWED",
    recordVersion: 3,
    reviewResult: "INVALID",
    reviewVersion: 2,
  };
  const operation = createInvalidToValidReviewOperation("record-correct");
  const mock = reviewApiMock("record-correct", state, (call) => {
    assert.equal(call.headers["Idempotency-Key"], operation.decideValid.initial);
    assert.deepEqual(JSON.parse(String(call.body)), {
      result: "VALID",
      publicComment: "现场凭证复核无误",
      reasonCode: null,
      reason: null,
      expectedReviewVersion: 2,
      expectedVersion: 3,
    });
    state.recordVersion = 4;
    state.reviewVersion = 3;
    state.reviewResult = "VALID";
    return Response.json({ data: { reviewVersion: 3, result: "VALID" }, meta: {} });
  });
  const fresh = await withFetchMock(mock, () =>
    transitionInvalidExerciseReviewToValid(
      "record-correct",
      "现场凭证复核无误",
      operation,
    ),
  );
  assert.equal(fresh.status, "REVIEWED");
  assert.equal(mock.calls.filter(({ method }) => method === "POST").length, 1);
  assert.equal(mock.calls.some(({ url }) => url.endsWith("/reviews/reopen")), false);
  assert.equal(mock.calls.some(({ body }) => String(body).includes("PENDING")), false);
});

test("a VALID record is not appended again", async () => {
  const state = {
    recordStatus: "REVIEWED",
    recordVersion: 7,
    reviewResult: "VALID",
    reviewVersion: 6,
  };
  const mock = reviewApiMock("already-valid", state);
  const operation = createInvalidToValidReviewOperation("already-valid");
  await withFetchMock(mock, async () => {
    await assert.rejects(
      transitionInvalidExerciseReviewToValid("already-valid", "教师复核", operation),
      (error) => error instanceof ReviewTransitionConsistencyError && error.stage === "before-valid",
    );
  });
  assert.equal(mock.calls.some(({ method }) => method === "POST"), false);
});

test("teacher workspace exposes invalid records and direct correction wording", async () => {
  const workspace = await readFile(
    new URL("../app/teacher-workspace.tsx", import.meta.url),
    "utf8",
  );
  assert.match(workspace, /label: "无效记录"/);
  assert.match(workspace, /新提交默认有效/);
  assert.match(workspace, /手动标记为无效/);
  assert.match(workspace, /当前筛选没有无效记录/);
  assert.match(workspace, /纠正说明/);
  assert.match(workspace, /确认纠正为有效/);
  assert.doesNotMatch(workspace, /重开原因|确认重开并标记有效/);
  assert.match(workspace, /await transitionInvalidExerciseReviewToValid/);
});

test("teacher portal omits attempt-chain UI and student resubmission mutations", async () => {
  const workspace = await readFile(new URL("../app/teacher-workspace.tsx", import.meta.url), "utf8");
  const dataSource = await readFile(new URL("../app/teacher-data.ts", import.meta.url), "utf8");
  assert.doesNotMatch(workspace, /fetchExerciseRecordAttemptContext\(record\.id\)/);
  assert.doesNotMatch(workspace, /提交尝试|补交与审核历史/);
  assert.doesNotMatch(dataSource, /\/attempt-context/);
  assert.doesNotMatch(workspace, /createRecordResubmission|\/resubmissions/);
});
