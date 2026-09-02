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
    number_schema,
    object_schema,
    path_parameter,
    query_parameter,
    ref,
    string_schema,
)


def register_services(schemas: dict[str, Schema], registry: ContractRegistry) -> None:
    _register_feedback_schemas(schemas)
    _register_help_schemas(schemas)
    _register_mode_and_notification_schemas(schemas)
    _register_audit_schemas(schemas)
    _register_feedback_operations(registry)
    _register_help_operations(registry)
    _register_mode_and_notification_operations(registry)
    _register_audit_operations(registry)


def _register_feedback_schemas(schemas: dict[str, Schema]) -> None:
    schemas["FeedbackCategory"] = string_schema(
        enum=["FUNCTION_BUG", "FEATURE_SUGGESTION", "ACCESSIBILITY", "PRIVACY", "OTHER"]
    )
    schemas["FeedbackStatus"] = string_schema(
        enum=["WAITING", "IN_PROGRESS", "WAITING_TECH", "COMPLETED", "CLOSED"]
    )
    schemas["FeedbackReply"] = object_schema(
        {
            "replyId": UUID,
            "sequenceNumber": integer_schema(minimum=1),
            "fromStatus": ref("FeedbackStatus"),
            "toStatus": ref("FeedbackStatus"),
            "publicReply": string_schema(min_length=1),
            "repliedBy": ref("PersonSummary"),
            "repliedAt": INSTANT,
        },
        ["replyId", "sequenceNumber", "fromStatus", "toStatus", "publicReply", "repliedBy", "repliedAt"],
    )
    schemas["FeedbackTicket"] = object_schema(
        {
            "feedbackId": UUID,
            "feedbackNumber": string_schema(min_length=1),
            "student": ref("StudentSummary"),
            "currentVerifiedEmail": nullable(
                string_schema(fmt="email", description="Null after account deletion removes the current email binding.")
            ),
            "category": ref("FeedbackCategory"),
            "description": string_schema(min_length=1),
            "status": ref("FeedbackStatus"),
            "replies": array_of(ref("FeedbackReply")),
            "submittedAt": INSTANT,
            "updatedAt": INSTANT,
            "version": VERSION,
        },
        [
            "feedbackId",
            "feedbackNumber",
            "student",
            "currentVerifiedEmail",
            "category",
            "description",
            "status",
            "replies",
            "submittedAt",
            "updatedAt",
            "version",
        ],
        description="No attachment, platform, client version, priority, assignee, or internal-note fields exist in this Contract.",
    )
    schemas["CreateFeedbackRequest"] = object_schema(
        {"category": ref("FeedbackCategory"), "description": string_schema(min_length=1)},
        ["category", "description"],
    )
    schemas["ProcessFeedbackRequest"] = object_schema(
        {
            "targetStatus": string_schema(enum=["IN_PROGRESS", "WAITING_TECH", "COMPLETED", "CLOSED"]),
            "publicReply": string_schema(min_length=1),
            "expectedVersion": VERSION,
        },
        ["targetStatus", "publicReply", "expectedVersion"],
    )
    add_paged_schema(schemas, "FeedbackPage", "FeedbackTicket")
    schemas["AdminFeedbackSummary"] = object_schema(
        {
            "totalCount": integer_schema(fmt="int32", minimum=0),
            "pendingCount": integer_schema(fmt="int32", minimum=0),
            "waitingTechCount": integer_schema(fmt="int32", minimum=0),
            "completedCount": integer_schema(fmt="int32", minimum=0),
            "generatedAt": INSTANT,
        },
        ["totalCount", "pendingCount", "waitingTechCount", "completedCount", "generatedAt"],
        description=(
            "Organization-wide permitted feedback summary from the same committed read snapshot as the returned items. "
            "pendingCount is WAITING + IN_PROGRESS + WAITING_TECH; waitingTechCount is WAITING_TECH; completedCount is "
            "COMPLETED; totalCount includes all five statuses. Counts ignore q, category, status, cursor, and limit."
        ),
    )
    schemas["AdminFeedbackPage"] = object_schema(
        {
            "summary": ref("AdminFeedbackSummary"),
            "items": array_of(ref("FeedbackTicket")),
            "page": ref("CursorPage"),
        },
        ["summary", "items", "page"],
    )


