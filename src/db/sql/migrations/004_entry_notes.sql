CREATE TABLE entry_notes (
  id               TEXT    PRIMARY KEY,
  entry_id         TEXT    NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  body             TEXT    NOT NULL,
  location_label   TEXT,
  location_geohash TEXT,
  place_url        TEXT,
  created_at       INTEGER NOT NULL
);
CREATE INDEX idx_entry_notes_entry ON entry_notes(entry_id);
