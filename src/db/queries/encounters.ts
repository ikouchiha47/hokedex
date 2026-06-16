import { type DB } from '@op-engineering/op-sqlite';
import { type Tx } from '../tx';
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

// Reads — accept plain DB
export function listEncountersByEntry(db: DB, entryId: string): Encounter[] {
  const r = db.executeSync(Q.LIST_ENCOUNTERS_BY_ENTRY, [entryId]);
  return (r.rows?._array ?? r.rows ?? []) as Encounter[];
}

export function listEncountersInRange(db: DB, fromMs: number, toMs: number): EncounterWithName[] {
  const r = db.executeSync(Q.LIST_ENCOUNTERS_IN_RANGE, [fromMs, toMs]);
  return (r.rows?._array ?? r.rows ?? []) as EncounterWithName[];
}

export function getEncounterStats(db: DB): EncounterStats {
  const r = db.executeSync(Q.ENCOUNTER_STATS, []);
  const row = (r.rows?._array ?? r.rows ?? [])[0];
  return {
    total:         row?.total         ?? 0,
    unique_people: row?.unique_people ?? 0,
    last_at:       row?.last_at       ?? null,
    first_at:      row?.first_at      ?? null,
  };
}

// Writes — accept Tx
export function logEncounter(tx: Tx, entryId: string, occurredAt: number, note?: string): string {
  const id = generateId();
  tx.executeSync(Q.LOG_ENCOUNTER, [id, entryId, note ?? null, occurredAt]);
  return id;
}

export function deleteEncounter(tx: Tx, id: string): void {
  tx.executeSync(Q.DELETE_ENCOUNTER, [id]);
}

export type RegularEncounter = {
  id: string;
  name: string;
  encounter_count: number;
  last_seen: number;
};

export type TagPattern = {
  name: string;
  people_count: number;
};

export function getRegularEncounters(db: DB, sinceMs: number, limit: number): RegularEncounter[] {
  const r = db.executeSync(Q.REGULAR_ENCOUNTERS, [sinceMs, limit]);
  return (r.rows?._array ?? r.rows ?? []) as RegularEncounter[];
}

export function getTagPatternAmongRegulars(db: DB, sinceMs: number, limit: number): TagPattern[] {
  const r = db.executeSync(Q.TAG_PATTERN_AMONG_REGULARS, [sinceMs, limit]);
  return (r.rows?._array ?? r.rows ?? []) as TagPattern[];
}