def _register_help_schemas(schemas: dict[str, Schema]) -> None:
    schemas["HelpArticleStatus"] = string_schema(enum=["DRAFT", "PUBLISHED", "ARCHIVED"])
    schemas["HelpArticleCategory"] = string_schema(
        enum=[
            "LOGIN_AND_VERIFICATION",
            "JOIN_AND_CORRECTION",
            "CHECKIN_AND_HOURS",
            "EVIDENCE_UPLOAD",
            "COURSE_AND_GRADE",
            "EXEMPTION",
            "ORGANIZATION_CERTIFICATION",
            "NOTIFICATION",
            "MAINTENANCE",
            "SERVICE_FEEDBACK",
        ]
    )
    schemas["HelpArticleAdmin"] = object_schema(
        {
            "articleId": UUID,
            "status": ref("HelpArticleStatus"),
            "titleZh": string_schema(min_length=1),
            "titleEn": string_schema(min_length=1),
            "bodyZh": nullable(string_schema(min_length=1)),
            "bodyEn": nullable(string_schema(min_length=1)),
            "keywords": array_of(string_schema(min_length=1)),
            "category": ref("HelpArticleCategory"),
            "sortWeight": {"type": "number"},
            "revisionNumber": integer_schema(minimum=1),
            "firstPublishedAt": nullable(INSTANT),
            "updatedAt": INSTANT,
            "version": VERSION,
        },
        [
            "articleId",
            "status",
            "titleZh",
            "titleEn",
            "bodyZh",
            "bodyEn",
            "keywords",
            "category",
            "sortWeight",
            "revisionNumber",
            "firstPublishedAt",
            "updatedAt",
            "version",
        ],
    )
    schemas["HelpArticlePublic"] = object_schema(
        {
            "articleId": UUID,
            "locale": string_schema(enum=["zh-CN", "en"]),
            "title": string_schema(min_length=1),
            "bodyMarkdown": string_schema(min_length=1),
            "category": ref("HelpArticleCategory"),
            "updatedAt": INSTANT,
        },
        ["articleId", "locale", "title", "bodyMarkdown", "category", "updatedAt"],
        description="Published single-locale projection; draft/archive state, keywords, sort weight, and audit facts are not exposed.",
    )
    schemas["CreateHelpArticleRequest"] = object_schema(
        {
            "titleZh": string_schema(min_length=1),
            "titleEn": string_schema(min_length=1),
            "bodyZh": nullable(string_schema(min_length=1)),
            "bodyEn": nullable(string_schema(min_length=1)),
            "keywords": array_of(string_schema(min_length=1)),
            "category": ref("HelpArticleCategory"),
            "sortWeight": {"type": "number"},
            "initialStatus": string_schema(enum=["DRAFT", "PUBLISHED"]),
        },
        ["titleZh", "titleEn", "bodyZh", "bodyEn", "keywords", "category", "sortWeight", "initialStatus"],
    )
    schemas["UpdateHelpArticleRequest"] = object_schema(
        {
            "titleZh": string_schema(min_length=1),
            "titleEn": string_schema(min_length=1),
            "bodyZh": nullable(string_schema(min_length=1)),
            "bodyEn": nullable(string_schema(min_length=1)),
            "keywords": array_of(string_schema(min_length=1)),
            "category": ref("HelpArticleCategory"),
            "sortWeight": {"type": "number"},
            "expectedVersion": VERSION,
        },
        ["titleZh", "titleEn", "bodyZh", "bodyEn", "keywords", "category", "sortWeight", "expectedVersion"],
    )
    schemas["TransitionHelpArticleRequest"] = object_schema(
        {
            "targetStatus": string_schema(enum=["PUBLISHED", "ARCHIVED"]),
            "expectedVersion": VERSION,
        },
        ["targetStatus", "expectedVersion"],
    )
    schemas["HelpArticleAdminSummary"] = object_schema(
        {
            "publishedCount": integer_schema(fmt="int32", minimum=0),
            "draftCount": integer_schema(fmt="int32", minimum=0),
            "archivedCount": integer_schema(fmt="int32", minimum=0),
            "generatedAt": INSTANT,
        },
        ["publishedCount", "draftCount", "archivedCount", "generatedAt"],
        description=(
            "Organization-wide help-article summary from the same committed read snapshot as the returned items. Counts "
            "ignore q, status, category, cursor, and limit."
        ),
    )
    schemas["HelpArticleAdminPage"] = object_schema(
        {
            "summary": ref("HelpArticleAdminSummary"),
            "items": array_of(ref("HelpArticleAdmin")),
            "page": ref("CursorPage"),
        },
        ["summary", "items", "page"],
    )
    add_paged_schema(schemas, "HelpArticlePublicPage", "HelpArticlePublic")


