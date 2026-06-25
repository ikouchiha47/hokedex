/**
 * RegroupService — black-box behavioural tests.
 *
 * Tests focus on:
 *   1. Concurrency state machine (idle → running → idle / queued)
 *   2. Status always returns to idle, even on error (the try/finally fix)
 *   3. findMatchingGroup correctness — merges existing groups on re-run
 *   4. Idempotency — re-grouping the same moments does not create duplicates
 *
 * DB mutations are captured through mock call inspection, not by querying a DB.
 */

jest.mock('../../db/queries/moment_groups', () => ({
  listGroups: jest.fn(),
  listAllGroupMembers: jest.fn(),
  insertGroup: jest.fn().mockReturnValue('new-group-id'),
  insertGroupMember: jest.fn(),
  updateGroupBounds: jest.fn(),
}));

jest.mock('../../db/queries/moments', () => ({
  listAllMoments: jest.fn(),
}));

jest.mock('../../db/tx', () => ({
  withTransaction: jest.fn((_db: any, fn: (tx: any) => any) => fn({ executeSync: jest.fn() })),
}));

import { regroup, getRegroupStatus, onRegroupStatusChange } from '../RegroupService';
import {
  listGroups,
  listAllGroupMembers,
  insertGroup,
  insertGroupMember,
  updateGroupBounds,
} from '../../db/queries/moment_groups';
import { listAllMoments } from '../../db/queries/moments';

const GAP = 60 * 60 * 1000; // 1 hour in ms
const mockDb = {} as any;

function moment(id: string, occurredAt: number) {
  return { id, occurred_at: occurredAt, latitude: null, longitude: null };
}

function group(id: string, startedAt: number, endedAt: number, label: string | null = null) {
  return { id, started_at: startedAt, ended_at: endedAt, label, created_at: startedAt };
}

beforeEach(() => {
  jest.clearAllMocks();
  (listGroups as jest.Mock).mockResolvedValue([]);
  (listAllGroupMembers as jest.Mock).mockResolvedValue([]);
});

// ─── Status machine ───────────────────────────────────────────────────────────

describe('status machine', () => {
  test('initial status is idle', () => {
    expect(getRegroupStatus()).toBe('idle');
  });

  test('status is running while regroup is in flight', async () => {
    let resolveRegroup!: () => void;
    (listAllMoments as jest.Mock).mockReturnValueOnce(
      new Promise<any[]>(res => { resolveRegroup = () => res([]); }),
    );

    const statuses: string[] = [];
    const unsub = onRegroupStatusChange(s => statuses.push(s));

    const run = regroup(mockDb);
    await Promise.resolve(); // let it start

    expect(getRegroupStatus()).toBe('running');

    resolveRegroup();
    await run;
    unsub();

    expect(getRegroupStatus()).toBe('idle');
    expect(statuses).toContain('running');
    expect(statuses[statuses.length - 1]).toBe('idle');
  });

  test('status returns to idle after regroup completes normally', async () => {
    (listAllMoments as jest.Mock).mockResolvedValue([]);
    await regroup(mockDb);
    expect(getRegroupStatus()).toBe('idle');
  });

  test('status returns to idle even when doRegroup throws — try/finally fix', async () => {
    (listAllMoments as jest.Mock).mockRejectedValue(new Error('db error'));

    await expect(regroup(mockDb)).rejects.toThrow('db error');

    expect(getRegroupStatus()).toBe('idle');
  });

  test('second regroup() call while running sets status queued, not running', async () => {
    let resolveFirst!: () => void;
    (listAllMoments as jest.Mock)
      .mockReturnValueOnce(new Promise<any[]>(res => { resolveFirst = () => res([]); }))
      .mockResolvedValue([]);

    const first = regroup(mockDb);
    await Promise.resolve();

    const second = regroup(mockDb);
    expect(getRegroupStatus()).toBe('queued');

    resolveFirst();
    await Promise.all([first, second]);

    expect(getRegroupStatus()).toBe('idle');
    expect(listAllMoments).toHaveBeenCalledTimes(2); // ran twice: first + queued
  });

  test('subscriber is notified on every status transition', async () => {
    (listAllMoments as jest.Mock).mockResolvedValue([]);

    const seen: string[] = [];
    const unsub = onRegroupStatusChange(s => seen.push(s));
    await regroup(mockDb);
    unsub();

    expect(seen).toContain('running');
    expect(seen).toContain('idle');
  });

  test('unsubscribed listener is not called after removal', async () => {
    (listAllMoments as jest.Mock).mockResolvedValue([]);

    const seen: string[] = [];
    const unsub = onRegroupStatusChange(s => seen.push(s));
    unsub(); // immediately unsubscribe
    await regroup(mockDb);

    expect(seen).toHaveLength(0);
  });
});

// ─── Grouping logic — first run (no existing groups) ─────────────────────────

