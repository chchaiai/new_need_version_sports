-- Up Migration
CREATE TABLE notification_center.command_replay (
 subject text NOT NULL, operation text NOT NULL, key_digest text NOT NULL,
 fingerprint text NOT NULL, sealed_result text,
 PRIMARY KEY(subject,operation,key_digest)
);
-- Down Migration
DROP TABLE notification_center.command_replay;
