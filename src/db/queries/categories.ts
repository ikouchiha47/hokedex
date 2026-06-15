/**
 * SQL source of truth: src/db/sql/queries/categories.sql
 * Zero SQL in this file — queries are loaded from the .sql file via the
 * SQL registry and parsed by parseNamedQueries (sqlc pattern).
 */

import { type DB } from '@op-engineering/op-sqlite';
import { SQL, parseNamedQueries } from '../sql/loader';
import { type Category } from '../types';

const q = parseNamedQueries(SQL.queriesCategories);

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id:                            row.id as string,
    name:                          row.name as string,
    detector_model:                row.detector_model as string,
    embedding_model:               row.embedding_model as string,
    embedding_dimensions:          row.embedding_dimensions as number,
    similarity_threshold_likely:   row.similarity_threshold_likely as number,
    similarity_threshold_possible: row.similarity_threshold_possible as number,
    created_at:                    row.created_at as number,
  };
}

// ---------------------------------------------------------------------------
// name: GetCategory :one
// ---------------------------------------------------------------------------

export function getCategory(db: DB, id: string): Category | null {
  const result = db.executeSync(q.GET_CATEGORY, [id]);
  const row = result.rows?.[0];
  return row ? rowToCategory(row as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// name: ListCategories :many
// ---------------------------------------------------------------------------

export function listCategories(db: DB): Category[] {
  const result = db.executeSync(q.LIST_CATEGORIES);
  return (result.rows ?? []).map(row =>
    rowToCategory(row as Record<string, unknown>)
  );
}

// ---------------------------------------------------------------------------
// name: UpdateCategoryThresholds :exec
// ---------------------------------------------------------------------------

export function updateCategoryThresholds(
  db: DB,
  id: string,
  likely: number,
  possible: number,
): void {
  db.executeSync(q.UPDATE_CATEGORY_THRESHOLDS, [likely, possible, id]);
}

// ---------------------------------------------------------------------------
// name: InsertCategory :exec
// ---------------------------------------------------------------------------

export function insertCategory(db: DB, params: Category): void {
  db.executeSync(q.INSERT_CATEGORY, [
    params.id,
    params.name,
    params.detector_model,
    params.embedding_model,
    params.embedding_dimensions,
    params.similarity_threshold_likely,
    params.similarity_threshold_possible,
    params.created_at,
  ]);
}