def _register_mode_and_notification_schemas(schemas: dict[str, Schema]) -> None:
    schemas["MaintenanceAnnouncement"] = object_schema(
        {
            "titleZh": string_schema(min_length=1),
            "titleEn": string_schema(min_length=1),
            "bodyZh": string_schema(min_length=1),
            "bodyEn": string_schema(min_length=1),
            "estimatedRecoveryAt": INSTANT,
        },
        ["titleZh", "titleEn", "bodyZh", "bodyEn", "estimatedRecoveryAt"],
    )
    schemas["SystemMode"] = object_schema(
        {
            "mode": string_schema(enum=["NORMAL", "MAINTENANCE"]),
            "policyVersion": integer_schema(minimum=0),
            "announcement": nullable(ref("MaintenanceAnnouncement")),
            "updatedAt": INSTANT,
            "version": VERSION,
        },
        ["mode", "policyVersion", "announcement", "updatedAt", "version"],
        description="Missing, unknown, or unreadable mode must fail closed; only explicit NORMAL opens ordinary business.",
    )
    schemas["SystemModeTransition"] = object_schema(
        {
            "transitionId": UUID,
            "sequenceNumber": integer_schema(minimum=1),
            "fromMode": string_schema(enum=["NORMAL", "MAINTENANCE"]),
            "toMode": string_schema(enum=["NORMAL", "MAINTENANCE"]),
            "reason": string_schema(min_length=1),
            "announcement": nullable(ref("MaintenanceAnnouncement")),
            "announcementPublished": {"type": "boolean"},
            "changedBy": ref("PersonSummary"),
            "occurredAt": INSTANT,
        },
        [
            "transitionId",
            "sequenceNumber",
            "fromMode",
            "toMode",
            "reason",
            "announcement",
            "announcementPublished",
            "changedBy",
            "occurredAt",
        ],
    )
    add_paged_schema(schemas, "SystemModeTransitionPage", "SystemModeTransition")
    schemas["EnterMaintenanceRequest"] = object_schema(
        {
            "targetMode": {"type": "string", "const": "MAINTENANCE"},
            "reason": string_schema(min_length=1),
            "announcement": ref("MaintenanceAnnouncement"),
            "expectedVersion": VERSION,
        },
        ["targetMode", "reason", "announcement", "expectedVersion"],
    )
    schemas["ReturnNormalRequest"] = object_schema(
        {
            "targetMode": {"type": "string", "const": "NORMAL"},
            "reason": string_schema(min_length=1),
            "expectedVersion": VERSION,
        },
        ["targetMode", "reason", "expectedVersion"],
    )
    schemas["SwitchSystemModeRequest"] = {
        "oneOf": [ref("EnterMaintenanceRequest"), ref("ReturnNormalRequest")],
        "discriminator": {"propertyName": "targetMode"},
    }
    schemas["SystemModeSwitchResult"] = object_schema(
        {"current": ref("SystemMode"), "transition": ref("SystemModeTransition")},
        ["current", "transition"],
    )
    schemas["Notification"] = object_schema(
        {
            "notificationId": UUID,
            "notificationType": string_schema(min_length=1),
            "title": string_schema(min_length=1),
            "body": string_schema(min_length=1),
            "targetRoute": nullable(
                string_schema(
                    enum=[
                        "COURSE",
                        "EXERCISE_RECORD",
                        "APPLICATION",
                        "ENDURANCE",
                        "FINAL_GRADE",
                        "FEEDBACK",
                        "SYSTEM_MODE",
                    ]
                )
            ),
            "targetId": nullable(UUID),
            "createdAt": INSTANT,
            "readAt": nullable(INSTANT),
        },
        ["notificationId", "notificationType", "title", "body", "targetRoute", "targetId", "createdAt", "readAt"],
        description="No delivered/pushed/failed state or external-channel status exists. Target navigation never bypasses target authorization.",
    )
    add_paged_schema(schemas, "NotificationPage", "Notification")
    schemas["UnreadNotificationCount"] = object_schema(
        {"unreadCount": integer_schema(minimum=0)}, ["unreadCount"]
    )


