-- name: InsertMomentFace :exec
INSERT INTO moment_faces (id, moment_id, entry_id, bbox_x, bbox_y, bbox_w, bbox_h, status, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: ListFacesByMoment :many
SELECT * FROM moment_faces WHERE moment_id = ? ORDER BY created_at ASC;

-- name: UpdateFaceStatus :exec
UPDATE moment_faces SET status = ? WHERE id = ?;

-- name: UpdateFaceEntry :exec
UPDATE moment_faces SET entry_id = ?, status = ? WHERE id = ?;
