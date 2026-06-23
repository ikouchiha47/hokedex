import { type DB } from '@op-engineering/op-sqlite';
import { SQL, parseNamedQueries } from '../sql/loader';
import { type Tx } from '../tx';

const Q = parseNamedQueries(SQL.queriesMomentGroups);

export type MomentGroup = {
  id: string;
  label: string | null;
  started_at: number;
  ended_at: number;
  created_at: number;
};

export type GroupMember = {
  moment_id: string;
  group_id: string;
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function listGroups(db: DB): Promise<MomentGroup[]> {
  const r = await db.execute(Q.LIST_GROUPS);
  return (r.rows ?? []) as MomentGroup[];
}

export async function findGroupByStartRange(db: DB, fromMs: number, toMs: number): Promise<MomentGroup[]> {
  const r = await db.execute(Q.FIND_GROUP_BY_START_RANGE, [fromMs, toMs]);
  return (r.rows ?? []) as MomentGroup[];
}

export async function listMembersByGroup(db: DB, groupId: string): Promise<{ moment_id: string }[]> {
  const r = await db.execute(Q.LIST_MEMBERS_BY_GROUP, [groupId]);
  return (r.rows ?? []) as { moment_id: string }[];
}

export async function listAllGroupMembers(db: DB): Promise<GroupMember[]> {
  const r = await db.execute(Q.LIST_ALL_GROUP_MEMBERS);
  return (r.rows ?? []) as GroupMember[];
}

export function insertGroup(tx: Tx, label: string | null, startedAt: number, endedAt: number): string {
  const id = generateId();
  tx.executeSync(Q.INSERT_GROUP, [id, label, startedAt, endedAt, Date.now()]);
  return id;
}

export function insertGroupMember(tx: Tx, momentId: string, groupId: string): void {
  tx.executeSync(Q.INSERT_GROUP_MEMBER, [momentId, groupId]);
}

export function updateGroupBounds(tx: Tx, id: string, endedAt: number, label: string | null): void {
  tx.executeSync(Q.UPDATE_GROUP_BOUNDS, [endedAt, label, id]);
}
