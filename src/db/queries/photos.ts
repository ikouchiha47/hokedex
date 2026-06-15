/**
 * SQL source of truth: src/db/sql/queries/photos.sql
 * Zero SQL in this file — queries are loaded from the .sql file via the
 * SQL registry and parsed by parseNamedQueries (sqlc pattern).
 */

import { type DB } from '@op-engineering/op-sqlite';
import { SQL, parseNamedQueries } from '../sql/loader';
import { type Photo } from '../types';

const q = parseNamedQueries(SQL.queriesPhotos);

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function rowToPhoto(row: Record<string, unknown>): Photo {
  return {
    id:               row.id as string,
    entry_id:         row.entry_id as string,
    local_path:       row.local_path as string,
    original_sha256:  row.original_sha256 as string,
    original_phash:   row.original_phash as number,
    is_profile_photo: row.is_profile_photo as 0 | 1,
    embedding_id:     (row.embedding_id as string | null) ?? null,
    created_at:       row.created_at as number,
  };
}

// ---------------------------------------------------------------------------
// name: InsertPhoto :exec
// ---------------------------------------------------------------------------

export function insertPhoto(db: DB, photo: Photo): void {
  db.executeSync(q.INSERT_PHOTO, [
    photo.id,
    photo.entry_id,
    photo.local_path,
    photo.original_sha256,
    photo.original_phash,
    photo.is_profile_photo,
    photo.embedding_id,
    photo.created_at,
  ]);
}

// ---------------------------------------------------------------------------
// name: GetPhoto :one
// ---------------------------------------------------------------------------

export function getPhoto(db: DB, id: string): Photo | null {
  const result = db.executeSync(q.GET_PHOTO, [id]);
  const row = result.rows?.[0];
  return row ? rowToPhoto(row as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// name: ListPhotosByEntry :many
// ---------------------------------------------------------------------------

export function listPhotosByEntry(db: DB, entryId: string): Photo[] {
  const result = db.executeSync(q.LIST_PHOTOS_BY_ENTRY, [entryId]);
  return (result.rows ?? []).map(r => rowToPhoto(r as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// name: UpdatePhotoEmbeddingId :exec
// ---------------------------------------------------------------------------

export function updatePhotoEmbeddingId(db: DB, photoId: string, embeddingId: string): void {
  db.executeSync(q.UPDATE_PHOTO_EMBEDDING_ID, [embeddingId, photoId]);
}

// ---------------------------------------------------------------------------
// name: DeletePhoto :exec
// ---------------------------------------------------------------------------

export function deletePhoto(db: DB, id: string): void {
  db.executeSync(q.DELETE_PHOTO, [id]);
}

// ---------------------------------------------------------------------------
// name: GetProfilePhoto :one
// ---------------------------------------------------------------------------

export function getProfilePhoto(db: DB, entryId: string): Photo | null {
  const result = db.executeSync(q.GET_PROFILE_PHOTO, [entryId]);
  const row = result.rows?.[0];
  return row ? rowToPhoto(row as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// name: SetProfilePhoto :exec
// ---------------------------------------------------------------------------

export function setProfilePhoto(db: DB, photoId: string): void {
  db.executeSync(q.SET_PROFILE_PHOTO, [photoId]);
}

// ---------------------------------------------------------------------------
// name: UnsetAllProfilePhotos :exec
// ---------------------------------------------------------------------------

export function unsetAllProfilePhotos(db: DB, entryId: string): void {
  db.executeSync(q.UNSET_ALL_PROFILE_PHOTOS, [entryId]);
}

// ---------------------------------------------------------------------------
// name: CountPhotosByEntry :one
// ---------------------------------------------------------------------------

export function countPhotosByEntry(db: DB, entryId: string): number {
  const result = db.executeSync(q.COUNT_PHOTOS_BY_ENTRY, [entryId]);
  return (result.rows?.[0]?.count as number) ?? 0;
}
