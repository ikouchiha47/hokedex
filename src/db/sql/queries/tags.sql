-- name: UpsertTag :exec
INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?);

-- name: GetTagByName :one
SELECT id, name FROM tags WHERE name = ?;

-- name: AddEntryTag :exec
INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?);

-- name: RemoveEntryTag :exec
DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?;

-- name: ListTagsByEntry :many
SELECT t.id, t.name FROM tags t
JOIN entry_tags et ON et.tag_id = t.id
WHERE et.entry_id = ?
ORDER BY t.name ASC;
