-- name: SelectUnlinkedEntries :many
SELECT e.id, e.created_at
FROM entries e
LEFT JOIN encounters enc ON enc.entry_id = e.id
WHERE enc.id IS NULL
LIMIT ? OFFSET ?

-- name: InsertEncounter :exec
INSERT OR IGNORE INTO encounters (id, entry_id, note, occurred_at) VALUES (?, ?, NULL, ?)
