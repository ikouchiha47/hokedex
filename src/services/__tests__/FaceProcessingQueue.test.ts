/**
 * FaceProcessingQueue — black-box behavioural tests.
 *
 * Inputs:  a DB state (processing_queue rows, moment_faces rows) + mock ML module
 * Outputs: DB mutations (job status, face rows, entry links) + return value
 *
 * All DB and ML calls are mocked at the boundary. Tests assert on what drain()
 * calls — not how it calls it internally.
 */

jest.mock('../../db/queries/processing_queue', () => ({
  resetStalledJobs: jest.fn().mockResolvedValue(undefined),
  claimNextPending: jest.fn(),
  markJobProcessing: jest.fn(),
  markJobDone: jest.fn(),
  markJobFailed: jest.fn(),
  enqueueJob: jest.fn().mockReturnValue('job-1'),
}));

jest.mock('../../db/queries/moment_faces', () => ({
  insertMomentFace: jest.fn().mockReturnValue('face-1'),
  updateFaceEntry: jest.fn(),
}));

jest.mock('../../db/tx', () => ({
  withTransaction: jest.fn((_db: any, fn: (tx: any) => any) => fn({ executeSync: jest.fn() })),
}));

jest.mock('../cameraCaptureFlow', () => ({
  runDetect: jest.fn(),
  runEmbedAndMatch: jest.fn(),
}));

import { drain, enqueue } from '../FaceProcessingQueue';
import {
  resetStalledJobs,
  claimNextPending,
  markJobProcessing,
  markJobDone,
  markJobFailed,
} from '../../db/queries/processing_queue';
import { insertMomentFace, updateFaceEntry } from '../../db/queries/moment_faces';
import { runDetect, runEmbedAndMatch } from '../cameraCaptureFlow';

const mockDb = {} as any;
const mockML = { HokedexML: { detect: jest.fn(), embed: jest.fn(), embedCrop: jest.fn() } as any };

function makeJob(id = 'job-1', momentId = 'moment-1', photoUri = 'file:///photo.jpg') {
  return { id, moment_id: momentId, photo_uri: photoUri, status: 'pending', attempts: 0, created_at: Date.now(), processed_at: null };
}

function makeBBox(x = 0, y = 0, w = 100, h = 100) {
  return { x, y, width: w, height: h };
}

beforeEach(() => {
  jest.clearAllMocks();
  (claimNextPending as jest.Mock).mockResolvedValue([]);
});

// ─── Queue empty ─────────────────────────────────────────────────────────────

describe('drain() — empty queue', () => {
  test('returns {processed:0, failed:0} when no pending jobs', async () => {
    (claimNextPending as jest.Mock).mockResolvedValue([]);
    const result = await drain(mockDb, mockML);
    expect(result).toEqual({ processed: 0, failed: 0 });
  });

  test('does not call runDetect when queue is empty', async () => {
    await drain(mockDb, mockML);
    expect(runDetect).not.toHaveBeenCalled();
  });

});

// ─── Job with no faces ───────────────────────────────────────────────────────

describe('drain() — job with no detected faces', () => {
  beforeEach(() => {
    (claimNextPending as jest.Mock)
      .mockResolvedValueOnce([makeJob()])
      .mockResolvedValue([]);
    (runDetect as jest.Mock).mockResolvedValue([]);
  });

  test('marks job as done', async () => {
    await drain(mockDb, mockML);
    expect(markJobDone).toHaveBeenCalledWith(expect.anything(), 'job-1');
  });

  test('does not insert any face rows', async () => {
    await drain(mockDb, mockML);
    expect(insertMomentFace).not.toHaveBeenCalled();
  });

  test('returns processed:1, failed:0', async () => {
    const result = await drain(mockDb, mockML);
    expect(result).toEqual({ processed: 1, failed: 0 });
  });
});

// ─── Job with faces, no match ────────────────────────────────────────────────

