import { type DB } from '@op-engineering/op-sqlite';
import { SQL, parseNamedQueries } from '../sql/loader';

const q = parseNamedQueries(SQL.queriesTags);

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Upsert tag by name, return its id
export function upsertTag(db: DB, name: string): string {
  const existing = db.executeSync(q.GET_TAG_BY_NAME, [name]);
  if (existing.rows?.[0]) return existing.rows[0].id as string;
  const id = generateId();
  db.executeSync(q.UPSERT_TAG, [id, name]);
  return id;
}

export function addEntryTag(db: DB, entryId: string, tagId: string): void {
  db.executeSync(q.ADD_ENTRY_TAG, [entryId, tagId]);
}

export function removeEntryTag(db: DB, entryId: string, tagId: string): void {
  db.executeSync(q.REMOVE_ENTRY_TAG, [entryId, tagId]);
}

export function listTagsByEntry(db: DB, entryId: string): Array<{ id: string; name: string }> {
  const result = db.executeSync(q.LIST_TAGS_BY_ENTRY, [entryId]);
  return (result.rows ?? []).map(r => ({ id: r.id as string, name: r.name as string }));
}

export function saveEntryTags(db: DB, entryId: string, tagNames: string[]): void {
  for (const name of tagNames) {
    const tagId = upsertTag(db, name);
    addEntryTag(db, entryId, tagId);
  }
}
