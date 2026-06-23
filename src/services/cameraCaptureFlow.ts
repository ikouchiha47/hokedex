import type { DB } from '@op-engineering/op-sqlite';
import type { BoundingBox, DetectionResult, HokedexMLNative } from '../types/ml';
import { embedCrop, float32ToBuffer } from './ingestion';
import { searchEmbeddingsByVector } from '../db/queries/embeddings';
import { getEntry } from '../db/queries/entries';

const SIMILARITY_THRESHOLD = 0.75;

export type MatchResult =
  | { stage: 'match'; entryId: string; name: string; score: number }
  | { stage: 'no_match' };

export async function runDetect(
  modules: { HokedexML: HokedexMLNative },
  imageUri: string,
  categoryId: string,
): Promise<BoundingBox[]> {
  const result: DetectionResult = await modules.HokedexML.detect(imageUri, categoryId);
  switch (result.type) {
    case 'NO_SUBJECT':
      return [];
    case 'SUCCESS':
      return [result.crop];
    case 'LOW_CONFIDENCE':
      return [result.crop];
    case 'MULTI_SUBJECT':
      return result.crops;
  }
}

export async function runEmbedAndMatch(
  modules: { HokedexML: HokedexMLNative },
  db: DB,
  imageUri: string,
  crop: BoundingBox,
  categoryId: string,
): Promise<MatchResult> {
  const vector = await embedCrop(modules, {
    imageUri,
    selectedCrop: crop,
    categoryId,
  });
  const buffer = float32ToBuffer(vector);
  const matches = await searchEmbeddingsByVector(db, buffer, categoryId);
  const best = matches[0];
  if (best && best.best_score >= SIMILARITY_THRESHOLD) {
    const entry = getEntry(db, best.entry_id);
    return {
      stage: 'match',
      entryId: best.entry_id,
      name: entry?.name ?? 'Unknown',
      score: best.best_score,
    };
  }
  return { stage: 'no_match' };
}
