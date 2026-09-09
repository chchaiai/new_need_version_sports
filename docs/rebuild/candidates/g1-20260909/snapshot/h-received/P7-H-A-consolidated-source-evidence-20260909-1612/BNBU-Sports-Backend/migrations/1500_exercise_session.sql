-- Up Migration
-- Requires Z 1000..1060. Extension is retained on down; it may serve other modules.
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE SCHEMA exercise_session;
CREATE TABLE exercise_session.session (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, student_subject_id uuid NOT NULL,
 semester_id uuid NOT NULL, course_id uuid NOT NULL, enrollment_id uuid NOT NULL,
 rule_version_id uuid NOT NULL, makeup_authorization_id uuid,
 threshold_minutes integer NOT NULL CHECK(threshold_minutes IN (30,45,60)),
 status text NOT NULL CHECK(status IN ('ACTIVE','PAUSED','COMPLETED')),
 started_at timestamptz(3) NOT NULL, completed_at timestamptz(3),
 business_date date GENERATED ALWAYS AS ((started_at AT TIME ZONE 'Asia/Shanghai')::date) STORED,
 actual_duration_ms bigint CHECK(actual_duration_ms>=0),
 state_version bigint NOT NULL CHECK(state_version>=0), start_command_id uuid NOT NULL UNIQUE,
 FOREIGN KEY(student_subject_id,organization_id) REFERENCES identity_access.user_subject(id,organization_id),
 FOREIGN KEY(semester_id,organization_id) REFERENCES academic_term.semester(id,organization_id),
 FOREIGN KEY(course_id,organization_id,semester_id,rule_version_id)
  REFERENCES course_enrollment.course(id,organization_id,semester_id,published_rule_version_id),
 FOREIGN KEY(enrollment_id,organization_id,semester_id,course_id,student_subject_id)
  REFERENCES course_enrollment.enrollment(id,organization_id,semester_id,course_id,student_subject_id),
 FOREIGN KEY(makeup_authorization_id,course_id,enrollment_id,rule_version_id)
  REFERENCES course_enrollment.makeup_authorization(id,course_id,enrollment_id,rule_version_id),
 CHECK((status='COMPLETED' AND completed_at IS NOT NULL AND actual_duration_ms IS NOT NULL AND completed_at>=started_at)
    OR (status IN ('ACTIVE','PAUSED') AND completed_at IS NULL AND actual_duration_ms IS NULL)),
 UNIQUE(id,organization_id,student_subject_id,course_id,enrollment_id,rule_version_id),
 UNIQUE(id,organization_id,student_subject_id),UNIQUE(id,status)
);
CREATE UNIQUE INDEX one_live_session ON exercise_session.session(student_subject_id) WHERE status IN ('ACTIVE','PAUSED');
CREATE TABLE exercise_session.active_interval (
 session_id uuid NOT NULL REFERENCES exercise_session.session(id), sequence_no integer NOT NULL CHECK(sequence_no>=0),
 opened_at timestamptz(3) NOT NULL, closed_at timestamptz(3), close_reason text,
 open_command_id uuid NOT NULL UNIQUE, close_command_id uuid UNIQUE,
 PRIMARY KEY(session_id,sequence_no), CHECK(closed_at>opened_at),
 CHECK((closed_at IS NULL AND close_reason IS NULL AND close_command_id IS NULL) OR
       (closed_at IS NOT NULL AND close_reason IN ('PAUSE','COMPLETE') AND close_command_id IS NOT NULL)),
 EXCLUDE USING gist (session_id WITH =, tstzrange(opened_at,closed_at,'[)') WITH &&)
);
CREATE UNIQUE INDEX one_open_interval ON exercise_session.active_interval(session_id) WHERE closed_at IS NULL;