def _register_audit_schemas(schemas: dict[str, Schema]) -> None:
    schemas["AuditEventSummary"] = object_schema(
        {
            "auditEventId": UUID,
            "occurredAt": INSTANT,
            "operationType": string_schema(min_length=1),
            "operationDisplayName": string_schema(min_length=1),
            "outcome": string_schema(enum=["SUCCESS", "REJECTED", "DENIED", "FAILED", "ERROR"]),
            "actorRoleSnapshot": string_schema(enum=["STUDENT", "TEACHER", "ADMIN", "SYSTEM"]),
            "actorUserId": nullable(UUID),
            "targetType": nullable(string_schema(min_length=1)),
            "targetId": nullable(UUID),
            "requestId": string_schema(min_length=1),
        },
        [
            "auditEventId",
            "occurredAt",
            "operationType",
            "operationDisplayName",
            "outcome",
            "actorRoleSnapshot",
            "actorUserId",
            "targetType",
            "targetId",
            "requestId",
        ],
    )
    schemas["AuditSafeMetadata"] = object_schema(
        {
            "fromState": nullable(string_schema(min_length=1, max_length=64, pattern="^[A-Z0-9_]+$")),
            "toState": nullable(string_schema(min_length=1, max_length=64, pattern="^[A-Z0-9_]+$")),
            "changedFields": array_of(
                string_schema(min_length=1, max_length=64, pattern="^[A-Za-z][A-Za-z0-9]*$"),
                max_items=50,
            ),
            "affectedCount": nullable(integer_schema(minimum=0)),
            "sourceFormat": nullable(string_schema(enum=["CSV", "XLSX"])),
            "policyVersion": nullable(integer_schema(minimum=1)),
            "failureCode": nullable(string_schema(min_length=1, max_length=64, pattern="^[A-Z0-9_]+$")),
        },
        [
            "fromState",
            "toState",
            "changedFields",
            "affectedCount",
            "sourceFormat",
            "policyVersion",
            "failureCode",
        ],
        description="Closed safe metadata projection. Unavailable values are null and changedFields is empty. Passwords, OTPs, tokens, secrets, raw idempotency keys, raw IP/device/User-Agent, complete PII, media, object keys, signed URLs, internal notes, and raw snapshots have no representable field.",
    )
    schemas["AuditEvent"] = object_schema(
        {
            **schemas["AuditEventSummary"]["properties"],
            "reasonCode": nullable(string_schema(min_length=1)),
            "metadataSchemaVersion": integer_schema(fmt="int32", minimum=1),
            "safeMetadata": ref("AuditSafeMetadata"),
        },
        [
            *schemas["AuditEventSummary"]["required"],
            "reasonCode",
            "metadataSchemaVersion",
            "safeMetadata",
        ],
    )
    add_paged_schema(schemas, "AuditEventPage", "AuditEventSummary")
    schemas["AuditArchiveRequest"] = object_schema(
        {
            "fromDate": LOCAL_DATE,
            "toDate": LOCAL_DATE,
        },
        ["fromDate", "toDate"],
        description="Inclusive Asia/Shanghai dates. Backend converts them to one UTC half-open interval.",
    )
    schemas["AuditArchiveJob"] = object_schema(
        {
            "auditArchiveJobId": UUID,
            "fromDate": LOCAL_DATE,
            "toDate": LOCAL_DATE,
            "status": string_schema(enum=["REQUESTED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"]),
            "failureCode": nullable(string_schema(min_length=1)),
            "requestedAt": INSTANT,
            "completedAt": nullable(INSTANT),
            "expiresAt": nullable(INSTANT),
            "version": VERSION,
        },
        [
            "auditArchiveJobId",
            "fromDate",
            "toDate",
            "status",
            "failureCode",
            "requestedAt",
            "completedAt",
            "expiresAt",
            "version",
        ],
    )
    schemas["AuditArchiveDownload"] = object_schema(
        {
            "auditArchiveJobId": UUID,
            "downloadUrl": string_schema(fmt="uri"),
            "contentType": {"type": "string", "const": "application/zip"},
            "expiresAt": INSTANT,
        },
        ["auditArchiveJobId", "downloadUrl", "contentType", "expiresAt"],
    )


