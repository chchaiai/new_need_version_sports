-- Up Migration
-- Z-owned reference targets only. H creates Session/Media/Record tables in 1500+.
ALTER TABLE course_enrollment.course
 ADD COLUMN published_rule_version_id uuid GENERATED ALWAYS AS ((published_rule->>'ruleVersionId')::uuid) STORED,
 ADD CONSTRAINT course_published_rule_id_required CHECK(published_rule IS NULL OR published_rule_version_id IS NOT NULL),
 ADD CONSTRAINT course_rule_reference_key UNIQUE(id,published_rule_version_id),
 ADD CONSTRAINT course_session_reference_key UNIQUE(id,organization_id,semester_id,published_rule_version_id);
ALTER TABLE course_enrollment.enrollment
 ADD CONSTRAINT enrollment_session_reference_key UNIQUE(id,organization_id,semester_id,course_id,student_subject_id);
ALTER TABLE course_enrollment.makeup_authorization
 ADD CONSTRAINT makeup_published_rule_fk FOREIGN KEY(course_id,rule_version_id)
 REFERENCES course_enrollment.course(id,published_rule_version_id),
 ADD CONSTRAINT makeup_session_reference_key UNIQUE(id,course_id,enrollment_id,rule_version_id);
-- Down Migration
-- H 1500+ migrations must be rolled down before these referenced keys.
ALTER TABLE course_enrollment.makeup_authorization
 DROP CONSTRAINT makeup_session_reference_key, DROP CONSTRAINT makeup_published_rule_fk;
ALTER TABLE course_enrollment.enrollment DROP CONSTRAINT enrollment_session_reference_key;
ALTER TABLE course_enrollment.course
 DROP CONSTRAINT course_session_reference_key, DROP CONSTRAINT course_rule_reference_key,
 DROP CONSTRAINT course_published_rule_id_required, DROP COLUMN published_rule_version_id;