describe('first regroup — no existing groups', () => {
  test('no moments → no groups created', async () => {
    (listAllMoments as jest.Mock).mockResolvedValue([]);
    await regroup(mockDb);
    expect(insertGroup).not.toHaveBeenCalled();
  });

  test('2 moments within 1 hour → 1 group created', async () => {
    const T = 1_000_000;
    (listAllMoments as jest.Mock).mockResolvedValue([
      moment('m1', T),
      moment('m2', T + GAP - 1),
    ]);

    await regroup(mockDb);

    expect(insertGroup).toHaveBeenCalledTimes(1);
    expect(insertGroupMember).toHaveBeenCalledWith(expect.anything(), 'm1', expect.any(String));
    expect(insertGroupMember).toHaveBeenCalledWith(expect.anything(), 'm2', expect.any(String));
  });

  test('2 moments more than 1 hour apart → 2 groups created', async () => {
    const T = 1_000_000;
    (listAllMoments as jest.Mock).mockResolvedValue([
      moment('m1', T),
      moment('m2', T + GAP + 1),
    ]);

    await regroup(mockDb);

    expect(insertGroup).toHaveBeenCalledTimes(2);
  });

  test('3 moments: first two close, third far away → 2 groups', async () => {
    const T = 1_000_000;
    (listAllMoments as jest.Mock).mockResolvedValue([
      moment('m1', T),
      moment('m2', T + 10_000),
      moment('m3', T + 10_000 + GAP + 1),
    ]);

    await regroup(mockDb);

    expect(insertGroup).toHaveBeenCalledTimes(2);
    // m1 and m2 in group 1, m3 in group 2
    const allMembers = (insertGroupMember as jest.Mock).mock.calls.map(c => c[1]);
    expect(allMembers).toContain('m1');
    expect(allMembers).toContain('m2');
    expect(allMembers).toContain('m3');
  });
});

// ─── Idempotency — re-run with same moments ───────────────────────────────────

describe('idempotency — second regroup with same moments', () => {
  test('existing group is updated, not duplicated', async () => {
    const T = 1_000_000;
    const existingGroup = group('g1', T, T + 10_000);

    (listAllMoments as jest.Mock).mockResolvedValue([
      moment('m1', T),
      moment('m2', T + 10_000),
    ]);
    (listGroups as jest.Mock).mockResolvedValue([existingGroup]);
    (listAllGroupMembers as jest.Mock).mockResolvedValue([
      { moment_id: 'm1', group_id: 'g1' },
      { moment_id: 'm2', group_id: 'g1' },
    ]);

    await regroup(mockDb);

    // Should NOT create a new group — the gap matches the existing one by startedAt
    expect(insertGroup).not.toHaveBeenCalled();
    // Should insert members (idempotent INSERT OR IGNORE in SQL)
    expect(insertGroupMember).toHaveBeenCalled();
  });

  test('new moment added to existing session extends the group bounds', async () => {
    const T = 1_000_000;
    const existingGroup = group('g1', T, T + 10_000);

    (listAllMoments as jest.Mock).mockResolvedValue([
      moment('m1', T),
      moment('m2', T + 10_000),
      moment('m3', T + 20_000), // new moment in same session
    ]);
    (listGroups as jest.Mock).mockResolvedValue([existingGroup]);
    (listAllGroupMembers as jest.Mock).mockResolvedValue([
      { moment_id: 'm1', group_id: 'g1' },
      { moment_id: 'm2', group_id: 'g1' },
    ]);

    await regroup(mockDb);

    expect(insertGroup).not.toHaveBeenCalled();
    expect(updateGroupBounds).toHaveBeenCalledWith(
      expect.anything(),
      'g1',
      T + 20_000, // new endedAt
      existingGroup.label,
    );
    // m3 added as new member
    const memberCalls = (insertGroupMember as jest.Mock).mock.calls.map(c => c[1]);
    expect(memberCalls).toContain('m3');
  });
});

// ─── findMatchingGroup — matches on startedAt not endedAt ────────────────────

describe('findMatchingGroup — matches by session start', () => {
  test('existing group matched by startedAt proximity, not endedAt', async () => {
    const SESSION_START = 2_000_000;
    const SESSION_END = SESSION_START + 30_000; // 30s session

    // Existing group has started_at = SESSION_START
    const existingGroup = group('g1', SESSION_START, SESSION_END);

    (listAllMoments as jest.Mock).mockResolvedValue([
      moment('m1', SESSION_START),
      moment('m2', SESSION_END),
    ]);
    (listGroups as jest.Mock).mockResolvedValue([existingGroup]);
    (listAllGroupMembers as jest.Mock).mockResolvedValue([]);

    await regroup(mockDb);

    // Should match g1 by startedAt (SESSION_START ≈ gap.startedAt)
    expect(insertGroup).not.toHaveBeenCalled();
  });

  test('groups from a different day are not matched', async () => {
    const T1 = 1_000_000;
    const T2 = T1 + 24 * GAP; // next day

    const oldGroup = group('g1', T1, T1 + 30_000);

    (listAllMoments as jest.Mock).mockResolvedValue([
      moment('m1', T2),
      moment('m2', T2 + 10_000),
    ]);
    (listGroups as jest.Mock).mockResolvedValue([oldGroup]);
    (listAllGroupMembers as jest.Mock).mockResolvedValue([]);

    await regroup(mockDb);

    // New session is far from old group — should create a new group
    expect(insertGroup).toHaveBeenCalledTimes(1);
  });
});
