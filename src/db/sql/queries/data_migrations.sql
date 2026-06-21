-- name: CheckDataMigrationApplied :one
SELECT version FROM data_migrations WHERE version = ?

-- name: InsertDataMigration :exec
INSERT INTO data_migrations (version, applied_at, rows_affected) VALUES (?, ?, ?)
