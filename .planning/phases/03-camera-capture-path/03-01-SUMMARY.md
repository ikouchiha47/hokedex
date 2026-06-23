# 03-01: Migration 012 + DB query infrastructure

**Status:** Complete

## What was built

- Migration 012 (`012_moment_faces_queue.sql`) creates four tables: `moment_faces`, `processing_queue`, `moment_groups`, `moment_group_members` with FKs, indexes, and `IF NOT EXISTS` guards
- Three `.sql` query files under `src/db/sql/queries/`: `moment_faces.sql` (4 queries), `processing_queue.sql` (6 queries), `moment_groups.sql` (7 queries)
- Three TS query wrappers under `src/db/queries/`: `moment_faces.ts`, `processing_queue.ts`, `moment_groups.ts` — async reads via `db.execute`, sync writes via `tx.executeSync`
- All files registered in `src/db/sql/loader.ts` and `src/db/migrations/runner.ts`

## Deviations

None.

## Files

- `src/db/sql/migrations/012_moment_faces_queue.sql` — created
- `src/db/sql/queries/moment_faces.sql` — created
- `src/db/sql/queries/processing_queue.sql` — created
- `src/db/sql/queries/moment_groups.sql` — created
- `src/db/queries/moment_faces.ts` — created
- `src/db/queries/processing_queue.ts` — created
- `src/db/queries/moment_groups.ts` — created
- `src/db/sql/loader.ts` — modified (added imports + exports)
- `src/db/migrations/runner.ts` — modified (added version 12)
