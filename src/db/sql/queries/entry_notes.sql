-- name: AddNote :exec
INSERT INTO entry_notes (id, entry_id, body, location_label, location_geohash, place_url, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- name: ListNotesByEntry :many
SELECT id, entry_id, body, location_label, location_geohash, place_url, created_at
FROM entry_notes
WHERE entry_id = ?
ORDER BY created_at DESC;

-- name: DeleteNote :exec
DELETE FROM entry_notes WHERE id = ?;

-- name: ListNotesNear :many
SELECT id, entry_id, body, location_label, location_geohash, place_url, created_at
FROM entry_notes
WHERE location_geohash IS NOT NULL
  AND substr(location_geohash, 1, ?) = substr(?, 1, ?)
ORDER BY created_at DESC;
