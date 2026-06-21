-- name: CHECK_DATA_MIGRATION_APPLIED
SELECT version FROM data_migrations WHERE version = ?

-- name: INSERT_DATA_MIGRATION
INSERT INTO data_migrations (version, applied_at, rows_affected) VALUES (?, ?, ?)