def _register_feedback_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="post",
        path="/student/feedback",
        operation_id="createFeedback",
        tag="Feedback",
        summary="Submit student feedback",
        description="Creates a WAITING feedback ticket linked to the authenticated student. It has no attachment, platform, version, priority, assignee, or internal note.",
        roles=["STUDENT"],
        success_schema="FeedbackTicket",
        success_status=201,
        request_schema="CreateFeedbackRequest",
        resource_scope="SELF",
        idempotent=True,
    )
    registry.add(
        method="get",
        path="/student/feedback",
        operation_id="listOwnFeedback",
        tag="Feedback",
        summary="List the student's feedback tickets",
        description="Lists only tickets owned by the authenticated student.",
        roles=["STUDENT"],
        success_schema="FeedbackPage",
        parameters=[*cursor_parameters(default_limit=6, maximum_limit=6)],
        resource_scope="SELF",
    )
    registry.add(
        method="get",
        path="/student/feedback/{feedbackId}",
        operation_id="getOwnFeedback",
        tag="Feedback",
        summary="Get the student's feedback ticket",
        description="Returns current status and append-only public replies for one owned ticket.",
        roles=["STUDENT"],
        success_schema="FeedbackTicket",
        parameters=[path_parameter("feedbackId")],
        resource_scope="SELF",
    )
    registry.add(
        method="get",
        path="/admin/feedback",
        operation_id="listFeedbackForAdmin",
        tag="Feedback",
        summary="List feedback for administration",
        description=(
            "Searches and filters the administrator queue before keyset pagination; every page is limited to six items. "
            "The organization-wide permitted summary is computed from the same committed read snapshot and does not narrow "
            "with search, filters, or pagination."
        ),
        roles=["ADMIN"],
        permissions=["FEEDBACK"],
        success_schema="AdminFeedbackPage",
        parameters=[
            query_parameter("q", string_schema(min_length=1), description="Feedback number, student name/number/email, category, or description."),
            query_parameter("category", string_schema(enum=["FUNCTION_BUG", "FEATURE_SUGGESTION", "ACCESSIBILITY", "PRIVACY", "OTHER"])),
            query_parameter("status", string_schema(enum=["WAITING", "IN_PROGRESS", "WAITING_TECH", "COMPLETED", "CLOSED"])),
            *cursor_parameters(default_limit=6, maximum_limit=6),
        ],
        resource_scope="CURRENT_ORGANIZATION",
    )
    registry.add(
        method="get",
        path="/admin/feedback/{feedbackId}",
        operation_id="getFeedbackForAdmin",
        tag="Feedback",
        summary="Get a feedback ticket for administration",
        description="Returns the student-visible ticket and reply history; no hidden teacher assignment or internal note exists.",
        roles=["ADMIN"],
        permissions=["FEEDBACK"],
        success_schema="FeedbackTicket",
        parameters=[path_parameter("feedbackId")],
        resource_scope="CURRENT_ORGANIZATION",
    )
    registry.add(
        method="post",
        path="/admin/feedback/{feedbackId}/processing",
        operation_id="processFeedback",
        tag="Feedback",
        summary="Update feedback status with a public reply",
        description="Atomically updates the non-WAITING status and appends a non-empty student-visible reply. Existing replies cannot be edited or deleted; completed/closed tickets may be reopened only to IN_PROGRESS or WAITING_TECH with a new reply.",
        roles=["ADMIN"],
        permissions=["FEEDBACK"],
        success_schema="FeedbackTicket",
        request_schema="ProcessFeedbackRequest",
        parameters=[path_parameter("feedbackId")],
        resource_scope="CURRENT_ORGANIZATION",
        idempotent=True,
        error_codes=["FEEDBACK_TRANSITION_INVALID", "VERSION_CONFLICT"],
    )


