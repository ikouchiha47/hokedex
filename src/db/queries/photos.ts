/**
 * SQL source of truth: src/db/sql/queries/photos.sql
 * Zero SQL in this file — queries are loaded from the .sql file via the
 * SQL registry and parsed by parseNamedQueries (sqlc pattern).
 */

import { type DB } from '@op-engineering/op-sqlite';
import { type Tx } from '../tx';
import { SQL, parseNamedQueries } from '../sql/loader';
import { type Photo } from '../types';

const q = parseNamedQueries(SQL.queriesPhotos);

function rowToPhoto(row: Record<string, unknown>): Photo {
  return {
    id:               row.id as string,
    entry_id:         row.entry_id as string,
    local_path:       row.local_path as string,
    original_path:    row.original_path as string | null,
    original_sha256:  row.original_sha256 as string,
    original_phash:   row.original_phash as number,
    is_profile_photo: row.is_profile_photo as 0 | 1,
    embedding_id:     (row.embedding_id as string | null) ?? null,
    created_at:       row.created_at as number,
  };
}

// Reads — accept plain DB
export function getPhoto(db: DB, id: string): Photo | null {
  const result = db.executeSync(q.GET_PHOTO, [id]);
  const row = result.rows?.[0];
  return row ? rowToPhoto(row as Record<string, unknown>) : null;
}

export function listPhotosByEntry(db: DB, entryId: string): Photo[] {
  const result = db.executeSync(q.LIST_PHOTOS_BY_ENTRY, [entryId]);
  return (result.rows ?? []).map(r => rowToPhoto(r as Record<string, unknown>));
}

export function getProfilePhoto(db: DB, entryId: string): Photo | null {
  const result = db.executeSync(q.GET_PROFILE_PHOTO, [entryId]);
  const row = result.rows?.[0];
  return row ? rowToPhoto(row as Record<string, unknown>) : null;
}

export function countPhotosByEntry(db: DB, entryId: string): number {
  const result = db.executeSync(q.COUNT_PHOTOS_BY_ENTRY, [entryId]);
  return (result.rows?.[0]?.count as number) ?? 0;
}

// Writes — accept Tx
export function insertPhoto(tx: Tx, photo: Photo): void {
  tx.executeSync(q.INSERT_PHOTO, [
    photo.id,
    photo.entry_id,
    photo.local_path,
    photo.original_path,
    photo.original_sha256,
    photo.original_phash,
    photo.is_profile_photo,
    photo.embedding_id,
    photo.created_at,
  ]);
}

export function updatePhotoEmbeddingId(tx: Tx, photoId: string, embeddingId: string): void {
  tx.executeSync(q.UPDATE_PHOTO_EMBEDDING_ID, [embeddingId, photoId]);
}

export function deletePhoto(tx: Tx, id: string): void {
  tx.executeSync(q.DELETE_PHOTO, [id]);
}

export function setProfilePhoto(tx: Tx, photoId: string): void {
  tx.executeSync(q.SET_PROFILE_PHOTO, [photoId]);
}

export function unsetAllProfilePhotos(tx: Tx, entryId: string): void {
  tx.executeSync(q.UNSET_ALL_PROFILE_PHOTOS, [entryId]);
}
