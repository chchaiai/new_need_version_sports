from __future__ import annotations

from common import (
    EMAIL,
    INSTANT,
    UUID,
    VERSION,
    ContractRegistry,
    Schema,
    add_paged_schema,
    array_of,
    cursor_parameters,
    integer_schema,
    nullable,
    object_schema,
    path_parameter,
    query_parameter,
    ref,
    string_schema,
)


def register_admin(schemas: dict[str, Schema], registry: ContractRegistry) -> None:
    _register_account_schemas(schemas)
    _register_dashboard_schemas(schemas)
    _register_teacher_account_operations(registry)
    _register_student_account_operations(registry)
    _register_sub_admin_operations(registry)
    _register_dashboard_operations(registry)


def _register_account_schemas(schemas: dict[str, Schema]) -> None:
    schemas["TeacherAccount"] = object_schema(
        {
            "teacherId": UUID,
            "organizationId": UUID,
            "employeeId": string_schema(min_length=1),
            "name": string_schema(min_length=1),
            "verifiedEmail": EMAIL,
            "title": nullable(string_schema(min_length=1)),
            "college": nullable(string_schema(min_length=1)),
            "department": nullable(string_schema(min_length=1)),
            "accountState": string_schema(enum=["ACTIVE", "DISABLED", "RECOVERY_REQUIRED"]),
            "mustChangePassword": {"type": "boolean"},
            "updatedAt": INSTANT,
            "version": VERSION,
        },
        [
            "teacherId",
            "organizationId",
            "employeeId",
            "name",
            "verifiedEmail",
            "title",
            "college",
            "department",
            "accountState",
            "mustChangePassword",
            "updatedAt",
            "version",
        ],
        description="Account state is read-only in the users/accounts page. No teacher enable/disable/recovery approval operation is defined.",
    )
    add_paged_schema(schemas, "TeacherAccountPage", "TeacherAccount")
    schemas["TeacherBatchValidationRequest"] = object_schema(
        {
            "csvText": string_schema(min_length=1, description="UTF-8 CSV text. Required headers: employee_id,name,email; college is optional."),
        },
        ["csvText"],
        description="Clients may read an uploaded UTF-8 CSV file or accept pasted CSV, then send the same text. Passwords never belong in CSV.",
    )
    schemas["TeacherBatchValidationRow"] = object_schema(
        {
            "rowNumber": integer_schema(fmt="int32", minimum=2),
            "employeeId": nullable(string_schema(min_length=1)),
            "name": nullable(string_schema(min_length=1)),
            "email": nullable(EMAIL),
            "college": nullable(string_schema(min_length=1)),
            "errors": array_of(string_schema(min_length=1)),
        },
        ["rowNumber", "employeeId", "name", "email", "college", "errors"],
    )
    schemas["TeacherBatchValidation"] = object_schema(
        {
            "validationId": UUID,
            "valid": {"type": "boolean"},
            "rows": array_of(ref("TeacherBatchValidationRow")),
            "rowCount": integer_schema(fmt="int32", minimum=0),
            "errorCount": integer_schema(fmt="int32", minimum=0),
            "expiresAt": INSTANT,
        },
        ["validationId", "valid", "rows", "rowCount", "errorCount", "expiresAt"],
    )
    schemas["CreateTeacherBatchRequest"] = object_schema(
        {
            "validationId": UUID,
            "initialPassword": string_schema(
                min_length=8,
                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$",
                write_only=True,
                description="At least eight characters with uppercase, lowercase, and a digit.",
            ),
        },
        ["validationId", "initialPassword"],
    )
    schemas["TeacherBatchCreationResult"] = object_schema(
        {
            "createdCount": integer_schema(fmt="int32", minimum=1),
            "teachers": array_of(ref("TeacherAccount"), min_items=1),
        },
        ["createdCount", "teachers"],
        description="The initial password is never returned or persisted in ordinary documents/business records.",
    )
    schemas["DeleteTeacherAccountRequest"] = object_schema(
        {
            "confirmationEmployeeId": string_schema(min_length=1),
            "reason": string_schema(min_length=1),
            "expectedVersion": VERSION,
        },
        ["confirmationEmployeeId", "reason", "expectedVersion"],
    )
    schemas["StudentAccount"] = object_schema(
        {
            "student": ref("StudentSummary"),
            "organizationId": UUID,
            "verifiedEmail": EMAIL,
            "updatedAt": INSTANT,
            "version": VERSION,
        },
        ["student", "organizationId", "verifiedEmail", "updatedAt", "version"],
        description="Read-only student account projection. Only ACTIVE and PENDING student status values exist.",
    )
    add_paged_schema(schemas, "StudentAccountPage", "StudentAccount")

    schemas["SubAdmin"] = object_schema(
        {
            "adminId": UUID,
            "loginName": string_schema(min_length=1),
            "name": string_schema(min_length=1),
            "verifiedEmail": EMAIL,
            "department": nullable(string_schema(min_length=1)),
            "permissions": array_of(ref("AdminPermission"), min_items=1, max_items=8),
            "state": string_schema(enum=["ACTIVE", "DISABLED"]),
            "createdAt": INSTANT,
            "updatedAt": INSTANT,
            "version": VERSION,
        },
        ["adminId", "loginName", "name", "verifiedEmail", "department", "permissions", "state", "createdAt", "updatedAt", "version"],
    )
    schemas["SubAdminGovernanceSummary"] = object_schema(
        {
            "totalCount": integer_schema(fmt="int32", minimum=0),
            "activeCount": integer_schema(fmt="int32", minimum=0),
            "generatedAt": INSTANT,
        },
        ["totalCount", "activeCount", "generatedAt"],
        description=(
            "SUPER-only organization-wide account summary from the same committed read snapshot as the returned items. "
            "Counts ignore state, cursor, and limit; the fixed permission count remains the eight-value AdminPermission enum."
        ),
    )
    schemas["SubAdminPage"] = object_schema(
        {
            "summary": ref("SubAdminGovernanceSummary"),
            "items": array_of(ref("SubAdmin")),
            "page": ref("CursorPage"),
        },
        ["summary", "items", "page"],
    )
    schemas["CreateSubAdminRequest"] = object_schema(
        {
            "loginName": string_schema(min_length=1),
            "name": string_schema(min_length=1),
            "verifiedEmail": EMAIL,
            "department": nullable(string_schema(min_length=1)),
            "initialPassword": string_schema(min_length=1, write_only=True),
            "confirmInitialPassword": string_schema(min_length=1, write_only=True),
            "permissions": array_of(ref("AdminPermission"), min_items=1, max_items=8),
        },
        [
            "loginName",
            "name",
            "verifiedEmail",
            "department",
            "initialPassword",
            "confirmInitialPassword",
            "permissions",
        ],
        description=(
            "The non-empty exactly confirmed initial password is a temporary password assigned by another person. "
            "Successful creation sets the new administrator's CurrentActor.mustChangePassword=true; no additional "
            "password-strength rule is added."
        ),
    )
    schemas["UpdateSubAdminRequest"] = object_schema(
        {
            "name": string_schema(min_length=1),
            "verifiedEmail": EMAIL,
            "department": nullable(string_schema(min_length=1)),
            "permissions": array_of(ref("AdminPermission"), min_items=1, max_items=8),
            "expectedVersion": VERSION,
        },
        ["name", "verifiedEmail", "department", "permissions", "expectedVersion"],
        description=(
            "Updates name, verified school email, department, fixed permissions, and expected version only. loginName is "
            "intentionally absent and immutable; another administrator cannot set the account holder's personal password."
        ),
    )
    schemas["SetSubAdminStateRequest"] = object_schema(
        {"targetState": string_schema(enum=["ACTIVE", "DISABLED"]), "expectedVersion": VERSION},
        ["targetState", "expectedVersion"],
    )
    schemas["DeleteSubAdminRequest"] = object_schema(
        {
            "confirmationLoginName": string_schema(min_length=1),
            "expectedVersion": VERSION,
            "responsibilityTransferConfirmed": {"type": "boolean", "const": True},
        },
        ["confirmationLoginName", "expectedVersion", "responsibilityTransferConfirmed"],
    )


