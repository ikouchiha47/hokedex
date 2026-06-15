-- Migration 001: initial schema
-- Idempotent — all statements use IF NOT EXISTS / INSERT OR IGNORE

CREATE TABLE IF NOT EXISTS categories (
  id                          TEXT     PRIMARY KEY,
  name                        TEXT     NOT NULL,
  detector_model              TEXT     NOT NULL,
  embedding_model             TEXT     NOT NULL,
  embedding_dimensions        INTEGER  NOT NULL,
  similarity_threshold_likely REAL     NOT NULL,
  similarity_threshold_possible REAL   NOT NULL,
  created_at                  INTEGER  NOT NULL
);

CREATE TABLE IF NOT EXISTS entries (
  id          TEXT     PRIMARY KEY,
  category_id TEXT     NOT NULL REFERENCES categories(id),
  name        TEXT     NOT NULL,
  notes       TEXT,
  is_public   INTEGER  NOT NULL DEFAULT 0,
  created_at  INTEGER  NOT NULL,
  updated_at  INTEGER  NOT NULL
);

CREATE TABLE IF NOT EXISTS embeddings (
  id          TEXT     PRIMARY KEY,
  entry_id    TEXT     NOT NULL REFERENCES entries(id)    ON DELETE CASCADE,
  photo_id    TEXT     NOT NULL,
  category_id TEXT     NOT NULL REFERENCES categories(id),
  vector      BLOB     NOT NULL,
  created_at  INTEGER  NOT NULL
);

-- local_path is always relative to collection_root, never absolute
CREATE TABLE IF NOT EXISTS photos (
  id               TEXT     PRIMARY KEY,
  entry_id         TEXT     NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  local_path       TEXT     NOT NULL,
  original_sha256  TEXT     NOT NULL,
  original_phash   INTEGER  NOT NULL,
  is_profile_photo INTEGER  NOT NULL DEFAULT 0,
  embedding_id     TEXT     REFERENCES embeddings(id),
  created_at       INTEGER  NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE TABLE IF NOT EXISTS workspaces (
  id              TEXT    PRIMARY KEY,
  local_id        TEXT    NOT NULL UNIQUE,
  collection_root TEXT    NOT NULL,
  created_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_embeddings_search ON embeddings(category_id, entry_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_join   ON embeddings(entry_id, photo_id);
CREATE INDEX IF NOT EXISTS idx_entries_category  ON entries(category_id);

-- Seed: People category
-- INSERT OR IGNORE makes re-runs safe
INSERT OR IGNORE INTO categories
  (id, name, detector_model, embedding_model, embedding_dimensions,
   similarity_threshold_likely, similarity_threshold_possible, created_at)
VALUES
  ('people', 'People', 'mediapipe_face', 'mobilefacenet_arcface_512',
   512, 0.95, 0.85, ?);
