-- name: GetMigration :one
SELECT version FROM schema_migrations WHERE version = ?;

-- name: RecordMigration :exec
INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);
