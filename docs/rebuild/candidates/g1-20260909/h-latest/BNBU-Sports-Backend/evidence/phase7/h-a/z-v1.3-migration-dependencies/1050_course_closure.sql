-- Up Migration
CREATE TABLE course_enrollment.course_closure (
 course_id uuid PRIMARY KEY REFERENCES course_enrollment.course(id), actor_subject_id uuid NOT NULL REFERENCES identity_access.user_subject(id),
 reason text NOT NULL CHECK(length(btrim(reason))>0),closed_at timestamptz NOT NULL
);
CREATE TRIGGER closure_immutable BEFORE UPDATE OR DELETE ON course_enrollment.course_closure FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
-- Down Migration
DROP TABLE course_enrollment.course_closure;
