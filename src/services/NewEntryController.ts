import { type DB } from '@op-engineering/op-sqlite';
import { withTransaction } from '../db/tx';
import { insertEntry, deleteEntry } from '../db/queries/entries';
import { setProfilePhoto, unsetAllProfilePhotos } from '../db/queries/photos';
import { addTag } from '../db/queries/entry_tags';
import { logEncounter } from '../db/queries/encounters';
import { ingestImage } from './ingestion';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'entry';
}

export type SaveResult = {
  entryId: string;
  status: 'ok' | 'reference_only' | 'low_confidence_warning' | 'needs_face_selection';
};

export class NewEntryController {
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

  async save(name: string, tags: string[], photoUri: string): Promise<SaveResult> {
    const entryId = generateId();
    const now = Date.now();

    try {
      withTransaction(this.db, tx =>
        insertEntry(tx, {
          id: entryId,
          category_id: this.categoryId,
          name: name.trim(),
          notes: null,
          is_public: 0,
          created_at: now,
          updated_at: now,
        }),
      );
    } catch (e) {
      console.error('[NewEntryController] insertEntry failed:', e);
      throw new Error('Failed to create entry. Please try again.');
    }

    let outcome;
    try {
      outcome = await ingestImage(
        this.db,
        this.nativeModules as Parameters<typeof ingestImage>[1],
        {
          imageUri: photoUri,
          collectionRoot: this.collectionRoot,
          entryId,
          categoryId: this.categoryId,
          entryNameSlug: slugify(name.trim()),
        },
      );
    } catch (e) {
      console.error('[NewEntryController] ingestImage failed, rolling back:', e);
      this.rollback(entryId);
      throw e;
    }

    try {
      withTransaction(this.db, tx => {
        unsetAllProfilePhotos(tx, entryId);
        setProfilePhoto(tx, outcome.photoId);
        tags.forEach(tag => addTag(tx, entryId, 'character', tag));
        logEncounter(tx, entryId, now);
      });
    } catch (e) {
      console.error('[NewEntryController] post-ingest writes failed:', e);
    }

    return { entryId, status: outcome.status as SaveResult['status'] };
  }

  rollback(entryId: string): void {
    try {
      withTransaction(this.db, tx => deleteEntry(tx, entryId));
    } catch (e) {
      console.error('[NewEntryController] rollback failed:', e);
    }
  }
}
