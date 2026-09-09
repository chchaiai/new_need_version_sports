-- Up Migration
ALTER TABLE identity_access.command_replay ADD COLUMN retention_subject_ids uuid[] NOT NULL DEFAULT '{}';
CREATE INDEX replay_personal_retention ON identity_access.command_replay USING gin(retention_subject_ids);
CREATE TABLE identity_access.account_closure_replay (
 subject text NOT NULL,operation text NOT NULL,key_digest text NOT NULL,fingerprint text NOT NULL,sealed_result text,
 PRIMARY KEY(subject,operation,key_digest)
);
-- Down Migration
DROP TABLE identity_access.account_closure_replay;
ALTER TABLE identity_access.command_replay DROP COLUMN retention_subject_ids;
