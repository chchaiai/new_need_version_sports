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
  isContractExerciseRecord,
  normalizeContractExerciseRecordForTeacher,
  publicReasonDisplayLabel,
  rejectUnknownPublicReasonCode,
} from "../app/phase6b-contract-mapper.ts";
import { mapExerciseRecordToCheckin } from "../app/teacher-data.ts";

test("phase6b portal mapper pins 1.3.0 identity and rejects unknown public reason codes", () => {
  assert.equal(PHASE6B_PORTAL_CONTRACT.version, "1.3.0-contract");
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
  assert.equal(normalized.creditedDurationSeconds, 0);
  assert.equal(normalized.actualDurationSeconds, exerciseRecord.actualDurationSeconds);

  const checkin = mapExerciseRecordToCheckin(exerciseRecord);
  assert.equal(checkin.creditedMinutes, 0);
  assert.equal(checkin.durationMinutes, Math.round(exerciseRecord.actualDurationSeconds / 60));
  assert.equal(checkin.auditStatus, "valid");
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
