import type { Tx } from '../tx';
import type { DataMigration } from '../migrations/data-runner';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const backfillEncounters: DataMigration = {
  version: 1,
  batchSize: 50,

  run(tx: Tx, batchSize: number): number {
    let offset = 0;
    let totalInserted = 0;

    while (true) {
      const rows = tx.executeSync(
        `SELECT e.id, e.created_at
         FROM entries e
         LEFT JOIN encounters enc ON enc.entry_id = e.id
         WHERE enc.id IS NULL
         LIMIT ? OFFSET ?`,
        [batchSize, offset],
      );

      const batch = (rows.rows ?? []) as Array<{ id: string; created_at: number }>;
      if (batch.length === 0) break;

      for (const row of batch) {
        tx.executeSync(
          'INSERT OR IGNORE INTO encounters (id, entry_id, note, occurred_at) VALUES (?, ?, ?, ?)',
          [generateId(), row.id, null, row.created_at],
        );
        totalInserted++;
      }

      if (batch.length < batchSize) break;
      offset += batchSize;
    }

    return totalInserted;
  },
};
