import type { DB } from '@op-engineering/op-sqlite';
import type { HokedexMLNative } from '../types/ml';
import { enqueueJob, claimNextPending, markJobProcessing, markJobDone, markJobFailed } from '../db/queries/processing_queue';
import { insertMomentFace, updateFaceEntry } from '../db/queries/moment_faces';
import { runDetect, runEmbedAndMatch } from './cameraCaptureFlow';
import { withTransaction } from '../db/tx';
import { CATEGORY_ID } from '../constants';
import type { Tx } from '../db/tx';

let _draining = false;

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
  if (_draining) return { processed: 0, failed: 0 };
  _draining = true;

  let processed = 0;
  let failed = 0;

  try {
    for (let i = 0; i < limit; i++) {
      const jobs = await claimNextPending(db, 1);
      if (jobs.length === 0) break;

      const job = jobs[0];

      // Claim immediately — before any async work — to close the double-claim window
      try {
        withTransaction(db, tx => markJobProcessing(tx, job.id));
      } catch (e) {
        console.warn('[FaceQueue] failed to claim job, skipping:', job.id, e);
        continue;
      }

      try {
        const faces = await runDetect(modules, job.photo_uri, CATEGORY_ID.PEOPLE);

        // Insert all face rows atomically; capture generated ids for the embed loop
        const faceIds = withTransaction(db, tx =>
          faces.map(face =>
            insertMomentFace(tx, {
              momentId: job.moment_id,
              bboxX: face.x,
              bboxY: face.y,
              bboxW: face.width,
              bboxH: face.height,
            }),
          ),
        );

        // Embed + match is async (native call) — runs outside the write transaction
        for (let fi = 0; fi < faces.length; fi++) {
          try {
            const match = await runEmbedAndMatch(modules, db, job.photo_uri, faces[fi], CATEGORY_ID.PEOPLE);
            if (match.stage === 'match') {
              withTransaction(db, tx =>
                updateFaceEntry(tx, faceIds[fi], match.entryId, 'matched'),
              );
            }
          } catch (e) {
            console.warn('[FaceQueue] embed/match failed for face:', e);
          }
        }
      } catch (e) {
        console.warn('[FaceQueue] job failed:', job.id, e);
        withTransaction(db, tx => markJobFailed(tx, job.id));
        failed++;
        continue;
      }

      // Separate try so a commit failure here doesn't falsely mark a good job failed
      try {
        withTransaction(db, tx => markJobDone(tx, job.id));
        processed++;
      } catch (e) {
        console.warn('[FaceQueue] markJobDone failed, job may replay on next drain:', job.id, e);
      }
    }
  } finally {
    _draining = false;
  }

  return { processed, failed };
}
