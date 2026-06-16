import { classifyRows, type SearchResult } from '../search';
import type { VectorSearchRow } from '../../db/queries/embeddings';

const THRESHOLDS = { similarity_threshold_likely: 0.95, similarity_threshold_possible: 0.85 };

function row(entry_id: string, best_score: number, profile_photo_path: string | null = null): VectorSearchRow {
  return { entry_id, best_score, profile_photo_path };
}

describe('classifyRows', () => {
  test('empty rows → no_match', () => {
    const result = classifyRows([], THRESHOLDS);
    expect(result.tier).toBe('no_match');
  });

  test('single row above likely threshold → likely', () => {
    const result = classifyRows([row('alice', 0.97)], THRESHOLDS);
    expect(result.tier).toBe('likely');
    if (result.tier === 'likely') {
      expect(result.match.entryId).toBe('alice');
      expect(result.match.similarity).toBeCloseTo(0.97);
    }
  });

  test('single row in possible band → possible', () => {
    const result = classifyRows([row('bob', 0.90)], THRESHOLDS);
    expect(result.tier).toBe('possible');
    if (result.tier === 'possible') {
      expect(result.candidates[0].entryId).toBe('bob');
    }
  });

  test('single row below possible threshold → no_match', () => {
    const result = classifyRows([row('carol', 0.70)], THRESHOLDS);
    expect(result.tier).toBe('no_match');
  });

  test('R-5.3: multiple rows above likely → only highest is LIKELY', () => {
    const result = classifyRows([
      row('alice', 0.98),
      row('dave', 0.96),
    ], THRESHOLDS);
    expect(result.tier).toBe('likely');
    if (result.tier === 'likely') {
      expect(result.match.entryId).toBe('alice');
      expect(result.match.similarity).toBeCloseTo(0.98);
    }
  });

  test('likely match carries possible alternatives', () => {
    const result = classifyRows([
      row('alice', 0.97),
      row('bob', 0.88),
      row('carol', 0.60),
    ], THRESHOLDS);
    expect(result.tier).toBe('likely');
    if (result.tier === 'likely') {
      expect(result.moreLikely).toHaveLength(0);
      expect(result.alternatives).toHaveLength(1);
      expect(result.alternatives[0].entryId).toBe('bob');
    }
  });

  test('multiple entries above likely threshold — extras in moreLikely', () => {
    const result = classifyRows([
      row('alice', 0.97),
      row('bob', 0.96),
      row('carol', 0.88),
    ], THRESHOLDS);
    expect(result.tier).toBe('likely');
    if (result.tier === 'likely') {
      expect(result.match.entryId).toBe('alice');
      expect(result.moreLikely).toHaveLength(1);
      expect(result.moreLikely[0].entryId).toBe('bob');
      expect(result.alternatives).toHaveLength(1);
      expect(result.alternatives[0].entryId).toBe('carol');
    }
  });

  test('profile photo path is forwarded', () => {
    const result = classifyRows([row('alice', 0.97, 'people/alice/thumb.jpg')], THRESHOLDS);
    expect(result.tier).toBe('likely');
    if (result.tier === 'likely') {
      expect(result.match.profilePhotoPath).toBe('people/alice/thumb.jpg');
    }
  });

  test('null profile photo path is preserved', () => {
    const result = classifyRows([row('alice', 0.97, null)], THRESHOLDS);
    if (result.tier === 'likely') {
      expect(result.match.profilePhotoPath).toBeNull();
    }
  });

  test('exact likely boundary is included', () => {
    const result = classifyRows([row('alice', 0.95)], THRESHOLDS);
    expect(result.tier).toBe('likely');
  });

  test('exact possible boundary is included', () => {
    const result = classifyRows([row('bob', 0.85)], THRESHOLDS);
    expect(result.tier).toBe('possible');
  });

  test('just below possible boundary → no_match', () => {
    const result = classifyRows([row('carol', 0.8499)], THRESHOLDS);
    expect(result.tier).toBe('no_match');
  });

  test('possible candidates ordered by caller (rows already sorted by score DESC)', () => {
    const result = classifyRows([
      row('bob', 0.92),
      row('dave', 0.87),
    ], THRESHOLDS);
    expect(result.tier).toBe('possible');
    if (result.tier === 'possible') {
      expect(result.candidates.map(c => c.entryId)).toEqual(['bob', 'dave']);
    }
  });
});
