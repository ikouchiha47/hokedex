import { type DB } from '@op-engineering/op-sqlite';

/**
 * Branded transaction handle. Only obtainable inside withTransaction().
 * Write functions that must run inside a transaction accept Tx, not DB.
 * TypeScript will refuse to compile a raw DB passed where Tx is expected.
 */
export type Tx = DB & { readonly __tx: unique symbol };

/**
 * Run fn inside a BEGIN/COMMIT block. Rolls back and re-throws on any error.
 * Never nest withTransaction — SQLite will throw on double-BEGIN.
 */
export function withTransaction<T>(db: DB, fn: (tx: Tx) => T): T {
  db.executeSync('BEGIN');
  try {
    const result = fn(db as Tx);
    db.executeSync('COMMIT');
    return result;
  } catch (e) {
    try { db.executeSync('ROLLBACK'); } catch (_) {}
    throw e;
  }
}
