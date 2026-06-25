import type { DB } from '@op-engineering/op-sqlite';
import { withTransaction } from '../db/tx';
import { listAllMoments } from '../db/queries/moments';
import { listGroups, listAllGroupMembers, insertGroup, insertGroupMember, updateGroupBounds, type MomentGroup } from '../db/queries/moment_groups';
import { cluster, GAP_THRESHOLD_MS, type GapCluster } from './GapClusterService';

export type RegroupStatus = 'idle' | 'running' | 'queued';

type StatusCallback = (status: RegroupStatus) => void;

let _currentStatus: RegroupStatus = 'idle';
const _callbacks: StatusCallback[] = [];

function setStatus(status: RegroupStatus): void {
  _currentStatus = status;
  for (const cb of _callbacks) {
    cb(status);
  }
}

export function getRegroupStatus(): RegroupStatus {
  return _currentStatus;
}

export function onRegroupStatusChange(cb: StatusCallback): () => void {
  _callbacks.push(cb);
  return () => {
    const idx = _callbacks.indexOf(cb);
    if (idx !== -1) _callbacks.splice(idx, 1);
  };
}

export async function regroup(db: DB): Promise<void> {
  if (_currentStatus === 'running') {
    setStatus('queued');
    return;
  }

  setStatus('running');

  try {
    while (true) {
      await doRegroup(db);

      if (_currentStatus === 'queued') {
        setStatus('running');
      } else {
        break;
      }
    }
  } finally {
    setStatus('idle');
  }
}

async function doRegroup(db: DB): Promise<void> {
  const allMoments = await listAllMoments(db);
  if (allMoments.length === 0) return;

  const gaps = cluster(
    allMoments.map(m => ({
      id: m.id,
      occurredAt: m.occurred_at,
      latitude: m.latitude,
      longitude: m.longitude,
    })),
  );

  const existingGroups = await listGroups(db);
  const allMembers = await listAllGroupMembers(db);

  const memberMap = new Map<string, string[]>();
  for (const m of allMembers) {
    const list = memberMap.get(m.group_id) ?? [];
    list.push(m.moment_id);
    memberMap.set(m.group_id, list);
  }

  withTransaction(db, tx => {
    for (const gap of gaps) {
      const matched = findMatchingGroup(gap, existingGroups, memberMap);
      if (matched) {
        for (const momentId of gap.momentIds) {
          insertGroupMember(tx, momentId, matched.id);
        }
        if (gap.endedAt > matched.ended_at) {
          updateGroupBounds(tx, matched.id, gap.endedAt, matched.label);
        }
      } else {
        const groupId = insertGroup(tx, null, gap.startedAt, gap.endedAt);
        for (const momentId of gap.momentIds) {
          insertGroupMember(tx, momentId, groupId);
        }
      }
    }
  });
}

function findMatchingGroup(
  gap: GapCluster,
  groups: MomentGroup[],
  memberMap: Map<string, string[]>,
): MomentGroup | null {
  const rangeStart = gap.startedAt - GAP_THRESHOLD_MS;
  const rangeEnd = gap.startedAt + GAP_THRESHOLD_MS;

  for (const g of groups) {
    if (g.started_at >= rangeStart && g.started_at <= rangeEnd) {
      return g;
    }
  }
  return null;
}
