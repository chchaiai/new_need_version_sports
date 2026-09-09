import { recordWithReview } from "../../frontend/student/phase6b-test-fixtures.mjs";
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPhase5bMaterialVersion,
  buildPhase5bRecordReviewSummary,
  phase5bUnclearEvidenceReason,
} from "../app/phase5b-contract-shared-fixtures.ts";
import { exerciseRecord, portalMaterialVersionId } from "../app/phase5b-contract-fixtures.ts";
import {
  PHASE6B_PORTAL_CONTRACT,
  assertContractExerciseRecordWire,
  isContractExerciseRecord,
  normalizeContractExerciseRecordForTeacher,
  publicReasonDisplayLabel,
  rejectUnknownPublicReasonCode,
} from "../app/phase6b-contract-mapper.ts";
import { mapExerciseRecordToCheckin } from "../app/teacher-data.ts";

test("phase6b portal mapper pins 1.4.0 identity and rejects unknown public reason codes", () => {
  assert.equal(PHASE6B_PORTAL_CONTRACT.version, "1.4.0-contract");
  assert.equal(PHASE6B_PORTAL_CONTRACT.status, "RC");
  assert.throws(
    () => rejectUnknownPublicReasonCode("NOT_A_REAL_REASON"),
    /CONTRACT_PUBLIC_REASON_INVALID:NOT_A_REAL_REASON/,
  );
});

test("phase6b portal mapper normalizes contract exercise records without invented credited minutes", () => {
  assert.ok(isContractExerciseRecord(exerciseRecord));
  const normalized = normalizeContractExerciseRecordForTeacher(exerciseRecord);
  assert.equal(normalized.id, exerciseRecord.recordId);
  assert.equal(normalized.creditedDurationSeconds, null);
  assert.equal(normalized.actualDurationSeconds, exerciseRecord.actualDurationSeconds);

  const checkin = mapExerciseRecordToCheckin(exerciseRecord);
  assert.equal(checkin.creditedMinutes, null);
  assert.equal(checkin.durationMinutes, Math.round(exerciseRecord.actualDurationSeconds / 60));
  assert.equal(checkin.auditStatus, "valid");
});

test("phase6b portal mapper keeps in-progress reviews as processing audit status", () => {
  const inProgress = recordWithReview("prior-workflow/review/teacher_round1");
  const checkin = mapExerciseRecordToCheckin(inProgress);
  assert.equal(checkin.auditStatus, "processing");
});

test("phase6b portal mapper rejects invalid contract wire at runtime", () => {
  assert.throws(
    () => assertContractExerciseRecordWire({ ...exerciseRecord, category: "BOGUS" }),
    (error) => error.name === "ContractWireValidationError" && error.issues.some((issue) => issue.instancePath === "/category" && issue.keyword === "enum"),
  );
  assert.throws(
    () => assertContractExerciseRecordWire({ ...exerciseRecord, actualDurationSeconds: "1800" }),
    (error) => error.name === "ContractWireValidationError" && error.issues.some((issue) => issue.instancePath === "/actualDurationSeconds" && issue.keyword === "type"),
  );
  assert.throws(
    () => assertContractExerciseRecordWire({ ...exerciseRecord, unexpectedField: true }),
    (error) => error.name === "ContractWireValidationError" && error.issues.some((issue) => issue.keyword === "additionalProperties"),
  );
});

test("phase6b portal mapper reads publicReason wire labels for invalid reviews", () => {
  const invalidRecord = {
    ...exerciseRecord,
    currentReview: {
      ...buildPhase5bRecordReviewSummary(portalMaterialVersionId, "INVALID"),
      publicReason: phase5bUnclearEvidenceReason,
      publicComment: "凭证不足以确认本次运动内容。",
    },
    currentMaterial: buildPhase5bMaterialVersion(
      exerciseRecord.recordId,
      exerciseRecord.sessionId,
      portalMaterialVersionId,
    ),
  };
  const label = publicReasonDisplayLabel(invalidRecord.currentReview);
  assert.equal(label, "材料不清晰");
  const checkin = mapExerciseRecordToCheckin(invalidRecord);
  assert.equal(checkin.invalidReason, "材料不清晰");
  assert.equal(checkin.auditStatus, "invalid");
});

test("phase5b shared material fixture keeps the 30-minute transfer window", () => {
  const material = buildPhase5bMaterialVersion(
    exerciseRecord.recordId,
    exerciseRecord.sessionId,
    portalMaterialVersionId,
  );
  assert.equal(material.acceptedAt, "2026-08-31T03:15:00Z");
  assert.equal(material.transferDueAt, "2026-08-31T03:45:00Z");
});
