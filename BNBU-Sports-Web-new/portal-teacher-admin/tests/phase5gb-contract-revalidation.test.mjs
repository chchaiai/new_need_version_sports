import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PHASE5B_STUDENT_CONTRACT,
  certificationResponseSurfaceFixtures,
  parseCertificationDetails,
  parseCreateCertificationApplicationRequest,
  readCertificationKind,
  schoolTeamCertificationApplication,
  schoolTeamCertificationRequest,
  studentClubCertificationApplication,
  studentClubCertificationRequest,
} from "../../frontend/student/phase5b-contract-fixtures.ts";
import { PHASE5B_CONTRACT } from "../app/phase5b-contract-fixtures.ts";
import {
  ADMIN_GATED_OPERATION_IDS,
  GATE_SAFE_OPERATION_IDS,
  accountDisabledChangeError,
  accountDisabledResetError,
  adminGateRecovery,
  changeOwnPasswordSessionOutcome,
  createSubAdminRequest,
  createdSubAdminFirstActor,
  firstPasswordChangeRequiredError,
  resetPasswordSessionOutcome,
  teacherGateRecovery,
  updateSubAdminRequest,
} from "../app/phase5gb-contract-fixtures.ts";

const contractVersion = "1.3.0-contract";
const contractStatus = "RC";
const contractSha = "b6bdcad2196dfdd5bccf3c50dc02cf69f5bc431ca4b7d7147efc652004406093";

const openapiUrl = new URL("../../../contracts/openapi.yaml", import.meta.url);
const metadataUrl = new URL("../../../contracts/contract-metadata.json", import.meta.url);
const portalGeneratedUrl = new URL("../app/phase5b-contract.generated.ts", import.meta.url);
const studentGeneratedUrl = new URL("../../frontend/student/phase5b-contract.generated.ts", import.meta.url);

const [openapiBytes, metadataText, portalGenerated, studentGenerated] = await Promise.all([
  readFile(openapiUrl),
  readFile(metadataUrl, "utf8"),
  readFile(portalGeneratedUrl, "utf8"),
  readFile(studentGeneratedUrl, "utf8"),
]);
const openapi = JSON.parse(
  execFileSync(
    "python",
    [
      "-c",
      [
        "import json",
        "import pathlib",
        "import sys",
        "import yaml",
        "document = yaml.safe_load(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))",
        "print(json.dumps(document))",
      ].join("; "),
      fileURLToPath(openapiUrl),
    ],
    { encoding: "utf8" },
  ),
);
const metadata = JSON.parse(metadataText);

function allOperations() {
  return Object.entries(openapi.paths).flatMap(([path, pathItem]) =>
    Object.entries(pathItem)
      .filter(([, operation]) => operation && typeof operation === "object" && operation.operationId)
      .map(([method, operation]) => ({ path, method, ...operation })),
  );
}

function operation(operationId) {
  const match = allOperations().find((item) => item.operationId === operationId);
  assert.ok(match, `missing operationId ${operationId}`);
  return match;
}

test("Portal and Student bindings pin the same 1.3.0 RC metadata and actual OpenAPI SHA", () => {
  const expected = {
    version: contractVersion,
    status: contractStatus,
    publicBasePath: "/api/v1",
    openapiSha256: contractSha,
  };
  assert.deepEqual(PHASE5B_CONTRACT, expected);
  assert.deepEqual(PHASE5B_STUDENT_CONTRACT, expected);
  assert.equal(metadata.contractVersion, contractVersion);
  assert.equal(metadata.contractStatus, contractStatus);
  assert.equal(metadata.openapiSha256, contractSha);
  assert.equal(createHash("sha256").update(openapiBytes).digest("hex"), contractSha);
  assert.equal(openapi.info.version, contractVersion);
  assert.equal(openapi.info["x-contract-status"], contractStatus);
});

test("Portal and Student generated bindings are identical and expose the closed CertificationKind", () => {
  assert.equal(portalGenerated, studentGenerated);
  assert.match(portalGenerated, /readonly CertificationKind: "SCHOOL_TEAM" \| "STUDENT_CLUB";/);
  assert.match(portalGenerated, /readonly certificationKind: components\["schemas"\]\["CertificationKind"\];/);
  assert.equal((portalGenerated.match(/readonly certificationKind: components\["schemas"\]\["CertificationKind"\];/g) ?? []).length, 1);
});

test("CertificationKind is required, non-null, closed, and names never infer its value", () => {
  const kind = openapi.components.schemas.CertificationKind;
  const details = openapi.components.schemas.CertificationDetails;
  assert.deepEqual(kind, { type: "string", enum: ["SCHOOL_TEAM", "STUDENT_CLUB"] });
  assert.equal(details.additionalProperties, false);
  assert.deepEqual(details.properties.certificationKind, { $ref: "#/components/schemas/CertificationKind" });
  assert.ok(details.required.includes("certificationKind"));
  assert.match(details.description, /names must never be used to infer the kind/);
});

