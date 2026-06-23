import { type DB } from '@op-engineering/op-sqlite';
import { SQL, parseNamedQueries } from '../sql/loader';

const Q = parseNamedQueries(SQL.queriesProcessingQueue);

export type QueueJob = {
  id: string;
  moment_id: string;
  photo_uri: string;
  status: string;
  attempts: number;
  created_at: number;
  processed_at: number | null;
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function claimNextPending(db: DB, limit: number): Promise<QueueJob[]> {
  const r = await db.execute(Q.CLAIM_NEXT_PENDING, [limit]);
  return (r.rows ?? []) as QueueJob[];
}

export async function countPending(db: DB): Promise<number> {
  const r = await db.execute(Q.COUNT_PENDING);
  const row = (r.rows ?? [])[0] as { count: number } | undefined;
  return row?.count ?? 0;
}

export function enqueueJob(
  tx: import('../tx').Tx,
  momentId: string,
  photoUri: string,
): string {
  const id = generateId();
  tx.executeSync(Q.ENQUEUE_JOB, [id, momentId, photoUri, Date.now()]);
  return id;
}

export function markJobProcessing(tx: import('../tx').Tx, id: string): void {
  tx.executeSync(Q.MARK_JOB_PROCESSING, [id]);
}

export function markJobDone(tx: import('../tx').Tx, id: string): void {
  tx.executeSync(Q.MARK_JOB_DONE, [Date.now(), id]);
}

export function markJobFailed(tx: import('../tx').Tx, id: string): void {
  tx.executeSync(Q.MARK_JOB_FAILED, [Date.now(), id]);
}
