import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { load } from "js-yaml";
import { assertContractWire, studentIdentityDisplay, requireCurrentStudent } from "../../frontend/student/js/contract/wire.js";
import { StudentReferenceDisplay } from "../app/phase7-student-reference.tsx";
import { normalizeContractExerciseRecordForTeacher } from "../app/phase6b-contract-mapper.ts";
import { mapServerRecord, mapStudentProgressProjection } from "../../frontend/student/js/api.js";

const raw = readFileSync(new URL("../../../contracts/openapi.yaml", import.meta.url));
const spec = load(raw.toString("utf8"));
const corpus = JSON.parse(readFileSync(new URL("../../../contracts/validation/p7_cr14/fixtures.json", import.meta.url)));
assert.equal(createHash("sha256").update(raw).digest("hex"), corpus.candidateSha256);
const ajv = new Ajv2020({ strict: false, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false, inlineRefs: false });
addFormats(ajv, { mode: "full" });
ajv.addSchema({ $id: "urn:bnbu:p7:14", components: spec.components });
const validators = new Map();
const queryCorpus = JSON.parse(readFileSync(new URL("../../../contracts/validation/p7_cr14/query-cases.json", import.meta.url)));
assert.equal(queryCorpus.candidateSha256, corpus.candidateSha256);
const operations = Object.fromEntries(Object.values(spec.paths).flatMap((p) => Object.values(p))
  .filter((p) => p?.operationId).map((p) => [p.operationId, p]));
for (const row of queryCorpus.cases) {
  test("synthetic query serialization vector (not Backend HTTP): " + row.name, () => {
    const op = operations[row.operationId];
    assert.ok(op["x-error-codes"].includes("INVALID_REQUEST"));
    assert.ok(op.responses["400"]);
    const declared = Object.fromEntries(op.parameters.filter((p) => p.in === "query").map((p) => [p.name, p]));
    const seen = new Set(); let valid = true;
    for (const [name, raw] of new URLSearchParams(row.query)) {
      if (!declared[name]) continue;
      if (seen.has(name)) { valid = false; break; }
      seen.add(name);
      if (name === "cursor") continue;
      let value = raw;
      if (name === "limit") {
        const match = new RegExp(op["x-query-serialization"].limit.decodedPattern).exec(raw);
        if (!match || match[0] !== raw) { valid = false; break; }
        value = Number(raw);
      } else if (declared[name].schema.type === "boolean") {
        if (!["true", "false"].includes(raw)) { valid = false; break; }
        value = raw === "true";
      }
      const key = row.operationId + "/query/" + name;
      if (!validators.has(key)) validators.set(key, ajv.compile(declared[name].schema));
      if (!validators.get(key)(value)) { valid = false; break; }
    }
    assert.equal(valid, row.expectedValid);
    if (!valid) { assert.equal(row.status, 400); assert.equal(row.error, "INVALID_REQUEST"); }
  });
}
for (const row of [...corpus.cases, ...corpus.additionalCases]) {
  test("same-SHA JavaScript schema: " + row.name, () => {
    if (!validators.has(row.schema)) validators.set(row.schema, ajv.compile({ $ref: "urn:bnbu:p7:14#/components/schemas/" + row.schema }));
    const value = structuredClone(row.payload), before = JSON.stringify(value);
    assert.equal(validators.get(row.schema)(value), row.expectedValid);
    assert.equal(JSON.stringify(value), before);
  });
}
for (const row of corpus.additionalCases) {
  test("actual browser validator: " + row.name, () => {
    if (row.expectedValid) assert.deepEqual(assertContractWire(row.schema, row.payload), row.payload);
    else assert.throws(() => assertContractWire(row.schema, row.payload), { name: "ContractWireValidationError" });
  });
}
function fixture(name) { return structuredClone(corpus.additionalCases.find((c) => c.name === "p7/" + name).payload); }
test("deleted identity renders no old profile and no login/profile link", () => {
  const ref = fixture("reference/deleted");
  const projection = studentIdentityDisplay(ref);
  assert.equal(projection.label, "已注销学生"); assert.equal(projection.studentNumber, null);
  assert.equal(projection.canOpenCurrentProfile, false);
  const html = renderToStaticMarkup(React.createElement(StudentReferenceDisplay, { reference: ref }));
  assert.match(html, /已注销学生/); assert.doesNotMatch(html, /href=|<button|<small/);
  const english = renderToStaticMarkup(React.createElement(StudentReferenceDisplay, { reference: ref, english: true }));
  assert.match(english, /Deleted student/);
  assert.throws(() => requireCurrentStudent(ref), /CURRENT_STUDENT_REQUIRED/);
});
test("PENDING still renders the current profile", () => {
  const ref = fixture("reference/pending");
  assert.equal(requireCurrentStudent(ref).studentStatus, "PENDING");
  assert.equal(studentIdentityDisplay(ref).deleted, false);
});
test("teacher history keeps ID but own endpoints reject deleted identity", () => {
  const record = fixture("outlet/ExerciseRecord/deleted");
  assert.equal(normalizeContractExerciseRecordForTeacher(record).studentId, record.student.studentId);
  assert.throws(() => normalizeContractExerciseRecordForTeacher(record, {studentId:"another-id"}), /STUDENT_ID_MISMATCH/);
  assert.throws(() => mapServerRecord(record), /CURRENT_STUDENT_REQUIRED/);
  assert.throws(() => mapStudentProgressProjection(fixture("outlet/StudentCourseProgress/deleted")), /CURRENT_STUDENT_REQUIRED/);
});
