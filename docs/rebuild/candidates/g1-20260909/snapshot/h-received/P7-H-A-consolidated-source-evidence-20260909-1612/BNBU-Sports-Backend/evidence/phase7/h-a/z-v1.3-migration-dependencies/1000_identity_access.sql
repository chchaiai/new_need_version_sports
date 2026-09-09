-- Up Migration
CREATE SCHEMA identity_access;
CREATE TABLE identity_access.organization (
 id uuid PRIMARY KEY, code text UNIQUE NOT NULL, name text NOT NULL,
 business_timezone text NOT NULL CHECK(business_timezone='Asia/Shanghai'), created_at timestamptz NOT NULL
);
CREATE TABLE identity_access.user_subject (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES identity_access.organization(id),
 role_snapshot text NOT NULL CHECK(role_snapshot IN ('STUDENT','TEACHER','ADMIN')),
 created_at timestamptz NOT NULL, closed_at timestamptz CHECK(closed_at>=created_at), UNIQUE(id,organization_id)
);
CREATE FUNCTION identity_access.protect_subject() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
 NEW.role_snapshot IS DISTINCT FROM OLD.role_snapshot OR NEW.created_at IS DISTINCT FROM OLD.created_at OR
 (OLD.closed_at IS NOT NULL AND NEW.closed_at IS DISTINCT FROM OLD.closed_at) THEN
 RAISE EXCEPTION 'IMMUTABLE_SUBJECT'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER subject_immutable BEFORE UPDATE ON identity_access.user_subject FOR EACH ROW EXECUTE FUNCTION identity_access.protect_subject();
CREATE TABLE identity_access.login_account (
 subject_id uuid PRIMARY KEY, organization_id uuid NOT NULL,
 email_normalized text NOT NULL CHECK(email_normalized=lower(btrim(email_normalized))), email_verified_at timestamptz,
 access_state text NOT NULL CHECK(access_state IN ('ACTIVE','DISABLED')), created_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL, version bigint NOT NULL DEFAULT 0 CHECK(version>=0),
 FOREIGN KEY(subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id),
 UNIQUE(organization_id,email_normalized)
);
CREATE FUNCTION identity_access.protect_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM identity_access.user_subject WHERE id=NEW.subject_id AND organization_id=NEW.organization_id AND closed_at IS NULL) THEN
 RAISE EXCEPTION 'SUBJECT_CLOSED'; END IF; RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER current_subject AFTER INSERT OR UPDATE ON identity_access.login_account DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION identity_access.protect_account();
CREATE TABLE identity_access.password_credential (
 subject_id uuid PRIMARY KEY REFERENCES identity_access.login_account(subject_id) ON DELETE CASCADE,
 password_phc text NOT NULL, must_change boolean NOT NULL, password_version bigint NOT NULL CHECK(password_version>=0), changed_at timestamptz NOT NULL
);
CREATE TABLE identity_access.auth_session (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES identity_access.organization(id),
 subject_id uuid NOT NULL REFERENCES identity_access.login_account(subject_id) ON DELETE CASCADE,
 access_token_digest text NOT NULL UNIQUE, refresh_token_digest text NOT NULL UNIQUE,
 password_version bigint NOT NULL CHECK(password_version>=0), issued_at timestamptz NOT NULL,
 access_expires_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 revoked_at timestamptz, revoke_reason text,
 CHECK(access_expires_at>issued_at), CHECK(expires_at>=access_expires_at)
);
CREATE INDEX auth_session_subject ON identity_access.auth_session(subject_id,revoked_at,expires_at);
CREATE TABLE identity_access.teacher_profile (
 subject_id uuid PRIMARY KEY REFERENCES identity_access.login_account(subject_id) ON DELETE CASCADE,
 organization_id uuid NOT NULL, employee_id text NOT NULL, name text NOT NULL CHECK(length(btrim(name))>0), college text,
 UNIQUE(organization_id,employee_id), FOREIGN KEY(subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id)
);
CREATE TABLE identity_access.student_profile (
 subject_id uuid PRIMARY KEY REFERENCES identity_access.login_account(subject_id) ON DELETE CASCADE,
 organization_id uuid NOT NULL, student_number text NOT NULL, name text NOT NULL CHECK(length(btrim(name))>0),
 gender text NOT NULL CHECK(gender IN ('FEMALE','MALE')), grade_year integer NOT NULL CHECK(grade_year BETWEEN 1 AND 4),
 college text, major text, administrative_class text,
 UNIQUE(organization_id,student_number), FOREIGN KEY(subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id)
);
CREATE TABLE identity_access.admin_profile (
 subject_id uuid PRIMARY KEY REFERENCES identity_access.login_account(subject_id) ON DELETE CASCADE,
 organization_id uuid NOT NULL, admin_kind text NOT NULL CHECK(admin_kind IN ('SUPER','SUB')),
 login_name_normalized text UNIQUE, name text NOT NULL, created_by_super_admin_subject_id uuid REFERENCES identity_access.user_subject(id),
 CHECK(admin_kind<>'SUB' OR (login_name_normalized IS NOT NULL AND created_by_super_admin_subject_id IS NOT NULL)),
 CHECK(admin_kind<>'SUPER' OR login_name_normalized IS NULL),
 FOREIGN KEY(subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id)
);
CREATE UNIQUE INDEX one_super_admin ON identity_access.admin_profile(organization_id) WHERE admin_kind='SUPER';
CREATE TABLE identity_access.auth_challenge (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES identity_access.organization(id),
 subject_id uuid REFERENCES identity_access.login_account(subject_id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK(purpose IN ('STUDENT_LOGIN','STUDENT_EMAIL_BINDING','PASSWORD_RESET','CURRENT_EMAIL_VERIFICATION','NEW_EMAIL_VERIFICATION','ACCOUNT_DELETION')),
 email_digest text NOT NULL, code_digest text NOT NULL, attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 max_attempts integer NOT NULL CHECK(max_attempts>0), created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 consumed_at timestamptz, CHECK(expires_at>created_at)
);
CREATE INDEX challenge_email ON identity_access.auth_challenge(email_digest,purpose,created_at);
CREATE TABLE identity_access.command_replay (
 subject text NOT NULL, operation text NOT NULL, key_digest text NOT NULL, fingerprint text NOT NULL,
 sealed_result text, PRIMARY KEY(subject,operation,key_digest)
);
CREATE TABLE identity_access.auth_throttle (
 bucket_digest text PRIMARY KEY, window_start timestamptz NOT NULL, attempts integer NOT NULL CHECK(attempts>=0)
);
-- Down Migration
DROP SCHEMA identity_access CASCADE;
