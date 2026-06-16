import { type DB } from '@op-engineering/op-sqlite';
import { type Tx } from '../tx';
import { SQL, parseNamedQueries } from '../sql/loader';
import { type Note, type NoteLocation } from '../types';

const q = parseNamedQueries(SQL.queriesEntryNotes);

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function rowToNote(r: Record<string, unknown>): Note {
  return {
    id: r.id as string,
    entryId: r.entry_id as string,
    body: r.body as string,
    locationLabel: (r.location_label as string | null) ?? null,
    locationGeohash: (r.location_geohash as string | null) ?? null,
    placeUrl: (r.place_url as string | null) ?? null,
    createdAt: r.created_at as number,
  };
}

// Reads — accept plain DB

export function listNotesByEntry(db: DB, entryId: string): Note[] {
  const result = db.executeSync(q.LIST_NOTES_BY_ENTRY, [entryId]);
  return (result.rows ?? []).map(rowToNote);
}

export function listNotesNear(db: DB, geohash: string, precision: number): Note[] {
  const result = db.executeSync(q.LIST_NOTES_NEAR, [precision, geohash, precision]);
  return (result.rows ?? []).map(rowToNote);
}

// Writes — accept Tx

export function addNote(tx: Tx, entryId: string, body: string, location?: NoteLocation): void {
  const id = generateId();
  tx.executeSync(q.ADD_NOTE, [
    id,
    entryId,
    body,
    location?.label ?? null,
    location?.geohash ?? null,
    location?.placeUrl ?? null,
    Date.now(),
  ]);
}

export function deleteNote(tx: Tx, noteId: string): void {
  tx.executeSync(q.DELETE_NOTE, [noteId]);
}
