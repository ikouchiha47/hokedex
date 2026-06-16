-- name: ListTagsByEntry :many
SELECT id, key, value FROM entry_tags WHERE entry_id = ?;

-- name: GetTagByKey :one
SELECT value FROM entry_tags WHERE entry_id = ? AND key = lower(?) LIMIT 1;

-- name: AddTag :exec
INSERT INTO entry_tags (id, entry_id, key, value) VALUES (?, ?, lower(?), ?);

-- name: UpdateTagByKey :exec
UPDATE entry_tags SET value = ? WHERE entry_id = ? AND key = lower(?);

-- name: UpdateSocialByPlatform :exec
UPDATE entry_tags SET value = ? WHERE entry_id = ? AND key = 'social' AND value LIKE ? || ':%';

-- name: DeleteTag :exec
DELETE FROM entry_tags WHERE id = ?;
