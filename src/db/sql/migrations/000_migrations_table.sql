-- Tracks which migrations have been applied.
-- Applied before any user migration runs.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
