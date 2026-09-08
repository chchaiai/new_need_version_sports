"use strict";
// Validation harness only. Uses real JSON Schema assertions, no private request DTO.
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const assert = require("node:assert/strict");
const [inputPath, dependencyRoot, outputPath] = process.argv.slice(2);
if (!inputPath || !dependencyRoot || !outputPath) throw new Error("Usage: node runtime_web.cjs INPUT_JSON DEPENDENCY_ROOT OUTPUT_JSON");
const deps = createRequire(path.join(path.resolve(dependencyRoot), "package.json"));
const Ajv2020 = deps("ajv/dist/2020").default;
const addFormats = deps("ajv-formats");
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const spec = input.spec;
const prefix = "#/components/schemas/";
const locations = {
  CreateStudentApplicationRequest: null,
  ReviseEnduranceRuleTableRequest: "change",
  SwitchSystemModeRequest: null,
};
const names = new Set();
function visit(name) {
  if (names.has(name)) return;
  names.add(name);
  assert(spec.components.schemas[name], "Unresolved schema " + name);
  function walk(value) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") {
      if (typeof value.$ref === "string") {
        assert(value.$ref.startsWith(prefix), "External reference is outside this review");
        visit(value.$ref.slice(prefix.length));
      }
      Object.values(value).forEach(walk);
    }
  }
  walk(spec.components.schemas[name]);
}
Object.keys(locations).forEach(visit);
function translate(value) {
  if (Array.isArray(value)) return value.map(translate);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, translate(v)]));
  return typeof value === "string" && value.startsWith(prefix) ? "#/$defs/" + value.slice(prefix.length) : value;
}
const id = "urn:bnbu:step02:" + input.candidateSha256;
const document = { $id: id, $schema: "https://json-schema.org/draft/2020-12/schema", $defs: {} };
for (const name of names) document.$defs[name] = translate(spec.components.schemas[name]);
const ajv = new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false });
addFormats(ajv, { mode: "full" });
// Discriminator is an OpenAPI dispatch annotation. Mapping is checked explicitly below;
// all oneOf, const, required, null, type and closed-object assertions remain enabled.
ajv.addKeyword({ keyword: "discriminator", schemaType: "object" });
ajv.addSchema(document);
const validators = Object.fromEntries(Object.keys(locations).map(name => [name, ajv.compile({ $ref: id + "#/$defs/" + name })]));
function decode(schema, payload) {
  const nested = locations[schema];
  const parent = spec.components.schemas[schema];
  const node = nested ? parent.properties[nested] : parent;
  const value = nested && payload && typeof payload === "object" ? payload[nested] : payload;
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false };
  const wire = value[node.discriminator.propertyName];
  const mapping = node.discriminator.mapping;
  if (typeof wire !== "string" || !Object.hasOwn(mapping, wire)) return { valid: false };
  const target = mapping[wire];
  assert(node.oneOf.some(branch => branch.$ref === target), "Mapping target is outside oneOf");
  if (!validators[schema](payload)) return { valid: false, errors: structuredClone(validators[schema].errors) };
  return { valid: true, branch: target.slice(prefix.length), payload };
}
let roundtrips = 0;
const cases = input.cases.map(test => {
  const wire = JSON.stringify(test.payload);
  const decoded = decode(test.schema, JSON.parse(wire));
  if (test.expectedValid && decoded.valid) {
    assert.equal(JSON.stringify(decoded.payload), wire, "Validation must not mutate the wire payload");
    const nested = locations[test.schema];
    const node = nested ? spec.components.schemas[test.schema].properties[nested] : spec.components.schemas[test.schema];
    const body = nested ? test.payload[nested] : test.payload;
    const selected = spec.components.schemas[decoded.branch].properties[node.discriminator.propertyName].const;
    assert.equal(selected, body[node.discriminator.propertyName]);
    roundtrips++;
  }
  return { name: test.name, expectedValid: test.expectedValid, actualValid: decoded.valid, passed: decoded.valid === test.expectedValid };
});
const result = { candidateSha256: input.candidateSha256, node: process.version,
  ajv: deps("ajv/package.json").version, ajvFormats: deps("ajv-formats/package.json").version,
  schemaCount: names.size, cases, passed: cases.filter(c => c.passed).length, total: cases.length, roundtrips,
  boundary: "JavaScript runtime probe in Node; not browser application integration or Backend acceptance." };
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ passed: result.passed, total: result.total, roundtrips, schemaCount: names.size }));
if (result.passed !== result.total || roundtrips !== 7) process.exitCode = 1;
