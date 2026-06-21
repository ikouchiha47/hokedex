-- name: SELECT_UNLINKED_ENTRIES
SELECT e.id, e.created_at
FROM entries e
LEFT JOIN encounters enc ON enc.entry_id = e.id
WHERE enc.id IS NULL
LIMIT ? OFFSET ?

-- name: INSERT_ENCOUNTER
INSERT OR IGNORE INTO encounters (id, entry_id, note, occurred_at) VALUES (?, ?, NULL, ?)
