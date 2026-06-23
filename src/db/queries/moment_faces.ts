import { type DB } from '@op-engineering/op-sqlite';
import { SQL, parseNamedQueries } from '../sql/loader';

const Q = parseNamedQueries(SQL.queriesMomentFaces);

export type MomentFace = {
  id: string;
  moment_id: string;
  entry_id: string | null;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
  status: string;
  created_at: number;
};

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function listFacesByMoment(db: DB, momentId: string): Promise<MomentFace[]> {
  const r = await db.execute(Q.LIST_FACES_BY_MOMENT, [momentId]);
  return (r.rows ?? []) as MomentFace[];
}

export function insertMomentFace(
  tx: import('../tx').Tx,
  params: {
    momentId: string;
    entryId?: string | null;
    bboxX: number;
    bboxY: number;
    bboxW: number;
    bboxH: number;
    status?: string;
  },
): string {
  const id = generateId();
  tx.executeSync(Q.INSERT_MOMENT_FACE, [
    id,
    params.momentId,
    params.entryId ?? null,
    params.bboxX,
    params.bboxY,
    params.bboxW,
    params.bboxH,
    params.status ?? 'detected',
    Date.now(),
  ]);
  return id;
}

export function updateFaceStatus(tx: import('../tx').Tx, id: string, status: string): void {
  tx.executeSync(Q.UPDATE_FACE_STATUS, [status, id]);
}

export function updateFaceEntry(tx: import('../tx').Tx, id: string, entryId: string, status: string): void {
  tx.executeSync(Q.UPDATE_FACE_ENTRY, [entryId, status, id]);
}