def _register_dashboard_schemas(schemas: dict[str, Schema]) -> None:
    schemas["HealthStatus"] = object_schema(
        {
            "component": string_schema(enum=["API", "DATABASE", "NOTIFICATION_CENTER", "OBJECT_STORAGE", "MEDIA_STORAGE"]),
            "status": string_schema(enum=["UP", "DOWN", "NOT_CONFIGURED"]),
            "latencyMilliseconds": nullable(integer_schema(minimum=0)),
            "backlogCount": nullable(integer_schema(minimum=0)),
            "checkedAt": INSTANT,
        },
        ["component", "status", "latencyMilliseconds", "backlogCount", "checkedAt"],
        description="Missing latency/backlog remains null and must not be interpreted as healthy.",
    )
    schemas["StudentDashboard"] = object_schema(
        {
            "actor": ref("CurrentActor"),
            "student": ref("StudentSummary"),
            "studentStatus": string_schema(enum=["ACTIVE", "PENDING"]),
            "currentSemester": ref("SemesterSummary"),
            "course": nullable(ref("StudentCourse")),
            "progress": nullable(ref("StudentCourseProgress")),
            "enduranceOutcome": nullable(ref("EnduranceOutcome")),
            "finalGrade": nullable(ref("FinalGradeState")),
            "unreadNotificationCount": integer_schema(minimum=0),
            "generatedAt": INSTANT,
        },
        [
            "actor",
            "student",
            "studentStatus",
            "currentSemester",
            "course",
            "progress",
            "enduranceOutcome",
            "finalGrade",
            "unreadNotificationCount",
            "generatedAt",
        ],
        description=(
            "Formal authenticated read model; never falls back to synthetic or mock workspace data. student is present for "
            "both ACTIVE and PENDING students; studentStatus must equal student.studentStatus, and progress.student must "
            "identify the same student when progress is non-null."
        ),
    )
    schemas["TeacherDashboard"] = object_schema(
        {
            "actor": ref("CurrentActor"),
            "currentSemester": nullable(ref("SemesterSummary")),
            "openCourseCount": integer_schema(fmt="int32", minimum=0),
            "memberCount": integer_schema(fmt="int32", minimum=0),
            "unresolvedRosterFindingCount": integer_schema(fmt="int32", minimum=0),
            "pendingEnduranceCount": integer_schema(fmt="int32", minimum=0),
            "pendingApplicationCount": integer_schema(fmt="int32", minimum=0),
            "unpublishedFinalGradeCount": integer_schema(fmt="int32", minimum=0),
            "unreadNotificationCount": integer_schema(minimum=0),
            "generatedAt": INSTANT,
        },
        [
            "actor",
            "currentSemester",
            "openCourseCount",
            "memberCount",
            "unresolvedRosterFindingCount",
            "pendingEnduranceCount",
            "pendingApplicationCount",
            "unpublishedFinalGradeCount",
            "unreadNotificationCount",
            "generatedAt",
        ],
        description=(
            "When no CURRENT semester exists, currentSemester is null and every current-semester course/work count is zero. "
            "A null currentSemester is a business empty state, not a dependency failure."
        ),
    )
    schemas["AdminDashboard"] = object_schema(
        {
            "actor": ref("CurrentActor"),
            "currentSystemMode": ref("SystemMode"),
            "currentSemester": nullable(ref("Semester")),
            "studentCount": integer_schema(fmt="int32", minimum=0),
            "activeStudentCount": integer_schema(fmt="int32", minimum=0),
            "distinctAdministrativeClassCount": integer_schema(fmt="int32", minimum=0),
            "studentsWithAdministrativeClassCount": integer_schema(fmt="int32", minimum=0),
            "teacherCount": integer_schema(fmt="int32", minimum=0),
            "enduranceRuleCount": integer_schema(fmt="int32", minimum=0),
            "enduranceRuleGroupCount": integer_schema(fmt="int32", minimum=0, maximum=4),
            "health": array_of(ref("HealthStatus"), min_items=5, max_items=5),
            "generatedAt": INSTANT,
        },
        [
            "actor",
            "currentSystemMode",
            "currentSemester",
            "studentCount",
            "activeStudentCount",
            "distinctAdministrativeClassCount",
            "studentsWithAdministrativeClassCount",
            "teacherCount",
            "enduranceRuleCount",
            "enduranceRuleGroupCount",
            "health",
            "generatedAt",
        ],
        description="Permission-aware read-only overview. Counts are navigation/risk summaries and never bypass target-page authorization.",
    )


