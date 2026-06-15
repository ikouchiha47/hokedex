-- Migration 002: encounter log
CREATE TABLE IF NOT EXISTS encounters (
  id          TEXT    PRIMARY KEY,
  entry_id    TEXT    NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  note        TEXT,
  occurred_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_encounters_entry ON encounters(entry_id);
CREATE INDEX IF NOT EXISTS idx_encounters_date  ON encounters(occurred_at);

-- Tracks which data migrations have been applied.
CREATE TABLE IF NOT EXISTS data_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  rows_affected INTEGER NOT NULL DEFAULT 0
);
