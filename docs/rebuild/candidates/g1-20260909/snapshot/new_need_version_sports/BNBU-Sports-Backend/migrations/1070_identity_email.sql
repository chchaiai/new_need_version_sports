-- Up Migration
ALTER TABLE identity_access.auth_challenge ADD COLUMN sealed_email text;
ALTER TABLE identity_access.auth_challenge ADD CONSTRAINT challenge_email_payload CHECK(sealed_email IS NULL OR purpose='NEW_EMAIL_VERIFICATION');
-- Down Migration
ALTER TABLE identity_access.auth_challenge DROP CONSTRAINT challenge_email_payload, DROP COLUMN sealed_email;
