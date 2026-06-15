-- name: InsertEmbedding :exec
INSERT INTO embeddings (id, entry_id, photo_id, category_id, vector, created_at)
VALUES (?, ?, ?, ?, ?, ?);

-- name: GetEmbedding :one
SELECT * FROM embeddings WHERE id = ?;

-- name: DeleteEmbeddingsByEntry :exec
DELETE FROM embeddings WHERE entry_id = ?;

-- name: SearchEmbeddings :many
SELECT e.entry_id, e.id as embedding_id
FROM embeddings e
JOIN entries en ON en.id = e.entry_id
WHERE en.category_id = ?
ORDER BY e.created_at DESC;

-- name: SearchEmbeddingsByVector :many
SELECT
  e.entry_id,
  (1.0 - MIN(vec_distance_cosine(e.vector, ?))) AS best_score,
  (SELECT p.local_path FROM photos p WHERE p.entry_id = e.entry_id AND p.is_profile_photo = 1 LIMIT 1) AS profile_photo_path
FROM embeddings e
JOIN entries en ON en.id = e.entry_id
WHERE en.category_id = ?
GROUP BY e.entry_id
ORDER BY best_score DESC
LIMIT 10;
