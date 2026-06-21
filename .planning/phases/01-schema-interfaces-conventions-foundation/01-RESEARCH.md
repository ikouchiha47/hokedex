# Phase 1: Schema, Interfaces & Conventions Foundation - Research

**Researched:** 2026-06-21
**Domain:** op-sqlite migrations, TypeScript service interfaces, React Native Android
**Confidence:** HIGH

## Summary

This phase establishes all data contracts before any feature implementation begins. The codebase has a mature, well-understood migration + SQL-loader pattern already in place. The new work is additive: new .sql migration files, new query files, new TypeScript types, and empty service shells. Nothing in this phase changes existing code except two items: (1) adding `is_self INTEGER DEFAULT 0` to `entries` via ALTER TABLE in a new migration, and (2) updating `init.ts` to register new migrations in the MIGRATIONS array and call registration functions for service registries.

The data-migration subsystem (`data-runner.ts` + `data-migrations/`) already handles batched backfill. The `moments` backfill (encounters → moments + moment_people) follows the exact pattern of `001_backfill_encounters.ts`.

**Primary recommendation:** Follow existing patterns exactly. New migration = new .sql file + entry in loader.ts + entry in runner.ts MIGRATIONS array. New query file = TypeScript file that calls parseNamedQueries, exports typed read functions (accept DB) and write functions (accept Tx), with zero SQL inline.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| R-DB-01 | System SHALL create moments, moment_people, person_dates, moment_tags, saved_places tables via non-destructive migrations before first app render. | DDL migrations run via runMigrations() before app renders in initDatabase(). Pattern: .sql files with IF NOT EXISTS, registered in runner.ts MIGRATIONS array. |
| R-DB-02 | entries SHALL gain is_self INTEGER DEFAULT 0 column. | Requires ALTER TABLE in new migration. SQLite supports ADD COLUMN with DEFAULT. Pattern: .sql migration file, new version entry in runner.ts. |
| R-DB-03 | encounters SHALL remain readable; all new writes go to moments + moment_people. | No changes to encounters table or query files. MomentCaptureService facade replaces direct logEncounter() calls. |
| R-DB-04 | Existing encounters SHALL be backfilled to moments + moment_people. | data-runner.ts + data-migrations/ pattern already exists (backfillEncounters). New DataMigration object in src/db/data-migrations/, registered in init.ts. |
| R-DB-05 | All SQL in .sql files under src/db/sql/. No raw SQL in TypeScript. One export per query file. | Established pattern in loader.ts + queries/. Every new table needs a .sql query file and a .ts query module. |
| R-CONV-01 | All place resolvers SHALL implement PlaceResolver interface and self-register with PlaceResolverRegistry. | New src/services/place-resolver/PlaceResolverRegistry.ts with register()/resolve() — empty shell only in this phase. |
| R-CONV-02 | All smart feature rules SHALL implement Rule interface and self-register with RuleRegistry. | New src/services/rules/RuleRegistry.ts — empty shell only in this phase. |
| R-CONV-03 | CalendarProxy SHALL be the only module touching CalendarContract or Android cursor APIs. | New src/services/calendar/CalendarProxy.ts stub — constructor injection, no singleton. |
| R-CONV-04 | MomentCaptureService SHALL be the single entry point for all moment creation flows. | New src/services/MomentCaptureService.ts stub — receives DB, PlaceResolverRegistry, RuleRegistry, CalendarProxy via constructor. |
| R-CONV-05 | All icons SHALL use lucide-react-native. No emoji in UI components. | No UI work in this phase. Constraint for future phases. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| op-sqlite | existing | SQLite DDL and queries | Already in use; executeSync for DDL, execute for runtime |
| TypeScript | existing | Type contracts | All interfaces and types; discriminated unions for Result<T> |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react-native | existing | Icons | Every UI component — enforce in R-CONV-05 |

### Alternatives Considered
None — all stack choices are locked by existing codebase and prior decisions.

## Architecture Patterns

### Existing Migration Pattern (HIGH confidence — verified from source)

New migrations follow this exact sequence:

