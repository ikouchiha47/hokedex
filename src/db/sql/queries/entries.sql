-- name: GetEntry :one
SELECT id, category_id, name, notes, is_public, created_at, updated_at
FROM entries
WHERE id = ?;

-- name: ListEntriesByCategory :many
SELECT id, category_id, name, notes, is_public, created_at, updated_at
FROM entries
WHERE category_id = ?
ORDER BY name ASC;

-- name: InsertEntry :exec
INSERT INTO entries
  (id, category_id, name, notes, is_public, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- name: UpdateEntryName :exec
UPDATE entries
SET name = ?, updated_at = ?
WHERE id = ?;

-- name: DeleteEntry :exec
DELETE FROM entries
WHERE id = ?;
