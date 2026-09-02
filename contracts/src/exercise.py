from __future__ import annotations

from common import (
    INSTANT,
    LOCAL_DATE,
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


def register_exercise(schemas: dict[str, Schema], registry: ContractRegistry) -> None:
    schemas["ExerciseCategory"] = string_schema(enum=["COURSE_RELATED", "OTHER"])
    schemas["ExerciseSession"] = object_schema(
        {
            "sessionId": UUID,
            "courseId": UUID,
            "enrollmentId": UUID,
            "status": string_schema(enum=["ACTIVE", "PAUSED", "COMPLETED"]),
            "businessDate": LOCAL_DATE,
            "startedAt": INSTANT,
            "pausedAt": nullable(INSTANT),
            "completedAt": nullable(INSTANT),
            "elapsedActiveSeconds": integer_schema(minimum=0),
            "actualDurationSeconds": nullable(integer_schema(minimum=0)),
            "stateVersion": VERSION,
        },
        [
            "sessionId",
            "courseId",
            "enrollmentId",
            "status",
            "businessDate",
            "startedAt",
            "pausedAt",
            "completedAt",
            "elapsedActiveSeconds",
            "actualDurationSeconds",
            "stateVersion",
        ],
        description="All formal times, businessDate, elapsed intervals, and actual duration are server-derived. Clients never submit them.",
    )
    schemas["StartExerciseSessionRequest"] = object_schema({"courseId": UUID}, ["courseId"])
    schemas["ExerciseSessionTransitionRequest"] = object_schema(
        {"expectedVersion": VERSION}, ["expectedVersion"]
    )

    schemas["MediaPurpose"] = string_schema(enum=["RECORD_EVIDENCE", "APPLICATION_EVIDENCE"])
    schemas["RecordImageMediaAllocationRequest"] = object_schema(
        {
            "purpose": {"type": "string", "const": "RECORD_EVIDENCE"},
            "sessionId": UUID,
            "mediaKind": {"type": "string", "const": "IMAGE"},
            "declaredContentType": string_schema(enum=["image/jpeg", "image/png"]),
            "declaredByteSize": integer_schema(minimum=1, maximum=10485760),
        },
        ["purpose", "sessionId", "mediaKind", "declaredContentType", "declaredByteSize"],
    )
    schemas["RecordVideoMediaAllocationRequest"] = object_schema(
        {
            "purpose": {"type": "string", "const": "RECORD_EVIDENCE"},
            "sessionId": UUID,
            "mediaKind": {"type": "string", "const": "VIDEO"},
            "declaredContentType": {"type": "string", "const": "video/mp4"},
            "declaredByteSize": integer_schema(minimum=1, maximum=104857600),
        },
        ["purpose", "sessionId", "mediaKind", "declaredContentType", "declaredByteSize"],
    )
    schemas["ApplicationMediaAllocationRequest"] = object_schema(
        {
            "purpose": {"type": "string", "const": "APPLICATION_EVIDENCE"},
            "mediaKind": {"type": "string", "const": "IMAGE"},
            "declaredContentType": string_schema(enum=["image/jpeg", "image/png", "image/webp"]),
            "declaredByteSize": integer_schema(minimum=1, maximum=10485760),
        },
        ["purpose", "mediaKind", "declaredContentType", "declaredByteSize"],
    )
    schemas["MediaAllocationRequest"] = {
        "oneOf": [
            ref("RecordImageMediaAllocationRequest"),
            ref("RecordVideoMediaAllocationRequest"),
            ref("ApplicationMediaAllocationRequest"),
        ],
    }
    schemas["MediaAllocation"] = object_schema(
        {
            "mediaAssetId": UUID,
            "purpose": ref("MediaPurpose"),
            "status": {"type": "string", "const": "ALLOCATED"},
            "uploadUrl": string_schema(fmt="uri"),
            "uploadMethod": ref("DirectUploadHttpMethod"),
            "requiredHeaders": {"type": "object", "additionalProperties": {"type": "string"}},
            "expiresAt": INSTANT,
        },
        ["mediaAssetId", "purpose", "status", "uploadUrl", "uploadMethod", "requiredHeaders", "expiresAt"],
        description=(
            "Short-lived least-privilege upload authorization. Clients use uploadMethod, the exact requiredHeaders, and "
            "the byte body; internal object keys are never returned."
        ),
    )
    schemas["FinalizeMediaRequest"] = object_schema(
        {"clientChecksumSha256": nullable(SHA256)},
        ["clientChecksumSha256"],
        description="The checksum is an optional client integrity assertion. Backend/COS probing remains authoritative.",
    )
    schemas["MediaFinalizationRejectionCode"] = string_schema(
        enum=[
            "MEDIA_ALLOCATION_EXPIRED",
            "MEDIA_CONTENT_INVALID",
            "MEDIA_LIMIT_EXCEEDED",
            "PAYLOAD_TOO_LARGE",
            "UNSUPPORTED_MEDIA_TYPE",
        ],
        description=(
            "Stable expected finalization outcome. These values are returned only inside a 200 terminal MediaAsset; "
            "transport, authorization, dependency, and internal failures remain ErrorEnvelope responses."
        ),
    )
    schemas["MediaAsset"] = object_schema(
        {
            "mediaAssetId": UUID,
            "purpose": ref("MediaPurpose"),
            "mediaKind": string_schema(enum=["IMAGE", "VIDEO"]),
            "contentType": nullable(string_schema(enum=["image/jpeg", "image/png", "image/webp", "video/mp4"])),
            "byteSize": nullable(integer_schema(minimum=1)),
            "checksumSha256": nullable(SHA256),
            "durationMilliseconds": nullable(integer_schema(minimum=0)),
            "hasAudio": nullable({"type": "boolean"}),
            "widthPixels": nullable(integer_schema(fmt="int32", minimum=1)),
            "heightPixels": nullable(integer_schema(fmt="int32", minimum=1)),
            "status": string_schema(enum=["ALLOCATED", "UPLOADED", "VERIFIED", "BOUND", "REJECTED", "EXPIRED"]),
            "rejectionCode": nullable(ref("MediaFinalizationRejectionCode")),
            "version": VERSION,
        },
        [
            "mediaAssetId",
            "purpose",
            "mediaKind",
            "contentType",
            "byteSize",
            "checksumSha256",
            "durationMilliseconds",
            "hasAudio",
            "widthPixels",
            "heightPixels",
            "status",
            "rejectionCode",
            "version",
        ],
        description=(
            "rejectionCode is non-null for REJECTED, equals MEDIA_ALLOCATION_EXPIRED for EXPIRED, and is null for "
            "ALLOCATED, UPLOADED, VERIFIED, and BOUND."
        ),
    )
    schemas["MediaAsset"]["allOf"] = [
        {
            "if": {"properties": {"status": {"const": "REJECTED"}}, "required": ["status"]},
            "then": {
                "properties": {
                    "rejectionCode": string_schema(
                        enum=[
                            "MEDIA_CONTENT_INVALID",
                            "MEDIA_LIMIT_EXCEEDED",
                            "PAYLOAD_TOO_LARGE",
                            "UNSUPPORTED_MEDIA_TYPE",
                        ]
                    )
                }
            },
        },
        {
            "if": {"properties": {"status": {"const": "EXPIRED"}}, "required": ["status"]},
            "then": {"properties": {"rejectionCode": {"type": "string", "const": "MEDIA_ALLOCATION_EXPIRED"}}},
        },
        {
            "if": {
                "properties": {"status": {"enum": ["ALLOCATED", "UPLOADED", "VERIFIED", "BOUND"]}},
                "required": ["status"],
            },
            "then": {"properties": {"rejectionCode": {"type": "null"}}},
        },
    ]
    schemas["MediaFinalizationResult"] = {
        "allOf": [
            ref("MediaAsset"),
            {
                "type": "object",
                "properties": {"status": string_schema(enum=["VERIFIED", "REJECTED", "EXPIRED"])},
                "required": ["status"],
            },
        ],
        "description": "The unique 200 result channel for expected media finalization outcomes.",
    }
    schemas["MediaDownloadAuthorization"] = object_schema(
        {
            "mediaAssetId": UUID,
            "downloadUrl": string_schema(fmt="uri"),
            "expiresAt": INSTANT,
            "contentType": string_schema(min_length=1),
        },
        ["mediaAssetId", "downloadUrl", "expiresAt", "contentType"],
        description="Short-lived authorized read URL; it must not be persisted as a business fact.",
    )

    schemas["RecordReviewSummary"] = object_schema(
        {
            "result": string_schema(enum=["VALID", "INVALID"]),
            "studentVisibleReason": nullable(string_schema(min_length=1)),
            "sequenceNumber": integer_schema(minimum=0),
            "updatedAt": INSTANT,
            "version": VERSION,
        },
        ["result", "studentVisibleReason", "sequenceNumber", "updatedAt", "version"],
    )
    schemas["ExerciseRecord"] = object_schema(
        {
            "recordId": UUID,
            "sessionId": UUID,
            "courseId": UUID,
            "enrollmentId": UUID,
            "student": ref("StudentSummary"),
            "businessDate": LOCAL_DATE,
            "category": ref("ExerciseCategory"),
            "description": string_schema(min_length=1, max_length=200),
            "actualDurationSeconds": integer_schema(minimum=0),
            "creditedMinutes": {"type": "integer", "format": "int32", "enum": [0, 60, 120]},
            "media": array_of(ref("MediaAsset"), min_items=1, max_items=7),
            "currentReview": ref("RecordReviewSummary"),
            "submittedAt": INSTANT,
        },
        [
            "recordId",
            "sessionId",
            "courseId",
            "enrollmentId",
            "student",
            "businessDate",
            "category",
            "description",
            "actualDurationSeconds",
            "creditedMinutes",
            "media",
            "currentReview",
            "submittedAt",
        ],
        description="Immutable exercise facts plus a separate current review projection. INVALID never rewrites creditedMinutes.",
    )
    schemas["SubmitExerciseRecordRequest"] = object_schema(
        {
            "category": ref("ExerciseCategory"),
            "description": string_schema(min_length=1, max_length=200),
            "mediaAssetIds": array_of(UUID, min_items=1, max_items=7),
        },
        ["category", "description", "mediaAssetIds"],
        description="Does not accept actual duration, credited minutes, business date, review result, or formal timestamps.",
    )
    add_paged_schema(schemas, "ExerciseRecordPage", "ExerciseRecord")
    schemas["RecordReview"] = object_schema(
        {
            "reviewId": UUID,
            "recordId": UUID,
            "sequenceNumber": integer_schema(minimum=0),
            "fromResult": nullable(string_schema(enum=["VALID", "INVALID"])),
            "result": string_schema(enum=["VALID", "INVALID"]),
            "actorType": string_schema(enum=["SYSTEM", "TEACHER"]),
            "reviewer": nullable(ref("TeacherSummary")),
            "studentVisibleReason": nullable(string_schema(min_length=1)),
            "occurredAt": INSTANT,
        },
        [
            "reviewId",
            "recordId",
            "sequenceNumber",
            "fromResult",
            "result",
            "actorType",
            "reviewer",
            "studentVisibleReason",
            "occurredAt",
        ],
    )
    add_paged_schema(schemas, "RecordReviewPage", "RecordReview")
    schemas["AppendRecordReviewRequest"] = object_schema(
        {
            "result": string_schema(enum=["VALID", "INVALID"]),
            "studentVisibleReason": string_schema(min_length=1),
            "expectedVersion": VERSION,
        },
        ["result", "studentVisibleReason", "expectedVersion"],
    )

    schemas["ProgressCategory"] = object_schema(
        {
            "category": ref("ExerciseCategory"),
            "targetMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "validRecordMinutes": integer_schema(fmt="int32", minimum=0),
            "activeCertificationMinutes": integer_schema(fmt="int32", minimum=0),
            "rawCombinedMinutes": integer_schema(fmt="int32", minimum=0),
            "cappedCompletedMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "remainingMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
        },
        [
            "category",
            "targetMinutes",
            "validRecordMinutes",
            "activeCertificationMinutes",
            "rawCombinedMinutes",
            "cappedCompletedMinutes",
            "remainingMinutes",
        ],
    )
    schemas["StudentCourseProgress"] = object_schema(
        {
            "courseId": UUID,
            "enrollmentId": UUID,
            "student": ref("StudentSummary"),
            "categories": array_of(ref("ProgressCategory"), min_items=2, max_items=2),
            "totalTargetMinutes": {"type": "integer", "format": "int32", "const": 1200},
            "totalCompletedMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "completionRatio": number_schema(minimum=0, maximum=1),
            "displayPercent": integer_schema(fmt="int32", minimum=0, maximum=100),
            "targetMet": {"type": "boolean"},
            "newSessionAllowed": {"type": "boolean"},
            "computedAt": INSTANT,
        },
        [
            "courseId",
            "enrollmentId",
            "student",
            "categories",
            "totalTargetMinutes",
            "totalCompletedMinutes",
            "completionRatio",
            "displayPercent",
            "targetMet",
            "newSessionAllowed",
            "computedAt",
        ],
        description="Business decisions use raw integer minutes. displayPercent is rounded for UI only.",
    )
    add_paged_schema(schemas, "StudentCourseProgressPage", "StudentCourseProgress")

    _register_session_operations(registry)
    _register_media_operations(registry)
    _register_record_operations(registry)
    _register_statistics_operations(registry)


def _register_session_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="get",
        path="/student/exercise-sessions/active",
        operation_id="getOwnActiveExerciseSession",
        tag="Exercise sessions",
        summary="Get the student's active or paused session",
        description="Returns the single ACTIVE or PAUSED session owned by the current student, or 404 when none exists.",
        roles=["STUDENT"],
        success_schema="ExerciseSession",
        resource_scope="SELF",
        error_codes=["RESOURCE_NOT_FOUND"],
    )
    registry.add(
        method="post",
        path="/exercise-sessions",
        operation_id="startExerciseSession",
        tag="Exercise sessions",
        summary="Start an exercise session",
        description="Uses the server instant to open the first ACTIVE interval and fix the Asia/Shanghai business date after checking enrollment, current semester, check-in window, target, and single-session constraints.",
        roles=["STUDENT"],
        success_schema="ExerciseSession",
        success_status=201,
        request_schema="StartExerciseSessionRequest",
        resource_scope="SELF_ACTIVE_ENROLLMENT",
        idempotent=True,
        error_codes=[
            "ENROLLMENT_NOT_ACTIVE",
            "COURSE_NOT_OPEN",
            "SESSION_ALREADY_ACTIVE",
            "CHECKIN_WINDOW_CLOSED",
            "COURSE_TARGET_ALREADY_MET",
        ],
    )
    registry.add(
        method="get",
        path="/exercise-sessions/{sessionId}",
        operation_id="getExerciseSession",
        tag="Exercise sessions",
        summary="Get an authorized exercise session",
        description="Students read their own session; the responsible teacher may read the completed teaching projection.",
        roles=["STUDENT", "TEACHER"],
        success_schema="ExerciseSession",
        parameters=[path_parameter("sessionId")],
        resource_scope="SESSION_OWNER_OR_RESPONSIBLE_TEACHER",
    )
    for action, operation_id, summary in [
        ("pause", "pauseExerciseSession", "Pause an active exercise session"),
        ("resume", "resumeExerciseSession", "Resume a paused exercise session"),
        ("complete", "completeExerciseSession", "Complete an active or paused exercise session"),
    ]:
        registry.add(
            method="post",
            path=f"/exercise-sessions/{{sessionId}}/{action}",
            operation_id=operation_id,
            tag="Exercise sessions",
            summary=summary,
            description="Uses only the server clock and optimistic state version. Completed is terminal and cannot return to ACTIVE or PAUSED.",
            roles=["STUDENT"],
            success_schema="ExerciseSession",
            request_schema="ExerciseSessionTransitionRequest",
            parameters=[path_parameter("sessionId")],
            resource_scope="SESSION_OWNER",
            idempotent=True,
            error_codes=["SESSION_TRANSITION_INVALID", "VERSION_CONFLICT"],
        )