def _register_teacher_account_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="get",
        path="/admin/teacher-accounts",
        operation_id="listTeacherAccounts",
        tag="Accounts",
        summary="List teacher accounts",
        description="Lists read-only teacher account status and profile data for authorized administrators.",
        roles=["ADMIN"],
        permissions=["USERS_ACCOUNTS"],
        success_schema="TeacherAccountPage",
        parameters=[
            query_parameter("q", string_schema(min_length=1)),
            query_parameter("state", string_schema(enum=["ACTIVE", "DISABLED", "RECOVERY_REQUIRED"])),
            query_parameter("collegeOrDepartment", string_schema(min_length=1)),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="CURRENT_ORGANIZATION",
    )
    registry.add(
        method="get",
        path="/admin/teacher-accounts/{teacherId}",
        operation_id="getTeacherAccount",
        tag="Accounts",
        summary="Get a teacher account",
        description="Returns a read-only teacher account; no password, credential, or session detail is exposed.",
        roles=["ADMIN"],
        permissions=["USERS_ACCOUNTS"],
        success_schema="TeacherAccount",
        parameters=[path_parameter("teacherId")],
        resource_scope="CURRENT_ORGANIZATION",
    )
    registry.add(
        method="post",
        path="/admin/teacher-account-batch-validations",
        operation_id="validateTeacherAccountBatch",
        tag="Accounts",
        summary="Validate a UTF-8 teacher-account CSV batch",
        description="Parses all rows and reports required-field, school-email, employee-ID/email uniqueness, and existing-account conflicts. It creates no accounts and stores no password.",
        roles=["ADMIN"],
        permissions=["USERS_ACCOUNTS"],
        success_schema="TeacherBatchValidation",
        success_status=201,
        request_schema="TeacherBatchValidationRequest",
        resource_scope="CURRENT_ORGANIZATION",
        idempotent=True,
        error_codes=["VALIDATION_FAILED"],
    )
    registry.add(
        method="post",
        path="/admin/teacher-account-batches",
        operation_id="createTeacherAccountBatch",
        tag="Accounts",
        summary="Create a validated teacher-account batch",
        description="Revalidates the complete batch and atomically creates every teacher with one strong initial password. Any row conflict rolls back the entire batch; the password is never returned.",
        roles=["ADMIN"],
        permissions=["USERS_ACCOUNTS"],
        success_schema="TeacherBatchCreationResult",
        success_status=201,
        request_schema="CreateTeacherBatchRequest",
        resource_scope="CURRENT_ORGANIZATION",
        idempotent=True,
        error_codes=["EMPLOYEE_ID_ALREADY_IN_USE", "EMAIL_ALREADY_IN_USE", "VALIDATION_FAILED"],
    )
    registry.add(
        method="post",
        path="/admin/teacher-accounts/{teacherId}/deletion",
        operation_id="deleteTeacherAccount",
        tag="Accounts",
        summary="Delete a confirmed teacher login account",
        description="Deletes current login/profile account data without transferring or rewriting course responsibility. Administrators gain no course-management authority. Existing courses, members, records, media, reviews, grades, audits, and responsibility snapshots continue to reference only the opaque non-login historical subject.",
        roles=["ADMIN"],
        permissions=["USERS_ACCOUNTS"],
        success_schema="DeletionResult",
        request_schema="DeleteTeacherAccountRequest",
        parameters=[path_parameter("teacherId")],
        resource_scope="CURRENT_ORGANIZATION",
        idempotent=True,
        error_codes=["VERSION_CONFLICT"],
    )


