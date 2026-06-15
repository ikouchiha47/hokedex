/**
 * Ingestion orchestrator.
 *
 * Accepts db and native modules as parameters — no singleton imports.
 * Call order: processImage (native) → detect → embed → DB transaction.
 */

import type { DB } from '@op-engineering/op-sqlite';
import { parseLongFromBridge } from '../utils/numbers';
import type { DetectionResult } from '../types/ml';
import { insertPhoto } from '../db/queries/photos';
import { insertEmbedding } from '../db/queries/embeddings';
import { type Photo, type Embedding } from '../db/types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type IngestInput = {
  imageUri: string;
  collectionRoot: string;
  entryId: string;
  categoryId: string;
  entryNameSlug: string;
};

export type IngestOutcome =
  | { status: 'embedded'; photoId: string; embeddingId: string }
  | { status: 'reference_only'; photoId: string }
  | { status: 'needs_face_selection'; photoId: string; crops: DetectionResult & { type: 'MULTI_SUBJECT' } }
  | { status: 'low_confidence_warning'; photoId: string; embeddingId: string; confidence: number };

// Shape the native modules must satisfy — callers inject these.
export type IngestNativeModules = {
  HokedexIngest: {
    processImage(
      imageUri: string,
      collectionRoot: string,
      entryNameSlug: string
    ): Promise<{ sha256: string; phash: string; relativePath: string; thumbnailRelativePath: string }>;
  };
  HokedexML: {
    detect(imageUri: string, categoryId: string): Promise<DetectionResult>;
    embed(imageUri: string, categoryId: string): Promise<number[]>;
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function float32ToBuffer(arr: number[]): ArrayBuffer {
  const buf = new ArrayBuffer(arr.length * 4);
  const view = new Float32Array(buf);
  arr.forEach((v, i) => { view[i] = v; });
  return buf;
}

function runTransaction(db: DB, work: () => void): void {
  db.executeSync('BEGIN');
  try {
    work();
    db.executeSync('COMMIT');
  } catch (e) {
    db.executeSync('ROLLBACK');
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function ingestImage(
  db: DB,
  modules: IngestNativeModules,
  input: IngestInput
): Promise<IngestOutcome> {
  const { imageUri, collectionRoot, entryId, categoryId, entryNameSlug } = input;
  const { HokedexIngest, HokedexML } = modules;

  // Step 1: SHA-256, pHash, file copy, thumbnail — one bridge call, background thread.
  // phash arrives as a decimal string from Kotlin (64-bit Long can't cross the RN bridge as a
  // JS number without losing precision). Parse once here; SQLite stores the full integer.
  const { sha256, phash: phashStr, relativePath } =
    await HokedexIngest.processImage(imageUri, collectionRoot, entryNameSlug);
  const phash = parseLongFromBridge(phashStr, 'phash');

  const photoId = generateId();
  const now = Date.now();

  // Step 2: Face detection
  const detection: DetectionResult = await HokedexML.detect(imageUri, categoryId);

  // MULTI_SUBJECT — caller must let the user pick a crop, then call again with a crop URI
  if (detection.type === 'MULTI_SUBJECT') {
    const photo: Photo = {
      id: photoId, entry_id: entryId, local_path: relativePath,
      original_sha256: sha256, original_phash: phash,
      is_profile_photo: 0, embedding_id: null, created_at: now,
    };
    runTransaction(db, () => insertPhoto(db, photo));
    return { status: 'needs_face_selection', photoId, crops: detection as DetectionResult & { type: 'MULTI_SUBJECT' } };
  }

  // NO_SUBJECT — store photo as reference only, no embedding
  if (detection.type === 'NO_SUBJECT') {
    const photo: Photo = {
      id: photoId, entry_id: entryId, local_path: relativePath,
      original_sha256: sha256, original_phash: phash,
      is_profile_photo: 0, embedding_id: null, created_at: now,
    };
    runTransaction(db, () => insertPhoto(db, photo));
    return { status: 'reference_only', photoId };
  }

  // SUCCESS or LOW_CONFIDENCE — embed and write both rows in one transaction
  const embeddingId = generateId();
  const rawEmbedding: number[] = await HokedexML.embed(imageUri, categoryId);
  const vectorBuffer = float32ToBuffer(rawEmbedding);

  const photo: Photo = {
    id: photoId, entry_id: entryId, local_path: relativePath,
    original_sha256: sha256, original_phash: phash,
    is_profile_photo: 0, embedding_id: embeddingId, created_at: now,
  };
  const embedding: Omit<Embedding, 'vector'> & { vector: ArrayBuffer } = {
    id: embeddingId, entry_id: entryId, photo_id: photoId,
    category_id: categoryId, vector: vectorBuffer, created_at: now,
  };

  runTransaction(db, () => {
    insertEmbedding(db, embedding);
    insertPhoto(db, photo);
  });

  if (detection.type === 'LOW_CONFIDENCE') {
    return { status: 'low_confidence_warning', photoId, embeddingId, confidence: detection.confidence };
  }

  return { status: 'embedded', photoId, embeddingId };
}
