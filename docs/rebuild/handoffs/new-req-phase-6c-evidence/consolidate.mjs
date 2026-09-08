// Isolated 6C consolidation. Reuses accepted Android evidence; does not run Android.
// Run after npm ci in BNBU-Sports-Web-new/portal-teacher-admin:
// node docs/rebuild/handoffs/new-req-phase-6c-evidence/consolidate.mjs > fresh-6c-result.json
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mapStudentProgressProjection } from "../../../../BNBU-Sports-Web-new/frontend/student/js/api.js";
import { assertContractWire } from "../../../../BNBU-Sports-Web-new/frontend/student/js/contract/wire.js";

const root = new URL("../../../../", import.meta.url);
const bytes = (path) => readFileSync(new URL(path, root));
const json = (path) => JSON.parse(bytes(path));
const sha = (path) => createHash("sha256").update(bytes(path)).digest("hex");
const requireWeb = createRequire(new URL("BNBU-Sports-Web-new/portal-teacher-admin/package.json", root));
const Ajv2020 = requireWeb("ajv/dist/2020.js").default;
const addFormats = requireWeb("ajv-formats");
const { load } = requireWeb("js-yaml");
const contractSha = "5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed";
assert.equal(sha("contracts/openapi.yaml"), contractSha);
assert.equal(sha("contracts/validation/step07_handoff/fixtures.json"), "d3c2a37f4bad298f383b70579a3e5d22e5e117cd0cee238beb6b6d336dc0deef");
const document = load(bytes("contracts/openapi.yaml").toString("utf8"));
assert.equal(document.info.version, "1.3.0-contract");
assert.equal(document.info["x-contract-status"], "RC");
const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true,
  coerceTypes: false, useDefaults: false, removeAdditional: false, ownProperties: true });
addFormats(ajv, { mode: "full" });
const schemaId = "urn:bnbu:phase6c:fixed-contract";
ajv.addSchema({ $id: schemaId, components: document.components });
const corpus = json("contracts/validation/step07_handoff/fixtures.json").cases;
const evidence = "docs/rebuild/handoffs/new-req-phase-6-android-evidence/host/";
const androidSchema = json(evidence + "full-schema.json");
const androidMapper = json(evidence + "mapper.json");
assert.equal(androidSchema.candidateSha256, contractSha);
assert.equal(androidMapper.candidateSha256, contractSha);
const unionCases = corpus.filter((row) => row.name.startsWith("old-mapping/"));
assert.equal(unionCases.filter((row) => row.expectedValid).length, 7);
assert.equal(new Set(unionCases.map((row) => row.schema)).size, 3);
const unions = unionCases.map((row) => {
  const payload = structuredClone(row.payload);
  const before = JSON.stringify(payload);
  const validate = ajv.getSchema(schemaId + "#/components/schemas/" + row.schema);
  const actualValid = validate(payload);
  assert.equal(actualValid, row.expectedValid, row.name);
  assert.equal(JSON.stringify(payload), before);
  if (actualValid) assert.deepEqual(JSON.parse(JSON.stringify(payload)), row.payload);
  const android = androidSchema.cases.find((item) => item.name === row.name);
  assert.ok(android?.passed && android.actualValid === actualValid, row.name);
  if (actualValid) assert.equal(android.roundtrip, true, row.name);
  return { name: row.name, schema: row.schema, expectedValid: row.expectedValid,
    webActualValid: actualValid, androidRecordedValid: android.actualValid,
    validJsonRoundtrip: actualValid, passed: true };
});

const runtimeRoots = new Set(["ExerciseRecord", "RecordReviewSummary", "PublicReviewReason", "StudentCourseProgress", "StudentCourse"]);
const runtimeCases = corpus.filter((row) => runtimeRoots.has(row.schema)).map((row) => {
  const payload = structuredClone(row.payload), before = JSON.stringify(payload);
  let actualValid = true;
  try { assertContractWire(row.schema, payload); }
  catch (error) { assert.equal(error.name, "ContractWireValidationError"); actualValid = false; }
  assert.equal(actualValid, row.expectedValid, row.name);
  assert.equal(JSON.stringify(payload), before);
  const android = androidSchema.cases.find((item) => item.name === row.name);
  assert.ok(android?.passed && android.actualValid === actualValid, row.name);
  return { name: row.name, schema: row.schema, expectedValid: row.expectedValid,
    webActualValid: actualValid, androidRecordedValid: android.actualValid, passed: true };
});

const progressInputs = [
  ["current", "progress/1199_percent100_is_not_target_met", null, true],
  ["wrong_enrollment", "progress/reject_identity", (p) => p.checkpoint.enrollmentId = "00000000-0000-4000-8000-000000000002", false],
  ["wrong_remaining", "progress/reject_category_sum", (p) => p.checkpoint.totals.categories[1].remainingMinutes = 2, false],
];
const progress = progressInputs.map(([name, androidCase, mutate, expectedAccepted]) => {
  const payload = structuredClone(corpus.find((row) => row.name === "prior-courses/progress/current").payload);
  if (mutate) mutate(payload);
  const before = JSON.stringify(payload);
  let accepted = false, errorName = null, projection = null;
  try { projection = mapStudentProgressProjection(payload); accepted = true; }
  catch (error) { errorName = error.name; }
  assert.equal(accepted, expectedAccepted, name);
  if (!accepted) assert.equal(errorName, "ContractProgressConsistencyError");
  if (accepted) { assert.equal(projection.targetMet, false); assert.equal(projection.displayPercent, 100); }
  assert.equal(JSON.stringify(payload), before);
  assert.equal(androidMapper.cases.find((row) => row.name === androidCase)?.status, "PASS");
  return { name, expectedAccepted, webAccepted: accepted, errorName, androidCase,
    androidRecordedStatus: "PASS", passed: true };
});
const inputs = ["contracts/openapi.yaml", "contracts/validation/step07_handoff/fixtures.json",
  evidence + "full-schema.json", evidence + "mapper.json",
  "BNBU-Sports-Web-new/frontend/student/js/phase6b-contract-mapper.js",
  "BNBU-Sports-Web-new/frontend/student/js/contract/wire.js",
  "BNBU-Sports-Web-new/frontend/student/js/contract/validators.generated.js",
  "BNBU-Sports-Web-new/portal-teacher-admin/tests/phase6b-wire.test.mjs",
  "BNBU-Sports-Web-new/portal-teacher-admin/package-lock.json",
  "docs/rebuild/handoffs/new-req-phase-6c-evidence/consolidate.mjs"];
console.log(JSON.stringify({ status: "PASS", recordedAt: new Date().toISOString(),
  repository: fileURLToPath(root), contractSha256: contractSha,
  tools: { node: process.version, ajv: requireWeb("ajv/package.json").version,
    ajvFormats: requireWeb("ajv-formats/package.json").version },
  scope: "Three original discriminator groups using installed Web validation dependencies and fixed corpus; actual Web progress mapper. Android is accepted unchanged evidence, not rerun. JSON/schema validation is not production networking or E2E.",
  inputs: inputs.map((path) => ({ path, sha256: sha(path) })),
  unionCount: unions.length, unionPassed: unions.length, legalBranches: 7,
  runtimeCaseCount: runtimeCases.length, runtimeCasePassed: runtimeCases.length,
  progressCount: progress.length, progressPassed: progress.length, unions, runtimeCases, progress,
}, null, 2));
