---
phase: 01-schema-interfaces-conventions-foundation
plan: 01
subsystem: database
tags: [sqlite, op-sqlite, migrations, moments, schema]

requires: []
provides:
  - moments, moment_people, person_dates, moment_tags, saved_places DDL (migration 007)
  - entries.is_self column (migration 008)
  - Async read / sync-tx write query modules for all four new tables
  - Data migration backfilling encounters into moments + moment_people (version 2)
affects:
  - 02-navigation-shell-home-screen
  - 03-camera-capture-path
  - 04-voice-capture-type-inference-timeline
  - 05-people-planner-special-dates-calendar
  - 06-map-place-resolvers-notifications-gallery

tech-stack:
  added: []
  patterns:
    - sqlc-style named query headers in .sql files parsed by parseNamedQueries
    - async db.execute() for runtime reads; tx.executeSync() inside transaction callbacks for writes
    - All SQL in .sql files under src/db/sql/; zero raw SQL strings in TypeScript
    - DataMigration objects with version + batchSize + run(tx, batchSize) for data backfills

key-files:
  created:
    - src/db/sql/migrations/007_moments.sql
    - src/db/sql/migrations/008_entries_is_self.sql
    - src/db/sql/queries/moments.sql
    - src/db/sql/queries/moment_people.sql
    - src/db/sql/queries/person_dates.sql
    - src/db/sql/queries/saved_places.sql
    - src/db/queries/moments.ts
    - src/db/queries/moment_people.ts
    - src/db/queries/person_dates.ts
    - src/db/queries/saved_places.ts
    - src/db/sql/data-migrations/001_backfill_moments.sql
    - src/db/data-migrations/001_backfill_moments.ts
  modified:
    - src/db/sql/loader.ts
    - src/db/migrations/runner.ts
    - src/db/init.ts

key-decisions:
  - "saved_places created before moments in 007 DDL because moments.place_id FK references saved_places(id)"
  - "backfillMoments assigned version 2 (not 1) because backfillEncounters already occupies version 1 in data_migrations table"
  - "Moments backfill uses SELECT_ENCOUNTER_BATCH with LIMIT for safety; INSERT OR IGNORE prevents duplicates on re-run"

patterns-established:
  - "SQL query files: sqlc-style -- name: FunctionName :one|:many|:exec headers; one file per table"
  - "TS query modules: async reads (await db.execute()), sync-tx writes (tx.executeSync()); no raw SQL"
  - "Data migration SQL in src/db/sql/data-migrations/; TS runner in src/db/data-migrations/"
  - "Registration: loader.ts imports, runner.ts MIGRATIONS array, init.ts runDataMigrations array"

requirements-completed:
  - R-DB-01
  - R-DB-02
  - R-DB-03
  - R-DB-04
  - R-DB-05

duration: 18min
completed: 2026-06-21
---

# Phase 01 Plan 01: DB Schema Foundation Summary

**Five new SQLite tables (moments, moment_people, person_dates, moment_tags, saved_places), entries.is_self column, and a full query + data-migration layer backfilling existing encounters into the moments model**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-21T00:00:00Z
- **Completed:** 2026-06-21T00:18:00Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- DDL migrations 007 (5 new tables + indexes) and 008 (entries.is_self) applied via runner.ts at versions 7 and 8
- Four SQL query files with sqlc-style named queries + four TypeScript modules with async reads and sync-tx writes
- Data migration version 2 backfills all existing encounter rows into moments + moment_people; registered in init.ts alongside existing backfillEncounters

## Task Commits

1. **Task 1: DDL migrations** - `7f415c4` (feat)
2. **Task 2: Query SQL files and TypeScript modules** - `dfaa1f5` (feat)
3. **Task 3: Data migration backfill** - `6f1dcf8` (feat)

## Files Created/Modified

- `src/db/sql/migrations/007_moments.sql` - DDL for saved_places, moments, moment_people, person_dates, moment_tags + indexes (no ? placeholders)
- `src/db/sql/migrations/008_entries_is_self.sql` - ALTER TABLE entries ADD COLUMN is_self
- `src/db/sql/queries/moments.sql` - InsertMoment, GetMoment, ListMomentsInRange, DeleteMoment
- `src/db/sql/queries/moment_people.sql` - InsertMomentPerson, ListPeopleByMoment, ListMomentsByEntry, DeleteMomentPeople
- `src/db/sql/queries/person_dates.sql` - InsertPersonDate, ListPersonDates, DeletePersonDate
- `src/db/sql/queries/saved_places.sql` - InsertSavedPlace, GetSavedPlace, ListSavedPlaces, DeleteSavedPlace
- `src/db/queries/moments.ts` - Moment type, async getMoment/listMomentsInRange, tx insertMoment/deleteMoment
- `src/db/queries/moment_people.ts` - MomentPerson type, async reads, tx writes
- `src/db/queries/person_dates.ts` - PersonDate type, async listPersonDates, tx insertPersonDate/deletePersonDate
- `src/db/queries/saved_places.ts` - SavedPlace type, async reads, tx insertSavedPlace/deleteSavedPlace
- `src/db/sql/data-migrations/001_backfill_moments.sql` - 4 named queries for backfill
- `src/db/data-migrations/001_backfill_moments.ts` - DataMigration v2: encounters → moments + moment_people
- `src/db/sql/loader.ts` - added 6 new imports (migration007, migration008, 4 query files, dataMigration001BackfillMoments)
- `src/db/migrations/runner.ts` - registered versions 7 and 8 in MIGRATIONS array
- `src/db/init.ts` - added backfillMoments to runDataMigrations call

## Decisions Made

- `saved_places` created before `moments` in migration 007 because `moments.place_id` FKs to `saved_places(id)` — order matters in DDL
- `backfillMoments` uses version 2 because version 1 is already occupied by `backfillEncounters` in the `data_migrations` table
- `INSERT OR IGNORE` in backfill queries ensures idempotency if the migration is partially re-run

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DB schema foundation is complete; all new tables exist with correct FKs and indexes
- TypeScript query modules export typed functions ready for service layer consumption
- `tsc --noEmit` passes with zero errors
- Parallel tracks (TypeScript contracts, service shells, UI screens) can proceed against these table shapes

---
*Phase: 01-schema-interfaces-conventions-foundation*
*Completed: 2026-06-21*