def _register_media_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="post",
        path="/media-assets",
        operation_id="allocateMediaAsset",
        tag="Media evidence",
        summary="Allocate a purpose-bound evidence upload",
        description="Allocates a short-lived upload for record evidence or application evidence. Declared metadata is preflight only; Backend content probing remains authoritative.",
        roles=["STUDENT"],
        success_schema="MediaAllocation",
        success_status=201,
        request_schema="MediaAllocationRequest",
        resource_scope="SELF_AND_DECLARED_PURPOSE",
        idempotent=True,
        error_codes=["MEDIA_LIMIT_EXCEEDED", "PAYLOAD_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE"],
    )
    registry.add(
        method="post",
        path="/media-assets/{mediaAssetId}/finalization",
        operation_id="finalizeMediaAsset",
        tag="Media evidence",
        summary="Probe and finalize an uploaded media asset",
        description=(
            "Reads authoritative object metadata and content, computes checksum, and verifies MIME, size, image/video "
            "structure, video duration, and audio. Expected outcomes use one 200 MediaFinalizationResult channel: VERIFIED, "
            "REJECTED with a stable rejectionCode, or EXPIRED with MEDIA_ALLOCATION_EXPIRED."
        ),
        roles=["STUDENT"],
        success_schema="MediaFinalizationResult",
        request_schema="FinalizeMediaRequest",
        parameters=[path_parameter("mediaAssetId")],
        resource_scope="MEDIA_OWNER",
        idempotent=True,
        error_codes=["DEPENDENCY_UNAVAILABLE"],
    )
    registry.add(
        method="post",
        path="/media-assets/{mediaAssetId}/download-authorization",
        operation_id="authorizeMediaDownload",
        tag="Media evidence",
        summary="Authorize a short-lived evidence download",
        description="Rechecks the caller's record/application ownership or responsible-teacher scope and returns a short-lived URL. Object keys and permanent URLs are never exposed.",
        roles=["STUDENT", "TEACHER"],
        success_schema="MediaDownloadAuthorization",
        parameters=[path_parameter("mediaAssetId")],
        resource_scope="MEDIA_OWNER_OR_RESPONSIBLE_TEACHER",
        natural_idempotency="No business fact is changed; each response is an independently expiring authorization.",
        error_codes=["MEDIA_OWNERSHIP_MISMATCH", "DEPENDENCY_UNAVAILABLE"],
    )


