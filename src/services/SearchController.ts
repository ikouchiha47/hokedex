import { type DB } from '@op-engineering/op-sqlite';
import { withTransaction } from '../db/tx';
import { getEntry, listEntriesByCategory } from '../db/queries/entries';
import { getProfilePhoto, setProfilePhoto, unsetAllProfilePhotos } from '../db/queries/photos';
import { ingestImage, commitIngest } from './ingestion';
import type { Entry } from '../db/types';

export type AttachResult = {
  status: 'ok' | 'reference_only' | 'low_confidence_warning' | 'needs_face_selection';
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'entry';
}

export class SearchController {
  private db: DB;
  private collectionRoot: string;
  private categoryId: string;
  private nativeModules: { HokedexIngest: unknown; HokedexML: unknown };

  constructor(
    db: DB,
    collectionRoot: string,
    categoryId: string,
    nativeModules: { HokedexIngest: unknown; HokedexML: unknown },
  ) {
    this.db = db;
    this.collectionRoot = collectionRoot;
    this.categoryId = categoryId;
    this.nativeModules = nativeModules;
  }

  getEntry(entryId: string): Entry | null {
    return getEntry(this.db, entryId) ?? null;
  }

  listEntries(): Entry[] {
    return listEntriesByCategory(this.db, this.categoryId);
  }

  profilePhotoPath(entryId: string): string | null {
    const p = getProfilePhoto(this.db, entryId);
    return p ? `file://${this.collectionRoot}/${p.local_path}` : null;
  }

  async attachPhoto(entryId: string, imageUri: string): Promise<AttachResult> {
    const entry = this.getEntry(entryId);
    if (!entry) throw new Error('Entry not found');

    const pending = await ingestImage(
      this.nativeModules as Parameters<typeof ingestImage>[0],
      {
        imageUri,
        originalPath: null,
        collectionRoot: this.collectionRoot,
        entryId,
        categoryId: this.categoryId,
        entryNameSlug: slugify(entry.name),
      },
    );

    const { photoId } = await commitIngest(this.db, entryId, pending, this.collectionRoot);

    const hasProfile = !!getProfilePhoto(this.db, entryId);
    if (!hasProfile) {
      withTransaction(this.db, tx => {
        unsetAllProfilePhotos(tx, entryId);
        setProfilePhoto(tx, photoId);
      });
    }

    const status = pending.detection.type === 'NO_SUBJECT' ? 'reference_only'
      : pending.detection.type === 'LOW_CONFIDENCE' ? 'low_confidence_warning'
      : pending.detection.type === 'MULTI_SUBJECT' ? 'needs_face_selection'
      : 'ok';

    return { status: status as AttachResult['status'] };
  }
}