def _register_help_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="get",
        path="/help-articles",
        operation_id="listPublishedHelpArticles",
        tag="Help center",
        summary="List published help articles in one locale",
        description="Returns only current PUBLISHED projections in the requested locale, ordered by sort weight then update time, with at most five items per page.",
        roles=["STUDENT"],
        success_schema="HelpArticlePublicPage",
        parameters=[
            query_parameter("locale", string_schema(enum=["zh-CN", "en"]), required=True),
            query_parameter("q", string_schema(min_length=1)),
            query_parameter("category", ref("HelpArticleCategory")),
            *cursor_parameters(default_limit=5, maximum_limit=5),
        ],
        resource_scope="PUBLISHED_STUDENT_CONTENT",
    )
    registry.add(
        method="get",
        path="/help-articles/{articleId}",
        operation_id="getPublishedHelpArticle",
        tag="Help center",
        summary="Get a published help article in one locale",
        description="Returns no draft/archive fields or administration metadata.",
        roles=["STUDENT"],
        success_schema="HelpArticlePublic",
        parameters=[path_parameter("articleId"), query_parameter("locale", string_schema(enum=["zh-CN", "en"]), required=True)],
        resource_scope="PUBLISHED_STUDENT_CONTENT",
    )
    registry.add(
        method="get",
        path="/admin/help-articles",
        operation_id="listHelpArticlesForAdmin",
        tag="Help center",
        summary="List help articles for administration",
        description=(
            "Lists all three states with full bilingual current revisions, at most five per page. The organization-wide "
            "summary is computed from the same committed read snapshot and does not narrow with search, filters, or pagination."
        ),
        roles=["ADMIN"],
        permissions=["HELP_CENTER"],
        success_schema="HelpArticleAdminPage",
        parameters=[
            query_parameter("q", string_schema(min_length=1)),
            query_parameter("status", string_schema(enum=["DRAFT", "PUBLISHED", "ARCHIVED"])),
            query_parameter("category", ref("HelpArticleCategory")),
            *cursor_parameters(default_limit=5, maximum_limit=5),
        ],
        resource_scope="CURRENT_ORGANIZATION",
    )
    registry.add(
        method="post",
        path="/admin/help-articles",
        operation_id="createHelpArticle",
        tag="Help center",
        summary="Create a draft or directly published help article",
        description="Creates one complete bilingual revision. Direct publication requires both bodies and at least one normalized keyword; no approval workflow exists.",
        roles=["ADMIN"],
        permissions=["HELP_CENTER"],
        success_schema="HelpArticleAdmin",
        success_status=201,
        request_schema="CreateHelpArticleRequest",
        resource_scope="CURRENT_ORGANIZATION",
        idempotent=True,
        error_codes=["HELP_ARTICLE_PUBLICATION_INCOMPLETE"],
    )
    registry.add(
        method="get",
        path="/admin/help-articles/{articleId}",
        operation_id="getHelpArticleForAdmin",
        tag="Help center",
        summary="Get a help article for administration",
        description="Returns the current full bilingual revision and optimistic version.",
        roles=["ADMIN"],
        permissions=["HELP_CENTER"],
        success_schema="HelpArticleAdmin",
        parameters=[path_parameter("articleId")],
        resource_scope="CURRENT_ORGANIZATION",
    )
    registry.add(
        method="put",
        path="/admin/help-articles/{articleId}",
        operation_id="updateHelpArticle",
        tag="Help center",
        summary="Save a new help-article revision",
        description="Appends a complete revision while keeping the current state. Editing a PUBLISHED article changes the current public content immediately; ARCHIVED remains not public.",
        roles=["ADMIN"],
        permissions=["HELP_CENTER"],
        success_schema="HelpArticleAdmin",
        request_schema="UpdateHelpArticleRequest",
        parameters=[path_parameter("articleId")],
        resource_scope="CURRENT_ORGANIZATION",
        idempotent=True,
        error_codes=["HELP_ARTICLE_PUBLICATION_INCOMPLETE", "VERSION_CONFLICT"],
    )
    registry.add(
        method="post",
        path="/admin/help-articles/{articleId}/state-transition",
        operation_id="transitionHelpArticleState",
        tag="Help center",
        summary="Publish, archive, or republish a help article",
        description="Allows only DRAFT to PUBLISHED, PUBLISHED to ARCHIVED, and ARCHIVED to PUBLISHED. It never deletes, schedules, rolls back, or adds an approval state.",
        roles=["ADMIN"],
        permissions=["HELP_CENTER"],
        success_schema="HelpArticleAdmin",
        request_schema="TransitionHelpArticleRequest",
        parameters=[path_parameter("articleId")],
        resource_scope="CURRENT_ORGANIZATION",
        idempotent=True,
        error_codes=["HELP_ARTICLE_TRANSITION_INVALID", "HELP_ARTICLE_PUBLICATION_INCOMPLETE", "VERSION_CONFLICT"],
    )