1. Create `src/db/sql/migrations/00N_name.sql` with `IF NOT EXISTS` guards
2. Import in `src/db/sql/loader.ts` and add to `SQL` export object
3. Add `{ version: N, sql: SQL.migrationN }` to the `MIGRATIONS` array in `src/db/migrations/runner.ts`

The runner calls `applyMigration()` which splits on `;`, strips `--` comments, and runs each statement via `executeSync`. Statements with `?` get `[Date.now()]` bound — so migration SQL must not use `?` for anything else. Use literal values or named migrations queries instead.

**ALTER TABLE constraint:** SQLite only supports `ADD COLUMN` in ALTER TABLE, not `MODIFY` or `DROP`. The `is_self` column must be: `ALTER TABLE entries ADD COLUMN is_self INTEGER NOT NULL DEFAULT 0;`

### Existing Query File Pattern (HIGH confidence — verified from source)

Every query file pair:
- `src/db/sql/queries/thing.sql` — sqlc-style `-- name: FunctionName :one|:many|:exec` headers
- `src/db/queries/thing.ts` — imports SQL, calls `parseNamedQueries`, exports typed functions

Read functions accept `DB`. Write functions accept `Tx`. Reads first, blank line + `// Writes` comment, then writes. No SQL inline.

### Existing Data Migration Pattern (HIGH confidence — verified from source)

Pattern from `src/db/data-migrations/001_backfill_encounters.ts`:
- Export a `DataMigration` object with `{ version, batchSize, run(tx, batchSize): number }`
- `run()` returns rows affected
- Uses `withTransaction` via data-runner, so `run()` receives an already-open `Tx`
- Registered in `init.ts` `runDataMigrations(db, [backfillEncounters, backfillMoments])`

**Important:** `data_migrations` table is created in `002_encounters.sql` — it already exists. New data migrations just add rows.

### Service Shell Pattern (HIGH confidence — inferred from NewEntryController.ts)

Services use class-based constructor injection:
```typescript
export class MomentCaptureService {
  constructor(
    private db: DB,
    private placeRegistry: PlaceResolverRegistry,
    private ruleRegistry: RuleRegistry,
    private calendarProxy: CalendarProxy,
  ) {}
}
```
No static methods. No module-level singletons. Callers construct with injected dependencies.

### Registry Pattern for PlaceResolver and Rule

Self-registration means resolvers call `registry.register(this)` in their constructor or a static `register()` method. The registry stores implementations keyed by name/type. In this phase, registries are empty shells with `register()` and `resolve()` methods stubbed.

### Recommended New File Structure

```
src/
├── db/
│   ├── sql/
│   │   ├── migrations/
│   │   │   ├── 007_moments.sql           # moments, moment_people, person_dates, moment_tags, saved_places
│   │   │   └── 008_entries_is_self.sql   # ALTER TABLE entries ADD COLUMN is_self
│   │   └── queries/
│   │       ├── moments.sql
│   │       ├── moment_people.sql
│   │       ├── person_dates.sql
│   │       └── saved_places.sql
│   ├── queries/
│   │   ├── moments.ts
│   │   ├── moment_people.ts
│   │   ├── person_dates.ts
│   │   └── saved_places.ts
│   └── data-migrations/
│       └── 002_backfill_moments.ts
├── services/
│   ├── MomentCaptureService.ts           # Facade — stub only
│   ├── place-resolver/
│   │   ├── PlaceResolver.ts              # interface
│   │   └── PlaceResolverRegistry.ts      # stub
│   ├── rules/
│   │   ├── Rule.ts                       # interface
│   │   └── RuleRegistry.ts              # stub
│   └── calendar/
│       └── CalendarProxy.ts              # stub
└── types/
    └── moments.ts                        # Moment, MomentPeople, PersonDate, SavedPlace, CalendarEvent
```

### Anti-Patterns to Avoid

