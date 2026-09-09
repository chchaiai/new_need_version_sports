// Contract 1.3.0-contract / RC / canonical SHA-256 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed
export interface paths {
    readonly "/admin/audit-archive-jobs": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Request a server-generated diagnostic ZIP
         * @description Creates an asynchronous job for the selected inclusive Shanghai date range. The server aggregates and redacts logs, health summaries, request correlation, and audit events; it is not a CSV export of visible rows.
         */
        readonly post: operations["requestAuditArchive"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/audit-archive-jobs/{auditArchiveJobId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get audit archive job status
         * @description Returns truthful REQUESTED/RUNNING/SUCCEEDED/FAILED/CANCELLED/EXPIRED state and never fabricates a local archive.
         */
        readonly get: operations["getAuditArchiveJob"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/audit-archive-jobs/{auditArchiveJobId}/download-authorization": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Authorize a short-lived audit ZIP download
         * @description Rechecks administrator identity, organization, AUDIT_QUERY permission, job success, and expiry before returning a short-lived URL.
         */
        readonly post: operations["authorizeAuditArchiveDownload"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/audit-events": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List immutable audit events
         * @description Applies all filters inside the administrator's organization/permission scope before keyset pagination, newest first, with at most 50 events per batch.
         */
        readonly get: operations["listAuditEvents"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/audit-events/{auditEventId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get a safe read-only audit event
         * @description Returns allowlisted safe metadata only. There is no edit, delete, append, replay, or re-execute operation.
         */
        readonly get: operations["getAuditEvent"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/current-courses": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List current open courses for administration
         * @description Read-only current-course directory. It never exposes record/media drill-down or course mutation actions.
         */
        readonly get: operations["listCurrentCoursesForAdmin"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/current-courses/{courseId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get one current course directory projection
         * @description Returns the same read-only facts and capped aggregate metrics as the directory list, without member, record, or media drill-down.
         */
        readonly get: operations["getCurrentCourseForAdmin"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/dashboard": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the permission-aware administrator overview
         * @description Returns read-only summaries and explicit health states. Navigation remains subject to each target operation's permission; missing health metrics are null, never inferred healthy.
         */
        readonly get: operations["getAdminDashboard"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/endurance-rule-tables": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List the four endurance rule tables
         * @description Returns exactly the four allowed gender/grade-group/distance combinations and current counts.
         */
        readonly get: operations["listEnduranceRuleTables"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/endurance-rule-tables/{ruleTableId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get a complete endurance rule table
         * @description Returns the current immutable revision sorted by lower seconds.
         */
        readonly get: operations["getEnduranceRuleTable"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/endurance-rule-tables/{ruleTableId}/revisions": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Create and activate a complete rule-table revision
         * @description Applies one ADD, UPDATE, or DELETE change to the current complete table, validates non-empty continuous non-overlapping intervals and score/level consistency, and atomically switches the pointer. Historical conversions are never recalculated.
         */
        readonly post: operations["reviseEnduranceRuleTable"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/feedback": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List feedback for administration
         * @description Searches and filters the administrator queue before keyset pagination; every page is limited to six items. The organization-wide permitted summary is computed from the same committed read snapshot and does not narrow with search, filters, or pagination.
         */
        readonly get: operations["listFeedbackForAdmin"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/feedback/{feedbackId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get a feedback ticket for administration
         * @description Returns the student-visible ticket and reply history; no hidden teacher assignment or internal note exists.
         */
        readonly get: operations["getFeedbackForAdmin"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/feedback/{feedbackId}/processing": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Update feedback status with a public reply
         * @description Atomically updates the non-WAITING status and appends a non-empty student-visible reply. Existing replies cannot be edited or deleted; completed/closed tickets may be reopened only to IN_PROGRESS or WAITING_TECH with a new reply.
         */
        readonly post: operations["processFeedback"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/help-articles": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List help articles for administration
         * @description Lists all three states with full bilingual current revisions, at most five per page. The organization-wide summary is computed from the same committed read snapshot and does not narrow with search, filters, or pagination.
         */
        readonly get: operations["listHelpArticlesForAdmin"];
        readonly put?: never;
        /**
         * Create a draft or directly published help article
         * @description Creates one complete bilingual revision. Direct publication requires both bodies and at least one normalized keyword; no approval workflow exists.
         */
        readonly post: operations["createHelpArticle"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/help-articles/{articleId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get a help article for administration
         * @description Returns the current full bilingual revision and optimistic version.
         */
        readonly get: operations["getHelpArticleForAdmin"];
        /**
         * Save a new help-article revision
         * @description Appends a complete revision while keeping the current state. Editing a PUBLISHED article changes the current public content immediately; ARCHIVED remains not public.
         */
        readonly put: operations["updateHelpArticle"];
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/help-articles/{articleId}/state-transition": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Publish, archive, or republish a help article
         * @description Allows only DRAFT to PUBLISHED, PUBLISHED to ARCHIVED, and ARCHIVED to PUBLISHED. It never deletes, schedules, rolls back, or adds an approval state.
         */
        readonly post: operations["transitionHelpArticleState"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/manual-mode-windows": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read scoped manual-mode history
         * @description SUPER only. Closed windows and audit remain immutable; scope overlap is explicit, not last-write-wins replacement.
         */
        readonly get: operations["listManualModeWindows"];
        readonly put?: never;
        /**
         * Open a scoped manual-processing window
         * @description SUPER only, one open window per exact purpose/scope. Use server committed time and protected source revision; route only hard-check-passed undecided tasks to original responsible teacher. No approval, extra opportunity or cross-teacher grant.
         */
        readonly post: operations["openManualModeWindow"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/manual-mode-windows/{windowId}/closure": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Close the referenced current manual window
         * @description SUPER only, recheck current window and source version, append server end-time and receipt atomically. Service recovery affects undecided tasks only; teacher decisions remain final. Other applicable open scope still requires manual routing.
         */
        readonly post: operations["closeManualModeWindow"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/rule-template-versions": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Publish a fixed rule template version
         * @description Super-admin only, mandatory first-password gate. No ninth permission and no GLOBAL_RULES/SYSTEM_MODE indirect grant; new template never retargets a published course.
         */
        readonly post: operations["publishRuleTemplateVersion"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/semesters/{semesterId}/course-settlements": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read course settlement summaries and pending counts
         * @description SEMESTER-permitted administrator sees aggregates only, no student data. Complete course-set version pinned across pages; service-unavailable collection never means no courses.
         */
        readonly get: operations["listSemesterSettlementSummaries"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/student-accounts": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List student accounts read-only
         * @description Searches by name, student number, college, major, administrative class, or ACTIVE/PENDING state. No mutation is exposed.
         */
        readonly get: operations["listStudentAccounts"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/student-accounts/{studentId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get a student account read-only
         * @description Returns the minimum authorized student profile and ACTIVE/PENDING state. It provides no edit, email-rebind, disable, recovery, enrollment, or session action.
         */
        readonly get: operations["getStudentAccount"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/sub-admins": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List sub-administrators
         * @description SUPER-only governance list with ACTIVE/DISABLED state, an organization-wide account summary from the same committed read snapshot, and the fixed eight permission codes. Summary counts ignore list filters and pagination.
         */
        readonly get: operations["listSubAdmins"];
        readonly put?: never;
        /**
         * Create a sub-administrator
         * @description SUPER-only use case that atomically creates the account/profile/credential and at least one of the fixed eight permissions. The assigned initial credential is a temporary password and the same transaction sets CurrentActor.mustChangePassword=true. The login name is globally unique and immutable.
         */
        readonly post: operations["createSubAdmin"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/sub-admins/{adminId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get a sub-administrator
         * @description SUPER-only governance detail.
         */
        readonly get: operations["getSubAdmin"];
        /**
         * Update sub-administrator profile and permissions
         * @description SUPER-only update of name, verified school email, department, fixed permissions, and expected version. The login name cannot change; permission history is append/revoke, at least one permission remains active, and this operation cannot set the account holder's personal password.
         */
        readonly put: operations["updateSubAdmin"];
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/sub-admins/{adminId}/deletion": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Delete an eligible sub-administrator
         * @description SUPER-only deletion after responsibility transfer. Current account data and active grants are removed/revoked while completed business and audit history remain under an opaque historical subject.
         */
        readonly post: operations["deleteSubAdmin"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/sub-admins/{adminId}/state-transition": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Enable or disable a sub-administrator
         * @description SUPER-only transition between ACTIVE and DISABLED. Disabling revokes every session; enabling restores only currently assigned permissions.
         */
        readonly post: operations["setSubAdminState"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/system-mode/transitions": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List system-mode transition history
         * @description Lists immutable mode changes for authorized administrators.
         */
        readonly get: operations["listSystemModeTransitions"];
        readonly put?: never;
        /**
         * Switch NORMAL and MAINTENANCE
         * @description Atomically changes mode, appends transition/audit facts, and creates in-app notifications. Entering maintenance requires a bilingual announcement and estimated recovery; that estimate never triggers automatic recovery.
         */
        readonly post: operations["switchSystemMode"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/teacher-account-batch-validations": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Validate a UTF-8 teacher-account CSV batch
         * @description Parses all rows and reports required-field, school-email, employee-ID/email uniqueness, and existing-account conflicts. It creates no accounts and stores no password.
         */
        readonly post: operations["validateTeacherAccountBatch"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/teacher-account-batches": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Create a validated teacher-account batch
         * @description Revalidates the complete batch and atomically creates every teacher with one strong initial password. Any row conflict rolls back the entire batch; the password is never returned.
         */
        readonly post: operations["createTeacherAccountBatch"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/teacher-accounts": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List teacher accounts
         * @description Lists read-only teacher account status and profile data for authorized administrators.
         */
        readonly get: operations["listTeacherAccounts"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/teacher-accounts/{teacherId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get a teacher account
         * @description Returns a read-only teacher account; no password, credential, or session detail is exposed.
         */
        readonly get: operations["getTeacherAccount"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/teacher-accounts/{teacherId}/deletion": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Delete a confirmed teacher login account
         * @description Deletes current login/profile account data without transferring or rewriting course responsibility. Administrators gain no course-management authority. Existing courses, members, records, media, reviews, grades, audits, and responsibility snapshots continue to reference only the opaque non-login historical subject.
         */
        readonly post: operations["deleteTeacherAccount"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/technical-service-revisions": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read non-sensitive service revision history
         * @description SUPER only, no fixed sub-admin permission grants this capability. Secret and connection credential material never returned.
         */
        readonly get: operations["listTechnicalServiceRevisions"];
        readonly put?: never;
        /**
         * Publish one immutable AI/OCR service revision
         * @description SUPER only; source/purpose/scope/model/policy and secret reference registry validated under current revision protection. No secret/plaintext endpoint/prompt/script or student material in request snapshots, audit or response. Automatic VLM approval requires accepted real-school evidence bound to exact configuration; OCR always drafts. Old tasks retain original revision. The server computes configurationSha256 from canonical inference inputs and verifies evidence against that exact identity. Evidence from a disabled evaluation revision can authorize enabling only if those inputs match; every task still binds its actual published revision. External reference/evaluation registries are Phase7 provider prerequisites, not fabricated public objects.
         */
        readonly post: operations["publishTechnicalServiceRevision"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/admin/technical-service-status": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read one scope-bound technical status snapshot
         * @description SUPER only; actual window/source revision and complete technical counts, UNKNOWN/UNAVAILABLE with null metrics on missing/inconsistent sources. Last success/model confidence never implies health/accuracy. No original media or teaching decision.
         */
        readonly get: operations["getTechnicalServiceRunStatus"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/app-release-policy": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Evaluate the client release policy
         * @description Auxiliary startup check. Failure does not independently make the application unavailable, and clients must not clear a cached force-upgrade requirement without a newer authoritative result.
         */
        readonly get: operations["getAppReleasePolicy"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/auth/challenges": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Request an email verification challenge
         * @description Creates a purpose-scoped OTP challenge without revealing whether the target account exists.
         */
        readonly post: operations["requestAuthChallenge"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/auth/password/reset": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Reset a teacher or administrator password
         * @description Consumes valid PASSWORD_RESET proof for the account holder's verified school email and sets that holder's final personal password. Success clears mustChangePassword, revokes every prior session, returns no token, and does not automatically log in. A proof-resolved DISABLED account returns ACCOUNT_DISABLED without changing its credential, gate, or access state; challenge issuance keeps its anti-enumeration behavior.
         */
        readonly post: operations["resetPassword"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/auth/sessions/current/logout": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Revoke the current login session
         * @description Revokes the current session. Repeating the command returns the committed revocation result.
         */
        readonly post: operations["logoutCurrentSession"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/auth/sessions/logout-all": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Revoke all sessions for the current account
         * @description Revokes every still-valid session owned by the authenticated account.
         */
        readonly post: operations["logoutAllSessions"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/auth/sessions/password": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Create a teacher or administrator password session
         * @description Authenticates a teacher by verified school email or an administrator by the declared identifier type.
         */
        readonly post: operations["createPasswordSession"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/auth/sessions/refresh": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Rotate a refresh credential
         * @description Consumes the current opaque refresh credential and returns a new access/refresh pair. Reuse of a rotated credential is rejected.
         */
        readonly post: operations["refreshSession"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/auth/sessions/student": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Create a student session with a verified email OTP
         * @description Consumes a STUDENT_LOGIN challenge and returns rotating session credentials.
         */
        readonly post: operations["createStudentSession"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/course-invitations/{invitationCode}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Preview a course invitation
         * @description Returns 200 with ACTIVE, EXPIRED, REVOKED, COURSE_CLOSED, or NOT_CURRENT for every recognized invitation code, including the safe course and expiry projection. Only unknown, malformed, or unsafe-to-project codes return 422 INVITATION_INVALID. No enrollment is created. Read-only preview never registers a flow, grants grace or writes any fact. newRegistrationAllowed reflects current new-entry eligibility, including join closure. It does not grant or deny an already registered subject-specific grace flow.
         */
        readonly get: operations["previewCourseInvitation"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/course-invitations/{invitationCode}/existing-student-flows": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Register the same verified existing-student join flow
         * @description Authenticated school-email verified subject; share current invitation/course/semester protection and register strictly before original expiry. At most one flow identity for same operation/idempotency command. Registration is not enrollment.
         */
        readonly post: operations["registerExistingInvitationFlow"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/course-invitations/{invitationCode}/join": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Join a course as an existing student
         * @description Require authenticated flow owner and original invitation. First successful acceptance under current flow/invitation/course/semester shared protection is strictly before fixed original expiry+600s, after registeredAt<expiry. Recheck verified identity and unique active course. No new flow at expiry. Exact committed receipt returns original enrollment once; no current-pointer or deadline refresh.
         */
        readonly post: operations["joinCourseByInvitation"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/course-invitations/{invitationCode}/new-student-flows": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Register the original new-student invitation flow
         * @description Explicit registration-start command binds an unpredictable client nonce digest to the original invitation and an opaque server flow. Strict server registration before original expiry under shared admission protection; no requirement to finish email verification before expiry and no extra personal data/account. Sensitive proof only to initial requester or exact original anonymous-subject retry; preview, scanning, challenge requests and local drafts never register a flow. Final joining independently verifies identity/OTP.
         */
        readonly post: operations["registerNewInvitationFlow"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/course-invitations/{invitationCode}/student-registration": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Register a new verified student and join a course
         * @description Authenticate original secret flow authorization and exact anonymous command subject before any receipt lookup. First successful command verifies the current school-email OTP, unique active class and identity, then atomically creates account/profile/enrollment and binds the verified identity under shared invitation/course/semester/identity protection. OTP may be verified during grace; its own validity is not extended. First acceptance<original expiry+600 seconds; exact authorized stable-request replay returns original result without re-consuming OTP, refreshing grace or recreating membership.
         */
        readonly post: operations["registerStudentAndJoinCourse"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get an authorized course projection
         * @description Returns a course only when the authenticated teacher is its current responsible teacher.
         */
        readonly get: operations["getCourse"];
        /**
         * Update a teacher-owned open course
         * @description Applies only the previewed name/description change for an open published course. Rule and original schedule stay immutable; no old target revision update exists.
         */
        readonly put: operations["updateCourse"];
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/applications": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List applications for a teacher-owned course
         * @description Lists only applications for the responsible teacher's course.
         */
        readonly get: operations["listCourseApplications"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/applications/{applicationId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get an application for teacher review
         * @description Returns an application only when it belongs to the responsible teacher's course.
         */
        readonly get: operations["getCourseApplication"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/applications/{applicationId}/certification-credit-adjustments": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Adjust approved certification credit
         * @description Appends an ADJUST revision while preserving the approved application and all prior credit revisions.
         */
        readonly post: operations["adjustCertificationCredit"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/applications/{applicationId}/certification-credit-revocation": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Revoke approved certification credit
         * @description Appends a zero-minute REVOKE revision. The application and previous credit history remain immutable.
         */
        readonly post: operations["revokeCertificationCredit"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/applications/{applicationId}/decisions": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Append an application decision
         * @description The responsible teacher requests supplement, rejects, or approves. Exemption approval atomically sets EXEMPT; certification approval atomically creates the first active credit revision.
         */
        readonly post: operations["decideStudentApplication"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/assessment-roster": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read the complete-source assessment roster summary
         * @description Read-only composition of full roster/member/identity/endurance/review/application/A statistics/E settlement public results and versions. Equal counts never prove identity; unknown source/count not0 or100%. No direct cross-Owner private queries or source writes.
         */
        readonly get: operations["getAssessmentRosterProjection"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/assessment-roster-exports": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Prepare a fixed teacher roster report artifact
         * @description Export only a complete fixed projection/content identity in responsible-teacher scope, no final grades/remarks/raw images. An artifact task is not file readiness; no stale projection relabeled as current.
         */
        readonly post: operations["requestAssessmentRosterExport"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/assessment-roster-exports/{artifactId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read export artifact readiness
         * @description Original authorized teacher and exact immutable projection; missing file or failed generation never reports READY.
         */
        readonly get: operations["getAssessmentRosterExport"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/assessment-roster-exports/{artifactId}/download-authorization": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Authorize one report download
         * @description Recheck current actor/role/responsible course and fixed artifact content SHA at download. Forwarded short-lived URL or guessed ID grants no student/admin/cross-teacher rights.
         */
        readonly post: operations["authorizeAssessmentRosterExportDownload"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/assessment-roster/{projectionId}/rows": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read fixed assessment roster rows
         * @description Pinned projection/content revision across all pages; explicit registration, raw endurance, progress and settlement columns. Original source identity scope preserved, outside-roster members separate.
         */
        readonly get: operations["listAssessmentRosterRows"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/change-impact": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Preview the impact of a course change
         * @description Evaluates name/description changes only; frozen rule, targets, frequency and schedule cannot enter this proposal.
         */
        readonly post: operations["previewCourseChangeImpact"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/closure": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Close a teacher-owned course
         * @description Closes new member, session, application and make-up starts under shared admission protection; terminates unfinished invitation flows. Existing legal sessions, first-material chains even before first receipt, locked transfer, once-only supplement/review, accepted roster/OCR/applications and settlement continue in original scope and deadlines. Pending work DOES NOT prevent closure, and closure is not settlement or archival. No restoration.
         */
        readonly post: operations["closeCourse"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/draft-rule": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Update an unpublished course rule
         * @description Only DRAFT and responsible teacher; published parameters cannot be changed through this endpoint. Validate current semester and1200 sum.
         */
        readonly post: operations["updateCourseDraftRule"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/endurance-capture-batches": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List original endurance batches
         * @description Only original responsible teacher; historical batches continue after closure within original scope.
         */
        readonly get: operations["listEnduranceBatches"];
        readonly put?: never;
        /**
         * Accept a endurance source batch
         * @description Bind ordered unique verified sources and authoritative content checksum. XLSX/CSV parse directly; paper OCR only creates drafts. New batch requires course open; no enrollment/snapshot/measurement from acceptance. Roster cap is100MiB/500 personnel rows including errors/duplicates. Technical attempts use fixed input/service/policy and finite retry; failure never invalidates a student.
         */
        readonly post: operations["createEnduranceBatch"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/endurance-capture-batches/{batchId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read one endurance batch
         * @description Read derived technical/review/partial/completed state from authoritative full source set; unavailable dependencies never return a fabricated empty completed batch.
         */
        readonly get: operations["getEnduranceBatch"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/endurance-capture-batches/{batchId}/confirmation": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Confirm all selected teacher-reviewed rows atomically
         * @description Validate no repeated selected row IDs, all expected versions and exact resolved values, protected enrollment/rule/outcome source guards and one unique conversion before writing any row. Entire selected set commits measurement/conversion/row/outcome/batch/receipt/audit/outbox or none. Unselected rows stay pending, so partial is not completed. Original command replay returns original set without re-running OCR or overwriting pointers.
         */
        readonly post: operations["confirmEnduranceDraftRows"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/endurance-capture-batches/{batchId}/rows": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read endurance draft rows
         * @description All pages pinned to batch/rows source revision. Keep every original position/error/duplicate; no administrative or student source access.
         */
        readonly get: operations["listEnduranceDraftRows"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/endurance-capture-batches/{batchId}/rows/{rowId}/decision": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Append teacher endurance row decision
         * @description Recheck original batch/row/input and identity source versions. Append explicit source-grounded confirmation/interpretation or reasoned exclusion, preserve original OCR text. No caller allResolved/digest or fuzzy identity merge. Late provider callbacks cannot overwrite a teacher decision.
         */
        readonly post: operations["resolveEnduranceDraftRow"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/exercise-records": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List scoped records and review stages
         * @description Newest-first stable keyset order (submittedAt, recordId); cursor binds filters and actor scope. Intermediate states are not INVALID. No scores, grades, ranks, hidden remarks or internal AI data. Failed pages are errors, never empty success.
         */
        readonly get: operations["listCourseExerciseRecords"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/exercise-records/{recordId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read original record and current processing
         * @description Includes original facts, current material and public review/timing projection. Preserve authorized historical access after closure/removal. All identifiers must match the original scoped resource; course closure does not grant another teacher authority.
         */
        readonly get: operations["getCourseExerciseRecord"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/exercise-records/{recordId}/review-corrections": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Append a correction based on existing facts
         * @description Responsible teacher only. Correct a referenced terminal judgment with exact expected Case/round/material binding and established facts. Keep original event and all legal successors; newer decision, settlement or correction conflict returns CORRECTION_CONFLICT for targeted review. No new material, third round, return opportunity or student extension. Confirmed platform-fault expiry restoration is a separate controlled Backend process, represented by read-only ExpiryCorrectionFact; this public command cannot impersonate it. Authenticate and check original resource ownership before reading an exact committed receipt; exact same-command replay returns the original result even after deadline, state/version changes or maintenance. Only new commands require current NORMAL mode, versions and authoritative eligibility. Different normalized content with the same key returns IDEMPOTENCY_KEY_REUSED. Resource authorization loss never exposes an old receipt. Mutations atomically commit current facts, required source revisions, notification/audit outbox and the receipt; no partial success.
         */
        readonly post: operations["correctExerciseRecordReview"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/exercise-records/{recordId}/reviews": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Act on the current teacher review round
         * @description PASS/RETURN_SUPPLEMENT/INVALID only. Require current Case/round/material, responsible teacher and all action preconditions. If prescribed checks and review are complete, none of the six invalid reasons applies and only unproven doubts remain, finish VALID. Technical failures/incomplete checks do not meet that condition. First return permanently sets supplementReturnUsed, ends current SLA, and starts the one total 24h(default)/72h student timer. Return is not INVALID. Round2 permits PASS/INVALID only; old AI callbacks cannot override it. Same-source public reason and original publicComment appear in detail/notifications; no hidden note. Authenticate and check original resource ownership before reading an exact committed receipt; exact same-command replay returns the original result even after deadline, state/version changes or maintenance. Only new commands require current NORMAL mode, versions and authoritative eligibility. Different normalized content with the same key returns IDEMPOTENCY_KEY_REUSED. Resource authorization loss never exposes an old receipt. Mutations atomically commit current facts, required source revisions, notification/audit outbox and the receipt; no partial success.
         */
        readonly post: operations["appendExerciseRecordReview"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/final-grades": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List current final-grade states for a course
         * @description Lists current publication pointers for the responsible teacher's course.
         */
        readonly get: operations["listCourseFinalGrades"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/invitations": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List recoverable course-invitation metadata
         * @description Returns only invitations for a course owned by the authenticated responsible teacher. Status reflects current expiry, course, and semester facts; the raw invitation code and digest are never returned.
         */
        readonly get: operations["listCourseInvitations"];
        readonly put?: never;
        /**
         * Create a course invitation
         * @description Server creates a digest-backed invitation for a published open current-semester course, lifetime5..120 minutes default30; QR/manual code identical. Closing join/course or revoking terminates unfinished registered flows, not existing members.
         */
        readonly post: operations["createCourseInvitation"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/invitations/{invitationId}/revocation": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Revoke a course invitation
         * @description Revokes the invitation without deleting invitation or enrollment history. Revoke even during natural-expiry grace when an unfinished flow remains; atomically terminate those flows under the same protection as final joining.
         */
        readonly post: operations["revokeCourseInvitation"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/makeup-authorizations": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List named make-up authorizations
         * @description Responsible teacher only, original course scope.
         */
        readonly get: operations["listCourseMakeupAuthorizations"];
        readonly put?: never;
        /**
         * Authorize one student in the original closeout
         * @description Current semester, open course, active named member, original seven-day closeout only. Persist teacher/time and original rule; delayed settlement does not extend it.
         */
        readonly post: operations["authorizeCourseMakeup"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/members": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List members of a teacher-owned course
         * @description Returns the minimum teaching projection for current and removed members.
         */
        readonly get: operations["listCourseMembers"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/members/{enrollmentId}/endurance-measurements": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read original measurement and correction history
         * @description Responsible teacher only. Immutable original test date/seconds and conversion revision, linked corrections, no rewrite by new rules.
         */
        readonly get: operations["listEnduranceMeasurementHistory"];
        readonly put?: never;
        /**
         * Confirm a student's true endurance time
         * @description Responsible teacher submits explicit integer seconds/date/event and matching rule/enrollment/outcome versions. Initial manual entry or reasoned predecessor-linked correction appends measurement AND unique conversion atomically. Missing/multiple conversion rejects whole command; old OCR/time/conversion history is retained. No new facts after settlement/archive except authorized existing-fact correction.
         */
        readonly post: operations["confirmEnduranceMeasurement"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/members/{enrollmentId}/endurance-outcome": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get a course member's endurance outcome
         * @description Returns an endurance outcome only for the responsible teacher's course.
         */
        readonly get: operations["getCourseMemberEnduranceOutcome"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/members/{enrollmentId}/final-grade-publications": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List append-only final-grade publication history
         * @description Responsible-teacher append-only signed-int32 grade history without remark. Historical remarks remain physically preserved and require the separate audited current-TEACHER read operation.
         */
        readonly get: operations["listFinalGradeHistory"];
        readonly put?: never;
        /**
         * Publish or republish a final grade
         * @description Append any signed-int32 grade with no remark field, alternate remark field or historical-remark copying. No 0-100 rule or administrator approval. Keep prior stored publications/remarks intact; never produce student notifications, projections or logs containing grade values.
         */
        readonly post: operations["publishFinalGrade"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/members/{enrollmentId}/progress": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get one course member's progress
         * @description Read authoritative joint-selection checkpoints and explicit current/recomputing/unavailable state. Server computes capped per-member categories then aggregates within one complete source/membership snapshot. No target/quota session gate, no old0/60/120 credit mapping or pending-as-invalid fallback.
         */
        readonly get: operations["getCourseMemberProgress"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/members/{enrollmentId}/removal": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Remove a student from a teacher-owned course
         * @description Transitions ACTIVE to REMOVED, preserves all history, updates the current student status to PENDING, and notifies the student.
         */
        readonly post: operations["removeCourseMember"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/members/{enrollmentId}/restoration": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Restore a removed course member
         * @description Restores the existing enrollment only when the student has no other active current-semester course. Historical facts are not rewritten.
         */
        readonly post: operations["restoreCourseMember"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/progress": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List student-level progress for a course
         * @description Read authoritative joint-selection checkpoints and explicit current/recomputing/unavailable state. Server computes capped per-member categories then aggregates within one complete source/membership snapshot. No target/quota session gate, no old0/60/120 credit mapping or pending-as-invalid fallback.
         */
        readonly get: operations["listCourseProgress"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/publication": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Publish and freeze a feasible course
         * @description Recheck token binding, complete evidence and protected source versions and DRAFT version; atomically freeze rule and schedule, open course, schedule proper reminder. Old evidence never relabeled.
         */
        readonly post: operations["publishCourse"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/publication-plan": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Prepare exact course feasibility evidence
         * @description Use authoritative complete legal calendar and fixed draft/template/semester versions. Positive complete joint witness or exact negative evidence, otherwise unavailable. No final business fact published.
         */
        readonly post: operations["prepareCoursePublication"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/review-queue": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read deduplicated teacher review todo
         * @description Only current actionable round1/2 items; stable keyset by queue entry time and queueItemId, one item per Case/round. AI, technical and student-supplement waits are excluded. Opening/refreshing does not reset SLA. Scope/revision changes invalidate cursor, not silently omit records.
         */
        readonly get: operations["listTeacherReviewQueue"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/roster-findings/{findingId}/resolution": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Record a roster finding resolution
         * @description Appends the one-time resolution facts. This operation does not implicitly join, remove, restore, or merge a student identity.
         */
        readonly post: operations["resolveRosterFinding"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/roster-import-allocations": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Allocate a temporary roster source upload
         * @description Allocate the existing electronic XLSX/CSV transport, at most100MiB. Preserve source identity/raw rows and original evidence needed by the accepted draft review; cleanup follows the source-kind retention policy, never mere parsing success. Paper sources use allocateTeachingSource.
         */
        readonly post: operations["allocateRosterImport"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/roster-import-batches": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List original roster batches
         * @description Only original responsible teacher; historical batches continue after closure within original scope.
         */
        readonly get: operations["listRosterBatches"];
        readonly put?: never;
        /**
         * Accept a roster source batch
         * @description Bind ordered unique verified sources and authoritative content checksum. XLSX/CSV parse directly; paper OCR only creates drafts. New batch requires course open; no enrollment/snapshot/measurement from acceptance. Roster cap is100MiB/500 personnel rows including errors/duplicates. Technical attempts use fixed input/service/policy and finite retry; failure never invalidates a student.
         */
        readonly post: operations["createRosterBatch"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/roster-import-batches/{batchId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read one roster batch
         * @description Read derived technical/review/partial/completed state from authoritative full source set; unavailable dependencies never return a fabricated empty completed batch.
         */
        readonly get: operations["getRosterBatch"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/roster-import-batches/{batchId}/publication": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Publish the complete confirmed official roster
         * @description Load complete source rows, reject unresolved/duplicate stable identities and cap before any write. Course→batch→ordered rows→current snapshot protection; atomically append snapshot/entries/findings/completion/pointer/receipt/audit/outbox. Never creates/removes members. Exact original replay never selects old snapshot as current.
         */
        readonly post: operations["publishRosterBatch"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/roster-import-batches/{batchId}/rows": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read roster draft rows
         * @description All pages pinned to batch/rows source revision. Keep every original position/error/duplicate; no administrative or student source access.
         */
        readonly get: operations["listRosterDraftRows"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/roster-import-batches/{batchId}/rows/{rowId}/decision": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Append teacher roster row decision
         * @description Recheck original batch/row/input and identity source versions. Append explicit source-grounded confirmation/interpretation or reasoned exclusion, preserve original OCR text. No caller allResolved/digest or fuzzy identity merge. Late provider callbacks cannot overwrite a teacher decision.
         */
        readonly post: operations["resolveRosterDraftRow"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/roster-imports": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Parse and commit an official roster snapshot
         * @description Accept the original XLSX/CSV allocation after authoritative content checks and direct deterministic parsing into a reviewable RosterImportBatch. It no longer publishes an official snapshot. Teacher row confirmation and publishRosterBatch supply the atomic formal publication; all500/error/duplicate rows preserved.
         */
        readonly post: operations["importOfficialRoster"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/roster-snapshots": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List roster snapshots
         * @description Lists immutable roster snapshots from newest to oldest.
         */
        readonly get: operations["listRosterSnapshots"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/roster-snapshots/{snapshotId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get a roster snapshot
         * @description Returns snapshot metadata and reconciliation counts; source bytes are not retained or returned.
         */
        readonly get: operations["getRosterSnapshot"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/roster-snapshots/{snapshotId}/current-selection": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Select a prior roster snapshot as current
         * @description Changes only the course's current roster pointer. Enrollment, records, reviews, applications, endurance outcomes, credits, and grades are not reverted.
         */
        readonly post: operations["revertCurrentRosterSnapshot"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/roster-snapshots/{snapshotId}/findings": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List reconciliation findings for a snapshot
         * @description Lists all five finding types without automatically merging ambiguous identities.
         */
        readonly get: operations["listRosterFindings"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/settlement-preparations": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Prepare complete settlement or existing-fact correction
         * @description Require every independent Owner source, full enrollment set and exact immutable A content. Both lawful first-material-before-receipt and locked transfer block. Pending windows/tasks never become invalid to clear queues. Closeout eligibility and historical correction scope rechecked.
         */
        readonly post: operations["prepareCourseSettlement"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/settlements": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List immutable report versions
         * @description Responsible teacher reads historical and current original versions. Report existence alone is not current settlement eligibility.
         */
        readonly get: operations["listCourseSettlements"];
        readonly put?: never;
        /**
         * Confirm one immutable report version
         * @description Recheck complete source sets/rows, unchanged manifest/content/membership and predecessor under shared Owner protection held to atomic commit. Commit head/all rows/manifest/result/pointer/audit together. Source drift or unavailable protection stops publication. Exact receipt replay returns original version without moving current pointer.
         */
        readonly post: operations["confirmCourseSettlement"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/settlements/{settlementVersionId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read one fixed settlement report identity
         * @description Preserve old version/content/source even after correction or archival; same course and responsible teacher.
         */
        readonly get: operations["getCourseSettlement"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/settlements/{settlementVersionId}/rows": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read version-pinned settlement rows
         * @description Exact original membership scope and checkpoint values, removed members retained; no live-cache substitution. Future authorized corrections append version with reason, never mutate old rows or reopen ordinary starts.
         */
        readonly get: operations["listSettlementReportRows"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/teaching-source-allocations": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Allocate a teacher source upload
         * @description Responsible teacher only, purpose/course-bound; preflight MIME and byte budget, current open course for new input. No student/admin media access. Authoritative verification occurs after upload.
         */
        readonly post: operations["allocateTeachingSource"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/teaching-source-assets/{sourceAssetId}/download-authorization": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Authorize original source for teacher review
         * @description Recheck original responsible teacher, course and source/batch binding on each short-lived read. Never grant student, administrator directory or another teacher access to OCR source. No permanent URL.
         */
        readonly post: operations["authorizeTeachingSourceDownload"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/courses/{courseId}/teaching-source-assets/{sourceAssetId}/finalization": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Verify uploaded teacher source
         * @description Probe actual object bytes/type/checksum and secure source ownership. No parsing success or declared MIME creates official teaching facts. Existing original accepted source scope remains required.
         */
        readonly post: operations["finalizeTeachingSource"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/exercise-records/{recordId}/materials": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read original and supplementary material versions
         * @description Owner or responsible teacher reads immutable version1/2 manifests and current readiness. Teacher may inspect original material when reviewing version2; no cross-teacher authority. Pre-boundary server-confirmed legal Sessions/Records retain original first-acceptance and locked-transfer windows after course closure, removal or closeout, even when no first receipt existed at the boundary. Student commands require original student ownership; permitted teacher reads/actions require the original course's responsible teacher. Authenticate every access; do not require a currently active Enrollment, create a new Session, reset a deadline or move courses.
         */
        readonly get: operations["listRecordMaterials"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/exercise-records/{recordId}/materials/{materialVersionId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read locked material readiness
         * @description Owner or responsible teacher; both identifiers must match the same scoped Record. Missing readiness is not READY. Pre-boundary server-confirmed legal Sessions/Records retain original first-acceptance and locked-transfer windows after course closure, removal or closeout, even when no first receipt existed at the boundary. Student commands require original student ownership; permitted teacher reads/actions require the original course's responsible teacher. Authenticate every access; do not require a currently active Enrollment, create a new Session, reset a deadline or move courses.
         */
        readonly get: operations["getRecordMaterial"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/exercise-records/{recordId}/materials/{materialVersionId}/completion": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Confirm complete verified locked material
         * @description Check the exact locked collection and every Asset Owner's authoritative byte completion/version/checksum/format evidence. All objects must have completed strictly before the original transfer deadline; HTTP call/probe finishing later does not invalidate proven on-time bytes. Missing bytes returns MATERIAL_NOT_READY; unavailable evidence/probe returns DEPENDENCY_UNAVAILABLE, never an INVALID review. A personally late swimming original batch, ready before endedAt+24h with delayExplanation, enters teacher exception review without replacing the batch; ordinary requests cannot consume that exception. Confirmed platform faults remain technical facts until an authorized resolution; do not automatically punish. Successful material readiness and Case handoff form one committed result. Pre-boundary server-confirmed legal Sessions/Records retain original first-acceptance and locked-transfer windows after course closure, removal or closeout, even when no first receipt existed at the boundary. Student commands require original student ownership; permitted teacher reads/actions require the original course's responsible teacher. Authenticate every access; do not require a currently active Enrollment, create a new Session, reset a deadline or move courses. Authenticate and check original resource ownership before reading an exact committed receipt; exact same-command replay returns the original result even after deadline, state/version changes or maintenance. Only new commands require current NORMAL mode, versions and authoritative eligibility. Different normalized content with the same key returns IDEMPOTENCY_KEY_REUSED. Resource authorization loss never exposes an old receipt. Mutations atomically commit current facts, required source revisions, notification/audit outbox and the receipt; no partial success.
         */
        readonly post: operations["completeExerciseRecordMaterial"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/exercise-records/{recordId}/reviews": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read append-only decisions, return and correction events
         * @description Owner or responsible teacher only; stable sequence order. Preserves old terminal events after correction. No raw incident data or provider payload. Student sees only their own public classification and explanation.
         */
        readonly get: operations["listExerciseRecordReviews"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/exercise-records/{recordId}/supplements": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Accept the original one-time supplementary material
         * @description Require SUPPLEMENT_REQUIRED, original return already used, active sole timer, current timing source and ready valid version2. acceptedAt must be strictly before effectiveDueAt; no added first-material/30m grace. Lock version2 and bind timer ACCEPTED, teacher round2/queue/new SLA in one transaction. Reuse original assets only on this same Record; 0-6 images/0-1 video, 1-7 items, 250MiB per current version, swimming before/after photos. History does not cumulatively consume a version's allowance. An on-time accepted package cannot expire while waiting for teacher review. Never create version3 or reset return-used. Pre-boundary server-confirmed legal Sessions/Records retain original first-acceptance and locked-transfer windows after course closure, removal or closeout, even when no first receipt existed at the boundary. Student commands require original student ownership; permitted teacher reads/actions require the original course's responsible teacher. Authenticate every access; do not require a currently active Enrollment, create a new Session, reset a deadline or move courses. Authenticate and check original resource ownership before reading an exact committed receipt; exact same-command replay returns the original result even after deadline, state/version changes or maintenance. Only new commands require current NORMAL mode, versions and authoritative eligibility. Different normalized content with the same key returns IDEMPOTENCY_KEY_REUSED. Resource authorization loss never exposes an old receipt. Mutations atomically commit current facts, required source revisions, notification/audit outbox and the receipt; no partial success.
         */
        readonly post: operations["submitExerciseRecordSupplement"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/exercise-sessions": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Start an exercise session
         * @description Server start binds the published rule and original Shanghai start day/week. Recheck school email, active membership, current semester, open published course, allowed normal interval or named make-up window, mode and single active session. Target reached/daily/weekly quota never prevents a real independent session. Closure/removal prevents new starts; completion keeps original scope.
         */
        readonly post: operations["startExerciseSession"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/exercise-sessions/{sessionId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get an authorized exercise session
         * @description Students read their own session; the responsible teacher may read the completed teaching projection.
         */
        readonly get: operations["getExerciseSession"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/exercise-sessions/{sessionId}/complete": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Complete an active or paused exercise session
         * @description Uses only the server clock and optimistic state version. Completed is terminal and cannot return to ACTIVE or PAUSED.
         */
        readonly post: operations["completeExerciseSession"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/exercise-sessions/{sessionId}/material-eligibility": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read original first-material windows
         * @description Uses the completed Session's persisted endedAt and full-precision server clock. Pre-boundary server-confirmed legal Sessions/Records retain original first-acceptance and locked-transfer windows after course closure, removal or closeout, even when no first receipt existed at the boundary. Student commands require original student ownership; permitted teacher reads/actions require the original course's responsible teacher. Authenticate every access; do not require a currently active Enrollment, create a new Session, reset a deadline or move courses.
         */
        readonly get: operations["getFirstMaterialEligibility"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/exercise-sessions/{sessionId}/pause": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Pause an active exercise session
         * @description Uses only the server clock and optimistic state version. Completed is terminal and cannot return to ACTIVE or PAUSED.
         */
        readonly post: operations["pauseExerciseSession"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/exercise-sessions/{sessionId}/record": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Accept and lock first material
         * @description Ordinary acceptedAt < endedAt+24h; swimming timely acceptedAt < endedAt+15m. Lock all declared asset IDs/checksums/positions and create one immutable Record/material version1, independently of all bytes arriving. Required objects must finish < acceptedAt+30m. Swimming completely-offline path requires already-ready original evidence and a public delay explanation before endedAt+24h, entering teacher review. All endpoints are strict; equal is too late. No immediate VALID or counted minutes. One formal Record per Session; a separate legal new Session is not rejected merely because another Record exists on that day. All routes check actual activity/evidence facts and cannot be used to relabel swimming. Pre-boundary server-confirmed legal Sessions/Records retain original first-acceptance and locked-transfer windows after course closure, removal or closeout, even when no first receipt existed at the boundary. Student commands require original student ownership; permitted teacher reads/actions require the original course's responsible teacher. Authenticate every access; do not require a currently active Enrollment, create a new Session, reset a deadline or move courses. Authenticate and check original resource ownership before reading an exact committed receipt; exact same-command replay returns the original result even after deadline, state/version changes or maintenance. Only new commands require current NORMAL mode, versions and authoritative eligibility. Different normalized content with the same key returns IDEMPOTENCY_KEY_REUSED. Resource authorization loss never exposes an old receipt. Mutations atomically commit current facts, required source revisions, notification/audit outbox and the receipt; no partial success.
         */
        readonly post: operations["submitExerciseRecord"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/exercise-sessions/{sessionId}/resume": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Resume a paused exercise session
         * @description Uses only the server clock and optimistic state version. Completed is terminal and cannot return to ACTIVE or PAUSED.
         */
        readonly post: operations["resumeExerciseSession"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/help-articles": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List published help articles in one locale
         * @description Returns only current PUBLISHED projections in the requested locale, ordered by sort weight then update time, with at most five items per page.
         */
        readonly get: operations["listPublishedHelpArticles"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/help-articles/{articleId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get a published help article in one locale
         * @description Returns no draft/archive fields or administration metadata.
         */
        readonly get: operations["getPublishedHelpArticle"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/me": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the current authenticated actor
         * @description Returns only the current account/profile projection required by clients; no credentials or internal subject history are exposed.
         */
        readonly get: operations["getCurrentActor"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/me/account-deletion": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Delete the current student or sub-administrator account
         * @description Requires second-factor verification. Login account, credentials, sessions, challenges, verified email/login name, and current profile PII are deleted; exercise records, formal media, and audit events remain linked only to an opaque non-login historical subject.
         */
        readonly post: operations["deleteOwnAccount"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/me/account-deletion-impact": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Inspect own-account deletion impact and blockers
         * @description Returns explicit current blockers plus the account data deleted and formal facts retained on success. Teachers and super administrators are not eligible for self-deletion.
         */
        readonly get: operations["getOwnAccountDeletionImpact"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/me/password": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /**
         * Change the current teacher or administrator password
         * @description Allows only the ACTIVE Teacher/Admin account holder to replace their own password using the current password and expected version. Success preserves the current session, revokes every other session, and returns CurrentActor with mustChangePassword=false.
         */
        readonly put: operations["changeOwnPassword"];
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/me/verified-email": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /**
         * Change the current verified school email
         * @description Requires independent proofs for the current and new school email and updates the account atomically.
         */
        readonly put: operations["changeOwnVerifiedEmail"];
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/media-assets": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Allocate a purpose-bound evidence upload
         * @description Allocates a short-lived upload for record evidence or application evidence. Declared metadata is preflight only; Backend content probing remains authoritative. For RECORD_EVIDENCE, require the owned legal Session, including original historical-chain scope after closure/removal. If a Record exists, new assets are allowed only for its currently open original supplementary opportunity; first locked-batch continuation uses renewRecordUploadAuthorization instead. Closed/expired supplementary entry cannot be bypassed through media allocation. Application policies are unchanged.
         */
        readonly post: operations["allocateMediaAsset"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/media-assets/{mediaAssetId}/download-authorization": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Authorize a short-lived evidence download
         * @description Rechecks the caller's record/application ownership or responsible-teacher scope and returns a short-lived URL. Object keys and permanent URLs are never exposed.
         */
        readonly post: operations["authorizeMediaDownload"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/media-assets/{mediaAssetId}/finalization": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Probe and finalize an uploaded media asset
         * @description Reads authoritative object metadata and content, computes checksum, and verifies MIME, size, image/video structure, video duration, and audio. Expected outcomes use one 200 MediaFinalizationResult channel: VERIFIED, REJECTED with a stable rejectionCode, or EXPIRED with MEDIA_ALLOCATION_EXPIRED. For locked record material, use authoritative object-completion time and immutable checksum; delayed probing must not mark proven on-time bytes expired merely because a URL or the HTTP call is now late. This operation verifies assets only; completeExerciseRecordMaterial or submitExerciseRecordSupplement atomically publishes business readiness. Original historical-chain authorization applies, and new writes cannot bypass a closed supplementary entry.
         */
        readonly post: operations["finalizeMediaAsset"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/media-assets/{mediaAssetId}/record-upload-authorization": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Authorize original locked-object continuation
         * @description Reauthorize only the same originally locked asset and checksum, before its original transfer deadline; no object replacement, new media or full-window reset. After complete immutable object receipt do not authorize overwrite. Authorization lifetime is bounded by the remaining business window. Pre-boundary server-confirmed legal Sessions/Records retain original first-acceptance and locked-transfer windows after course closure, removal or closeout, even when no first receipt existed at the boundary. Student commands require original student ownership; permitted teacher reads/actions require the original course's responsible teacher. Authenticate every access; do not require a currently active Enrollment, create a new Session, reset a deadline or move courses. Authenticate and check original resource ownership before reading an exact committed receipt; exact same-command replay returns the original result even after deadline, state/version changes or maintenance. Only new commands require current NORMAL mode, versions and authoritative eligibility. Different normalized content with the same key returns IDEMPOTENCY_KEY_REUSED. Resource authorization loss never exposes an old receipt. Mutations atomically commit current facts, required source revisions, notification/audit outbox and the receipt; no partial success.
         */
        readonly post: operations["renewRecordUploadAuthorization"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/notifications": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List the actor's in-app notifications
         * @description Lists only direct in-app notification facts. Read state never determines the source business result. Students use the dedicated allowlisted /student/notifications routes; legacy generic routes must deny the student role.
         */
        readonly get: operations["listOwnNotifications"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/notifications/{notificationId}/read": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Mark one own notification as read
         * @description Sets readAt once for the authenticated recipient. Repeating the operation is naturally idempotent and never changes the source business result. Students use the dedicated allowlisted /student/notifications routes; legacy generic routes must deny the student role.
         */
        readonly post: operations["markOwnNotificationRead"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/notifications/unread-count": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the actor's unread notification count
         * @description Returns an auxiliary count that does not alter any notification or source business fact. Students use the dedicated allowlisted /student/notifications routes; legacy generic routes must deny the student role.
         */
        readonly get: operations["getOwnUnreadNotificationCount"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/rule-template-versions": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List immutable published rule templates
         * @description Teacher selects a published allowed version; super-admin reads the same fixed rule family. Sub-admin cannot use this capability.
         */
        readonly get: operations["listPublishedRuleTemplates"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/semesters": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List semesters for administration
         * @description Lists UPCOMING, CURRENT, and ARCHIVED semesters using keyset pagination and returns an organization-wide summary from the same committed read snapshot. The summary never narrows with list filters or pagination.
         */
        readonly get: operations["listSemesters"];
        readonly put?: never;
        /**
         * Create an upcoming semester
         * @description Creates an UPCOMING semester after validating the consecutive academic year, unique year/term combination, and date order.
         */
        readonly post: operations["createSemester"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/semesters/{semesterId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        /**
         * Update an upcoming semester
         * @description Updates only an UPCOMING semester and never edits CURRENT or ARCHIVED history.
         */
        readonly put: operations["updateUpcomingSemester"];
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/semesters/{semesterId}/current-transition": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Switch the unique current semester
         * @description Atomically archives the previous CURRENT semester and makes the target UPCOMING semester CURRENT after its Shanghai start date is reached. Before archiving, obtain the complete authoritative course set and current unblocked settlement/source results for every course, protected through switch commit. Missing/partial sources or a merely historical report fail closed; never bulk-invalidate pending work or restore archived semesters.
         */
        readonly post: operations["switchCurrentSemester"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/semesters/current": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the unique current semester
         * @description Returns the organization-wide CURRENT semester. Archived history is not inferred from client time; when no CURRENT semester exists, returns 404 RESOURCE_NOT_FOUND.
         */
        readonly get: operations["getCurrentSemester"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/statistics/checkpoints/{checkpointId}/records": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read record counting detail at a checkpoint
         * @description Own student or responsible teacher only. Pin all pages to immutable checkpoint and original enrollment; retained historical self scope after removal/closure, no admin or cross-student drill-down.
         */
        readonly get: operations["listCheckpointRecordCredits"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/applications": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List the student's applications
         * @description Lists exemption and certification applications with append-only evidence and decision history.
         */
        readonly get: operations["listOwnApplications"];
        readonly put?: never;
        /**
         * Submit an exemption or certification application
         * @description Creates the formal SUBMITTED application only after binding one to three VERIFIED JPEG/PNG/WebP evidence images. Local preparation is not a formal draft.
         */
        readonly post: operations["createStudentApplication"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/applications/{applicationId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the student's application
         * @description Returns one application owned by the authenticated student.
         */
        readonly get: operations["getOwnApplication"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/applications/{applicationId}/supplements": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Add requested application evidence
         * @description Adds a SUPPLEMENT submission only while SUPPLEMENT_REQUIRED and returns the application to SUBMITTED. Initial plus all supplement evidence remains capped at three images.
         */
        readonly post: operations["supplementStudentApplication"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/course": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the student's active current-semester course
         * @description Returns only the authenticated student's current active enrollment course.
         */
        readonly get: operations["getOwnCurrentCourse"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/dashboard": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the authenticated student dashboard
         * @description Composes current formal account, course, progress, endurance, grade, and notification projections. It never falls back to synthetic or Mock data.
         */
        readonly get: operations["getStudentDashboard"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/endurance-outcome": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the student's endurance outcome
         * @description Own raw test distance/integer seconds/date or exemption only. Construct the allowlist before serialization; no conversion/score/level/rank/final grade/remark, including nested or null placeholders.
         */
        readonly get: operations["getOwnEnduranceOutcome"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/exercise-records": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List scoped records and review stages
         * @description Newest-first stable keyset order (submittedAt, recordId); cursor binds filters and actor scope. Intermediate states are not INVALID. No scores, grades, ranks, hidden remarks or internal AI data. Failed pages are errors, never empty success.
         */
        readonly get: operations["listOwnExerciseRecords"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/exercise-records/{recordId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read original record and current processing
         * @description Includes original facts, current material and public review/timing projection. Preserve authorized historical access after closure/removal. All identifiers must match the original scoped resource; course closure does not grant another teacher authority.
         */
        readonly get: operations["getOwnExerciseRecord"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/exercise-sessions/active": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the student's active or paused session
         * @description Returns the single ACTIVE or PAUSED session owned by the current student, or 404 when none exists.
         */
        readonly get: operations["getOwnActiveExerciseSession"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/feedback": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List the student's feedback tickets
         * @description Lists only tickets owned by the authenticated student.
         */
        readonly get: operations["listOwnFeedback"];
        readonly put?: never;
        /**
         * Submit student feedback
         * @description Creates a WAITING feedback ticket linked to the authenticated student. It has no attachment, platform, version, priority, assignee, or internal note.
         */
        readonly post: operations["createFeedback"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/feedback/{feedbackId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the student's feedback ticket
         * @description Returns current status and append-only public replies for one owned ticket.
         */
        readonly get: operations["getOwnFeedback"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/makeup-authorizations": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read own named make-up windows
         * @description Only own enrollment grants; historical grant does not override current course, semester, membership or mode.
         */
        readonly get: operations["listOwnMakeupAuthorizations"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/notifications": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List safe student notifications
         * @description Self recipient only, filter both new and historical prohibited messages before list/count/cursor construction. Never serialize teacher notification DTO or FINAL_GRADE route. Target authorization rechecked on navigation.
         */
        readonly get: operations["listOwnStudentNotifications"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/notifications/{notificationId}/read": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        /**
         * Mark a safe student notification read
         * @description Recheck current recipient and safe template/source at read and replay. Retain first server readAt. If an old message or old receipt contains prohibited content, deny delivery rather than replay an unsafe payload. No source business mutation.
         */
        readonly post: operations["markOwnStudentNotificationRead"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/notifications/unread-count": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Count only safe student notifications
         * @description Count from exactly the same safe recipient/template/source set as student list; prohibited messages do not contribute counts or cursors.
         */
        readonly get: operations["getOwnStudentUnreadNotificationCount"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/student/progress": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the student's current course progress
         * @description Read authoritative joint-selection checkpoints and explicit current/recomputing/unavailable state. Server computes capped per-member categories then aggregates within one complete source/membership snapshot. No target/quota session gate, no old0/60/120 credit mapping or pending-as-invalid fallback.
         */
        readonly get: operations["getOwnCourseProgress"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/system-mode": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the current system mode
         * @description Public fail-closed mode projection. Explicit NORMAL is the only value that opens ordinary student/teacher/admin business; MAINTENANCE carries the bilingual announcement.
         */
        readonly get: operations["getSystemMode"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/teacher/courses": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * List courses owned by the current teacher
         * @description Returns only courses for which the authenticated teacher is the current responsible teacher.
         */
        readonly get: operations["listOwnCourses"];
        readonly put?: never;
        /**
         * Create a teacher-owned course
         * @description Creates a complete configuration DRAFT in the unique current semester. No join or exercise is allowed until authoritative feasible-plan publication freezes its rule.
         */
        readonly post: operations["createCourse"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/teacher/dashboard": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Get the responsible teacher dashboard
         * @description Returns only summaries for courses owned by the authenticated teacher.
         */
        readonly get: operations["getTeacherDashboard"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/teacher/historical-final-grade-remarks": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /**
         * Read preserved historical remarks with access audit
         * @description All authenticated actors whose CURRENT role is TEACHER may read historical remarks, without narrowing by original course responsibility, current membership or governance group. Bind purpose and filters to opaque cursor. Audit actor, purpose, returned publication objects and actual server read time before delivery; unavailable audit fails closed. No grade write, remark write, media or cross-teacher adjudication permission. Students/admins denied.
         */
        readonly get: operations["listHistoricalFinalGradeRemarks"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        readonly AccountDeletionImpact: {
            readonly allowed: boolean;
            readonly blockers: readonly {
                /** @enum {string} */
                readonly code: "ACTIVE_EXERCISE_SESSION" | "ADMIN_RESPONSIBILITY";
                /** Format: int32 */
                readonly count: number;
            }[];
            readonly dataDeleted: readonly string[];
            readonly factsRetained: readonly string[];
        };
        readonly AccountDeletionRequest: {
            /** @constant */
            readonly acknowledgement: "DELETE_MY_ACCOUNT";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly otpProof: components["schemas"]["OtpProof"];
        };
        /** @enum {string} */
        readonly ActorRole: "STUDENT" | "TEACHER" | "ADMIN";
        readonly AddEnduranceRuleIntervalChange: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly action: "ADD";
            /** @enum {string} */
            readonly level: "EXCELLENT" | "GOOD" | "PASS" | "FAIL";
            /** Format: int32 */
            readonly lowerSeconds: number;
            readonly remark: string | null;
            /** Format: int32 */
            readonly score: number;
            /** Format: int32 */
            readonly upperSeconds: number;
        };
        readonly AdjustCertificationCreditRequest: {
            /** Format: int32 */
            readonly courseRelatedCreditMinutes: number;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            /** Format: int32 */
            readonly otherCreditMinutes: number;
            readonly studentVisibleReason: string;
        };
        readonly AdminCurrentCourseDirectory: {
            readonly items: readonly components["schemas"]["AdminCurrentCourseItem"][];
            readonly page: components["schemas"]["CursorPage"];
            readonly summary: components["schemas"]["AdminCurrentCourseDirectorySummary"];
        };
        readonly AdminCurrentCourseDirectorySummary: {
            /** Format: int32 */
            readonly currentCourseCount: number;
            /** Format: int32 */
            readonly distinctActiveStudentCount: number;
            /** Format: int32 */
            readonly distinctResponsibleTeacherCount: number;
        };
        /** @description Administrator read-only course-directory projection with no member, record, or media drill-down. */
        readonly AdminCurrentCourseItem: {
            readonly course: components["schemas"]["Course"];
            readonly metrics: components["schemas"]["AdminCurrentCourseMetrics"];
        };
        /** @description Authorized read-only current-active-member aggregate. Complete same-snapshot scope; sum each member's capped checkpoint before averaging. ValidRecordCount means review VALID, not selected record count. Missing sources return STATISTICS_UNAVAILABLE, never zero. Known empty scope alone has zero average; no inferred completed-student ratio. */
        readonly AdminCurrentCourseMetrics: {
            readonly averageCreditedMinutes: number;
            /** Format: int32 */
            readonly invalidRecordCount: number;
            /** Format: int32 */
            readonly recordCount: number;
            readonly scope: components["schemas"]["CourseStatisticsScope"];
            /** Format: int32 */
            readonly submittedStudentCount: number;
            /** Format: int64 */
            readonly totalCreditedMinutes: number;
            /** Format: int32 */
            readonly validRecordCount: number;
        };
        /** @description Permission-aware read-only overview. Counts are navigation/risk summaries and never bypass target-page authorization. */
        readonly AdminDashboard: {
            /** Format: int32 */
            readonly activeStudentCount: number;
            readonly actor: components["schemas"]["CurrentActor"];
            readonly currentSemester: components["schemas"]["Semester"] | null;
            readonly currentSystemMode: components["schemas"]["SystemMode"];
            /** Format: int32 */
            readonly distinctAdministrativeClassCount: number;
            /** Format: int32 */
            readonly enduranceRuleCount: number;
            /** Format: int32 */
            readonly enduranceRuleGroupCount: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly generatedAt: string;
            readonly health: readonly components["schemas"]["HealthStatus"][];
            /** Format: int32 */
            readonly studentCount: number;
            /** Format: int32 */
            readonly studentsWithAdministrativeClassCount: number;
            /** Format: int32 */
            readonly teacherCount: number;
        };
        readonly AdminFeedbackPage: {
            readonly items: readonly components["schemas"]["FeedbackTicket"][];
            readonly page: components["schemas"]["CursorPage"];
            readonly summary: components["schemas"]["AdminFeedbackSummary"];
        };
        /** @description Organization-wide permitted feedback summary from the same committed read snapshot as the returned items. pendingCount is WAITING + IN_PROGRESS + WAITING_TECH; waitingTechCount is WAITING_TECH; completedCount is COMPLETED; totalCount includes all five statuses. Counts ignore q, category, status, cursor, and limit. */
        readonly AdminFeedbackSummary: {
            /** Format: int32 */
            readonly completedCount: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly generatedAt: string;
            /** Format: int32 */
            readonly pendingCount: number;
            /** Format: int32 */
            readonly totalCount: number;
            /** Format: int32 */
            readonly waitingTechCount: number;
        };
        /** @enum {string} */
        readonly AdminKind: "SUPER" | "SUB";
        /** @enum {string} */
        readonly AdminPermission: "COURSE_VIEW" | "SEMESTER" | "USERS_ACCOUNTS" | "FEEDBACK" | "GLOBAL_RULES" | "SYSTEM_MODE" | "HELP_CENTER" | "AUDIT_QUERY";
        readonly AppendRecordReviewRequest: components["schemas"]["PassExerciseRecordRequest"] | components["schemas"]["ReturnExerciseRecordRequest"] | components["schemas"]["InvalidateExerciseRecordRequest"];
        readonly ApplicationDecision: {
            readonly decidedBy: components["schemas"]["TeacherSummary"];
            /** @enum {string} */
            readonly decision: "APPROVE" | "REJECT" | "REQUEST_SUPPLEMENT";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly decisionId: string;
            readonly fromStatus: components["schemas"]["ApplicationStatus"];
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly occurredAt: string;
            /** Format: int64 */
            readonly sequenceNumber: number;
            readonly studentVisibleMessage: string;
            readonly toStatus: components["schemas"]["ApplicationStatus"];
        };
        readonly ApplicationDecisionRequest: components["schemas"]["RequestSupplementDecisionRequest"] | components["schemas"]["RejectApplicationDecisionRequest"] | components["schemas"]["ApproveExemptionDecisionRequest"] | components["schemas"]["ApproveCertificationDecisionRequest"];
        readonly ApplicationMediaAllocationRequest: {
            /** Format: int64 */
            readonly declaredByteSize: number;
            /** @enum {string} */
            readonly declaredContentType: "image/jpeg" | "image/png" | "image/webp";
            /** @constant */
            readonly mediaKind: "IMAGE";
            /** @constant */
            readonly purpose: "APPLICATION_EVIDENCE";
        };
        /** @enum {string} */
        readonly ApplicationStatus: "SUBMITTED" | "SUPPLEMENT_REQUIRED" | "APPROVED" | "REJECTED";
        /** @enum {string} */
        readonly ApplicationType: "EXEMPTION" | "CERTIFICATION";
        /** @description Auxiliary startup result. A failed check must not clear a previously cached force-upgrade requirement. */
        readonly AppReleasePolicy: {
            /** Format: int64 */
            readonly currentBuildNumber: number;
            readonly downloadUrl: string | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly evaluatedAt: string;
            readonly forceUpgrade: boolean;
            /** Format: int64 */
            readonly latestBuildNumber: number;
            readonly message: components["schemas"]["LocalizedText"] | null;
            /** Format: int64 */
            readonly minimumSupportedBuildNumber: number;
            /** @enum {string} */
            readonly platform: "ANDROID" | "IOS" | "WEB";
        };
        readonly ApproveCertificationDecisionRequest: {
            /** @constant */
            readonly applicationType: "CERTIFICATION";
            /** Format: int32 */
            readonly courseRelatedCreditMinutes: number;
            /** @constant */
            readonly decision: "APPROVE";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            /** Format: int32 */
            readonly otherCreditMinutes: number;
            readonly studentVisibleMessage: string;
        };
        readonly ApproveExemptionDecisionRequest: {
            /** @constant */
            readonly applicationType: "EXEMPTION";
            /** @constant */
            readonly decision: "APPROVE";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedEnduranceOutcomeVersion: number;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly studentVisibleMessage: string;
        };
        /** @description Teacher report artifact bound to fixed projection and content identity. Source changes require new artifact; failed/pending export is not a successful file. No raw student/teacher media, final grade or remark in this combined report. */
        readonly AssessmentExportArtifact: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly artifactId: string;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly contentSha256: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly createdAt: string;
            readonly fileSha256: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly projectionId: string;
            /** @enum {string} */
            readonly state: "PENDING" | "READY" | "FAILED";
        } & (unknown & unknown & unknown);
        /** @description Authenticated teacher gateway bound to artifact/projection/file identity; recheck current responsible teacher and deny forwarded student/other-teacher use. */
        readonly AssessmentExportDownloadAuthorization: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly artifactId: string;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly contentSha256: string;
            /** Format: uri */
            readonly downloadUrl: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly expiresAt: string;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly fileSha256: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly projectionId: string;
        };
        readonly AssessmentExportRequest: {
            /** @description Hex-encoded SHA-256 checksum. */
            readonly expectedContentSha256: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly projectionId: string;
        };
        /** @description Read-only independent Owner composition, not an enrollment/outcome/settlement source of truth. Denominator from full confirmed unique roster identities; outside members are separate. Equal counts or mutually truncated lists do not prove completeness. Unknown source/count is null; old cache cannot claim current. Publication protects complete source sets and projection predecessor, writes no source Owner. */
        readonly AssessmentRosterProjection: {
            readonly confirmedRosterIdentityCount: number | null;
            readonly contentSha256: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly generatedAt: string;
            readonly incompleteSources: readonly ("ROSTER" | "MEMBERSHIP" | "IDENTITY" | "ENDURANCE" | "REVIEWS" | "APPLICATIONS" | "STATISTICS" | "SETTLEMENT")[];
            readonly membershipScopeVersion: string;
            readonly outsideRosterMemberCount: number | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly projectionId: string;
            readonly registeredMatchedCount: number | null;
            readonly rosterIncompleteCount: number | null;
            readonly snapshotId: string | null;
            readonly sources: readonly components["schemas"]["AssessmentRosterSource"][];
            /** @enum {string} */
            readonly state: "CURRENT" | "RECOMPUTING" | "UNAVAILABLE";
        } & (unknown & unknown & unknown);
        /** @description Teacher-only complete roster identities plus outside members, without merging distinct status columns. Registered completion requires verified school identity AND joined this class AND number/name match. Unavailable results remain explicit; progress uses A checkpoint, settlement uses E public state, never reverse-approves E. */
        readonly AssessmentRosterRow: {
            readonly applicationPendingCount: number | null;
            readonly endurance: components["schemas"]["StudentEnduranceOutcome"] | null;
            /** @enum {string} */
            readonly enduranceState: "UNRECORDED" | "DRAFT_PENDING" | "MEASURED" | "EXEMPT" | "UNAVAILABLE";
            readonly enrollmentId: string | null;
            readonly progress: components["schemas"]["StudentCourseProgress"] | null;
            /** @enum {string} */
            readonly registrationState: "MATCHED_VERIFIED_JOINED" | "NOT_REGISTERED_OR_JOINED" | "IDENTITY_UNRESOLVED" | "OUTSIDE_ROSTER";
            readonly reviewPendingCount: number | null;
            readonly rosterName: string | null;
            readonly rosterStudentNumber: string | null;
            readonly rowKey: string;
            readonly settlement: components["schemas"]["CourseSettlementSummary"] | null;
            readonly student: components["schemas"]["StudentSummary"] | null;
            readonly unresolvedReasons: readonly components["schemas"]["LocalizedText"][];
        };
        readonly AssessmentRosterRowPage: {
            /** @description Hex-encoded SHA-256 checksum. */
            readonly contentSha256: string;
            readonly items: readonly components["schemas"]["AssessmentRosterRow"][];
            readonly page: components["schemas"]["CursorPage"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly projectionId: string;
        };
        readonly AssessmentRosterSource: {
            /** @enum {string} */
            readonly owner: "ROSTER" | "MEMBERSHIP" | "IDENTITY" | "ENDURANCE" | "REVIEWS" | "APPLICATIONS" | "STATISTICS" | "SETTLEMENT";
            readonly scopeId: string;
            readonly sourceVersion: string;
        };
        readonly AuditArchiveDownload: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly auditArchiveJobId: string;
            /** @constant */
            readonly contentType: "application/zip";
            /** Format: uri */
            readonly downloadUrl: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly expiresAt: string;
        };
        readonly AuditArchiveJob: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly auditArchiveJobId: string;
            readonly completedAt: string | null;
            readonly expiresAt: string | null;
            readonly failureCode: string | null;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly fromDate: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly requestedAt: string;
            /** @enum {string} */
            readonly status: "REQUESTED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED";
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly toDate: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        /** @description Inclusive Asia/Shanghai dates. Backend converts them to one UTC half-open interval. */
        readonly AuditArchiveRequest: {
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly fromDate: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly toDate: string;
        };
        readonly AuditEvent: {
            /** @enum {string} */
            readonly actorRoleSnapshot: "STUDENT" | "TEACHER" | "ADMIN" | "SYSTEM";
            readonly actorUserId: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly auditEventId: string;
            /** Format: int32 */
            readonly metadataSchemaVersion: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly occurredAt: string;
            readonly operationDisplayName: string;
            readonly operationType: string;
            /** @enum {string} */
            readonly outcome: "SUCCESS" | "REJECTED" | "DENIED" | "FAILED" | "ERROR";
            readonly reasonCode: string | null;
            readonly requestId: string;
            readonly safeMetadata: components["schemas"]["AuditSafeMetadata"];
            readonly targetId: string | null;
            readonly targetType: string | null;
        };
        readonly AuditEventPage: {
            readonly items: readonly components["schemas"]["AuditEventSummary"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        readonly AuditEventSummary: {
            /** @enum {string} */
            readonly actorRoleSnapshot: "STUDENT" | "TEACHER" | "ADMIN" | "SYSTEM";
            readonly actorUserId: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly auditEventId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly occurredAt: string;
            readonly operationDisplayName: string;
            readonly operationType: string;
            /** @enum {string} */
            readonly outcome: "SUCCESS" | "REJECTED" | "DENIED" | "FAILED" | "ERROR";
            readonly requestId: string;
            readonly targetId: string | null;
            readonly targetType: string | null;
        };
        /** @description Closed safe metadata projection. Unavailable values are null and changedFields is empty. Passwords, OTPs, tokens, secrets, raw idempotency keys, raw IP/device/User-Agent, complete PII, media, object keys, signed URLs, internal notes, and raw snapshots have no representable field. */
        readonly AuditSafeMetadata: {
            readonly affectedCount: number | null;
            readonly changedFields: readonly string[];
            readonly failureCode: string | null;
            readonly fromState: string | null;
            readonly policyVersion: number | null;
            readonly sourceFormat: ("CSV" | "XLSX") | null;
            readonly toState: string | null;
        };
        readonly AuthChallenge: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly challengeId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly expiresAt: string;
            /** Format: int32 */
            readonly retryAfterSeconds: number;
        };
        /** @enum {string} */
        readonly AuthChallengePurpose: "STUDENT_LOGIN" | "STUDENT_EMAIL_BINDING" | "PASSWORD_RESET" | "CURRENT_EMAIL_VERIFICATION" | "NEW_EMAIL_VERIFICATION" | "ACCOUNT_DELETION";
        /** @description Requests an email OTP challenge. The response must not disclose whether an account exists. */
        readonly AuthChallengeRequest: {
            /**
             * Format: email
             * @description Normalized school email address.
             */
            readonly email: string;
            readonly purpose: components["schemas"]["AuthChallengePurpose"];
        };
        readonly CertificationCredit: {
            /** Format: int32 */
            readonly courseRelatedMinutes: number;
            /** Format: int32 */
            readonly otherMinutes: number;
            /** Format: int64 */
            readonly revisionNumber: number;
            /** @enum {string} */
            readonly state: "ACTIVE" | "REVOKED";
            readonly studentVisibleReason: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        /** @description The required closed certification kind is persisted and returned unchanged; organization or team names must never be used to infer the kind. */
        readonly CertificationDetails: {
            readonly certificationKind: components["schemas"]["CertificationKind"];
            readonly organizationOrTeamName: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly validFrom: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly validTo: string;
        };
        /** @enum {string} */
        readonly CertificationKind: "SCHOOL_TEAM" | "STUDENT_CLUB";
        readonly CloseManualModeRequest: {
            readonly expectedSourceRevision: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedWindowVersion: number;
            readonly reason: string;
        };
        readonly CommandAccepted: {
            /** @constant */
            readonly accepted: true;
        };
        /** @description No supplied completion timestamp. Null for normal completion. Non-null explanation is consumed only for swimming personal-delay handling of this original locked batch before endedAt+24h, with existing material; no replacement batch or automatic pass. */
        readonly CompleteRecordMaterialRequest: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly batchId: string;
            readonly delayExplanation: string | null;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedMaterialVersion: number;
        };
        /** @description Manual teacher entry/correction of an existing test. Server rechecks gender/grade/event/date, exactly one rule and outcome predecessor. Initial entry has null predecessor/reason; correcting a prior outcome requires original measurement and nonempty reason. No arbitrary OCR decimal notation or score input. */
        readonly ConfirmEnduranceMeasurementRequest: {
            readonly correctionReason: string | null;
            /** @enum {integer} */
            readonly distanceMeters: 800 | 1000;
            /** Format: int32 */
            readonly durationSeconds: number;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedEnrollmentVersion: number;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly previousMeasurementId: string | null;
            /** Format: int64 */
            readonly ruleRevisionNumber: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly ruleTableId: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly testedOn: string;
        } & (unknown & unknown);
        /** @description Reject repeated row IDs even if other fields differ; never silently deduplicate. Check all selected rows, current identity/rule/outcome guards and unique conversion before any write. Full selection/dates/seconds/rule versions define stable idempotency. One failure rejects whole selection; unselected rows untouched. */
        readonly ConfirmEnduranceRowsRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedBatchVersion: number;
            readonly expectedRowsSourceVersion: string;
            readonly selectedRows: readonly components["schemas"]["EnduranceSelectedRow"][];
        };
        readonly ConfirmSettlementRequest: {
            readonly expectedPreviousSettlementVersionId: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly preparationId: string;
            readonly preparationToken: string;
        };
        /** @description Correct a terminal judgment using existing established facts, preserving material and original decisions. This command cannot restore supplementary entry or impersonate a platform-fault correction. */
        readonly CorrectExerciseRecordInvalidRequest: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly correctedReviewId: string;
            /** @enum {integer} */
            readonly expectedRoundNo: 1 | 2;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly materialVersionId: string;
            readonly publicComment: string;
            /** @enum {string} */
            readonly reasonCode: "UNCLEAR_EVIDENCE" | "MISSING_REQUIRED_EVIDENCE" | "EVIDENCE_SESSION_MISMATCH" | "INCONSISTENT_EVIDENCE" | "CONFIRMED_REUSE_OR_MISUSE";
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly result: "INVALID";
        };
        readonly CorrectExerciseRecordReviewRequest: components["schemas"]["CorrectExerciseRecordValidRequest"] | components["schemas"]["CorrectExerciseRecordInvalidRequest"];
        /** @description Correct a terminal judgment using existing established facts, preserving material and original decisions. This command cannot restore supplementary entry or impersonate a platform-fault correction. */
        readonly CorrectExerciseRecordValidRequest: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly correctedReviewId: string;
            /** @enum {integer} */
            readonly expectedRoundNo: 1 | 2;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly materialVersionId: string;
            readonly publicComment: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly result: "VALID";
        };
        /** @description Course lifecycle is separate from settlement/archive. Existing targets/checkin fields are server-derived compatibility summaries of draft or frozen rule; never independently writable. Draft target revisionNumber starts at 1; publication freezes it. */
        readonly Course: {
            /** Format: int32 */
            readonly activeMemberCount: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly checkinClosesAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly checkinOpensAt: string;
            readonly closedAt: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            readonly description: string | null;
            readonly displayStatus: ("UPCOMING" | "ACTIVE") | null;
            readonly draftRule: components["schemas"]["CourseRuleConfiguration"] | null;
            readonly joinOpen: boolean;
            readonly name: string;
            readonly publishedRule: components["schemas"]["CourseRuleVersion"] | null;
            /** Format: int32 */
            readonly removedMemberCount: number;
            readonly responsibleTeacher: components["schemas"]["TeacherSummary"];
            readonly semester: components["schemas"]["SemesterSummary"];
            /** @enum {string} */
            readonly status: "DRAFT" | "OPEN" | "CLOSED";
            readonly targets: components["schemas"]["CourseTargets"];
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        } & (unknown & unknown & unknown);
        /** @description Authoritative allowed exercise interval, start inclusive/end exclusive; intervals are ordered, non-overlapping, and inside the original current semester. */
        readonly CourseAllowedInterval: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly endsAtExclusive: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly startsAt: string;
        };
        /** @description Name/description impact only. No path through this token can mutate frozen targets or schedule. */
        readonly CourseChangeImpact: {
            readonly affectedStudents: readonly components["schemas"]["StudentSummary"][];
            readonly canApply: boolean;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly expiresAt: string;
            readonly impactToken: string;
        };
        readonly CourseChangeProposal: {
            readonly description: string | null;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly name: string;
        };
        readonly CourseCloseRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly reason: string;
        };
        readonly CourseCreateRequest: {
            readonly description: string | null;
            readonly name: string;
            readonly rule: components["schemas"]["CourseRuleConfiguration"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly semesterId: string;
        };
        readonly CourseDraftUpdateRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly rule: components["schemas"]["CourseRuleConfiguration"];
        };
        /** @description Recoverable teacher-management metadata. The raw invitation code and digest are never returned. */
        readonly CourseInvitation: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly createdAt: string;
            readonly displaySuffix: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly expiresAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly invitationId: string;
            /** @description Unrevoked invitation with an unfinished legally registered flow can still be revoked during natural-expiry grace, so its current expiry is not sufficient to make it irrevocable. */
            readonly revocable: boolean;
            /** @enum {string} */
            readonly status: "ACTIVE" | "EXPIRED" | "REVOKED" | "COURSE_CLOSED" | "NOT_CURRENT";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        /** @description Server derives createdAt and original expiresAt. QR and manual code use exactly the same lifetime and one grace policy. */
        readonly CourseInvitationCreateRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedCourseVersion: number;
            /** @default 30 */
            readonly lifetimeMinutes: number;
        };
        readonly CourseInvitationPage: {
            readonly items: readonly components["schemas"]["CourseInvitation"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Every recognized invitation code returns exactly one of the five content states with the safe course and expiry projection. Unknown, malformed, or unsafe-to-project codes use INVITATION_INVALID instead. */
        readonly CourseInvitationPreview: {
            readonly course: components["schemas"]["InvitationCourseSummary"];
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly expiresAt: string;
            readonly newRegistrationAllowed: boolean;
            /** @enum {string} */
            readonly status: "ACTIVE" | "EXPIRED" | "REVOKED" | "COURSE_CLOSED" | "NOT_CURRENT";
            readonly unavailableReason: ("EXPIRED" | "REVOKED" | "JOIN_CLOSED" | "COURSE_CLOSED" | "NOT_CURRENT") | null;
        } & (unknown & unknown);
        readonly CourseInvitationRevokeRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
        };
        readonly CoursePage: {
            readonly items: readonly components["schemas"]["Course"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Opaque server evidence bound to exact draft and complete Owner calendar. Feasible requires a complete legal non-overlapping per-category witness; day capacity alone is insufficient (610/590 over 20 days fails). Unknown/partial search is UNAVAILABLE, never proof of infeasibility. No client-provided true/optimal/feasible flag is accepted. */
        readonly CoursePlanEvidence: {
            readonly calendarSourceVersion: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly computedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly draftVersion: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly evidenceId: string;
            readonly explanation: components["schemas"]["LocalizedText"];
            /** @enum {string} */
            readonly proofKind: "LEGAL_COMPLETE_WITNESS" | "EXACT_EXHAUSTIVE_PROOF" | "STRICT_IMPOSSIBILITY_PROOF" | "NONE";
            readonly publicationToken: string | null;
            /** @enum {string} */
            readonly result: "FEASIBLE" | "INFEASIBLE" | "UNAVAILABLE";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly semesterVersion: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly templateVersionId: string;
        } & (unknown & unknown & unknown);
        readonly CoursePlanRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedCourseVersion: number;
        };
        /** @description Draft parameters. Targets sum exactly 1200. Allowed intervals end no later than regular cutoff; the seven-day closeout is server-derived. Planned settlement is no earlier than its end, compatible with semester archival. Server validates interval, calendar, semester and joint two-category feasibility without hypothetical certification/make-up. */
        readonly CourseRuleConfiguration: {
            readonly allowedIntervals: readonly components["schemas"]["CourseAllowedInterval"][];
            /** Format: int64 */
            readonly courseRelatedTargetMinutes: number;
            /** Format: int64 */
            readonly otherTargetMinutes: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly plannedSettlementAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly regularCutoffAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly templateVersionId: string;
            /**
             * @default 30
             * @enum {integer}
             */
            readonly thresholdMinutes: 30 | 45 | 60;
            /**
             * @default 3
             * @enum {integer}
             */
            readonly weeklyCountLimit: 2 | 3 | 4;
        };
        /** @description Immutable server-filled publication snapshot. Asia/Shanghai day/week; closeout ends seven days after cutoff. Reminder scheduled at max(publication, cutoff minus 14 days), never a fabricated sent record. Name/description updates do not alter this object. */
        readonly CourseRuleVersion: {
            readonly allowedIntervals: readonly components["schemas"]["CourseAllowedInterval"][];
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly closeoutEndsAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /** Format: int64 */
            readonly courseRelatedTargetMinutes: number;
            /** Format: int64 */
            readonly otherTargetMinutes: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly plannedSettlementAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly publishedAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly regularCutoffAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly reminderScheduledAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly ruleVersionId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly semesterId: string;
            readonly template: components["schemas"]["RuleTemplateVersion"];
            /** @enum {integer} */
            readonly thresholdMinutes: 30 | 45 | 60;
            /** Format: int64 */
            readonly versionNo: number;
            /** @enum {integer} */
            readonly weeklyCountLimit: 2 | 3 | 4;
        };
        /** @description Admin aggregate only; no student/record/media/grade drill-down. SETTLED requires current complete unblocked sources, not merely a past report. Missing sources are UNAVAILABLE with no invented pendingCount=0. */
        readonly CourseSettlementSummary: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            readonly currentSettlementVersionId: string | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly observedAt: string;
            readonly pendingCount: number | null;
            readonly sourceVersion: string | null;
            /** @enum {string} */
            readonly state: "NOT_SETTLED" | "BLOCKED" | "UNAVAILABLE" | "SETTLED";
        } & (unknown & unknown);
        /** @description Complete authority-pinned course set across pages. Semester archival must obtain and recheck all courses under its protected switch, never only one page. */
        readonly CourseSettlementSummaryPage: {
            readonly courseSetVersion: string;
            readonly items: readonly components["schemas"]["CourseSettlementSummary"][];
            readonly page: components["schemas"]["CursorPage"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly semesterId: string;
        };
        /** @description Denominator belongs to the same authoritative complete enrollment set as aggregates. Historical scope never silently becomes today's active members. */
        readonly CourseStatisticsScope: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /** @enum {string} */
            readonly kind: "CURRENT_ACTIVE_MEMBERS" | "HISTORICAL_SETTLEMENT";
            /** Format: int64 */
            readonly memberCount: number;
            readonly membershipScopeVersion: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly scopeId: string;
            readonly settlementVersionId: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly snapshotId: string;
        } & (unknown & unknown);
        readonly CourseTargets: {
            /** Format: int32 */
            readonly courseRelatedTargetMinutes: number;
            /** Format: int32 */
            readonly otherTargetMinutes: number;
            /** Format: int64 */
            readonly revisionNumber: number;
            /**
             * Format: int32
             * @constant
             */
            readonly totalTargetMinutes: 1200;
        };
        readonly CourseUpdateRequest: {
            readonly description: string | null;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly impactToken: string;
            readonly name: string;
        };
        readonly CreateCertificationApplicationRequest: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly applicationType: "CERTIFICATION";
            readonly certification: components["schemas"]["CertificationDetails"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            readonly evidenceAssetIds: readonly string[];
        };
        /** @description Secret-bearing creation response; clients must not log, persist, or expose the raw invitation code beyond the user-requested share flow. */
        readonly CreatedCourseInvitation: {
            readonly invitation: components["schemas"]["CourseInvitation"];
            /** @description Sensitive value returned only by the successful creation request and its exact idempotent replays. Backend stores only a digest for validation; later read operations never return it. */
            readonly invitationCode: string;
        };
        readonly CreateExemptionApplicationRequest: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly applicationType: "EXEMPTION";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            readonly evidenceAssetIds: readonly string[];
        };
        readonly CreateFeedbackRequest: {
            readonly category: components["schemas"]["FeedbackCategory"];
            readonly description: string;
        };
        readonly CreateHelpArticleRequest: {
            readonly bodyEn: string | null;
            readonly bodyZh: string | null;
            readonly category: components["schemas"]["HelpArticleCategory"];
            /** @enum {string} */
            readonly initialStatus: "DRAFT" | "PUBLISHED";
            readonly keywords: readonly string[];
            readonly sortWeight: number;
            readonly titleEn: string;
            readonly titleZh: string;
        };
        readonly CreateStudentApplicationRequest: components["schemas"]["CreateExemptionApplicationRequest"] | components["schemas"]["CreateCertificationApplicationRequest"];
        /** @description The non-empty exactly confirmed initial password is a temporary password assigned by another person. Successful creation sets the new administrator's CurrentActor.mustChangePassword=true; no additional password-strength rule is added. */
        readonly CreateSubAdminRequest: {
            readonly confirmInitialPassword: string;
            readonly department: string | null;
            readonly initialPassword: string;
            readonly loginName: string;
            readonly name: string;
            readonly permissions: readonly components["schemas"]["AdminPermission"][];
            /**
             * Format: email
             * @description Normalized school email address.
             */
            readonly verifiedEmail: string;
        };
        readonly CreateTeacherBatchRequest: {
            /** @description At least eight characters with uppercase, lowercase, and a digit. */
            readonly initialPassword: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly validationId: string;
        };
        /** @description One electronic file or one ordered paper source batch. Verify full aggregate bytes/row count, source ownership/purpose/checksum and unique asset identities before acceptance; source order is part of stable request identity. New acceptance requires open course; already accepted original batches remain operable after closure. */
        readonly CreateTeachingBatchRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedCourseVersion: number;
            /** @enum {string} */
            readonly sourceFormat: "XLSX" | "CSV" | "PAPER_SCAN";
            readonly sources: readonly components["schemas"]["TeachingSourceReference"][];
        } & (unknown & unknown);
        readonly CurrentActor: {
            /** @enum {string} */
            readonly accountState: "ACTIVE" | "DISABLED";
            readonly adminKind: components["schemas"]["AdminKind"] | null;
            readonly adminPermissions: readonly components["schemas"]["AdminPermission"][];
            readonly displayName: string;
            /** @description True only while a Teacher/Admin is using a system- or other-person-assigned temporary initial password. Successful self password change or verified-email self reset clears it to false. */
            readonly mustChangePassword: boolean;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly organizationId: string;
            readonly role: components["schemas"]["ActorRole"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly userId: string;
            /**
             * Format: email
             * @description Normalized school email address.
             */
            readonly verifiedEmail: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        /** @description Keyset pagination metadata. A null cursor means that direction has no more results. */
        readonly CursorPage: {
            /** Format: int32 */
            readonly limit: number;
            readonly nextCursor: string | null;
            readonly previousCursor: string | null;
        };
        readonly DeleteEnduranceRuleIntervalChange: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly action: "DELETE";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly intervalId: string;
        };
        readonly DeleteSubAdminRequest: {
            readonly confirmationLoginName: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            /** @constant */
            readonly responsibilityTransferConfirmed: true;
        };
        readonly DeleteTeacherAccountRequest: {
            readonly confirmationEmployeeId: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly reason: string;
        };
        readonly DeletionResult: {
            /** @constant */
            readonly deleted: true;
            readonly retainedFacts: readonly string[];
        };
        /**
         * @description HTTP method covered by every short-lived direct-upload authorization in this Contract version.
         * @enum {string}
         */
        readonly DirectUploadHttpMethod: "PUT";
        /** @description Candidate for explicit identity check, never fuzzy-name authorization. Official roster identity may exist before account registration; null account/enrollment is not a reason to silently drop that roster row. */
        readonly DraftIdentityCandidate: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly candidateId: string;
            readonly enrollmentId: string | null;
            readonly identitySourceVersion: string;
            readonly name: string;
            readonly studentId: string | null;
            readonly studentNumber: string;
        };
        /** @description State derived by owning module from full source rows, immutable teacher decisions and committed formal results. PARSING/technical failure never equals formal import. COMPLETED requires all rows terminal and formal publication/measurements; partial confirmation preserves outstanding rows. Historical completion receipt is not undone by later roster pointer changes. */
        readonly EnduranceCaptureBatch: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly acceptedAt: string;
            readonly attempt: components["schemas"]["ExtractionAttemptSummary"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly batchId: string;
            readonly counts: components["schemas"]["TeachingBatchCounts"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly inputSha256: string;
            /** @constant */
            readonly kind: "ENDURANCE";
            readonly rowsSourceVersion: string | null;
            /** @enum {string} */
            readonly sourceFormat: "XLSX" | "CSV" | "PAPER_SCAN";
            readonly sources: readonly components["schemas"]["TeachingSourceAsset"][];
            /** @enum {string} */
            readonly state: "PARSING" | "REVIEW_REQUIRED" | "PARTIALLY_CONFIRMED" | "COMPLETED" | "FAILED_TECHNICAL";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        } & (unknown & unknown & unknown);
        readonly EnduranceCaptureBatchPage: {
            readonly items: readonly components["schemas"]["EnduranceCaptureBatch"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        readonly EnduranceConversion: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly convertedAt: string;
            /** @enum {string} */
            readonly level: "EXCELLENT" | "GOOD" | "PASS" | "FAIL";
            /** Format: int64 */
            readonly ruleRevisionNumber: number;
            /** Format: int32 */
            readonly score: number;
        };
        /** @description 4.30 is AMBIGUOUS_TIME_FORMAT, never automatically270 or258 seconds. READY means teacher resolved all original issues, not a formal measurement. Formal confirmation is a separate atomic selection command; unselected rows remain unchanged. */
        readonly EnduranceDraftRow: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly batchId: string;
            readonly confidenceHint: number | null;
            readonly decisionId: string | null;
            readonly identityCandidates: readonly components["schemas"]["DraftIdentityCandidate"][];
            readonly issues: readonly components["schemas"]["TeachingDraftIssue"][];
            readonly measurementId: string | null;
            readonly originalText: string;
            readonly originalTimeText: string | null;
            readonly position: components["schemas"]["TeachingSourcePosition"];
            readonly resolvedValues: components["schemas"]["ResolvedEnduranceValues"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly rowId: string;
            /** @enum {string} */
            readonly state: "REVIEW_REQUIRED" | "READY" | "CONFIRMED" | "EXCLUDED";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        } & (unknown & unknown & unknown & unknown & unknown & unknown);
        readonly EnduranceDraftRowPage: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly batchId: string;
            readonly items: readonly components["schemas"]["EnduranceDraftRow"][];
            readonly page: components["schemas"]["CursorPage"];
            readonly rowsSourceVersion: string;
        };
        /** @description Formal append-only original seconds/test-date and uniquely matched conversion snapshot. Subsequent rule changes never rewrite old conversion. Correction must reference prior fact and reason; no reverse derivation from score. */
        readonly EnduranceMeasurement: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly confirmedAt: string;
            readonly confirmedBy: components["schemas"]["TeacherSummary"];
            readonly conversion: components["schemas"]["EnduranceConversion"];
            readonly correctionReason: string | null;
            /** @enum {integer} */
            readonly distanceMeters: 800 | 1000;
            /** Format: int32 */
            readonly durationSeconds: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly measurementId: string;
            readonly previousMeasurementId: string | null;
            readonly sourceBatchId: string | null;
            readonly sourceRowId: string | null;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly testedOn: string;
        } & (unknown & unknown);
        readonly EnduranceMeasurementPage: {
            readonly items: readonly components["schemas"]["EnduranceMeasurement"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Teacher-only measured time, date and conversion/exception result; confirmed new measurements require one unique conversion. Legacy missing conversion remains explicitly null rather than guessed; historical correction appends a new version. */
        readonly EnduranceOutcome: {
            readonly approvedExemptionApplicationId: string | null;
            readonly conversion: components["schemas"]["EnduranceConversion"] | null;
            readonly distanceMeters: (800 | 1000) | null;
            readonly durationSeconds: number | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            readonly measurementId: string | null;
            /** @enum {string} */
            readonly outcome: "UNRECORDED" | "MEASURED" | "EXEMPT";
            readonly testedOn: string | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        /** @description Selected measurement/conversion/row/outcome pointers, receipt, audit/outbox committed together. Exact replay returns original set and original batch result; no new measurement or current-pointer rollback. */
        readonly EnduranceRowsConfirmation: {
            readonly batch: components["schemas"]["EnduranceCaptureBatch"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly batchId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly committedAt: string;
            readonly measurements: readonly components["schemas"]["EnduranceMeasurement"][];
        };
        readonly EnduranceRuleInterval: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly intervalId: string;
            /** @enum {string} */
            readonly level: "EXCELLENT" | "GOOD" | "PASS" | "FAIL";
            /** Format: int32 */
            readonly lowerSeconds: number;
            readonly remark: string | null;
            /** Format: int32 */
            readonly score: number;
            /** Format: int32 */
            readonly upperSeconds: number;
        };
        readonly EnduranceRuleTable: {
            /**
             * Format: int32
             * @enum {integer}
             */
            readonly distanceMeters: 800 | 1000;
            /** @enum {string} */
            readonly gender: "FEMALE" | "MALE";
            /** @enum {string} */
            readonly gradeGroup: "Y1_Y2" | "Y3_Y4";
            readonly intervals: readonly components["schemas"]["EnduranceRuleInterval"][];
            /** Format: int64 */
            readonly revisionNumber: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly ruleTableId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly EnduranceRuleTableList: {
            readonly items: readonly components["schemas"]["EnduranceRuleTableSummary"][];
        };
        readonly EnduranceRuleTableSummary: {
            /**
             * Format: int32
             * @enum {integer}
             */
            readonly distanceMeters: 800 | 1000;
            /** @enum {string} */
            readonly gender: "FEMALE" | "MALE";
            /** @enum {string} */
            readonly gradeGroup: "Y1_Y2" | "Y3_Y4";
            /** Format: int32 */
            readonly ruleCount: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly ruleTableId: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        /** @description Exact selected row identity and teacher-resolved semantic values/Owner versions. Server compares to current bound row; caller cannot substitute values after review. */
        readonly EnduranceSelectedRow: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedRowVersion: number;
            readonly resolvedValues: components["schemas"]["ResolvedEnduranceValues"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly rowId: string;
        };
        readonly Enrollment: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly joinedAt: string;
            readonly removedAt: string | null;
            /** @enum {string} */
            readonly status: "ACTIVE" | "REMOVED";
            readonly student: components["schemas"]["StudentSummary"];
            readonly studentVisibleReason: string | null;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly EnrollmentPage: {
            readonly items: readonly components["schemas"]["Enrollment"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        readonly EnrollmentTransitionRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly studentVisibleReason: string;
        };
        readonly EnterMaintenanceRequest: {
            readonly announcement: components["schemas"]["MaintenanceAnnouncement"];
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly reason: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly targetMode: "MAINTENANCE";
        };
        /**
         * @description Stable machine-readable error code.
         * @enum {string}
         */
        readonly ErrorCode: "INVALID_REQUEST" | "INVALID_CURSOR" | "AUTHENTICATION_REQUIRED" | "INVALID_CREDENTIALS" | "TOKEN_EXPIRED" | "CHALLENGE_EXPIRED" | "ACCOUNT_DISABLED" | "FIRST_PASSWORD_CHANGE_REQUIRED" | "FORBIDDEN" | "RESOURCE_NOT_FOUND" | "IDEMPOTENCY_KEY_REUSED" | "VERSION_CONFLICT" | "VALIDATION_FAILED" | "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE" | "RATE_LIMITED" | "SYSTEM_MAINTENANCE" | "DEPENDENCY_UNAVAILABLE" | "INTERNAL_ERROR" | "EMAIL_ALREADY_IN_USE" | "LOGIN_NAME_ALREADY_IN_USE" | "STUDENT_NUMBER_ALREADY_IN_USE" | "EMPLOYEE_ID_ALREADY_IN_USE" | "ACCOUNT_DELETION_BLOCKED" | "ADMIN_RESPONSIBILITY_BLOCKED" | "INVITATION_INVALID" | "COURSE_ALREADY_JOINED" | "ENROLLMENT_NOT_ACTIVE" | "COURSE_NOT_OPEN" | "COURSE_TARGET_TOTAL_INVALID" | "SEMESTER_COMBINATION_EXISTS" | "SEMESTER_NOT_UPCOMING" | "SEMESTER_NOT_CURRENT" | "SEMESTER_START_DATE_NOT_REACHED" | "ROSTER_SOURCE_INVALID" | "ROSTER_ROW_LIMIT_EXCEEDED" | "ROSTER_FINDING_ALREADY_RESOLVED" | "ROSTER_SNAPSHOT_NOT_IN_COURSE" | "SESSION_ALREADY_ACTIVE" | "SESSION_TRANSITION_INVALID" | "CHECKIN_WINDOW_CLOSED" | "MEDIA_NOT_VERIFIED" | "MEDIA_OWNERSHIP_MISMATCH" | "MEDIA_LIMIT_EXCEEDED" | "MEDIA_CONTENT_INVALID" | "MEDIA_ALREADY_BOUND" | "RECORD_DESCRIPTION_INVALID" | "REVIEW_RESULT_UNCHANGED" | "ENDURANCE_OUTCOME_EXEMPT" | "ENDURANCE_RULE_TABLE_INVALID" | "APPLICATION_EVIDENCE_LIMIT_EXCEEDED" | "APPLICATION_TRANSITION_INVALID" | "APPLICATION_SUPPLEMENT_NOT_ALLOWED" | "CERTIFICATION_CREDIT_INVALID" | "FINAL_GRADE_VALUE_INVALID" | "FEEDBACK_TRANSITION_INVALID" | "HELP_ARTICLE_TRANSITION_INVALID" | "HELP_ARTICLE_PUBLICATION_INCOMPLETE" | "SYSTEM_MODE_UNCHANGED" | "MAINTENANCE_ANNOUNCEMENT_REQUIRED" | "AUDIT_DATE_RANGE_INVALID" | "AUDIT_ARCHIVE_NOT_READY" | "FIRST_MATERIAL_DEADLINE_MISSED" | "FIRST_MATERIAL_ALREADY_ACCEPTED" | "MATERIAL_BATCH_CONFLICT" | "MATERIAL_NOT_READY" | "MATERIAL_TRANSFER_DEADLINE_MISSED" | "SUPPLEMENT_NOT_ALLOWED" | "SUPPLEMENT_DEADLINE_MISSED" | "REVIEW_ACTION_NOT_ALLOWED" | "REVIEW_PRECONDITION_UNSATISFIED" | "CORRECTION_CONFLICT" | "COURSE_RULES_LOCKED" | "COURSE_NOT_PUBLISHED" | "COURSE_PLAN_INFEASIBLE" | "COURSE_PLAN_UNAVAILABLE" | "COURSE_PLAN_STALE" | "INVITATION_FLOW_EXPIRED" | "INVITATION_FLOW_TERMINATED" | "INVITATION_FLOW_MISMATCH" | "MAKEUP_NOT_ALLOWED" | "STATISTICS_UNAVAILABLE" | "SETTLEMENT_BLOCKED" | "SETTLEMENT_SOURCE_STALE" | "SETTLEMENT_SOURCE_UNAVAILABLE" | "SETTLEMENT_CORRECTION_INVALID" | "SEMESTER_SETTLEMENT_BLOCKED" | "TEACHING_SOURCE_INVALID" | "TEACHING_SOURCE_NOT_READY" | "TEACHING_BATCH_NOT_REVIEWABLE" | "TEACHING_ROW_UNRESOLVED" | "TEACHING_DUPLICATE_IDENTITY" | "TEACHING_SOURCE_STALE" | "TEACHING_SOURCE_UNAVAILABLE" | "ENDURANCE_CONVERSION_UNAVAILABLE" | "TECHNICAL_SERVICE_REFERENCE_INVALID" | "TECHNICAL_SERVICE_VALIDATION_REQUIRED" | "MANUAL_WINDOW_CONFLICT" | "PROJECTION_NOT_READY";
        /** @description Safe structured details. Arrays are empty when no values apply; the entire details property may instead be null. */
        readonly ErrorDetails: {
            readonly blockers: readonly string[];
            readonly currentVersion: number | null;
            readonly fieldViolations: readonly components["schemas"]["FieldViolation"][];
            readonly retryAfterSeconds: number | null;
        };
        /**
         * @example {
         *       "code": "COURSE_ALREADY_JOINED",
         *       "message": "你已经加入该课程",
         *       "requestId": "req_xxx",
         *       "details": null
         *     }
         */
        readonly ErrorEnvelope: {
            readonly code: components["schemas"]["ErrorCode"];
            readonly details: components["schemas"]["ErrorDetails"] | null;
            /** @description Localized human-readable message; clients branch only on code. */
            readonly message: string;
            /** @description Correlation identifier safe to provide to support. */
            readonly requestId: string;
        };
        /** @enum {string} */
        readonly ExerciseCategory: "COURSE_RELATED" | "OTHER";
        /** @description Immutable original exercise identity, duration, category and date; mutable material/review projections remain separate. First acceptance does not mean VALID or counted progress. Full eligible/countable-minute projection is supplied by the separate statistics contract in Phase5 step4. */
        readonly ExerciseRecord: {
            /** @enum {string} */
            readonly activityType: "STANDARD" | "SWIMMING";
            /** Format: int64 */
            readonly actualDurationSeconds: number;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly businessDate: string;
            readonly category: components["schemas"]["ExerciseCategory"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            readonly currentMaterial: components["schemas"]["MaterialVersion"];
            readonly currentReview: components["schemas"]["RecordReviewSummary"];
            readonly description: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly recordId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly ruleVersionId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sessionId: string;
            readonly student: components["schemas"]["StudentSummary"];
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly submittedAt: string;
        };
        readonly ExerciseRecordPage: {
            readonly items: readonly components["schemas"]["ExerciseRecord"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description All formal times, businessDate, elapsed intervals, and actual duration are server-derived. Clients never submit them. */
        readonly ExerciseSession: {
            readonly actualDurationSeconds: number | null;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly businessDate: string;
            readonly completedAt: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /** Format: int64 */
            readonly elapsedActiveSeconds: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            readonly makeupAuthorizationId: string | null;
            readonly pausedAt: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly ruleVersionId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sessionId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly startedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly stateVersion: number;
            /** @enum {string} */
            readonly status: "ACTIVE" | "PAUSED" | "COMPLETED";
        };
        readonly ExerciseSessionTransitionRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
        };
        readonly ExistingStudentJoinRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedAccountVersion: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly flowId: string;
        };
        /** @description Read-only public explanation of an authorized append-only correction, not an admin unlock request. Preserve original terminal and legal successors. No elapsed seconds accrue while the erroneous lock still prevents entry. An accepted later decision/settlement/correction conflict must fail targeted publication, not be overwritten. */
        readonly ExpiryCorrectionFact: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly correctedReviewId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly correctionId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly createdAt: string;
            readonly entryRestoredAt: string | null;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedCaseVersion: number;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedTimerVersion: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly incidentReferenceId: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly incidentRevision: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly materialVersionId: string;
            /** @enum {integer} */
            readonly originalBudgetHours: 24 | 72;
            readonly restoredRemainingSeconds: number;
            readonly restoredStage: components["schemas"]["ReviewProcessingStage"];
            /** @enum {integer} */
            readonly roundNo: 1 | 2;
            /** @constant */
            readonly supplementReturnUsed: true;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly timerId: string;
        } & unknown;
        /** @description Safe teacher technical metadata. XLSX/CSV deterministic parser has null service revision. Late results cannot change original OCR text, teacher decision or formal fact. Retries bind immutable input/configuration; no provider prompt, key or raw payload. */
        readonly ExtractionAttemptSummary: {
            /** Format: int64 */
            readonly attemptNo: number;
            readonly failureCode: ("TIMEOUT" | "UNAVAILABLE" | "PARSE_FAILED" | "INVALID_OUTPUT" | "RETRY_EXHAUSTED") | null;
            readonly finishedAt: string | null;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly inputSha256: string;
            readonly policyVersion: string;
            readonly serviceRevisionId: string | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly startedAt: string;
            /** @enum {string} */
            readonly state: "RUNNING" | "SUCCEEDED" | "FAILED" | "MANUAL_REQUIRED" | "STALE";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly taskId: string;
        };
        /** @enum {string} */
        readonly FeedbackCategory: "FUNCTION_BUG" | "FEATURE_SUGGESTION" | "ACCESSIBILITY" | "PRIVACY" | "OTHER";
        readonly FeedbackPage: {
            readonly items: readonly components["schemas"]["FeedbackTicket"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        readonly FeedbackReply: {
            readonly fromStatus: components["schemas"]["FeedbackStatus"];
            readonly publicReply: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly repliedAt: string;
            readonly repliedBy: components["schemas"]["PersonSummary"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly replyId: string;
            /** Format: int64 */
            readonly sequenceNumber: number;
            readonly toStatus: components["schemas"]["FeedbackStatus"];
        };
        /** @enum {string} */
        readonly FeedbackStatus: "WAITING" | "IN_PROGRESS" | "WAITING_TECH" | "COMPLETED" | "CLOSED";
        /** @description No attachment, platform, client version, priority, assignee, or internal-note fields exist in this Contract. */
        readonly FeedbackTicket: {
            readonly category: components["schemas"]["FeedbackCategory"];
            readonly currentVerifiedEmail: string | null;
            readonly description: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly feedbackId: string;
            readonly feedbackNumber: string;
            readonly replies: readonly components["schemas"]["FeedbackReply"][];
            readonly status: components["schemas"]["FeedbackStatus"];
            readonly student: components["schemas"]["StudentSummary"];
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly submittedAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly FieldViolation: {
            readonly field: string;
            readonly reason: string;
        };
        /** @description Responsible-teacher grade publication without remark. Existing stored historical remarks are retained and available only through the audited historical read API. */
        readonly FinalGradePublication: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            /**
             * Format: int32
             * @description Any signed int32 value; intentionally no 0-100 constraint.
             */
            readonly gradeValue: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly publicationId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly publishedAt: string;
            readonly publishedBy: components["schemas"]["TeacherSummary"];
            /** Format: int64 */
            readonly sequenceNumber: number;
        };
        readonly FinalGradePublicationPage: {
            readonly items: readonly components["schemas"]["FinalGradePublication"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        readonly FinalGradeState: {
            readonly currentPublication: components["schemas"]["FinalGradePublication"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            readonly updatedAt: string | null;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly FinalGradeStatePage: {
            readonly items: readonly components["schemas"]["FinalGradeState"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description The checksum is an optional client integrity assertion. Backend/COS probing remains authoritative. */
        readonly FinalizeMediaRequest: {
            readonly clientChecksumSha256: string | null;
        };
        /** @description The original atomic acceptance receipt is replayed unchanged after successful authentication and original ownership checks. Later readiness is read separately. Offline swimming requires all material ready within its 24h window and enters teacher review. */
        readonly FirstMaterialAcceptance: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly acceptedAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly firstDueAt: string;
            readonly material: components["schemas"]["MaterialVersion"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly receiptId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly recordId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sessionId: string;
            /** @enum {string} */
            readonly submissionRoute: "ORDINARY" | "SWIMMING_TIMELY" | "SWIMMING_OFFLINE";
        } & (unknown & unknown);
        /** @description Read-only deadlines for an owned completed legal Session. Eligibility is rechecked atomically on writes; time and identity alone do not prove evidence or activity. An existing first receipt is not required to preserve a pre-closure/removal legal Session's window. */
        readonly FirstMaterialEligibility: {
            readonly eligibleHistoricalChain: boolean;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly endedAt: string;
            readonly firstReceipt: components["schemas"]["FirstMaterialAcceptance"] | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly ordinaryFirstDueAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly serverNow: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sessionId: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly sessionVersion: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly swimmingOfflineDueAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly swimmingTimelyDueAt: string;
        };
        /** @description Missing latency/backlog remains null and must not be interpreted as healthy. */
        readonly HealthStatus: {
            readonly backlogCount: number | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly checkedAt: string;
            /** @enum {string} */
            readonly component: "API" | "DATABASE" | "NOTIFICATION_CENTER" | "OBJECT_STORAGE" | "MEDIA_STORAGE";
            readonly latencyMilliseconds: number | null;
            /** @enum {string} */
            readonly status: "UP" | "DOWN" | "NOT_CONFIGURED";
        };
        readonly HelpArticleAdmin: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly articleId: string;
            readonly bodyEn: string | null;
            readonly bodyZh: string | null;
            readonly category: components["schemas"]["HelpArticleCategory"];
            readonly firstPublishedAt: string | null;
            readonly keywords: readonly string[];
            /** Format: int64 */
            readonly revisionNumber: number;
            readonly sortWeight: number;
            readonly status: components["schemas"]["HelpArticleStatus"];
            readonly titleEn: string;
            readonly titleZh: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly HelpArticleAdminPage: {
            readonly items: readonly components["schemas"]["HelpArticleAdmin"][];
            readonly page: components["schemas"]["CursorPage"];
            readonly summary: components["schemas"]["HelpArticleAdminSummary"];
        };
        /** @description Organization-wide help-article summary from the same committed read snapshot as the returned items. Counts ignore q, status, category, cursor, and limit. */
        readonly HelpArticleAdminSummary: {
            /** Format: int32 */
            readonly archivedCount: number;
            /** Format: int32 */
            readonly draftCount: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly generatedAt: string;
            /** Format: int32 */
            readonly publishedCount: number;
        };
        /** @enum {string} */
        readonly HelpArticleCategory: "LOGIN_AND_VERIFICATION" | "JOIN_AND_CORRECTION" | "CHECKIN_AND_HOURS" | "EVIDENCE_UPLOAD" | "COURSE_AND_GRADE" | "EXEMPTION" | "ORGANIZATION_CERTIFICATION" | "NOTIFICATION" | "MAINTENANCE" | "SERVICE_FEEDBACK";
        /** @description Published single-locale projection; draft/archive state, keywords, sort weight, and audit facts are not exposed. */
        readonly HelpArticlePublic: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly articleId: string;
            readonly bodyMarkdown: string;
            readonly category: components["schemas"]["HelpArticleCategory"];
            /** @enum {string} */
            readonly locale: "zh-CN" | "en";
            readonly title: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
        };
        readonly HelpArticlePublicPage: {
            readonly items: readonly components["schemas"]["HelpArticlePublic"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @enum {string} */
        readonly HelpArticleStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
        /** @description Read-only historical remark fact retained from an existing publication. Does not return the grade value or grant access to grade mutation, other teaching adjudication, members or media. New publications do not acquire a remark. */
        readonly HistoricalFinalGradeRemark: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly publicationId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly publishedAt: string;
            readonly remark: string | null;
        };
        readonly HistoricalFinalGradeRemarkPage: {
            readonly items: readonly components["schemas"]["HistoricalFinalGradeRemark"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Only a responsible teacher on the current actionable round. All required checks and established facts remain server preconditions; the body cannot assert they passed. */
        readonly InvalidateExerciseRecordRequest: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly action: "INVALID";
            /** @enum {integer} */
            readonly expectedRoundNo: 1 | 2;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly materialVersionId: string;
            readonly publicComment: string | null;
            /** @enum {string} */
            readonly reasonCode: "UNCLEAR_EVIDENCE" | "MISSING_REQUIRED_EVIDENCE" | "EVIDENCE_SESSION_MISMATCH" | "INCONSISTENT_EVIDENCE" | "CONFIRMED_REUSE_OR_MISUSE";
        };
        /** @description Safe pre-authentication preview containing only the course, teacher, and semester identity. */
        readonly InvitationCourseSummary: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            readonly name: string;
            readonly responsibleTeacher: components["schemas"]["TeacherSummary"];
            readonly semester: components["schemas"]["SemesterSummary"];
        };
        /** @description Same authenticated actor or server-bound anonymous flow subject, same original invitation/course/semester, server registeredAt<originalExpiresAt. Fixed grace end expiresAt+600 seconds. First acceptance strictly before end. Revoke/admission close/course close/semester invalidity terminate unfinished flows. No refresh extension or identity/unique-course exemption. */
        readonly InvitationRegistrationFlow: {
            readonly course: components["schemas"]["InvitationCourseSummary"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly flowId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly graceEndsAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly originalExpiresAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly registeredAt: string;
            /** @enum {string} */
            readonly status: "REGISTERED" | "COMPLETED" | "TERMINATED";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly LocalizedText: {
            readonly en: string;
            readonly zh: string;
        };
        readonly MaintenanceAnnouncement: {
            readonly bodyEn: string;
            readonly bodyZh: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly estimatedRecoveryAt: string;
            readonly titleEn: string;
            readonly titleZh: string;
        };
        readonly MakeupAuthorization: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly authorizationId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly authorizedAt: string;
            readonly authorizedBy: components["schemas"]["TeacherSummary"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly endsAtExclusive: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly ruleVersionId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly startsAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly MakeupAuthorizationPage: {
            readonly items: readonly components["schemas"]["MakeupAuthorization"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Responsible teacher names one active member and an explicit window within the original seven-day closeout; no automatic full-class extension. */
        readonly MakeupAuthorizationRequest: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly endsAtExclusive: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedCourseVersion: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly startsAt: string;
        };
        /** @description At most one open window per exact purpose/scope. Any applicable organization/course open window routes hard-check-passed undecided work to original responsible teacher. Closing one scope does not defeat another applicable open scope. No admin/cross-teacher decision and no second review of completed task. */
        readonly ManualModeWindow: {
            readonly closedAt: string | null;
            readonly closedBySubjectId: string | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly openedAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly openedBySubjectId: string;
            /** @enum {string} */
            readonly purpose: "VLM_REVIEW" | "ROSTER_OCR" | "ENDURANCE_OCR";
            readonly reason: string;
            readonly scope: components["schemas"]["TechnicalServiceScope"];
            readonly sourceRevision: string;
            /** @enum {string} */
            readonly state: "OPEN" | "CLOSED";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly windowId: string;
        } & (unknown & unknown);
        readonly ManualModeWindowPage: {
            readonly items: readonly components["schemas"]["ManualModeWindow"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        readonly MaterialCompletionReceipt: {
            readonly material: components["schemas"]["MaterialVersion"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly receiptId: string;
            readonly review: components["schemas"]["RecordReviewSummary"];
        } & {
            readonly material: {
                /** @constant */
                readonly readiness?: "READY";
            };
            readonly review: {
                /** @enum {string} */
                readonly processingStage?: "SYSTEM_CHECK_PENDING" | "AI_REVIEW_PENDING" | "TECHNICAL_PROCESSING" | "TEACHER_REVIEW_REQUIRED" | "SUPPLEMENT_REQUIRED" | "SUPPLEMENT_REVIEW_REQUIRED" | "VALID" | "INVALID";
            };
        };
        readonly MaterialManifest: readonly components["schemas"]["MaterialManifestItem"][];
        /** @description Immutable declared byte identity. Asset Owner probes actual bytes. Asset and position must each be unique within a version; a phase label is not proof of capture time. */
        readonly MaterialManifestItem: {
            /** @description Hex-encoded SHA-256 checksum. */
            readonly checksumSha256: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly mediaAssetId: string;
            /** @enum {string} */
            readonly phase: "GENERAL" | "BEFORE" | "AFTER";
            /** Format: int32 */
            readonly position: number;
        };
        /** @description One immutable manifest plus evolving readiness. READY requires every locked object verified. Full-precision authoritative transfer completion is independent of later HTTP finalization/probe time. Supplement version2 has no additional transfer grace. */
        readonly MaterialVersion: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly acceptedAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly batchId: string;
            readonly items: components["schemas"]["MaterialManifest"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly materialVersionId: string;
            readonly previousMaterialVersionId: string | null;
            /** @enum {string} */
            readonly readiness: "PENDING_TRANSFER" | "VERIFYING" | "READY" | "TECHNICAL_PROCESSING" | "TRANSFER_DEADLINE_MISSED" | "REJECTED";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly recordId: string;
            readonly returnActionId: string | null;
            readonly transferCompletedAt: string | null;
            readonly transferDueAt: string | null;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
            /** @enum {integer} */
            readonly versionNo: 1 | 2;
        } & (unknown & unknown & unknown);
        readonly MaterialVersionPage: {
            readonly items: readonly components["schemas"]["MaterialVersion"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Short-lived least-privilege upload authorization. Clients use uploadMethod, the exact requiredHeaders, and the byte body; internal object keys are never returned. */
        readonly MediaAllocation: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly expiresAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly mediaAssetId: string;
            readonly purpose: components["schemas"]["MediaPurpose"];
            readonly requiredHeaders: {
                readonly [key: string]: string;
            };
            /** @constant */
            readonly status: "ALLOCATED";
            readonly uploadMethod: components["schemas"]["DirectUploadHttpMethod"];
            /** Format: uri */
            readonly uploadUrl: string;
        };
        readonly MediaAllocationRequest: components["schemas"]["RecordImageMediaAllocationRequest"] | components["schemas"]["RecordVideoMediaAllocationRequest"] | components["schemas"]["ApplicationMediaAllocationRequest"];
        /** @description rejectionCode is non-null for REJECTED, equals MEDIA_ALLOCATION_EXPIRED for EXPIRED, and is null for ALLOCATED, UPLOADED, VERIFIED, and BOUND. */
        readonly MediaAsset: {
            readonly byteSize: number | null;
            readonly checksumSha256: string | null;
            readonly contentType: ("image/jpeg" | "image/png" | "image/webp" | "video/mp4") | null;
            readonly durationMilliseconds: number | null;
            readonly hasAudio: boolean | null;
            readonly heightPixels: number | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly mediaAssetId: string;
            /** @enum {string} */
            readonly mediaKind: "IMAGE" | "VIDEO";
            readonly purpose: components["schemas"]["MediaPurpose"];
            readonly rejectionCode: components["schemas"]["MediaFinalizationRejectionCode"] | null;
            /** @enum {string} */
            readonly status: "ALLOCATED" | "UPLOADED" | "VERIFIED" | "BOUND" | "REJECTED" | "EXPIRED";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
            readonly widthPixels: number | null;
        } & (unknown & unknown & unknown);
        /** @description Short-lived authorized read URL; it must not be persisted as a business fact. */
        readonly MediaDownloadAuthorization: {
            readonly contentType: string;
            /** Format: uri */
            readonly downloadUrl: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly expiresAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly mediaAssetId: string;
        };
        /**
         * @description Stable expected finalization outcome. These values are returned only inside a 200 terminal MediaAsset; transport, authorization, dependency, and internal failures remain ErrorEnvelope responses.
         * @enum {string}
         */
        readonly MediaFinalizationRejectionCode: "MEDIA_ALLOCATION_EXPIRED" | "MEDIA_CONTENT_INVALID" | "MEDIA_LIMIT_EXCEEDED" | "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE";
        /** @description The unique 200 result channel for expected media finalization outcomes. */
        readonly MediaFinalizationResult: components["schemas"]["MediaAsset"] & {
            /** @enum {string} */
            readonly status: "VERIFIED" | "REJECTED" | "EXPIRED";
        };
        /** @enum {string} */
        readonly MediaPurpose: "RECORD_EVIDENCE" | "APPLICATION_EVIDENCE";
        /** @description One-flow sensitive proof bound to the server-registered anonymous flow, not proof of email/account identity. Persist only non-reversible/secure replay material, never raw proof in logs or URLs. Does not create login rights; exact replay only with original nonce subject, expires with original flow and cannot refresh grace. */
        readonly NewInvitationFlowAuthorization: {
            readonly flow: components["schemas"]["InvitationRegistrationFlow"];
            /** Format: password */
            readonly flowAuthorization: string;
        };
        /** @description Authenticate original bound flow proof, then verify and consume STUDENT_EMAIL_BINDING OTP only for the first successful final registration. verifiedEmail must match the Identity Owner proof subject. Atomically create account/profile/enrollment and bind the verified account to the original anonymous flow; email proof may complete during grace if still valid. Flow possession alone is not verified identity. Stable full request and authorized original subject exact replay returns original success without re-consuming OTP or refreshing grace; no partial account enrollment. */
        readonly NewStudentRegistrationRequest: {
            readonly administrativeClass: string | null;
            readonly college: string | null;
            readonly emailOtpProof: components["schemas"]["OtpProof"];
            /** Format: password */
            readonly flowAuthorization: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly flowId: string;
            /** @enum {string} */
            readonly gender: "FEMALE" | "MALE";
            /** Format: int32 */
            readonly gradeYear: number;
            readonly major: string | null;
            readonly name: string;
            readonly studentNumber: string;
            /**
             * Format: email
             * @description Normalized school email address.
             */
            readonly verifiedEmail: string;
        };
        /** @description No delivered/pushed/failed state or external-channel status exists. Target navigation never bypasses target authorization. */
        readonly Notification: {
            readonly body: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly createdAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly notificationId: string;
            readonly notificationType: string;
            readonly readAt: string | null;
            readonly reviewContext: components["schemas"]["ReviewNotificationContext"] | null;
            readonly targetId: string | null;
            readonly targetRoute: ("COURSE" | "EXERCISE_RECORD" | "APPLICATION" | "ENDURANCE" | "FINAL_GRADE" | "FEEDBACK" | "SYSTEM_MODE") | null;
            readonly title: string;
        };
        readonly NotificationPage: {
            readonly items: readonly components["schemas"]["Notification"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        readonly OpenManualModeRequest: {
            readonly expectedSourceRevision: string;
            /** @enum {string} */
            readonly purpose: "VLM_REVIEW" | "ROSTER_OCR" | "ENDURANCE_OCR";
            readonly reason: string;
            readonly scope: components["schemas"]["TechnicalServiceScope"];
        };
        readonly OtpProof: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly challengeId: string;
            readonly code: string;
        };
        /** @description Only a responsible teacher on the current actionable round. All required checks and established facts remain server preconditions; the body cannot assert they passed. */
        readonly PassExerciseRecordRequest: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly action: "PASS";
            /** @enum {integer} */
            readonly expectedRoundNo: 1 | 2;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly materialVersionId: string;
            readonly publicComment: string | null;
        };
        readonly PasswordChangeRequest: {
            readonly currentPassword: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly newPassword: string;
        };
        readonly PasswordResetRequest: {
            readonly newPassword: string;
            readonly otpProof: components["schemas"]["OtpProof"];
        };
        readonly PasswordSessionRequest: {
            readonly identifier: string;
            /** @enum {string} */
            readonly loginType: "TEACHER_EMAIL" | "ADMIN_EMAIL" | "ADMIN_LOGIN_NAME";
            readonly password: string;
        };
        readonly PersonSummary: {
            readonly displayName: string;
            /** @enum {string} */
            readonly role: "STUDENT" | "TEACHER" | "ADMIN";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly userId: string;
        };
        readonly ProcessFeedbackRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly publicReply: string;
            /** @enum {string} */
            readonly targetStatus: "IN_PROGRESS" | "WAITING_TECH" | "COMPLETED" | "CLOSED";
        };
        /** @description Certification first: b=min(target,C), then selected records by start instant/ID consume the remainder. No cross-category transfer or certification day/week slot. completed=b+sum(a); remaining=target-completed. */
        readonly ProgressCategory: {
            /** Format: int64 */
            readonly activeCertificationMinutes: number;
            /** Format: int64 */
            readonly cappedCompletedMinutes: number;
            readonly category: components["schemas"]["ExerciseCategory"];
            /** Format: int64 */
            readonly countedCertificationMinutes: number;
            /** Format: int64 */
            readonly countedRecordMinutes: number;
            /** Format: int64 */
            readonly remainingMinutes: number;
            /** Format: int64 */
            readonly targetMinutes: number;
        };
        /** @description Opaque source-set tokens plus predecessor, not timestamps or client ordering keys. Null predecessor only for proven first computation; cache loss cannot manufacture null. */
        readonly ProgressSourceVersions: {
            readonly certificationSetVersion: string;
            readonly membershipScopeVersion: string;
            readonly previousCheckpointId: string | null;
            readonly recordFactSetVersion: string;
            readonly reviewCandidateSetVersion: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly ruleVersionId: string;
        };
        /** @description Exactly one row per category. Only raw total==1200 means targetMet; display 100 can mean1199. Actual seconds include all real records, invalidActualMinutes=sum invalid floor(s/60), validUncounted=sum valid(q-a), validFormulaExcluded=sum valid(m-q). Pending/technical/review records are neither invalid nor valid. Certification is not exercise time. */
        readonly ProgressTotals: {
            readonly actualDurationSeconds: number;
            readonly categories: readonly components["schemas"]["ProgressCategory"][] & (unknown & unknown);
            readonly completionRatio: number;
            /** Format: int64 */
            readonly countedCertificationMinutes: number;
            /** Format: int64 */
            readonly countedRecordMinutes: number;
            /** Format: int64 */
            readonly displayPercent: number;
            /** Format: int64 */
            readonly invalidActualMinutes: number;
            /** Format: int64 */
            readonly pendingRecordCount: number;
            readonly targetMet: boolean;
            /** Format: int64 */
            readonly totalCompletedMinutes: number;
            /** @constant */
            readonly totalTargetMinutes: 1200;
            /** Format: int64 */
            readonly validFormulaExcludedMinutes: number;
            /** Format: int64 */
            readonly validUncountedEligibleMinutes: number;
        } & (unknown & unknown);
        /** @description Fixed bilingual classification; publicComment is separate original teacher text, never a hidden note. */
        readonly PublicReviewReason: {
            /** @enum {string} */
            readonly code: "UNCLEAR_EVIDENCE" | "MISSING_REQUIRED_EVIDENCE" | "EVIDENCE_SESSION_MISMATCH" | "INCONSISTENT_EVIDENCE" | "AUTHENTICITY_REQUIRES_CLARIFICATION" | "CONFIRMED_REUSE_OR_MISUSE" | "SUPPLEMENT_DEADLINE_MISSED";
            readonly label: components["schemas"]["LocalizedText"];
        } & (unknown & unknown & unknown & unknown & unknown & unknown & unknown);
        readonly PublishCourseRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedCourseVersion: number;
            readonly publicationToken: string;
        };
        /** @description Append signed int32 grade only; remark is forbidden even null/empty or renamed extra fields. Never copy a historical remark into a new publication. No student notification or projection. */
        readonly PublishFinalGradeRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            /**
             * Format: int32
             * @description No minimum or maximum beyond signed int32.
             */
            readonly gradeValue: number;
        };
        /** @description Server loads all source rows, confirms terminal decisions and stable identity uniqueness, then atomically appends snapshot/entries/findings/completion, current pointer, receipt and audit/outbox. No caller allResolved or digest. All pages/source fragments must be complete; same-count different identities fail. */
        readonly PublishRosterBatchRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedBatchVersion: number;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedCourseVersion: number;
            readonly expectedCurrentSnapshotId: string | null;
            readonly expectedRowsSourceVersion: string;
        };
        /** @description m=floor(sum ACTIVE seconds/60) once; q=0 if m<H else min(m,60); a only from joint selected VALID set, 0<=a<=q. Original Shanghai start date/week and immutable rule never move at completion/supplement. Non-valid records have a=0. Missing sources are unavailable, not zero. Explanation cannot hide inconsistent output. */
        readonly RecordCreditDetail: {
            readonly actualDurationSeconds: number;
            /** Format: int64 */
            readonly actualWholeMinutes: number;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly businessDate: string;
            readonly category: components["schemas"]["ExerciseCategory"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly checkpointId: string;
            /** Format: int64 */
            readonly countedMinutes: number;
            /** Format: int64 */
            readonly eligibleMinutes: number;
            readonly explanations: readonly components["schemas"]["RecordCreditExplanation"][];
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly originalWeekStartsOn: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly recordId: string;
            readonly reviewResult: components["schemas"]["ReviewResult"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly ruleVersionId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sessionId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly startedAt: string;
        } & (unknown & unknown);
        /** @description Cursor pinned to this immutable checkpoint. Every page and record belongs to its course/enrollment/rule; include pending and invalid facts as well as candidates. */
        readonly RecordCreditDetailPage: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly checkpointId: string;
            readonly items: readonly components["schemas"]["RecordCreditDetail"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Formula loss m-q is separate from eligible uncounted q-a. Explain only true current facts. Partial positive a<q is a category remainder, not day/week rejection. No review invalidity implied. */
        readonly RecordCreditExplanation: {
            /** @enum {string} */
            readonly code: "BELOW_THRESHOLD" | "SINGLE_RECORD_CAP" | "CATEGORY_REMAINING_LIMIT" | "SAME_DAY_OTHER_RECORD" | "ORIGINAL_WEEK_LIMIT" | "JOINT_OPTIMAL_SELECTION";
            readonly message: components["schemas"]["LocalizedText"];
            readonly relatedRecordIds: readonly string[];
        };
        readonly RecordImageMediaAllocationRequest: {
            /** Format: int64 */
            readonly declaredByteSize: number;
            /** @enum {string} */
            readonly declaredContentType: "image/jpeg" | "image/png";
            /** @constant */
            readonly mediaKind: "IMAGE";
            /** @constant */
            readonly purpose: "RECORD_EVIDENCE";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sessionId: string;
        };
        /** @description Append-only decisions, teacher return actions and corrections. A return has null result, never a fabricated INVALID decision. No hidden note or AI provider payload is exposed. */
        readonly RecordReview: {
            readonly correctedReviewId: string | null;
            readonly expiryCorrection: components["schemas"]["ExpiryCorrectionFact"] | null;
            readonly fromResult: components["schemas"]["ReviewResult"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly materialVersionId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly occurredAt: string;
            readonly publicComment: string | null;
            readonly publicReason: components["schemas"]["PublicReviewReason"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly recordId: string;
            readonly result: components["schemas"]["ReviewResult"] | null;
            readonly reviewer: components["schemas"]["TeacherSummary"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly reviewId: string;
            /** @enum {integer} */
            readonly roundNo: 1 | 2;
            /** Format: int64 */
            readonly sequenceNumber: number;
            /** @enum {string} */
            readonly source: "SYSTEM_AI" | "TEACHER" | "TEACHER_RETURN" | "SYSTEM_EXPIRY" | "AUTHORIZED_CORRECTION" | "PLATFORM_FAULT_CORRECTION";
        } & (unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown);
        readonly RecordReviewPage: {
            readonly items: readonly components["schemas"]["RecordReview"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Result is null in every nonterminal stage, including a teacher return. Technical failure is not a completed check. There is no actionable review Case before complete material is ready. */
        readonly RecordReviewSummary: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly materialVersionId: string;
            readonly processingStage: components["schemas"]["ReviewProcessingStage"];
            readonly publicComment: string | null;
            readonly publicReason: components["schemas"]["PublicReviewReason"] | null;
            readonly result: components["schemas"]["ReviewResult"] | null;
            readonly reviewCaseId: string | null;
            readonly roundNo: (1 | 2) | null;
            /** Format: int64 */
            readonly sequenceNumber: number;
            readonly supplementReturnUsed: boolean;
            readonly supplementTimer: components["schemas"]["SupplementTimerView"] | null;
            readonly teacherSla: components["schemas"]["TeacherReviewSla"] | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        } & (unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown);
        /** @description Only the original immutable object, exact headers/PUT/checksum and remaining original transfer window. Expiring a signed URL does not expire an otherwise valid business receipt, and renewal never creates a new 30-minute window. */
        readonly RecordUploadAuthorization: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly batchId: string;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly checksumSha256: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly expiresAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly materialVersionId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly mediaAssetId: string;
            readonly requiredHeaders: {
                readonly [key: string]: string;
            };
            readonly uploadMethod: components["schemas"]["DirectUploadHttpMethod"];
            /** Format: uri */
            readonly uploadUrl: string;
        };
        readonly RecordUploadAuthorizationRequest: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly batchId: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedMaterialVersion: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly materialVersionId: string;
        };
        readonly RecordVideoMediaAllocationRequest: {
            /** Format: int64 */
            readonly declaredByteSize: number;
            /** @constant */
            readonly declaredContentType: "video/mp4";
            /** @constant */
            readonly mediaKind: "VIDEO";
            /** @constant */
            readonly purpose: "RECORD_EVIDENCE";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sessionId: string;
        };
        readonly RefreshSessionRequest: {
            /** Format: password */
            readonly refreshToken: string;
        };
        readonly RegisterExistingInvitationFlowRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedAccountVersion: number;
        };
        /** @description Explicit registration-start command, not preview. Client creates a cryptographically random 256-bit nonce once for this flow and reuses it for exact retries; server binds its digest as the anonymous command subject to the original invitation. No email verification or personal data is required to register before expiry; final joining still requires Identity Owner verification. No account/enrollment is created, and local draft/challenge request alone is not registration. Never log the nonce or persist it as plaintext server data. */
        readonly RegisterNewInvitationFlowRequest: {
            /** Format: password */
            readonly clientFlowNonce: string;
        };
        readonly RejectApplicationDecisionRequest: {
            /** @constant */
            readonly decision: "REJECT";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly studentVisibleMessage: string;
        };
        readonly RequestSupplementDecisionRequest: {
            /** @constant */
            readonly decision: "REQUEST_SUPPLEMENT";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly studentVisibleMessage: string;
        };
        /** @description Teacher supplies an unambiguous interpretation against original source. MM_SS must match integer seconds exactly; INTEGER_SECONDS text is the exact base10 second count. Original4.30 remains untouched. Server checks identity, event/gender/grade/date and exactly one rule before READY; current values/versions rechecked at selected-row commit. */
        readonly ResolvedEnduranceValues: {
            /** @enum {integer} */
            readonly distanceMeters: 800 | 1000;
            /** Format: int32 */
            readonly durationSeconds: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedEnrollmentVersion: number;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedOutcomeVersion: number;
            readonly explicitTimeText: string;
            /** Format: int64 */
            readonly ruleRevisionNumber: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly ruleTableId: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly testedOn: string;
            /** @enum {string} */
            readonly timeRepresentation: "INTEGER_SECONDS" | "MM_SS";
        } & (unknown & unknown);
        /** @description Append teacher interpretation or reasoned exclusion. Does not overwrite extraction text, accept raw OCR confidence as identity, or silently clear unresolved hard issues. */
        readonly ResolveEnduranceDraftRowRequest: {
            /** @enum {string} */
            readonly action: "RESOLVE" | "EXCLUDE";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedBatchVersion: number;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedRowVersion: number;
            readonly reason: string;
            readonly resolvedValues: components["schemas"]["ResolvedEnduranceValues"] | null;
        } & (unknown & unknown);
        readonly ResolveRosterDraftRowRequest: {
            /** @enum {string} */
            readonly action: "CONFIRM" | "EXCLUDE";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedBatchVersion: number;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedRowVersion: number;
            readonly identity: components["schemas"]["RosterIdentityConfirmation"] | null;
            readonly reason: string | null;
        } & (unknown & unknown);
        /** @description Only a responsible teacher on the current actionable round. All required checks and established facts remain server preconditions; the body cannot assert they passed. */
        readonly ReturnExerciseRecordRequest: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly action: "RETURN_SUPPLEMENT";
            /** @constant */
            readonly expectedRoundNo: 1;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly materialVersionId: string;
            readonly publicComment: string | null;
            /** @enum {string} */
            readonly reasonCode: "UNCLEAR_EVIDENCE" | "MISSING_REQUIRED_EVIDENCE" | "EVIDENCE_SESSION_MISMATCH" | "INCONSISTENT_EVIDENCE" | "AUTHENTICITY_REQUIRES_CLARIFICATION";
            /**
             * @default 24
             * @enum {integer}
             */
            readonly windowHours: 24 | 72;
        };
        readonly ReturnNormalRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly reason: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly targetMode: "NORMAL";
        };
        /** @description For TEACHER_RETURN, event.reviewId is the timer/material returnActionId. The snapshot is the original committed result, not a later current-state reread. */
        readonly ReviewActionReceipt: {
            readonly event: components["schemas"]["RecordReview"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly receiptId: string;
            readonly review: components["schemas"]["RecordReviewSummary"];
        };
        /** @description Recipient-authorized immutable event projection using the same source as review detail. Read state never starts/stops timers. Current state is reloaded from the Record. */
        readonly ReviewNotificationContext: {
            readonly processingStage: components["schemas"]["ReviewProcessingStage"];
            readonly publicComment: string | null;
            readonly publicReason: components["schemas"]["PublicReviewReason"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly recordId: string;
            /** Format: int64 */
            readonly reviewSequenceNumber: number;
        };
        /** @enum {string} */
        readonly ReviewProcessingStage: "MATERIAL_PROCESSING" | "SYSTEM_CHECK_PENDING" | "AI_REVIEW_PENDING" | "TECHNICAL_PROCESSING" | "TEACHER_REVIEW_REQUIRED" | "SUPPLEMENT_REQUIRED" | "SUPPLEMENT_REVIEW_REQUIRED" | "VALID" | "INVALID";
        /** @enum {string} */
        readonly ReviewResult: "VALID" | "INVALID";
        /** @description Backend applies one declared change to the complete current table, validates the entire candidate revision, and atomically switches only if valid. */
        readonly ReviseEnduranceRuleTableRequest: {
            readonly change: components["schemas"]["AddEnduranceRuleIntervalChange"] | components["schemas"]["UpdateEnduranceRuleIntervalChange"] | components["schemas"]["DeleteEnduranceRuleIntervalChange"];
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
        };
        readonly RevokeCertificationCreditRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly studentVisibleReason: string;
        };
        /** @description Exact original success receipt; retry does not rerun extraction, substitute latest snapshot or move a newer pointer backward. */
        readonly RosterBatchPublication: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly batchId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly publishedAt: string;
            readonly rowsSourceVersion: string;
            readonly snapshot: components["schemas"]["RosterSnapshot"];
        };
        /** @description Original extracted text is immutable. Confidence is an extraction hint, never a true accuracy measure or formal identity. Teacher decisions append; repeated/conflicting identities remain explicit. */
        readonly RosterDraftRow: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly batchId: string;
            readonly candidateName: string | null;
            readonly candidateStudentNumber: string | null;
            readonly confidenceHint: number | null;
            readonly confirmedIdentity: components["schemas"]["RosterIdentityConfirmation"] | null;
            readonly decisionId: string | null;
            readonly decisionReason: string | null;
            readonly identityCandidates: readonly components["schemas"]["DraftIdentityCandidate"][];
            readonly issues: readonly components["schemas"]["TeachingDraftIssue"][];
            readonly originalText: string;
            readonly position: components["schemas"]["TeachingSourcePosition"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly rowId: string;
            /** @enum {string} */
            readonly state: "REVIEW_REQUIRED" | "CONFIRMED" | "EXCLUDED";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        } & (unknown & unknown);
        readonly RosterDraftRowPage: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly batchId: string;
            readonly items: readonly components["schemas"]["RosterDraftRow"][];
            readonly page: components["schemas"]["CursorPage"];
            readonly rowsSourceVersion: string;
        };
        readonly RosterFinding: {
            readonly enrollment: components["schemas"]["Enrollment"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly findingId: string;
            /** Format: int64 */
            readonly findingNumber: number;
            /** @enum {string} */
            readonly findingType: "MATCHED" | "ROSTER_ONLY" | "MEMBER_ONLY" | "IDENTITY_CONFLICT" | "DUPLICATE_OR_AMBIGUOUS";
            readonly resolutionNote: string | null;
            readonly resolvedAt: string | null;
            readonly rosterName: string | null;
            readonly rosterStudentNumber: string | null;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly RosterFindingPage: {
            readonly items: readonly components["schemas"]["RosterFinding"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Records a one-time resolution note. It never auto-merges identities or changes enrollment by implication. */
        readonly RosterFindingResolutionRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly resolutionNote: string;
        };
        /** @description Explicit source-grounded identity; candidate is null only for a confirmed official identity without an existing account match. Server verifies source identity and absence of unresolved ambiguity, not just a caller boolean. */
        readonly RosterIdentityConfirmation: {
            readonly candidateId: string | null;
            readonly identitySourceVersion: string;
            readonly name: string;
            readonly studentNumber: string;
        };
        readonly RosterImportAllocationRequest: {
            /** Format: int64 */
            readonly byteSize: number;
            /** @enum {string} */
            readonly contentType: "text/csv" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            readonly fileName: string;
        };
        /** @description State derived by owning module from full source rows, immutable teacher decisions and committed formal results. PARSING/technical failure never equals formal import. COMPLETED requires all rows terminal and formal publication/measurements; partial confirmation preserves outstanding rows. Historical completion receipt is not undone by later roster pointer changes. */
        readonly RosterImportBatch: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly acceptedAt: string;
            readonly attempt: components["schemas"]["ExtractionAttemptSummary"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly batchId: string;
            readonly counts: components["schemas"]["TeachingBatchCounts"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly inputSha256: string;
            /** @constant */
            readonly kind: "ROSTER";
            readonly publishedRosterSnapshotId: string | null;
            readonly rowsSourceVersion: string | null;
            /** @enum {string} */
            readonly sourceFormat: "XLSX" | "CSV" | "PAPER_SCAN";
            readonly sources: readonly components["schemas"]["TeachingSourceAsset"][];
            /** @enum {string} */
            readonly state: "PARSING" | "REVIEW_REQUIRED" | "PARTIALLY_CONFIRMED" | "COMPLETED" | "FAILED_TECHNICAL";
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        } & (unknown & unknown & unknown & unknown);
        readonly RosterImportBatchPage: {
            readonly items: readonly components["schemas"]["RosterImportBatch"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        readonly RosterImportRequest: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly allocationId: string;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly clientChecksumSha256: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedCourseVersion: number;
        };
        readonly RosterRevertRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedCourseVersion: number;
            readonly reason: string;
        };
        /** @description Immutable official source identity snapshot. entryCount counts confirmed unique identities, sourceRowCount preserves errors/duplicates/excluded rows. Empty confirmed set is not proof of registered completion. Legacy snapshot batch linkage is null only when the original fact lacks it, never invented by migration. */
        readonly RosterSnapshot: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /** Format: int32 */
            readonly entryCount: number;
            readonly findingCounts: {
                /** Format: int32 */
                readonly duplicateOrAmbiguous: number;
                /** Format: int32 */
                readonly identityConflict: number;
                /** Format: int32 */
                readonly matched: number;
                /** Format: int32 */
                readonly memberOnly: number;
                /** Format: int32 */
                readonly rosterOnly: number;
                /** Format: int32 */
                readonly unresolved: number;
            };
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly importedAt: string;
            readonly isCurrent: boolean;
            readonly rowsSourceVersion: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly snapshotId: string;
            /** Format: int64 */
            readonly snapshotNumber: number;
            readonly sourceBatchId: string | null;
            /** Format: int64 */
            readonly sourceByteSize: number;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly sourceChecksumSha256: string;
            readonly sourceDisplayName: string;
            /** @enum {string} */
            readonly sourceFormat: "XLSX" | "CSV" | "PAPER_SCAN";
            readonly sourceRowCount: number | null;
        } & unknown;
        readonly RosterSnapshotPage: {
            readonly items: readonly components["schemas"]["RosterSnapshot"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Super-admin publishes only the fixed allowed rule family. No caller formula, free thresholds, extension or old-course retargeting. */
        readonly RuleTemplatePublishRequest: {
            readonly expectedLatestVersionId: string | null;
            readonly label: components["schemas"]["LocalizedText"];
        };
        /** @description Immutable fixed rule template. Version UUID is opaque, not ordered lexically. */
        readonly RuleTemplateVersion: {
            /** @constant */
            readonly dailyCountLimit: 1;
            /** @constant */
            readonly defaultThresholdMinutes: 30;
            /** @constant */
            readonly defaultWeeklyCountLimit: 3;
            /** @constant */
            readonly formulaVersion: "P4Z-A-08-v1";
            readonly label: components["schemas"]["LocalizedText"];
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly publishedAt: string;
            /** @constant */
            readonly singleRecordCapMinutes: 60;
            /** @constant */
            readonly status: "PUBLISHED";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly templateVersionId: string;
            /** @constant */
            readonly thresholdChoices: [
                30,
                45,
                60
            ];
            /** @constant */
            readonly totalTargetMinutes: 1200;
            /** Format: int64 */
            readonly versionNo: number;
            /** @constant */
            readonly weeklyCountChoices: [
                2,
                3,
                4
            ];
        };
        readonly RuleTemplateVersionPage: {
            readonly items: readonly components["schemas"]["RuleTemplateVersion"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Owner-confirmed calendar identity pinned to the round. This reference is not the official calendar dataset. */
        readonly SchoolCalendarReference: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly calendarId: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly coverageEndExclusive: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly coverageStart: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly revision: number;
            /** @constant */
            readonly timezone: "Asia/Shanghai";
        };
        readonly Semester: {
            readonly academicYear: string;
            /** Format: int32 */
            readonly courseCount: number;
            readonly displayName: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly endDate: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly semesterId: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly startDate: string;
            readonly status: components["schemas"]["SemesterStatus"];
            /** Format: int32 */
            readonly studentCount: number;
            readonly termType: components["schemas"]["TermType"];
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly SemesterCreateRequest: {
            readonly academicYear: string;
            readonly displayName: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly endDate: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly startDate: string;
            readonly termType: components["schemas"]["TermType"];
        };
        /** @description Organization-wide semester summary from the same committed read snapshot as the returned items. Counts and currentSemester ignore status, cursor, and limit filters. */
        readonly SemesterManagementSummary: {
            /** Format: int32 */
            readonly archivedCount: number;
            readonly currentSemester: components["schemas"]["SemesterSummary"] | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly generatedAt: string;
            /** Format: int32 */
            readonly upcomingCount: number;
        };
        readonly SemesterPage: {
            readonly items: readonly components["schemas"]["Semester"][];
            readonly page: components["schemas"]["CursorPage"];
            readonly summary: components["schemas"]["SemesterManagementSummary"];
        };
        /** @enum {string} */
        readonly SemesterStatus: "UPCOMING" | "CURRENT" | "ARCHIVED";
        /** @description Minimum cross-role semester projection without administrator counts or concurrency metadata. */
        readonly SemesterSummary: {
            readonly academicYear: string;
            readonly displayName: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly endDate: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly semesterId: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly startDate: string;
            readonly status: components["schemas"]["SemesterStatus"];
            readonly termType: components["schemas"]["TermType"];
        };
        /** @description The current-semester version is null only when no current semester exists. */
        readonly SemesterSwitchRequest: {
            readonly expectedCurrentSemesterVersion: number | null;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedTargetVersion: number;
        };
        readonly SemesterSwitchResult: {
            readonly archivedSemester: components["schemas"]["Semester"] | null;
            readonly currentSemester: components["schemas"]["Semester"];
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly switchedAt: string;
        };
        readonly SemesterUpdateRequest: {
            readonly academicYear: string;
            readonly displayName: string;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly endDate: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            /**
             * Format: date
             * @description Calendar date; never reinterpret as UTC midnight.
             */
            readonly startDate: string;
            readonly termType: components["schemas"]["TermType"];
        };
        /** @description Short-lived bearer access token plus a rotating opaque refresh token. Clients use platform secure storage. */
        readonly SessionTokenPair: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly accessExpiresAt: string;
            /** Format: password */
            readonly accessToken: string;
            readonly actor: components["schemas"]["CurrentActor"];
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly refreshExpiresAt: string;
            /** Format: password */
            readonly refreshToken: string;
        };
        readonly SetSubAdminStateRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            /** @enum {string} */
            readonly targetState: "ACTIVE" | "DISABLED";
        };
        /** @description Responsible-teacher actionable reference supplied by the owning capability. Review/timer values consumed, never reinterpreted by settlement. Valid unfinished first-material chains block even before an acceptance receipt exists. */
        readonly SettlementBlocker: {
            /** @enum {string} */
            readonly code: "UNFINISHED_SESSION" | "FIRST_MATERIAL_PENDING" | "LOCKED_TRANSFER_PENDING" | "TECHNICAL_PROCESSING" | "REVIEW_PENDING" | "SUPPLEMENT_WINDOW_ACTIVE" | "ROSTER_PENDING" | "ENDURANCE_PENDING" | "APPLICATION_PENDING" | "STATISTICS_PENDING" | "OTHER_TEACHING_PENDING";
            readonly objectId: string;
            /** @enum {string} */
            readonly owner: "MEMBERSHIP" | "ROSTER" | "SESSIONS" | "MATERIALS" | "REVIEWS_AND_TIMERS" | "TECHNICAL_PROCESSING" | "EXEMPTIONS" | "CERTIFICATIONS" | "ENDURANCE" | "STATISTICS" | "OTHER_TEACHING";
            readonly reason: components["schemas"]["LocalizedText"];
        };
        /** @description Full server manifest pins independently supplied complete member set, all sources, every immutable statistics checkpoint and content, and report predecessor. Public summary is not itself a trust proof. READY requires no new-start eligibility left (original closeout ended or course explicitly closed), no pending chains, all sources complete/current and exact member coverage. Being below1200 is not a blocker. Ready tokens are invalidated by any relevant drift. */
        readonly SettlementPreparation: {
            readonly blockers: readonly components["schemas"]["SettlementBlocker"][];
            readonly correctionFactId: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedCourseVersion: number;
            readonly membershipScopeVersion: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly preparationId: string;
            readonly preparationToken: string | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly preparedAt: string;
            readonly previousSettlementVersionId: string | null;
            readonly reason: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly semesterId: string;
            readonly sources: readonly components["schemas"]["SettlementSourceReference"][];
            /** @enum {string} */
            readonly state: "READY" | "BLOCKED" | "UNAVAILABLE";
            readonly unavailableOwners: readonly ("MEMBERSHIP" | "ROSTER" | "SESSIONS" | "MATERIALS" | "REVIEWS_AND_TIMERS" | "TECHNICAL_PROCESSING" | "EXEMPTIONS" | "CERTIFICATIONS" | "ENDURANCE" | "STATISTICS" | "OTHER_TEACHING")[];
        } & (unknown & unknown & unknown);
        /** @description Normal first settlement uses null correction and predecessor; correction references an authorized existing Owner fact and preceding report with reason. Server derives historical membership and all values; clients do not submit statistics, row arrays, blocker booleans or source tokens. */
        readonly SettlementPreparationRequest: {
            readonly correctionFactId: string | null;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedCourseVersion: number;
            readonly expectedPreviousSettlementVersionId: string | null;
            readonly reason: string | null;
        } & (unknown & unknown);
        /** @description Exactly one immutable row per authoritative historical enrollment. Original checkpoint content, not a lookup of today's cache. No final grade, score, rank or substitute remark; controlled correction reason is on the report event. */
        readonly SettlementReportRow: {
            readonly checkpoint: components["schemas"]["StatisticsCheckpoint"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly settlementVersionId: string;
            readonly student: components["schemas"]["StudentSummary"];
            readonly unmetTargetReasons: readonly components["schemas"]["LocalizedText"][];
        };
        /** @description Cursor is pinned to report version/content; all pages cover its exact full member set without duplication. Historical removed members remain in original scope. */
        readonly SettlementReportRowPage: {
            readonly items: readonly components["schemas"]["SettlementReportRow"][];
            readonly membershipScopeVersion: string;
            readonly page: components["schemas"]["CursorPage"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly settlementVersionId: string;
        };
        /** @description Immutable confirmed version. Head, complete rows/content identities, full manifest, command result, pointer and audit/notification facts commit together under source/predecessor protection. No PDF/file generation is implied; failed artifact export cannot rename an old file as new or reverse an already committed business transaction. */
        readonly SettlementReportVersion: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly confirmedAt: string;
            readonly confirmedBy: components["schemas"]["TeacherSummary"];
            readonly correctionFactId: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /** @enum {string} */
            readonly kind: "INITIAL" | "CORRECTION";
            /** Format: int64 */
            readonly memberCount: number;
            readonly membershipScopeVersion: string;
            /** @constant */
            readonly policyVersion: "P4Z-A-08-v1";
            readonly previousSettlementVersionId: string | null;
            readonly reason: string | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly semesterId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly settlementVersionId: string;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly sourceManifestSha256: string;
            readonly sources: readonly components["schemas"]["SettlementSourceReference"][] & (unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown & unknown);
            /** Format: int64 */
            readonly versionNo: number;
        } & (unknown & unknown);
        readonly SettlementReportVersionPage: {
            readonly items: readonly components["schemas"]["SettlementReportVersion"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Opaque complete authoritative public Owner source. Required source set is complete; failures cannot be represented by omitted owners or fabricated empty tokens. */
        readonly SettlementSourceReference: {
            /** @constant */
            readonly complete: true;
            /** @enum {string} */
            readonly owner: "MEMBERSHIP" | "ROSTER" | "SESSIONS" | "MATERIALS" | "REVIEWS_AND_TIMERS" | "TECHNICAL_PROCESSING" | "EXEMPTIONS" | "CERTIFICATIONS" | "ENDURANCE" | "STATISTICS" | "OTHER_TEACHING";
            readonly scopeId: string;
            readonly sourceVersion: string;
        };
        /** @description Original course rule binding; make-up reference null for a normal start. Neither actual seconds, date, progress, nor counted minutes are caller-writable. */
        readonly StartExerciseSessionRequest: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly expectedRuleVersionId: string;
            readonly makeupAuthorizationId: string | null;
        };
        /** @description Immutable complete result from one consistent source set and predecessor. Totals, positive-count detail, pointer and command receipt commit atomically with Owner set/row protection held until commit. Replaying old success returns original checkpoint, never moves current pointer. Stale workers must recompute, not relabel tokens. */
        readonly StatisticsCheckpoint: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly checkpointId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly computedAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            /** @constant */
            readonly policyVersion: "P4Z-A-08-v1";
            readonly selectedRecordIds: readonly string[];
            readonly sources: components["schemas"]["ProgressSourceVersions"];
            readonly totals: components["schemas"]["ProgressTotals"];
        };
        /** @description Read-only student account projection. Only ACTIVE and PENDING student status values exist. */
        readonly StudentAccount: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly organizationId: string;
            readonly student: components["schemas"]["StudentSummary"];
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: email
             * @description Normalized school email address.
             */
            readonly verifiedEmail: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly StudentAccountPage: {
            readonly items: readonly components["schemas"]["StudentAccount"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        readonly StudentApplication: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly applicationId: string;
            readonly applicationNumber: string;
            readonly applicationType: components["schemas"]["ApplicationType"];
            readonly certification: components["schemas"]["CertificationDetails"] | null;
            readonly certificationCredit: components["schemas"]["CertificationCredit"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            readonly decisions: readonly components["schemas"]["ApplicationDecision"][];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            readonly evidence: readonly components["schemas"]["MediaAsset"][];
            readonly status: components["schemas"]["ApplicationStatus"];
            readonly student: components["schemas"]["StudentSummary"];
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly submittedAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly StudentApplicationPage: {
            readonly items: readonly components["schemas"]["StudentApplication"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Student course projection without member counts, administrator display state, or mutation metadata. */
        readonly StudentCourse: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly checkinClosesAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly checkinOpensAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            readonly description: string | null;
            readonly name: string;
            readonly publishedRule: components["schemas"]["CourseRuleVersion"];
            readonly responsibleTeacher: components["schemas"]["TeacherSummary"];
            readonly semester: components["schemas"]["SemesterSummary"];
            readonly targets: components["schemas"]["StudentCourseTargets"];
        };
        /** @description CURRENT means checkpoint covers current protected sources. RECOMPUTING may expose the last committed checkpoint explicitly as historical. UNAVAILABLE returns no numeric fallback. Session eligibility is independently checked by the Session Owner; target/daily/weekly cap never closes a start. */
        readonly StudentCourseProgress: {
            readonly checkpoint: components["schemas"]["StatisticsCheckpoint"] | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly observedAt: string;
            /** @enum {string} */
            readonly state: "CURRENT" | "RECOMPUTING" | "UNAVAILABLE";
            readonly student: components["schemas"]["StudentSummary"];
            readonly unavailableReason: ("SOURCE_INCOMPLETE" | "SOURCE_CHANGED" | "PREDECESSOR_UNAVAILABLE" | "RECOVERY_REQUIRED") | null;
        } & (unknown & unknown & unknown);
        /** @description All pages pinned to the same server snapshot and complete membership scope. No page-by-page latest-source mixing. Unavailable snapshot returns STATISTICS_UNAVAILABLE. */
        readonly StudentCourseProgressPage: {
            readonly items: readonly components["schemas"]["StudentCourseProgress"][];
            readonly page: components["schemas"]["CursorPage"];
            readonly scope: components["schemas"]["CourseStatisticsScope"];
        };
        readonly StudentCourseTargets: {
            /** Format: int32 */
            readonly courseRelatedTargetMinutes: number;
            /** Format: int32 */
            readonly otherTargetMinutes: number;
            /**
             * Format: int32
             * @constant
             */
            readonly totalTargetMinutes: 1200;
        };
        /** @description Student allowlist dashboard. Current semester nullability is unchanged. Raw endurance and minutes only; unavailable source never falls back to a teacher DTO or legacy grade-bearing cache. */
        readonly StudentDashboard: {
            readonly actor: components["schemas"]["CurrentActor"];
            readonly course: components["schemas"]["StudentCourse"] | null;
            readonly currentSemester: components["schemas"]["SemesterSummary"];
            readonly enduranceOutcome: components["schemas"]["StudentEnduranceOutcome"] | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly generatedAt: string;
            readonly progress: components["schemas"]["StudentCourseProgress"] | null;
            readonly student: components["schemas"]["StudentSummary"];
            /** @enum {string} */
            readonly studentStatus: "ACTIVE" | "PENDING";
            /** Format: int64 */
            readonly unreadNotificationCount: number;
        };
        /** @description Positive student allowlist of own raw event/time/date or exemption. No conversion object, score, level, rank or grade, including null/empty substitutes. Legacy missing source date remains null with no invented backfill. */
        readonly StudentEnduranceOutcome: {
            readonly approvedExemptionApplicationId: string | null;
            readonly distanceMeters: (800 | 1000) | null;
            readonly durationSeconds: number | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly enrollmentId: string;
            /** @enum {string} */
            readonly outcome: "UNRECORDED" | "MEASURED" | "EXEMPT";
            readonly testedOn: string | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        } & (unknown & unknown & unknown);
        /** @description Student-only whitelisted notification templates and safe navigation. Reject the entire prohibited message at creation AND read, including grade text in title/body/localized/URL/context. No partial redaction, grade counts or replacement null payload. JSON Schema cannot prove natural-language text safety; server template projection and Phase7/9 tests are mandatory. */
        readonly StudentNotification: {
            readonly body: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly createdAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly notificationId: string;
            readonly notificationType: string;
            readonly readAt: string | null;
            readonly reviewContext: components["schemas"]["ReviewNotificationContext"] | null;
            readonly targetId: string | null;
            readonly targetRoute: ("COURSE" | "EXERCISE_RECORD" | "APPLICATION" | "ENDURANCE" | "FEEDBACK" | "SYSTEM_MODE") | null;
            readonly title: string;
        };
        readonly StudentNotificationPage: {
            readonly items: readonly components["schemas"]["StudentNotification"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        readonly StudentSessionRequest: {
            readonly otpProof: components["schemas"]["OtpProof"];
        };
        readonly StudentSummary: {
            readonly administrativeClass: string | null;
            readonly college: string | null;
            /** @enum {string} */
            readonly gender: "FEMALE" | "MALE";
            /** Format: int32 */
            readonly gradeYear: number;
            readonly major: string | null;
            readonly name: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly studentId: string;
            readonly studentNumber: string;
            /** @enum {string} */
            readonly studentStatus: "ACTIVE" | "PENDING";
        };
        readonly SubAdmin: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly adminId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly createdAt: string;
            readonly department: string | null;
            readonly loginName: string;
            readonly name: string;
            readonly permissions: readonly components["schemas"]["AdminPermission"][];
            /** @enum {string} */
            readonly state: "ACTIVE" | "DISABLED";
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: email
             * @description Normalized school email address.
             */
            readonly verifiedEmail: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        /** @description SUPER-only organization-wide account summary from the same committed read snapshot as the returned items. Counts ignore state, cursor, and limit; the fixed permission count remains the eight-value AdminPermission enum. */
        readonly SubAdminGovernanceSummary: {
            /** Format: int32 */
            readonly activeCount: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly generatedAt: string;
            /** Format: int32 */
            readonly totalCount: number;
        };
        readonly SubAdminPage: {
            readonly items: readonly components["schemas"]["SubAdmin"][];
            readonly page: components["schemas"]["CursorPage"];
            readonly summary: components["schemas"]["SubAdminGovernanceSummary"];
        };
        readonly SubmitExerciseRecordRequest: components["schemas"]["SubmitOrdinaryExerciseRecordRequest"] | components["schemas"]["SubmitSwimmingExerciseRecordRequest"] | components["schemas"]["SubmitOfflineSwimmingExerciseRecordRequest"];
        /** @description Server validates the actual activity/evidence requirements. Route selection cannot relabel swimming to bypass its rules. No client formal times, duration, result, or private notes. */
        readonly SubmitOfflineSwimmingExerciseRecordRequest: {
            readonly category: components["schemas"]["ExerciseCategory"];
            readonly delayExplanation: string;
            readonly description: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedSessionVersion: number;
            readonly items: components["schemas"]["MaterialManifest"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly submissionRoute: "SWIMMING_OFFLINE";
        };
        /** @description Server validates the actual activity/evidence requirements. Route selection cannot relabel swimming to bypass its rules. No client formal times, duration, result, or private notes. */
        readonly SubmitOrdinaryExerciseRecordRequest: {
            readonly category: components["schemas"]["ExerciseCategory"];
            readonly description: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedSessionVersion: number;
            readonly items: components["schemas"]["MaterialManifest"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly submissionRoute: "ORDINARY";
        };
        /** @description Server validates the actual activity/evidence requirements. Route selection cannot relabel swimming to bypass its rules. No client formal times, duration, result, or private notes. */
        readonly SubmitSwimmingExerciseRecordRequest: {
            readonly category: components["schemas"]["ExerciseCategory"];
            readonly description: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedSessionVersion: number;
            readonly items: components["schemas"]["MaterialManifest"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly submissionRoute: "SWIMMING_TIMELY";
        };
        /** @description Single atomic material version2, accepted timer and new teacher round2 result, with original command replay. */
        readonly SupplementAcceptanceReceipt: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly acceptedAt: string;
            readonly material: components["schemas"]["MaterialVersion"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly receiptId: string;
            readonly review: components["schemas"]["RecordReviewSummary"];
        } & {
            readonly material: {
                /** @constant */
                readonly readiness?: "READY";
                /** @constant */
                readonly versionNo?: 2;
            };
            readonly review: {
                /** @constant */
                readonly processingStage?: "SUPPLEMENT_REVIEW_REQUIRED";
                /** @constant */
                readonly roundNo?: 2;
            };
        };
        readonly SupplementApplicationRequest: {
            readonly evidenceAssetIds: readonly string[];
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
        };
        /** @description materialVersionId is the original version1. All version2 media must be ready before formal acceptance; no added 30-minute grace. Reuse original assets only from this Record. Category/date/duration/session cannot be changed. */
        readonly SupplementRecordMaterialRequest: {
            /** @constant */
            readonly expectedRoundNo: 1;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedTimerVersion: number;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedTimingSourceRevision: number;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly items: components["schemas"]["MaterialManifest"];
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly materialVersionId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly returnActionId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly timerId: string;
        };
        /** @description Only one normal timer. Current projection may be restored by an append-only confirmed-fault correction; original EXPIRED event remains. No new full budget and return-used never resets. Acceptance ends student timing, not teacher review. */
        readonly SupplementTimerView: {
            readonly acceptedMaterialVersionId: string | null;
            /** @enum {integer} */
            readonly budgetHours: 24 | 72;
            readonly effectiveDueAt: string | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly originalDueAt: string;
            readonly pauses: readonly components["schemas"]["TimerPause"][];
            readonly remainingSeconds: number | null;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly returnActionId: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly sourceRevision: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly startedAt: string;
            /** @enum {string} */
            readonly state: "ACTIVE" | "PAUSED" | "ACCEPTED" | "EXPIRED" | "UNAVAILABLE";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly timerId: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        } & (unknown & unknown & unknown & unknown & unknown & unknown);
        readonly SwitchSystemModeRequest: components["schemas"]["EnterMaintenanceRequest"] | components["schemas"]["ReturnNormalRequest"];
        /** @description Missing, unknown, or unreadable mode must fail closed; only explicit NORMAL opens ordinary business. */
        readonly SystemMode: {
            readonly announcement: components["schemas"]["MaintenanceAnnouncement"] | null;
            /** @enum {string} */
            readonly mode: "NORMAL" | "MAINTENANCE";
            /** Format: int64 */
            readonly policyVersion: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly SystemModeSwitchResult: {
            readonly current: components["schemas"]["SystemMode"];
            readonly transition: components["schemas"]["SystemModeTransition"];
        };
        readonly SystemModeTransition: {
            readonly announcement: components["schemas"]["MaintenanceAnnouncement"] | null;
            readonly announcementPublished: boolean;
            readonly changedBy: components["schemas"]["PersonSummary"];
            /** @enum {string} */
            readonly fromMode: "NORMAL" | "MAINTENANCE";
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly occurredAt: string;
            readonly reason: string;
            /** Format: int64 */
            readonly sequenceNumber: number;
            /** @enum {string} */
            readonly toMode: "NORMAL" | "MAINTENANCE";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly transitionId: string;
        };
        readonly SystemModeTransitionPage: {
            readonly items: readonly components["schemas"]["SystemModeTransition"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Account state is read-only in the users/accounts page. No teacher enable/disable/recovery approval operation is defined. */
        readonly TeacherAccount: {
            /** @enum {string} */
            readonly accountState: "ACTIVE" | "DISABLED" | "RECOVERY_REQUIRED";
            readonly college: string | null;
            readonly department: string | null;
            readonly employeeId: string;
            readonly mustChangePassword: boolean;
            readonly name: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly organizationId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly teacherId: string;
            readonly title: string | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly updatedAt: string;
            /**
             * Format: email
             * @description Normalized school email address.
             */
            readonly verifiedEmail: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        readonly TeacherAccountPage: {
            readonly items: readonly components["schemas"]["TeacherAccount"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description The initial password is never returned or persisted in ordinary documents/business records. */
        readonly TeacherBatchCreationResult: {
            /** Format: int32 */
            readonly createdCount: number;
            readonly teachers: readonly components["schemas"]["TeacherAccount"][];
        };
        readonly TeacherBatchValidation: {
            /** Format: int32 */
            readonly errorCount: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly expiresAt: string;
            /** Format: int32 */
            readonly rowCount: number;
            readonly rows: readonly components["schemas"]["TeacherBatchValidationRow"][];
            readonly valid: boolean;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly validationId: string;
        };
        /** @description Clients may read an uploaded UTF-8 CSV file or accept pasted CSV, then send the same text. Passwords never belong in CSV. */
        readonly TeacherBatchValidationRequest: {
            /** @description UTF-8 CSV text. Required headers: employee_id,name,email; college is optional. */
            readonly csvText: string;
        };
        readonly TeacherBatchValidationRow: {
            readonly college: string | null;
            readonly email: string | null;
            readonly employeeId: string | null;
            readonly errors: readonly string[];
            readonly name: string | null;
            /** Format: int32 */
            readonly rowNumber: number;
        };
        /** @description When no CURRENT semester exists, currentSemester is null and every current-semester course/work count is zero. A null currentSemester is a business empty state, not a dependency failure. */
        readonly TeacherDashboard: {
            readonly actor: components["schemas"]["CurrentActor"];
            readonly currentSemester: components["schemas"]["SemesterSummary"] | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly generatedAt: string;
            /** Format: int32 */
            readonly memberCount: number;
            /** Format: int32 */
            readonly openCourseCount: number;
            /** Format: int32 */
            readonly pendingApplicationCount: number;
            /** Format: int32 */
            readonly pendingEnduranceCount: number;
            /** Format: int32 */
            readonly unpublishedFinalGradeCount: number;
            /** Format: int64 */
            readonly unreadNotificationCount: number;
            /** Format: int32 */
            readonly unresolvedRosterFindingCount: number;
        };
        /** @description One active item per Case/round; only TEACHER_REVIEW_REQUIRED or SUPPLEMENT_REVIEW_REQUIRED. AI/technical/student-wait states are not teacher todo items. */
        readonly TeacherReviewQueueItem: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly queueItemId: string;
            readonly record: components["schemas"]["ExerciseRecord"];
            /** @enum {integer} */
            readonly reviewRoundNo: 1 | 2;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly sourceRevision: number;
        } & {
            readonly record: {
                readonly currentReview?: {
                    /** @enum {string} */
                    readonly processingStage?: "TEACHER_REVIEW_REQUIRED" | "SUPPLEMENT_REVIEW_REQUIRED";
                };
            };
        };
        readonly TeacherReviewQueuePage: {
            readonly items: readonly components["schemas"]["TeacherReviewQueueItem"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description Two full confirmed school-working days, not 48 wall-clock hours. Only confirmed Shanghai day intervals count; subtract the pause union intersection. Overdue never invalidates a student's record. */
        readonly TeacherReviewSla: {
            /** @constant */
            readonly budgetSeconds: 172800;
            /** @enum {string} */
            readonly calculationStatus: "AVAILABLE" | "PAUSED" | "UNAVAILABLE";
            readonly calendar: components["schemas"]["SchoolCalendarReference"] | null;
            readonly consumedSeconds: number | null;
            readonly effectiveDueAt: string | null;
            readonly endedAt: string | null;
            readonly overdue: boolean | null;
            readonly pauses: readonly components["schemas"]["TimerPause"][];
            readonly remainingSeconds: number | null;
            /** @enum {integer} */
            readonly roundNo: 1 | 2;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly sourceRevision: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly startedAt: string;
            readonly unavailableReason: ("CALENDAR_MISSING" | "CALENDAR_COVERAGE_INCOMPLETE" | "TIMING_SOURCE_UNAVAILABLE") | null;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        } & (unknown & unknown & unknown & unknown);
        /** @description Minimum student-visible teacher identity. Account and employment details use authorized account DTOs. */
        readonly TeacherSummary: {
            readonly name: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly teacherId: string;
        };
        /** @description Same complete source-set revision, errors and duplicate rows included. Counts unavailable until parsing completeness proven. Formal rows are committed facts, not OCR success. Completeness cannot be inferred from equal totals. */
        readonly TeachingBatchCounts: {
            /** Format: int64 */
            readonly confirmedRows: number;
            /** Format: int64 */
            readonly excludedRows: number;
            /** Format: int64 */
            readonly formalRows: number;
            /** Format: int64 */
            readonly pendingRows: number;
            /** Format: int64 */
            readonly sourcePersonnelRows: number;
        };
        readonly TeachingDraftIssue: {
            /** @enum {string} */
            readonly code: "UNREADABLE" | "MISSING_REQUIRED_FIELD" | "LOW_CONFIDENCE" | "DUPLICATE_IDENTITY" | "IDENTITY_CONFLICT" | "UNMATCHED_STUDENT" | "WRONG_ROW" | "EVENT_GENDER_MISMATCH" | "AMBIGUOUS_TIME_FORMAT" | "MISSING_TEST_DATE" | "RULE_MATCH_UNAVAILABLE";
            readonly field: string;
            readonly message: components["schemas"]["LocalizedText"];
        };
        readonly TeachingSourceAllocation: {
            /** Format: int64 */
            readonly maximumAcceptedBytes: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sourceAssetId: string;
            readonly upload: components["schemas"]["UploadAllocation"];
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        /** @description Teacher-only temporary source. Roster aggregate100MiB and500 personnel rows are fixed; every error/duplicate row counts. Endurance ingestion operational byte limits are returned in the allocation, not silently asserted to be roster business limits. Source declared metadata never substitutes for authoritative content probing. New input requires open course; accepted batch continuation retains original scope. */
        readonly TeachingSourceAllocationRequest: {
            /** Format: int64 */
            readonly declaredByteSize: number;
            /** @enum {string} */
            readonly declaredContentType: "text/csv" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "image/jpeg" | "image/png";
            readonly displayName: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedCourseVersion: number;
            /** @enum {string} */
            readonly purpose: "ROSTER" | "ENDURANCE";
            /** @enum {string} */
            readonly sourceFormat: "XLSX" | "CSV" | "PAPER_SCAN";
        };
        /** @description Teacher-only verified source metadata; no object path or permanent URL. Paper image retained only under restricted review/history policy, never delivered to student or admin course directory. Electronic data is parsed directly, not OCR-rendered. */
        readonly TeachingSourceAsset: {
            /** Format: int64 */
            readonly byteSize: number;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly checksumSha256: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly courseId: string;
            readonly displayName: string;
            /** @enum {string} */
            readonly purpose: "ROSTER" | "ENDURANCE";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sourceAssetId: string;
            /** @enum {string} */
            readonly sourceFormat: "XLSX" | "CSV" | "PAPER_SCAN";
            /** @enum {string} */
            readonly status: "VERIFIED" | "BOUND";
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly verifiedAt: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly version: number;
        };
        /** @description Short-lived authenticated teacher download gateway; it rechecks actor/original source scope even if this URL is forwarded. Never a public bearer object URL. */
        readonly TeachingSourceDownloadAuthorization: {
            /** Format: uri */
            readonly downloadUrl: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly expiresAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sourceAssetId: string;
        };
        readonly TeachingSourceFinalizeRequest: {
            /** @description Hex-encoded SHA-256 checksum. */
            readonly checksumSha256: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
        };
        /** @description Stable original page/row identity; duplicate source positions cannot be hidden by reordering or filtering. */
        readonly TeachingSourcePosition: {
            /** Format: int64 */
            readonly pageNo: number;
            /** Format: int64 */
            readonly rowNo: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sourceAssetId: string;
        };
        readonly TeachingSourceReference: {
            /** @description Hex-encoded SHA-256 checksum. */
            readonly checksumSha256: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedSourceVersion: number;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sourceAssetId: string;
        };
        /** @description Most recent actual probe, not the last successful probe reused as current health. */
        readonly TechnicalProbe: {
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly checkedAt: string;
            /** @enum {string} */
            readonly result: "SUCCESS" | "FAILED" | "UNKNOWN";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly serviceRevisionId: string;
        };
        /** @description Reference to real-school labelled evaluation, never model confidence or a service self-report. No sample rows/media or student identities. Null metric means not evaluated/not applicable, never perfect accuracy; acceptance requires the separately authorized evaluation evidence. Evaluated serviceRevisionId remains historical. Reuse on enabling is allowed only after server comparison of exact canonical provider/model/version, scope, connection/credential reference, purpose and policy fingerprint; never accept caller-asserted equality. Enable/approval flags are governance state, not inference inputs. */
        readonly TechnicalQualityEvidence: {
            readonly annotationVersion: string;
            readonly anomalyRecall: number | null;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly configurationSha256: string;
            /** @enum {string} */
            readonly evaluationStatus: "ACCEPTED" | "NOT_ACCEPTED";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly evidenceId: string;
            readonly falseApprovalRate: number | null;
            readonly ocrErrorRate: number | null;
            readonly policyVersion: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly sampleSetId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly serviceRevisionId: string;
            readonly teacherTaskCount: number | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly windowEndsAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly windowStartsAt: string;
        };
        /** @description Non-sensitive governance projection; secret/connection credentials are never echoed, copied into tasks or normal audit. In-flight tasks retain original input/service/policy revision on new publication. Complete revision/pointer/receipt/audit/outbox is atomic. */
        readonly TechnicalServiceRevision: {
            readonly automaticApprovalEnabled: boolean;
            /** @description Hex-encoded SHA-256 checksum. */
            readonly configurationSha256: string;
            readonly enabled: boolean;
            readonly modelId: string;
            readonly modelVersion: string;
            readonly policyVersion: string;
            readonly previousRevisionId: string | null;
            readonly providerId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly publishedAt: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly publishedBySubjectId: string;
            /** @enum {string} */
            readonly purpose: "VLM_REVIEW" | "ROSTER_OCR" | "ENDURANCE_OCR";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly revisionId: string;
            readonly scope: components["schemas"]["TechnicalServiceScope"];
            readonly validationEvidenceId: string | null;
        } & (unknown & unknown & unknown);
        readonly TechnicalServiceRevisionPage: {
            readonly items: readonly components["schemas"]["TechnicalServiceRevision"][];
            readonly page: components["schemas"]["CursorPage"];
        };
        /** @description SUPER-only immutable revision, no raw secret/URL/credentials/prompts/free script or media. Connection/secret references resolve through authorized pre-provisioned infrastructure; missing references fail, never fabricate a configured service. VLM auto-approval requires accepted real-school sample evidence for exact purpose/model/policy/scope. OCR always drafts, never automatic formal approval. */
        readonly TechnicalServiceRevisionRequest: {
            readonly automaticApprovalEnabled: boolean;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly connectionReferenceId: string;
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly credentialReferenceId: string;
            readonly enabled: boolean;
            readonly expectedCurrentRevisionId: string | null;
            readonly modelId: string;
            readonly modelVersion: string;
            readonly policyVersion: string;
            readonly providerId: string;
            /** @enum {string} */
            readonly purpose: "VLM_REVIEW" | "ROSTER_OCR" | "ENDURANCE_OCR";
            readonly scope: components["schemas"]["TechnicalServiceScope"];
            readonly validationEvidenceId: string | null;
        } & (unknown & unknown & unknown);
        /** @description SUPER-only desensitized snapshot. Source failure, incomplete metrics or inconsistent sampling yields UNKNOWN/UNAVAILABLE and null counts; a past successful probe never proves current health. No model key, prompt, media, student identifier or teaching decision. */
        readonly TechnicalServiceRunStatus: {
            readonly lastSuccessfulProbeAt: string | null;
            readonly latestProbe: components["schemas"]["TechnicalProbe"] | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly observedAt: string;
            /** @enum {string} */
            readonly purpose: "VLM_REVIEW" | "ROSTER_OCR" | "ENDURANCE_OCR";
            readonly quality: components["schemas"]["TechnicalQualityEvidence"] | null;
            readonly scope: components["schemas"]["TechnicalServiceScope"];
            readonly serviceRevisionId: string | null;
            readonly sourceRevision: string | null;
            /** @enum {string} */
            readonly state: "AVAILABLE" | "DEGRADED" | "NOT_CONFIGURED" | "UNKNOWN" | "UNAVAILABLE";
            readonly taskCounts: components["schemas"]["TechnicalTaskCounts"] | null;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly windowEndsAt: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly windowStartsAt: string;
        } & (unknown & unknown & unknown & unknown & unknown & unknown);
        /** @description Organization is always the authenticated super-admin organization; COURSE must belong to it. Scope is normalized in stable request identity, not an arbitrary query or script. */
        readonly TechnicalServiceScope: {
            readonly courseId: string | null;
            /** @enum {string} */
            readonly kind: "ORGANIZATION" | "COURSE";
        } & (unknown & unknown);
        /** @description Same complete sampling window; categories partition task count, unknown is not0. These are technical outcomes, not accuracy or teacher judgments. */
        readonly TechnicalTaskCounts: {
            /** Format: int64 */
            readonly failed: number;
            readonly oldestPendingSeconds: number | null;
            /** Format: int64 */
            readonly pending: number;
            /** Format: int64 */
            readonly succeeded: number;
            /** Format: int64 */
            readonly total: number;
        };
        /** @enum {string} */
        readonly TermType: "FIRST" | "SECOND" | "SUMMER";
        /** @description Authorized public timing evidence only; no incident payload, provider detail, or personal data. Intervals are half-open and overlap is counted once. */
        readonly TimerPause: {
            readonly endedAt: string | null;
            /** @enum {string} */
            readonly kind: "MAINTENANCE" | "CONFIRMED_PLATFORM_INCIDENT" | "ERRONEOUS_LOCK";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly referenceId: string;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly revision: number;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly startedAt: string;
        };
        readonly TransitionHelpArticleRequest: {
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            /** @enum {string} */
            readonly targetStatus: "PUBLISHED" | "ARCHIVED";
        };
        readonly UnreadNotificationCount: {
            /** Format: int64 */
            readonly unreadCount: number;
        };
        readonly UpdateEnduranceRuleIntervalChange: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly action: "UPDATE";
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly intervalId: string;
            /** @enum {string} */
            readonly level: "EXCELLENT" | "GOOD" | "PASS" | "FAIL";
            /** Format: int32 */
            readonly lowerSeconds: number;
            readonly remark: string | null;
            /** Format: int32 */
            readonly score: number;
            /** Format: int32 */
            readonly upperSeconds: number;
        };
        readonly UpdateHelpArticleRequest: {
            readonly bodyEn: string | null;
            readonly bodyZh: string | null;
            readonly category: components["schemas"]["HelpArticleCategory"];
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly keywords: readonly string[];
            readonly sortWeight: number;
            readonly titleEn: string;
            readonly titleZh: string;
        };
        /** @description Updates name, verified school email, department, fixed permissions, and expected version only. loginName is intentionally absent and immutable; another administrator cannot set the account holder's personal password. */
        readonly UpdateSubAdminRequest: {
            readonly department: string | null;
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly name: string;
            readonly permissions: readonly components["schemas"]["AdminPermission"][];
            /**
             * Format: email
             * @description Normalized school email address.
             */
            readonly verifiedEmail: string;
        };
        /** @description Short-lived upload authorization. Clients use uploadMethod, the exact requiredHeaders, and the byte body; internal object keys are never exposed. */
        readonly UploadAllocation: {
            /**
             * Format: uuid
             * @description Opaque public identifier; clients must not infer meaning from it.
             */
            readonly allocationId: string;
            /**
             * Format: date-time
             * @description RFC 3339 UTC instant. Servers emit an explicit Z offset; clients localize only for display.
             */
            readonly expiresAt: string;
            readonly requiredHeaders: {
                readonly [key: string]: string;
            };
            readonly uploadMethod: components["schemas"]["DirectUploadHttpMethod"];
            /** Format: uri */
            readonly uploadUrl: string;
        };
        readonly VerifiedEmailChangeRequest: {
            readonly currentEmailProof: components["schemas"]["OtpProof"];
            /**
             * Format: int64
             * @description Optimistic-concurrency version.
             */
            readonly expectedVersion: number;
            readonly newEmailProof: components["schemas"]["OtpProof"];
        };
    };
    responses: {
        /** @description Malformed or invalid request. */
        readonly BadRequest: {
            headers: {
                readonly "X-Request-Id": components["headers"]["RequestId"];
                readonly [name: string]: unknown;
            };
            content: {
                readonly "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description Domain or idempotency conflict. */
        readonly Conflict: {
            headers: {
                readonly "X-Request-Id": components["headers"]["RequestId"];
                readonly [name: string]: unknown;
            };
            content: {
                readonly "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description Authenticated actor is not allowed to perform the operation. */
        readonly Forbidden: {
            headers: {
                readonly "X-Request-Id": components["headers"]["RequestId"];
                readonly [name: string]: unknown;
            };
            content: {
                readonly "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description Internal server error. */
        readonly InternalError: {
            headers: {
                readonly "X-Request-Id": components["headers"]["RequestId"];
                readonly [name: string]: unknown;
            };
            content: {
                readonly "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description Resource was not found in the authorized scope. */
        readonly NotFound: {
            headers: {
                readonly "X-Request-Id": components["headers"]["RequestId"];
                readonly [name: string]: unknown;
            };
            content: {
                readonly "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description Payload or authoritative file size exceeds a declared limit. */
        readonly PayloadTooLarge: {
            headers: {
                readonly "X-Request-Id": components["headers"]["RequestId"];
                readonly [name: string]: unknown;
            };
            content: {
                readonly "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description Optimistic concurrency precondition failed. */
        readonly PreconditionFailed: {
            headers: {
                readonly "X-Request-Id": components["headers"]["RequestId"];
                readonly [name: string]: unknown;
            };
            content: {
                readonly "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description System mode or dependency prevents the operation. */
        readonly ServiceUnavailable: {
            headers: {
                /** @description Seconds before retrying. */
                readonly "Retry-After"?: number;
                readonly "X-Request-Id": components["headers"]["RequestId"];
                readonly [name: string]: unknown;
            };
            content: {
                readonly "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description Rate limit exceeded. */
        readonly TooManyRequests: {
            headers: {
                /** @description Seconds before retrying. */
                readonly "Retry-After"?: number;
                readonly "X-Request-Id": components["headers"]["RequestId"];
                readonly [name: string]: unknown;
            };
            content: {
                readonly "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description Authentication or verification failed. */
        readonly Unauthorized: {
            headers: {
                readonly "X-Request-Id": components["headers"]["RequestId"];
                readonly [name: string]: unknown;
            };
            content: {
                readonly "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description Request violates a declared domain constraint. */
        readonly UnprocessableEntity: {
            headers: {
                readonly "X-Request-Id": components["headers"]["RequestId"];
                readonly [name: string]: unknown;
            };
            content: {
                readonly "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
        /** @description Authoritative media type is unsupported. */
        readonly UnsupportedMediaType: {
            headers: {
                readonly "X-Request-Id": components["headers"]["RequestId"];
                readonly [name: string]: unknown;
            };
            content: {
                readonly "application/json": components["schemas"]["ErrorEnvelope"];
            };
        };
    };
    parameters: {
        /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
        readonly IdempotencyKey: string;
    };
    requestBodies: never;
    headers: {
        /** @description Server correlation identifier; the same value appears in ErrorEnvelope.requestId. */
        readonly RequestId: string;
    };
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    readonly requestAuditArchive: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["AuditArchiveRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 202: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AuditArchiveJob"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getAuditArchiveJob: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque auditArchiveJobId. */
                readonly auditArchiveJobId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AuditArchiveJob"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly authorizeAuditArchiveDownload: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque auditArchiveJobId. */
                readonly auditArchiveJobId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AuditArchiveDownload"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listAuditEvents: {
        readonly parameters: {
            readonly query?: {
                readonly actorUserId?: string;
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                readonly fromDate?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly operationType?: string;
                readonly outcome?: "SUCCESS" | "REJECTED" | "DENIED" | "FAILED" | "ERROR";
                readonly requestId?: string;
                readonly targetId?: string;
                readonly targetType?: string;
                readonly toDate?: string;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AuditEventPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getAuditEvent: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque auditEventId. */
                readonly auditEventId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AuditEvent"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listCurrentCoursesForAdmin: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                readonly displayStatus?: "UPCOMING" | "ACTIVE";
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                /** @description Course-name or responsible-teacher keyword. */
                readonly q?: string;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AdminCurrentCourseDirectory"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getCurrentCourseForAdmin: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AdminCurrentCourseItem"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getAdminDashboard: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AdminDashboard"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listEnduranceRuleTables: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnduranceRuleTableList"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getEnduranceRuleTable: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque ruleTableId. */
                readonly ruleTableId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnduranceRuleTable"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly reviseEnduranceRuleTable: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque ruleTableId. */
                readonly ruleTableId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ReviseEnduranceRuleTableRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnduranceRuleTable"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listFeedbackForAdmin: {
        readonly parameters: {
            readonly query?: {
                readonly category?: "FUNCTION_BUG" | "FEATURE_SUGGESTION" | "ACCESSIBILITY" | "PRIVACY" | "OTHER";
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                /** @description Feedback number, student name/number/email, category, or description. */
                readonly q?: string;
                readonly status?: "WAITING" | "IN_PROGRESS" | "WAITING_TECH" | "COMPLETED" | "CLOSED";
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AdminFeedbackPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getFeedbackForAdmin: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque feedbackId. */
                readonly feedbackId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["FeedbackTicket"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly processFeedback: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque feedbackId. */
                readonly feedbackId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ProcessFeedbackRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["FeedbackTicket"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listHelpArticlesForAdmin: {
        readonly parameters: {
            readonly query?: {
                readonly category?: components["schemas"]["HelpArticleCategory"];
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly q?: string;
                readonly status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HelpArticleAdminPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly createHelpArticle: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CreateHelpArticleRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HelpArticleAdmin"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getHelpArticleForAdmin: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque articleId. */
                readonly articleId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HelpArticleAdmin"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly updateHelpArticle: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque articleId. */
                readonly articleId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["UpdateHelpArticleRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HelpArticleAdmin"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly transitionHelpArticleState: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque articleId. */
                readonly articleId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["TransitionHelpArticleRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HelpArticleAdmin"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listManualModeWindows: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ManualModeWindowPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly openManualModeWindow: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["OpenManualModeRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ManualModeWindow"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly closeManualModeWindow: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque windowId. */
                readonly windowId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CloseManualModeRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ManualModeWindow"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly publishRuleTemplateVersion: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["RuleTemplatePublishRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RuleTemplateVersion"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listSemesterSettlementSummaries: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque semesterId. */
                readonly semesterId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CourseSettlementSummaryPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listStudentAccounts: {
        readonly parameters: {
            readonly query?: {
                readonly collegeOrDepartment?: string;
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly q?: string;
                readonly status?: "ACTIVE" | "PENDING";
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentAccountPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getStudentAccount: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque studentId. */
                readonly studentId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentAccount"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listSubAdmins: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly state?: "ACTIVE" | "DISABLED";
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SubAdminPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly createSubAdmin: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CreateSubAdminRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SubAdmin"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getSubAdmin: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque adminId. */
                readonly adminId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SubAdmin"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly updateSubAdmin: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque adminId. */
                readonly adminId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["UpdateSubAdminRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SubAdmin"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly deleteSubAdmin: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque adminId. */
                readonly adminId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["DeleteSubAdminRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["DeletionResult"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly setSubAdminState: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque adminId. */
                readonly adminId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SetSubAdminStateRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SubAdmin"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listSystemModeTransitions: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SystemModeTransitionPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly switchSystemMode: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SwitchSystemModeRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SystemModeSwitchResult"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly validateTeacherAccountBatch: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["TeacherBatchValidationRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["TeacherBatchValidation"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly createTeacherAccountBatch: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CreateTeacherBatchRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["TeacherBatchCreationResult"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listTeacherAccounts: {
        readonly parameters: {
            readonly query?: {
                readonly collegeOrDepartment?: string;
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly q?: string;
                readonly state?: "ACTIVE" | "DISABLED" | "RECOVERY_REQUIRED";
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["TeacherAccountPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getTeacherAccount: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque teacherId. */
                readonly teacherId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["TeacherAccount"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly deleteTeacherAccount: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque teacherId. */
                readonly teacherId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["DeleteTeacherAccountRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["DeletionResult"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listTechnicalServiceRevisions: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["TechnicalServiceRevisionPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly publishTechnicalServiceRevision: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["TechnicalServiceRevisionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["TechnicalServiceRevision"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getTechnicalServiceRunStatus: {
        readonly parameters: {
            readonly query: {
                /** @description Omit for organization scope; otherwise an owned course scope. */
                readonly courseId?: string;
                readonly purpose: "VLM_REVIEW" | "ROSTER_OCR" | "ENDURANCE_OCR";
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["TechnicalServiceRunStatus"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getAppReleasePolicy: {
        readonly parameters: {
            readonly query: {
                readonly currentBuildNumber: number;
                readonly platform: "ANDROID" | "IOS" | "WEB";
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AppReleasePolicy"];
                };
            };
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly requestAuthChallenge: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["AuthChallengeRequest"];
            };
        };
        readonly responses: {
            /** @description Challenge request accepted. */
            readonly 202: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AuthChallenge"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly resetPassword: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["PasswordResetRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CommandAccepted"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly logoutCurrentSession: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CommandAccepted"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly logoutAllSessions: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CommandAccepted"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly createPasswordSession: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["PasswordSessionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SessionTokenPair"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly refreshSession: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["RefreshSessionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SessionTokenPair"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly createStudentSession: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["StudentSessionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SessionTokenPair"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly previewCourseInvitation: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque invitationCode. */
                readonly invitationCode: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CourseInvitationPreview"];
                };
            };
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly registerExistingInvitationFlow: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque invitationCode. */
                readonly invitationCode: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["RegisterExistingInvitationFlowRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["InvitationRegistrationFlow"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly joinCourseByInvitation: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque invitationCode. */
                readonly invitationCode: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ExistingStudentJoinRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["Enrollment"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly registerNewInvitationFlow: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque invitationCode. */
                readonly invitationCode: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["RegisterNewInvitationFlowRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["NewInvitationFlowAuthorization"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly registerStudentAndJoinCourse: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque invitationCode. */
                readonly invitationCode: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["NewStudentRegistrationRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SessionTokenPair"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getCourse: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["Course"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly updateCourse: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CourseUpdateRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["Course"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listCourseApplications: {
        readonly parameters: {
            readonly query?: {
                readonly applicationType?: "EXEMPTION" | "CERTIFICATION";
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly status?: "SUBMITTED" | "SUPPLEMENT_REQUIRED" | "APPROVED" | "REJECTED";
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentApplicationPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getCourseApplication: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque applicationId. */
                readonly applicationId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentApplication"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly adjustCertificationCredit: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque applicationId. */
                readonly applicationId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["AdjustCertificationCreditRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CertificationCredit"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly revokeCertificationCredit: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque applicationId. */
                readonly applicationId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["RevokeCertificationCreditRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CertificationCredit"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly decideStudentApplication: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque applicationId. */
                readonly applicationId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ApplicationDecisionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentApplication"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getAssessmentRosterProjection: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AssessmentRosterProjection"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly requestAssessmentRosterExport: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["AssessmentExportRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AssessmentExportArtifact"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getAssessmentRosterExport: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque artifactId. */
                readonly artifactId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AssessmentExportArtifact"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly authorizeAssessmentRosterExportDownload: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque artifactId. */
                readonly artifactId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AssessmentExportDownloadAuthorization"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listAssessmentRosterRows: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque projectionId. */
                readonly projectionId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AssessmentRosterRowPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly previewCourseChangeImpact: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CourseChangeProposal"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CourseChangeImpact"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly closeCourse: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CourseCloseRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["Course"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly updateCourseDraftRule: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CourseDraftUpdateRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["Course"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listEnduranceBatches: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnduranceCaptureBatchPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly createEnduranceBatch: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CreateTeachingBatchRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnduranceCaptureBatch"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getEnduranceBatch: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque batchId. */
                readonly batchId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnduranceCaptureBatch"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly confirmEnduranceDraftRows: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque batchId. */
                readonly batchId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ConfirmEnduranceRowsRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnduranceRowsConfirmation"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listEnduranceDraftRows: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque batchId. */
                readonly batchId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnduranceDraftRowPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly resolveEnduranceDraftRow: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque batchId. */
                readonly batchId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque rowId. */
                readonly rowId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ResolveEnduranceDraftRowRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnduranceDraftRow"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listCourseExerciseRecords: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly processingStage?: components["schemas"]["ReviewProcessingStage"];
                readonly reviewResult?: components["schemas"]["ReviewResult"];
                readonly studentId?: string;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ExerciseRecordPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getCourseExerciseRecord: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque recordId. */
                readonly recordId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ExerciseRecord"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly correctExerciseRecordReview: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque recordId. */
                readonly recordId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CorrectExerciseRecordReviewRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ReviewActionReceipt"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly appendExerciseRecordReview: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque recordId. */
                readonly recordId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["AppendRecordReviewRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ReviewActionReceipt"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listCourseFinalGrades: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["FinalGradeStatePage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listCourseInvitations: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly status?: "ACTIVE" | "EXPIRED" | "REVOKED" | "COURSE_CLOSED" | "NOT_CURRENT";
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CourseInvitationPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly createCourseInvitation: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CourseInvitationCreateRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CreatedCourseInvitation"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly revokeCourseInvitation: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque invitationId. */
                readonly invitationId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CourseInvitationRevokeRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CourseInvitation"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listCourseMakeupAuthorizations: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["MakeupAuthorizationPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly authorizeCourseMakeup: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["MakeupAuthorizationRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["MakeupAuthorization"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listCourseMembers: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly status?: "ACTIVE" | "REMOVED";
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnrollmentPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listEnduranceMeasurementHistory: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque enrollmentId. */
                readonly enrollmentId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnduranceMeasurementPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly confirmEnduranceMeasurement: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque enrollmentId. */
                readonly enrollmentId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ConfirmEnduranceMeasurementRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnduranceOutcome"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getCourseMemberEnduranceOutcome: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque enrollmentId. */
                readonly enrollmentId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["EnduranceOutcome"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listFinalGradeHistory: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque enrollmentId. */
                readonly enrollmentId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["FinalGradePublicationPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly publishFinalGrade: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque enrollmentId. */
                readonly enrollmentId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["PublishFinalGradeRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["FinalGradePublication"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getCourseMemberProgress: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque enrollmentId. */
                readonly enrollmentId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentCourseProgress"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly removeCourseMember: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque enrollmentId. */
                readonly enrollmentId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["EnrollmentTransitionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["Enrollment"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly restoreCourseMember: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque enrollmentId. */
                readonly enrollmentId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["EnrollmentTransitionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["Enrollment"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listCourseProgress: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentCourseProgressPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly publishCourse: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["PublishCourseRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["Course"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly prepareCoursePublication: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CoursePlanRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CoursePlanEvidence"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listTeacherReviewQueue: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["TeacherReviewQueuePage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly resolveRosterFinding: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque findingId. */
                readonly findingId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["RosterFindingResolutionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RosterFinding"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly allocateRosterImport: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["RosterImportAllocationRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["UploadAllocation"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 415: components["responses"]["UnsupportedMediaType"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listRosterBatches: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RosterImportBatchPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly createRosterBatch: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CreateTeachingBatchRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RosterImportBatch"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getRosterBatch: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque batchId. */
                readonly batchId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RosterImportBatch"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly publishRosterBatch: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque batchId. */
                readonly batchId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["PublishRosterBatchRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RosterBatchPublication"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listRosterDraftRows: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque batchId. */
                readonly batchId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RosterDraftRowPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly resolveRosterDraftRow: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque batchId. */
                readonly batchId: string;
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque rowId. */
                readonly rowId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ResolveRosterDraftRowRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RosterDraftRow"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly importOfficialRoster: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["RosterImportRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RosterImportBatch"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 415: components["responses"]["UnsupportedMediaType"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listRosterSnapshots: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RosterSnapshotPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getRosterSnapshot: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque snapshotId. */
                readonly snapshotId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RosterSnapshot"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly revertCurrentRosterSnapshot: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque snapshotId. */
                readonly snapshotId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["RosterRevertRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RosterSnapshot"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listRosterFindings: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                readonly findingType?: "MATCHED" | "ROSTER_ONLY" | "MEMBER_ONLY" | "IDENTITY_CONFLICT" | "DUPLICATE_OR_AMBIGUOUS";
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly resolved?: boolean;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque snapshotId. */
                readonly snapshotId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RosterFindingPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly prepareCourseSettlement: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SettlementPreparationRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SettlementPreparation"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listCourseSettlements: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SettlementReportVersionPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly confirmCourseSettlement: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ConfirmSettlementRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SettlementReportVersion"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getCourseSettlement: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque settlementVersionId. */
                readonly settlementVersionId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SettlementReportVersion"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listSettlementReportRows: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque settlementVersionId. */
                readonly settlementVersionId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SettlementReportRowPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly allocateTeachingSource: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["TeachingSourceAllocationRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["TeachingSourceAllocation"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 415: components["responses"]["UnsupportedMediaType"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly authorizeTeachingSourceDownload: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque sourceAssetId. */
                readonly sourceAssetId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["TeachingSourceDownloadAuthorization"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly finalizeTeachingSource: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque courseId. */
                readonly courseId: string;
                /** @description Opaque sourceAssetId. */
                readonly sourceAssetId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["TeachingSourceFinalizeRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["TeachingSourceAsset"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 415: components["responses"]["UnsupportedMediaType"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listRecordMaterials: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque recordId. */
                readonly recordId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["MaterialVersionPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getRecordMaterial: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque materialVersionId. */
                readonly materialVersionId: string;
                /** @description Opaque recordId. */
                readonly recordId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["MaterialVersion"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly completeExerciseRecordMaterial: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque materialVersionId. */
                readonly materialVersionId: string;
                /** @description Opaque recordId. */
                readonly recordId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CompleteRecordMaterialRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["MaterialCompletionReceipt"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listExerciseRecordReviews: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque recordId. */
                readonly recordId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RecordReviewPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly submitExerciseRecordSupplement: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque recordId. */
                readonly recordId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SupplementRecordMaterialRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SupplementAcceptanceReceipt"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly startExerciseSession: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["StartExerciseSessionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ExerciseSession"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getExerciseSession: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque sessionId. */
                readonly sessionId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ExerciseSession"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly completeExerciseSession: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque sessionId. */
                readonly sessionId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ExerciseSessionTransitionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ExerciseSession"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getFirstMaterialEligibility: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque sessionId. */
                readonly sessionId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["FirstMaterialEligibility"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly pauseExerciseSession: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque sessionId. */
                readonly sessionId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ExerciseSessionTransitionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ExerciseSession"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly submitExerciseRecord: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque sessionId. */
                readonly sessionId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SubmitExerciseRecordRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["FirstMaterialAcceptance"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly resumeExerciseSession: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque sessionId. */
                readonly sessionId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ExerciseSessionTransitionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ExerciseSession"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listPublishedHelpArticles: {
        readonly parameters: {
            readonly query: {
                readonly category?: components["schemas"]["HelpArticleCategory"];
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly locale: "zh-CN" | "en";
                readonly q?: string;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HelpArticlePublicPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getPublishedHelpArticle: {
        readonly parameters: {
            readonly query: {
                readonly locale: "zh-CN" | "en";
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque articleId. */
                readonly articleId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HelpArticlePublic"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getCurrentActor: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CurrentActor"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly deleteOwnAccount: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["AccountDeletionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["DeletionResult"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getOwnAccountDeletionImpact: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AccountDeletionImpact"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly changeOwnPassword: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["PasswordChangeRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CurrentActor"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly changeOwnVerifiedEmail: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["VerifiedEmailChangeRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CurrentActor"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly allocateMediaAsset: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["MediaAllocationRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["MediaAllocation"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 415: components["responses"]["UnsupportedMediaType"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly authorizeMediaDownload: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque mediaAssetId. */
                readonly mediaAssetId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["MediaDownloadAuthorization"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly finalizeMediaAsset: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque mediaAssetId. */
                readonly mediaAssetId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["FinalizeMediaRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["MediaFinalizationResult"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly renewRecordUploadAuthorization: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque mediaAssetId. */
                readonly mediaAssetId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["RecordUploadAuthorizationRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RecordUploadAuthorization"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listOwnNotifications: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly read?: boolean;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["NotificationPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly markOwnNotificationRead: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque notificationId. */
                readonly notificationId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["Notification"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getOwnUnreadNotificationCount: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["UnreadNotificationCount"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listPublishedRuleTemplates: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RuleTemplateVersionPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listSemesters: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly status?: "UPCOMING" | "CURRENT" | "ARCHIVED";
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SemesterPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly createSemester: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SemesterCreateRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["Semester"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly updateUpcomingSemester: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque semesterId. */
                readonly semesterId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SemesterUpdateRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["Semester"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly switchCurrentSemester: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque semesterId. */
                readonly semesterId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SemesterSwitchRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SemesterSwitchResult"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getCurrentSemester: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SemesterSummary"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listCheckpointRecordCredits: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path: {
                /** @description Opaque checkpointId. */
                readonly checkpointId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RecordCreditDetailPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listOwnApplications: {
        readonly parameters: {
            readonly query?: {
                readonly applicationType?: "EXEMPTION" | "CERTIFICATION";
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly status?: "SUBMITTED" | "SUPPLEMENT_REQUIRED" | "APPROVED" | "REJECTED";
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentApplicationPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly createStudentApplication: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CreateStudentApplicationRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentApplication"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getOwnApplication: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque applicationId. */
                readonly applicationId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentApplication"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly supplementStudentApplication: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque applicationId. */
                readonly applicationId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SupplementApplicationRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentApplication"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 412: components["responses"]["PreconditionFailed"];
            readonly 413: components["responses"]["PayloadTooLarge"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getOwnCurrentCourse: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentCourse"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getStudentDashboard: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentDashboard"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getOwnEnduranceOutcome: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentEnduranceOutcome"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listOwnExerciseRecords: {
        readonly parameters: {
            readonly query?: {
                readonly courseId?: string;
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly processingStage?: components["schemas"]["ReviewProcessingStage"];
                readonly reviewResult?: components["schemas"]["ReviewResult"];
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ExerciseRecordPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getOwnExerciseRecord: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque recordId. */
                readonly recordId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ExerciseRecord"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getOwnActiveExerciseSession: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ExerciseSession"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listOwnFeedback: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["FeedbackPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly createFeedback: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CreateFeedbackRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["FeedbackTicket"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getOwnFeedback: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path: {
                /** @description Opaque feedbackId. */
                readonly feedbackId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["FeedbackTicket"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listOwnMakeupAuthorizations: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["MakeupAuthorizationPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listOwnStudentNotifications: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly read?: boolean;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentNotificationPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly markOwnStudentNotificationRead: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path: {
                /** @description Opaque notificationId. */
                readonly notificationId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentNotification"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getOwnStudentUnreadNotificationCount: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["UnreadNotificationCount"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getOwnCourseProgress: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["StudentCourseProgress"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getSystemMode: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SystemMode"];
                };
            };
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listOwnCourses: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly status?: "DRAFT" | "OPEN" | "CLOSED";
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CoursePage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly createCourse: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description UUID scoped to the authenticated actor or anonymous command subject, operationId, and canonical resource identity. A normalized-command replay returns the original committed response; different normalized content returns IDEMPOTENCY_KEY_REUSED. */
                readonly "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CourseCreateRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response. */
            readonly 201: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["Course"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 404: components["responses"]["NotFound"];
            readonly 409: components["responses"]["Conflict"];
            readonly 422: components["responses"]["UnprocessableEntity"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly getTeacherDashboard: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["TeacherDashboard"];
                };
            };
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
    readonly listHistoricalFinalGradeRemarks: {
        readonly parameters: {
            readonly query: {
                readonly courseId?: string;
                /** @description Opaque keyset cursor returned by this exact operation and filter set. */
                readonly cursor?: string;
                readonly enrollmentId?: string;
                /** @description Maximum number of items to return. */
                readonly limit?: number;
                readonly purpose: string;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response. */
            readonly 200: {
                headers: {
                    readonly "X-Request-Id": components["headers"]["RequestId"];
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HistoricalFinalGradeRemarkPage"];
                };
            };
            readonly 400: components["responses"]["BadRequest"];
            readonly 401: components["responses"]["Unauthorized"];
            readonly 403: components["responses"]["Forbidden"];
            readonly 429: components["responses"]["TooManyRequests"];
            readonly 500: components["responses"]["InternalError"];
            readonly 503: components["responses"]["ServiceUnavailable"];
        };
    };
}
