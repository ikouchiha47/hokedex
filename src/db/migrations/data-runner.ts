import { type DB } from '@op-engineering/op-sqlite';
import { SQL, parseNamedQueries } from '../sql/loader';
import { withTransaction, type Tx } from '../tx';

export type DataMigration = {
  version: number;
  batchSize: number;
  run: (tx: Tx, batchSize: number) => number; // returns rows affected
};

const Q = parseNamedQueries(SQL.queriesDataMigrations);

function isApplied(db: DB, version: number): boolean {
  const r = db.executeSync(Q.CHECK_DATA_MIGRATION_APPLIED, [version]);
  return (r.rows?.length ?? 0) > 0;
}

export function runDataMigrations(db: DB, migrations: DataMigration[]): void {
  for (const m of migrations) {
    if (isApplied(db, m.version)) continue;
    withTransaction(db, tx => {
      const affected = m.run(tx, m.batchSize);
      tx.executeSync(Q.INSERT_DATA_MIGRATION, [m.version, Date.now(), affected]);
    });
  }
}
