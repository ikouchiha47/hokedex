import { type DB } from '@op-engineering/op-sqlite';
import { SQL, parseNamedQueries } from '../sql/loader';

const Q = parseNamedQueries(SQL.queriesEncounters);

export type Encounter = {
  id: string;
  entry_id: string;
  note: string | null;
  occurred_at: number;
};

export type EncounterWithName = Encounter & { entry_name: string };

export type EncounterStats = {
  total: number;
  unique_people: number;
  last_at: number | null;
  first_at: number | null;
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function logEncounter(db: DB, entryId: string, occurredAt: number, note?: string): string {
  const id = generateId();
  db.executeSync(Q.LOG_ENCOUNTER, [id, entryId, note ?? null, occurredAt]);
  return id;
}

export function deleteEncounter(db: DB, id: string): void {
  db.executeSync(Q.DELETE_ENCOUNTER, [id]);
}

export function listEncountersByEntry(db: DB, entryId: string): Encounter[] {
  const r = db.executeSync(Q.LIST_ENCOUNTERS_BY_ENTRY, [entryId]);
  return (r.rows?._array ?? []) as Encounter[];
}

export function listEncountersInRange(db: DB, fromMs: number, toMs: number): EncounterWithName[] {
  const r = db.executeSync(Q.LIST_ENCOUNTERS_IN_RANGE, [fromMs, toMs]);
  return (r.rows?._array ?? []) as EncounterWithName[];
}

export function getEncounterStats(db: DB): EncounterStats {
  const r = db.executeSync(Q.ENCOUNTER_STATS, []);
  const row = r.rows?._array?.[0];
  return {
    total: row?.total ?? 0,
    unique_people: row?.unique_people ?? 0,
    last_at: row?.last_at ?? null,
    first_at: row?.first_at ?? null,
  };
}
