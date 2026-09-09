-- Up Migration
ALTER TABLE identity_access.admin_profile ADD COLUMN department text;
ALTER TABLE identity_access.teacher_profile ADD COLUMN title text, ADD COLUMN department text;
CREATE TABLE identity_access.admin_permission (
 subject_id uuid NOT NULL REFERENCES identity_access.admin_profile(subject_id) ON DELETE CASCADE,
 permission text NOT NULL CHECK(permission IN ('COURSE_VIEW','SEMESTER','USERS_ACCOUNTS','FEEDBACK','GLOBAL_RULES','SYSTEM_MODE','HELP_CENTER','AUDIT_QUERY')),
 PRIMARY KEY(subject_id,permission)
);
CREATE TABLE identity_access.teacher_batch_validation (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES identity_access.organization(id),
 actor_subject_id uuid NOT NULL REFERENCES identity_access.user_subject(id),preview_key_digest text NOT NULL,sealed_rows text,valid boolean NOT NULL,
 created_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,consumed_at timestamptz,CHECK(expires_at>created_at)
);
CREATE TABLE identity_access.governance_event (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,subject_id uuid NOT NULL,actor_subject_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('SUB_ADMIN_CREATED','SUB_ADMIN_UPDATED','SUB_ADMIN_STATE_CHANGED','SUB_ADMIN_DELETED','TEACHER_ACCOUNT_CREATED','TEACHER_ACCOUNT_DELETED')),
 before_state text CHECK(before_state IN ('ACTIVE','DISABLED','RECOVERY_REQUIRED')),after_state text CHECK(after_state IN ('ACTIVE','DISABLED','RECOVERY_REQUIRED')),
 before_permissions text[],after_permissions text[],reason text,occurred_at timestamptz NOT NULL,
 FOREIGN KEY(subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id),
 FOREIGN KEY(actor_subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id)
);
CREATE TRIGGER governance_event_immutable BEFORE UPDATE OR DELETE ON identity_access.governance_event FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
-- Down Migration
DROP TABLE identity_access.governance_event;
DROP TABLE identity_access.teacher_batch_validation;
DROP TABLE identity_access.admin_permission;
ALTER TABLE identity_access.teacher_profile DROP COLUMN title,DROP COLUMN department;
ALTER TABLE identity_access.admin_profile DROP COLUMN department;