def _register_mode_and_notification_operations(registry: ContractRegistry) -> None:
    registry.add(
        method="get",
        path="/system-mode",
        operation_id="getSystemMode",
        tag="System",
        summary="Get the current system mode",
        description="Public fail-closed mode projection. Explicit NORMAL is the only value that opens ordinary student/teacher/admin business; MAINTENANCE carries the bilingual announcement.",
        roles=["ANONYMOUS", "STUDENT", "TEACHER", "ADMIN"],
        success_schema="SystemMode",
        resource_scope="PUBLIC_MODE",
        system_mode="ALLOWED_DURING_MAINTENANCE",
        error_codes=["DEPENDENCY_UNAVAILABLE"],
        public=True,
    )
    registry.add(
        method="get",
        path="/admin/system-mode/transitions",
        operation_id="listSystemModeTransitions",
        tag="System",
        summary="List system-mode transition history",
        description="Lists immutable mode changes for authorized administrators.",
        roles=["ADMIN"],
        permissions=["SYSTEM_MODE"],
        success_schema="SystemModeTransitionPage",
        parameters=[*cursor_parameters(default_limit=20, maximum_limit=100)],
        resource_scope="CURRENT_ORGANIZATION",
        system_mode="ALLOWED_DURING_MAINTENANCE",
    )
    registry.add(
        method="post",
        path="/admin/system-mode/transitions",
        operation_id="switchSystemMode",
        tag="System",
        summary="Switch NORMAL and MAINTENANCE",
        description="Atomically changes mode, appends transition/audit facts, and creates in-app notifications. Entering maintenance requires a bilingual announcement and estimated recovery; that estimate never triggers automatic recovery.",
        roles=["ADMIN"],
        permissions=["SYSTEM_MODE"],
        success_schema="SystemModeSwitchResult",
        success_status=201,
        request_schema="SwitchSystemModeRequest",
        resource_scope="CURRENT_ORGANIZATION",
        system_mode="ALLOWED_DURING_MAINTENANCE",
        idempotent=True,
        error_codes=["SYSTEM_MODE_UNCHANGED", "MAINTENANCE_ANNOUNCEMENT_REQUIRED", "VERSION_CONFLICT"],
    )
    registry.add(
        method="get",
        path="/notifications",
        operation_id="listOwnNotifications",
        tag="Notifications",
        summary="List the actor's in-app notifications",
        description="Lists only direct in-app notification facts. Read state never determines the source business result.",
        roles=["STUDENT", "TEACHER", "ADMIN"],
        success_schema="NotificationPage",
        parameters=[
            query_parameter("read", {"type": "boolean"}),
            *cursor_parameters(default_limit=20, maximum_limit=100),
        ],
        resource_scope="SELF",
    )
    registry.add(
        method="get",
        path="/notifications/unread-count",
        operation_id="getOwnUnreadNotificationCount",
        tag="Notifications",
        summary="Get the actor's unread notification count",
        description="Returns an auxiliary count that does not alter any notification or source business fact.",
        roles=["STUDENT", "TEACHER", "ADMIN"],
        success_schema="UnreadNotificationCount",
        resource_scope="SELF",
    )
    registry.add(
        method="post",
        path="/notifications/{notificationId}/read",
        operation_id="markOwnNotificationRead",
        tag="Notifications",
        summary="Mark one own notification as read",
        description="Sets readAt once for the authenticated recipient. Repeating the operation is naturally idempotent and never changes the source business result.",
        roles=["STUDENT", "TEACHER", "ADMIN"],
        success_schema="Notification",
        parameters=[path_parameter("notificationId")],
        resource_scope="SELF",
        natural_idempotency="Repeated calls retain the first server readAt and return the same notification state.",
    )


