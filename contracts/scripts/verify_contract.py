from __future__ import annotations

from copy import deepcopy
import hashlib
import json
import re
from pathlib import Path
from typing import Any, Iterable

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry
from referencing.jsonschema import DRAFT202012
from yaml.constructor import ConstructorError

from build_contract import (
    CONTRACT_ROOT,
    CONTRACT_STATUS,
    CONTRACT_VERSION,
    PUBLIC_BASE_PATH,
    ContractDumper,
    assemble,
    render_catalog,
)
from common import ERROR_CATALOG


HTTP_METHODS = {"get", "post", "put", "patch", "delete"}
WRITE_METHODS = {"post", "put", "patch", "delete"}
ROLE_VALUES = {"ANONYMOUS", "STUDENT", "TEACHER", "ADMIN"}
ADMIN_PERMISSIONS = {
    "COURSE_VIEW",
    "SEMESTER",
    "USERS_ACCOUNTS",
    "FEEDBACK",
    "GLOBAL_RULES",
    "SYSTEM_MODE",
    "HELP_CENTER",
    "AUDIT_QUERY",
}
CORE_OPERATION_IDS = {
    "requestAuthChallenge",
    "createStudentSession",
    "createPasswordSession",
    "refreshSession",
    "getCurrentActor",
    "deleteOwnAccount",
    "getAppReleasePolicy",
    "getCurrentSemester",
    "createSemester",
    "switchCurrentSemester",
    "createCourse",
    "previewCourseChangeImpact",
    "updateCourse",
    "closeCourse",
    "createCourseInvitation",
    "listCourseInvitations",
    "joinCourseByInvitation",
    "registerStudentAndJoinCourse",
    "removeCourseMember",
    "restoreCourseMember",
    "allocateRosterImport",
    "importOfficialRoster",
    "resolveRosterFinding",
    "startExerciseSession",
    "pauseExerciseSession",
    "resumeExerciseSession",
    "completeExerciseSession",
    "allocateMediaAsset",
    "finalizeMediaAsset",
    "submitExerciseRecord",
    "appendExerciseRecordReview",
    "getOwnCourseProgress",
    "createStudentApplication",
    "supplementStudentApplication",
    "decideStudentApplication",
    "adjustCertificationCredit",
    "revokeCertificationCredit",
    "confirmEnduranceMeasurement",
    "reviseEnduranceRuleTable",
    "publishFinalGrade",
    "createFeedback",
    "processFeedback",
    "createHelpArticle",
    "transitionHelpArticleState",
    "switchSystemMode",
    "markOwnNotificationRead",
    "requestAuditArchive",
    "createTeacherAccountBatch",
    "deleteTeacherAccount",
    "createSubAdmin",
    "updateSubAdmin",
    "setSubAdminState",
    "deleteSubAdmin",
}
PASSWORD_NEW_ADMIN_GATE_OPERATION_IDS = {
    "getOwnAccountDeletionImpact",
    "deleteOwnAccount",
    "listSemesters",
    "createSemester",
    "updateUpcomingSemester",
    "switchCurrentSemester",
    "listCurrentCoursesForAdmin",
    "getCurrentCourseForAdmin",
    "listEnduranceRuleTables",
    "getEnduranceRuleTable",
    "reviseEnduranceRuleTable",
    "listFeedbackForAdmin",
    "getFeedbackForAdmin",
    "processFeedback",
    "listHelpArticlesForAdmin",
    "createHelpArticle",
    "getHelpArticleForAdmin",
    "updateHelpArticle",
    "transitionHelpArticleState",
    "listSystemModeTransitions",
    "switchSystemMode",
    "listAuditEvents",
    "getAuditEvent",
    "requestAuditArchive",
    "getAuditArchiveJob",
    "authorizeAuditArchiveDownload",
    "listTeacherAccounts",
    "getTeacherAccount",
    "validateTeacherAccountBatch",
    "createTeacherAccountBatch",
    "deleteTeacherAccount",
    "listStudentAccounts",
    "getStudentAccount",
    "listSubAdmins",
    "createSubAdmin",
    "getSubAdmin",
    "updateSubAdmin",
    "setSubAdminState",
    "deleteSubAdmin",
    "getAdminDashboard",
}
PASSWORD_EXISTING_ADMIN_GATE_OPERATION_IDS = {
    "changeOwnVerifiedEmail",
    "getCurrentSemester",
    "listOwnNotifications",
    "getOwnUnreadNotificationCount",
    "markOwnNotificationRead",
}
PASSWORD_GATE_SAFE_OPERATION_IDS = {
    "requestAuthChallenge",
    "createPasswordSession",
    "refreshSession",
    "resetPassword",
    "getCurrentActor",
    "changeOwnPassword",
    "logoutCurrentSession",
    "logoutAllSessions",
    "getAppReleasePolicy",
    "getSystemMode",
}
FORBIDDEN_PASSWORD_ERROR_CODES = {
    "PASSWORD_POLICY_VIOLATION",
    "TOO_LONG",
    "BLOCKLISTED",
    "SAME_AS_CURRENT",
}
CERTIFICATION_RESPONSE_OPERATION_IDS = {
    "createStudentApplication",
    "supplementStudentApplication",
    "listOwnApplications",
    "getOwnApplication",
    "listCourseApplications",
    "getCourseApplication",
    "decideStudentApplication",
}


class UniqueKeyLoader(yaml.SafeLoader):
    pass


def construct_unique_mapping(loader: UniqueKeyLoader, node: yaml.MappingNode, deep: bool = False) -> dict[Any, Any]:
    loader.flatten_mapping(node)
    result: dict[Any, Any] = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ConstructorError("while constructing a mapping", node.start_mark, f"duplicate key: {key}", key_node.start_mark)
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,
    construct_unique_mapping,
)


