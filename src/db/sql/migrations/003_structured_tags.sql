ALTER TABLE tags ADD COLUMN key TEXT NOT NULL DEFAULT '';
ALTER TABLE tags ADD COLUMN value TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_tags_key ON tags(key);
UPDATE tags SET key = '', value = name;
