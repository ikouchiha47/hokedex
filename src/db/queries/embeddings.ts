/**
 * SQL source of truth: src/db/sql/queries/embeddings.sql
 * Zero SQL in this file — queries are loaded from the .sql file via the
 * SQL registry and parsed by parseNamedQueries (sqlc pattern).
 */

import { type DB } from '@op-engineering/op-sqlite';
import { SQL, parseNamedQueries } from '../sql/loader';
import { type Embedding } from '../types';

const q = parseNamedQueries(SQL.queriesEmbeddings);

// ---------------------------------------------------------------------------
// name: InsertEmbedding :exec
// ---------------------------------------------------------------------------

export function insertEmbedding(
  db: DB,
  embedding: Omit<Embedding, 'vector'> & { vector: ArrayBuffer }
): void {
  db.executeSync(q.INSERT_EMBEDDING, [
    embedding.id,
    embedding.entry_id,
    embedding.photo_id,
    embedding.category_id,
    embedding.vector,
    embedding.created_at,
  ]);
}

// ---------------------------------------------------------------------------
// name: DeleteEmbeddingsByEntry :exec
// ---------------------------------------------------------------------------

export function deleteEmbeddingsByEntry(db: DB, entryId: string): void {
  db.executeSync(q.DELETE_EMBEDDINGS_BY_ENTRY, [entryId]);
}

// ---------------------------------------------------------------------------
// name: SearchEmbeddingsByVector :many
// Uses sqlite-vec vec_distance_cosine. best_score is cosine similarity (0–1).
// Async — runtime query, not startup DDL.
// ---------------------------------------------------------------------------

export type VectorSearchRow = {
  entry_id: string;
  best_score: number;
  profile_photo_path: string | null;
};

export async function searchEmbeddingsByVector(
  db: DB,
  queryVector: ArrayBuffer,
  categoryId: string
): Promise<VectorSearchRow[]> {
  const result = await db.execute(q.SEARCH_EMBEDDINGS_BY_VECTOR, [queryVector, categoryId]);
  return (result.rows ?? []).map(r => ({
    entry_id:           r.entry_id as string,
    best_score:         r.best_score as number,
    profile_photo_path: (r.profile_photo_path as string | null) ?? null,
  }));
}