test("Student SCHOOL_TEAM and STUDENT_CLUB requests serialize and round-trip unchanged", () => {
  for (const [request, response, expectedKind] of [
    [schoolTeamCertificationRequest, schoolTeamCertificationApplication, "SCHOOL_TEAM"],
    [studentClubCertificationRequest, studentClubCertificationApplication, "STUDENT_CLUB"],
  ]) {
    const parsedRequest = parseCreateCertificationApplicationRequest(JSON.parse(JSON.stringify(request)));
    assert.equal(parsedRequest.certification.certificationKind, expectedKind);
    assert.equal(readCertificationKind(response), expectedKind);
    assert.deepEqual(response.certification, request.certification);
    assert.deepEqual(JSON.parse(JSON.stringify(parsedRequest)), request);
  }
});

test("Certification validation rejects unknown, missing, null, inferred, and private subtype inputs", () => {
  const valid = schoolTeamCertificationRequest.certification;
  const invalidDetails = [
    { ...valid, certificationKind: "ALUMNI_TEAM" },
    { organizationOrTeamName: valid.organizationOrTeamName, validFrom: valid.validFrom, validTo: valid.validTo },
    { ...valid, certificationKind: null },
    { organizationName: "BNBU 羽毛球校队", validFrom: valid.validFrom, validTo: valid.validTo },
    { ...valid, applicationSubtype: "SCHOOL_TEAM" },
  ];
  invalidDetails.forEach((value) => assert.throws(() => parseCertificationDetails(value)));

  assert.throws(() => parseCreateCertificationApplicationRequest({
    ...schoolTeamCertificationRequest,
    applicationSubtype: "SCHOOL_TEAM",
  }));
  assert.throws(() => parseCreateCertificationApplicationRequest({
    ...schoolTeamCertificationRequest,
    certification: null,
  }));
});

test("all seven CR-003 response surfaces remain bound to StudentApplication certification data", () => {
  assert.deepEqual(Object.keys(certificationResponseSurfaceFixtures).sort(), [
    "createStudentApplication",
    "decideStudentApplication",
    "getCourseApplication",
    "getOwnApplication",
    "listCourseApplications",
    "listOwnApplications",
    "supplementStudentApplication",
  ]);
  const expectedRefs = {
    createStudentApplication: "#/components/schemas/StudentApplication",
    supplementStudentApplication: "#/components/schemas/StudentApplication",
    listOwnApplications: "#/components/schemas/StudentApplicationPage",
    getOwnApplication: "#/components/schemas/StudentApplication",
    listCourseApplications: "#/components/schemas/StudentApplicationPage",
    getCourseApplication: "#/components/schemas/StudentApplication",
    decideStudentApplication: "#/components/schemas/StudentApplication",
  };
  for (const [operationId, expectedRef] of Object.entries(expectedRefs)) {
    const success = Object.entries(operation(operationId).responses).find(([status]) => status.startsWith("2"));
    assert.ok(success, `${operationId} success response`);
    assert.equal(success[1].content["application/json"].schema.$ref, expectedRef, operationId);
  }
});

test("the exact 52 Admin operations are gated and the exact 10 recovery operations stay gate-safe", () => {
  const gated = allOperations()
    .filter((item) => item["x-roles"]?.includes("ADMIN") && item["x-error-codes"]?.includes("FIRST_PASSWORD_CHANGE_REQUIRED"))
    .map((item) => item.operationId)
    .sort();
  assert.deepEqual(gated, [...ADMIN_GATED_OPERATION_IDS]);
  assert.equal(gated.length, 52);
  for (const operationId of ADMIN_GATED_OPERATION_IDS) {
    const item = operation(operationId);
    assert.ok(item.responses[403], `${operationId} must declare 403`);
  }
  assert.equal(GATE_SAFE_OPERATION_IDS.length, 10);
  for (const operationId of GATE_SAFE_OPERATION_IDS) {
    assert.equal(operation(operationId)["x-error-codes"].includes("FIRST_PASSWORD_CHANGE_REQUIRED"), false, operationId);
  }
});

test("Teacher/Admin gate state survives login, refresh, me, page reload, and a new session", () => {
  for (const recovery of [teacherGateRecovery, adminGateRecovery]) {
    assert.equal(recovery.login.actor.mustChangePassword, true);
    assert.equal(recovery.refresh.actor.mustChangePassword, true);
    assert.equal(recovery.me.mustChangePassword, true);
    assert.equal(recovery.pageReload.mustChangePassword, true);
    assert.equal(recovery.newSession.actor.mustChangePassword, true);
  }
  const actor = openapi.components.schemas.CurrentActor;
  assert.ok(actor.required.includes("mustChangePassword"));
  assert.equal(actor.properties.mustChangePassword.type, "boolean");
  for (const operationId of ["createPasswordSession", "refreshSession"]) {
    const success = Object.entries(operation(operationId).responses).find(([status]) => status.startsWith("2"));
    assert.equal(success[1].content["application/json"].schema.$ref, "#/components/schemas/SessionTokenPair");
  }
  assert.equal(operation("getCurrentActor").responses[200].content["application/json"].schema.$ref, "#/components/schemas/CurrentActor");
});