- **Raw SQL in .ts files:** Even in data migrations, raw SQL is allowed only because data migrations are transitional procedural code — not query files. But query files must have zero inline SQL.
- **Singleton registries:** Do not export a module-level `const registry = new PlaceResolverRegistry()`. Instantiate at app startup and inject everywhere.
- **DDL in data migrations:** Data migrations only INSERT/UPDATE existing rows. DDL belongs in schema migrations.
- **Mutable migration SQL with ?:** The runner binds `[Date.now()]` to any `?` in migration SQL. New migrations must not use `?` for other params. Use literal values.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL loading | Custom file reader | `parseNamedQueries(SQL.key)` | Already implemented, Metro-compatible |
| Transaction management | Manual BEGIN/COMMIT | `withTransaction(db, tx => ...)` | Already implemented with rollback |
| Migration tracking | Custom versioning | `schema_migrations` via `runMigrations()` | Already implemented, idempotent |
| Data migration tracking | Custom tracking | `data_migrations` via `runDataMigrations()` | Already implemented with batch tracking |

## Common Pitfalls

### Pitfall 1: Forgetting loader.ts registration
**What goes wrong:** Migration .sql file added, registered in runner.ts, but not imported in loader.ts. Metro bundle fails at runtime with "undefined" SQL string.
**How to avoid:** Both loader.ts (import + SQL object key) and runner.ts (MIGRATIONS array) must be updated together.

### Pitfall 2: ALTER TABLE with unsupported syntax
**What goes wrong:** SQLite only supports `ADD COLUMN` in ALTER TABLE. Using `MODIFY COLUMN` or `DROP COLUMN` (pre-3.35) throws at runtime.
**How to avoid:** `ALTER TABLE entries ADD COLUMN is_self INTEGER NOT NULL DEFAULT 0;` — verify constraint is NOT NULL with DEFAULT rather than nullable.

### Pitfall 3: Data migration with raw SQL in query columns
**What goes wrong:** `001_backfill_encounters.ts` uses raw SQL strings inline (noted as acceptable for data migrations). This is an exception, not the rule. Future developers may copy the pattern into query files.
**How to avoid:** Data migration files are the only place raw SQL is tolerated. Document clearly in each file header.

### Pitfall 4: Nested withTransaction
**What goes wrong:** `withTransaction()` executes `BEGIN` directly. Nesting calls causes SQLite to throw on double-BEGIN.
**How to avoid:** Data migration `run()` receives a `Tx` already inside a transaction — it must not call `withTransaction` again.

### Pitfall 5: moments vs encounters naming confusion
**What goes wrong:** R-DB-03 says encounters remain readable. New code mistakenly writes to `encounters` instead of `moments`.
**How to avoid:** `MomentCaptureService` is the only path to new moment creation. It only writes to `moments` + `moment_people`. The existing `logEncounter()` in encounters.ts is not deprecated but must not be called by new code paths.

### Pitfall 6: Service shell with logic
**What goes wrong:** Phase 1 shells get partially implemented, creating hidden dependencies between phases.
**How to avoid:** Every method in Phase 1 service shells returns `Promise.resolve()` or throws `new Error('Not implemented')`. No logic. No DB calls. No imports of feature implementations.

## Code Examples

### Migration SQL file pattern
```sql
-- Migration 007: moments + related tables
-- Source: src/db/sql/migrations/007_moments.sql

CREATE TABLE IF NOT EXISTS moments (
  id          TEXT    PRIMARY KEY,
  occurred_at INTEGER NOT NULL,
  place_id    TEXT    REFERENCES saved_places(id),
  note        TEXT,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_moments_occurred ON moments(occurred_at);
```

### loader.ts additions
```typescript
// In src/db/sql/loader.ts — add imports:
import migration007 from './migrations/007_moments.sql';
import migration008 from './migrations/008_entries_is_self.sql';
import queriesMoments from './queries/moments.sql';

// Add to SQL object:
export const SQL = {
  // ...existing...
  migration007,
  migration008,
  queriesMoments,
} as const;
```

### runner.ts addition
```typescript
// In src/db/migrations/runner.ts MIGRATIONS array:
{ version: 7, sql: SQL.migration007 },
{ version: 8, sql: SQL.migration008 },
```

