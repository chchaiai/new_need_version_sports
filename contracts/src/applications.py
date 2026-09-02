from __future__ import annotations

from common import (
    INSTANT,
    LOCAL_DATE,
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


def register_applications(schemas: dict[str, Schema], registry: ContractRegistry) -> None:
    _register_application_schemas(schemas)
    _register_endurance_schemas(schemas)
    _register_grade_schemas(schemas)
    _register_application_operations(registry)
    _register_endurance_operations(registry)
    _register_grade_operations(registry)


def _register_application_schemas(schemas: dict[str, Schema]) -> None:
    schemas["ApplicationType"] = string_schema(enum=["EXEMPTION", "CERTIFICATION"])
    schemas["ApplicationStatus"] = string_schema(
        enum=["SUBMITTED", "SUPPLEMENT_REQUIRED", "APPROVED", "REJECTED"]
    )
    schemas["CertificationKind"] = string_schema(enum=["SCHOOL_TEAM", "STUDENT_CLUB"])
    schemas["CertificationDetails"] = object_schema(
        {
            "certificationKind": ref("CertificationKind"),
            "organizationOrTeamName": string_schema(min_length=1),
            "validFrom": LOCAL_DATE,
            "validTo": LOCAL_DATE,
        },
        ["certificationKind", "organizationOrTeamName", "validFrom", "validTo"],
        description=(
            "The required closed certification kind is persisted and returned unchanged; organization or team names "
            "must never be used to infer the kind."
        ),
    )
    schemas["CreateExemptionApplicationRequest"] = object_schema(
        {
            "applicationType": {"type": "string", "const": "EXEMPTION"},
            "courseId": UUID,
            "evidenceAssetIds": array_of(UUID, min_items=1, max_items=3),
        },
        ["applicationType", "courseId", "evidenceAssetIds"],
    )
    schemas["CreateCertificationApplicationRequest"] = object_schema(
        {
            "applicationType": {"type": "string", "const": "CERTIFICATION"},
            "courseId": UUID,
            "certification": ref("CertificationDetails"),
            "evidenceAssetIds": array_of(UUID, min_items=1, max_items=3),
        },
        ["applicationType", "courseId", "certification", "evidenceAssetIds"],
    )
    schemas["CreateStudentApplicationRequest"] = {
        "oneOf": [ref("CreateExemptionApplicationRequest"), ref("CreateCertificationApplicationRequest")],
        "discriminator": {"propertyName": "applicationType"},
    }
    schemas["SupplementApplicationRequest"] = object_schema(
        {
            "evidenceAssetIds": array_of(UUID, min_items=1, max_items=3),
            "expectedVersion": VERSION,
        },
        ["evidenceAssetIds", "expectedVersion"],
    )
    schemas["ApplicationDecision"] = object_schema(
        {
            "decisionId": UUID,
            "sequenceNumber": integer_schema(minimum=1),
            "decision": string_schema(enum=["APPROVE", "REJECT", "REQUEST_SUPPLEMENT"]),
            "fromStatus": ref("ApplicationStatus"),
            "toStatus": ref("ApplicationStatus"),
            "studentVisibleMessage": string_schema(min_length=1),
            "decidedBy": ref("TeacherSummary"),
            "occurredAt": INSTANT,
        },
        [
            "decisionId",
            "sequenceNumber",
            "decision",
            "fromStatus",
            "toStatus",
            "studentVisibleMessage",
            "decidedBy",
            "occurredAt",
        ],
    )
    schemas["CertificationCredit"] = object_schema(
        {
            "state": string_schema(enum=["ACTIVE", "REVOKED"]),
            "courseRelatedMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "otherMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "revisionNumber": integer_schema(minimum=1),
            "studentVisibleReason": string_schema(min_length=1),
            "updatedAt": INSTANT,
            "version": VERSION,
        },
        [
            "state",
            "courseRelatedMinutes",
            "otherMinutes",
            "revisionNumber",
            "studentVisibleReason",
            "updatedAt",
            "version",
        ],
    )
    schemas["StudentApplication"] = object_schema(
        {
            "applicationId": UUID,
            "applicationNumber": string_schema(min_length=1),
            "applicationType": ref("ApplicationType"),
            "courseId": UUID,
            "enrollmentId": UUID,
            "student": ref("StudentSummary"),
            "status": ref("ApplicationStatus"),
            "certification": nullable(ref("CertificationDetails")),
            "evidence": array_of(ref("MediaAsset"), min_items=1, max_items=3),
            "decisions": array_of(ref("ApplicationDecision")),
            "certificationCredit": nullable(ref("CertificationCredit")),
            "submittedAt": INSTANT,
            "updatedAt": INSTANT,
            "version": VERSION,
        },
        [
            "applicationId",
            "applicationNumber",
            "applicationType",
            "courseId",
            "enrollmentId",
            "student",
            "status",
            "certification",
            "evidence",
            "decisions",
            "certificationCredit",
            "submittedAt",
            "updatedAt",
            "version",
        ],
    )
    add_paged_schema(schemas, "StudentApplicationPage", "StudentApplication")
    schemas["RequestSupplementDecisionRequest"] = object_schema(
        {
            "decision": {"type": "string", "const": "REQUEST_SUPPLEMENT"},
            "studentVisibleMessage": string_schema(min_length=1),
            "expectedVersion": VERSION,
        },
        ["decision", "studentVisibleMessage", "expectedVersion"],
    )
    schemas["RejectApplicationDecisionRequest"] = object_schema(
        {
            "decision": {"type": "string", "const": "REJECT"},
            "studentVisibleMessage": string_schema(min_length=1),
            "expectedVersion": VERSION,
        },
        ["decision", "studentVisibleMessage", "expectedVersion"],
    )
    schemas["ApproveExemptionDecisionRequest"] = object_schema(
        {
            "decision": {"type": "string", "const": "APPROVE"},
            "applicationType": {"type": "string", "const": "EXEMPTION"},
            "studentVisibleMessage": string_schema(min_length=1),
            "expectedVersion": VERSION,
            "expectedEnduranceOutcomeVersion": VERSION,
        },
        ["decision", "applicationType", "studentVisibleMessage", "expectedVersion", "expectedEnduranceOutcomeVersion"],
    )
    schemas["ApproveCertificationDecisionRequest"] = object_schema(
        {
            "decision": {"type": "string", "const": "APPROVE"},
            "applicationType": {"type": "string", "const": "CERTIFICATION"},
            "studentVisibleMessage": string_schema(min_length=1),
            "courseRelatedCreditMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "otherCreditMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "expectedVersion": VERSION,
        },
        [
            "decision",
            "applicationType",
            "studentVisibleMessage",
            "courseRelatedCreditMinutes",
            "otherCreditMinutes",
            "expectedVersion",
        ],
    )
    schemas["ApplicationDecisionRequest"] = {
        "oneOf": [
            ref("RequestSupplementDecisionRequest"),
            ref("RejectApplicationDecisionRequest"),
            ref("ApproveExemptionDecisionRequest"),
            ref("ApproveCertificationDecisionRequest"),
        ],
    }
    schemas["AdjustCertificationCreditRequest"] = object_schema(
        {
            "courseRelatedCreditMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "otherCreditMinutes": integer_schema(fmt="int32", minimum=0, maximum=1200),
            "studentVisibleReason": string_schema(min_length=1),
            "expectedVersion": VERSION,
        },
        ["courseRelatedCreditMinutes", "otherCreditMinutes", "studentVisibleReason", "expectedVersion"],
    )
    schemas["RevokeCertificationCreditRequest"] = object_schema(
        {"studentVisibleReason": string_schema(min_length=1), "expectedVersion": VERSION},
        ["studentVisibleReason", "expectedVersion"],
    )


def _register_endurance_schemas(schemas: dict[str, Schema]) -> None:
    schemas["EnduranceConversion"] = object_schema(
        {
            "score": integer_schema(fmt="int32", minimum=0, maximum=100),
            "level": string_schema(enum=["EXCELLENT", "GOOD", "PASS", "FAIL"]),
            "ruleRevisionNumber": integer_schema(minimum=1),
            "convertedAt": INSTANT,
        },
        ["score", "level", "ruleRevisionNumber", "convertedAt"],
    )
    schemas["EnduranceOutcome"] = object_schema(
        {
            "enrollmentId": UUID,
            "outcome": string_schema(enum=["UNRECORDED", "MEASURED", "EXEMPT"]),
            "distanceMeters": nullable({"type": "integer", "format": "int32", "enum": [800, 1000]}),
            "durationSeconds": nullable(integer_schema(fmt="int32", minimum=0)),
            "conversion": nullable(ref("EnduranceConversion")),
            "approvedExemptionApplicationId": nullable(UUID),
            "updatedAt": INSTANT,
            "version": VERSION,
        },
        [
            "enrollmentId",
            "outcome",
            "distanceMeters",
            "durationSeconds",
            "conversion",
            "approvedExemptionApplicationId",
            "updatedAt",
            "version",
        ],
        description="Endurance outcome is independent from 20-hour progress and final grade. A missing unique conversion is represented by conversion null.",
    )
    schemas["ConfirmEnduranceMeasurementRequest"] = object_schema(
        {"durationSeconds": integer_schema(fmt="int32", minimum=0), "expectedVersion": VERSION},
        ["durationSeconds", "expectedVersion"],
    )
    schemas["EnduranceRuleInterval"] = object_schema(
        {
            "intervalId": UUID,
            "lowerSeconds": integer_schema(fmt="int32", minimum=0),
            "upperSeconds": integer_schema(fmt="int32", minimum=0),
            "score": integer_schema(fmt="int32", minimum=0, maximum=100),
            "level": string_schema(enum=["EXCELLENT", "GOOD", "PASS", "FAIL"]),
            "remark": nullable(string_schema(min_length=1)),
        },
        ["intervalId", "lowerSeconds", "upperSeconds", "score", "level", "remark"],
    )
    schemas["EnduranceRuleTable"] = object_schema(
        {
            "ruleTableId": UUID,
            "gender": string_schema(enum=["FEMALE", "MALE"]),
            "gradeGroup": string_schema(enum=["Y1_Y2", "Y3_Y4"]),
            "distanceMeters": {"type": "integer", "format": "int32", "enum": [800, 1000]},
            "revisionNumber": integer_schema(minimum=1),
            "intervals": array_of(ref("EnduranceRuleInterval"), min_items=1),
            "version": VERSION,
            "updatedAt": INSTANT,
        },
        ["ruleTableId", "gender", "gradeGroup", "distanceMeters", "revisionNumber", "intervals", "version", "updatedAt"],
    )
    schemas["EnduranceRuleTableSummary"] = object_schema(
        {
            "ruleTableId": UUID,
            "gender": string_schema(enum=["FEMALE", "MALE"]),
            "gradeGroup": string_schema(enum=["Y1_Y2", "Y3_Y4"]),
            "distanceMeters": {"type": "integer", "format": "int32", "enum": [800, 1000]},
            "ruleCount": integer_schema(fmt="int32", minimum=1),
            "version": VERSION,
        },
        ["ruleTableId", "gender", "gradeGroup", "distanceMeters", "ruleCount", "version"],
    )
    schemas["EnduranceRuleTableList"] = object_schema(
        {"items": array_of(ref("EnduranceRuleTableSummary"), min_items=4, max_items=4)}, ["items"]
    )
    schemas["AddEnduranceRuleIntervalChange"] = object_schema(
        {
            "action": {"type": "string", "const": "ADD"},
            "lowerSeconds": integer_schema(fmt="int32", minimum=0),
            "upperSeconds": integer_schema(fmt="int32", minimum=0),
            "score": integer_schema(fmt="int32", minimum=0, maximum=100),
            "level": string_schema(enum=["EXCELLENT", "GOOD", "PASS", "FAIL"]),
            "remark": nullable(string_schema(min_length=1)),
        },
        ["action", "lowerSeconds", "upperSeconds", "score", "level", "remark"],
    )
    schemas["UpdateEnduranceRuleIntervalChange"] = object_schema(
        {
            "action": {"type": "string", "const": "UPDATE"},
            "intervalId": UUID,
            "lowerSeconds": integer_schema(fmt="int32", minimum=0),
            "upperSeconds": integer_schema(fmt="int32", minimum=0),
            "score": integer_schema(fmt="int32", minimum=0, maximum=100),
            "level": string_schema(enum=["EXCELLENT", "GOOD", "PASS", "FAIL"]),
            "remark": nullable(string_schema(min_length=1)),
        },
        ["action", "intervalId", "lowerSeconds", "upperSeconds", "score", "level", "remark"],
    )
    schemas["DeleteEnduranceRuleIntervalChange"] = object_schema(
        {"action": {"type": "string", "const": "DELETE"}, "intervalId": UUID},
        ["action", "intervalId"],
    )
    schemas["ReviseEnduranceRuleTableRequest"] = object_schema(
        {
            "expectedVersion": VERSION,
            "change": {
                "oneOf": [
                    ref("AddEnduranceRuleIntervalChange"),
                    ref("UpdateEnduranceRuleIntervalChange"),
                    ref("DeleteEnduranceRuleIntervalChange"),
                ],
                "discriminator": {"propertyName": "action"},
            },
        },
        ["expectedVersion", "change"],
        description="Backend applies one declared change to the complete current table, validates the entire candidate revision, and atomically switches only if valid.",
    )


def _register_grade_schemas(schemas: dict[str, Schema]) -> None:
    schemas["FinalGradePublication"] = object_schema(
        {
            "publicationId": UUID,
            "enrollmentId": UUID,
            "sequenceNumber": integer_schema(minimum=1),
            "gradeValue": integer_schema(fmt="int32", description="Any signed int32 value; intentionally no 0-100 constraint."),
            "remark": nullable(string_schema(max_length=50)),
            "publishedBy": ref("TeacherSummary"),
            "publishedAt": INSTANT,
        },
        ["publicationId", "enrollmentId", "sequenceNumber", "gradeValue", "remark", "publishedBy", "publishedAt"],
    )
    schemas["FinalGradeState"] = object_schema(
        {
            "enrollmentId": UUID,
            "currentPublication": nullable(ref("FinalGradePublication")),
            "version": VERSION,
            "updatedAt": nullable(INSTANT),
        },
        ["enrollmentId", "currentPublication", "version", "updatedAt"],
    )
    schemas["PublishFinalGradeRequest"] = object_schema(
        {
            "gradeValue": integer_schema(fmt="int32", description="No minimum or maximum beyond signed int32."),
            "remark": nullable(string_schema(max_length=50)),
            "expectedVersion": VERSION,
        },
        ["gradeValue", "remark", "expectedVersion"],
    )
    add_paged_schema(schemas, "FinalGradeStatePage", "FinalGradeState")
    add_paged_schema(schemas, "FinalGradePublicationPage", "FinalGradePublication")


def _register_application_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="post",
        path="/student/applications",
        operation_id="createStudentApplication",
        tag="Applications",
        summary="Submit an exemption or certification application",
        description="Creates the formal SUBMITTED application only after binding one to three VERIFIED JPEG/PNG/WebP evidence images. Local preparation is not a formal draft.",
        roles=["STUDENT"],
        success_schema="StudentApplication",
        success_status=201,
        request_schema="CreateStudentApplicationRequest",
        resource_scope="SELF_ACTIVE_ENROLLMENT",
        idempotent=True,
        error_codes=[
            "ENROLLMENT_NOT_ACTIVE",
            "MEDIA_NOT_VERIFIED",
            "MEDIA_OWNERSHIP_MISMATCH",
            "MEDIA_ALREADY_BOUND",
            "APPLICATION_EVIDENCE_LIMIT_EXCEEDED",
            "MEDIA_CONTENT_INVALID",
        ],
    )
    registry.add(
        method="post",
        path="/student/applications/{applicationId}/supplements",
        operation_id="supplementStudentApplication",
        tag="Applications",
        summary="Add requested application evidence",
        description="Adds a SUPPLEMENT submission only while SUPPLEMENT_REQUIRED and returns the application to SUBMITTED. Initial plus all supplement evidence remains capped at three images.",
        roles=["STUDENT"],
        success_schema="StudentApplication",
        request_schema="SupplementApplicationRequest",
        parameters=[path_parameter("applicationId")],
        resource_scope="APPLICATION_OWNER",
        idempotent=True,
        error_codes=[
            "APPLICATION_SUPPLEMENT_NOT_ALLOWED",
            "APPLICATION_EVIDENCE_LIMIT_EXCEEDED",
            "MEDIA_NOT_VERIFIED",
            "MEDIA_OWNERSHIP_MISMATCH",
            "MEDIA_ALREADY_BOUND",
            "VERSION_CONFLICT",
        ],
    )
    registry.add(
        method="get",
        path="/student/applications",
        operation_id="listOwnApplications",
        tag="Applications",
        summary="List the student's applications",
        description="Lists exemption and certification applications with append-only evidence and decision history.",
        roles=["STUDENT"],
        success_schema="StudentApplicationPage",
        parameters=[
            query_parameter("applicationType", string_schema(enum=["EXEMPTION", "CERTIFICATION"])),
            query_parameter("status", string_schema(enum=["SUBMITTED", "SUPPLEMENT_REQUIRED", "APPROVED", "REJECTED"])),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="SELF",
    )
    registry.add(
        method="get",
        path="/student/applications/{applicationId}",
        operation_id="getOwnApplication",
        tag="Applications",
        summary="Get the student's application",
        description="Returns one application owned by the authenticated student.",
        roles=["STUDENT"],
        success_schema="StudentApplication",
        parameters=[path_parameter("applicationId")],
        resource_scope="APPLICATION_OWNER",
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/applications",
        operation_id="listCourseApplications",
        tag="Applications",
        summary="List applications for a teacher-owned course",
        description="Lists only applications for the responsible teacher's course.",
        roles=["TEACHER"],
        success_schema="StudentApplicationPage",
        parameters=[
            path_parameter("courseId"),
            query_parameter("applicationType", string_schema(enum=["EXEMPTION", "CERTIFICATION"])),
            query_parameter("status", string_schema(enum=["SUBMITTED", "SUPPLEMENT_REQUIRED", "APPROVED", "REJECTED"])),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/applications/{applicationId}",
        operation_id="getCourseApplication",
        tag="Applications",
        summary="Get an application for teacher review",
        description="Returns an application only when it belongs to the responsible teacher's course.",
        roles=["TEACHER"],
        success_schema="StudentApplication",
        parameters=[path_parameter("courseId"), path_parameter("applicationId")],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/applications/{applicationId}/decisions",
        operation_id="decideStudentApplication",
        tag="Applications",
        summary="Append an application decision",
        description="The responsible teacher requests supplement, rejects, or approves. Exemption approval atomically sets EXEMPT; certification approval atomically creates the first active credit revision.",
        roles=["TEACHER"],
        success_schema="StudentApplication",
        request_schema="ApplicationDecisionRequest",
        parameters=[path_parameter("courseId"), path_parameter("applicationId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["APPLICATION_TRANSITION_INVALID", "CERTIFICATION_CREDIT_INVALID", "VERSION_CONFLICT"],
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/applications/{applicationId}/certification-credit-adjustments",
        operation_id="adjustCertificationCredit",
        tag="Applications",
        summary="Adjust approved certification credit",
        description="Appends an ADJUST revision while preserving the approved application and all prior credit revisions.",
        roles=["TEACHER"],
        success_schema="CertificationCredit",
        request_schema="AdjustCertificationCreditRequest",
        parameters=[path_parameter("courseId"), path_parameter("applicationId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["APPLICATION_TRANSITION_INVALID", "CERTIFICATION_CREDIT_INVALID", "VERSION_CONFLICT"],
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/applications/{applicationId}/certification-credit-revocation",
        operation_id="revokeCertificationCredit",
        tag="Applications",
        summary="Revoke approved certification credit",
        description="Appends a zero-minute REVOKE revision. The application and previous credit history remain immutable.",
        roles=["TEACHER"],
        success_schema="CertificationCredit",
        request_schema="RevokeCertificationCreditRequest",
        parameters=[path_parameter("courseId"), path_parameter("applicationId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["APPLICATION_TRANSITION_INVALID", "VERSION_CONFLICT"],
    )


def _register_endurance_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="get",
        path="/student/endurance-outcome",
        operation_id="getOwnEnduranceOutcome",
        tag="Endurance",
        summary="Get the student's endurance outcome",
        description="Returns UNRECORDED, MEASURED with optional conversion, or EXEMPT. It is separate from progress and final grade.",
        roles=["STUDENT"],
        success_schema="EnduranceOutcome",
        resource_scope="SELF_ACTIVE_ENROLLMENT",
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/members/{enrollmentId}/endurance-outcome",
        operation_id="getCourseMemberEnduranceOutcome",
        tag="Endurance",
        summary="Get a course member's endurance outcome",
        description="Returns an endurance outcome only for the responsible teacher's course.",
        roles=["TEACHER"],
        success_schema="EnduranceOutcome",
        parameters=[path_parameter("courseId"), path_parameter("enrollmentId")],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/members/{enrollmentId}/endurance-measurements",
        operation_id="confirmEnduranceMeasurement",
        tag="Endurance",
        summary="Confirm a student's true endurance time",
        description="The responsible teacher submits integer seconds only. Backend selects gender, grade group, distance, and current rule revision; a measurement is preserved even if no unique conversion is available.",
        roles=["TEACHER"],
        success_schema="EnduranceOutcome",
        success_status=201,
        request_schema="ConfirmEnduranceMeasurementRequest",
        parameters=[path_parameter("courseId"), path_parameter("enrollmentId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["ENDURANCE_OUTCOME_EXEMPT", "VERSION_CONFLICT"],
    )
    registry.add(
        method="get",
        path="/admin/endurance-rule-tables",
        operation_id="listEnduranceRuleTables",
        tag="Endurance",
        summary="List the four endurance rule tables",
        description="Returns exactly the four allowed gender/grade-group/distance combinations and current counts.",
        roles=["ADMIN"],
        permissions=["GLOBAL_RULES"],
        success_schema="EnduranceRuleTableList",
        resource_scope="CURRENT_ORGANIZATION",
    )
    registry.add(
        method="get",
        path="/admin/endurance-rule-tables/{ruleTableId}",
        operation_id="getEnduranceRuleTable",
        tag="Endurance",
        summary="Get a complete endurance rule table",
        description="Returns the current immutable revision sorted by lower seconds.",
        roles=["ADMIN"],
        permissions=["GLOBAL_RULES"],
        success_schema="EnduranceRuleTable",
        parameters=[path_parameter("ruleTableId")],
        resource_scope="CURRENT_ORGANIZATION",
    )
    registry.add(
        method="post",
        path="/admin/endurance-rule-tables/{ruleTableId}/revisions",
        operation_id="reviseEnduranceRuleTable",
        tag="Endurance",
        summary="Create and activate a complete rule-table revision",
        description="Applies one ADD, UPDATE, or DELETE change to the current complete table, validates non-empty continuous non-overlapping intervals and score/level consistency, and atomically switches the pointer. Historical conversions are never recalculated.",
        roles=["ADMIN"],
        permissions=["GLOBAL_RULES"],
        success_schema="EnduranceRuleTable",
        success_status=201,
        request_schema="ReviseEnduranceRuleTableRequest",
        parameters=[path_parameter("ruleTableId")],
        resource_scope="CURRENT_ORGANIZATION",
        idempotent=True,
        error_codes=["ENDURANCE_RULE_TABLE_INVALID", "VERSION_CONFLICT"],
    )


def _register_grade_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="get",
        path="/student/final-grade",
        operation_id="getOwnFinalGrade",
        tag="Final grades",
        summary="Get the student's current published final grade",
        description="Returns the latest responsible-teacher publication and never derives or rewrites it from progress or endurance conversion.",
        roles=["STUDENT"],
        success_schema="FinalGradeState",
        resource_scope="SELF_ACTIVE_OR_HISTORICAL_ENROLLMENT",
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/final-grades",
        operation_id="listCourseFinalGrades",
        tag="Final grades",
        summary="List current final-grade states for a course",
        description="Lists current publication pointers for the responsible teacher's course.",
        roles=["TEACHER"],
        success_schema="FinalGradeStatePage",
        parameters=[path_parameter("courseId"), *cursor_parameters(default_limit=20, maximum_limit=100)],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="get",
        path="/courses/{courseId}/members/{enrollmentId}/final-grade-publications",
        operation_id="listFinalGradeHistory",
        tag="Final grades",
        summary="List append-only final-grade publication history",
        description="Lists every published int32 value and optional remark without overwriting prior publications.",
        roles=["TEACHER"],
        success_schema="FinalGradePublicationPage",
        parameters=[
            path_parameter("courseId"),
            path_parameter("enrollmentId"),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="RESPONSIBLE_TEACHER",
    )
    registry.add(
        method="post",
        path="/courses/{courseId}/members/{enrollmentId}/final-grade-publications",
        operation_id="publishFinalGrade",
        tag="Final grades",
        summary="Publish or republish a final grade",
        description="Appends any signed int32 final grade plus an optional remark of at most 50 characters. No 0-100 rule, progress equality, administrator approval, or student adjustment request is applied.",
        roles=["TEACHER"],
        success_schema="FinalGradePublication",
        success_status=201,
        request_schema="PublishFinalGradeRequest",
        parameters=[path_parameter("courseId"), path_parameter("enrollmentId")],
        resource_scope="RESPONSIBLE_TEACHER",
        idempotent=True,
        error_codes=["FINAL_GRADE_VALUE_INVALID", "VERSION_CONFLICT"],
    )
