-- name: CheckMomentsPopulated :one
SELECT id FROM moments LIMIT 1;

-- name: SelectEncounterBatch :many
SELECT id, entry_id, note, occurred_at FROM encounters ORDER BY occurred_at ASC LIMIT ?;

-- name: InsertMomentIgnore :exec
INSERT OR IGNORE INTO moments (id, note, occurred_at, place_id, created_at) VALUES (?, ?, ?, ?, ?);

-- name: InsertMomentPersonIgnore :exec
INSERT OR IGNORE INTO moment_people (id, moment_id, entry_id) VALUES (?, ?, ?);
