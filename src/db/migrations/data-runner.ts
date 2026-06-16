import { type DB } from '@op-engineering/op-sqlite';
import { withTransaction, type Tx } from '../tx';

export type DataMigration = {
  version: number;
  batchSize: number;
  run: (tx: Tx, batchSize: number) => number; // returns rows affected
};

function isApplied(db: DB, version: number): boolean {
  const r = db.executeSync(
    'SELECT version FROM data_migrations WHERE version = ?',
    [version],
  );
  return (r.rows?.length ?? 0) > 0;
}

export function runDataMigrations(db: DB, migrations: DataMigration[]): void {
  for (const m of migrations) {
    if (isApplied(db, m.version)) continue;
    withTransaction(db, tx => {
      const affected = m.run(tx, m.batchSize);
      tx.executeSync(
        'INSERT INTO data_migrations (version, applied_at, rows_affected) VALUES (?, ?, ?)',
        [m.version, Date.now(), affected],
      );
    });
  }
}
