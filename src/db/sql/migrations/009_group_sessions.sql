-- Migration 009: group sessions for proximity feature
CREATE TABLE IF NOT EXISTS group_sessions (
  id           TEXT    PRIMARY KEY,
  venue_id     TEXT    NOT NULL,
  beacon_token TEXT    NOT NULL,
  started_at   INTEGER NOT NULL,
  ended_at     INTEGER,
  moment_id    TEXT    REFERENCES moments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_group_sessions_venue ON group_sessions(venue_id);
