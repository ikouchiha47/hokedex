-- name: LogEncounter :exec
INSERT INTO encounters (id, entry_id, note, occurred_at)
VALUES (?, ?, ?, ?);

-- name: DeleteEncounter :exec
DELETE FROM encounters WHERE id = ?;

-- name: ListEncountersByEntry :many
SELECT * FROM encounters WHERE entry_id = ? ORDER BY occurred_at DESC;

-- name: ListEncountersInRange :many
SELECT e.id, e.entry_id, e.note, e.occurred_at, en.name AS entry_name
FROM encounters e
JOIN entries en ON en.id = e.entry_id
WHERE e.occurred_at >= ? AND e.occurred_at < ?
ORDER BY e.occurred_at ASC;

-- name: EncounterStats :one
SELECT
  COUNT(*)                   AS total,
  COUNT(DISTINCT entry_id)   AS unique_people,
  MAX(occurred_at)           AS last_at,
  MIN(occurred_at)           AS first_at
FROM encounters;

-- name: LastEncounterByEntry :one
SELECT occurred_at FROM encounters WHERE entry_id = ?
ORDER BY occurred_at DESC LIMIT 1;
