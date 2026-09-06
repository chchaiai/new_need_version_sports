import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_REASON_CATALOG,
  SYSTEM_OVERDUE_REASON,
  TEACHER_REVIEW_ACTIONS,
  publicReasonById,
  reasonsForAction,
} from "../app/review-public-reasons.ts";

test("V8.1 catalog has six bilingual reasons and no Other fallback", () => {
  assert.deepEqual(
    PUBLIC_REASON_CATALOG.map((reason) => [reason.zh, reason.en]),
    [
      ["材料不清晰", "Unclear evidence"],
      ["必需材料缺失（含要求的前后照）", "Missing required evidence"],
      ["材料与本次运动不符", "Evidence does not match this session"],
      ["材料信息矛盾", "Inconsistent evidence"],
      ["材料真实性待核实", "Evidence authenticity requires clarification"],
      ["经核实存在重复使用或冒用材料", "Confirmed reuse or misuse of evidence"],
    ],
  );
  assert.equal(
    PUBLIC_REASON_CATALOG.some((reason) => reason.zh === "其他" || reason.en === "Other"),
    false,
  );
  assert.equal(SYSTEM_OVERDUE_REASON.zh, "补证逾期");
  assert.equal(SYSTEM_OVERDUE_REASON.en, "Supplementary evidence deadline missed");
});

test("return and invalid actions expose only their allowed reasons", () => {
  const returned = reasonsForAction(TEACHER_REVIEW_ACTIONS.ReturnForSupplement);
  const invalid = reasonsForAction(TEACHER_REVIEW_ACTIONS.MarkInvalid);
  assert.deepEqual(returned.map((reason) => reason.id), [
    "UnclearEvidence",
    "MissingRequiredEvidence",
    "EvidenceDoesNotMatchSession",
    "InconsistentEvidence",
    "AuthenticityRequiresClarification",
  ]);
  assert.deepEqual(invalid.map((reason) => reason.id), [
    "UnclearEvidence",
    "MissingRequiredEvidence",
    "EvidenceDoesNotMatchSession",
    "InconsistentEvidence",
    "ConfirmedReuseOrMisuse",
  ]);
  assert.equal(
    publicReasonById("AuthenticityRequiresClarification")?.actions.includes(
      TEACHER_REVIEW_ACTIONS.MarkInvalid,
    ),
    false,
  );
});
