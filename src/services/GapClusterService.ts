export const GAP_THRESHOLD_MS = 60 * 60 * 1000;

export type GapClusterInput = {
  id: string;
  occurredAt: number;
  latitude?: number | null;
  longitude?: number | null;
};

export type GapCluster = {
  groupId: string;
  momentIds: string[];
  startedAt: number;
  endedAt: number;
};

function generateGroupId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function cluster(moments: GapClusterInput[]): GapCluster[] {
  if (moments.length === 0) return [];

  const sorted = [...moments].sort((a, b) => a.occurredAt - b.occurredAt);

  const groups: GapCluster[] = [];
  let currentIds: string[] = [sorted[0].id];
  let currentStart = sorted[0].occurredAt;
  let currentEnd = sorted[0].occurredAt;

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].occurredAt - sorted[i - 1].occurredAt;

    if (gap > GAP_THRESHOLD_MS) {
      groups.push({
        groupId: generateGroupId(),
        momentIds: currentIds,
        startedAt: currentStart,
        endedAt: currentEnd,
      });
      currentIds = [sorted[i].id];
      currentStart = sorted[i].occurredAt;
      currentEnd = sorted[i].occurredAt;
    } else {
      currentIds.push(sorted[i].id);
      currentEnd = sorted[i].occurredAt;
    }
  }

  groups.push({
    groupId: generateGroupId(),
    momentIds: currentIds,
    startedAt: currentStart,
    endedAt: currentEnd,
  });

  return groups;
}
