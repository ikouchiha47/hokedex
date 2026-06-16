import { type DB } from '@op-engineering/op-sqlite';
import { type Tx } from '../tx';
import { SQL, parseNamedQueries } from '../sql/loader';

const q = parseNamedQueries(SQL.queriesEntryTags);

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export type TagRow = { id: string; key: string; value: string };

// Reads

export function listTagsByEntry(db: DB, entryId: string): TagRow[] {
  const r = db.executeSync(q.LIST_TAGS_BY_ENTRY, [entryId]);
  return (r.rows ?? []) as TagRow[];
}

export function getTagByKey(db: DB, entryId: string, key: string): string | null {
  const r = db.executeSync(q.GET_TAG_BY_KEY, [entryId, key]);
  const row = r.rows?.[0];
  return row ? (row.value as string) : null;
}

// Writes

export function addTag(tx: Tx, entryId: string, key: string, value: string): void {
  tx.executeSync(q.ADD_TAG, [generateId(), entryId, key, value]);
}

export function updateTagByKey(tx: Tx, entryId: string, key: string, value: string): void {
  tx.executeSync(q.UPDATE_TAG_BY_KEY, [value, entryId, key]);
}

export function updateSocialByPlatform(tx: Tx, entryId: string, platform: string, value: string): void {
  tx.executeSync(q.UPDATE_SOCIAL_BY_PLATFORM, [value, entryId, platform]);
}

export function deleteTag(tx: Tx, tagId: string): void {
  tx.executeSync(q.DELETE_TAG, [tagId]);
}
