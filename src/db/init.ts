import { open, type DB } from '@op-engineering/op-sqlite';
import { runMigrations } from './migrations/runner';
import { runDataMigrations } from './migrations/data-runner';
import { backfillEncounters } from './data-migrations/001_backfill_encounters';
import { backfillMoments } from './data-migrations/001_backfill_moments';
import { updateCategoryThresholds } from './queries/categories';
import { CATEGORY_ID } from '../constants';

// Calibrated for MobileFaceNet/ArcFace 512-dim cosine similarity.
// Different photos of same person typically score 0.40–0.75.
const THRESHOLDS = { likely: 0.55, possible: 0.35 } as const;

let db: DB | null = null;

const PRAGMAS = [
  "PRAGMA journal_mode = WAL",
  "PRAGMA synchronous = NORMAL",
  "PRAGMA foreign_keys = ON",
  "PRAGMA temp_store = memory",
  "PRAGMA cache_size = 2000",
  "PRAGMA mmap_size = 134217728",
  "PRAGMA journal_size_limit = 67108864",
  "PRAGMA busy_timeout = 5000",
] as const;

export async function initDatabase(collectionRoot: string): Promise<DB> {
  if (db) return db;

  db = open({ name: 'hokedex.db', location: collectionRoot });

  for (const pragma of PRAGMAS) {
    db.executeSync(pragma);
  }

  // Verify WAL mode was applied
  const result = db.executeSync("PRAGMA journal_mode");
  const mode = result.rows?.[0]?.journal_mode as string | undefined;
  if (mode !== 'wal') {
    console.error(`[DB] Expected WAL mode, got: ${mode}. Re-applying.`);
    db.executeSync("PRAGMA journal_mode = WAL");
  }

  // Schema migrations first — DDL only, sync, must finish before anything else
  runMigrations(db);

  // Always sync thresholds from code so we can tune without a schema migration.
  updateCategoryThresholds(db, CATEGORY_ID.PEOPLE, THRESHOLDS.likely, THRESHOLDS.possible);

  // Data migrations — run after schema is ready, process existing rows in batches
  runDataMigrations(db, [backfillEncounters, backfillMoments]);

  return db;
}

export function getDatabase(): DB {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export function closeDatabase(): void {
  if (!db) return;

  db.executeSync("PRAGMA optimize");
  db.executeSync("PRAGMA wal_checkpoint(PASSIVE)");
  db.close();
  db = null;
}
