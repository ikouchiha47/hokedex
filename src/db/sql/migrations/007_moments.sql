-- Migration 007: moments and related tables
CREATE TABLE IF NOT EXISTS saved_places (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  address    TEXT,
  lat_e6     INTEGER,
  lng_e6     INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS moments (
  id             TEXT    PRIMARY KEY,
  note           TEXT,
  occurred_at    INTEGER NOT NULL,
  place_id       TEXT    REFERENCES saved_places(id) ON DELETE SET NULL,
  status         TEXT    NOT NULL DEFAULT 'logged',
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS moment_people (
  id         TEXT PRIMARY KEY,
  moment_id  TEXT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  entry_id   TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS person_dates (
  id       TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  date_ms  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS moment_tags (
  id        TEXT PRIMARY KEY,
  moment_id TEXT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  key       TEXT NOT NULL DEFAULT 'other',
  value     TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_moments_occurred    ON moments(occurred_at);
CREATE INDEX IF NOT EXISTS idx_moment_people_moment ON moment_people(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_people_entry  ON moment_people(entry_id);
CREATE INDEX IF NOT EXISTS idx_person_dates_entry   ON person_dates(entry_id);
CREATE INDEX IF NOT EXISTS idx_moment_tags_moment   ON moment_tags(moment_id);
