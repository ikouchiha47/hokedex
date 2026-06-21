-- name: InsertPersonDate :exec
INSERT INTO person_dates (id, entry_id, label, date_ms) VALUES (?, ?, ?, ?);

-- name: ListPersonDates :many
SELECT * FROM person_dates WHERE entry_id = ? ORDER BY date_ms ASC;

-- name: DeletePersonDate :exec
DELETE FROM person_dates WHERE id = ?;