describe('drain() — job with 1 face, no embedding match', () => {
  beforeEach(() => {
    (claimNextPending as jest.Mock)
      .mockResolvedValueOnce([makeJob()])
      .mockResolvedValue([]);
    (runDetect as jest.Mock).mockResolvedValue([makeBBox()]);
    (runEmbedAndMatch as jest.Mock).mockResolvedValue({ stage: 'no_match' });
  });

  test('inserts one face row with null entry', async () => {
    await drain(mockDb, mockML);
    expect(insertMomentFace).toHaveBeenCalledTimes(1);
    expect(insertMomentFace).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ momentId: 'moment-1' }),
    );
  });

  test('does not call updateFaceEntry when no match', async () => {
    await drain(mockDb, mockML);
    expect(updateFaceEntry).not.toHaveBeenCalled();
  });

  test('marks job done and returns processed:1', async () => {
    const result = await drain(mockDb, mockML);
    expect(markJobDone).toHaveBeenCalledWith(expect.anything(), 'job-1');
    expect(result.processed).toBe(1);
  });
});

// ─── Job with faces, match found ─────────────────────────────────────────────

describe('drain() — job with 1 face, embedding match found', () => {
  const FACE_ID = 'face-abc';
  const ENTRY_ID = 'entry-xyz';

  beforeEach(() => {
    (claimNextPending as jest.Mock)
      .mockResolvedValueOnce([makeJob()])
      .mockResolvedValue([]);
    (runDetect as jest.Mock).mockResolvedValue([makeBBox()]);
    (runEmbedAndMatch as jest.Mock).mockResolvedValue({ stage: 'match', entryId: ENTRY_ID, name: 'Alice', score: 0.9 });
    (insertMomentFace as jest.Mock).mockReturnValue(FACE_ID);
  });

  test('calls updateFaceEntry with the face row id and matched entry id', async () => {
    await drain(mockDb, mockML);
    expect(updateFaceEntry).toHaveBeenCalledWith(
      expect.anything(),
      FACE_ID,      // ← the face PK, not the entry id
      ENTRY_ID,
      'matched',
    );
  });

  test('marks job done', async () => {
    await drain(mockDb, mockML);
    expect(markJobDone).toHaveBeenCalledWith(expect.anything(), 'job-1');
  });
});

// ─── Job with multiple faces ──────────────────────────────────────────────────

describe('drain() — job with 3 faces (2 matched, 1 no_match)', () => {
  beforeEach(() => {
    (claimNextPending as jest.Mock)
      .mockResolvedValueOnce([makeJob()])
      .mockResolvedValue([]);
    (runDetect as jest.Mock).mockResolvedValue([
      makeBBox(0, 0, 50, 50),
      makeBBox(100, 0, 50, 50),
      makeBBox(200, 0, 50, 50),
    ]);
    (insertMomentFace as jest.Mock)
      .mockReturnValueOnce('face-1')
      .mockReturnValueOnce('face-2')
      .mockReturnValueOnce('face-3');
    (runEmbedAndMatch as jest.Mock)
      .mockResolvedValueOnce({ stage: 'match', entryId: 'entry-A', name: 'Alice', score: 0.95 })
      .mockResolvedValueOnce({ stage: 'no_match' })
      .mockResolvedValueOnce({ stage: 'match', entryId: 'entry-B', name: 'Bob', score: 0.88 });
  });

  test('inserts 3 face rows', async () => {
    await drain(mockDb, mockML);
    expect(insertMomentFace).toHaveBeenCalledTimes(3);
  });

  test('calls updateFaceEntry only for matched faces, with correct face ids', async () => {
    await drain(mockDb, mockML);
    expect(updateFaceEntry).toHaveBeenCalledTimes(2);
    expect(updateFaceEntry).toHaveBeenNthCalledWith(1, expect.anything(), 'face-1', 'entry-A', 'matched');
    expect(updateFaceEntry).toHaveBeenNthCalledWith(2, expect.anything(), 'face-3', 'entry-B', 'matched');
  });
});

