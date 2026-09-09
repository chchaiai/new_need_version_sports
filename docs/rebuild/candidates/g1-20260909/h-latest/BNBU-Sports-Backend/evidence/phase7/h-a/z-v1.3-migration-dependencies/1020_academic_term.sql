-- Up Migration
CREATE SCHEMA academic_term;
CREATE TABLE academic_term.semester (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES identity_access.organization(id),
 academic_year text NOT NULL CHECK(academic_year ~ '^[0-9]{4}-[0-9]{4}$'), term_type text NOT NULL CHECK(term_type IN ('FIRST','SECOND','SUMMER')),
 display_name text NOT NULL CHECK(length(btrim(display_name))>0), start_date date NOT NULL, end_date date NOT NULL,
 status text NOT NULL CHECK(status IN ('UPCOMING','CURRENT','ARCHIVED')), version bigint NOT NULL CHECK(version>=0),
 created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, CHECK(end_date>=start_date),
 UNIQUE(id,organization_id), UNIQUE(organization_id,academic_year,term_type)
);
CREATE UNIQUE INDEX one_current_semester ON academic_term.semester(organization_id) WHERE status='CURRENT';
CREATE FUNCTION academic_term.guard_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status='ARCHIVED' OR (OLD.status='CURRENT' AND NEW.status<>'ARCHIVED') THEN RAISE EXCEPTION 'SEMESTER_HISTORY_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER semester_lifecycle BEFORE UPDATE ON academic_term.semester FOR EACH ROW EXECUTE FUNCTION academic_term.guard_history();
-- Down Migration
DROP SCHEMA academic_term CASCADE;
