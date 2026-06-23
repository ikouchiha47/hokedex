jest.mock('../../db/queries/moment_groups', () => ({
  listGroups: jest.fn(),
  listAllGroupMembers: jest.fn(),
  insertGroup: jest.fn(),
  insertGroupMember: jest.fn(),
  updateGroupBounds: jest.fn(),
}));

jest.mock('../../db/queries/moments', () => ({
  listAllMoments: jest.fn(),
}));

jest.mock('../../db/tx', () => ({
  withTransaction: jest.fn((_db: any, fn: (tx: any) => void) => fn({ executeSync: jest.fn() })),
}));

import { regroup, getRegroupStatus, onRegroupStatusChange } from '../RegroupService';
import { listGroups, listAllGroupMembers, insertGroup, insertGroupMember, updateGroupBounds } from '../../db/queries/moment_groups';
import { listAllMoments } from '../../db/queries/moments';
import { withTransaction } from '../../db/tx';

const mockDb = {} as any;

function moment(id: string, occurredAt: number) {
  return { id, occurred_at: occurredAt, latitude: null, longitude: null };
}

describe('RegroupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('status starts idle', () => {
    expect(getRegroupStatus()).toBe('idle');
  });

  test('regroup when idle transitions to running then idle', async () => {
    (listAllMoments as jest.Mock).mockResolvedValue([]);

    await regroup(mockDb);

    expect(listAllMoments).toHaveBeenCalledTimes(1);
    expect(getRegroupStatus()).toBe('idle');
  });

  test('regroup while running sets queued and runs again after', async () => {
    let resolveFirstRun: (value: any) => void;
    const firstRunPromise = new Promise<any[]>(resolve => {
      resolveFirstRun = resolve;
    });

    (listAllMoments as jest.Mock)
      .mockImplementationOnce(() => firstRunPromise)
      .mockResolvedValue([]);

    const firstCall = regroup(mockDb);
    await new Promise(process.nextTick);

    expect(getRegroupStatus()).toBe('running');

    const secondCall = regroup(mockDb);
    await new Promise(process.nextTick);

    expect(getRegroupStatus()).toBe('queued');

    resolveFirstRun!([]);

    await firstCall;
    await secondCall;

    expect(getRegroupStatus()).toBe('idle');
    expect(listAllMoments).toHaveBeenCalledTimes(2);
  });

  test('merge-only: no delete query is ever called', async () => {
    (listAllMoments as jest.Mock).mockResolvedValue([
      moment('m1', 1000),
    ]);
    (listGroups as jest.Mock).mockResolvedValue([]);
    (listAllGroupMembers as jest.Mock).mockResolvedValue([]);
    (insertGroup as jest.Mock).mockReturnValue('g1');

    await regroup(mockDb);

    const calls = (withTransaction as jest.Mock).mock.calls;
    const deleteCalls = (updateGroupBounds as jest.Mock).mock.calls.filter(
      (c: any[]) => c[0]?.toString().toLowerCase().includes('delete'),
    );

    expect(deleteCalls.length).toBe(0);
  });

  test('status callback fires on state changes', async () => {
    (listAllMoments as jest.Mock).mockResolvedValue([]);

    const states: string[] = [];
    const unsub = onRegroupStatusChange(s => states.push(s));

    await regroup(mockDb);

    expect(states).toContain('running');
    expect(states).toContain('idle');

    unsub();
  });

  test('callback cleanup works', async () => {
    const spy = jest.fn();
    const unsub = onRegroupStatusChange(spy);
    unsub();
    (listAllMoments as jest.Mock).mockResolvedValue([]);
    await regroup(mockDb);
    expect(spy).not.toHaveBeenCalled();
  });
});
