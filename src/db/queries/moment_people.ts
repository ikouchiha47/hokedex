import { type DB } from '@op-engineering/op-sqlite';
import { type Tx } from '../tx';
import { SQL, parseNamedQueries } from '../sql/loader';

const Q = parseNamedQueries(SQL.queriesMomentPeople);

export type MomentPerson = {
  id: string;
  moment_id: string;
  entry_id: string;
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Reads — async per CLAUDE.md
export async function listPeopleByMoment(db: DB, momentId: string): Promise<MomentPerson[]> {
  const r = await db.execute(Q.LIST_PEOPLE_BY_MOMENT, [momentId]);
  return (r.rows ?? []) as MomentPerson[];
}

export async function listMomentsByEntry(
  db: DB,
  entryId: string,
): Promise<{ moment_id: string }[]> {
  const r = await db.execute(Q.LIST_MOMENTS_BY_ENTRY, [entryId]);
  return (r.rows ?? []) as { moment_id: string }[];
}

// Writes
export function insertMomentPerson(tx: Tx, momentId: string, entryId: string): string {
  const id = generateId();
  tx.executeSync(Q.INSERT_MOMENT_PERSON, [id, momentId, entryId]);
  return id;
}

export function deleteMomentPeople(tx: Tx, momentId: string): void {
  tx.executeSync(Q.DELETE_MOMENT_PEOPLE, [momentId]);
}
