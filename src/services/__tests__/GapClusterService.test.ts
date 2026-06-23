import { cluster, GAP_THRESHOLD_MS } from '../GapClusterService';

function moment(id: string, occurredAt: number): Parameters<typeof cluster>[0][number] {
  return { id, occurredAt };
}

describe('GapClusterService.cluster', () => {
  test('empty input returns empty array', () => {
    expect(cluster([])).toEqual([]);
  });

  test('single moment creates one group with equal start and end', () => {
    const result = cluster([moment('a', 1000)]);
    expect(result).toHaveLength(1);
    expect(result[0].momentIds).toEqual(['a']);
    expect(result[0].startedAt).toBe(1000);
    expect(result[0].endedAt).toBe(1000);
  });

  test('moments within GAP_THRESHOLD_MS are grouped together', () => {
    const result = cluster([
      moment('a', 1000),
      moment('b', 1000 + GAP_THRESHOLD_MS - 1),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].momentIds).toEqual(['a', 'b']);
    expect(result[0].startedAt).toBe(1000);
    expect(result[0].endedAt).toBe(1000 + GAP_THRESHOLD_MS - 1);
  });

  test('gap strictly greater than GAP_THRESHOLD_MS splits into new group', () => {
    const result = cluster([
      moment('a', 1000),
      moment('b', 1000 + GAP_THRESHOLD_MS + 1),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].momentIds).toEqual(['a']);
    expect(result[1].momentIds).toEqual(['b']);
  });

  test('gap exactly at GAP_THRESHOLD_MS stays in one group', () => {
    const result = cluster([
      moment('a', 1000),
      moment('b', 1000 + GAP_THRESHOLD_MS),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].momentIds).toEqual(['a', 'b']);
  });

  test('input order independent - unsorted input is sorted', () => {
    const result = cluster([
      moment('c', 3000),
      moment('a', 1000),
      moment('b', 2000),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].momentIds).toEqual(['a', 'b', 'c']);
    expect(result[0].startedAt).toBe(1000);
    expect(result[0].endedAt).toBe(3000);
  });

  test('multiple groups with varying gaps', () => {
    const result = cluster([
      moment('a', 1000),
      moment('b', 2000),
      moment('c', 1000 + GAP_THRESHOLD_MS + 10000),
      moment('d', 1000 + GAP_THRESHOLD_MS + 20000),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].momentIds).toEqual(['a', 'b']);
    expect(result[1].momentIds).toEqual(['c', 'd']);
  });

  test('groupId is a string', () => {
    const result = cluster([moment('a', 1000)]);
    expect(typeof result[0].groupId).toBe('string');
    expect(result[0].groupId.length).toBeGreaterThan(0);
  });
});
