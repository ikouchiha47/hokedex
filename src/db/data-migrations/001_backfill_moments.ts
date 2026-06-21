import { type Tx } from '../tx';
import { type DataMigration } from '../migrations/data-runner';
import { SQL, parseNamedQueries } from '../sql/loader';

const Q = parseNamedQueries(SQL.dataMigration001BackfillMoments);

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Backfill existing encounter rows into moments + moment_people.
 * Each encounter becomes one moment with one moment_person row.
 * Encounters table is preserved (R-DB-03).
 */
export const backfillMoments: DataMigration = {
  version: 2,
  batchSize: 200,
  run(tx: Tx, batchSize: number): number {
    const existing = tx.executeSync(Q.CHECK_MOMENTS_POPULATED, []);
    if ((existing.rows?.length ?? 0) > 0) {
      // Already partially or fully applied — belt-and-suspenders guard.
      // data_migrations table prevents re-entry at the runner level.
      return 0;
    }

    const rows = tx.executeSync(Q.SELECT_ENCOUNTER_BATCH, [batchSize]);

    const encounters = (rows.rows ?? []) as {
      id: string;
      entry_id: string;
      note: string | null;
      occurred_at: number;
    }[];

    let count = 0;
    for (const enc of encounters) {
      const momentId = generateId();
      const mpId = generateId();
      const now = Date.now();

      tx.executeSync(Q.INSERT_MOMENT_IGNORE, [momentId, enc.note, enc.occurred_at, null, now]);
      tx.executeSync(Q.INSERT_MOMENT_PERSON_IGNORE, [mpId, momentId, enc.entry_id]);

      count += 1;
    }

    return count;
  },
};