class Verification:
    def __init__(self) -> None:
        self.errors: list[str] = []

    def check(self, condition: bool, message: str) -> None:
        if not condition:
            self.errors.append(message)

    def equal(self, actual: Any, expected: Any, message: str) -> None:
        if actual != expected:
            self.errors.append(f"{message}: expected {expected!r}, got {actual!r}")


def iter_operations(spec: dict[str, Any]) -> Iterable[tuple[str, str, dict[str, Any]]]:
    for path, path_item in spec["paths"].items():
        for method, operation in path_item.items():
            if method in HTTP_METHODS:
                yield path, method, operation


def collect_refs(value: Any) -> Iterable[str]:
    if isinstance(value, dict):
        for key, nested in value.items():
            if key == "$ref" and isinstance(nested, str):
                yield nested
            else:
                yield from collect_refs(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from collect_refs(nested)


def resolve_local_ref(spec: dict[str, Any], reference: str) -> bool:
    if not reference.startswith("#/"):
        return False
    current: Any = spec
    for part in reference[2:].split("/"):
        part = part.replace("~1", "/").replace("~0", "~")
        if not isinstance(current, dict) or part not in current:
            return False
        current = current[part]
    return True


def query_limit(operation: dict[str, Any]) -> int | None:
    for parameter in operation.get("parameters", []):
        if parameter.get("in") == "query" and parameter.get("name") == "limit":
            return parameter["schema"].get("maximum")
    return None


def schema_property(spec: dict[str, Any], schema_name: str, property_name: str) -> dict[str, Any]:
    return spec["components"]["schemas"][schema_name]["properties"][property_name]


def success_schema_reference(operation: dict[str, Any]) -> str | None:
    for status, response in operation["responses"].items():
        if str(status).startswith("2"):
            return response.get("content", {}).get("application/json", {}).get("schema", {}).get("$ref")
    return None


def operation_map(spec: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {operation["operationId"]: operation for _, _, operation in iter_operations(spec)}


def schema_reaches(
    spec: dict[str, Any],
    value: Any,
    target_schema: str,
    visited_schemas: set[str] | None = None,
) -> bool:
    visited = visited_schemas if visited_schemas is not None else set()
    if isinstance(value, dict):
        reference = value.get("$ref")
        prefix = "#/components/schemas/"
        if isinstance(reference, str) and reference.startswith(prefix):
            schema_name = reference[len(prefix):]
            if schema_name == target_schema:
                return True
            if schema_name not in visited:
                visited.add(schema_name)
                schema = spec["components"]["schemas"].get(schema_name)
                if schema is not None and schema_reaches(spec, schema, target_schema, visited):
                    return True
        return any(
            schema_reaches(spec, nested, target_schema, visited)
            for key, nested in value.items()
            if key != "$ref"
        )
    if isinstance(value, list):
        return any(schema_reaches(spec, nested, target_schema, visited) for nested in value)
    return False


def schema_validator(spec: dict[str, Any], schema_name: str) -> Draft202012Validator:
    base_uri = "urn:bnbu:contract"
    registry = Registry().with_resource(base_uri, DRAFT202012.create_resource(spec))
    return Draft202012Validator(
        {"$ref": f"{base_uri}#/components/schemas/{schema_name}"},
        registry=registry,
        format_checker=FormatChecker(),
    )


def fixture_errors(validator: Draft202012Validator, fixture: Any) -> list[str]:
    errors = sorted(validator.iter_errors(fixture), key=lambda error: list(error.absolute_path))
    return [f"{'/'.join(str(part) for part in error.absolute_path) or '<root>'}: {error.message}" for error in errors]


def certification_request_fixture(certification_kind: str) -> dict[str, Any]:
    return {
        "applicationType": "CERTIFICATION",
        "courseId": "00000000-0000-4000-8000-000000000001",
        "certification": {
            "certificationKind": certification_kind,
            "organizationOrTeamName": "BNBU Example Organization",
            "validFrom": "2026-09-01",
            "validTo": "2027-08-31",
        },
        "evidenceAssetIds": ["00000000-0000-4000-8000-000000000002"],
    }


def certification_response_fixture(certification: dict[str, Any]) -> dict[str, Any]:
    return {
        "applicationId": "00000000-0000-4000-8000-000000000003",
        "applicationNumber": "CERT-2026-0001",
        "applicationType": "CERTIFICATION",
        "courseId": "00000000-0000-4000-8000-000000000001",
        "enrollmentId": "00000000-0000-4000-8000-000000000004",
        "student": {
            "studentId": "00000000-0000-4000-8000-000000000005",
            "studentNumber": "20260001",
            "name": "Contract Fixture Student",
            "gender": "FEMALE",
            "gradeYear": 1,
            "college": None,
            "major": None,
            "administrativeClass": None,
            "studentStatus": "ACTIVE",
        },
        "status": "SUBMITTED",
        "certification": deepcopy(certification),
        "evidence": [
            {
                "mediaAssetId": "00000000-0000-4000-8000-000000000002",
                "purpose": "APPLICATION_EVIDENCE",
                "mediaKind": "IMAGE",
                "contentType": "image/jpeg",
                "byteSize": 1024,
                "checksumSha256": "0" * 64,
                "durationMilliseconds": None,
                "hasAudio": None,
                "widthPixels": 100,
                "heightPixels": 100,
                "status": "BOUND",
                "rejectionCode": None,
                "version": 1,
            }
        ],
        "decisions": [],
        "certificationCredit": None,
        "submittedAt": "2026-09-01T00:00:00Z",
        "updatedAt": "2026-09-01T00:00:00Z",
        "version": 1,
    }


def verify_generated_files(check: Verification, openapi_text: str) -> None:
    assembled, registry = assemble()
    expected_openapi = yaml.dump(
        assembled,
        Dumper=ContractDumper,
        allow_unicode=True,
        sort_keys=False,
        width=120,
        default_flow_style=False,
    )
    check.equal(openapi_text, expected_openapi, "openapi.yaml is stale; run build_contract.py")
    check.equal(
        (CONTRACT_ROOT / "operation-catalog.md").read_text(encoding="utf-8"),
        render_catalog(registry),
        "operation-catalog.md is stale; run build_contract.py",
    )
    expected_metadata = {
        "contractVersion": CONTRACT_VERSION,
        "contractStatus": CONTRACT_STATUS,
        "publicBasePath": PUBLIC_BASE_PATH,
        "openapiSha256": hashlib.sha256(expected_openapi.encode("utf-8")).hexdigest(),
        "pathCount": len(registry.paths),
        "operationCount": len(registry.operations),
        "errorCodeCount": len(ERROR_CATALOG),
    }
    actual_metadata = json.loads((CONTRACT_ROOT / "contract-metadata.json").read_text(encoding="utf-8"))
    check.equal(actual_metadata, expected_metadata, "contract-metadata.json is stale; run build_contract.py")


def verify_structure(check: Verification, spec: dict[str, Any]) -> tuple[int, set[str]]:
    check.equal(spec.get("openapi"), "3.1.0", "OpenAPI version")
    check.equal(spec.get("info", {}).get("version"), CONTRACT_VERSION, "Contract version")
    check.equal(spec.get("info", {}).get("x-contract-status"), CONTRACT_STATUS, "Contract status")
    check.equal(spec.get("servers"), [{
        "url": PUBLIC_BASE_PATH,
        "description": "Versioned API base path; environment origin is supplied by deployment configuration.",
    }], "Public base path")

    operation_ids: list[str] = []
    used_permissions: set[str] = set()
    used_error_codes: set[str] = set()
    for path, method, operation in iter_operations(spec):
        operation_id = operation.get("operationId")
        operation_ids.append(operation_id)
        check.check(bool(re.fullmatch(r"[a-z][A-Za-z0-9]+", operation_id or "")), f"Invalid operationId: {operation_id}")
        check.check(path.startswith("/") and not path.startswith(PUBLIC_BASE_PATH), f"Registry path must be base-relative: {path}")

        roles = set(operation.get("x-roles", []))
        check.check(bool(roles), f"{operation_id}: x-roles is required")
        check.check(roles <= ROLE_VALUES, f"{operation_id}: unknown role values {sorted(roles - ROLE_VALUES)}")
        permissions = set(operation.get("x-admin-permissions", []))
        used_permissions.update(permissions)
        check.check(permissions <= ADMIN_PERMISSIONS, f"{operation_id}: unknown admin permissions")
        for extension in ["x-resource-scope", "x-system-mode", "x-idempotency", "x-error-codes"]:
            check.check(extension in operation, f"{operation_id}: missing {extension}")
        check.check(
            operation.get("x-system-mode") in {"NORMAL_REQUIRED", "ALLOWED_DURING_MAINTENANCE"},
            f"{operation_id}: invalid x-system-mode",
        )

        security = operation.get("security")
        if security == []:
            check.check("ANONYMOUS" in roles, f"{operation_id}: public operation must declare ANONYMOUS")
        else:
            check.equal(security, [{"bearerAuth": []}], f"{operation_id}: protected security")
            check.check("ANONYMOUS" not in roles, f"{operation_id}: protected operation cannot declare ANONYMOUS")

        idempotency = operation.get("x-idempotency", {})
        if method in WRITE_METHODS:
            check.check(
                idempotency.get("required") is True or bool(idempotency.get("natural")),
                f"{operation_id}: write operation lacks required or natural idempotency",
            )
        else:
            check.check(idempotency.get("required") is False, f"{operation_id}: GET must not require an idempotency key")
        has_idempotency_parameter = any(
            parameter.get("$ref") == "#/components/parameters/IdempotencyKey"
            for parameter in operation.get("parameters", [])
            if isinstance(parameter, dict)
        )
        check.equal(has_idempotency_parameter, idempotency.get("required") is True, f"{operation_id}: Idempotency-Key declaration")

        template_parameters = set(re.findall(r"\{([^}]+)\}", path))
        declared_path_parameters = {
            parameter.get("name")
            for parameter in operation.get("parameters", [])
            if isinstance(parameter, dict) and parameter.get("in") == "path"
        }
        check.equal(declared_path_parameters, template_parameters, f"{operation_id}: path parameter declarations")

        responses = operation.get("responses", {})
        check.check(any(str(status).startswith("2") for status in responses), f"{operation_id}: missing success response")
        check.check(any(str(status).startswith("4") for status in responses), f"{operation_id}: missing client-error response")
        declared_error_codes = operation.get("x-error-codes", [])
        expected_error_statuses = {str(ERROR_CATALOG[code]["status"]) for code in declared_error_codes if code in ERROR_CATALOG}
        actual_error_statuses = {str(status) for status in responses if not str(status).startswith("2")}
        check.equal(actual_error_statuses, expected_error_statuses, f"{operation_id}: exact Error/status response set")
        for error_code in declared_error_codes:
            used_error_codes.add(error_code)
            check.check(error_code in ERROR_CATALOG, f"{operation_id}: unknown error {error_code}")
            if error_code in ERROR_CATALOG:
                check.check(str(ERROR_CATALOG[error_code]["status"]) in responses, f"{operation_id}: missing status for {error_code}")

    check.equal(len(operation_ids), len(set(operation_ids)), "operationId uniqueness")
    check.check(CORE_OPERATION_IDS <= set(operation_ids), f"Missing core operations: {sorted(CORE_OPERATION_IDS - set(operation_ids))}")
    check.equal(used_permissions, ADMIN_PERMISSIONS, "The fixed eight administrator permissions")
    check.equal(used_error_codes, set(ERROR_CATALOG), "Every declared Contract error code must belong to an operation")

    for reference in collect_refs(spec):
        check.check(resolve_local_ref(spec, reference), f"Unresolved or external $ref: {reference}")
    return len(operation_ids), set(operation_ids)


def verify_public_rules(check: Verification, spec: dict[str, Any]) -> None:
    schemas = spec["components"]["schemas"]
    error_envelope = schemas["ErrorEnvelope"]
    check.equal(error_envelope.get("required"), ["code", "message", "requestId", "details"], "ErrorEnvelope fields")
    check.equal(error_envelope.get("additionalProperties"), False, "ErrorEnvelope additional properties")
    check.equal(error_envelope.get("example", {}).get("details"), None, "ErrorEnvelope null example")

    permission_values = set(schemas["AdminPermission"]["enum"])
    check.equal(permission_values, ADMIN_PERMISSIONS, "AdminPermission enum")
    check.equal(set(schemas["ErrorCode"]["enum"]), set(ERROR_CATALOG), "ErrorCode schema/catalog consistency")
    check.equal(
        set(schema_property(spec, "ExerciseSession", "status")["enum"]),
        {"ACTIVE", "PAUSED", "COMPLETED"},
        "Session state machine",
    )
    check.equal(
        set(schema_property(spec, "RecordReviewSummary", "result")["enum"]),
        {"VALID", "INVALID"},
        "Record review state",
    )
    check.equal(set(schemas["ApplicationStatus"]["enum"]), {"SUBMITTED", "SUPPLEMENT_REQUIRED", "APPROVED", "REJECTED"}, "Application state")
    check.equal(set(schemas["TeacherSummary"]["properties"]), {"teacherId", "name"}, "Student-visible teacher fields")
    check.check("invitationId" not in schemas["CourseInvitationPreview"]["properties"], "Public invitation preview must not expose invitationId")
    check.check("invitationCode" not in schemas["CourseInvitation"]["properties"], "Stored invitation DTO must not expose the raw code")
    check.equal(
        set(schema_property(spec, "CourseInvitation", "status")["enum"]),
        {"ACTIVE", "EXPIRED", "REVOKED", "COURSE_CLOSED", "NOT_CURRENT"},
        "Teacher invitation-management states",
    )
    check.check("revocable" in schemas["CourseInvitation"]["required"], "Teacher invitation metadata must declare revocable")
    check.equal(
        schema_property(spec, "CourseInvitationPreview", "course"),
        {"$ref": "#/components/schemas/InvitationCourseSummary"},
        "Recognized invitation preview course projection",
    )
    check.check(
        "anyOf" not in schema_property(spec, "CourseInvitationPreview", "expiresAt"),
        "Recognized invitation preview expiry must not be nullable",
    )
    check.equal(
        set(schemas["CreatedCourseInvitation"]["properties"]),
        {"invitation", "invitationCode"},
        "Invitation creation secret response fields",
    )
    check.check("activeMemberCount" not in schemas["StudentCourse"]["properties"], "Student course must not expose member counts")
    check.check("version" not in schemas["SemesterSummary"]["properties"], "Cross-role semester summary must not expose admin concurrency metadata")
    check.equal(schemas["DirectUploadHttpMethod"].get("enum"), ["PUT"], "Direct-upload HTTP method")
    for allocation_schema in ["MediaAllocation", "UploadAllocation"]:
        check.equal(
            schema_property(spec, allocation_schema, "uploadMethod"),
            {"$ref": "#/components/schemas/DirectUploadHttpMethod"},
            f"{allocation_schema} upload method",
        )
        check.check("uploadMethod" in schemas[allocation_schema]["required"], f"{allocation_schema} uploadMethod required")

    check.equal(
        schema_property(spec, "StudentDashboard", "student"),
        {"$ref": "#/components/schemas/StudentSummary"},
        "Stable authenticated student profile projection",
    )
    check.check("student" in schemas["StudentDashboard"]["required"], "Student dashboard profile must be required")
    check.check(
        "anyOf" in schema_property(spec, "TeacherDashboard", "currentSemester"),
        "Teacher dashboard current semester must expose the no-current empty state",
    )

    summary_fields = {
        "SemesterManagementSummary": {"currentSemester", "upcomingCount", "archivedCount", "generatedAt"},
        "AdminFeedbackSummary": {"totalCount", "pendingCount", "waitingTechCount", "completedCount", "generatedAt"},
        "HelpArticleAdminSummary": {"publishedCount", "draftCount", "archivedCount", "generatedAt"},
        "SubAdminGovernanceSummary": {"totalCount", "activeCount", "generatedAt"},
    }
    for schema_name, fields in summary_fields.items():
        check.equal(set(schemas[schema_name]["properties"]), fields, f"{schema_name} fields")
        check.equal(set(schemas[schema_name].get("required", [])), fields, f"{schema_name} required fields")

    check.equal(
        set(schemas["MediaFinalizationRejectionCode"]["enum"]),
        {
            "MEDIA_ALLOCATION_EXPIRED",
            "MEDIA_CONTENT_INVALID",
            "MEDIA_LIMIT_EXCEEDED",
            "PAYLOAD_TOO_LARGE",
            "UNSUPPORTED_MEDIA_TYPE",
        },
        "Media finalization expected outcome codes",
    )
    check.equal(len(schemas["MediaAsset"].get("allOf", [])), 3, "MediaAsset status/rejection invariants")

    check.equal(schema_property(spec, "CourseTargets", "totalTargetMinutes").get("const"), 1200, "20-hour target")
    check.equal(schema_property(spec, "ExerciseRecord", "creditedMinutes").get("enum"), [0, 60, 120], "Credited-minute values")
    check.equal(schema_property(spec, "SubmitExerciseRecordRequest", "description").get("maxLength"), 200, "Record description length")
    check.equal(schema_property(spec, "SubmitExerciseRecordRequest", "mediaAssetIds").get("maxItems"), 7, "Record aggregate media count")
    check.equal(schema_property(spec, "RecordImageMediaAllocationRequest", "declaredByteSize").get("maximum"), 10 * 1024 * 1024, "Record image size")
    check.equal(schema_property(spec, "RecordVideoMediaAllocationRequest", "declaredByteSize").get("maximum"), 100 * 1024 * 1024, "Record video size")
    check.equal(schema_property(spec, "ApplicationMediaAllocationRequest", "declaredByteSize").get("maximum"), 10 * 1024 * 1024, "Application image size")
    check.equal(schema_property(spec, "RosterImportAllocationRequest", "byteSize").get("maximum"), 100 * 1024 * 1024, "Roster source size")
    check.equal(
        schema_property(spec, "CreateExemptionApplicationRequest", "evidenceAssetIds").get("maxItems"),
        3,
        "Exemption evidence count",
    )
    check.equal(
        schema_property(spec, "CreateCertificationApplicationRequest", "evidenceAssetIds").get("maxItems"),
        3,
        "Certification evidence count",
    )
    check.equal(schema_property(spec, "PublishFinalGradeRequest", "gradeValue").get("format"), "int32", "Final grade representation")
    check.check("minimum" not in schema_property(spec, "PublishFinalGradeRequest", "gradeValue"), "Final grade must not add a minimum")
    check.check("maximum" not in schema_property(spec, "PublishFinalGradeRequest", "gradeValue"), "Final grade must not add a maximum")
    check.equal(schema_property(spec, "PublishFinalGradeRequest", "remark")["anyOf"][0].get("maxLength"), 50, "Final-grade remark length")

    operations = {operation["operationId"]: operation for _, _, operation in iter_operations(spec)}
    check.equal(operations["getCourse"]["x-roles"], ["TEACHER"], "Teacher course-detail role boundary")
    check.equal(
        success_schema_reference(operations["getOwnCurrentCourse"]),
        "#/components/schemas/StudentCourse",
        "Student course response DTO",
    )
    check.equal(
        success_schema_reference(operations["previewCourseInvitation"]),
        "#/components/schemas/CourseInvitationPreview",
        "Invitation preview response DTO",
    )
    check.equal(
        success_schema_reference(operations["createCourseInvitation"]),
        "#/components/schemas/CreatedCourseInvitation",
        "Invitation creation response DTO",
    )
    check.equal(
        operations["createCourseInvitation"]["x-idempotency"].get("sensitiveResponse"),
        {
            "exposure": "INITIAL_OR_EXACT_REPLAY_ONLY",
            "rawSecretPersistence": "PROHIBITED",
            "logging": "PROHIBITED",
            "reproduction": "Exact replays must reproduce the committed secret response without storing the raw secret.",
        },
        "Invitation secret replay and persistence rules",
    )
    check.equal(
        success_schema_reference(operations["listCourseInvitations"]),
        "#/components/schemas/CourseInvitationPage",
        "Recoverable teacher invitation-management response",
    )
    check.equal(operations["listCourseInvitations"]["x-roles"], ["TEACHER"], "Invitation-management role boundary")
    check.equal(
        success_schema_reference(operations["finalizeMediaAsset"]),
        "#/components/schemas/MediaFinalizationResult",
        "Media finalization unique expected-outcome channel",
    )
    expected_media_outcome_codes = {
        "MEDIA_ALLOCATION_EXPIRED",
        "MEDIA_CONTENT_INVALID",
        "MEDIA_LIMIT_EXCEEDED",
        "PAYLOAD_TOO_LARGE",
        "UNSUPPORTED_MEDIA_TYPE",
    }
    check.check(
        not expected_media_outcome_codes.intersection(operations["finalizeMediaAsset"]["x-error-codes"]),
        "Expected media terminal outcomes must not also be ErrorEnvelope codes on finalizeMediaAsset",
    )
    check.check(
        "RESOURCE_NOT_FOUND" in operations["getOwnActiveExerciseSession"]["x-error-codes"]
        and "404" in operations["getOwnActiveExerciseSession"]["responses"],
        "Active-session absence must be 404 RESOURCE_NOT_FOUND",
    )
    check.check(
        "RESOURCE_NOT_FOUND" in operations["getCurrentSemester"]["x-error-codes"]
        and "404" in operations["getCurrentSemester"]["responses"],
        "Current-semester absence must be 404 RESOURCE_NOT_FOUND",
    )
    check.check(
        "INVITATION_INVALID" in operations["previewCourseInvitation"]["x-error-codes"]
        and "422" in operations["previewCourseInvitation"]["responses"],
        "Unknown invitation preview must be 422 INVITATION_INVALID",
    )
    check.check(
        "SEMESTER_NOT_CURRENT" in operations["createCourse"]["x-error-codes"]
        and "SEMESTER_NOT_UPCOMING" not in operations["createCourse"]["x-error-codes"],
        "Course creation must target the unique CURRENT semester",
    )
    check.check(
        "RESOURCE_NOT_FOUND" in operations["createCourse"]["x-error-codes"]
        and "404" in operations["createCourse"]["responses"]
        and "409" in operations["createCourse"]["responses"],
        "Course creation semester target status mapping",
    )
    check.equal(
        success_schema_reference(operations["listFeedbackForAdmin"]),
        "#/components/schemas/AdminFeedbackPage",
        "Admin feedback summary response",
    )
    check.equal(
        success_schema_reference(operations["listHelpArticlesForAdmin"]),
        "#/components/schemas/HelpArticleAdminPage",
        "Admin help summary response",
    )
    check.equal(
        success_schema_reference(operations["listSemesters"]),
        "#/components/schemas/SemesterPage",
        "Semester management summary response",
    )
    check.equal(
        success_schema_reference(operations["listSubAdmins"]),
        "#/components/schemas/SubAdminPage",
        "Sub-administrator governance summary response",
    )
    check.check(
        "ACCOUNT_DELETION_BLOCKED" not in operations["deleteTeacherAccount"]["x-error-codes"],
        "Teacher deletion must not restore the revoked course-responsibility handoff blocker",
    )
    check.check(
        "responsibleCourseCount" not in schemas["TeacherAccount"]["properties"],
        "TeacherAccount must not expose the revoked deletion-blocker count",
    )
    blocker_schema = schema_property(spec, "AccountDeletionImpact", "blockers")["items"]["properties"]["code"]
    check.check(
        "COURSE_RESPONSIBILITY" not in blocker_schema["enum"],
        "Own-account deletion impact must not restore a teacher course-responsibility blocker",
    )
    check.equal(schemas["AuditSafeMetadata"].get("additionalProperties"), False, "Audit metadata closed schema")
    check.equal(query_limit(operations["listOwnFeedback"]), 6, "Student feedback page maximum")
    check.equal(query_limit(operations["listFeedbackForAdmin"]), 6, "Admin feedback page maximum")
    check.equal(query_limit(operations["listPublishedHelpArticles"]), 5, "Published help page maximum")
    check.equal(query_limit(operations["listHelpArticlesForAdmin"]), 5, "Admin help page maximum")
    check.equal(query_limit(operations["listAuditEvents"]), 50, "Audit page maximum")

    upload_policies = spec.get("x-upload-policies", {})
    check.equal(upload_policies.get("RECORD_EVIDENCE", {}).get("aggregateMaxBytes"), 250 * 1024 * 1024, "Record aggregate upload bytes")
    check.equal(upload_policies.get("RECORD_EVIDENCE", {}).get("video", {}).get("durationSeconds"), {"minimum": 1, "maximum": 15}, "Record video duration")
    check.equal(upload_policies.get("APPLICATION_EVIDENCE", {}).get("aggregateMaxCount"), 3, "Application evidence aggregate count")
    check.equal(upload_policies.get("ROSTER_SOURCE", {}).get("dataRowMaximum"), 500, "Roster data-row maximum")


def verify_password_contract_cr(check: Verification, spec: dict[str, Any]) -> None:
    schemas = spec["components"]["schemas"]
    operations = operation_map(spec)

    check.equal(len(PASSWORD_NEW_ADMIN_GATE_OPERATION_IDS), 40, "Password CR exact new Admin gate operation count")
    check.check(
        PASSWORD_NEW_ADMIN_GATE_OPERATION_IDS <= set(operations),
        "Password CR new Admin gate operation list must resolve completely",
    )
    for operation_id in sorted(PASSWORD_NEW_ADMIN_GATE_OPERATION_IDS):
        operation = operations[operation_id]
        check.check("ADMIN" in operation["x-roles"], f"{operation_id}: Password CR gate target must include ADMIN")
        check.check(
            "FIRST_PASSWORD_CHANGE_REQUIRED" in operation["x-error-codes"],
            f"{operation_id}: missing FIRST_PASSWORD_CHANGE_REQUIRED",
        )
        check.check("403" in operation["responses"], f"{operation_id}: missing 403 response for first-password gate")

    expected_admin_gated = PASSWORD_NEW_ADMIN_GATE_OPERATION_IDS | PASSWORD_EXISTING_ADMIN_GATE_OPERATION_IDS
    actual_admin_gated = {
        operation_id
        for operation_id, operation in operations.items()
        if "ADMIN" in operation["x-roles"] and "FIRST_PASSWORD_CHANGE_REQUIRED" in operation["x-error-codes"]
    }
    check.equal(actual_admin_gated, expected_admin_gated, "Password CR exact Admin first-password gate surface")

    check.check(PASSWORD_GATE_SAFE_OPERATION_IDS <= set(operations), "Password CR gate-safe operation list must resolve")
    for operation_id in sorted(PASSWORD_GATE_SAFE_OPERATION_IDS):
        check.check(
            "FIRST_PASSWORD_CHANGE_REQUIRED" not in operations[operation_id]["x-error-codes"],
            f"{operation_id}: gate-safe operation must remain accessible",
        )

    first_password_description = spec["x-error-catalog"]["FIRST_PASSWORD_CHANGE_REQUIRED"]["description"].lower()
    check.check(
        "teacher or administrator" in first_password_description and "temporary initial password" in first_password_description,
        "FIRST_PASSWORD_CHANGE_REQUIRED must be role-neutral for Teacher/Admin temporary passwords",
    )

    current_gate = schema_property(spec, "CurrentActor", "mustChangePassword")
    current_gate_description = current_gate.get("description", "").lower()
    check.equal(current_gate.get("type"), "boolean", "CurrentActor.mustChangePassword type")
    check.check(
        all(
            phrase in current_gate_description
            for phrase in ["teacher/admin", "temporary initial", "self password change", "self reset", "false"]
        ),
        "CurrentActor.mustChangePassword must describe role-neutral set/clear semantics",
    )

    create_sub_admin = operations["createSubAdmin"]
    create_sub_admin_description = create_sub_admin["description"].lower()
    create_sub_admin_schema_description = schemas["CreateSubAdminRequest"].get("description", "").lower()
    check.check(
        "temporary password" in create_sub_admin_description and "mustchangepassword=true" in create_sub_admin_description,
        "createSubAdmin must set the temporary-password gate",
    )
    check.check(
        "temporary password" in create_sub_admin_schema_description
        and "mustchangepassword=true" in create_sub_admin_schema_description,
        "CreateSubAdminRequest must describe temporary-password semantics",
    )

    update_sub_admin = schemas["UpdateSubAdminRequest"]
    expected_update_fields = {"name", "verifiedEmail", "department", "permissions", "expectedVersion"}
    check.equal(set(update_sub_admin["properties"]), expected_update_fields, "UpdateSubAdminRequest exact fields")
    check.equal(set(update_sub_admin["required"]), expected_update_fields, "UpdateSubAdminRequest exact required fields")
    check.equal(update_sub_admin.get("additionalProperties"), False, "UpdateSubAdminRequest unknown-field rejection")
    check.check(
        not any(
            token in property_name.lower()
            for property_name in update_sub_admin["properties"]
            for token in ("password", "credential", "secret")
        ),
        "UpdateSubAdminRequest must not retain a substitute credential field",
    )
    check.check(
        "password" not in operations["updateSubAdmin"]["summary"].lower(),
        "updateSubAdmin summary must not advertise password replacement",
    )

    change_password = operations["changeOwnPassword"]
    change_password_description = change_password["description"].lower()
    check.equal(set(change_password["x-roles"]), {"TEACHER", "ADMIN"}, "changeOwnPassword role surface")
    check.check(
        "ACCOUNT_DISABLED" in change_password["x-error-codes"] and "403" in change_password["responses"],
        "changeOwnPassword disabled-account contract",
    )
    check.check(
        all(
            phrase in change_password_description
            for phrase in ["active teacher/admin", "preserves the current session", "revokes every other session", "mustchangepassword=false"]
        ),
        "changeOwnPassword self/session/gate-clear semantics",
    )

    reset_password = operations["resetPassword"]
    reset_password_description = reset_password["description"].lower()
    check.check(
        "ACCOUNT_DISABLED" in reset_password["x-error-codes"] and "403" in reset_password["responses"],
        "resetPassword disabled-account contract",
    )
    check.check(
        all(
            phrase in reset_password_description
            for phrase in [
                "final personal password",
                "mustchangepassword",
                "revokes every prior session",
                "returns no token",
                "does not automatically log in",
                "disabled",
                "anti-enumeration",
            ]
        ),
        "resetPassword self-reset/session/gate-clear/anti-enumeration semantics",
    )
    request_challenge = operations["requestAuthChallenge"]
    check.check(
        "202" in request_challenge["responses"]
        and "without revealing whether the target account exists" in request_challenge["description"].lower(),
        "requestAuthChallenge anti-enumeration behavior",
    )

    for schema_name in ["PasswordChangeRequest", "PasswordResetRequest"]:
        new_password = schema_property(spec, schema_name, "newPassword")
        check.equal(new_password.get("minLength"), 1, f"{schema_name}.newPassword non-empty rule")
        check.check("maxLength" not in new_password, f"{schema_name}.newPassword must not add a maximum")
        check.check("pattern" not in new_password, f"{schema_name}.newPassword must not add composition rules")

    declared_forbidden_errors = FORBIDDEN_PASSWORD_ERROR_CODES.intersection(spec["x-error-catalog"])
    schema_forbidden_errors = FORBIDDEN_PASSWORD_ERROR_CODES.intersection(schemas["ErrorCode"]["enum"])
    operation_forbidden_errors = {
        code
        for operation in operations.values()
        for code in operation["x-error-codes"]
        if code in FORBIDDEN_PASSWORD_ERROR_CODES
    }
    check.equal(declared_forbidden_errors, set(), "Forbidden password errors in catalog")
    check.equal(schema_forbidden_errors, set(), "Forbidden password errors in ErrorCode")
    check.equal(operation_forbidden_errors, set(), "Forbidden password errors on operations")


def verify_certification_contract_cr(check: Verification, spec: dict[str, Any]) -> None:
    schemas = spec["components"]["schemas"]
    operations = operation_map(spec)
    certification_kind = schemas["CertificationKind"]
    certification_details = schemas["CertificationDetails"]

    check.equal(certification_kind, {"type": "string", "enum": ["SCHOOL_TEAM", "STUDENT_CLUB"]}, "CertificationKind closed enum")
    check.equal(schemas["ApplicationType"]["enum"], ["EXEMPTION", "CERTIFICATION"], "ApplicationType must remain unchanged")
    check.equal(
        certification_details["properties"]["certificationKind"],
        {"$ref": "#/components/schemas/CertificationKind"},
        "CertificationDetails.certificationKind reference",
    )
    expected_detail_fields = {"certificationKind", "organizationOrTeamName", "validFrom", "validTo"}
    check.equal(set(certification_details["properties"]), expected_detail_fields, "CertificationDetails exact fields")
    check.equal(set(certification_details["required"]), expected_detail_fields, "CertificationDetails required fields")
    check.equal(certification_details.get("additionalProperties"), False, "CertificationDetails closed object")
    check.check(
        "anyOf" not in certification_details["properties"]["certificationKind"],
        "CertificationDetails.certificationKind must be non-null",
    )

    request_operations = {
        operation_id
        for operation_id, operation in operations.items()
        if schema_reaches(
            spec,
            operation.get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema", {}),
            "CertificationDetails",
        )
    }
    response_operations = {
        operation_id
        for operation_id, operation in operations.items()
        if (reference := success_schema_reference(operation))
        and schema_reaches(spec, {"$ref": reference}, "CertificationDetails")
    }
    check.equal(request_operations, {"createStudentApplication"}, "CertificationDetails request operation surface")
    check.equal(response_operations, CERTIFICATION_RESPONSE_OPERATION_IDS, "CertificationDetails response operation surface")

    certification_query_parameters = {
        (operation_id, parameter.get("name"))
        for operation_id, operation in operations.items()
        for parameter in operation.get("parameters", [])
        if parameter.get("in") == "query" and parameter.get("name") == "certificationKind"
    }
    check.equal(certification_query_parameters, set(), "CertificationKind must not add a query filter")

    request_validator = schema_validator(spec, "CreateCertificationApplicationRequest")
    response_validator = schema_validator(spec, "StudentApplication")
    for certification_kind_value in ["SCHOOL_TEAM", "STUDENT_CLUB"]:
        request_fixture = certification_request_fixture(certification_kind_value)
        response_fixture = certification_response_fixture(request_fixture["certification"])
        check.equal(
            fixture_errors(request_validator, request_fixture),
            [],
            f"{certification_kind_value} certification request fixture",
        )
        check.equal(
            fixture_errors(response_validator, response_fixture),
            [],
            f"{certification_kind_value} certification response fixture",
        )
        check.equal(
            response_fixture["certification"],
            request_fixture["certification"],
            f"{certification_kind_value} certification round-trip",
        )

    base_request = certification_request_fixture("SCHOOL_TEAM")
    invalid_certifications: dict[str, dict[str, Any]] = {}

    missing_kind = deepcopy(base_request["certification"])
    missing_kind.pop("certificationKind")
    invalid_certifications["missing certificationKind"] = missing_kind

    null_kind = deepcopy(base_request["certification"])
    null_kind["certificationKind"] = None
    invalid_certifications["null certificationKind"] = null_kind

    unknown_kind = deepcopy(base_request["certification"])
    unknown_kind["certificationKind"] = "UNKNOWN_KIND"
    invalid_certifications["unknown certificationKind"] = unknown_kind

    name_as_kind = deepcopy(base_request["certification"])
    name_as_kind.pop("certificationKind")
    name_as_kind["organizationOrTeamName"] = "SCHOOL_TEAM"
    invalid_certifications["organization name substituted for kind"] = name_as_kind

    private_subtype = deepcopy(base_request["certification"])
    private_subtype["applicationSubtype"] = "SCHOOL_TEAM"
    invalid_certifications["extra private subtype"] = private_subtype

    for label, invalid_certification in invalid_certifications.items():
        invalid_request = deepcopy(base_request)
        invalid_request["certification"] = invalid_certification
        invalid_response = certification_response_fixture(invalid_certification)
        check.check(bool(fixture_errors(request_validator, invalid_request)), f"Request must reject {label}")
        check.check(bool(fixture_errors(response_validator, invalid_response)), f"Response must reject {label}")


def verify_rejected_dashboard_cr_and_consolidation(check: Verification, spec: dict[str, Any]) -> None:
    schemas = spec["components"]["schemas"]
    operations = operation_map(spec)

    check.equal(
        schema_property(spec, "StudentDashboard", "currentSemester"),
        {"$ref": "#/components/schemas/SemesterSummary"},
        "Rejected CR-20260901-004: StudentDashboard.currentSemester remains non-null",
    )
    check.check(
        "currentSemester" in schemas["StudentDashboard"]["required"],
        "Rejected CR-20260901-004: StudentDashboard.currentSemester remains required",
    )
    check.check(
        "RESOURCE_NOT_FOUND" not in operations["getStudentDashboard"]["x-error-codes"]
        and "404" not in operations["getStudentDashboard"]["responses"],
        "Rejected CR-20260901-004: getStudentDashboard must not add no-current 404",
    )
    check.check(
        "RESOURCE_NOT_FOUND" in operations["getCurrentSemester"]["x-error-codes"]
        and "404" in operations["getCurrentSemester"]["responses"],
        "Standalone getCurrentSemester no-current behavior",
    )
    check.equal(
        schema_property(spec, "TeacherDashboard", "currentSemester"),
        {"anyOf": [{"$ref": "#/components/schemas/SemesterSummary"}, {"type": "null"}]},
        "TeacherDashboard no-current nullable behavior",
    )

    accepted_change_requests = set(spec["x-contract-governance"]["acceptedPhase5ChangeRequests"])
    check.check(
        {"CR-20260901-002", "CR-20260901-003"} <= accepted_change_requests,
        "Final consolidation must record both accepted CRs",
    )
    check.check(
        not {"CR-20260901-001", "CR-20260901-004"}.intersection(accepted_change_requests),
        "Rejected CRs must not enter accepted Contract governance",
    )
    check.equal(len(spec["paths"]), 109, "Final Contract path count")
    check.equal(len(list(iter_operations(spec))), 121, "Final Contract operation count")
    check.equal(len(schemas), 193, "Final Contract schema count")
    check.equal(len(spec["x-error-catalog"]), 66, "Final Contract error count")


def main() -> None:
    check = Verification()
    openapi_path = CONTRACT_ROOT / "openapi.yaml"
    openapi_text = openapi_path.read_text(encoding="utf-8")
    try:
        spec = yaml.load(openapi_text, Loader=UniqueKeyLoader)
    except yaml.YAMLError as error:
        raise SystemExit(f"Contract verification FAILED: invalid YAML: {error}") from error

    verify_generated_files(check, openapi_text)
    operation_count, _ = verify_structure(check, spec)
    verify_public_rules(check, spec)
    verify_password_contract_cr(check, spec)
    verify_certification_contract_cr(check, spec)
    verify_rejected_dashboard_cr_and_consolidation(check, spec)

    if check.errors:
        print(f"Contract verification FAILED with {len(check.errors)} problem(s):")
        for error in check.errors:
            print(f"- {error}")
        raise SystemExit(1)

    print(
        "Contract verification PASS: "
        f"{len(spec['paths'])} paths, {operation_count} unique operations, "
        f"{len(spec['components']['schemas'])} schemas, {len(ERROR_CATALOG)} error codes."
    )


if __name__ == "__main__":
    main()
