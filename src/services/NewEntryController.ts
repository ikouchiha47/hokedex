import { type DB } from '@op-engineering/op-sqlite';
import { withTransaction } from '../db/tx';
import { insertEntry } from '../db/queries/entries';
import { setProfilePhoto, unsetAllProfilePhotos } from '../db/queries/photos';
import { addTag } from '../db/queries/entry_tags';
import { logEncounter } from '../db/queries/encounters';
import { ingestImage, commitIngest, type IngestNativeModules, type PendingIngest } from './ingestion';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'entry';
}

export type SaveResult =
  | { status: 'ok' | 'reference_only' | 'low_confidence_warning'; entryId: string }
  | { status: 'needs_face_selection'; pending: PendingIngest };

export class NewEntryController {
  constructor(
    private db: DB,
    private collectionRoot: string,
    private categoryId: string,
    private nativeModules: IngestNativeModules,
  ) {}

  async save(name: string, photoUri: string, originalPhotoPath?: string | null): Promise<SaveResult> {
    const pending = await ingestImage(
      this.nativeModules,
      {
        imageUri: photoUri,
        originalPath: originalPhotoPath ?? null,
        collectionRoot: this.collectionRoot,
        entryId: '',
        categoryId: this.categoryId,
        entryNameSlug: slugify(name.trim()),
      },
    );

    if (pending.detection.type !== 'NO_SUBJECT') {
      return { status: 'needs_face_selection', pending };
    }

    const entryId = await this.commit(name, [], pending);
    return { status: 'reference_only', entryId };
  }

  async commit(name: string, tags: string[], pending: PendingIngest, embeddingVector?: number[]): Promise<string> {
    const entryId = generateId();
    const now = Date.now();

    const { photoId } = await commitIngest(this.db, entryId, pending, this.collectionRoot, embeddingVector);

    withTransaction(this.db, tx => {
      insertEntry(tx, {
        id: entryId,
        category_id: this.categoryId,
        name: name.trim(),
        notes: null,
        is_public: 0,
        created_at: now,
        updated_at: now,
      });
      unsetAllProfilePhotos(tx, entryId);
      setProfilePhoto(tx, photoId);
      tags.forEach(tag => addTag(tx, entryId, 'character', tag));
      logEncounter(tx, entryId, now);
    });

    return entryId;
  }
}
