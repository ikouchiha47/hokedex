-- name: InsertMoment :exec
INSERT INTO moments (id, note, occurred_at, place_id, created_at)
VALUES (?, ?, ?, ?, ?);

-- name: GetMoment :one
SELECT * FROM moments WHERE id = ?;

-- name: ListMomentsInRange :many
SELECT * FROM moments WHERE occurred_at >= ? AND occurred_at < ? ORDER BY occurred_at DESC;

-- name: DeleteMoment :exec
DELETE FROM moments WHERE id = ?;
