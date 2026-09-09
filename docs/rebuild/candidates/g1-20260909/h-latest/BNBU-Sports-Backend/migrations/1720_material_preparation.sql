-- Up Migration
-- Immutable preparation event, not an externally visible Review Case or verdict.
CREATE TABLE exercise_record.material_preparation (
 material_id uuid PRIMARY KEY,event_id uuid NOT NULL UNIQUE,organization_id uuid NOT NULL,owner_subject_id uuid NOT NULL,session_id uuid NOT NULL,
 completed_at timestamptz NOT NULL,prepared_at timestamptz NOT NULL CHECK(prepared_at>=completed_at),
 source_revision bigint NOT NULL CHECK(source_revision>=0),
 FOREIGN KEY(material_id,organization_id,owner_subject_id,session_id)
 REFERENCES exercise_record.first_material(id,organization_id,owner_subject_id,session_id)
);
CREATE TRIGGER material_preparation_immutable BEFORE UPDATE OR DELETE ON exercise_record.material_preparation
 FOR EACH ROW EXECUTE FUNCTION exercise_record.reject_mutation();
-- Down Migration
DROP TABLE exercise_record.material_preparation;
