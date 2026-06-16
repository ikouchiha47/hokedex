-- name: InsertPhoto :exec
INSERT INTO photos (id, entry_id, local_path, original_path, original_sha256, original_phash, is_profile_photo, embedding_id, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: GetPhoto :one
SELECT * FROM photos WHERE id = ?;

-- name: ListPhotosByEntry :many
SELECT * FROM photos WHERE entry_id = ? ORDER BY created_at ASC;

-- name: UpdatePhotoEmbeddingId :exec
UPDATE photos SET embedding_id = ? WHERE id = ?;

-- name: DeletePhoto :exec
DELETE FROM photos WHERE id = ?;

-- name: GetProfilePhoto :one
SELECT * FROM photos WHERE entry_id = ? AND is_profile_photo = 1 LIMIT 1;

-- name: SetProfilePhoto :exec
UPDATE photos SET is_profile_photo = 1 WHERE id = ?;

-- name: UnsetAllProfilePhotos :exec
UPDATE photos SET is_profile_photo = 0 WHERE entry_id = ?;

-- name: CountPhotosByEntry :one
SELECT COUNT(*) as count FROM photos WHERE entry_id = ?;
