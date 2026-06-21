import type { DB } from '@op-engineering/op-sqlite';
import { withTransaction } from '../db/tx';
import { parseLongFromBridge } from '../utils/numbers';
import type { DetectionResult } from '../types/ml';
import { insertPhoto, updatePhotoEmbeddingId } from '../db/queries/photos';
import { insertEmbedding } from '../db/queries/embeddings';
import { type Photo, type Embedding } from '../db/types';
import RNFS from 'react-native-fs';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type IngestInput = {
  imageUri: string;
  originalPath: string | null;
  collectionRoot: string;
  entryId: string;
  categoryId: string;
  entryNameSlug: string;
};

export type PendingIngest = {
  photoId: string;
  sha256: string;
  phash: number;
  thumbnailStagingPath: string;
  originalPath: string | null;
  categoryId: string;
  detection: DetectionResult;
  embeddingVector?: number[];
};

export type IngestNativeModules = {
  HokedexIngest: {
    processImage(
      imageUri: string,
      collectionRoot: string,
      entryNameSlug: string
    ): Promise<{ sha256: string; phash: string; thumbnailRelativePath: string }>;
  };
  HokedexML: {
    detect(imageUri: string, categoryId: string): Promise<DetectionResult>;
    embed(imageUri: string, categoryId: string): Promise<number[]>;
    embedCrop(imageUri: string, x: number, y: number, width: number, height: number, categoryId: string): Promise<number[]>;
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function float32ToBuffer(arr: number[]): ArrayBuffer {
  const buf = new ArrayBuffer(arr.length * 4);
  const view = new Float32Array(buf);
  arr.forEach((v, i) => { view[i] = v; });
  return buf;
}

// ---------------------------------------------------------------------------
// Detect + thumbnail only — no DB writes
// ---------------------------------------------------------------------------

export async function ingestImage(
  modules: IngestNativeModules,
  input: IngestInput
): Promise<PendingIngest> {
  const { imageUri, originalPath, collectionRoot, entryNameSlug, categoryId } = input;
  const { HokedexIngest, HokedexML } = modules;

  const { sha256, phash: phashStr, thumbnailRelativePath } =
    await HokedexIngest.processImage(imageUri, collectionRoot, entryNameSlug);
  const phash = parseLongFromBridge(phashStr, 'phash');

  const photoId = generateId();
  const detection: DetectionResult = await HokedexML.detect(imageUri, categoryId);

  if (detection.type === 'MULTI_SUBJECT') {
    return { photoId, sha256, phash, thumbnailStagingPath: thumbnailRelativePath, originalPath, categoryId, detection };
  }

  if (detection.type === 'NO_SUBJECT' || detection.type === 'LOW_CONFIDENCE') {
    return { photoId, sha256, phash, thumbnailStagingPath: thumbnailRelativePath, originalPath, categoryId, detection };
  }

  // SUCCESS — pre-embed so commit is one shot
  const embeddingVector = await HokedexML.embed(imageUri, categoryId);
  return { photoId, sha256, phash, thumbnailStagingPath: thumbnailRelativePath, originalPath, categoryId, detection, embeddingVector };
}

// ---------------------------------------------------------------------------
// Commit — moves thumbnail staging → thumbnails/$year/, writes DB rows
// ---------------------------------------------------------------------------

export async function commitIngest(
  db: DB,
  entryId: string,
  pending: PendingIngest,
  collectionRoot: string,
  embeddingVector?: number[],
): Promise<{ photoId: string; embeddingId?: string }> {
  const { photoId, sha256, phash, thumbnailStagingPath, originalPath, categoryId } = pending;
  const vector = embeddingVector ?? pending.embeddingVector;

  const year = new Date().getFullYear().toString();
  const filename = thumbnailStagingPath.replace('staging/', '');
  const destRelPath = `thumbnails/${year}/${filename}`;
  const srcAbs = `${collectionRoot}/${thumbnailStagingPath}`;
  const destAbs = `${collectionRoot}/thumbnails/${year}`;

  await RNFS.mkdir(destAbs);
  await RNFS.moveFile(srcAbs, `${destAbs}/${filename}`);

  const now = Date.now();

  if (vector && vector.length > 0) {
    const embeddingId = generateId();
    const vectorBuffer = float32ToBuffer(vector);

    const photo: Photo = {
      id: photoId, entry_id: entryId, local_path: destRelPath, original_path: originalPath,
      original_sha256: sha256, original_phash: phash,
      is_profile_photo: 0, embedding_id: embeddingId, created_at: now,
    };
    const embedding: Omit<Embedding, 'vector'> & { vector: ArrayBuffer } = {
      id: embeddingId, entry_id: entryId, photo_id: photoId,
      category_id: categoryId, vector: vectorBuffer, created_at: now,
    };

    withTransaction(db, tx => {
      insertPhoto(tx, photo);
      insertEmbedding(tx, embedding);
    });

    return { photoId, embeddingId };
  }

  const photo: Photo = {
    id: photoId, entry_id: entryId, local_path: destRelPath, original_path: originalPath,
    original_sha256: sha256, original_phash: phash,
    is_profile_photo: 0, embedding_id: null, created_at: now,
  };

  withTransaction(db, tx => insertPhoto(tx, photo));
  return { photoId };
}

// ---------------------------------------------------------------------------
// Embed a manually drawn/selected crop — returns vector only, no DB write
// ---------------------------------------------------------------------------

export type SelectedFaceInput = {
  imageUri: string;
  selectedCrop: { x: number; y: number; width: number; height: number };
  categoryId: string;
};

export async function embedCrop(
  modules: Pick<IngestNativeModules, 'HokedexML'>,
  input: SelectedFaceInput,
): Promise<number[]> {
  const { imageUri, selectedCrop, categoryId } = input;
  return modules.HokedexML.embedCrop(
    imageUri,
    selectedCrop.x, selectedCrop.y, selectedCrop.width, selectedCrop.height,
    categoryId,
  );
}

// ---------------------------------------------------------------------------
// Wipe staging on app boot — call before first render
// ---------------------------------------------------------------------------

export async function wipeStagingDir(collectionRoot: string): Promise<void> {
  const stagingDir = `${collectionRoot}/staging`;
  try {
    const exists = await RNFS.exists(stagingDir);
    if (!exists) return;
    const files = await RNFS.readDir(stagingDir);
    await Promise.all(files.map(f => RNFS.unlink(f.path)));
  } catch (e) {
    console.warn('[wipeStagingDir] failed:', e);
  }
}
