CREATE TABLE entry_tags_new (
  id       TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  key      TEXT NOT NULL DEFAULT 'other',
  value    TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_entry_tags_new_entry_key ON entry_tags_new(entry_id, key);

INSERT INTO entry_tags_new (id, entry_id, key, value)
SELECT
  et.entry_id || '_' || t.id,
  et.entry_id,
  CASE
    WHEN t.key = '' THEN 'character'
    ELSE lower(t.key)
  END,
  t.value
FROM entry_tags et
JOIN tags t ON t.id = et.tag_id;

DROP TABLE entry_tags;
DROP TABLE tags;

ALTER TABLE entry_tags_new RENAME TO entry_tags;
