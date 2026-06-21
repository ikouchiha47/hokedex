import { SQL, parseNamedQueries } from '../sql/loader';
import type { Tx } from '../tx';
import type { DataMigration } from '../migrations/data-runner';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const Q = parseNamedQueries(SQL.dataMigration000BackfillEncounters);

export const backfillEncounters: DataMigration = {
  version: 1,
  batchSize: 50,

  run(tx: Tx, batchSize: number): number {
    let offset = 0;
    let totalInserted = 0;

    while (true) {
      const rows = tx.executeSync(Q.SELECT_UNLINKED_ENTRIES, [batchSize, offset]);
      const batch = (rows.rows ?? []) as Array<{ id: string; created_at: number }>;
      if (batch.length === 0) break;

      for (const row of batch) {
        tx.executeSync(Q.INSERT_ENCOUNTER, [generateId(), row.id, row.created_at]);
        totalInserted++;
      }

      if (batch.length < batchSize) break;
      offset += batchSize;
    }

    return totalInserted;
  },
};
