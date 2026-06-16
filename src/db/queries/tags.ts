import { type DB } from '@op-engineering/op-sqlite';
import { type Tx } from '../tx';
import { SQL, parseNamedQueries } from '../sql/loader';

const q = parseNamedQueries(SQL.queriesTags);

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Reads — accept plain DB
export function listTagsByEntry(db: DB, entryId: string): Array<{ id: string; name: string }> {
  const result = db.executeSync(q.LIST_TAGS_BY_ENTRY, [entryId]);
  return (result.rows ?? []).map(r => ({ id: r.id as string, name: r.name as string }));
}

// Writes — accept Tx
export function upsertTag(tx: Tx, name: string): string {
  const existing = tx.executeSync(q.GET_TAG_BY_NAME, [name]);
  if (existing.rows?.[0]) return existing.rows[0].id as string;
  const id = generateId();
  tx.executeSync(q.UPSERT_TAG, [id, name]);
  return id;
}

export function addEntryTag(tx: Tx, entryId: string, tagId: string): void {
  tx.executeSync(q.ADD_ENTRY_TAG, [entryId, tagId]);
}

export function removeEntryTag(tx: Tx, entryId: string, tagId: string): void {
  tx.executeSync(q.REMOVE_ENTRY_TAG, [entryId, tagId]);
}

export function saveEntryTags(tx: Tx, entryId: string, tagNames: string[]): void {
  for (const name of tagNames) {
    const tagId = upsertTag(tx, name);
    addEntryTag(tx, entryId, tagId);
  }
}
