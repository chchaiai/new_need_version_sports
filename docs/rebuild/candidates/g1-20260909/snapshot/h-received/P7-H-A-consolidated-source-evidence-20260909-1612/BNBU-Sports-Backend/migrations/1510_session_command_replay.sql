-- Up Migration
CREATE TABLE exercise_session.command_replay (
 subject text NOT NULL, operation text NOT NULL, key_digest text NOT NULL,
 fingerprint text NOT NULL, sealed_result text,
 PRIMARY KEY(subject,operation,key_digest)
);
-- Down Migration
DROP TABLE exercise_session.command_replay;
