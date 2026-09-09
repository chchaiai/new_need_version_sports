-- Up Migration
CREATE SCHEMA course_enrollment;
CREATE TABLE course_enrollment.rule_template_version (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES identity_access.organization(id),
 version_no bigint NOT NULL CHECK(version_no>=1), label_zh text NOT NULL,label_en text NOT NULL,published_at timestamptz NOT NULL,
 UNIQUE(organization_id,version_no),UNIQUE(id,organization_id)
);
CREATE TRIGGER template_immutable BEFORE UPDATE OR DELETE ON course_enrollment.rule_template_version FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TABLE course_enrollment.course (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,semester_id uuid NOT NULL,responsible_teacher_subject_id uuid NOT NULL,
 teacher_name_snapshot text NOT NULL,name text NOT NULL CHECK(length(btrim(name))>0),description text,
 status text NOT NULL CHECK(status IN ('DRAFT','OPEN','CLOSED')),join_open boolean NOT NULL,
 rule jsonb NOT NULL,published_rule jsonb,version bigint NOT NULL CHECK(version>=0),target_revision bigint NOT NULL CHECK(target_revision>=1),
 updated_at timestamptz NOT NULL,closed_at timestamptz,
 FOREIGN KEY(semester_id,organization_id) REFERENCES academic_term.semester(id,organization_id),
 FOREIGN KEY(responsible_teacher_subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id),
 UNIQUE(id,organization_id,semester_id),UNIQUE(id,organization_id),
 CHECK((status='DRAFT' AND published_rule IS NULL AND closed_at IS NULL AND NOT join_open) OR
 (status='OPEN' AND published_rule IS NOT NULL AND closed_at IS NULL) OR
 (status='CLOSED' AND published_rule IS NOT NULL AND closed_at IS NOT NULL AND NOT join_open)),
 CHECK((rule->>'courseRelatedTargetMinutes')::integer>=0 AND (rule->>'otherTargetMinutes')::integer>=0 AND
 (rule->>'courseRelatedTargetMinutes')::integer+(rule->>'otherTargetMinutes')::integer=1200)
);
CREATE FUNCTION course_enrollment.protect_course() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.responsible_teacher_subject_id<>OLD.responsible_teacher_subject_id OR NEW.semester_id<>OLD.semester_id OR NEW.organization_id<>OLD.organization_id OR
 (OLD.status<>'DRAFT' AND (NEW.rule IS DISTINCT FROM OLD.rule OR NEW.published_rule IS DISTINCT FROM OLD.published_rule)) OR
 (OLD.status='CLOSED' AND NEW.status<>'CLOSED') THEN RAISE EXCEPTION 'COURSE_RULES_LOCKED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER course_frozen BEFORE UPDATE ON course_enrollment.course FOR EACH ROW EXECUTE FUNCTION course_enrollment.protect_course();