### Query file pattern
```typescript
// src/db/queries/moments.ts
import { type DB } from '@op-engineering/op-sqlite';
import { type Tx } from '../tx';
import { SQL, parseNamedQueries } from '../sql/loader';

const Q = parseNamedQueries(SQL.queriesMoments);

export type Moment = {
  id: string;
  occurred_at: number;
  place_id: string | null;
  note: string | null;
  created_at: number;
};

// Reads
export function getMoment(db: DB, id: string): Moment | null {
  const r = db.executeSync(Q.GET_MOMENT, [id]);
  return (r.rows?.[0] as Moment) ?? null;
}

// Writes
export function insertMoment(tx: Tx, m: Moment): void {
  tx.executeSync(Q.INSERT_MOMENT, [m.id, m.occurred_at, m.place_id, m.note, m.created_at]);
}
```

### PlaceResolver interface pattern
```typescript
// src/services/place-resolver/PlaceResolver.ts
export interface PlaceResolver {
  readonly name: string;
  resolve(geohash: string): Promise<ResolvedPlace | null>;
}

export type ResolvedPlace = {
  label: string;
  geohash: string;
  placeUrl?: string;
};
```

### Service shell pattern
```typescript
// src/services/MomentCaptureService.ts
import { type DB } from '@op-engineering/op-sqlite';
import { type PlaceResolverRegistry } from './place-resolver/PlaceResolverRegistry';
import { type RuleRegistry } from './rules/RuleRegistry';
import { type CalendarProxy } from './calendar/CalendarProxy';

export class MomentCaptureService {
  constructor(
    private readonly db: DB,
    private readonly placeRegistry: PlaceResolverRegistry,
    private readonly ruleRegistry: RuleRegistry,
    private readonly calendarProxy: CalendarProxy,
  ) {}

  async capture(_params: MomentCaptureParams): Promise<string> {
    throw new Error('MomentCaptureService.capture: not implemented');
  }
}

export type MomentCaptureParams = {
  occurredAt: number;
  geohash?: string;
  note?: string;
};
```

## Open Questions

1. **moment_tags schema**
   - What we know: Requirements list `moment_tags` table. Tags in the existing system are in `tags` + `entry_tags` (flat: `key`, `value`).
   - What's unclear: Does `moment_tags` reference the existing `tags` table, or use its own flat key/value like `entry_tags`? Or is it a simple text label?
   - Recommendation: Mirror the `entry_tags` pattern (flat `key`, `value` columns, FK to `moments`) unless caller specifies otherwise.

2. **person_dates semantics**
   - What we know: Table name `person_dates` is listed in R-DB-01.
   - What's unclear: What columns? Likely `(id, entry_id, label, date_ms)` — birthday, anniversary, etc. But not specified in requirements.
   - Recommendation: Define as `(id TEXT PK, entry_id TEXT FK entries, label TEXT, date_ms INTEGER)` and confirm with planner before coding.

3. **CalendarProxy Android API level**
   - What we know: CalendarProxy wraps CalendarContract cursor APIs.
   - What's unclear: Which Android API level to target, and whether READ_CALENDAR permission is already declared in AndroidManifest.xml.
   - Recommendation: Phase 1 stub does not touch Android APIs — defer to implementation phase.

## Sources

### Primary (HIGH confidence)
- `src/db/migrations/runner.ts` — migration registration, applyMigration, `?` binding behavior
- `src/db/sql/loader.ts` — SQL registry pattern, parseNamedQueries
- `src/db/sql/migrations/001_initial_schema.sql`, `002_encounters.sql` — existing table DDL
- `src/db/queries/encounters.ts`, `entries.ts` — query file conventions (Reads/Writes split, Tx vs DB)
- `src/db/migrations/data-runner.ts` — DataMigration type, runDataMigrations
- `src/db/data-migrations/001_backfill_encounters.ts` — backfill pattern
- `src/db/tx.ts` — withTransaction, Tx brand type
- `src/db/init.ts` — initialization order (schema migrations → data migrations)
- `src/services/NewEntryController.ts` — constructor injection pattern for services

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all patterns read directly from source
- Architecture: HIGH — migration, query, data-migration, and service patterns all verified from code
- Pitfalls: HIGH — derived from reading actual implementation constraints (? binding, nested tx, ALTER TABLE)
- Open questions: genuine gaps not answerable from existing source

**Research date:** 2026-06-21
**Valid until:** 2026-07-21 (stable patterns, no fast-moving dependencies)