def _register_record_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="post",
        path="/exercise-sessions/{sessionId}/record",
        operation_id="submitExerciseRecord",
        tag="Exercise records",
        summary="Submit a formal exercise record",
        description="Atomically creates the immutable Record, binds verified evidence, derives actual duration/business date/0-60-120 credited minutes from the completed Session, and creates the initial SYSTEM VALID review. No draft, pending-review, resubmission, or attempt state is created.",
        roles=["STUDENT"],
        success_schema="ExerciseRecord",
        success_status=201,
        request_schema="SubmitExerciseRecordRequest",
        parameters=[path_parameter("sessionId")],
        resource_scope="SESSION_OWNER",
        idempotent=True,
        error_codes=[
            "SESSION_TRANSITION_INVALID",
            "DAILY_RECORD_ALREADY_EXISTS",
            "MEDIA_NOT_VERIFIED",
            "MEDIA_OWNERSHIP_MISMATCH",
            "MEDIA_ALREADY_BOUND",
            "MEDIA_LIMIT_EXCEEDED",
            "MEDIA_CONTENT_INVALID",
            "RECORD_DESCRIPTION_INVALID",
        ],
    )
    registry.add(
        method="get",
        path="/student/exercise-records",
        operation_id="listOwnExerciseRecords",
        tag="Exercise records",
        summary="List the student's exercise records",
        description="Lists immutable records from newest to oldest with the separate current review projection.",
        roles=["STUDENT"],
        success_schema="ExerciseRecordPage",
        parameters=[
            query_parameter("courseId", UUID),
            query_parameter("reviewResult", string_schema(enum=["VALID", "INVALID"])),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="SELF",
    )
    registry.add(
        method="get",
        path="/student/exercise-records/{recordId}",
        operation_id="getOwnExerciseRecord",
        tag="Exercise records",
        summary="Get the student's exercise record",
        description="Returns one formal record owned by the authenticated student.",
        roles=["STUDENT"],
        success_schema="ExerciseRecord",
        parameters=[path_parameter("recordId")],
        resource_scope="SELF",
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/exercise-records",
        operation_id="listCourseExerciseRecords",
        tag="Exercise records",
        summary="List exercise records for a teacher-owned course",
        description="Lists only records in the responsible teacher's course and exposes no internal storage metadata.",
        roles=["TEACHER"],
        success_schema="ExerciseRecordPage",
        parameters=[
            path_parameter("courseId"),
            query_parameter("studentId", UUID),
            query_parameter("reviewResult", string_schema(enum=["VALID", "INVALID"])),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/exercise-records/{recordId}",
        operation_id="getCourseExerciseRecord",
        tag="Exercise records",
        summary="Get an exercise record for review",
        description="Returns a record only when it belongs to the responsible teacher's course.",
        roles=["TEACHER"],
        success_schema="ExerciseRecord",
        parameters=[path_parameter("courseId"), path_parameter("recordId")],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/exercise-records/{recordId}/reviews",
        operation_id="appendExerciseRecordReview",
        tag="Exercise records",
        summary="Append a teacher review result",
        description="Appends a student-visible VALID or INVALID decision that must change the current result. It never changes the Record, media, actual duration, credited minutes, or daily submission slot.",
        roles=["TEACHER"],
        success_schema="RecordReview",
        success_status=201,
        request_schema="AppendRecordReviewRequest",
        parameters=[path_parameter("courseId"), path_parameter("recordId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["REVIEW_RESULT_UNCHANGED", "VERSION_CONFLICT"],
    )
    registry.add(
        method="get",
        path="/exercise-records/{recordId}/reviews",
        operation_id="listExerciseRecordReviews",
        tag="Exercise records",
        summary="List append-only review history",
        description="Students may read their own record history; the responsible teacher may read course history.",
        roles=["STUDENT", "TEACHER"],
        success_schema="RecordReviewPage",
        parameters=[path_parameter("recordId"), *cursor_parameters(default_limit=20, maximum_limit=100)],
        resource_scope="RECORD_OWNER_OR_RESPONSIBLE_TEACHER",
    )


def _register_statistics_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="get",
        path="/student/progress",
        operation_id="getOwnCourseProgress",
        tag="Statistics",
        summary="Get the student's current course progress",
        description="Separately reports VALID-record minutes and active-certification minutes, then category caps, total raw ratio, rounded display percent, and eligibility. Endurance and final grade are not included in the 20-hour calculation.",
        roles=["STUDENT"],
        success_schema="StudentCourseProgress",
        resource_scope="SELF_ACTIVE_ENROLLMENT",
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/members/{enrollmentId}/progress",
        operation_id="getCourseMemberProgress",
        tag="Statistics",
        summary="Get one course member's progress",
        description="Returns the responsible teacher's student-level capped progress projection.",
        roles=["TEACHER"],
        success_schema="StudentCourseProgress",
        parameters=[path_parameter("courseId"), path_parameter("enrollmentId")],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/progress",
        operation_id="listCourseProgress",
        tag="Statistics",
        summary="List student-level progress for a course",
        description="Paginates student-level results after each category is capped; consumers must not aggregate raw class facts before the student-level caps.",
        roles=["TEACHER"],
        success_schema="StudentCourseProgressPage",
        parameters=[path_parameter("courseId"), *cursor_parameters(default_limit=20, maximum_limit=100)],
        resource_scope="RESPONSIBLE_TEACHER",
    )
