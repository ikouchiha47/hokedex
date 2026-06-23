CREATE TABLE IF NOT EXISTS moment_faces (
  id TEXT PRIMARY KEY,
  moment_id TEXT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  entry_id TEXT REFERENCES entries(id),
  bbox_x REAL NOT NULL,
  bbox_y REAL NOT NULL,
  bbox_w REAL NOT NULL,
  bbox_h REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'detected',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_moment_faces_moment_id ON moment_faces(moment_id);

CREATE TABLE IF NOT EXISTS processing_queue (
  id TEXT PRIMARY KEY,
  moment_id TEXT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  photo_uri TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  processed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status);

CREATE TABLE IF NOT EXISTS moment_groups (
  id TEXT PRIMARY KEY,
  label TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS moment_group_members (
  moment_id TEXT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES moment_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (moment_id, group_id)
);