CREATE TABLE course_enrollment.course_target_revision (
 id uuid PRIMARY KEY,course_id uuid NOT NULL REFERENCES course_enrollment.course(id),revision_no bigint NOT NULL,
 rule jsonb NOT NULL,actor_subject_id uuid NOT NULL REFERENCES identity_access.user_subject(id),occurred_at timestamptz NOT NULL,
 UNIQUE(course_id,revision_no)
);
CREATE TRIGGER target_immutable BEFORE UPDATE OR DELETE ON course_enrollment.course_target_revision FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TABLE course_enrollment.course_invitation (
 id uuid PRIMARY KEY,course_id uuid NOT NULL REFERENCES course_enrollment.course(id),code_digest text NOT NULL UNIQUE,
 display_suffix text NOT NULL,revoked boolean NOT NULL DEFAULT false,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL,
 version bigint NOT NULL CHECK(version>=0),CHECK(expires_at>created_at)
);
CREATE TABLE course_enrollment.invitation_flow (
 id uuid PRIMARY KEY,invitation_id uuid NOT NULL REFERENCES course_enrollment.course_invitation(id),subject text NOT NULL,
 authorization_digest text,student_subject_id uuid REFERENCES identity_access.user_subject(id),registered_at timestamptz NOT NULL,
 original_expires_at timestamptz NOT NULL,grace_ends_at timestamptz NOT NULL,status text NOT NULL CHECK(status IN ('REGISTERED','COMPLETED','TERMINATED')),
 version bigint NOT NULL CHECK(version>=0),UNIQUE(invitation_id,subject),
 CHECK(registered_at<original_expires_at),CHECK(grace_ends_at=original_expires_at+interval '10 minutes')
);
CREATE TABLE course_enrollment.enrollment (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,semester_id uuid NOT NULL,course_id uuid NOT NULL,student_subject_id uuid NOT NULL,
 status text NOT NULL CHECK(status IN ('ACTIVE','REMOVED')),joined_at timestamptz NOT NULL,removed_at timestamptz,student_visible_reason text,
 version bigint NOT NULL CHECK(version>=0),UNIQUE(course_id,student_subject_id),UNIQUE(id,course_id),
 FOREIGN KEY(course_id,organization_id,semester_id) REFERENCES course_enrollment.course(id,organization_id,semester_id),
 FOREIGN KEY(student_subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id),
 CHECK((status='ACTIVE' AND removed_at IS NULL) OR(status='REMOVED' AND removed_at IS NOT NULL AND length(btrim(student_visible_reason))>0))
);
CREATE UNIQUE INDEX one_active_course ON course_enrollment.enrollment(organization_id,semester_id,student_subject_id) WHERE status='ACTIVE';
CREATE TABLE course_enrollment.enrollment_event (
 id uuid PRIMARY KEY,enrollment_id uuid NOT NULL REFERENCES course_enrollment.enrollment(id),sequence_no bigint NOT NULL,
 from_status text,to_status text NOT NULL CHECK(to_status IN ('ACTIVE','REMOVED')),actor_subject_id uuid NOT NULL REFERENCES identity_access.user_subject(id),
 student_visible_reason text,occurred_at timestamptz NOT NULL,UNIQUE(enrollment_id,sequence_no)
);
CREATE TRIGGER enrollment_event_immutable BEFORE UPDATE OR DELETE ON course_enrollment.enrollment_event FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TABLE course_enrollment.publication_plan (
 id uuid PRIMARY KEY,course_id uuid NOT NULL REFERENCES course_enrollment.course(id),draft_version bigint NOT NULL,
 semester_version bigint NOT NULL,calendar_version text NOT NULL,template_id uuid NOT NULL REFERENCES course_enrollment.rule_template_version(id),
 result text NOT NULL CHECK(result IN ('FEASIBLE','INFEASIBLE','UNAVAILABLE')),proof_kind text NOT NULL,
 witness jsonb NOT NULL,token_digest text UNIQUE,computed_at timestamptz NOT NULL
);
CREATE TABLE course_enrollment.change_impact (
 token_digest text PRIMARY KEY,course_id uuid NOT NULL REFERENCES course_enrollment.course(id),actor_subject_id uuid NOT NULL REFERENCES identity_access.user_subject(id),
 expected_version bigint NOT NULL,name text NOT NULL,description text,expires_at timestamptz NOT NULL,membership_digest text NOT NULL
);
CREATE TABLE course_enrollment.makeup_authorization (
 id uuid PRIMARY KEY,course_id uuid NOT NULL,enrollment_id uuid NOT NULL,rule_version_id uuid NOT NULL,starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,authorized_at timestamptz NOT NULL,actor_subject_id uuid NOT NULL REFERENCES identity_access.user_subject(id),
 CHECK(ends_at>starts_at),FOREIGN KEY(enrollment_id,course_id) REFERENCES course_enrollment.enrollment(id,course_id)
);
CREATE TABLE course_enrollment.command_replay(subject text NOT NULL,operation text NOT NULL,key_digest text NOT NULL,fingerprint text NOT NULL,sealed_result text,PRIMARY KEY(subject,operation,key_digest));
-- Down Migration
DROP SCHEMA course_enrollment CASCADE;
