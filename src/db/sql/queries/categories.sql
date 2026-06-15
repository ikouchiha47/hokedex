-- name: GetCategory :one
SELECT id, name, detector_model, embedding_model, embedding_dimensions,
       similarity_threshold_likely, similarity_threshold_possible, created_at
FROM categories
WHERE id = ?;

-- name: ListCategories :many
SELECT id, name, detector_model, embedding_model, embedding_dimensions,
       similarity_threshold_likely, similarity_threshold_possible, created_at
FROM categories
ORDER BY name ASC;

-- name: UpdateCategoryThresholds :exec
UPDATE categories
SET similarity_threshold_likely = ?,
    similarity_threshold_possible = ?
WHERE id = ?;

-- name: InsertCategory :exec
INSERT INTO categories
  (id, name, detector_model, embedding_model, embedding_dimensions,
   similarity_threshold_likely, similarity_threshold_possible, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);
