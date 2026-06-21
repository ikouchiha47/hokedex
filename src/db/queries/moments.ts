import { type DB } from '@op-engineering/op-sqlite';
import { type Tx } from '../tx';
import { SQL, parseNamedQueries } from '../sql/loader';

const Q = parseNamedQueries(SQL.queriesMoments);

export type Moment = {
  id: string;
  note: string | null;
  occurred_at: number;
  place_id: string | null;
  status: string;
  created_at: number;
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Reads — async per CLAUDE.md (executeSync is DDL-only)
export async function getMoment(db: DB, id: string): Promise<Moment | null> {
  const r = await db.execute(Q.GET_MOMENT, [id]);
  return ((r.rows ?? [])[0] as Moment) ?? null;
}

export async function listMomentsInRange(db: DB, fromMs: number, toMs: number): Promise<Moment[]> {
  const r = await db.execute(Q.LIST_MOMENTS_IN_RANGE, [fromMs, toMs]);
  return (r.rows ?? []) as Moment[];
}

// Writes — tx.executeSync is correct inside a synchronous transaction callback
export function insertMoment(
  tx: Tx,
  note: string | null,
  occurredAt: number,
  placeId: string | null,
): string {
  const id = generateId();
  const now = Date.now();
  tx.executeSync(Q.INSERT_MOMENT, [id, note, occurredAt, placeId, now]);
  return id;
}

export function deleteMoment(tx: Tx, id: string): void {
  tx.executeSync(Q.DELETE_MOMENT, [id]);
}
