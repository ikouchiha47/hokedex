import { type DB } from '@op-engineering/op-sqlite';
import RNFS from 'react-native-fs';
import { withTransaction } from '../db/tx';
import { getEntry, deleteEntry } from '../db/queries/entries';
import {
  listPhotosByEntry,
  getProfilePhoto,
  setProfilePhoto,
  unsetAllProfilePhotos,
  deletePhoto,
  countPhotosByEntry,
} from '../db/queries/photos';
import { listTagsByEntry, getTagByKey, updateTagByKey, addTag } from '../db/queries/entry_tags';
import { listNotesByEntry, addNote, deleteNote } from '../db/queries/entry_notes';
import {
  logEncounter,
  listEncountersByEntry,
  deleteEncounter,
  type Encounter,
} from '../db/queries/encounters';
import type { Photo, Note, NoteLocation, Entry } from '../db/types';

export type EntryDetailState = {
  entry: Entry;
  photos: Photo[];
  profilePhoto: Photo | null;
  photoCount: number;
  tags: Array<{ id: string; key: string; value: string }>;
  encounters: Encounter[];
  colorTag: string | null;
  entryNotes: Note[];
};

export class EntryDetailController {
  private db: DB;
  private entryId: string;
  private collectionRoot: string;

  constructor(db: DB, entryId: string, collectionRoot: string) {
    this.db = db;
    this.entryId = entryId;
    this.collectionRoot = collectionRoot;
  }

  load(): EntryDetailState | null {
    const entry = getEntry(this.db, this.entryId);
    if (!entry) return null;
    return {
      entry,
      photos: listPhotosByEntry(this.db, this.entryId),
      profilePhoto: getProfilePhoto(this.db, this.entryId),
      photoCount: countPhotosByEntry(this.db, this.entryId),
      tags: listTagsByEntry(this.db, this.entryId),
      encounters: listEncountersByEntry(this.db, this.entryId),
      colorTag: getTagByKey(this.db, this.entryId, 'color'),
      entryNotes: listNotesByEntry(this.db, this.entryId),
    };
  }

  logEncounter(): void {
    withTransaction(this.db, tx => logEncounter(tx, this.entryId, Date.now()));
  }

  deleteEncounter(encounterId: string): void {
    withTransaction(this.db, tx => deleteEncounter(tx, encounterId));
  }

  addNote(body: string, location?: NoteLocation): void {
    withTransaction(this.db, tx => addNote(tx, this.entryId, body, location));
  }

  deleteNote(noteId: string): void {
    withTransaction(this.db, tx => deleteNote(tx, noteId));
  }

  setProfilePhoto(photoId: string): void {
    withTransaction(this.db, tx => {
      unsetAllProfilePhotos(tx, this.entryId);
      setProfilePhoto(tx, photoId);
    });
  }

  removePhoto(photoId: string): void {
    withTransaction(this.db, tx => deletePhoto(tx, photoId));
  }

  removeAndDeletePhoto(photoId: string, localPath: string): void {
    withTransaction(this.db, tx => deletePhoto(tx, photoId));
    RNFS.unlink(`${this.collectionRoot}/${localPath}`).catch(() => {});
  }

  deleteEntry(keepFiles: boolean, photoPaths: string[]): void {
    if (!keepFiles) {
      photoPaths.forEach(p =>
        RNFS.unlink(`${this.collectionRoot}/${p}`).catch(() => {}),
      );
    }
    withTransaction(this.db, tx => deleteEntry(tx, this.entryId));
  }

  setColor(hex: string): void {
    withTransaction(this.db, tx => {
      const rows = listTagsByEntry(this.db, this.entryId);
      if (rows.find(r => r.key === 'color')) {
        updateTagByKey(tx, this.entryId, 'color', hex);
      } else {
        addTag(tx, this.entryId, 'color', hex);
      }
    });
  }
}
