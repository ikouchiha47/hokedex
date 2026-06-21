import { type DB } from '@op-engineering/op-sqlite';
import { type Tx } from '../tx';
import { SQL, parseNamedQueries } from '../sql/loader';

const Q = parseNamedQueries(SQL.queriesPersonDates);

export type PersonDate = {
  id: string;
  entry_id: string;
  label: string;
  date_ms: number;
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Reads — async per CLAUDE.md
export async function listPersonDates(db: DB, entryId: string): Promise<PersonDate[]> {
  const r = await db.execute(Q.LIST_PERSON_DATES, [entryId]);
  return (r.rows ?? []) as PersonDate[];
}

// Writes
export function insertPersonDate(
  tx: Tx,
  entryId: string,
  label: string,
  dateMs: number,
): string {
  const id = generateId();
  tx.executeSync(Q.INSERT_PERSON_DATE, [id, entryId, label, dateMs]);
  return id;
}

export function deletePersonDate(tx: Tx, id: string): void {
  tx.executeSync(Q.DELETE_PERSON_DATE, [id]);
}
