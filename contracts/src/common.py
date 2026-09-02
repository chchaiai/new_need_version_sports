from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Any, Iterable


Schema = dict[str, Any]


def ref(name: str) -> Schema:
    return {"$ref": f"#/components/schemas/{name}"}


def nullable(schema: Schema) -> Schema:
    return {"anyOf": [deepcopy(schema), {"type": "null"}]}


def array_of(schema: Schema, *, min_items: int | None = None, max_items: int | None = None) -> Schema:
    value: Schema = {"type": "array", "items": deepcopy(schema)}
    if min_items is not None:
        value["minItems"] = min_items
    if max_items is not None:
        value["maxItems"] = max_items
    return value


def object_schema(
    properties: dict[str, Schema],
    required: Iterable[str] = (),
    *,
    description: str | None = None,
) -> Schema:
    value: Schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": deepcopy(properties),
    }
    required_values = list(required)
    if required_values:
        value["required"] = required_values
    if description:
        value["description"] = description
    return value


def string_schema(
    *,
    description: str | None = None,
    enum: list[str] | None = None,
    min_length: int | None = None,
    max_length: int | None = None,
    pattern: str | None = None,
    fmt: str | None = None,
    write_only: bool = False,
) -> Schema:
    value: Schema = {"type": "string"}
    if description:
        value["description"] = description
    if enum is not None:
        value["enum"] = enum
    if min_length is not None:
        value["minLength"] = min_length
    if max_length is not None:
        value["maxLength"] = max_length
    if pattern is not None:
        value["pattern"] = pattern
    if fmt is not None:
        value["format"] = fmt
    if write_only:
        value["writeOnly"] = True
    return value


def integer_schema(
    *,
    description: str | None = None,
    fmt: str = "int64",
    minimum: int | None = None,
    maximum: int | None = None,
) -> Schema:
    value: Schema = {"type": "integer", "format": fmt}
    if description:
        value["description"] = description
    if minimum is not None:
        value["minimum"] = minimum
    if maximum is not None:
        value["maximum"] = maximum
    return value


def number_schema(
    *,
    description: str | None = None,
    minimum: float | None = None,
    maximum: float | None = None,
) -> Schema:
    value: Schema = {"type": "number"}
    if description:
        value["description"] = description
    if minimum is not None:
        value["minimum"] = minimum
    if maximum is not None:
        value["maximum"] = maximum
    return value


UUID = string_schema(fmt="uuid", description="Opaque public identifier; clients must not infer meaning from it.")
INSTANT = string_schema(
    fmt="date-time",
    pattern="^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?Z$",
    description="RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.",
)
LOCAL_DATE = string_schema(fmt="date", description="Calendar date; never reinterpret as UTC midnight.")
VERSION = integer_schema(minimum=0, description="Optimistic-concurrency version.")
NON_EMPTY_TEXT = string_schema(min_length=1, description="Trimmed, non-empty text.")
EMAIL = string_schema(fmt="email", min_length=3, description="Normalized school email address.")
SHA256 = string_schema(pattern="^[A-Fa-f0-9]{64}$", description="Hex-encoded SHA-256 checksum.")


