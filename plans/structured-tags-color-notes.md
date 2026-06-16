# Plan: Structured Tags, Color Picker, Notes Timeline, Smash Mechanic

## Overview

Four connected features built on a key-value tag architecture and an enriched notes
layer. Tags are a general-purpose metadata store — no enums, keys are indexed strings
by convention. Notes are the temporal log — what happened, where, with location stored
as lat/lng for proximity queries.

---

## Migrations

### 003 — Structured tags

```sql
ALTER TABLE tags ADD COLUMN key TEXT NOT NULL DEFAULT '';
ALTER TABLE tags ADD COLUMN value TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_tags_key ON tags(key);
UPDATE tags SET key = '', value = name;
```

Existing plain tags migrate with `key=''`, `value=name`. The `name` column stays as
a display cache.

### 004 — Entry notes with location

```sql
CREATE TABLE entry_notes (
  id               TEXT    PRIMARY KEY,
  entry_id         TEXT    NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  body             TEXT    NOT NULL,
  location_label   TEXT,
  location_geohash TEXT,
  place_url        TEXT,
  created_at       INTEGER NOT NULL
);
CREATE INDEX idx_entry_notes_entry ON entry_notes(entry_id);
```

Location stored as geohash only — no raw coordinates persisted. Precision truncated at
write time (6 chars ≈ 1km, 5 chars ≈ 5km). Lat/lng from GPS or place URL parsed
in-memory, encoded to geohash via `ngeohash`, then discarded.

Proximity queries use prefix matching:
```sql
WHERE substr(location_geohash, 1, 5) = substr(?, 1, 5)
```

Geohash doubles as a Google Maps deeplink: `maps.google.com/?q=<geohash>`.

---

## Tag key conventions

| Key            | Value type            | Input widget                        |
|----------------|-----------------------|-------------------------------------|
| `''`           | string                | free text (legacy plain tags)       |
| `character`    | string                | free text + suggestion dropdown     |
| `color`        | hex string            | swatch picker + custom hex input    |
| `location`     | string (base city)    | free text (static — where they live)|
| `instagram`    | handle                | free text                           |
| `twitter`      | handle                | free text                           |
| `linkedin`     | url                   | free text                           |
| `via`          | entry ID              | person picker                       |
| `relationship` | string                | free text + suggestion dropdown     |
| any other      | string                | free text + suggestion dropdown     |

Suggestion dropdown for string keys: `SELECT DISTINCT value FROM tags WHERE key = ?`
— grows from the user's own data. Shows `+` only when typed text has no match.

---

## Tag queries (additions to tags.ts + tags.sql)

- `getTagByKey(db, entryId, key): string | null`
- `upsertKeyedTag(db, entryId, key, value): void` — deletes existing key first, inserts fresh
- `listTagsByKey(db, key): string[]` — distinct values across all entries, for suggestion dropdown

---

## Note queries (new entry_notes.ts + entry_notes.sql)

```ts
type NoteLocation = { label: string; geohash: string; placeUrl?: string };

addNote(db, entryId, body, location?: NoteLocation): void
listNotesByEntry(db, entryId): Note[]          // DESC created_at
deleteNote(db, noteId): void
listNotesNear(db, geohash, precision): Note[]  // prefix match on first N chars
```

---

## accentForEntry

Signature update:

```ts
accentForEntry(pHash: number, colorTag?: string | null): string
```

Caller fetches `getTagByKey(db, entryId, 'color')` and passes it in. Falls back to
pHash palette if null/undefined. Function stays pure.

---

## EntryDetailScreen — new sections

### ColorPickerSection (src/screens/entry-detail/ColorPickerSection.tsx)
- 12 preset swatches matching ACCENT_PALETTE + `+` for custom hex
- Active swatch has white ring
- Tap → `upsertKeyedTag(db, entryId, 'color', hex)` → accent updates live
- Positioned between hero photo and stat boxes

### NotesTimelineSection (src/screens/entry-detail/NotesTimelineSection.tsx)
- `+ Add note` text input at top, submit on return
- Notes grouped by calendar day header
- Each note: time + body + optional location chip (tappable → maps deeplink) + delete on long press
- Below encounters section

EntryDetailScreen itself: +2 imports, +2 JSX placements, `accentForEntry` call updated.

---

## Place URL share intake

When a shared URL matches a known place domain (zomato.com, maps.google.com, swiggy.com):
- Fetch URL, parse `application/ld+json` for `geo.latitude`, `geo.longitude`, `name`
- Encode lat/lng → geohash (via `ngeohash`) at 6-char precision, discard coords
- Pre-open note creation sheet: body empty, location pre-filled, user picks the entry
- Saves as entry_note with location_label, location_lat, location_lng, place_url

Existing image share flow is untouched. New handler branches on URL scheme in ShareIntakeScreen.

---

## Smash mechanic (CollectionListScreen)

Replaces the per-day `alreadyMet` boolean with a combo tap system:

- Tap target: profile photo circle on each collection card
- 5 taps within 1.5s window triggers the combo
- Animated charge ring fills as taps accumulate (Animated + circular stroke)
- On combo: log encounter + haptic + burst animation
- 5-minute cooldown after successful smash (`lastSmashedAt` timestamp check)
- State is local (not persisted) — resets on app restart

---

## Parallel tracks

Serial first:
1. Migration 003 + 004 (loader.ts + runner.ts)
2. Lock interfaces: Tag type, Note type, NoteLocation type, query signatures
3. Pre-stub ColorPickerSection + NotesTimelineSection (empty, typed props)
4. EntryDetailScreen imports both stubs — renders nothing yet

Then parallel:

| Track | Owns exclusively |
|-------|-----------------|
| A | tags.sql additions, tags.ts additions, accent.ts update, ColorPickerSection impl |
| B | entry_notes.sql, entry_notes.ts, NotesTimelineSection impl |
| C | Smash mechanic in CollectionListScreen |

Serial last:
- Wire EntryDetailScreen (pass data + callbacks into both sections)
- Place URL share intake handler (depends on note queries from B)