def _register_audit_operations(registry: ContractRegistry) -> None:
    audit_filters = [
        query_parameter("outcome", string_schema(enum=["SUCCESS", "REJECTED", "DENIED", "FAILED", "ERROR"])),
        query_parameter("requestId", string_schema(min_length=1)),
        query_parameter("fromDate", LOCAL_DATE),
        query_parameter("toDate", LOCAL_DATE),
        query_parameter("operationType", string_schema(min_length=1)),
        query_parameter("targetType", string_schema(min_length=1)),
        query_parameter("actorUserId", UUID),
        query_parameter("targetId", UUID),
    ]
    registry.add(
        method="get",
        path="/admin/audit-events",
        operation_id="listAuditEvents",
        tag="Audit",
        summary="List immutable audit events",
        description="Applies all filters inside the administrator's organization/permission scope before keyset pagination, newest first, with at most 50 events per batch.",
        roles=["ADMIN"],
        permissions=["AUDIT_QUERY"],
        success_schema="AuditEventPage",
        parameters=[*audit_filters, *cursor_parameters(default_limit=50, maximum_limit=50)],
        resource_scope="CURRENT_ORGANIZATION",
    )
    registry.add(
        method="get",
        path="/admin/audit-events/{auditEventId}",
        operation_id="getAuditEvent",
        tag="Audit",
        summary="Get a safe read-only audit event",
        description="Returns allowlisted safe metadata only. There is no edit, delete, append, replay, or re-execute operation.",
        roles=["ADMIN"],
        permissions=["AUDIT_QUERY"],
        success_schema="AuditEvent",
        parameters=[path_parameter("auditEventId")],
        resource_scope="CURRENT_ORGANIZATION",
    )
    registry.add(
        method="post",
        path="/admin/audit-archive-jobs",
        operation_id="requestAuditArchive",
        tag="Audit",
        summary="Request a server-generated diagnostic ZIP",
        description="Creates an asynchronous job for the selected inclusive Shanghai date range. The server aggregates and redacts logs, health summaries, request correlation, and audit events; it is not a CSV export of visible rows.",
        roles=["ADMIN"],
        permissions=["AUDIT_QUERY"],
        success_schema="AuditArchiveJob",
        success_status=202,
        request_schema="AuditArchiveRequest",
        resource_scope="CURRENT_ORGANIZATION",
        idempotent=True,
        error_codes=["AUDIT_DATE_RANGE_INVALID"],
    )
    registry.add(
        method="get",
        path="/admin/audit-archive-jobs/{auditArchiveJobId}",
        operation_id="getAuditArchiveJob",
        tag="Audit",
        summary="Get audit archive job status",
        description="Returns truthful REQUESTED/RUNNING/SUCCEEDED/FAILED/CANCELLED/EXPIRED state and never fabricates a local archive.",
        roles=["ADMIN"],
        permissions=["AUDIT_QUERY"],
        success_schema="AuditArchiveJob",
        parameters=[path_parameter("auditArchiveJobId")],
        resource_scope="CURRENT_ORGANIZATION",
    )
    registry.add(
        method="post",
        path="/admin/audit-archive-jobs/{auditArchiveJobId}/download-authorization",
        operation_id="authorizeAuditArchiveDownload",
        tag="Audit",
        summary="Authorize a short-lived audit ZIP download",
        description="Rechecks administrator identity, organization, AUDIT_QUERY permission, job success, and expiry before returning a short-lived URL.",
        roles=["ADMIN"],
        permissions=["AUDIT_QUERY"],
        success_schema="AuditArchiveDownload",
        parameters=[path_parameter("auditArchiveJobId")],
        resource_scope="CURRENT_ORGANIZATION",
        natural_idempotency="No business fact changes; each successful call returns a newly expiring authorization.",
        error_codes=["AUDIT_ARCHIVE_NOT_READY", "DEPENDENCY_UNAVAILABLE"],
    )
