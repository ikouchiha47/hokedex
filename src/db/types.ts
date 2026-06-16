import type { DetectionResult, FaceEmbedding } from '../types/ml';

export type Category = {
  id: string;
  name: string;
  detector_model: string;
  embedding_model: string;
  embedding_dimensions: number;
  similarity_threshold_likely: number;
  similarity_threshold_possible: number;
  created_at: number;
};

export type Entry = {
  id: string;
  category_id: string;
  name: string;
  notes: string | null;
  is_public: 0 | 1;
  created_at: number;
  updated_at: number;
};

export type Photo = {
  id: string;
  entry_id: string;
  /** Thumbnail path, relative to collection_root. */
  local_path: string;
  /** Original URI from picker/camera — not owned by the app, may go stale. */
  original_path: string | null;
  original_sha256: string;
  /** 64-bit DCT pHash stored as SQLite INTEGER. JS never does arithmetic on this value —
   *  Hamming distance comparisons happen in SQL via bitwise ops. */
  original_phash: number;
  is_profile_photo: 0 | 1;
  embedding_id: string | null;
  created_at: number;
};

export type Embedding = {
  id: string;
  entry_id: string;
  photo_id: string;
  category_id: string;
  vector: ArrayBuffer;
  created_at: number;
};

export type Tag = {
  id: string;
  name: string;
  key: string;
  value: string;
};

export type NoteLocation = {
  label: string;
  geohash: string;
  placeUrl?: string;
};

export type Note = {
  id: string;
  entryId: string;
  body: string;
  locationLabel: string | null;
  locationGeohash: string | null;
  placeUrl: string | null;
  createdAt: number;
};

// Contract the HokedexML native module satisfies — used for typed NativeModules access
export interface HokedexMLNative {
  detect(imageUri: string, categoryId: string): Promise<DetectionResult>;
  embed(cropUri: string, categoryId: string): Promise<FaceEmbedding>;
}