// ─── Failure paths ───────────────────────────────────────────────────────────

describe('drain() — runDetect throws', () => {
  beforeEach(() => {
    (claimNextPending as jest.Mock)
      .mockResolvedValueOnce([makeJob()])
      .mockResolvedValue([]);
    (runDetect as jest.Mock).mockRejectedValue(new Error('model not loaded'));
  });

  test('marks job as failed', async () => {
    await drain(mockDb, mockML);
    expect(markJobFailed).toHaveBeenCalledWith(expect.anything(), 'job-1');
  });

  test('does not mark job as done', async () => {
    await drain(mockDb, mockML);
    expect(markJobDone).not.toHaveBeenCalled();
  });

  test('returns failed:1, processed:0', async () => {
    const result = await drain(mockDb, mockML);
    expect(result).toEqual({ processed: 0, failed: 1 });
  });
});

describe('drain() — runEmbedAndMatch throws for one face', () => {
  beforeEach(() => {
    (claimNextPending as jest.Mock)
      .mockResolvedValueOnce([makeJob()])
      .mockResolvedValue([]);
    (runDetect as jest.Mock).mockResolvedValue([makeBBox(0), makeBBox(100)]);
    (insertMomentFace as jest.Mock)
      .mockReturnValueOnce('face-1')
      .mockReturnValueOnce('face-2');
    (runEmbedAndMatch as jest.Mock)
      .mockRejectedValueOnce(new Error('embed error'))
      .mockResolvedValueOnce({ stage: 'no_match' });
  });

  test('continues processing remaining faces despite one embed failure', async () => {
    await drain(mockDb, mockML);
    expect(runEmbedAndMatch).toHaveBeenCalledTimes(2);
  });

  test('still marks job done when only embed fails', async () => {
    await drain(mockDb, mockML);
    expect(markJobDone).toHaveBeenCalledWith(expect.anything(), 'job-1');
    expect(markJobFailed).not.toHaveBeenCalled();
  });
});

// ─── Limit ───────────────────────────────────────────────────────────────────

describe('drain() — limit', () => {
  test('processes at most `limit` jobs per call', async () => {
    (claimNextPending as jest.Mock).mockResolvedValue([makeJob('j1')]);
    (runDetect as jest.Mock).mockResolvedValue([]);

    const result = await drain(mockDb, mockML, 3);

    expect(claimNextPending).toHaveBeenCalledTimes(3);
    expect(result.processed).toBe(3);
  });

  test('stops early when queue is exhausted before limit', async () => {
    (claimNextPending as jest.Mock)
      .mockResolvedValueOnce([makeJob('j1')])
      .mockResolvedValueOnce([makeJob('j2')])
      .mockResolvedValue([]);
    (runDetect as jest.Mock).mockResolvedValue([]);

    const result = await drain(mockDb, mockML, 10);

    expect(result.processed).toBe(2);
  });
});

// ─── markJobProcessing timing ────────────────────────────────────────────────

describe('drain() — job is claimed before runDetect starts', () => {
  test('markJobProcessing is called before runDetect', async () => {
    const callOrder: string[] = [];
    (claimNextPending as jest.Mock)
      .mockResolvedValueOnce([makeJob()])
      .mockResolvedValue([]);
    (markJobProcessing as jest.Mock).mockImplementation(() => callOrder.push('mark'));
    (runDetect as jest.Mock).mockImplementation(() => {
      callOrder.push('detect');
      return Promise.resolve([]);
    });

    await drain(mockDb, mockML);

    expect(callOrder.indexOf('mark')).toBeLessThan(callOrder.indexOf('detect'));
  });
});

// ─── enqueue ─────────────────────────────────────────────────────────────────

describe('enqueue()', () => {
  test('returns the generated job id', async () => {
    const mockTx = { executeSync: jest.fn() } as any;
    const id = await enqueue(mockTx, 'moment-1', 'file:///photo.jpg');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});
