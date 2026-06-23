-- name: EnqueueJob :exec
INSERT INTO processing_queue (id, moment_id, photo_uri, status, attempts, created_at)
VALUES (?, ?, ?, 'pending', 0, ?);

-- name: ClaimNextPending :many
SELECT * FROM processing_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?;

-- name: MarkJobProcessing :exec
UPDATE processing_queue SET status = 'processing', attempts = attempts + 1 WHERE id = ?;

-- name: MarkJobDone :exec
UPDATE processing_queue SET status = 'done', processed_at = ? WHERE id = ?;

-- name: MarkJobFailed :exec
UPDATE processing_queue SET status = 'failed', processed_at = ? WHERE id = ?;

-- name: CountPending :one
SELECT COUNT(*) as count FROM processing_queue WHERE status = 'pending';