# CR-20260901-002 AC-02: this is the independently reviewed, exact list of
# administrator business operations that newly acquire the first-password gate.
# Operations already gated through their shared TEACHER role and gate-safe
# recovery/session operations are intentionally not part of this set.
ADMIN_FIRST_PASSWORD_CHANGE_GATED_OPERATION_IDS = frozenset(
    {
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
)


ERROR_CATALOG: dict[str, dict[str, Any]] = {
    "INVALID_REQUEST": {"status": 400, "description": "Request shape, syntax, or cross-field combination is invalid."},
    "INVALID_CURSOR": {"status": 400, "description": "The opaque pagination cursor is invalid or no longer applicable."},
    "AUTHENTICATION_REQUIRED": {"status": 401, "description": "A valid authenticated session is required."},
    "INVALID_CREDENTIALS": {"status": 401, "description": "The supplied password, OTP, or refresh credential is invalid."},
    "TOKEN_EXPIRED": {"status": 401, "description": "The access or refresh credential has expired."},
    "CHALLENGE_EXPIRED": {"status": 401, "description": "The verification challenge has expired or was already consumed."},
    "ACCOUNT_DISABLED": {
        "status": 403,
        "description": "The authenticated account or the account resolved from valid recovery proof is disabled.",
    },
    "FIRST_PASSWORD_CHANGE_REQUIRED": {
        "status": 403,
        "description": "A teacher or administrator must replace a temporary initial password before other role business use cases.",
    },
    "FORBIDDEN": {"status": 403, "description": "The actor lacks the required role, permission, ownership, or organization scope."},
    "RESOURCE_NOT_FOUND": {"status": 404, "description": "The resource does not exist in the actor's authorized scope."},
    "IDEMPOTENCY_KEY_REUSED": {"status": 409, "description": "The same idempotency key was reused with a different normalized command."},
    "VERSION_CONFLICT": {"status": 412, "description": "The expected version is stale; reload the latest representation."},
    "VALIDATION_FAILED": {"status": 422, "description": "The request is well formed but violates a declared field or domain constraint."},
    "PAYLOAD_TOO_LARGE": {"status": 413, "description": "A declared or authoritative file size exceeds the Contract limit."},
    "UNSUPPORTED_MEDIA_TYPE": {"status": 415, "description": "The authoritative file type is not allowed for this purpose."},
    "RATE_LIMITED": {"status": 429, "description": "The caller must wait before retrying."},
    "SYSTEM_MAINTENANCE": {"status": 503, "description": "The operation is fail-closed because the current system mode is not NORMAL."},
    "DEPENDENCY_UNAVAILABLE": {"status": 503, "description": "A required database, object-storage, or approved dependency is unavailable."},
    "INTERNAL_ERROR": {"status": 500, "description": "An unclassified server failure occurred without exposing internal details."},
    "EMAIL_ALREADY_IN_USE": {"status": 409, "description": "The verified school email is already used by a current account."},
    "LOGIN_NAME_ALREADY_IN_USE": {"status": 409, "description": "The sub-administrator login name is already used."},
    "STUDENT_NUMBER_ALREADY_IN_USE": {"status": 409, "description": "The student number is already used in the organization."},
    "EMPLOYEE_ID_ALREADY_IN_USE": {"status": 409, "description": "The teacher employee ID is already used in the organization."},
    "ACCOUNT_DELETION_BLOCKED": {"status": 409, "description": "An in-progress student session or uncompleted sub-administrator responsibility blocks account deletion."},
    "ADMIN_RESPONSIBILITY_BLOCKED": {"status": 409, "description": "Uncompleted sub-administrator responsibilities block disablement or deletion."},
    "INVITATION_INVALID": {
        "status": 422,
        "description": (
            "For preview, the presented invitation code is unknown, malformed, or cannot be safely projected. "
            "For join commands, it also covers a known invitation that is not currently joinable."
        ),
    },
    "COURSE_ALREADY_JOINED": {"status": 409, "description": "The student already has an active course in the current semester."},
    "ENROLLMENT_NOT_ACTIVE": {"status": 409, "description": "The enrollment is not active for this use case."},
    "COURSE_NOT_OPEN": {"status": 409, "description": "The course is closed and rejects the requested mutation."},
    "COURSE_TARGET_TOTAL_INVALID": {"status": 422, "description": "Course-related and other targets must total exactly 1200 minutes."},
    "COURSE_TARGET_BELOW_ACTIVE_CREDIT": {"status": 409, "description": "A proposed target is lower than an active certification credit."},
    "COURSE_CLOSE_BLOCKED": {"status": 409, "description": "An active session, unresolved roster item, application, endurance item, or grade item blocks closing."},
    "SEMESTER_COMBINATION_EXISTS": {"status": 409, "description": "The academic-year and term-type combination already exists."},
    "SEMESTER_NOT_UPCOMING": {"status": 409, "description": "Only an UPCOMING semester may be edited or made current."},
    "SEMESTER_NOT_CURRENT": {
        "status": 409,
        "description": "The target semester exists but is not the organization's unique CURRENT semester, including when none is current.",
    },
    "SEMESTER_START_DATE_NOT_REACHED": {"status": 409, "description": "The target semester start date has not been reached in Asia/Shanghai."},
    "ROSTER_SOURCE_INVALID": {"status": 422, "description": "The XLSX or CSV source cannot be parsed or lacks the required structure."},
    "ROSTER_ROW_LIMIT_EXCEEDED": {"status": 413, "description": "The roster contains more than 500 data rows; invalid and duplicate rows still count."},
    "ROSTER_FINDING_ALREADY_RESOLVED": {"status": 409, "description": "The roster finding has already been resolved and is immutable."},
    "ROSTER_SNAPSHOT_NOT_IN_COURSE": {"status": 422, "description": "The requested snapshot does not belong to the course."},
    "SESSION_ALREADY_ACTIVE": {"status": 409, "description": "The student already has an ACTIVE or PAUSED exercise session."},
    "SESSION_TRANSITION_INVALID": {"status": 409, "description": "The requested exercise-session transition is illegal from the current state."},
    "CHECKIN_WINDOW_CLOSED": {"status": 409, "description": "The current server time is outside the course check-in window."},
    "COURSE_TARGET_ALREADY_MET": {"status": 409, "description": "The capped 1200-minute course target is already met; a new session is not allowed."},
    "DAILY_RECORD_ALREADY_EXISTS": {"status": 409, "description": "The enrollment already has a record for the session's fixed Shanghai business date."},
    "MEDIA_NOT_VERIFIED": {"status": 409, "description": "A media asset is not VERIFIED and cannot be bound."},
    "MEDIA_OWNERSHIP_MISMATCH": {"status": 403, "description": "A media asset is not owned by the authenticated student or allowed reviewer."},
    "MEDIA_LIMIT_EXCEEDED": {"status": 413, "description": "Media count, per-file size, or aggregate size exceeds the purpose-specific limit."},
    "MEDIA_CONTENT_INVALID": {"status": 422, "description": "Authoritative content probing rejected MIME, video duration, audio, checksum, or file structure."},
    "MEDIA_ALREADY_BOUND": {"status": 409, "description": "A media asset is already bound to a formal business fact."},
    "RECORD_DESCRIPTION_INVALID": {"status": 422, "description": "The trimmed exercise description must contain 1 to 200 characters."},
    "REVIEW_RESULT_UNCHANGED": {"status": 409, "description": "A review must change the current VALID or INVALID result."},
    "ENDURANCE_OUTCOME_EXEMPT": {"status": 409, "description": "A measured endurance outcome cannot replace a currently approved exemption."},
    "ENDURANCE_RULE_TABLE_INVALID": {"status": 422, "description": "The complete candidate rule table is empty, discontinuous, overlapping, or score/level inconsistent."},
    "APPLICATION_EVIDENCE_LIMIT_EXCEEDED": {"status": 413, "description": "Initial plus supplement evidence would exceed three images."},
    "APPLICATION_TRANSITION_INVALID": {"status": 409, "description": "The application action is illegal from its current state."},
    "APPLICATION_SUPPLEMENT_NOT_ALLOWED": {"status": 409, "description": "Supplement evidence is accepted only while SUPPLEMENT_REQUIRED."},
    "CERTIFICATION_CREDIT_INVALID": {"status": 422, "description": "Certification credit is negative, zero in total, above a category target, or above 1200 minutes."},
    "FINAL_GRADE_VALUE_INVALID": {"status": 422, "description": "The final grade is outside the signed int32 representation; no 0-100 rule is applied."},
    "FEEDBACK_TRANSITION_INVALID": {"status": 409, "description": "WAITING cannot be selected after creation or the requested feedback transition is invalid."},
    "HELP_ARTICLE_TRANSITION_INVALID": {"status": 409, "description": "The requested help-article state transition is not allowed."},
    "HELP_ARTICLE_PUBLICATION_INCOMPLETE": {"status": 422, "description": "Publication requires both bodies and at least one normalized keyword."},
    "SYSTEM_MODE_UNCHANGED": {"status": 409, "description": "The requested target system mode is already current."},
    "MAINTENANCE_ANNOUNCEMENT_REQUIRED": {"status": 422, "description": "Entering MAINTENANCE requires bilingual titles/bodies and an estimated recovery instant."},
    "AUDIT_DATE_RANGE_INVALID": {"status": 422, "description": "The selected inclusive Shanghai date range is invalid."},
    "AUDIT_ARCHIVE_NOT_READY": {"status": 409, "description": "The audit archive is not in SUCCEEDED state or its link has expired."},
}


RESPONSE_NAME_BY_STATUS = {
    400: "BadRequest",
    401: "Unauthorized",
    403: "Forbidden",
    404: "NotFound",
    409: "Conflict",
    412: "PreconditionFailed",
    413: "PayloadTooLarge",
    415: "UnsupportedMediaType",
    422: "UnprocessableEntity",
    429: "TooManyRequests",
    500: "InternalError",
    503: "ServiceUnavailable",
}


def path_parameter(name: str, schema: Schema | None = None, *, description: str | None = None) -> dict[str, Any]:
    return {
        "name": name,
        "in": "path",
        "required": True,
        "description": description or f"Opaque {name}.",
        "schema": deepcopy(schema or UUID),
    }


def query_parameter(
    name: str,
    schema: Schema,
    *,
    required: bool = False,
    description: str | None = None,
) -> dict[str, Any]:
    value: dict[str, Any] = {
        "name": name,
        "in": "query",
        "required": required,
        "schema": deepcopy(schema),
    }
    if description:
        value["description"] = description
    return value


def cursor_parameters(*, default_limit: int, maximum_limit: int) -> list[dict[str, Any]]:
    return [
        query_parameter(
            "cursor",
            string_schema(min_length=1),
            description="Opaque keyset cursor returned by this exact operation and filter set.",
        ),
        query_parameter(
            "limit",
            {"type": "integer", "format": "int32", "minimum": 1, "maximum": maximum_limit, "default": default_limit},
            description="Maximum number of items to return.",
        ),
    ]


def json_request(schema_name: str, *, required: bool = True, description: str | None = None) -> dict[str, Any]:
    value: dict[str, Any] = {
        "required": required,
        "content": {"application/json": {"schema": ref(schema_name)}},
    }
    if description:
        value["description"] = description
    return value


def json_response(schema_name: str, description: str) -> dict[str, Any]:
    return {
        "description": description,
        "headers": {"X-Request-Id": {"$ref": "#/components/headers/RequestId"}},
        "content": {"application/json": {"schema": ref(schema_name)}},
    }


@dataclass
class RegisteredOperation:
    method: str
    path: str
    operation_id: str
    tag: str
    roles: list[str]
    permissions: list[str]
    system_mode: str
    idempotency: str


class ContractRegistry:
    def __init__(self) -> None:
        self.paths: dict[str, dict[str, Any]] = {}
        self.operations: list[RegisteredOperation] = []

    def add(
        self,
        *,
        method: str,
        path: str,
        operation_id: str,
        tag: str,
        summary: str,
        description: str,
        roles: list[str],
        success_schema: str | None,
        success_status: int = 200,
        success_description: str = "Successful response.",
        request_schema: str | None = None,
        parameters: list[dict[str, Any]] | None = None,
        permissions: list[str] | None = None,
        resource_scope: str = "ROLE_SCOPE",
        system_mode: str = "NORMAL_REQUIRED",
        idempotent: bool = False,
        sensitive_response: bool = False,
        natural_idempotency: str | None = None,
        error_codes: list[str] | None = None,
        public: bool = False,
    ) -> None:
        method = method.lower()
        if method not in {"get", "post", "put", "patch", "delete"}:
            raise ValueError(f"Unsupported HTTP method: {method}")
        if operation_id in {item.operation_id for item in self.operations}:
            raise ValueError(f"Duplicate operationId: {operation_id}")
        path_item = self.paths.setdefault(path, {})
        if method in path_item:
            raise ValueError(f"Duplicate operation: {method.upper()} {path}")

        codes = list(dict.fromkeys(error_codes or []))
        for shared_code in (["INVALID_REQUEST"] if request_schema else []):
            if shared_code not in codes:
                codes.append(shared_code)
        has_opaque_resource_id = any(
            parameter.get("in") == "path" and parameter.get("schema", {}).get("format") == "uuid"
            for parameter in (parameters or [])
        )
        if has_opaque_resource_id and "RESOURCE_NOT_FOUND" not in codes:
            codes.append("RESOURCE_NOT_FOUND")
        has_cursor = any(
            parameter.get("in") == "query" and parameter.get("name") == "cursor"
            for parameter in (parameters or [])
        )
        if has_cursor and "INVALID_CURSOR" not in codes:
            codes.append("INVALID_CURSOR")
        teacher_first_password_exempt_operations = {
            "logoutCurrentSession",
            "logoutAllSessions",
            "getCurrentActor",
            "changeOwnPassword",
        }
        if (
            "TEACHER" in roles
            and not public
            and operation_id not in teacher_first_password_exempt_operations
            and "FIRST_PASSWORD_CHANGE_REQUIRED" not in codes
        ):
            codes.append("FIRST_PASSWORD_CHANGE_REQUIRED")
        if (
            "ADMIN" in roles
            and operation_id in ADMIN_FIRST_PASSWORD_CHANGE_GATED_OPERATION_IDS
            and "FIRST_PASSWORD_CHANGE_REQUIRED" not in codes
        ):
            codes.append("FIRST_PASSWORD_CHANGE_REQUIRED")
        if not public:
            for shared_code in ["AUTHENTICATION_REQUIRED", "FORBIDDEN"]:
                if shared_code not in codes:
                    codes.append(shared_code)
        if system_mode == "NORMAL_REQUIRED" and "SYSTEM_MAINTENANCE" not in codes:
            codes.append("SYSTEM_MAINTENANCE")
        if idempotent and "IDEMPOTENCY_KEY_REUSED" not in codes:
            codes.append("IDEMPOTENCY_KEY_REUSED")
        for shared_code in ["RATE_LIMITED", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"]:
            if shared_code not in codes:
                codes.append(shared_code)
        unknown_codes = [code for code in codes if code not in ERROR_CATALOG]
        if unknown_codes:
            raise ValueError(f"Unknown error codes for {operation_id}: {unknown_codes}")

        operation_parameters = deepcopy(parameters or [])
        if idempotent:
            operation_parameters.append({"$ref": "#/components/parameters/IdempotencyKey"})

        responses: dict[str, Any] = {}
        if success_schema:
            responses[str(success_status)] = json_response(success_schema, success_description)
        else:
            responses[str(success_status)] = {
                "description": success_description,
                "headers": {"X-Request-Id": {"$ref": "#/components/headers/RequestId"}},
            }
        for status in sorted({ERROR_CATALOG[code]["status"] for code in codes}):
            response_name = RESPONSE_NAME_BY_STATUS[status]
            responses[str(status)] = {"$ref": f"#/components/responses/{response_name}"}

        idempotency_value: dict[str, Any]
        if idempotent:
            idempotency_value = {
                "required": True,
                "header": "Idempotency-Key",
                "replay": "Same authenticated actor or anonymous command subject, operationId, canonical resource identity, key, and normalized command returns the original committed result.",
                "reuseConflict": "Same scoped key with a different normalized command returns IDEMPOTENCY_KEY_REUSED.",
            }
            if sensitive_response:
                idempotency_value["sensitiveResponse"] = {
                    "exposure": "INITIAL_OR_EXACT_REPLAY_ONLY",
                    "rawSecretPersistence": "PROHIBITED",
                    "logging": "PROHIBITED",
                    "reproduction": "Exact replays must reproduce the committed secret response without storing the raw secret.",
                }
            idempotency_label = "REQUIRED_HEADER"
        elif natural_idempotency:
            if sensitive_response:
                raise ValueError(f"Sensitive response requires header idempotency: {operation_id}")
            idempotency_value = {"required": False, "natural": natural_idempotency}
            idempotency_label = "NATURAL"
        else:
            if sensitive_response:
                raise ValueError(f"Sensitive response requires header idempotency: {operation_id}")
            idempotency_value = {"required": False, "reason": "Read-only operation."}
            idempotency_label = "READ_ONLY"

        permission_values = permissions or []
        operation: dict[str, Any] = {
            "tags": [tag],
            "summary": summary,
            "description": description,
            "operationId": operation_id,
            "security": [] if public else [{"bearerAuth": []}],
            "x-roles": roles,
            "x-admin-permissions": permission_values,
            "x-resource-scope": resource_scope,
            "x-system-mode": system_mode,
            "x-idempotency": idempotency_value,
            "x-error-codes": codes,
            "responses": responses,
        }
        if operation_parameters:
            operation["parameters"] = operation_parameters
        if request_schema:
            operation["requestBody"] = json_request(request_schema)
        path_item[method] = operation
        self.operations.append(
            RegisteredOperation(
                method=method.upper(),
                path=path,
                operation_id=operation_id,
                tag=tag,
                roles=roles,
                permissions=permission_values,
                system_mode=system_mode,
                idempotency=idempotency_label,
            )
        )


def add_paged_schema(schemas: dict[str, Schema], name: str, item_schema: str) -> None:
    schemas[name] = object_schema(
        {
            "items": array_of(ref(item_schema)),
            "page": ref("CursorPage"),
        },
        ["items", "page"],
    )


def register_common_schemas(schemas: dict[str, Schema]) -> None:
    schemas["ErrorCode"] = string_schema(enum=list(ERROR_CATALOG.keys()), description="Stable machine-readable error code.")
    schemas["DirectUploadHttpMethod"] = string_schema(
        enum=["PUT"],
        description="HTTP method covered by every short-lived direct-upload authorization in this Contract version.",
    )
    schemas["FieldViolation"] = object_schema(
        {
            "field": string_schema(min_length=1),
            "reason": string_schema(min_length=1),
        },
        ["field", "reason"],
    )
    schemas["ErrorDetails"] = object_schema(
        {
            "fieldViolations": array_of(ref("FieldViolation")),
            "currentVersion": nullable(VERSION),
            "retryAfterSeconds": nullable(integer_schema(minimum=0, fmt="int32")),
            "blockers": array_of(string_schema(min_length=1)),
        },
        ["fieldViolations", "currentVersion", "retryAfterSeconds", "blockers"],
        description="Safe structured details. Arrays are empty when no values apply; the entire details property may instead be null.",
    )
    schemas["ErrorEnvelope"] = object_schema(
        {
            "code": ref("ErrorCode"),
            "message": string_schema(min_length=1, description="Localized human-readable message; clients branch only on code."),
            "requestId": string_schema(min_length=1, description="Correlation identifier safe to provide to support."),
            "details": nullable(ref("ErrorDetails")),
        },
        ["code", "message", "requestId", "details"],
    )
    schemas["ErrorEnvelope"]["example"] = {
        "code": "COURSE_ALREADY_JOINED",
        "message": "你已经加入该课程",
        "requestId": "req_xxx",
        "details": None,
    }
    schemas["CursorPage"] = object_schema(
        {
            "limit": integer_schema(fmt="int32", minimum=1),
            "nextCursor": nullable(string_schema(min_length=1)),
            "previousCursor": nullable(string_schema(min_length=1)),
        },
        ["limit", "nextCursor", "previousCursor"],
        description="Keyset pagination metadata. A null cursor means that direction has no more results.",
    )
    schemas["CommandAccepted"] = object_schema(
        {
            "accepted": {"type": "boolean", "const": True},
        },
        ["accepted"],
    )
    schemas["DeletionResult"] = object_schema(
        {
            "deleted": {"type": "boolean", "const": True},
            "retainedFacts": array_of(string_schema(min_length=1)),
        },
        ["deleted", "retainedFacts"],
    )
    schemas["LocalizedText"] = object_schema(
        {"zh": string_schema(min_length=1), "en": string_schema(min_length=1)},
        ["zh", "en"],
    )
    schemas["PersonSummary"] = object_schema(
        {
            "userId": UUID,
            "displayName": string_schema(min_length=1),
            "role": string_schema(enum=["STUDENT", "TEACHER", "ADMIN"]),
        },
        ["userId", "displayName", "role"],
    )


def build_standard_responses() -> dict[str, Any]:
    descriptions = {
        400: "Malformed or invalid request.",
        401: "Authentication or verification failed.",
        403: "Authenticated actor is not allowed to perform the operation.",
        404: "Resource was not found in the authorized scope.",
        409: "Domain or idempotency conflict.",
        412: "Optimistic concurrency precondition failed.",
        413: "Payload or authoritative file size exceeds a declared limit.",
        415: "Authoritative media type is unsupported.",
        422: "Request violates a declared domain constraint.",
        429: "Rate limit exceeded.",
        500: "Internal server error.",
        503: "System mode or dependency prevents the operation.",
    }
    result: dict[str, Any] = {}
    for status, name in RESPONSE_NAME_BY_STATUS.items():
        result[name] = {
            "description": descriptions[status],
            "headers": {
                "X-Request-Id": {"$ref": "#/components/headers/RequestId"},
                **(
                    {"Retry-After": {"description": "Seconds before retrying.", "schema": {"type": "integer", "minimum": 0}}}
                    if status in {429, 503}
                    else {}
                ),
            },
            "content": {"application/json": {"schema": ref("ErrorEnvelope")}},
        }
    return result