test("changeOwnPassword and self reset preserve the exact gate and session semantics", () => {
  assert.equal(changeOwnPasswordSessionOutcome.actor.mustChangePassword, false);
  assert.equal(changeOwnPasswordSessionOutcome.currentSession, "PRESERVED");
  assert.equal(changeOwnPasswordSessionOutcome.otherSessions, "REVOKED");
  assert.equal(resetPasswordSessionOutcome.allOldSessions, "REVOKED");
  assert.equal(resetPasswordSessionOutcome.issuedSession, null);
  assert.equal(resetPasswordSessionOutcome.actorAtNextAuthenticatedRead.mustChangePassword, false);
  assert.match(operation("changeOwnPassword").description, /preserves the current session, revokes every other session/);
  assert.match(operation("resetPassword").description, /revokes every prior session, returns no token, and does not automatically log in/);
});

test("disabled change/reset use stable ACCOUNT_DISABLED and never restore access", () => {
  assert.equal(accountDisabledChangeError.code, "ACCOUNT_DISABLED");
  assert.equal(accountDisabledResetError.code, "ACCOUNT_DISABLED");
  assert.equal(firstPasswordChangeRequiredError.code, "FIRST_PASSWORD_CHANGE_REQUIRED");
  for (const operationId of ["changeOwnPassword", "resetPassword"]) {
    const item = operation(operationId);
    assert.ok(item.responses[403], `${operationId} 403`);
    assert.ok(item["x-error-codes"].includes("ACCOUNT_DISABLED"), operationId);
  }
  assert.match(operation("resetPassword").description, /without changing its credential, gate, or access state/);
});

test("createSubAdmin assigns a temporary credential and mustChangePassword=true", () => {
  assert.equal(createSubAdminRequest.initialPassword, createSubAdminRequest.confirmInitialPassword);
  assert.equal(createdSubAdminFirstActor.mustChangePassword, true);
  assert.match(openapi.components.schemas.CreateSubAdminRequest.description, /temporary password assigned by another person/);
  assert.match(operation("createSubAdmin").description, /temporary password/);
  assert.match(operation("createSubAdmin").description, /mustChangePassword=true/);
});

test("UpdateSubAdminRequest and its Web fixture contain no password or credential substitute", async () => {
  const schema = openapi.components.schemas.UpdateSubAdminRequest;
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(Object.keys(schema.properties).sort(), [
    "department",
    "expectedVersion",
    "name",
    "permissions",
    "verifiedEmail",
  ]);
  assert.deepEqual(Object.keys(updateSubAdminRequest).sort(), [
    "department",
    "expectedVersion",
    "name",
    "permissions",
    "verifiedEmail",
  ]);
  for (const forbidden of ["newPassword", "confirmNewPassword", "password", "temporaryPassword", "credential"]) {
    assert.equal(forbidden in schema.properties, false, forbidden);
    assert.equal(forbidden in updateSubAdminRequest, false, forbidden);
  }
  const subAdminSource = await readFile(new URL("../app/admin-subadmins.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(subAdminSource, /New password|新密码|confirmNewPassword|temporaryPassword/);
  assert.match(subAdminSource, /mode: "create"/);
  assert.match(subAdminSource, /mode: "update"/);
});

test("personal password schemas and Web UI keep only the accepted non-empty rule", async () => {
  for (const schemaName of ["PasswordChangeRequest", "PasswordResetRequest"]) {
    const password = openapi.components.schemas[schemaName].properties.newPassword;
    assert.equal(password.minLength, 1, schemaName);
    assert.equal("maxLength" in password, false, schemaName);
    assert.equal("pattern" in password, false, schemaName);
  }
  const errorCodes = openapi.components.schemas.ErrorCode.enum;
  for (const forbidden of ["PASSWORD_POLICY_VIOLATION", "TOO_LONG", "BLOCKLISTED", "SAME_AS_CURRENT"]) {
    assert.equal(errorCodes.includes(forbidden), false, forbidden);
  }
  const sourceUrls = [
    new URL("../app/portal-app.tsx", import.meta.url),
    new URL("../app/language.tsx", import.meta.url),
    new URL("../app/admin-subadmins.tsx", import.meta.url),
  ];
  const sources = (await Promise.all(sourceUrls.map((url) => readFile(url, "utf8")))).join("\n");
  assert.doesNotMatch(sources, /PASSWORD_POLICY_VIOLATION|TOO_LONG|BLOCKLISTED|SAME_AS_CURRENT/);
  assert.doesNotMatch(sources, /At least 12 characters|至少 12 位|至少12位|length < 12|minLength=\{12\}/);
});