def _register_student_account_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="get",
        path="/admin/student-accounts",
        operation_id="listStudentAccounts",
        tag="Accounts",
        summary="List student accounts read-only",
        description="Searches by name, student number, college, major, administrative class, or ACTIVE/PENDING state. No mutation is exposed.",
        roles=["ADMIN"],
        permissions=["USERS_ACCOUNTS"],
        success_schema="StudentAccountPage",
        parameters=[
            query_parameter("q", string_schema(min_length=1)),
            query_parameter("status", string_schema(enum=["ACTIVE", "PENDING"])),
            query_parameter("collegeOrDepartment", string_schema(min_length=1)),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="CURRENT_ORGANIZATION_READ_ONLY",
    )
    registry.add(
        method="get",
        path="/admin/student-accounts/{studentId}",
        operation_id="getStudentAccount",
        tag="Accounts",
        summary="Get a student account read-only",
        description="Returns the minimum authorized student profile and ACTIVE/PENDING state. It provides no edit, email-rebind, disable, recovery, enrollment, or session action.",
        roles=["ADMIN"],
        permissions=["USERS_ACCOUNTS"],
        success_schema="StudentAccount",
        parameters=[path_parameter("studentId")],
        resource_scope="CURRENT_ORGANIZATION_READ_ONLY",
    )


