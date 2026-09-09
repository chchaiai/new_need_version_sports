-- Up Migration
CREATE TABLE exercise_record.command_replay (
 subject text NOT NULL,operation text NOT NULL,key_digest text NOT NULL,fingerprint text NOT NULL,sealed_result text,
 PRIMARY KEY(subject,operation,key_digest)
);
CREATE TABLE exercise_record.acceptance_outbox (
 event_id uuid PRIMARY KEY,organization_id uuid NOT NULL,owner_subject_id uuid NOT NULL,session_id uuid NOT NULL,
 record_id uuid NOT NULL UNIQUE,material_id uuid NOT NULL UNIQUE,source_revision bigint NOT NULL CHECK(source_revision>=0),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(record_id,organization_id,owner_subject_id,session_id) REFERENCES exercise_record.record(id,organization_id,owner_subject_id,session_id),
 FOREIGN KEY(material_id,organization_id,owner_subject_id,session_id) REFERENCES exercise_record.first_material(id,organization_id,owner_subject_id,session_id)
);
CREATE TRIGGER acceptance_outbox_immutable BEFORE UPDATE OR DELETE ON exercise_record.acceptance_outbox
 FOR EACH ROW EXECUTE FUNCTION exercise_record.reject_mutation();
-- Down Migration
DROP TABLE exercise_record.acceptance_outbox;
DROP TABLE exercise_record.command_replay;
