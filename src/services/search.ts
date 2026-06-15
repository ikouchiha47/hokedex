/**
 * Search service — Phase 5.
 *
 * Takes a raw embedding (number[]) and a category, runs sqlite-vec cosine
 * similarity search, and classifies results into Likely / Possible / NoMatch tiers.
 *
 * Accepts db as a parameter (SOLID — no singleton import).
 */

import type { DB } from '@op-engineering/op-sqlite';
import { searchEmbeddingsByVector, type VectorSearchRow } from '../db/queries/embeddings';
import type { Category } from '../db/types';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type LikelyMatch = {
  type: 'LIKELY';
  entryId: string;
  similarity: number;
  profilePhotoPath: string | null;
};

export type PossibleMatch = {
  type: 'POSSIBLE';
  entryId: string;
  similarity: number;
  profilePhotoPath: string | null;
};

/** At most one LIKELY; zero or more POSSIBLE also returned for context. */
export type SearchResult =
  | { tier: 'likely';    match: LikelyMatch;         alternatives: PossibleMatch[] }
  | { tier: 'possible';  candidates: PossibleMatch[] }
  | { tier: 'no_match' };

// ---------------------------------------------------------------------------
// Tier classification (pure — exported for unit tests)
// ---------------------------------------------------------------------------

export function classifyRows(
  rows: VectorSearchRow[],
  thresholds: Pick<Category, 'similarity_threshold_likely' | 'similarity_threshold_possible'>
): SearchResult {
  const { similarity_threshold_likely, similarity_threshold_possible } = thresholds;

  const possible: PossibleMatch[] = [];
  let likely: LikelyMatch | null = null;

  for (const row of rows) {
    if (row.best_score >= similarity_threshold_likely) {
      if (!likely || row.best_score > likely.similarity) {
        likely = {
          type: 'LIKELY',
          entryId: row.entry_id,
          similarity: row.best_score,
          profilePhotoPath: row.profile_photo_path,
        };
      }
    } else if (row.best_score >= similarity_threshold_possible) {
      possible.push({
        type: 'POSSIBLE',
        entryId: row.entry_id,
        similarity: row.best_score,
        profilePhotoPath: row.profile_photo_path,
      });
    }
  }

  if (likely) {
    return { tier: 'likely', match: likely, alternatives: possible };
  }
  if (possible.length > 0) {
    return { tier: 'possible', candidates: possible };
  }
  return { tier: 'no_match' };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

function float32ToBuffer(arr: number[]): ArrayBuffer {
  const buf = new ArrayBuffer(arr.length * 4);
  new Float32Array(buf).set(arr);
  return buf;
}

export async function searchByEmbedding(
  db: DB,
  queryEmbedding: number[],
  category: Pick<Category, 'id' | 'similarity_threshold_likely' | 'similarity_threshold_possible'>
): Promise<SearchResult> {
  const vectorBuffer = float32ToBuffer(queryEmbedding);
  const rows = await searchEmbeddingsByVector(db, vectorBuffer, category.id);
  return classifyRows(rows, category);
}
