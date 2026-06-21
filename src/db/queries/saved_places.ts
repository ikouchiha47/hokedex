import { type DB } from '@op-engineering/op-sqlite';
import { type Tx } from '../tx';
import { SQL, parseNamedQueries } from '../sql/loader';

const Q = parseNamedQueries(SQL.queriesSavedPlaces);

export type SavedPlace = {
  id: string;
  name: string;
  address: string | null;
  lat_e6: number | null;
  lng_e6: number | null;
  created_at: number;
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Reads — async per CLAUDE.md
export async function getSavedPlace(db: DB, id: string): Promise<SavedPlace | null> {
  const r = await db.execute(Q.GET_SAVED_PLACE, [id]);
  return ((r.rows ?? [])[0] as SavedPlace) ?? null;
}

export async function listSavedPlaces(db: DB): Promise<SavedPlace[]> {
  const r = await db.execute(Q.LIST_SAVED_PLACES, []);
  return (r.rows ?? []) as SavedPlace[];
}

// Writes
export function insertSavedPlace(
  tx: Tx,
  name: string,
  address: string | null,
  latE6: number | null,
  lngE6: number | null,
): string {
  const id = generateId();
  const now = Date.now();
  tx.executeSync(Q.INSERT_SAVED_PLACE, [id, name, address, latE6, lngE6, now]);
  return id;
}

export function deleteSavedPlace(tx: Tx, id: string): void {
  tx.executeSync(Q.DELETE_SAVED_PLACE, [id]);
}
