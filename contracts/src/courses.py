from __future__ import annotations

from common import (
    EMAIL,
    INSTANT,
    LOCAL_DATE,
    NON_EMPTY_TEXT,
    SHA256,
    UUID,
    VERSION,
    ContractRegistry,
    Schema,
    add_paged_schema,
    array_of,
    cursor_parameters,
    integer_schema,
    nullable,
    number_schema,
    object_schema,
    path_parameter,
    query_parameter,
    ref,
    string_schema,
)


def register_courses(schemas: dict[str, Schema], registry: ContractRegistry) -> None:
    schemas["SemesterStatus"] = string_schema(enum=["UPCOMING", "CURRENT", "ARCHIVED"])
    schemas["TermType"] = string_schema(enum=["FIRST", "SECOND", "SUMMER"])
    schemas["Semester"] = object_schema(
        {
            "semesterId": UUID,
            "academicYear": string_schema(pattern="^[0-9]{4}-[0-9]{4}$"),
            "termType": ref("TermType"),
            "displayName": string_schema(min_length=1),
            "startDate": LOCAL_DATE,
            "endDate": LOCAL_DATE,
            "status": ref("SemesterStatus"),
            "courseCount": integer_schema(fmt="int32", minimum=0),
            "studentCount": integer_schema(fmt="int32", minimum=0),
            "version": VERSION,
            "updatedAt": INSTANT,
        },
        [
            "semesterId",
            "academicYear",
            "termType",
            "displayName",
            "startDate",
            "endDate",
            "status",
            "courseCount",
            "studentCount",
            "version",
            "updatedAt",
        ],
    )
    schemas["SemesterSummary"] = object_schema(
        {
            "semesterId": UUID,
            "academicYear": string_schema(pattern="^[0-9]{4}-[0-9]{4}$"),
            "termType": ref("TermType"),
            "displayName": string_schema(min_length=1),
            "startDate": LOCAL_DATE,
            "endDate": LOCAL_DATE,
            "status": ref("SemesterStatus"),
        },
        ["semesterId", "academicYear", "termType", "displayName", "startDate", "endDate", "status"],
        description="Minimum cross-role semester projection without administrator counts or concurrency metadata.",
    )
    schemas["SemesterCreateRequest"] = object_schema(
        {
            "academicYear": string_schema(pattern="^[0-9]{4}-[0-9]{4}$"),
            "termType": ref("TermType"),
            "displayName": string_schema(min_length=1),
            "startDate": LOCAL_DATE,
            "endDate": LOCAL_DATE,
        },
        ["academicYear", "termType", "displayName", "startDate", "endDate"],
    )
    schemas["SemesterUpdateRequest"] = object_schema(
        {
            "academicYear": string_schema(pattern="^[0-9]{4}-[0-9]{4}$"),
            "termType": ref("TermType"),
            "displayName": string_schema(min_length=1),
            "startDate": LOCAL_DATE,
            "endDate": LOCAL_DATE,
            "expectedVersion": VERSION,
        },
        ["academicYear", "termType", "displayName", "startDate", "endDate", "expectedVersion"],
    )
    schemas["SemesterSwitchRequest"] = object_schema(
        {
            "expectedTargetVersion": VERSION,
            "expectedCurrentSemesterVersion": nullable(VERSION),
        },
        ["expectedTargetVersion", "expectedCurrentSemesterVersion"],
        description="The current-semester version is null only when no current semester exists.",
    )
    schemas["SemesterSwitchResult"] = object_schema(
        {
            "currentSemester": ref("Semester"),
            "archivedSemester": nullable(ref("Semester")),
            "switchedAt": INSTANT,
        },
        ["currentSemester", "archivedSemester", "switchedAt"],
    )
    schemas["SemesterManagementSummary"] = object_schema(
        {
            "currentSemester": nullable(ref("SemesterSummary")),
            "upcomingCount": integer_schema(fmt="int32", minimum=0),
            "archivedCount": integer_schema(fmt="int32", minimum=0),
            "generatedAt": INSTANT,
        },
        ["currentSemester", "upcomingCount", "archivedCount", "generatedAt"],
        description=(
            "Organization-wide semester summary from the same committed read snapshot as the returned items. "
            "Counts and currentSemester ignore status, cursor, and limit filters."
        ),
    )
    schemas["SemesterPage"] = object_schema(
        {
            "summary": ref("SemesterManagementSummary"),
            "items": array_of(ref("Semester")),
            "page": ref("CursorPage"),
        },
        ["summary", "items", "page"],
    )

    schemas["CourseTargets"] = object_schema(
        {
            "courseRelatedTargetMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "otherTargetMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "totalTargetMinutes": {"type": "integer", "format": "int32", "const": 1200},
            "revisionNumber": integer_schema(minimum=1),
        },
        ["courseRelatedTargetMinutes", "otherTargetMinutes", "totalTargetMinutes", "revisionNumber"],
    )
    schemas["TeacherSummary"] = object_schema(
        {
            "teacherId": UUID,
            "name": string_schema(min_length=1),
        },
        ["teacherId", "name"],
        description="Minimum student-visible teacher identity. Account and employment details use authorized account DTOs.",
    )
    schemas["StudentSummary"] = object_schema(
        {
            "studentId": UUID,
            "studentNumber": string_schema(min_length=1),
            "name": string_schema(min_length=1),
            "gender": string_schema(enum=["FEMALE", "MALE"]),
            "gradeYear": integer_schema(fmt="int32", minimum=1, maximum=4),
            "college": nullable(string_schema(min_length=1)),
            "major": nullable(string_schema(min_length=1)),
            "administrativeClass": nullable(string_schema(min_length=1)),
            "studentStatus": string_schema(enum=["ACTIVE", "PENDING"]),
        },
        [
            "studentId",
            "studentNumber",
            "name",
            "gender",
            "gradeYear",
            "college",
            "major",
            "administrativeClass",
            "studentStatus",
        ],
    )
    schemas["Course"] = object_schema(
        {
            "courseId": UUID,
            "semester": ref("SemesterSummary"),
            "name": string_schema(min_length=1),
            "description": nullable(string_schema(min_length=1)),
            "responsibleTeacher": ref("TeacherSummary"),
            "checkinOpensAt": INSTANT,
            "checkinClosesAt": INSTANT,
            "status": string_schema(enum=["OPEN", "CLOSED"]),
            "displayStatus": nullable(string_schema(enum=["UPCOMING", "ACTIVE"])),
            "joinOpen": {"type": "boolean"},
            "targets": ref("CourseTargets"),
            "activeMemberCount": integer_schema(fmt="int32", minimum=0),
            "removedMemberCount": integer_schema(fmt="int32", minimum=0),
            "version": VERSION,
            "updatedAt": INSTANT,
        },
        [
            "courseId",
            "semester",
            "name",
            "description",
            "responsibleTeacher",
            "checkinOpensAt",
            "checkinClosesAt",
            "status",
            "displayStatus",
            "joinOpen",
            "targets",
            "activeMemberCount",
            "removedMemberCount",
            "version",
            "updatedAt",
        ],
        description="A teacher-owned course. No course code or teaching-class number exists in the external Contract.",
    )
    schemas["StudentCourseTargets"] = object_schema(
        {
            "courseRelatedTargetMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "otherTargetMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "totalTargetMinutes": {"type": "integer", "format": "int32", "const": 1200},
        },
        ["courseRelatedTargetMinutes", "otherTargetMinutes", "totalTargetMinutes"],
    )
    schemas["StudentCourse"] = object_schema(
        {
            "courseId": UUID,
            "semester": ref("SemesterSummary"),
            "name": string_schema(min_length=1),
            "description": nullable(string_schema(min_length=1)),
            "responsibleTeacher": ref("TeacherSummary"),
            "checkinOpensAt": INSTANT,
            "checkinClosesAt": INSTANT,
            "targets": ref("StudentCourseTargets"),
        },
        [
            "courseId",
            "semester",
            "name",
            "description",
            "responsibleTeacher",
            "checkinOpensAt",
            "checkinClosesAt",
            "targets",
        ],
        description="Student course projection without member counts, administrator display state, or mutation metadata.",
    )
    schemas["InvitationCourseSummary"] = object_schema(
        {
            "courseId": UUID,
            "name": string_schema(min_length=1),
            "semester": ref("SemesterSummary"),
            "responsibleTeacher": ref("TeacherSummary"),
        },
        ["courseId", "name", "semester", "responsibleTeacher"],
        description="Safe pre-authentication preview containing only the course, teacher, and semester identity.",
    )
    schemas["AdminCurrentCourseMetrics"] = object_schema(
        {
            "submittedStudentCount": integer_schema(fmt="int32", minimum=0),
            "recordCount": integer_schema(fmt="int32", minimum=0),
            "validRecordCount": integer_schema(fmt="int32", minimum=0),
            "invalidRecordCount": integer_schema(fmt="int32", minimum=0),
            "totalCreditedMinutes": integer_schema(minimum=0),
            "averageCreditedMinutes": number_schema(minimum=0),
        },
        [
            "submittedStudentCount",
            "recordCount",
            "validRecordCount",
            "invalidRecordCount",
            "totalCreditedMinutes",
            "averageCreditedMinutes",
        ],
        description=(
            "Read-only directory metrics. Credited-minute totals first cap each active member by category, then aggregate; "
            "the average is zero when there are no active members. No completed-all-targets count or inferred ratio exists."
        ),
    )
    schemas["AdminCurrentCourseItem"] = object_schema(
        {
            "course": ref("Course"),
            "metrics": ref("AdminCurrentCourseMetrics"),
        },
        ["course", "metrics"],
        description="Administrator read-only course-directory projection with no member, record, or media drill-down.",
    )
    schemas["AdminCurrentCourseDirectorySummary"] = object_schema(
        {
            "currentCourseCount": integer_schema(fmt="int32", minimum=0),
            "distinctActiveStudentCount": integer_schema(fmt="int32", minimum=0),
            "distinctResponsibleTeacherCount": integer_schema(fmt="int32", minimum=0),
        },
        ["currentCourseCount", "distinctActiveStudentCount", "distinctResponsibleTeacherCount"],
    )
    schemas["AdminCurrentCourseDirectory"] = object_schema(
        {
            "summary": ref("AdminCurrentCourseDirectorySummary"),
            "items": array_of(ref("AdminCurrentCourseItem")),
            "page": ref("CursorPage"),
        },
        ["summary", "items", "page"],
    )
    schemas["CourseCreateRequest"] = object_schema(
        {
            "semesterId": UUID,
            "name": string_schema(min_length=1),
            "description": nullable(string_schema(min_length=1)),
            "checkinOpensAt": INSTANT,
            "checkinClosesAt": INSTANT,
            "courseRelatedTargetMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "otherTargetMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
        },
        [
            "semesterId",
            "name",
            "description",
            "checkinOpensAt",
            "checkinClosesAt",
            "courseRelatedTargetMinutes",
            "otherTargetMinutes",
        ],
    )
    schemas["CourseChangeProposal"] = object_schema(
        {
            "name": string_schema(min_length=1),
            "description": nullable(string_schema(min_length=1)),
            "checkinOpensAt": INSTANT,
            "checkinClosesAt": INSTANT,
            "courseRelatedTargetMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "otherTargetMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "expectedVersion": VERSION,
        },
        [
            "name",
            "description",
            "checkinOpensAt",
            "checkinClosesAt",
            "courseRelatedTargetMinutes",
            "otherTargetMinutes",
            "expectedVersion",
        ],
    )
    schemas["CourseChangeImpact"] = object_schema(
        {
            "canApply": {"type": "boolean"},
            "impactToken": string_schema(min_length=1),
            "affectedStudents": array_of(ref("StudentSummary")),
            "activeCreditConflictStudentIds": array_of(UUID),
            "publishedGradeStudentIds": array_of(UUID),
            "expiresAt": INSTANT,
        },
        [
            "canApply",
            "impactToken",
            "affectedStudents",
            "activeCreditConflictStudentIds",
            "publishedGradeStudentIds",
            "expiresAt",
        ],
    )
    schemas["CourseUpdateRequest"] = object_schema(
        {
            **schemas["CourseChangeProposal"]["properties"],
            "impactToken": string_schema(min_length=1),
        },
        [*schemas["CourseChangeProposal"]["required"], "impactToken"],
    )
    schemas["CourseCloseRequest"] = object_schema(
        {"expectedVersion": VERSION, "reason": string_schema(min_length=1)},
        ["expectedVersion", "reason"],
    )
    add_paged_schema(schemas, "CoursePage", "Course")

    schemas["CourseInvitationCreateRequest"] = object_schema(
        {"expiresAt": INSTANT, "expectedCourseVersion": VERSION},
        ["expiresAt", "expectedCourseVersion"],
    )
    schemas["CourseInvitation"] = object_schema(
        {
            "invitationId": UUID,
            "courseId": UUID,
            "displaySuffix": string_schema(min_length=1),
            "status": string_schema(enum=["ACTIVE", "EXPIRED", "REVOKED", "COURSE_CLOSED", "NOT_CURRENT"]),
            "revocable": {
                "type": "boolean",
                "description": "True only while the invitation is ACTIVE and may still be revoked by the responsible teacher.",
            },
            "expiresAt": INSTANT,
            "version": VERSION,
        },
        ["invitationId", "courseId", "displaySuffix", "status", "revocable", "expiresAt", "version"],
        description="Recoverable teacher-management metadata. The raw invitation code and digest are never returned.",
    )
    add_paged_schema(schemas, "CourseInvitationPage", "CourseInvitation")
    schemas["CreatedCourseInvitation"] = object_schema(
        {
            "invitation": ref("CourseInvitation"),
            "invitationCode": string_schema(
                min_length=1,
                description=(
                    "Sensitive value returned only by the successful creation request and its exact idempotent replays. "
                    "Backend stores only a digest for validation; later read operations never return it."
                ),
            ),
        },
        ["invitation", "invitationCode"],
        description="Secret-bearing creation response; clients must not log, persist, or expose the raw invitation code beyond the user-requested share flow.",
    )
    schemas["CourseInvitationRevokeRequest"] = object_schema(
        {"expectedVersion": VERSION}, ["expectedVersion"]
    )
    schemas["CourseInvitationPreview"] = object_schema(
        {
            "status": string_schema(enum=["ACTIVE", "EXPIRED", "REVOKED", "COURSE_CLOSED", "NOT_CURRENT"]),
            "course": ref("InvitationCourseSummary"),
            "expiresAt": INSTANT,
        },
        ["status", "course", "expiresAt"],
        description=(
            "Every recognized invitation code returns exactly one of the five content states with the safe course and "
            "expiry projection. Unknown, malformed, or unsafe-to-project codes use INVITATION_INVALID instead."
        ),
    )
    schemas["ExistingStudentJoinRequest"] = object_schema(
        {"expectedAccountVersion": VERSION}, ["expectedAccountVersion"]
    )
    schemas["NewStudentRegistrationRequest"] = object_schema(
        {
            "name": string_schema(min_length=1),
            "studentNumber": string_schema(min_length=1),
            "gender": string_schema(enum=["FEMALE", "MALE"]),
            "gradeYear": integer_schema(fmt="int32", minimum=1, maximum=4),
            "college": nullable(string_schema(min_length=1)),
            "major": nullable(string_schema(min_length=1)),
            "administrativeClass": nullable(string_schema(min_length=1)),
            "verifiedEmail": EMAIL,
            "emailOtpProof": ref("OtpProof"),
        },
        [
            "name",
            "studentNumber",
            "gender",
            "gradeYear",
            "college",
            "major",
            "administrativeClass",
            "verifiedEmail",
            "emailOtpProof",
        ],
        description="One use case atomically establishes the verified student account and active enrollment; no formal partial enrollment is returned.",
    )
    schemas["Enrollment"] = object_schema(
        {
            "enrollmentId": UUID,
            "courseId": UUID,
            "student": ref("StudentSummary"),
            "status": string_schema(enum=["ACTIVE", "REMOVED"]),
            "joinedAt": INSTANT,
            "removedAt": nullable(INSTANT),
            "studentVisibleReason": nullable(string_schema(min_length=1)),
            "version": VERSION,
        },
        ["enrollmentId", "courseId", "student", "status", "joinedAt", "removedAt", "studentVisibleReason", "version"],
    )
    add_paged_schema(schemas, "EnrollmentPage", "Enrollment")
    schemas["EnrollmentTransitionRequest"] = object_schema(
        {"expectedVersion": VERSION, "studentVisibleReason": string_schema(min_length=1)},
        ["expectedVersion", "studentVisibleReason"],
    )

    schemas["RosterImportAllocationRequest"] = object_schema(
        {
            "fileName": string_schema(min_length=1),
            "contentType": string_schema(
                enum=[
                    "text/csv",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ]
            ),
            "byteSize": integer_schema(minimum=1, maximum=104857600),
        },
        ["fileName", "contentType", "byteSize"],
    )
    schemas["UploadAllocation"] = object_schema(
        {
            "allocationId": UUID,
            "uploadUrl": string_schema(fmt="uri"),
            "uploadMethod": ref("DirectUploadHttpMethod"),
            "requiredHeaders": {"type": "object", "additionalProperties": {"type": "string"}},
            "expiresAt": INSTANT,
        },
        ["allocationId", "uploadUrl", "uploadMethod", "requiredHeaders", "expiresAt"],
        description=(
            "Short-lived upload authorization. Clients use uploadMethod, the exact requiredHeaders, and the byte body; "
            "internal object keys are never exposed."
        ),
    )
    schemas["RosterImportRequest"] = object_schema(
        {
            "allocationId": UUID,
            "clientChecksumSha256": SHA256,
            "expectedCourseVersion": VERSION,
        },
        ["allocationId", "clientChecksumSha256", "expectedCourseVersion"],
    )
    schemas["RosterSnapshot"] = object_schema(
        {
            "snapshotId": UUID,
            "courseId": UUID,
            "snapshotNumber": integer_schema(minimum=1),
            "sourceFormat": string_schema(enum=["XLSX", "CSV"]),
            "sourceDisplayName": string_schema(min_length=1),
            "sourceByteSize": integer_schema(minimum=1, maximum=104857600),
            "sourceChecksumSha256": SHA256,
            "entryCount": integer_schema(fmt="int32", minimum=1, maximum=500),
            "findingCounts": object_schema(
                {
                    "matched": integer_schema(fmt="int32", minimum=0),
                    "rosterOnly": integer_schema(fmt="int32", minimum=0),
                    "memberOnly": integer_schema(fmt="int32", minimum=0),
                    "identityConflict": integer_schema(fmt="int32", minimum=0),
                    "duplicateOrAmbiguous": integer_schema(fmt="int32", minimum=0),
                    "unresolved": integer_schema(fmt="int32", minimum=0),
                },
                ["matched", "rosterOnly", "memberOnly", "identityConflict", "duplicateOrAmbiguous", "unresolved"],
            ),
            "importedAt": INSTANT,
            "isCurrent": {"type": "boolean"},
        },
        [
            "snapshotId",
            "courseId",
            "snapshotNumber",
            "sourceFormat",
            "sourceDisplayName",
            "sourceByteSize",
            "sourceChecksumSha256",
            "entryCount",
            "findingCounts",
            "importedAt",
            "isCurrent",
        ],
    )
    add_paged_schema(schemas, "RosterSnapshotPage", "RosterSnapshot")
    schemas["RosterFinding"] = object_schema(
        {
            "findingId": UUID,
            "findingNumber": integer_schema(minimum=1),
            "findingType": string_schema(
                enum=["MATCHED", "ROSTER_ONLY", "MEMBER_ONLY", "IDENTITY_CONFLICT", "DUPLICATE_OR_AMBIGUOUS"]
            ),
            "rosterStudentNumber": nullable(string_schema(min_length=1)),
            "rosterName": nullable(string_schema(min_length=1)),
            "enrollment": nullable(ref("Enrollment")),
            "resolvedAt": nullable(INSTANT),
            "resolutionNote": nullable(string_schema(min_length=1)),
            "version": VERSION,
        },
        [
            "findingId",
            "findingNumber",
            "findingType",
            "rosterStudentNumber",
            "rosterName",
            "enrollment",
            "resolvedAt",
            "resolutionNote",
            "version",
        ],
    )
    add_paged_schema(schemas, "RosterFindingPage", "RosterFinding")
    schemas["RosterFindingResolutionRequest"] = object_schema(
        {"expectedVersion": VERSION, "resolutionNote": string_schema(min_length=1)},
        ["expectedVersion", "resolutionNote"],
        description="Records a one-time resolution note. It never auto-merges identities or changes enrollment by implication.",
    )
    schemas["RosterRevertRequest"] = object_schema(
        {"expectedCourseVersion": VERSION, "reason": string_schema(min_length=1)},
        ["expectedCourseVersion", "reason"],
    )

    _register_semester_operations(registry)
    _register_course_operations(registry)
    _register_invitation_and_member_operations(registry)
    _register_roster_operations(registry)


