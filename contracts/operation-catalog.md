# Operation catalog

Contract `1.3.0-contract` · status `RC` · public base path `/api/v1`.

This file is generated from the same registry as `openapi.yaml`; it is a review index, not a second authority.

| Method | Public path | operationId | Roles | Admin permissions | Resource/system scope | Idempotency |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/challenges` | `requestAuthChallenge` | ANONYMOUS, STUDENT, TEACHER, ADMIN | — | TARGET_EMAIL_WITH_ANTI_ENUMERATION / ALLOWED_DURING_MAINTENANCE | REQUIRED_HEADER |
| POST | `/api/v1/auth/sessions/student` | `createStudentSession` | ANONYMOUS | — | VERIFIED_STUDENT_EMAIL / ALLOWED_DURING_MAINTENANCE | REQUIRED_HEADER |
| POST | `/api/v1/auth/sessions/password` | `createPasswordSession` | ANONYMOUS | — | DECLARED_LOGIN_IDENTIFIER / ALLOWED_DURING_MAINTENANCE | REQUIRED_HEADER |
| POST | `/api/v1/auth/sessions/refresh` | `refreshSession` | ANONYMOUS | — | REFRESH_SESSION_OWNER / ALLOWED_DURING_MAINTENANCE | REQUIRED_HEADER |
| POST | `/api/v1/auth/sessions/current/logout` | `logoutCurrentSession` | STUDENT, TEACHER, ADMIN | — | CURRENT_SESSION / ALLOWED_DURING_MAINTENANCE | REQUIRED_HEADER |
| POST | `/api/v1/auth/sessions/logout-all` | `logoutAllSessions` | STUDENT, TEACHER, ADMIN | — | CURRENT_ACCOUNT / ALLOWED_DURING_MAINTENANCE | REQUIRED_HEADER |
| POST | `/api/v1/auth/password/reset` | `resetPassword` | ANONYMOUS | — | VERIFIED_ACCOUNT_EMAIL / ALLOWED_DURING_MAINTENANCE | REQUIRED_HEADER |
| GET | `/api/v1/me` | `getCurrentActor` | STUDENT, TEACHER, ADMIN | — | SELF / ALLOWED_DURING_MAINTENANCE | READ_ONLY |
| PUT | `/api/v1/me/password` | `changeOwnPassword` | TEACHER, ADMIN | — | SELF / ALLOWED_DURING_MAINTENANCE | REQUIRED_HEADER |
| PUT | `/api/v1/me/verified-email` | `changeOwnVerifiedEmail` | STUDENT, TEACHER, ADMIN | — | SELF / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/me/account-deletion-impact` | `getOwnAccountDeletionImpact` | STUDENT, ADMIN | — | SELF_STUDENT_OR_SUB_ADMIN / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/me/account-deletion` | `deleteOwnAccount` | STUDENT, ADMIN | — | SELF_STUDENT_OR_SUB_ADMIN / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/app-release-policy` | `getAppReleasePolicy` | ANONYMOUS, STUDENT, TEACHER, ADMIN | — | PUBLIC_POLICY / ALLOWED_DURING_MAINTENANCE | READ_ONLY |
| GET | `/api/v1/semesters/current` | `getCurrentSemester` | STUDENT, TEACHER, ADMIN | — | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/semesters` | `listSemesters` | ADMIN | SEMESTER | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/semesters` | `createSemester` | ADMIN | SEMESTER | CURRENT_ORGANIZATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| PUT | `/api/v1/semesters/{semesterId}` | `updateUpcomingSemester` | ADMIN | SEMESTER | CURRENT_ORGANIZATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/teacher/courses` | `listOwnCourses` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}` | `getCourse` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/student/course` | `getOwnCurrentCourse` | STUDENT | — | SELF_ACTIVE_ENROLLMENT / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/invitations` | `listCourseInvitations` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/courses/{courseId}/invitations/{invitationId}/revocation` | `revokeCourseInvitation` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/course-invitations/{invitationCode}` | `previewCourseInvitation` | ANONYMOUS, STUDENT | — | PRESENTED_INVITATION_CODE / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/members` | `listCourseMembers` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/courses/{courseId}/members/{enrollmentId}/removal` | `removeCourseMember` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/members/{enrollmentId}/restoration` | `restoreCourseMember` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/courses/{courseId}/roster-snapshots` | `listRosterSnapshots` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/roster-snapshots/{snapshotId}` | `getRosterSnapshot` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/roster-snapshots/{snapshotId}/findings` | `listRosterFindings` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/courses/{courseId}/roster-findings/{findingId}/resolution` | `resolveRosterFinding` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/roster-snapshots/{snapshotId}/current-selection` | `revertCurrentRosterSnapshot` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/student/exercise-sessions/active` | `getOwnActiveExerciseSession` | STUDENT | — | SELF / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/exercise-sessions/{sessionId}` | `getExerciseSession` | STUDENT, TEACHER | — | SESSION_OWNER_OR_RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/exercise-sessions/{sessionId}/pause` | `pauseExerciseSession` | STUDENT | — | SESSION_OWNER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/exercise-sessions/{sessionId}/resume` | `resumeExerciseSession` | STUDENT | — | SESSION_OWNER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/exercise-sessions/{sessionId}/complete` | `completeExerciseSession` | STUDENT | — | SESSION_OWNER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/media-assets` | `allocateMediaAsset` | STUDENT | — | SELF_AND_DECLARED_PURPOSE / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/media-assets/{mediaAssetId}/finalization` | `finalizeMediaAsset` | STUDENT | — | MEDIA_OWNER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/media-assets/{mediaAssetId}/download-authorization` | `authorizeMediaDownload` | STUDENT, TEACHER | — | MEDIA_OWNER_OR_RESPONSIBLE_TEACHER / NORMAL_REQUIRED | NATURAL |
| GET | `/api/v1/exercise-sessions/{sessionId}/material-eligibility` | `getFirstMaterialEligibility` | STUDENT | — | SELF_ORIGINAL_SESSION_RECORD / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/exercise-sessions/{sessionId}/record` | `submitExerciseRecord` | STUDENT | — | SELF_ORIGINAL_SESSION_RECORD / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/exercise-records/{recordId}/materials` | `listRecordMaterials` | STUDENT, TEACHER | — | RECORD_OWNER_OR_RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/exercise-records/{recordId}/materials/{materialVersionId}` | `getRecordMaterial` | STUDENT, TEACHER | — | RECORD_OWNER_OR_RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/exercise-records/{recordId}/materials/{materialVersionId}/completion` | `completeExerciseRecordMaterial` | STUDENT | — | SELF_ORIGINAL_SESSION_RECORD / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/media-assets/{mediaAssetId}/record-upload-authorization` | `renewRecordUploadAuthorization` | STUDENT | — | SELF_ORIGINAL_SESSION_RECORD / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/student/exercise-records` | `listOwnExerciseRecords` | STUDENT | — | SELF_ORIGINAL_SESSION_RECORD / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/student/exercise-records/{recordId}` | `getOwnExerciseRecord` | STUDENT | — | SELF_ORIGINAL_SESSION_RECORD / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/exercise-records` | `listCourseExerciseRecords` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_COURSE / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/exercise-records/{recordId}` | `getCourseExerciseRecord` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_COURSE / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/review-queue` | `listTeacherReviewQueue` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_COURSE / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/courses/{courseId}/exercise-records/{recordId}/reviews` | `appendExerciseRecordReview` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_COURSE / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/exercise-records/{recordId}/supplements` | `submitExerciseRecordSupplement` | STUDENT | — | SELF_ORIGINAL_SESSION_RECORD / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/exercise-records/{recordId}/review-corrections` | `correctExerciseRecordReview` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_COURSE / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/exercise-records/{recordId}/reviews` | `listExerciseRecordReviews` | STUDENT, TEACHER | — | RECORD_OWNER_OR_RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/student/applications` | `createStudentApplication` | STUDENT | — | SELF_ACTIVE_ENROLLMENT / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/student/applications/{applicationId}/supplements` | `supplementStudentApplication` | STUDENT | — | APPLICATION_OWNER / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/student/applications` | `listOwnApplications` | STUDENT | — | SELF / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/student/applications/{applicationId}` | `getOwnApplication` | STUDENT | — | APPLICATION_OWNER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/applications` | `listCourseApplications` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/applications/{applicationId}` | `getCourseApplication` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/courses/{courseId}/applications/{applicationId}/decisions` | `decideStudentApplication` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/applications/{applicationId}/certification-credit-adjustments` | `adjustCertificationCredit` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/applications/{applicationId}/certification-credit-revocation` | `revokeCertificationCredit` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/courses/{courseId}/members/{enrollmentId}/endurance-outcome` | `getCourseMemberEnduranceOutcome` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/endurance-rule-tables` | `listEnduranceRuleTables` | ADMIN | GLOBAL_RULES | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/endurance-rule-tables/{ruleTableId}` | `getEnduranceRuleTable` | ADMIN | GLOBAL_RULES | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/admin/endurance-rule-tables/{ruleTableId}/revisions` | `reviseEnduranceRuleTable` | ADMIN | GLOBAL_RULES | CURRENT_ORGANIZATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/courses/{courseId}/final-grades` | `listCourseFinalGrades` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/student/feedback` | `createFeedback` | STUDENT | — | SELF / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/student/feedback` | `listOwnFeedback` | STUDENT | — | SELF / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/student/feedback/{feedbackId}` | `getOwnFeedback` | STUDENT | — | SELF / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/feedback` | `listFeedbackForAdmin` | ADMIN | FEEDBACK | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/feedback/{feedbackId}` | `getFeedbackForAdmin` | ADMIN | FEEDBACK | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/admin/feedback/{feedbackId}/processing` | `processFeedback` | ADMIN | FEEDBACK | CURRENT_ORGANIZATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/help-articles` | `listPublishedHelpArticles` | STUDENT | — | PUBLISHED_STUDENT_CONTENT / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/help-articles/{articleId}` | `getPublishedHelpArticle` | STUDENT | — | PUBLISHED_STUDENT_CONTENT / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/help-articles` | `listHelpArticlesForAdmin` | ADMIN | HELP_CENTER | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/admin/help-articles` | `createHelpArticle` | ADMIN | HELP_CENTER | CURRENT_ORGANIZATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/admin/help-articles/{articleId}` | `getHelpArticleForAdmin` | ADMIN | HELP_CENTER | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| PUT | `/api/v1/admin/help-articles/{articleId}` | `updateHelpArticle` | ADMIN | HELP_CENTER | CURRENT_ORGANIZATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/admin/help-articles/{articleId}/state-transition` | `transitionHelpArticleState` | ADMIN | HELP_CENTER | CURRENT_ORGANIZATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/system-mode` | `getSystemMode` | ANONYMOUS, STUDENT, TEACHER, ADMIN | — | PUBLIC_MODE / ALLOWED_DURING_MAINTENANCE | READ_ONLY |
| GET | `/api/v1/admin/system-mode/transitions` | `listSystemModeTransitions` | ADMIN | SYSTEM_MODE | CURRENT_ORGANIZATION / ALLOWED_DURING_MAINTENANCE | READ_ONLY |
| POST | `/api/v1/admin/system-mode/transitions` | `switchSystemMode` | ADMIN | SYSTEM_MODE | CURRENT_ORGANIZATION / ALLOWED_DURING_MAINTENANCE | REQUIRED_HEADER |
| GET | `/api/v1/notifications` | `listOwnNotifications` | TEACHER, ADMIN | — | SELF / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/notifications/unread-count` | `getOwnUnreadNotificationCount` | TEACHER, ADMIN | — | SELF / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/notifications/{notificationId}/read` | `markOwnNotificationRead` | TEACHER, ADMIN | — | SELF / NORMAL_REQUIRED | NATURAL |
| GET | `/api/v1/admin/audit-events` | `listAuditEvents` | ADMIN | AUDIT_QUERY | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/audit-events/{auditEventId}` | `getAuditEvent` | ADMIN | AUDIT_QUERY | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/admin/audit-archive-jobs` | `requestAuditArchive` | ADMIN | AUDIT_QUERY | CURRENT_ORGANIZATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/admin/audit-archive-jobs/{auditArchiveJobId}` | `getAuditArchiveJob` | ADMIN | AUDIT_QUERY | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/admin/audit-archive-jobs/{auditArchiveJobId}/download-authorization` | `authorizeAuditArchiveDownload` | ADMIN | AUDIT_QUERY | CURRENT_ORGANIZATION / NORMAL_REQUIRED | NATURAL |
| GET | `/api/v1/admin/teacher-accounts` | `listTeacherAccounts` | ADMIN | USERS_ACCOUNTS | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/teacher-accounts/{teacherId}` | `getTeacherAccount` | ADMIN | USERS_ACCOUNTS | CURRENT_ORGANIZATION / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/admin/teacher-account-batch-validations` | `validateTeacherAccountBatch` | ADMIN | USERS_ACCOUNTS | CURRENT_ORGANIZATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/admin/teacher-account-batches` | `createTeacherAccountBatch` | ADMIN | USERS_ACCOUNTS | CURRENT_ORGANIZATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/admin/teacher-accounts/{teacherId}/deletion` | `deleteTeacherAccount` | ADMIN | USERS_ACCOUNTS | CURRENT_ORGANIZATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/admin/student-accounts` | `listStudentAccounts` | ADMIN | USERS_ACCOUNTS | CURRENT_ORGANIZATION_READ_ONLY / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/student-accounts/{studentId}` | `getStudentAccount` | ADMIN | USERS_ACCOUNTS | CURRENT_ORGANIZATION_READ_ONLY / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/sub-admins` | `listSubAdmins` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/admin/sub-admins` | `createSubAdmin` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/admin/sub-admins/{adminId}` | `getSubAdmin` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | READ_ONLY |
| PUT | `/api/v1/admin/sub-admins/{adminId}` | `updateSubAdmin` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/admin/sub-admins/{adminId}/state-transition` | `setSubAdminState` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/admin/sub-admins/{adminId}/deletion` | `deleteSubAdmin` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/student/dashboard` | `getStudentDashboard` | STUDENT | — | SELF / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/teacher/dashboard` | `getTeacherDashboard` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/dashboard` | `getAdminDashboard` | ADMIN | — | CURRENT_ORGANIZATION_PERMISSION_AWARE / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/teacher/courses` | `createCourse` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/change-impact` | `previewCourseChangeImpact` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| PUT | `/api/v1/courses/{courseId}` | `updateCourse` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/closure` | `closeCourse` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/exercise-sessions` | `startExerciseSession` | STUDENT | — | SELF_ACTIVE_ENROLLMENT / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/invitations` | `createCourseInvitation` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/course-invitations/{invitationCode}/join` | `joinCourseByInvitation` | STUDENT | — | SELF_AND_PRESENTED_INVITATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/course-invitations/{invitationCode}/student-registration` | `registerStudentAndJoinCourse` | ANONYMOUS | — | VERIFIED_NEW_STUDENT_AND_PRESENTED_INVITATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/student/progress` | `getOwnCourseProgress` | STUDENT | — | SELF_ACTIVE_ENROLLMENT / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/members/{enrollmentId}/progress` | `getCourseMemberProgress` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/progress` | `listCourseProgress` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/current-courses` | `listCurrentCoursesForAdmin` | ADMIN | COURSE_VIEW | CURRENT_ORGANIZATION_READ_ONLY / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/current-courses/{courseId}` | `getCurrentCourseForAdmin` | ADMIN | COURSE_VIEW | CURRENT_ORGANIZATION_READ_ONLY / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/semesters/{semesterId}/current-transition` | `switchCurrentSemester` | ADMIN | SEMESTER | CURRENT_ORGANIZATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/rule-template-versions` | `listPublishedRuleTemplates` | TEACHER, ADMIN | — | TEACHER_OR_SUPER_ADMIN / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/admin/rule-template-versions` | `publishRuleTemplateVersion` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/draft-rule` | `updateCourseDraftRule` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/publication-plan` | `prepareCoursePublication` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/publication` | `publishCourse` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/makeup-authorizations` | `authorizeCourseMakeup` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/courses/{courseId}/makeup-authorizations` | `listCourseMakeupAuthorizations` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/student/makeup-authorizations` | `listOwnMakeupAuthorizations` | STUDENT | — | SELF_ORIGINAL_ENROLLMENT / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/statistics/checkpoints/{checkpointId}/records` | `listCheckpointRecordCredits` | STUDENT, TEACHER | — | CHECKPOINT_ENROLLMENT_OWNER_OR_RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/course-invitations/{invitationCode}/existing-student-flows` | `registerExistingInvitationFlow` | STUDENT | — | VERIFIED_SUBJECT_AND_PRESENTED_INVITATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/course-invitations/{invitationCode}/new-student-flows` | `registerNewInvitationFlow` | ANONYMOUS | — | ANONYMOUS_FLOW_SUBJECT_AND_PRESENTED_INVITATION / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/settlement-preparations` | `prepareCourseSettlement` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/settlements` | `confirmCourseSettlement` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/courses/{courseId}/settlements` | `listCourseSettlements` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/settlements/{settlementVersionId}` | `getCourseSettlement` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/settlements/{settlementVersionId}/rows` | `listSettlementReportRows` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/semesters/{semesterId}/course-settlements` | `listSemesterSettlementSummaries` | ADMIN | SEMESTER | CURRENT_ORGANIZATION_READ_ONLY / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/courses/{courseId}/teaching-source-allocations` | `allocateTeachingSource` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/teaching-source-assets/{sourceAssetId}/finalization` | `finalizeTeachingSource` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/teaching-source-assets/{sourceAssetId}/download-authorization` | `authorizeTeachingSourceDownload` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/roster-import-batches` | `createRosterBatch` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/courses/{courseId}/roster-import-batches` | `listRosterBatches` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/roster-import-batches/{batchId}` | `getRosterBatch` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/roster-import-batches/{batchId}/rows` | `listRosterDraftRows` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/courses/{courseId}/roster-import-batches/{batchId}/rows/{rowId}/decision` | `resolveRosterDraftRow` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/endurance-capture-batches` | `createEnduranceBatch` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/courses/{courseId}/endurance-capture-batches` | `listEnduranceBatches` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/endurance-capture-batches/{batchId}` | `getEnduranceBatch` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/endurance-capture-batches/{batchId}/rows` | `listEnduranceDraftRows` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/courses/{courseId}/endurance-capture-batches/{batchId}/rows/{rowId}/decision` | `resolveEnduranceDraftRow` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/roster-import-batches/{batchId}/publication` | `publishRosterBatch` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/endurance-capture-batches/{batchId}/confirmation` | `confirmEnduranceDraftRows` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/roster-import-allocations` | `allocateRosterImport` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/roster-imports` | `importOfficialRoster` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/courses/{courseId}/members/{enrollmentId}/endurance-measurements` | `confirmEnduranceMeasurement` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/courses/{courseId}/members/{enrollmentId}/endurance-measurements` | `listEnduranceMeasurementHistory` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/assessment-roster` | `getAssessmentRosterProjection` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/assessment-roster/{projectionId}/rows` | `listAssessmentRosterRows` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/courses/{courseId}/assessment-roster-exports` | `requestAssessmentRosterExport` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/courses/{courseId}/assessment-roster-exports/{artifactId}` | `getAssessmentRosterExport` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/courses/{courseId}/assessment-roster-exports/{artifactId}/download-authorization` | `authorizeAssessmentRosterExportDownload` | TEACHER | — | RESPONSIBLE_TEACHER_ORIGINAL_BATCH / NORMAL_REQUIRED | REQUIRED_HEADER |
| POST | `/api/v1/admin/technical-service-revisions` | `publishTechnicalServiceRevision` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/admin/technical-service-revisions` | `listTechnicalServiceRevisions` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/admin/technical-service-status` | `getTechnicalServiceRunStatus` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/admin/manual-mode-windows` | `openManualModeWindow` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/admin/manual-mode-windows` | `listManualModeWindows` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/admin/manual-mode-windows/{windowId}/closure` | `closeManualModeWindow` | ADMIN | — | SUPER_ADMIN_ONLY / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/student/endurance-outcome` | `getOwnEnduranceOutcome` | STUDENT | — | SELF_ACTIVE_ENROLLMENT / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/courses/{courseId}/members/{enrollmentId}/final-grade-publications` | `listFinalGradeHistory` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/courses/{courseId}/members/{enrollmentId}/final-grade-publications` | `publishFinalGrade` | TEACHER | — | RESPONSIBLE_TEACHER / NORMAL_REQUIRED | REQUIRED_HEADER |
| GET | `/api/v1/teacher/historical-final-grade-remarks` | `listHistoricalFinalGradeRemarks` | TEACHER | — | ALL_AUTHENTICATED_CURRENT_TEACHERS_HISTORICAL_REMARK_READ_ONLY / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/student/notifications` | `listOwnStudentNotifications` | STUDENT | — | SELF / NORMAL_REQUIRED | READ_ONLY |
| GET | `/api/v1/student/notifications/unread-count` | `getOwnStudentUnreadNotificationCount` | STUDENT | — | SELF / NORMAL_REQUIRED | READ_ONLY |
| POST | `/api/v1/student/notifications/{notificationId}/read` | `markOwnStudentNotificationRead` | STUDENT | — | SELF / NORMAL_REQUIRED | REQUIRED_HEADER |
