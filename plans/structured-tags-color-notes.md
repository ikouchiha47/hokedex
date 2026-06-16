# Plan: Structured Tags, Color Picker, Notes Timeline

## Overview

Three connected features built on a key-value tag architecture. No enums — keys are
indexed strings by convention. This makes the tag system a general-purpose metadata
store for entries.

---

## 1. DB Migration — Structured Tags

Add `key` and `value` columns to the existing `tags` table. Key is indexed for fast
lookups by tag type (e.g. all `color:` tags, all `character:` tags).

```sql
ALTER TABLE tags ADD COLUMN key TEXT NOT NULL DEFAULT '';
ALTER TABLE tags ADD COLUMN value TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_tags_key ON tags(key);
```

Existing plain tags (no colon) migrate with `key=''`, `value=name` — fully backward
compatible. The `name` column can stay as a display cache or be dropped in a follow-up.

### Built-in key conventions (strings, no enums)

| Key         | Example value   | Purpose                        |
|-------------|-----------------|--------------------------------|
| `''`        | `hot mess`      | Plain unkeyed tag (legacy)     |
| `color`     | `#7c3aed`       | Accent color for entry card    |
| `character` | `hot mess`      | Personality / vibe             |
| `note`      | `met at conf`   | Inline note (lightweight)      |

---

## 2. Color Picker (reads `color:` tag)

### Data flow
- `accentForEntry` checks for a `color` keyed tag on the entry first
- Falls back to pHash-based palette color if no `color` tag exists
- Writing a color = upsert a `color:<hex>` tag on the entry

### UI (EntryDetailScreen)
- 12 preset palette dots row, positioned below hero photo above stat boxes
- Active color gets a white ring
- `+` button at end of row → text input for custom hex value
- Tap a dot → immediately writes `color` tag → header/accent updates live

### Queries needed
- `getTagByKey(db, entryId, key): Tag | null`
- `upsertKeyedTag(db, entryId, key, value): void` — replace existing key if present

---

## 3. Notes Timeline (new table)

Separate from encounters (which are just presence/meeting logs). Notes capture what
happened, context, observations — with full timestamp and grouping by day.

### Schema

```sql
CREATE TABLE entry_notes (
  id        TEXT    PRIMARY KEY,
  entry_id  TEXT    NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  body      TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_entry_notes_entry ON entry_notes(entry_id);
```

### UI (EntryDetailScreen)
- Timeline section below encounters, grouped by calendar day header
- Each note: timestamp (time only) + body text + delete (swipe or long press)
- `+ Add note` inline text input at top of section, submit on return
- Distinct from "Met Today" — notes are content, encounters are presence

### Queries needed (new file: `src/db/queries/entry_notes.ts`)
- `addNote(db, entryId, body): void`
- `listNotesByEntry(db, entryId): Note[]` — ordered by created_at DESC
- `deleteNote(db, noteId): void`

---

## Parallel tracks (implement after interfaces locked)

| Track | Files | Depends on |
|-------|-------|-----------|
| Migration | new SQL, loader.ts, runner.ts | Nothing — do first |
| Tag queries | `src/db/queries/tags.ts` | Migration |
| Notes queries | `src/db/queries/entry_notes.ts` | Migration |
| Color service | `src/theme/accent.ts` | Tag queries |
| UI | `EntryDetailScreen.tsx` | All above |

## Order of work

1. Lock interfaces: `Tag` type shape, `Note` type shape, query signatures
2. Write migration SQL + register it
3. Implement tag queries (keyed upsert + lookup)
4. Implement notes queries
5. Update `accentForEntry` service
6. Implement UI (color picker row + notes timeline section)
