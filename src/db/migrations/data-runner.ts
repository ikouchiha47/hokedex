import { type DB } from '@op-engineering/op-sqlite';

export type DataMigration = {
  version: number;
  batchSize: number;
  run: (db: DB, batchSize: number) => number; // returns rows affected
};

function isApplied(db: DB, version: number): boolean {
  const r = db.executeSync(
    'SELECT version FROM data_migrations WHERE version = ?',
    [version],
  );
  return (r.rows?.length ?? 0) > 0;
}

function record(db: DB, version: number, rowsAffected: number): void {
  db.executeSync(
    'INSERT INTO data_migrations (version, applied_at, rows_affected) VALUES (?, ?, ?)',
    [version, Date.now(), rowsAffected],
  );
}

export function runDataMigrations(db: DB, migrations: DataMigration[]): void {
  for (const m of migrations) {
    if (isApplied(db, m.version)) continue;

    db.executeSync('BEGIN');
    try {
      const affected = m.run(db, m.batchSize);
      record(db, m.version, affected);
      db.executeSync('COMMIT');
    } catch (err) {
      db.executeSync('ROLLBACK');
      throw err;
    }
  }
}