def _register_semester_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="get",
        path="/semesters/current",
        operation_id="getCurrentSemester",
        tag="Semesters",
        summary="Get the unique current semester",
        description=(
            "Returns the organization-wide CURRENT semester. Archived history is not inferred from client time; when no "
            "CURRENT semester exists, returns 404 RESOURCE_NOT_FOUND."
        ),
        roles=["STUDENT", "TEACHER", "ADMIN"],
        success_schema="SemesterSummary",
        resource_scope="CURRENT_ORGANIZATION",
        error_codes=["RESOURCE_NOT_FOUND"],
    )
    registry.add(
        method="get",
        path="/semesters",
        operation_id="listSemesters",
        tag="Semesters",
        summary="List semesters for administration",
        description=(
            "Lists UPCOMING, CURRENT, and ARCHIVED semesters using keyset pagination and returns an organization-wide "
            "summary from the same committed read snapshot. The summary never narrows with list filters or pagination."
        ),
        roles=["ADMIN"],
        permissions=["SEMESTER"],
        success_schema="SemesterPage",
        parameters=[
            query_parameter("status", string_schema(enum=["UPCOMING", "CURRENT", "ARCHIVED"])),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="CURRENT_ORGANIZATION",
    )
    registry.add(
        method="post",
        path="/semesters",
        operation_id="createSemester",
        tag="Semesters",
        summary="Create an upcoming semester",
        description="Creates an UPCOMING semester after validating the consecutive academic year, unique year/term combination, and date order.",
        roles=["ADMIN"],
        permissions=["SEMESTER"],
        success_schema="Semester",
        success_status=201,
        request_schema="SemesterCreateRequest",
        resource_scope="CURRENT_ORGANIZATION",
        idempotent=True,
        error_codes=["SEMESTER_COMBINATION_EXISTS", "VALIDATION_FAILED"],
    )
    registry.add(
        method="put",
        path="/semesters/{semesterId}",
        operation_id="updateUpcomingSemester",
        tag="Semesters",
        summary="Update an upcoming semester",
        description="Updates only an UPCOMING semester and never edits CURRENT or ARCHIVED history.",
        roles=["ADMIN"],
        permissions=["SEMESTER"],
        success_schema="Semester",
        request_schema="SemesterUpdateRequest",
        parameters=[path_parameter("semesterId")],
        resource_scope="CURRENT_ORGANIZATION",
        idempotent=True,
        error_codes=["SEMESTER_NOT_UPCOMING", "SEMESTER_COMBINATION_EXISTS", "VERSION_CONFLICT"],
    )
    registry.add(
        method="post",
        path="/semesters/{semesterId}/current-transition",
        operation_id="switchCurrentSemester",
        tag="Semesters",
        summary="Switch the unique current semester",
        description="Atomically archives the previous CURRENT semester and makes the target UPCOMING semester CURRENT after its Shanghai start date is reached.",
        roles=["ADMIN"],
        permissions=["SEMESTER"],
        success_schema="SemesterSwitchResult",
        request_schema="SemesterSwitchRequest",
        parameters=[path_parameter("semesterId")],
        resource_scope="CURRENT_ORGANIZATION",
        idempotent=True,
        error_codes=["SEMESTER_NOT_UPCOMING", "SEMESTER_START_DATE_NOT_REACHED", "VERSION_CONFLICT"],
    )


def _register_course_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="get",
        path="/teacher/courses",
        operation_id="listOwnCourses",
        tag="Courses",
        summary="List courses owned by the current teacher",
        description="Returns only courses for which the authenticated teacher is the current responsible teacher.",
        roles=["TEACHER"],
        success_schema="CoursePage",
        parameters=[
            query_parameter("status", string_schema(enum=["OPEN", "CLOSED"])),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="post",
        path="/teacher/courses",
        operation_id="createCourse",
        tag="Courses",
        summary="Create a teacher-owned course",
        description="Creates a course in the unique current semester together with its first 1200-minute target revision.",
        roles=["TEACHER"],
        success_schema="Course",
        success_status=201,
        request_schema="CourseCreateRequest",
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["COURSE_TARGET_TOTAL_INVALID", "SEMESTER_NOT_CURRENT", "RESOURCE_NOT_FOUND"],
    )
    registry.add(
        method="get",
        path="/courses/{courseId}",
        operation_id="getCourse",
        tag="Courses",
        summary="Get an authorized course projection",
        description="Returns a course only when the authenticated teacher is its current responsible teacher.",
        roles=["TEACHER"],
        success_schema="Course",
        parameters=[path_parameter("courseId")],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/change-impact",
        operation_id="previewCourseChangeImpact",
        tag="Courses",
        summary="Preview the impact of a course change",
        description="Evaluates affected students, active credit conflicts, and published grades before a responsible teacher changes targets or schedule.",
        roles=["TEACHER"],
        success_schema="CourseChangeImpact",
        request_schema="CourseChangeProposal",
        parameters=[path_parameter("courseId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["COURSE_TARGET_TOTAL_INVALID", "COURSE_TARGET_BELOW_ACTIVE_CREDIT", "VERSION_CONFLICT"],
    )
    registry.add(
        method="put",
        path="/courses/{courseId}",
        operation_id="updateCourse",
        tag="Courses",
        summary="Update a teacher-owned open course",
        description="Applies a previously previewed change. The impact token binds the proposal to the current course version and affected-student set.",
        roles=["TEACHER"],
        success_schema="Course",
        request_schema="CourseUpdateRequest",
        parameters=[path_parameter("courseId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["COURSE_NOT_OPEN", "COURSE_TARGET_TOTAL_INVALID", "COURSE_TARGET_BELOW_ACTIVE_CREDIT", "VERSION_CONFLICT"],
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/closure",
        operation_id="closeCourse",
        tag="Courses",
        summary="Close a teacher-owned course",
        description="Closes the course only after active sessions, roster findings, applications, endurance work, and final-grade blockers are cleared. Closed courses retain all history and cannot be restored by this Contract.",
        roles=["TEACHER"],
        success_schema="Course",
        request_schema="CourseCloseRequest",
        parameters=[path_parameter("courseId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["COURSE_NOT_OPEN", "COURSE_CLOSE_BLOCKED", "VERSION_CONFLICT"],
    )
    registry.add(
        method="get",
        path="/student/course",
        operation_id="getOwnCurrentCourse",
        tag="Courses",
        summary="Get the student's active current-semester course",
        description="Returns only the authenticated student's current active enrollment course.",
        roles=["STUDENT"],
        success_schema="StudentCourse",
        resource_scope="SELF_ACTIVE_ENROLLMENT",
    )
    registry.add(
        method="get",
        path="/admin/current-courses",
        operation_id="listCurrentCoursesForAdmin",
        tag="Courses",
        summary="List current open courses for administration",
        description="Read-only current-course directory. It never exposes record/media drill-down or course mutation actions.",
        roles=["ADMIN"],
        permissions=["COURSE_VIEW"],
        success_schema="AdminCurrentCourseDirectory",
        parameters=[
            query_parameter("q", string_schema(min_length=1), description="Course-name or responsible-teacher keyword."),
            query_parameter("displayStatus", string_schema(enum=["UPCOMING", "ACTIVE"])),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="CURRENT_ORGANIZATION_READ_ONLY",
    )
    registry.add(
        method="get",
        path="/admin/current-courses/{courseId}",
        operation_id="getCurrentCourseForAdmin",
        tag="Courses",
        summary="Get one current course directory projection",
        description="Returns the same read-only facts and capped aggregate metrics as the directory list, without member, record, or media drill-down.",
        roles=["ADMIN"],
        permissions=["COURSE_VIEW"],
        success_schema="AdminCurrentCourseItem",
        parameters=[path_parameter("courseId")],
        resource_scope="CURRENT_ORGANIZATION_READ_ONLY",
    )


def _register_invitation_and_member_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="post",
        path="/courses/{courseId}/invitations",
        operation_id="createCourseInvitation",
        tag="Enrollment",
        summary="Create a course invitation",
        description="Creates a high-entropy invitation for an open current-semester course. Only the responsible teacher receives the raw code.",
        roles=["TEACHER"],
        success_schema="CreatedCourseInvitation",
        success_status=201,
        request_schema="CourseInvitationCreateRequest",
        parameters=[path_parameter("courseId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        sensitive_response=True,
        error_codes=["COURSE_NOT_OPEN", "VERSION_CONFLICT"],
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/invitations",
        operation_id="listCourseInvitations",
        tag="Enrollment",
        summary="List recoverable course-invitation metadata",
        description=(
            "Returns only invitations for a course owned by the authenticated responsible teacher. Status reflects current "
            "expiry, course, and semester facts; the raw invitation code and digest are never returned."
        ),
        roles=["TEACHER"],
        success_schema="CourseInvitationPage",
        parameters=[
            path_parameter("courseId"),
            query_parameter(
                "status",
                string_schema(enum=["ACTIVE", "EXPIRED", "REVOKED", "COURSE_CLOSED", "NOT_CURRENT"]),
            ),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/invitations/{invitationId}/revocation",
        operation_id="revokeCourseInvitation",
        tag="Enrollment",
        summary="Revoke a course invitation",
        description="Revokes the invitation without deleting invitation or enrollment history.",
        roles=["TEACHER"],
        success_schema="CourseInvitation",
        request_schema="CourseInvitationRevokeRequest",
        parameters=[path_parameter("courseId"), path_parameter("invitationId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["VERSION_CONFLICT"],
    )
    registry.add(
        method="get",
        path="/course-invitations/{invitationCode}",
        operation_id="previewCourseInvitation",
        tag="Enrollment",
        summary="Preview a course invitation",
        description=(
            "Returns 200 with ACTIVE, EXPIRED, REVOKED, COURSE_CLOSED, or NOT_CURRENT for every recognized invitation code, "
            "including the safe course and expiry projection. Only unknown, malformed, or unsafe-to-project codes return "
            "422 INVITATION_INVALID. No enrollment is created."
        ),
        roles=["ANONYMOUS", "STUDENT"],
        success_schema="CourseInvitationPreview",
        parameters=[path_parameter("invitationCode", string_schema(min_length=1))],
        resource_scope="PRESENTED_INVITATION_CODE",
        system_mode="NORMAL_REQUIRED",
        error_codes=["INVITATION_INVALID"],
        public=True,
    )
    registry.add(
        method="post",
        path="/course-invitations/{invitationCode}/join",
        operation_id="joinCourseByInvitation",
        tag="Enrollment",
        summary="Join a course as an existing student",
        description="Atomically creates or restores the active enrollment only when the student has no other active current-semester course. Normal joining has no approval state.",
        roles=["STUDENT"],
        success_schema="Enrollment",
        success_status=201,
        request_schema="ExistingStudentJoinRequest",
        parameters=[path_parameter("invitationCode", string_schema(min_length=1))],
        resource_scope="SELF_AND_PRESENTED_INVITATION",
        idempotent=True,
        error_codes=["INVITATION_INVALID", "COURSE_ALREADY_JOINED", "VERSION_CONFLICT"],
    )
    registry.add(
        method="post",
        path="/course-invitations/{invitationCode}/student-registration",
        operation_id="registerStudentAndJoinCourse",
        tag="Enrollment",
        summary="Register a new verified student and join a course",
        description="Consumes a STUDENT_EMAIL_BINDING OTP proof and atomically creates the current account/profile and active enrollment. It never returns a synthetic or partially successful workspace.",
        roles=["ANONYMOUS"],
        success_schema="SessionTokenPair",
        success_status=201,
        request_schema="NewStudentRegistrationRequest",
        parameters=[path_parameter("invitationCode", string_schema(min_length=1))],
        resource_scope="VERIFIED_NEW_STUDENT_AND_PRESENTED_INVITATION",
        idempotent=True,
        error_codes=[
            "INVITATION_INVALID",
            "CHALLENGE_EXPIRED",
            "COURSE_ALREADY_JOINED",
            "EMAIL_ALREADY_IN_USE",
            "STUDENT_NUMBER_ALREADY_IN_USE",
        ],
        public=True,
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/members",
        operation_id="listCourseMembers",
        tag="Enrollment",
        summary="List members of a teacher-owned course",
        description="Returns the minimum teaching projection for current and removed members.",
        roles=["TEACHER"],
        success_schema="EnrollmentPage",
        parameters=[
            path_parameter("courseId"),
            query_parameter("status", string_schema(enum=["ACTIVE", "REMOVED"])),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/members/{enrollmentId}/removal",
        operation_id="removeCourseMember",
        tag="Enrollment",
        summary="Remove a student from a teacher-owned course",
        description="Transitions ACTIVE to REMOVED, preserves all history, updates the current student status to PENDING, and notifies the student.",
        roles=["TEACHER"],
        success_schema="Enrollment",
        request_schema="EnrollmentTransitionRequest",
        parameters=[path_parameter("courseId"), path_parameter("enrollmentId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["ENROLLMENT_NOT_ACTIVE", "VERSION_CONFLICT"],
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/members/{enrollmentId}/restoration",
        operation_id="restoreCourseMember",
        tag="Enrollment",
        summary="Restore a removed course member",
        description="Restores the existing enrollment only when the student has no other active current-semester course. Historical facts are not rewritten.",
        roles=["TEACHER"],
        success_schema="Enrollment",
        request_schema="EnrollmentTransitionRequest",
        parameters=[path_parameter("courseId"), path_parameter("enrollmentId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["COURSE_ALREADY_JOINED", "VERSION_CONFLICT"],
    )


def _register_roster_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="post",
        path="/courses/{courseId}/roster-import-allocations",
        operation_id="allocateRosterImport",
        tag="Rosters",
        summary="Allocate a temporary roster source upload",
        description="Allocates a short-lived upload for one XLSX or CSV source no larger than 100 MiB. The source object is temporary and is discarded after parsing.",
        roles=["TEACHER"],
        success_schema="UploadAllocation",
        success_status=201,
        request_schema="RosterImportAllocationRequest",
        parameters=[path_parameter("courseId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["PAYLOAD_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE"],
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/roster-imports",
        operation_id="importOfficialRoster",
        tag="Rosters",
        summary="Parse and commit an official roster snapshot",
        description="Authoritatively identifies XLSX/CSV content, counts every non-header data row including invalid or duplicate rows, rejects more than 500, and commits the snapshot/findings atomically only after complete parsing.",
        roles=["TEACHER"],
        success_schema="RosterSnapshot",
        success_status=201,
        request_schema="RosterImportRequest",
        parameters=[path_parameter("courseId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=[
            "ROSTER_SOURCE_INVALID",
            "ROSTER_ROW_LIMIT_EXCEEDED",
            "PAYLOAD_TOO_LARGE",
            "UNSUPPORTED_MEDIA_TYPE",
            "VERSION_CONFLICT",
        ],
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/roster-snapshots",
        operation_id="listRosterSnapshots",
        tag="Rosters",
        summary="List roster snapshots",
        description="Lists immutable roster snapshots from newest to oldest.",
        roles=["TEACHER"],
        success_schema="RosterSnapshotPage",
        parameters=[path_parameter("courseId"), *cursor_parameters(default_limit=20, maximum_limit=100)],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/roster-snapshots/{snapshotId}",
        operation_id="getRosterSnapshot",
        tag="Rosters",
        summary="Get a roster snapshot",
        description="Returns snapshot metadata and reconciliation counts; source bytes are not retained or returned.",
        roles=["TEACHER"],
        success_schema="RosterSnapshot",
        parameters=[path_parameter("courseId"), path_parameter("snapshotId")],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/roster-snapshots/{snapshotId}/findings",
        operation_id="listRosterFindings",
        tag="Rosters",
        summary="List reconciliation findings for a snapshot",
        description="Lists all five finding types without automatically merging ambiguous identities.",
        roles=["TEACHER"],
        success_schema="RosterFindingPage",
        parameters=[
            path_parameter("courseId"),
            path_parameter("snapshotId"),
            query_parameter(
                "findingType",
                string_schema(
                    enum=["MATCHED", "ROSTER_ONLY", "MEMBER_ONLY", "IDENTITY_CONFLICT", "DUPLICATE_OR_AMBIGUOUS"]
                ),
            ),
            query_parameter("resolved", {"type": "boolean"}),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/roster-findings/{findingId}/resolution",
        operation_id="resolveRosterFinding",
        tag="Rosters",
        summary="Record a roster finding resolution",
        description="Appends the one-time resolution facts. This operation does not implicitly join, remove, restore, or merge a student identity.",
        roles=["TEACHER"],
        success_schema="RosterFinding",
        request_schema="RosterFindingResolutionRequest",
        parameters=[path_parameter("courseId"), path_parameter("findingId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["ROSTER_FINDING_ALREADY_RESOLVED", "VERSION_CONFLICT"],
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/roster-snapshots/{snapshotId}/current-selection",
        operation_id="revertCurrentRosterSnapshot",
        tag="Rosters",
        summary="Select a prior roster snapshot as current",
        description="Changes only the course's current roster pointer. Enrollment, records, reviews, applications, endurance outcomes, credits, and grades are not reverted.",
        roles=["TEACHER"],
        success_schema="RosterSnapshot",
        request_schema="RosterRevertRequest",
        parameters=[path_parameter("courseId"), path_parameter("snapshotId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["ROSTER_SNAPSHOT_NOT_IN_COURSE", "VERSION_CONFLICT"],
    )
