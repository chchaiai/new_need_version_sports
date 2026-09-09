-- Up Migration
CREATE SCHEMA audit;
CREATE TABLE audit.audit_event (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES identity_access.organization(id),
 actor_subject_id uuid NOT NULL, action text NOT NULL, resource_id uuid NOT NULL, request_id text NOT NULL,
 occurred_at timestamptz NOT NULL, FOREIGN KEY(actor_subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id)
);
CREATE FUNCTION audit.reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'APPEND_ONLY_FACT'; END $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit.audit_event FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE SCHEMA system_mode;
CREATE TABLE system_mode.state (
 organization_id uuid PRIMARY KEY REFERENCES identity_access.organization(id),
 mode text NOT NULL CHECK(mode IN ('NORMAL','MAINTENANCE')), policy_version bigint NOT NULL CHECK(policy_version>=0),
 announcement jsonb, version bigint NOT NULL CHECK(version>=0), updated_at timestamptz NOT NULL,
 CHECK((mode='NORMAL' AND announcement IS NULL) OR (mode='MAINTENANCE' AND announcement IS NOT NULL))
);
CREATE TABLE system_mode.transition (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES identity_access.organization(id),
 sequence_no bigint NOT NULL, from_mode text NOT NULL CHECK(from_mode IN ('NORMAL','MAINTENANCE')),
 to_mode text NOT NULL CHECK(to_mode IN ('NORMAL','MAINTENANCE')), reason text NOT NULL CHECK(length(btrim(reason))>0),
 announcement jsonb, actor_subject_id uuid NOT NULL, occurred_at timestamptz NOT NULL,
 UNIQUE(organization_id,sequence_no), CHECK(from_mode<>to_mode),
 FOREIGN KEY(actor_subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id)
);
CREATE TRIGGER transition_immutable BEFORE UPDATE OR DELETE ON system_mode.transition FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TABLE system_mode.command_replay (subject text NOT NULL,operation text NOT NULL,key_digest text NOT NULL,fingerprint text NOT NULL,sealed_result text,PRIMARY KEY(subject,operation,key_digest));
CREATE SCHEMA notification_center;
CREATE TABLE notification_center.in_app_notification (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES identity_access.organization(id),
 recipient_subject_id uuid NOT NULL, event_key text NOT NULL,
 notification_type text NOT NULL, title text NOT NULL, body text NOT NULL,
 target_route text NOT NULL CHECK(target_route IN ('COURSE','SYSTEM_MODE')), target_id uuid,
 created_at timestamptz NOT NULL, read_at timestamptz,
 UNIQUE(recipient_subject_id,event_key), FOREIGN KEY(recipient_subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id)
);
-- Down Migration
DROP SCHEMA notification_center CASCADE;
DROP SCHEMA system_mode CASCADE;
DROP SCHEMA audit CASCADE;
