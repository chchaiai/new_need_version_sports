-- Up Migration
-- G1 record-evidence slice only; application evidence is not silently accepted here.
CREATE SCHEMA media_evidence;
CREATE TABLE media_evidence.record_asset (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,owner_subject_id uuid NOT NULL,session_id uuid NOT NULL,
 object_key text NOT NULL UNIQUE CHECK(length(object_key)>0),
 media_kind text NOT NULL CHECK(media_kind IN ('IMAGE','VIDEO')),
 declared_content_type text NOT NULL,declared_byte_size bigint NOT NULL CHECK(declared_byte_size>0),
 status text NOT NULL CHECK(status IN ('ALLOCATED','UPLOADED','VERIFIED','BOUND','REJECTED','EXPIRED')),
 created_at timestamptz NOT NULL,uploaded_at timestamptz CHECK(uploaded_at>=created_at),verified_at timestamptz,
 object_version text,content_type text,byte_size bigint,checksum_sha256 bytea,
 duration_ms integer,has_audio boolean,record_id uuid,
 version bigint NOT NULL CHECK(version>=0),
 FOREIGN KEY(session_id,organization_id,owner_subject_id)
  REFERENCES exercise_session.session(id,organization_id,student_subject_id),
 UNIQUE(id,organization_id,owner_subject_id,session_id),
 CHECK((media_kind='IMAGE' AND declared_content_type IN ('image/jpeg','image/png') AND declared_byte_size<=10485760)
    OR (media_kind='VIDEO' AND declared_content_type='video/mp4' AND declared_byte_size<=104857600)),
 CHECK(status NOT IN ('UPLOADED','VERIFIED','BOUND') OR (uploaded_at IS NOT NULL AND object_version IS NOT NULL)),
 CHECK(status NOT IN ('VERIFIED','BOUND') OR (verified_at IS NOT NULL AND uploaded_at<=verified_at AND
   content_type IS NOT NULL AND byte_size IS NOT NULL AND byte_size>0 AND checksum_sha256 IS NOT NULL AND octet_length(checksum_sha256)=32)),
 CHECK(status NOT IN ('VERIFIED','BOUND') OR
   (media_kind='IMAGE' AND content_type IN ('image/jpeg','image/png') AND byte_size<=10485760 AND duration_ms IS NULL AND has_audio IS NULL) OR
   (media_kind='VIDEO' AND content_type='video/mp4' AND byte_size<=104857600 AND duration_ms IS NOT NULL AND duration_ms BETWEEN 1000 AND 15000 AND has_audio IS TRUE)),
 CHECK((status='BOUND' AND record_id IS NOT NULL) OR (status<>'BOUND' AND record_id IS NULL))
);
CREATE FUNCTION media_evidence.guard_record_asset() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'MEDIA_HISTORY_IMMUTABLE'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'ALLOCATED' OR NEW.version<>0 OR NEW.uploaded_at IS NOT NULL OR NEW.verified_at IS NOT NULL OR
     NEW.object_version IS NOT NULL OR NEW.content_type IS NOT NULL OR NEW.byte_size IS NOT NULL OR
     NEW.checksum_sha256 IS NOT NULL OR NEW.duration_ms IS NOT NULL OR NEW.has_audio IS NOT NULL THEN
   RAISE EXCEPTION 'MEDIA_INITIAL_STATE_INVALID'; END IF;
  RETURN NEW;
 END IF;
 IF ROW(NEW.id,NEW.organization_id,NEW.owner_subject_id,NEW.session_id,NEW.object_key,NEW.media_kind,NEW.declared_content_type,NEW.declared_byte_size,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.id,OLD.organization_id,OLD.owner_subject_id,OLD.session_id,OLD.object_key,OLD.media_kind,OLD.declared_content_type,OLD.declared_byte_size,OLD.created_at)
 OR NEW.version<>OLD.version+1 OR NOT (
   (OLD.status='ALLOCATED' AND NEW.status IN ('UPLOADED','REJECTED','EXPIRED')) OR
   (OLD.status='UPLOADED' AND NEW.status IN ('VERIFIED','REJECTED','EXPIRED')) OR
   (OLD.status='VERIFIED' AND NEW.status='BOUND')) THEN RAISE EXCEPTION 'MEDIA_TRANSITION_REJECTED'; END IF;
 IF OLD.uploaded_at IS NOT NULL AND ROW(NEW.uploaded_at,NEW.object_version) IS DISTINCT FROM ROW(OLD.uploaded_at,OLD.object_version) THEN
  RAISE EXCEPTION 'MEDIA_OBJECT_IMMUTABLE'; END IF;
 IF OLD.status='VERIFIED' AND ROW(NEW.verified_at,NEW.content_type,NEW.byte_size,NEW.checksum_sha256,NEW.duration_ms,NEW.has_audio)
 IS DISTINCT FROM ROW(OLD.verified_at,OLD.content_type,OLD.byte_size,OLD.checksum_sha256,OLD.duration_ms,OLD.has_audio) THEN
  RAISE EXCEPTION 'MEDIA_VERIFICATION_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER record_asset_guard BEFORE INSERT OR UPDATE OR DELETE ON media_evidence.record_asset
 FOR EACH ROW EXECUTE FUNCTION media_evidence.guard_record_asset();
-- record_id composite FK is installed by 1700 after the Record table exists; do not deploy only 1600.
-- Down Migration
DROP TABLE media_evidence.record_asset;
DROP FUNCTION media_evidence.guard_record_asset();
DROP SCHEMA media_evidence;
