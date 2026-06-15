/**
 * SQL source of truth: src/db/sql/queries/entries.sql
 * Zero SQL in this file — queries are loaded from the .sql file via the
 * SQL registry and parsed by parseNamedQueries (sqlc pattern).
 */

import { type DB } from '@op-engineering/op-sqlite';
import { SQL, parseNamedQueries } from '../sql/loader';
import { type Entry } from '../types';

const q = parseNamedQueries(SQL.queriesEntries);

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function rowToEntry(row: Record<string, unknown>): Entry {
  return {
    id:          row.id as string,
    category_id: row.category_id as string,
    name:        row.name as string,
    notes:       (row.notes as string | null) ?? null,
    is_public:   row.is_public as 0 | 1,
    created_at:  row.created_at as number,
    updated_at:  row.updated_at as number,
  };
}

// ---------------------------------------------------------------------------
// name: GetEntry :one
// ---------------------------------------------------------------------------

export function getEntry(db: DB, id: string): Entry | null {
  const result = db.executeSync(q.GET_ENTRY, [id]);
  const row = result.rows?.[0];
  return row ? rowToEntry(row as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// name: ListEntriesByCategory :many
// ---------------------------------------------------------------------------

export function listEntriesByCategory(db: DB, categoryId: string): Entry[] {
  const result = db.executeSync(q.LIST_ENTRIES_BY_CATEGORY, [categoryId]);
  return (result.rows ?? []).map(row =>
    rowToEntry(row as Record<string, unknown>)
  );
}

// ---------------------------------------------------------------------------
// name: InsertEntry :exec
// ---------------------------------------------------------------------------

export function insertEntry(db: DB, params: Entry): void {
  db.executeSync(q.INSERT_ENTRY, [
    params.id,
    params.category_id,
    params.name,
    params.notes,
    params.is_public,
    params.created_at,
    params.updated_at,
  ]);
}

// ---------------------------------------------------------------------------
// name: UpdateEntryName :exec
// ---------------------------------------------------------------------------

export type UpdateEntryNameParams = { id: string; name: string; updated_at: number };

export function updateEntryName(db: DB, params: UpdateEntryNameParams): void {
  db.executeSync(q.UPDATE_ENTRY_NAME, [params.name, params.updated_at, params.id]);
}

// ---------------------------------------------------------------------------
// name: DeleteEntry :exec
// ---------------------------------------------------------------------------

export function deleteEntry(db: DB, id: string): void {
  db.executeSync(q.DELETE_ENTRY, [id]);
}
