import { type DB } from '@op-engineering/op-sqlite';
import { SQL, parseNamedQueries } from '../sql/loader';

// ---------------------------------------------------------------------------
// Migration registry — maps version number to the bundled SQL string.
// Add new migrations here and in src/db/sql/loader.ts.
// ---------------------------------------------------------------------------

const MIGRATIONS: ReadonlyArray<{ version: number; sql: string }> = [
  { version: 1, sql: SQL.migration001 },
  { version: 2, sql: SQL.migration002 },
  { version: 3, sql: SQL.migration003 },
  { version: 4, sql: SQL.migration004 },
  { version: 5, sql: SQL.migration005 },
  { version: 6, sql: SQL.migration006 },
  { version: 7, sql: SQL.migration007 },
  { version: 8, sql: SQL.migration008 },
];

// Parsed once at module load — these queries are always needed.
const migrationQueries = parseNamedQueries(SQL.queriesMigrations);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureMigrationsTable(db: DB): void {
  db.executeSync(SQL.migration000);
}

function isMigrationApplied(db: DB, version: number): boolean {
  const result = db.executeSync(migrationQueries.GET_MIGRATION, [version]);
  return (result.rows?.length ?? 0) > 0;
}

function recordMigration(db: DB, version: number): void {
  db.executeSync(migrationQueries.RECORD_MIGRATION, [version, Date.now()]);
}

/**
 * Split a migration SQL string into individual statements and execute each.
 *
 * Statements that contain `?` receive bind params. Currently only the seed
 * INSERT OR IGNORE in migration 001 uses a param (created_at = Date.now()).
 */
function stripComments(sql: string): string {
  return sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
}

function applyMigration(db: DB, sql: string): void {
  const statements = sql
    .split(';')
    .map(s => stripComments(s))
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    const params = stmt.includes('?') ? [Date.now()] : undefined;
    db.executeSync(stmt, params);
  }
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export function runMigrations(db: DB): void {
  ensureMigrationsTable(db);

  for (const migration of MIGRATIONS) {
    if (isMigrationApplied(db, migration.version)) continue;
    applyMigration(db, migration.sql);
    recordMigration(db, migration.version);
  }
}
