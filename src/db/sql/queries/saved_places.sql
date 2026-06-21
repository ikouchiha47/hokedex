-- name: InsertSavedPlace :exec
INSERT INTO saved_places (id, name, address, lat_e6, lng_e6, created_at)
VALUES (?, ?, ?, ?, ?, ?);

-- name: GetSavedPlace :one
SELECT * FROM saved_places WHERE id = ?;

-- name: ListSavedPlaces :many
SELECT * FROM saved_places ORDER BY name ASC;

-- name: DeleteSavedPlace :exec
DELETE FROM saved_places WHERE id = ?;
