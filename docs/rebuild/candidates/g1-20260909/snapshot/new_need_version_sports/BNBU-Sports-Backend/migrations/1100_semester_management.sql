-- Up Migration
CREATE TABLE academic_term.catalog_state(organization_id uuid PRIMARY KEY REFERENCES identity_access.organization(id));
CREATE TABLE academic_term.semester_transition(
 id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES identity_access.organization(id),previous_semester_id uuid,
 current_semester_id uuid NOT NULL,actor_subject_id uuid NOT NULL REFERENCES identity_access.user_subject(id),occurred_at timestamptz NOT NULL,
 FOREIGN KEY(previous_semester_id,organization_id) REFERENCES academic_term.semester(id,organization_id),
 FOREIGN KEY(current_semester_id,organization_id) REFERENCES academic_term.semester(id,organization_id)
);
CREATE TRIGGER semester_transition_immutable BEFORE UPDATE OR DELETE ON academic_term.semester_transition FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TABLE academic_term.command_replay(subject text NOT NULL,operation text NOT NULL,key_digest text NOT NULL,fingerprint text NOT NULL,sealed_result text,PRIMARY KEY(subject,operation,key_digest));
ALTER TABLE academic_term.semester ADD CONSTRAINT consecutive_academic_year CHECK(substring(academic_year,6,4)::integer=substring(academic_year,1,4)::integer+1);
-- Down Migration
ALTER TABLE academic_term.semester DROP CONSTRAINT consecutive_academic_year;
DROP TABLE academic_term.command_replay;
DROP TABLE academic_term.semester_transition;
DROP TABLE academic_term.catalog_state;
