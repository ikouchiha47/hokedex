import { type DB } from '@op-engineering/op-sqlite';
import { withTransaction } from '../db/tx';
import {
  listTagsByEntry,
  addTag,
  updateTagByKey,
  updateSocialByPlatform,
  deleteTag,
  type TagRow,
} from '../db/queries/entry_tags';

export type { TagRow };

export class EntryTagsController {
  private db: DB;
  private entryId: string;

  constructor(db: DB, entryId: string) {
    this.db = db;
    this.entryId = entryId;
  }

  list(): TagRow[] {
    return listTagsByEntry(this.db, this.entryId);
  }

  addCharacterTag(value: string): void {
    withTransaction(this.db, tx => addTag(tx, this.entryId, 'character', value));
  }

  removeTag(tagId: string): void {
    withTransaction(this.db, tx => deleteTag(tx, tagId));
  }

  setRelationship(value: string): void {
    withTransaction(this.db, tx => {
      const rows = listTagsByEntry(this.db, this.entryId);
      const existing = rows.find(r => r.key === 'relationship');
      if (existing) {
        updateTagByKey(tx, this.entryId, 'relationship', value);
      } else {
        addTag(tx, this.entryId, 'relationship', value);
      }
    });
  }

  setLocation(value: string): void {
    withTransaction(this.db, tx => {
      const rows = listTagsByEntry(this.db, this.entryId);
      const existing = rows.find(r => r.key === 'location');
      if (existing) {
        updateTagByKey(tx, this.entryId, 'location', value);
      } else {
        addTag(tx, this.entryId, 'location', value);
      }
    });
  }

  setSocial(platform: string, handle: string): void {
    const value = `${platform}:${handle}`;
    withTransaction(this.db, tx => {
      const rows = listTagsByEntry(this.db, this.entryId);
      const existing = rows.find(r => r.key === 'social' && r.value.startsWith(`${platform}:`));
      if (existing) {
        updateSocialByPlatform(tx, this.entryId, platform, value);
      } else {
        addTag(tx, this.entryId, 'social', value);
      }
    });
  }

  removeSocial(tagId: string): void {
    withTransaction(this.db, tx => deleteTag(tx, tagId));
  }
}