CREATE FUNCTION exercise_session.protect_session() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'SESSION_HISTORY_IMMUTABLE'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'ACTIVE' OR NEW.state_version<>0 THEN RAISE EXCEPTION 'INVALID_INITIAL_SESSION'; END IF;
  RETURN NEW;
 END IF;
 IF ROW(NEW.id,NEW.organization_id,NEW.student_subject_id,NEW.semester_id,NEW.course_id,NEW.enrollment_id,
        NEW.rule_version_id,NEW.makeup_authorization_id,NEW.threshold_minutes,NEW.started_at,NEW.start_command_id)
 IS DISTINCT FROM ROW(OLD.id,OLD.organization_id,OLD.student_subject_id,OLD.semester_id,OLD.course_id,OLD.enrollment_id,
        OLD.rule_version_id,OLD.makeup_authorization_id,OLD.threshold_minutes,OLD.started_at,OLD.start_command_id)
 OR OLD.status='COMPLETED' OR NEW.state_version<>OLD.state_version+1
 OR NOT ((OLD.status='ACTIVE' AND NEW.status IN ('PAUSED','COMPLETED')) OR
         (OLD.status='PAUSED' AND NEW.status IN ('ACTIVE','COMPLETED'))) THEN
  RAISE EXCEPTION 'SESSION_TRANSITION_REJECTED';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER session_guard BEFORE INSERT OR UPDATE OR DELETE ON exercise_session.session
 FOR EACH ROW EXECUTE FUNCTION exercise_session.protect_session();

CREATE FUNCTION exercise_session.protect_interval() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'INTERVAL_HISTORY_IMMUTABLE'; END IF;
 IF OLD.closed_at IS NOT NULL OR ROW(NEW.session_id,NEW.sequence_no,NEW.opened_at,NEW.open_command_id)
 IS DISTINCT FROM ROW(OLD.session_id,OLD.sequence_no,OLD.opened_at,OLD.open_command_id) OR NEW.closed_at IS NULL THEN
  RAISE EXCEPTION 'INTERVAL_HISTORY_IMMUTABLE';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER interval_guard BEFORE UPDATE OR DELETE ON exercise_session.active_interval
 FOR EACH ROW EXECUTE FUNCTION exercise_session.protect_interval();

CREATE FUNCTION exercise_session.check_timeline() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sid uuid; s exercise_session.session%ROWTYPE; n integer; max_seq integer; open_count integer;
 first_time timestamptz; last_time timestamptz; duration_ms numeric; last_reason text;
BEGIN
 IF TG_TABLE_NAME='session' THEN sid:=NEW.id; ELSE sid:=NEW.session_id; END IF;
 SELECT * INTO s FROM exercise_session.session WHERE id=sid;
 SELECT count(*),max(sequence_no),count(*) FILTER(WHERE closed_at IS NULL),min(opened_at),max(closed_at),
  COALESCE(sum(extract(epoch FROM (closed_at-opened_at))*1000),0)
 INTO n,max_seq,open_count,first_time,last_time,duration_ms FROM exercise_session.active_interval WHERE session_id=sid;
 SELECT close_reason INTO last_reason FROM exercise_session.active_interval WHERE session_id=sid ORDER BY sequence_no DESC LIMIT 1;
 IF n=0 OR max_seq<>n-1 OR first_time<>s.started_at
 OR (s.status='ACTIVE' AND open_count<>1)
 OR (s.status<>'ACTIVE' AND open_count<>0)
 OR (s.status='PAUSED' AND last_reason IS DISTINCT FROM 'PAUSE')
 OR (s.status='COMPLETED' AND (duration_ms<>s.actual_duration_ms OR last_time>s.completed_at
     OR (last_reason='COMPLETE' AND last_time<>s.completed_at)))
 OR EXISTS(SELECT 1 FROM exercise_session.active_interval a JOIN exercise_session.active_interval b
   ON b.session_id=a.session_id AND b.sequence_no=a.sequence_no+1
   WHERE a.session_id=sid AND (a.closed_at IS NULL OR a.closed_at>b.opened_at)) THEN
  RAISE EXCEPTION 'SESSION_TIMELINE_INCONSISTENT';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER session_timeline AFTER INSERT OR UPDATE ON exercise_session.session
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION exercise_session.check_timeline();
CREATE CONSTRAINT TRIGGER interval_timeline AFTER INSERT OR UPDATE ON exercise_session.active_interval
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION exercise_session.check_timeline();

-- Down Migration
DROP TABLE exercise_session.active_interval;
DROP TABLE exercise_session.session;
DROP FUNCTION exercise_session.check_timeline();
DROP FUNCTION exercise_session.protect_interval();
DROP FUNCTION exercise_session.protect_session();
DROP SCHEMA exercise_session;
