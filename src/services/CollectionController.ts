import { type DB } from '@op-engineering/op-sqlite';
import { withTransaction } from '../db/tx';
import { listEntriesByCategory, deleteEntry } from '../db/queries/entries';
import { getProfilePhoto } from '../db/queries/photos';
import { getTagByKey } from '../db/queries/entry_tags';
import { logEncounter, listEncountersInRange, getEncounterStats, type EncounterWithName, type EncounterStats } from '../db/queries/encounters';
import type { Entry } from '../db/types';

export type EntryWithPhoto = Entry & { profilePhotoPath: string | null; colorTag: string | null };

export type CollectionState = {
  entries: EntryWithPhoto[];
  encounters: EncounterWithName[];
  stats: EncounterStats;
};

export class CollectionController {
  private db: DB;
  private collectionRoot: string;
  private categoryId: string;

  constructor(db: DB, collectionRoot: string, categoryId: string) {
    this.db = db;
    this.collectionRoot = collectionRoot;
    this.categoryId = categoryId;
  }

  load(): CollectionState {
    const rows = listEntriesByCategory(this.db, this.categoryId);
    const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    const entries: EntryWithPhoto[] = sorted.map(e => {
      const photo = getProfilePhoto(this.db, e.id);
      return {
        ...e,
        profilePhotoPath: photo ? `${this.collectionRoot}/${photo.local_path}` : null,
        colorTag: getTagByKey(this.db, e.id, 'color'),
      };
    });
    return {
      entries,
      encounters: listEncountersInRange(this.db, 0, Date.now() + 86400000),
      stats: getEncounterStats(this.db),
    };
  }

  logEncounter(entryId: string): void {
    withTransaction(this.db, tx => logEncounter(tx, entryId, Date.now()));
  }

  purgeAll(entries: EntryWithPhoto[]): void {
    withTransaction(this.db, tx => {
      entries.forEach(e => deleteEntry(tx, e.id));
    });
  }
}
