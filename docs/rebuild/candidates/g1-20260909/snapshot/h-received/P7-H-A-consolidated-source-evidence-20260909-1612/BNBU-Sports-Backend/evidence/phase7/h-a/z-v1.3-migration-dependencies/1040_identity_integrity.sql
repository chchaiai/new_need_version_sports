-- Up Migration
ALTER TABLE identity_access.auth_session ADD CONSTRAINT session_organization FOREIGN KEY(subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id);
CREATE FUNCTION identity_access.enforce_profile_role() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE role_value text;
BEGIN
 SELECT role_snapshot INTO role_value FROM identity_access.user_subject WHERE id=NEW.subject_id AND closed_at IS NULL;
 IF role_value IS DISTINCT FROM TG_ARGV[0] THEN RAISE EXCEPTION 'PROFILE_ROLE_MISMATCH'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER student_role BEFORE INSERT OR UPDATE ON identity_access.student_profile FOR EACH ROW EXECUTE FUNCTION identity_access.enforce_profile_role('STUDENT');
CREATE TRIGGER teacher_role BEFORE INSERT OR UPDATE ON identity_access.teacher_profile FOR EACH ROW EXECUTE FUNCTION identity_access.enforce_profile_role('TEACHER');
CREATE TRIGGER admin_role BEFORE INSERT OR UPDATE ON identity_access.admin_profile FOR EACH ROW EXECUTE FUNCTION identity_access.enforce_profile_role('ADMIN');
ALTER TABLE course_enrollment.course ADD COLUMN template_version_id uuid GENERATED ALWAYS AS ((rule->>'templateVersionId')::uuid) STORED;
ALTER TABLE course_enrollment.course ADD CONSTRAINT course_template_owner FOREIGN KEY(template_version_id,organization_id) REFERENCES course_enrollment.rule_template_version(id,organization_id);
ALTER TABLE course_enrollment.course ADD CONSTRAINT course_rule_required CHECK(
 rule ?& ARRAY['templateVersionId','courseRelatedTargetMinutes','otherTargetMinutes','thresholdMinutes','weeklyCountLimit','allowedIntervals','regularCutoffAt','plannedSettlementAt']
 AND (rule->>'thresholdMinutes')::integer IN (30,45,60) AND (rule->>'weeklyCountLimit')::integer IN (2,3,4)
 AND jsonb_typeof(rule->'allowedIntervals')='array' AND jsonb_array_length(rule->'allowedIntervals')>0);
-- Down Migration
ALTER TABLE course_enrollment.course DROP CONSTRAINT course_rule_required;
ALTER TABLE course_enrollment.course DROP CONSTRAINT course_template_owner;
ALTER TABLE course_enrollment.course DROP COLUMN template_version_id;
DROP TRIGGER admin_role ON identity_access.admin_profile;
DROP TRIGGER teacher_role ON identity_access.teacher_profile;
DROP TRIGGER student_role ON identity_access.student_profile;
DROP FUNCTION identity_access.enforce_profile_role();
ALTER TABLE identity_access.auth_session DROP CONSTRAINT session_organization;
