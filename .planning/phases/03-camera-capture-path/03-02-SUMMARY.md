# 03-02: Pure services for background face processing and gap-based grouping

**Status:** Complete

## What was built

- **GapClusterService** — pure function `cluster()` that splits moments into sessions wherever the time gap exceeds 1 hour (GAP_THRESHOLD_MS = 3600000). Input-order independent, exports GapClusterInput/GapCluster types. 8 passing unit tests.
- **FaceProcessingQueue** — `enqueue(tx, momentId, photoUri)` inserts a pending job; `drain(db, modules, limit)` claims pending jobs, runs detection + embedding/match via cameraCaptureFlow, inserts moment_faces, marks done/failed per job. Fault-tolerant per-job.
- **RegroupService** — `regroup(db)` with idle/running/queued state machine. Merge-only (never deletes groups). Exports `getRegroupStatus()` and `onRegroupStatusChange()` for UI spinner subscription. 6 passing unit tests.
- Added `ListAllMoments` query to `moments.sql` + `moments.ts` for regroup's full-scan read.

## Deviations

None.

## Files created

- `src/services/GapClusterService.ts`
- `src/services/FaceProcessingQueue.ts`
- `src/services/RegroupService.ts`
- `src/services/__tests__/GapClusterService.test.ts`
- `src/services/__tests__/RegroupService.test.ts`

## Files modified

- `src/db/sql/queries/moments.sql` — added ListAllMoments query
- `src/db/queries/moments.ts` — added listAllMoments export

## Tests

- GapClusterService: 8/8 passing
- RegroupService: 6/6 passing
- No React imports in any service file
