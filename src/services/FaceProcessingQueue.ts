import type { DB } from '@op-engineering/op-sqlite';
import type { HokedexMLNative } from '../types/ml';
import { enqueueJob, claimNextPending, markJobProcessing, markJobDone, markJobFailed } from '../db/queries/processing_queue';
import { insertMomentFace, updateFaceEntry } from '../db/queries/moment_faces';
import { runDetect, runEmbedAndMatch } from './cameraCaptureFlow';
import type { Tx } from '../db/tx';

export async function enqueue(
  tx: Tx,
  momentId: string,
  photoUri: string,
): Promise<string> {
  return enqueueJob(tx, momentId, photoUri);
}

export async function drain(
  db: DB,
  modules: { HokedexML: HokedexMLNative },
  limit = 5,
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < limit; i++) {
    const jobs = await claimNextPending(db, 1);
    if (jobs.length === 0) break;

    const job = jobs[0];

    try {
      markJobProcessing(db as any, job.id);

      const faces = await runDetect(modules, job.photo_uri, 'people');

      for (const face of faces) {
        const faceId = insertMomentFace(db as any, {
          momentId: job.moment_id,
          bboxX: face.x,
          bboxY: face.y,
          bboxW: face.width,
          bboxH: face.height,
        });

        const match = await runEmbedAndMatch(modules, db, job.photo_uri, face, 'people');
        if (match.stage === 'match') {
          updateFaceEntry(db as any, faceId, match.entryId, 'matched');
        }
      }

      markJobDone(db as any, job.id);
      processed++;
    } catch {
      markJobFailed(db as any, job.id);
      failed++;
    }
  }

  return { processed, failed };
}
