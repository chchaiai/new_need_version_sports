-- Up Migration
CREATE SCHEMA exercise_record;
CREATE TABLE exercise_record.record (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,owner_subject_id uuid NOT NULL,session_id uuid NOT NULL UNIQUE,
 category text NOT NULL CHECK(category IN ('COURSE_RELATED','OTHER')),
 description text NOT NULL CHECK(length(btrim(description)) BETWEEN 1 AND 200 AND description=btrim(description)),
 accepted_at timestamptz NOT NULL,accept_command_id uuid NOT NULL UNIQUE,
 session_status text NOT NULL DEFAULT 'COMPLETED' CHECK(session_status='COMPLETED'),
 FOREIGN KEY(session_id,organization_id,owner_subject_id) REFERENCES exercise_session.session(id,organization_id,student_subject_id),
 FOREIGN KEY(session_id,session_status) REFERENCES exercise_session.session(id,status),
 UNIQUE(id,organization_id,owner_subject_id,session_id),UNIQUE(id,accepted_at)
);
-- The authoritative original date/duration/rule remain in the immutable completed Session;
-- Application must verify completion and deadlines before this insert. No validity/credit default.
CREATE TABLE exercise_record.first_material (
 id uuid PRIMARY KEY,record_id uuid NOT NULL UNIQUE,organization_id uuid NOT NULL,owner_subject_id uuid NOT NULL,session_id uuid NOT NULL,
 batch_id uuid NOT NULL UNIQUE,accepted_at timestamptz NOT NULL,transfer_due_at timestamptz,
 required_asset_ids uuid[] NOT NULL CHECK(cardinality(required_asset_ids) BETWEEN 1 AND 7 AND array_position(required_asset_ids,NULL) IS NULL),
 window_kind text NOT NULL CHECK(window_kind IN ('ORDINARY','SWIMMING_TIMELY','SWIMMING_OFFLINE')),
 offline_explanation text,
 FOREIGN KEY(record_id,organization_id,owner_subject_id,session_id) REFERENCES exercise_record.record(id,organization_id,owner_subject_id,session_id),
 FOREIGN KEY(record_id,accepted_at) REFERENCES exercise_record.record(id,accepted_at),
 CHECK((window_kind='SWIMMING_OFFLINE' AND transfer_due_at IS NULL) OR
   (window_kind<>'SWIMMING_OFFLINE' AND transfer_due_at IS NOT NULL AND transfer_due_at=accepted_at+interval '30 minutes')),
 CHECK(window_kind<>'SWIMMING_OFFLINE' OR (offline_explanation IS NOT NULL AND length(btrim(offline_explanation))>0)),
 UNIQUE(id,organization_id,owner_subject_id,session_id)
);
CREATE TABLE exercise_record.first_material_asset (
 material_id uuid NOT NULL,asset_id uuid NOT NULL,organization_id uuid NOT NULL,owner_subject_id uuid NOT NULL,session_id uuid NOT NULL,
 position integer NOT NULL CHECK(position BETWEEN 0 AND 6),phase text CHECK(phase IN ('BEFORE','AFTER')),
 declared_checksum_sha256 bytea NOT NULL CHECK(octet_length(declared_checksum_sha256)=32),
 PRIMARY KEY(material_id,asset_id),UNIQUE(material_id,position),
 FOREIGN KEY(material_id,organization_id,owner_subject_id,session_id) REFERENCES exercise_record.first_material(id,organization_id,owner_subject_id,session_id),
 FOREIGN KEY(asset_id,organization_id,owner_subject_id,session_id) REFERENCES media_evidence.record_asset(id,organization_id,owner_subject_id,session_id)
);
ALTER TABLE media_evidence.record_asset ADD CONSTRAINT asset_record_scope_fk
 FOREIGN KEY(record_id,organization_id,owner_subject_id,session_id) REFERENCES exercise_record.record(id,organization_id,owner_subject_id,session_id);
CREATE FUNCTION exercise_record.reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'RECORD_MATERIAL_IMMUTABLE'; END $$;
CREATE TRIGGER record_immutable BEFORE UPDATE OR DELETE ON exercise_record.record FOR EACH ROW EXECUTE FUNCTION exercise_record.reject_mutation();
CREATE TRIGGER first_material_immutable BEFORE UPDATE OR DELETE ON exercise_record.first_material FOR EACH ROW EXECUTE FUNCTION exercise_record.reject_mutation();
CREATE TRIGGER first_material_asset_immutable BEFORE UPDATE OR DELETE ON exercise_record.first_material_asset FOR EACH ROW EXECUTE FUNCTION exercise_record.reject_mutation();
CREATE FUNCTION exercise_record.check_locked_members() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mid uuid; expected uuid[]; actual uuid[];
BEGIN
 IF TG_TABLE_NAME='first_material' THEN mid:=NEW.id; ELSE mid:=NEW.material_id; END IF;
 SELECT required_asset_ids INTO expected FROM exercise_record.first_material WHERE id=mid;
 SELECT array_agg(asset_id ORDER BY position) INTO actual FROM exercise_record.first_material_asset WHERE material_id=mid;
 IF expected IS DISTINCT FROM actual THEN RAISE EXCEPTION 'LOCKED_MANIFEST_MISMATCH'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER material_members AFTER INSERT ON exercise_record.first_material DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION exercise_record.check_locked_members();
CREATE CONSTRAINT TRIGGER asset_members AFTER INSERT ON exercise_record.first_material_asset DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION exercise_record.check_locked_members();
-- Down Migration
ALTER TABLE media_evidence.record_asset DROP CONSTRAINT asset_record_scope_fk;
DROP TABLE exercise_record.first_material_asset;
DROP TABLE exercise_record.first_material;
DROP TABLE exercise_record.record;
DROP FUNCTION exercise_record.check_locked_members();
DROP FUNCTION exercise_record.reject_mutation();
DROP SCHEMA exercise_record;
