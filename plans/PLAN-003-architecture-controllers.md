# PLAN-003 — Screen Controller Layer

## Problem

DB calls (`withTransaction`, query functions) are scattered directly in screen components and sub-components. Screens should only render — all write and read orchestration belongs in a controller class.

## Target architecture

```
Screen (render only)
  └── Controller (owns all DB operations, passed as prop)
        └── DB query functions (SQL, accept Tx)
```

Screen creates a controller with `db` + context, passes it down. Sub-components receive the controller (or a typed slice of it), never `db`.

---

## Controllers to build

### `EntryDetailController` (`src/services/EntryDetailController.ts`) ✅ done

- [x] `logEncounter(): void`
- [x] `deleteEncounter(encounterId: string): void`
- [x] `addNote(body: string, location?: NoteLocation): void`
- [x] `deleteNote(noteId: string): void`
- [x] `setProfilePhoto(photoId: string): void`
- [x] `removePhoto(photoId: string): void`
- [x] `removeAndDeletePhoto(photoId: string, localPath: string): void`
- [x] `deleteEntry(keepFiles: boolean, photoPaths: string[]): void`
- [x] `setColor(hex: string): void`
- [x] `load(): EntryDetailState | null`

### `EntryTagsController` (`src/services/EntryTagsController.ts`) ✅ done

- [x] `list(): TagRow[]`
- [x] `addCharacterTag(value: string): void`
- [x] `removeTag(tagId: string): void`
- [x] `setRelationship(value: string): void`
- [x] `setLocation(value: string): void`
- [x] `setSocial(platform: string, handle: string): void`
- [x] `removeSocial(tagId: string): void`

### `CollectionController` (`src/services/CollectionController.ts`) ✅ done

- [x] `logEncounter(entryId: string): void`
- [x] `purgeAll(entries: EntryWithPhoto[]): void`
- [x] `load(): CollectionState`

### `NewEntryController` (`src/services/NewEntryController.ts`) ✅ done

- [x] `save(name: string, tags: string[], photoUri: string): Promise<SaveResult>`
- [x] `rollback(entryId: string): void`

---

## Sub-component props cleanup ✅ done

- [x] `ColorPickerSection` — removed `db` and `entryId` props; receives `onColorChange` callback only
- [x] `NotesTimelineSection` — removed `db` prop; already callback-based ✅
- [x] `SmashablePhoto` — already callback-based (`onSmash`) ✅
- [x] `InfoSection` — already uses `EntryTagsController` ✅

---

## Screen refactor checklist ✅ done

### `EntryDetailScreen` ✅
- [x] Instantiate `EntryDetailController` + `EntryTagsController`
- [x] Replace all inline `withTransaction` calls with controller methods
- [x] Replace inline `reload` logic with `controller.load()`
- [x] Pass controller to sub-components, remove `db` from their props

### `CollectionListScreen` ✅
- [x] Instantiate `CollectionController`
- [x] Replace inline `withTransaction(db, tx => logEncounter(...))` in `handleSmash`
- [x] Replace inline `withTransaction(db, tx => deleteEntry(...))` in `purgeAll`

### `NewEntryScreen` ✅
- [x] Instantiate `NewEntryController`
- [x] Replace inline save + rollback logic with controller methods