def _register_sub_admin_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="get",
        path="/admin/sub-admins",
        operation_id="listSubAdmins",
        tag="Admin governance",
        summary="List sub-administrators",
        description=(
            "SUPER-only governance list with ACTIVE/DISABLED state, an organization-wide account summary from the same "
            "committed read snapshot, and the fixed eight permission codes. Summary counts ignore list filters and pagination."
        ),
        roles=["ADMIN"],
        success_schema="SubAdminPage",
        parameters=[
            query_parameter("state", string_schema(enum=["ACTIVE", "DISABLED"])),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="SUPER_ADMIN_ONLY",
        error_codes=["FORBIDDEN"],
    )
    registry.add(
        method="post",
        path="/admin/sub-admins",
        operation_id="createSubAdmin",
        tag="Admin governance",
        summary="Create a sub-administrator",
        description=(
            "SUPER-only use case that atomically creates the account/profile/credential and at least one of the fixed "
            "eight permissions. The assigned initial credential is a temporary password and the same transaction sets "
            "CurrentActor.mustChangePassword=true. The login name is globally unique and immutable."
        ),
        roles=["ADMIN"],
        success_schema="SubAdmin",
        success_status=201,
        request_schema="CreateSubAdminRequest",
        resource_scope="SUPER_ADMIN_ONLY",
        idempotent=True,
        error_codes=["FORBIDDEN", "LOGIN_NAME_ALREADY_IN_USE", "EMAIL_ALREADY_IN_USE", "VALIDATION_FAILED"],
    )
    registry.add(
        method="get",
        path="/admin/sub-admins/{adminId}",
        operation_id="getSubAdmin",
        tag="Admin governance",
        summary="Get a sub-administrator",
        description="SUPER-only governance detail.",
        roles=["ADMIN"],
        success_schema="SubAdmin",
        parameters=[path_parameter("adminId")],
        resource_scope="SUPER_ADMIN_ONLY",
        error_codes=["FORBIDDEN"],
    )
    registry.add(
        method="put",
        path="/admin/sub-admins/{adminId}",
        operation_id="updateSubAdmin",
        tag="Admin governance",
        summary="Update sub-administrator profile and permissions",
        description=(
            "SUPER-only update of name, verified school email, department, fixed permissions, and expected version. The "
            "login name cannot change; permission history is append/revoke, at least one permission remains active, and "
            "this operation cannot set the account holder's personal password."
        ),
        roles=["ADMIN"],
        success_schema="SubAdmin",
        request_schema="UpdateSubAdminRequest",
        parameters=[path_parameter("adminId")],
        resource_scope="SUPER_ADMIN_ONLY",
        idempotent=True,
        error_codes=["FORBIDDEN", "EMAIL_ALREADY_IN_USE", "VERSION_CONFLICT", "VALIDATION_FAILED"],
    )
    registry.add(
        method="post",
        path="/admin/sub-admins/{adminId}/state-transition",
        operation_id="setSubAdminState",
        tag="Admin governance",
        summary="Enable or disable a sub-administrator",
        description="SUPER-only transition between ACTIVE and DISABLED. Disabling revokes every session; enabling restores only currently assigned permissions.",
        roles=["ADMIN"],
        success_schema="SubAdmin",
        request_schema="SetSubAdminStateRequest",
        parameters=[path_parameter("adminId")],
        resource_scope="SUPER_ADMIN_ONLY",
        idempotent=True,
        error_codes=["FORBIDDEN", "ADMIN_RESPONSIBILITY_BLOCKED", "VERSION_CONFLICT"],
    )
    registry.add(
        method="post",
        path="/admin/sub-admins/{adminId}/deletion",
        operation_id="deleteSubAdmin",
        tag="Admin governance",
        summary="Delete an eligible sub-administrator",
        description="SUPER-only deletion after responsibility transfer. Current account data and active grants are removed/revoked while completed business and audit history remain under an opaque historical subject.",
        roles=["ADMIN"],
        success_schema="DeletionResult",
        request_schema="DeleteSubAdminRequest",
        parameters=[path_parameter("adminId")],
        resource_scope="SUPER_ADMIN_ONLY",
        idempotent=True,
        error_codes=["FORBIDDEN", "ADMIN_RESPONSIBILITY_BLOCKED", "VERSION_CONFLICT"],
    )


def _register_dashboard_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="get",
        path="/student/dashboard",
        operation_id="getStudentDashboard",
        tag="Dashboards",
        summary="Get the authenticated student dashboard",
        description="Composes current formal account, course, progress, endurance, grade, and notification projections. It never falls back to synthetic or Mock data.",
        roles=["STUDENT"],
        success_schema="StudentDashboard",
        resource_scope="SELF",
    )
    registry.add(
        method="get",
        path="/teacher/dashboard",
        operation_id="getTeacherDashboard",
        tag="Dashboards",
        summary="Get the responsible teacher dashboard",
        description="Returns only summaries for courses owned by the authenticated teacher.",
        roles=["TEACHER"],
        success_schema="TeacherDashboard",
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="get",
        path="/admin/dashboard",
        operation_id="getAdminDashboard",
        tag="Dashboards",
        summary="Get the permission-aware administrator overview",
        description="Returns read-only summaries and explicit health states. Navigation remains subject to each target operation's permission; missing health metrics are null, never inferred healthy.",
        roles=["ADMIN"],
        success_schema="AdminDashboard",
        resource_scope="CURRENT_ORGANIZATION_PERMISSION_AWARE",
    )
