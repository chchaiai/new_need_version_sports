-- Up Migration
CREATE SCHEMA foundation_probe;
-- This is a Foundation persistence probe, not a deployed application aggregate.
CREATE TABLE foundation_probe.certification_kind (
  id uuid PRIMARY KEY,
  certification_kind text NOT NULL
    CHECK (certification_kind IN ('SCHOOL_TEAM', 'STUDENT_CLUB'))
);

-- Down Migration
DROP TABLE foundation_probe.certification_kind;
DROP SCHEMA foundation_probe;
