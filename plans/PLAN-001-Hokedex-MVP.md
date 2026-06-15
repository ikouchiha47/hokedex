# PLAN-001: Hokédex MVP Implementation Plan

## Overview

Build the Hokédex MVP as specified in ADR-001, using the ADR-002 schema and ML interface shapes from day one. No server dependency. All face detection, embedding, and search runs on-device. The architecture is category-aware and portable from the start so ADR-002 features can be layered on without migrations.

---

## Scope Constraints

**In scope (this plan):**
- React Native app (Android-first)
- Kotlin native ML module (MediaPipe + MobileFaceNet)
- SQLite via op-sqlite in WAL mode with full optimization
- Share Sheet entry point
- Face detection, embedding generation, face vector search via sqlite-vec cosine similarity
- Entry/Category data model (ADR-002 schema, People category only)
- Relative file paths + SHA-256 (Kotlin) + pHash (Kotlin, kophash) at ingestion
- SHA-256 embedded in thumbnail EXIF/tEXt header (Kotlin ExifInterface)
- Profile photo designation, tags, notes
- Typed detection states (NO_SUBJECT, MULTI_SUBJECT, LOW_CONFIDENCE, SUCCESS)
- Tiered match results (Likely / Possible / No Match)
- Duplicate prevention confirmation flow

**Explicitly out of scope:**
- Publishing server, Ed25519 keypair, public profiles
- Device transfer / collection restore
- Additional categories (Birds, Plants, Dogs)
- Cloud sync, accounts, analytics
- ANN indexing, INT8 quantization
- Export / import
- iOS native ML module (deferred to post-Android-MVP)

---

## Token Budget Guidance

This plan is structured so each phase can be executed in isolation. Each phase begins with a focused context load (read only the files relevant to that phase) and ends with a clear deliverable. Avoid loading the full codebase into context for any single phase. Cross-phase dependencies are called out explicitly.

---

## UI Stack

**Styling: NativeWind (Tailwind CSS for React Native)**
Flat design maps directly to Tailwind utility classes — no shadows, no elevation, solid fills. Vibrant color palette is defined once in `tailwind.config.js` and applied everywhere via class names. Zero runtime overhead (compiled to StyleSheet at build time).

**Component primitives: Gluestack UI v2**
Headless, unstyled component primitives (Pressable, Input, Modal, etc.) that sit on top of NativeWind. Fully supports the New Architecture. No Material Design chrome — components are structural, not opinionated about appearance.

**Navigation: React Navigation v7 (native stack)**
Standard choice; native stack navigator gives platform-native transitions without Reanimated overhead on entry screens.

**Icons: react-native-vector-icons (MaterialCommunityIcons)**
Large flat icon set, no license cost, tree-shakeable.

**Rationale for not using React Native Paper:**
Paper imposes Material Design 3 chrome (ripples, elevation, rounded cards) which works against flat design intent. Stripping it requires overriding component internals. NativeWind + Gluestack is lower-friction for a custom flat aesthetic.

---

## Phase 1 — Project Scaffold and Native Module Interface

### Goal
React Native project boots. Kotlin native module is registered. The `detect` / `embed` interface contract exists and is callable from JS, returning stubbed data.

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-1.1 | **WHERE** the user installs the app for the first time, **THE SYSTEM SHALL** initialize the SQLite database at `{collection_root}/hokedex.db` with all schema migrations applied and WAL mode enabled before any UI is rendered. |
| R-1.2 | **THE SYSTEM SHALL** expose a React Native native module named `HokedexML` with two methods: `detect(imageUri: string, categoryId: string): Promise<DetectionResult>` and `embed(cropUri: string, categoryId: string): Promise<number[]>`. |
| R-1.3 | **WHILE** the native ML module is not yet fully implemented, **THE SYSTEM SHALL** return stubbed `DetectionResult` and `number[]` responses that conform to the defined TypeScript types, enabling UI and storage development to proceed independently. |
| R-1.4 | **THE SYSTEM SHALL** configure the SQLite connection on every open with the following PRAGMAs in order: `journal_mode = WAL`, `synchronous = NORMAL`, `foreign_keys = ON`, `temp_store = memory`, `cache_size = 2000`, `mmap_size = 134217728`, `journal_size_limit = 67108864`, `busy_timeout = 5000`. |
| R-1.5 | **THE SYSTEM SHALL** run `PRAGMA optimize` before closing any long-lived database connection. |

### Deliverables
- React Native project initialized (bare workflow, not Expo managed)
- Kotlin module registered via `ReactPackage`
- TypeScript interface for `DetectionResult` (typed union: `NO_SUBJECT | MULTI_SUBJECT | LOW_CONFIDENCE | SUCCESS`)
- Database initialization module with all PRAGMAs applied
- App boots to a blank screen without errors on Android emulator

### Context to load for execution
- `package.json`, `android/` directory, this plan section only

---

## Phase 2 — Database Schema

### Goal
Full ADR-002 schema is applied via versioned migrations. All tables exist. Indexes are in place. Seed data (People category) is inserted.

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-2.1 | **THE SYSTEM SHALL** create and maintain the following tables: `categories`, `entries`, `photos`, `embeddings`, `tags`, `entry_tags`, `workspaces`. |
| R-2.2 | **THE SYSTEM SHALL** enforce all foreign key relationships: `entries.category_id → categories.id`, `photos.entry_id → entries.id`, `photos.embedding_id → embeddings.id` (nullable), `embeddings.entry_id → entries.id`, `embeddings.photo_id → photos.id`, `embeddings.category_id → categories.id`, `entry_tags.entry_id → entries.id`, `entry_tags.tag_id → tags.id`. |
| R-2.3 | **THE SYSTEM SHALL** store `photos.local_path` as a path relative to `collection_root`. Absolute paths SHALL NOT be stored. |
| R-2.4 | **THE SYSTEM SHALL** store `photos.original_sha256` as a hex-encoded SHA-256 of the raw file bytes, computed at ingestion time before any processing. |
| R-2.5 | **THE SYSTEM SHALL** store `photos.original_phash` as a 64-bit perceptual hash integer, computed at ingestion time. |
| R-2.6 | **THE SYSTEM SHALL** create the following indexes on first migration: `(category_id, entry_id)` on `embeddings` (primary search path); `(entry_id, photo_id)` on `embeddings` (join path); `category_id` on `entries`. |
| R-2.7 | **THE SYSTEM SHALL** seed one `Category` row at install time: `{ id: 'people', name: 'People', detector_model: 'mediapipe_face', embedding_model: 'mobilefacenet_arcface_512', embedding_dimensions: 512, similarity_threshold_likely: 0.95, similarity_threshold_possible: 0.85 }`. |
| R-2.8 | **THE SYSTEM SHALL** manage schema versions via a `schema_migrations` table and apply each migration exactly once in version order. |
| R-2.9 | **WHERE** the `embeddings` table is queried for vector similarity, **THE SYSTEM SHALL** use `sqlite-vec`'s `vec_distance_cosine` function and always include a `WHERE entries.category_id = ?` filter. |

### Schema Reference

```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  detector_model TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  embedding_dimensions INTEGER NOT NULL,
  similarity_threshold_likely REAL NOT NULL,
  similarity_threshold_possible REAL NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  notes TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  local_path TEXT NOT NULL,
  original_sha256 TEXT NOT NULL,
  original_phash INTEGER NOT NULL,
  is_profile_photo INTEGER NOT NULL DEFAULT 0,
  embedding_id TEXT REFERENCES embeddings(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  vector BLOB NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE entry_tags (
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  local_id TEXT NOT NULL UNIQUE,
  collection_root TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_embeddings_search ON embeddings(category_id, entry_id);
CREATE INDEX idx_embeddings_join ON embeddings(entry_id, photo_id);
CREATE INDEX idx_entries_category ON entries(category_id);
```

### Deliverables
- Migration runner
- Migration 001 applying the schema above
- Seed runner inserting the People category
- Unit tests: each table exists, foreign keys are enforced, indexes are present, seed row exists

### Context to load for execution
- Phase 2 of this plan, schema section above only

---

## Phase 3 — Kotlin Native ML Module

### Goal
Real face detection and embedding generation works on device. The `detect` and `embed` methods return correct typed results.

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-3.1 | **WHEN** `HokedexML.detect(imageUri, 'people')` is called, **THE SYSTEM SHALL** run MediaPipe Face Detection on the image and return a `DetectionResult` of type `SUCCESS`, `NO_SUBJECT`, `MULTI_SUBJECT`, or `LOW_CONFIDENCE`. |
| R-3.2 | **WHEN** the detection result is `SUCCESS`, **THE SYSTEM SHALL** return the bounding box of the detected face crop within the `DetectionResult`. |
| R-3.3 | **WHEN** the detection result is `MULTI_SUBJECT`, **THE SYSTEM SHALL** return an array of bounding boxes, one per detected face, within the `DetectionResult`. |
| R-3.4 | **WHEN** the detection result is `LOW_CONFIDENCE`, **THE SYSTEM SHALL** include the single best-candidate bounding box and the raw confidence score within the `DetectionResult`. |
| R-3.5 | **WHEN** `HokedexML.embed(cropUri, 'people')` is called, **THE SYSTEM SHALL** run MobileFaceNet inference on the cropped image and return a `float32[]` array of exactly 512 dimensions. |
| R-3.6 | **THE SYSTEM SHALL** run all ML inference on a background thread and SHALL NOT block the JS thread. |
| R-3.7 | **THE SYSTEM SHALL** use a confidence threshold of `0.7` for `LOW_CONFIDENCE` classification. This threshold SHALL be read from the `Category` row, not hardcoded in the native layer. |
| R-3.8 | **WHERE** a `categoryId` is passed that has no registered model, **THE SYSTEM SHALL** reject the Promise with an error of type `UNSUPPORTED_CATEGORY`. |

### Model Assets
- MediaPipe Face Detection: `face_detection_short_range.tflite` (bundled in `android/app/src/main/assets/`)
- MobileFaceNet ArcFace 512d: `mobilefacenet_arcface_512.tflite` (bundled in same directory)

### Deliverables
- `HokedexMLModule.kt` implementing both methods
- Model loading on module init (not per-call)
- `DetectionResult` sealed class with all four states
- Integration test: detect returns SUCCESS on a known face image; embed returns a 512-length array

### Context to load for execution
- Phase 3 of this plan, R-3.x requirements, `android/` directory

---

## Phase 4 — Ingestion Pipeline

### Goal
An image URI received from the Share Sheet or in-app camera roll picker is processed end-to-end: face detected, embedding generated (if face found), file hashed, thumbnail generated with SHA-256 in metadata header, photo row and embedding row written to SQLite.

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-4.1 | **WHEN** an image is ingested, **THE SYSTEM SHALL** compute SHA-256 of the raw file bytes in Kotlin (via the `HokedexIngest` native module) before any processing and return the hex-encoded hash to be stored in `photos.original_sha256`. SHA-256 SHALL NOT be computed in JS. |
| R-4.2 | **WHEN** an image is ingested, **THE SYSTEM SHALL** compute a 64-bit DCT perceptual hash of the image in Kotlin using `kophash` and return it to be stored in `photos.original_phash`. pHash SHALL NOT be computed in JS. |
| R-4.3 | **WHEN** an image is ingested, **THE SYSTEM SHALL** copy the original file into `{collection_root}/images/{year}/{sha256_first8}_{entry_name_slug}_{original_filename}` in Kotlin and return the relative path to be stored in `photos.local_path`. |
| R-4.4 | **WHEN** an image is ingested, **THE SYSTEM SHALL** generate a 200×200px JPEG thumbnail in Kotlin (`Bitmap.createScaledBitmap`), strip all existing EXIF data, then write `hokedex:original_sha256={hash}` into the `UserComment` field via `androidx.exifinterface.media.ExifInterface` before saving to `{collection_root}/thumbnails/{year}/{sha256_first8}_{entry_name_slug}_thumb.jpg`. All thumbnail operations SHALL occur in the `HokedexIngest` Kotlin module. |
| R-4.5 | **THE SYSTEM SHALL** expose a single `HokedexIngest.processImage(imageUri, collectionRoot, entryNameSlug)` method that returns `{ sha256, phash, relativePath, thumbnailRelativePath }` as a single atomic operation, minimising JS bridge round-trips. |
| R-4.6 | **WHEN** the native ML layer returns `SUCCESS` or `LOW_CONFIDENCE` (user proceeded), **THE SYSTEM SHALL** call `HokedexML.embed` with the face crop URI and write an `embeddings` row linked to the `photos` row. |
| R-4.7 | **WHEN** the native ML layer returns `NO_SUBJECT`, **THE SYSTEM SHALL** write a `photos` row with `embedding_id = null` and SHALL NOT call `embed`. |
| R-4.8 | **WHEN** the native ML layer returns `MULTI_SUBJECT`, **THE SYSTEM SHALL** pause ingestion and present the face picker UI. Ingestion SHALL resume only after the user selects a face. |
| R-4.9 | **THE SYSTEM SHALL** write the `photos` row and `embeddings` row in a single SQLite transaction. If the transaction fails, no partial data SHALL be written. |
| R-4.10 | **THE SYSTEM SHALL** perform all file I/O and ML inference off the JS thread. The ingestion pipeline SHALL be cancellable. |

### Deliverables
- `HokedexIngestModule.kt` — SHA-256, pHash (kophash), file copy, thumbnail generation + EXIF write, all in one bridge call
- `ingestion.ts` service module — orchestrates `HokedexIngest.processImage` + `HokedexML.detect/embed` + DB write
- Transactional photo + embedding write
- Integration test: ingest a known image, verify Photo row, Embedding row, file at expected relative path, thumbnail at expected path with correct EXIF `UserComment`

### Context to load for execution
- Phase 4 of this plan, Phase 2 schema, `ingestion.ts` if it exists

---

## Phase 5 — Search

### Goal
Given a query embedding, the system returns ranked match results tiered as Likely / Possible / No Match, using max-similarity aggregation across per-photo embeddings, scoped to a category.

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-5.1 | **WHEN** a search is triggered, **THE SYSTEM SHALL** query embeddings using the following pattern: `SELECT e.entry_id, MAX(vec_distance_cosine(e.vector, ?)) AS best_score FROM embeddings e JOIN entries en ON en.id = e.entry_id WHERE en.category_id = ? GROUP BY e.entry_id ORDER BY best_score DESC LIMIT 10`. |
| R-5.2 | **THE SYSTEM SHALL** classify results into tiers using thresholds read from the `Category` row: `best_score >= similarity_threshold_likely` → Likely Match; `best_score >= similarity_threshold_possible` → Possible Match; `best_score < similarity_threshold_possible` → No Match. |
| R-5.3 | **THE SYSTEM SHALL** return at most one Likely Match. If multiple entries score above `similarity_threshold_likely`, only the highest-scoring entry SHALL be presented as Likely. |
| R-5.4 | **WHERE** no entry scores above `similarity_threshold_possible`, **THE SYSTEM SHALL** present the top candidates as a ranked list and offer a "Create New Entry" action. |
| R-5.5 | **THE SYSTEM SHALL** complete a search query over 3,000 embeddings (1,000 persons × ~3 photos) in under 500ms on a mid-range Android device (Snapdragon 600-class or equivalent). |
| R-5.6 | **THE SYSTEM SHALL** include the profile photo `local_path` for each result entry in the search response, resolved to an absolute path for display. |

### Deliverables
- `search.ts` service module
- Search result types: `LikelyMatch`, `PossibleMatch[]`, `NoMatch`
- Integration test: seed known embeddings, assert correct tier classification

### Context to load for execution
- Phase 5 of this plan, Phase 2 schema, `search.ts` if it exists

---

## Phase 6 — Share Sheet Integration

### Goal
Android Share Sheet target is registered. Sharing an image from any app into Hokédex triggers the full ingestion → search → result flow.

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-6.1 | **THE SYSTEM SHALL** register as an Android Share Sheet receiver for MIME types `image/*`. |
| R-6.2 | **WHEN** the app is launched via Share Sheet with a single image, **THE SYSTEM SHALL** immediately begin face detection on the shared image without requiring any additional user action. |
| R-6.3 | **WHEN** the app is launched via Share Sheet while already running in the background, **THE SYSTEM SHALL** handle the intent without restarting the JS engine. |
| R-6.4 | **WHEN** detection completes with `SUCCESS`, **THE SYSTEM SHALL** display search results before prompting the user to assign the image to an entry. |
| R-6.5 | **WHEN** detection completes with `NO_SUBJECT`, **THE SYSTEM SHALL** inform the user no face was detected and offer: (a) retry with a crop, (b) save as reference photo to an existing or new entry. |
| R-6.6 | **WHEN** detection completes with `MULTI_SUBJECT`, **THE SYSTEM SHALL** display a face picker grid before proceeding to search. |
| R-6.7 | **WHEN** detection completes with `LOW_CONFIDENCE`, **THE SYSTEM SHALL** display an accuracy warning and offer the user the option to proceed or discard. |

### Deliverables
- `AndroidManifest.xml` intent filter for `image/*`
- Share intent handler in `MainActivity`
- JS-side share event listener wired to ingestion pipeline
- Manual test checklist: share from Photos, Chrome, WhatsApp

### Context to load for execution
- Phase 6 of this plan, `android/app/src/main/AndroidManifest.xml`, ingestion module

---

## Phase 7 — Core UI

### Goal
The user can view their collection, create entries, add photos from the device gallery or camera, run a face search against an existing entry, and delete photos or entries. All views are functional, not polished.

---

### Dependencies (install before building)

| Package | Purpose |
|---------|---------|
| `react-native-image-picker` | Gallery + camera photo selection on Android. Auto-links. Requires `READ_MEDIA_IMAGES` (Android 13+) and `CAMERA` permissions in `AndroidManifest.xml`. |

---

### Permissions required in AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

---

### CollectionListScreen layout

```
┌─────────────────────────────────────┐
│  hokédex          [search icon]     │  ← header
├─────────────────────────────────────┤
│  ( + )   ( 🖼 )   ( 🖼 )           │
│   Add     Alice     Bob             │  ← row 1
│                                     │
│  ( 🖼 )                             │
│   Carol                             │  ← row 2
└─────────────────────────────────────┘
```

- Column count is **computed from screen width** — not hardcoded:
  ```ts
  const MIN_TILE_WIDTH = 88; // dp — feels right for a contact avatar
  const GRID_PADDING = 16;   // horizontal padding each side
  const numColumns = Math.floor((screenWidth - GRID_PADDING * 2) / MIN_TILE_WIDTH);
  // Nothing Phone A142 (~393dp) → 3 columns
  // 5-inch wide phone (~411dp) → 4 columns
  ```
- `FlatList` with `numColumns={numColumns}` (re-keyed with `key={numColumns}` so it remounts if orientation changes)
- Each cell width: `(screenWidth - GRID_PADDING * 2) / numColumns` — fills the row exactly
- Circle diameter: cell width minus `CELL_PADDING * 2` (8dp each side within the cell)
- Each cell: a circle + label below, total cell height = circle diameter + 24dp for label
- **First item is always the "+" tile** with label "Add" — prepended to the entries array before render
- Person tile: `Image` clipped to circle; missing photo → grey filled circle
- Add tile: dashed border circle (`borderStyle: 'dashed'`), "+" centred in SpaceGrotesk, label "Add" in Inter Regular 12px
- Label: Inter Regular, 12px, single line, ellipsised, centred below circle, max width = cell width

### Navigation structure

```
RootNavigator (NativeStack)
├── CollectionListScreen   ← initial route (after boot)
├── NewEntryScreen
├── EntryDetailScreen
└── SearchResultScreen
```

`db`, `collectionRoot`, and `category` (the seeded People category row) are provided via a React Context (`AppContext`) so all screens can access them without prop drilling.

---

### Primary workflows

#### W-1: Add a new person
1. User is on `CollectionListScreen` (empty or populated).
2. Taps "+" button (top-right header).
3. Navigates to `NewEntryScreen`.
4. Types a name.
5. Taps "Add photo" → bottom sheet appears with two options: **Gallery** / **Camera**.
6. Selects source → OS picker/camera opens.
7. Photo selected/captured → preview shown in screen.
8. Taps "Save" → app:
   a. Creates entry row (`insertEntry`).
   b. Calls `ingestImage` (pHash, SHA-256, face detect, embed, DB write).
   c. Marks ingested photo as profile photo (`is_profile_photo = 1`).
   d. Shows inline progress indicator during ingestion (can take 1–3 s).
9. On success → navigates back to `CollectionListScreen`, entry appears in list.
10. On `NO_SUBJECT` or `LOW_CONFIDENCE` detection → entry and photo are still saved; a non-blocking toast informs the user ("No face detected — saved as reference photo" / "Low confidence face — saved with warning").

#### W-2: View and interact with a person's profile
1. User taps an entry tile on `CollectionListScreen` → `EntryDetailScreen`.
2. Screen layout (top to bottom):
   - **Header row**: small circular avatar (same size as collection grid tile, NOT a hero/full-width image) + name (SpaceGrotesk Bold) + accent color strip derived from pHash
   - **Stats row**: photo count · embedding count · date added (local timezone, e.g. "12 Jun 2026, 11:34 PM")
   - **Tags row**: pokémon-type badge chips — icon + label, colored; tapping a chip fills the tag input field for editing/removal
   - **Tag input field**: text input for adding new tags; chips appear as user adds them
   - **Notes field**: single freetext input (Inter Regular), maps to `entries.notes`
   - **Action bar**: [ Sample ] [ + ] [ More photos ] — horizontal row of buttons
   - **Photo grid**: 3-column grid of small square thumbnails (remaining screen space)
3. Accent color: `ACCENT_PALETTE[Math.abs(pHash) % ACCENT_PALETTE.length]` — a fixed palette of 8–12 distinct colors; same color used for the header strip and tag chip borders

#### W-2b: Add more photos to an existing person
1. User taps "+" in the action bar on `EntryDetailScreen`.
2. Gallery/camera bottom sheet opens (same as W-1).
3. Photo selected → ingestion runs → photo appears in grid without refresh.
4. If `NO_SUBJECT` → saved as reference, toast shown.
5. If `MULTI_SUBJECT` → alert: "Multiple faces detected — only the first was used."

#### W-2c: View a photo fullscreen
1. User taps any thumbnail in the photo grid on `EntryDetailScreen`.
2. A fullscreen modal opens showing that photo.
3. User can swipe left/right to move through all photos for that entry in order.
4. Tap anywhere outside the image (or swipe down) to dismiss the modal.
5. Long-press in the modal → same bottom sheet as long-press on the grid thumbnail (set as profile, remove, delete).

#### W-2d: Sample — check this person against a photo
1. User taps "Sample" in the action bar.
2. Gallery/camera picker opens.
3. Selected photo is run through `HokedexML.detect` + `HokedexML.embed` + `searchByEmbedding` scoped to this entry only.
4. Result shown inline (not a new screen): "Match — 97%" or "No match".

#### W-3: Search — who is this person?
1. User taps the search icon on `CollectionListScreen` (top-right, next to "+").
2. `SearchResultScreen` pushes onto stack with no results yet.
3. User taps "Pick photo to search" → gallery/camera picker.
4. Photo selected → app runs `HokedexML.detect` + `HokedexML.embed` + `searchByEmbedding`.
5. Results displayed:
   - **Likely match**: large card with profile photo + name + similarity %.
   - **Possible matches**: smaller cards below.
   - **No match**: "No one recognised" with "Create new entry" button.
6. Tapping a match card → navigates to `EntryDetailScreen` for that entry.
7. Tapping "Attach to this person" (on a match card or from no-match) → runs ingestion and attaches the searched photo to that entry.

#### W-4: Manage photos on an entry
1. On `EntryDetailScreen`, user long-presses a photo thumbnail.
2. Bottom sheet appears with:
   - "Set as profile photo"
   - "Remove from Hokédex" (keeps original file on device)
   - "Remove from Hokédex and delete file" → confirmation alert before delete
3. "Set as profile photo": unsets current profile photo for that entry (`UPDATE photos SET is_profile_photo = 0 WHERE entry_id = ?`), sets selected one to 1.

#### W-5: Delete an entry
1. On `EntryDetailScreen`, user taps the trash icon (top-right header).
2. Alert: "Delete [name]? This will remove all their photos from Hokédex."
3. Second alert: "Also delete original files from your device? This cannot be undone."
4. Confirmed → `deleteEntry` (cascade deletes photos + embeddings rows), then optionally delete files via `react-native-fs`.
5. Navigates back to `CollectionListScreen`.

---

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-7.1 | **THE SYSTEM SHALL** display `CollectionListScreen` as the initial screen after boot completes, showing all entries in the People category ordered alphabetically, each with their profile photo thumbnail and name. |
| R-7.2 | **WHERE** the collection is empty, `CollectionListScreen` **SHALL** display an empty-state message: "No people yet. Tap + to add someone." |
| R-7.3 | **WHEN** the user taps "+" on `CollectionListScreen`, **THE SYSTEM SHALL** navigate to `NewEntryScreen`. |
| R-7.4 | **WHEN** the user taps the search icon on `CollectionListScreen`, **THE SYSTEM SHALL** navigate to `SearchResultScreen` in its initial (no results) state. |
| R-7.5 | **WHEN** the user taps an entry on `CollectionListScreen`, **THE SYSTEM SHALL** navigate to `EntryDetailScreen` for that entry. |
| R-7.6 | **THE SYSTEM SHALL** provide a photo source picker with two options — **Gallery** and **Camera** — wherever a photo can be added. |
| R-7.7 | **THE SYSTEM SHALL** request `READ_MEDIA_IMAGES` and `CAMERA` permissions at runtime before opening the respective source. |
| R-7.8 | **WHEN** the user selects or captures a photo, **THE SYSTEM SHALL** display an inline loading indicator while ingestion runs. The user SHALL NOT be able to trigger a second ingestion while the first is in progress. |
| R-7.9 | **WHEN** ingestion completes with status `embedded` or `reference_only`, **THE SYSTEM SHALL** add the photo to the entry's photo grid without requiring a manual refresh. |
| R-7.10 | **WHEN** ingestion completes with status `reference_only` (NO_SUBJECT), **THE SYSTEM SHALL** display a non-blocking toast: "No face detected — saved as reference photo." |
| R-7.11 | **WHEN** ingestion completes with status `low_confidence_warning`, **THE SYSTEM SHALL** display a non-blocking toast: "Low confidence face — saved with warning." |
| R-7.12 | **WHEN** ingestion completes with status `needs_face_selection` (MULTI_SUBJECT), **THE SYSTEM SHALL** show an alert: "Multiple faces detected — only the first was used." The photo SHALL still be saved. |
| R-7.13 | **THE SYSTEM SHALL** mark the first photo added to a newly created entry as the profile photo (`is_profile_photo = 1`). |
| R-7.14 | **WHEN** the user saves a new entry with no photo selected, **THE SYSTEM SHALL** show an inline validation error: "Add at least one photo." The entry SHALL NOT be created. |
| R-7.15 | **WHEN** the user saves a new entry with no name entered, **THE SYSTEM SHALL** show an inline validation error: "Name is required." The entry SHALL NOT be created. |
| R-7.16 | **THE SYSTEM SHALL** display `EntryDetailScreen` with: a small circular avatar (not a hero image) + name in the header; a stats row (photo count, embedding count, date added formatted as "DD Mon YYYY, HH:MM AM/PM TZ" where TZ is the device's local timezone abbreviation, e.g. "12 Jun 2026, 11:34 PM IST"); a tag chip row; a notes field; an action bar (Sample, +, More photos); and a 3-column photo grid. |
| R-7.17 | **THE SYSTEM SHALL** derive an accent color for each entry using `ACCENT_PALETTE[Math.abs(pHash) % ACCENT_PALETTE.length]`. The accent color is applied to the header strip background, tag chip borders, and the circular avatar border. |
| R-7.18 | **THE SYSTEM SHALL** display tags as pokémon-type badge chips — icon + label, colored with the entry accent color. **WHEN** the user taps a chip, **THE SYSTEM SHALL** copy the tag text into the tag input field for editing or removal. |
| R-7.19 | **WHEN** the user taps a photo thumbnail in the grid, **THE SYSTEM SHALL** open a fullscreen modal showing that photo. The modal **SHALL** support left/right swipe to navigate all photos for that entry. Tap outside or swipe down dismisses. |
| R-7.20 | **WHEN** the user long-presses a photo (in the grid or the fullscreen modal), **THE SYSTEM SHALL** show a bottom sheet with: "Set as profile photo", "Remove from Hokédex", "Remove and delete file". |
| R-7.21 | **WHEN** the user selects "Remove and delete file", **THE SYSTEM SHALL** show a confirmation alert before deleting. |
| R-7.22 | **WHEN** the user taps the trash icon on `EntryDetailScreen`, **THE SYSTEM SHALL** prompt twice: once to confirm deletion from Hokédex, once to confirm deletion of original files from the device. |
| R-7.23 | **WHEN** a photo's `local_path` cannot be resolved (file missing), **THE SYSTEM SHALL** display a grey placeholder. This is not an error state and SHALL NOT show an error message. |
| R-7.24 | **WHEN** the user taps "Sample" in the action bar, **THE SYSTEM SHALL** open the gallery/camera picker, run the selected photo through detect + embed + search scoped to that entry, and display the result inline on the profile screen: "Match — XX%" or "No match". |
| R-7.25 | **THE SYSTEM SHALL** display `SearchResultScreen` with a "Pick photo to search" button when no search has been run yet. |
| R-7.26 | **WHEN** search returns a Likely match, `SearchResultScreen` **SHALL** display a card with the matched entry's profile photo, name, and similarity as a percentage. |
| R-7.27 | **WHEN** search returns Possible matches, `SearchResultScreen` **SHALL** display them as a ranked list below any Likely match card. |
| R-7.28 | **WHEN** search returns no match above the possible threshold, `SearchResultScreen` **SHALL** display "No one recognised" and a "Create new entry" button. |
| R-7.29 | **WHEN** the user taps a match result card, **THE SYSTEM SHALL** navigate to `EntryDetailScreen` for that entry AND offer an "Attach this photo" action. |

---

### Required SQL additions (photos.sql)

```sql
-- name: SetProfilePhoto :exec
UPDATE photos SET is_profile_photo = 1 WHERE id = ?;

-- name: UnsetAllProfilePhotos :exec
UPDATE photos SET is_profile_photo = 0 WHERE entry_id = ?;

-- name: CountPhotosByEntry :one
SELECT COUNT(*) as count FROM photos WHERE entry_id = ?;
```

---

### Deliverables
- `react-native-image-picker` installed and linked
- `READ_MEDIA_IMAGES` + `CAMERA` in `AndroidManifest.xml`
- `src/AppContext.tsx` — provides `db`, `collectionRoot`, `category`
- `src/navigation/RootNavigator.tsx` — NativeStack with 4 routes
- `src/screens/CollectionListScreen.tsx` — avatar grid, computed columns, "+" tile first
- `src/screens/NewEntryScreen.tsx` — name input, photo preview, gallery/camera picker, save
- `src/screens/EntryDetailScreen.tsx` — small avatar header, stats row (date in local TZ), tag chips, notes, action bar (Sample / + / More photos), 3-col photo grid, accent color from pHash
- `src/screens/PhotoLightboxModal.tsx` — fullscreen swipeable photo modal, long-press bottom sheet
- `src/screens/SearchResultScreen.tsx`
- `src/theme/accent.ts` — `ACCENT_PALETTE` + `accentForEntry(pHash)` helper
- SQL additions to `photos.sql` + corresponding `photos.ts` functions
- Updated `App.tsx` — renders navigator after boot

### Context to load for execution
- Phase 7 of this plan (all sections above), `src/db/queries/`, `src/services/ingestion.ts`, `src/services/search.ts`, `src/theme/fonts.ts`, `App.tsx`

---

## Phase 7b — PIN Lock

### Goal
The app is protected by a 4–6 digit PIN. The lock screen is shown on first launch (setup) and whenever the app returns to foreground after an idle timeout. The PIN hash is stored in Android Keystore, never in SQLite. The app content is hidden in the system app switcher.

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-7b.1 | **WHERE** the user launches the app for the first time, **THE SYSTEM SHALL** require the user to set a PIN of 4–6 digits before any collection content is shown. The PIN SHALL be confirmed by entering it twice. |
| R-7b.2 | **THE SYSTEM SHALL** store a PBKDF2-SHA256 hash of the PIN (with a random salt, minimum 100,000 iterations) in Android `EncryptedSharedPreferences`. The raw PIN and any reversible form of it SHALL NOT be stored anywhere on the device. |
| R-7b.3 | **WHEN** the app returns to the foreground after being backgrounded for more than 60 seconds, **THE SYSTEM SHALL** show the lock screen and require PIN entry before revealing any collection content. |
| R-7b.4 | **WHEN** the device supports biometrics (fingerprint or face unlock), **THE SYSTEM SHALL** offer biometric unlock as an alternative to PIN entry on the lock screen. Biometric unlock SHALL be opt-in during PIN setup and toggleable in settings. |
| R-7b.5 | **WHEN** the user enters an incorrect PIN 5 consecutive times, **THE SYSTEM SHALL** impose a 30-second lockout before allowing further attempts. The lockout period SHALL double on each subsequent 5-attempt block. |
| R-7b.6 | **WHEN** the app is sent to the background, **THE SYSTEM SHALL** immediately obscure all collection content with the lock screen overlay before the system captures the app snapshot for the app switcher. |
| R-7b.7 | **THE SYSTEM SHALL** allow the user to change their PIN from settings by first verifying the current PIN, then following the same setup flow. |
| R-7b.8 | **WHERE** the user forgets their PIN, **THE SYSTEM SHALL** offer a "Reset app" path that wipes the local database and all collection data. This path SHALL require the user to type the phrase `delete my collection` to confirm. There is no account recovery — this is by design. |

### Implementation Notes
- Use `androidx.security.crypto.EncryptedSharedPreferences` for PIN hash + salt storage (wraps Android Keystore internally)
- Use `androidx.biometric.BiometricPrompt` for biometric unlock — do not use the deprecated `FingerprintManager`
- The 60-second idle timeout is measured from the `onPause` lifecycle event; reset on `onResume` after successful unlock
- PIN entry UI: custom numpad (not system keyboard) to avoid keyboard screenshot leakage

### Deliverables
- `PinSetupScreen` — two-entry confirmation flow
- `LockScreen` — numpad + optional biometric prompt
- `PinService.kt` — PBKDF2 hash/verify, EncryptedSharedPreferences read/write
- `AppLockManager.ts` — foreground/background lifecycle listener, timeout state
- Settings toggle for biometric unlock
- "Reset app" confirmation flow
- Unit test: correct PIN verifies; incorrect PIN increments attempt counter; 5th attempt triggers lockout

### Context to load for execution
- Phase 7b of this plan, React Navigation setup from Phase 7

---

## Phase 8 — SQLite Optimization Verification

### Goal
Confirm the database is operating in WAL mode with all PRAGMAs applied. Measure search latency against a seeded dataset. Establish a baseline before any profiling.

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-8.1 | **THE SYSTEM SHALL** verify on startup that `PRAGMA journal_mode` returns `wal`. If it does not, **THE SYSTEM SHALL** log an error and re-apply the pragma. |
| R-8.2 | **THE SYSTEM SHALL** include a developer-only diagnostic screen (hidden behind a long-press gesture) that shows all active PRAGMA values. |
| R-8.3 | **THE SYSTEM SHALL** complete a cosine similarity search over 3,000 embeddings in under 500ms on a mid-range Android device, as verified by a benchmarking script that seeds the database and times 10 consecutive searches. |
| R-8.4 | **THE SYSTEM SHALL** run `PRAGMA wal_checkpoint(PASSIVE)` on app background. |

### Deliverables
- PRAGMA verification on DB open
- Benchmark seed script (3,000 random 512d float32 embeddings)
- Benchmark runner logging p50/p95/p99 search latency
- PRAGMA diagnostic screen

### Context to load for execution
- Phase 8 of this plan, database initialization module from Phase 1

---

## SQLite PRAGMA Reference

Applied on every connection open, in this order:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = memory;
PRAGMA cache_size = 2000;
PRAGMA mmap_size = 134217728;
PRAGMA journal_size_limit = 67108864;
PRAGMA busy_timeout = 5000;
```

Run periodically (on app background or connection close):

```sql
PRAGMA optimize;
PRAGMA wal_checkpoint(PASSIVE);
```

**Rationale:**
- `journal_mode = WAL` — concurrent readers and writer; no read/write contention (BigBinary / SQLite docs)
- `synchronous = NORMAL` — safe in WAL mode; syncs only at WAL checkpoints, not every write (BigBinary)
- `foreign_keys = ON` — not enabled by default in SQLite; required for cascade deletes to work
- `temp_store = memory` — temporary indexes and sorts stay in memory (phiresky)
- `cache_size = 2000` — 2000 pages ≈ 8MB with default 4096-byte pages; improves buffer efficiency (BigBinary)
- `mmap_size = 134217728` — 128MB memory-mapped I/O; bypasses page copy overhead (BigBinary / phiresky)
- `journal_size_limit = 67108864` — caps WAL file at 64MB; prevents unbounded growth degrading read performance (BigBinary)
- `busy_timeout = 5000` — retries on SQLITE_BUSY for up to 5s before failing; required for React Native background/foreground write contention
- `PRAGMA optimize` — updates internal statistics; recommended before close or every few hours (phiresky)
- `wal_checkpoint(PASSIVE)` — merges WAL back to main DB file without blocking readers; run on app background

---

## TypeScript Type Reference

```typescript
type DetectionState =
  | { type: 'NO_SUBJECT' }
  | { type: 'MULTI_SUBJECT'; crops: BoundingBox[] }
  | { type: 'LOW_CONFIDENCE'; crop: BoundingBox; confidence: number }
  | { type: 'SUCCESS'; crop: BoundingBox };

type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SearchResult = {
  likelyMatch: EntryResult | null;
  possibleMatches: EntryResult[];
  topCandidates: EntryResult[];
};

type EntryResult = {
  entryId: string;
  name: string;
  bestScore: number;
  profilePhotoPath: string | null;
};
```

---

## Phase Execution Order and Dependencies

```
Phase 1 (Scaffold + DB init)
    ↓
Phase 2 (Schema)
    ↓
Phase 3 (Kotlin ML)   ←── can proceed in parallel with Phase 4 stub + Phase 7 stub
    ↓
Phase 4 (Ingestion — HokedexIngest Kotlin module)
    ↓
Phase 5 (Search)
    ↓
Phase 6 (Share Sheet)
    ↓
Phase 7 (Core UI — finalize with real data)
    ↓
Phase 7b (PIN Lock)
    ↓
Phase 8 (Optimization Verification)
```

Phases 3 and 7 (early UI) can proceed in parallel with the stub ML module in place (R-1.3). Phase 7 must be re-validated against real ML output after Phase 3 lands. Phase 7b can be built in parallel with Phase 7 since it has no dependency on collection data.

---

## ADR-002 Readiness Checklist

The following decisions, made in this MVP, ensure ADR-002 features can be added without schema migration or architectural rework:

| Item | Status in MVP |
|------|--------------|
| `Entry` model with `category_id` (not `Person`) | ✅ Implemented |
| `detect(image, category)` / `embed(crop, category)` interface | ✅ Implemented |
| `local_path` stored as relative path | ✅ Implemented |
| `original_sha256` computed at ingestion | ✅ Implemented |
| `original_phash` computed at ingestion | ✅ Implemented |
| SHA-256 in thumbnail EXIF/tEXt metadata header | ✅ Implemented |
| `is_public` flag on `Entry` (default false) | ✅ Schema present, no UI |
| `Workspace` table | ✅ Schema present, single row seeded |
| Ed25519 keypair, publishing server, transfer | ❌ Deferred (ADR-002) |
| Collection restore workflow | ❌ Deferred (ADR-002) |
| Additional categories | ❌ Deferred (ADR-002) |

---

## Open Questions

1. **Thumbnail EXIF writing**: Android's `ExifInterface.TAG_USER_COMMENT` supports free-text. Needs validation that writing `hokedex:original_sha256=…` does not strip pre-existing EXIF fields from source images (e.g. camera metadata). Should copy-then-write, not rewrite from scratch.

2. **Similarity thresholds**: 0.95 / 0.85 are placeholders from ADR-001. Must be validated empirically before shipping. A labelled test set of known-same and known-different face image pairs is required. See Benchmark Checklist item 4.

3. **Collection root location**: Android scoped storage constraints affect where `HokedexData/` can be written and whether it survives app uninstall. `getExternalFilesDir()` survives reinstall; `getFilesDir()` does not. Decision needed before Phase 2 ships.

4. **kophash maintenance**: `shiveenp/kophash` is a small community library with low activity. If it proves unmaintained or incompatible with the target Android API level, fall back to implementing DCT pHash directly in Kotlin (~50 lines, well-documented algorithm).

---

## Benchmark Checklist

Pre-ship benchmarks. Each must produce a recorded result before the relevant phase is marked complete.

- [ ] **Vector search latency** — Seed 3,000 embeddings (512d float32) into sqlite-vec. Run 10 consecutive cosine similarity searches. Record p50 / p95 / p99 on a mid-range Android device (Snapdragon 600-class). Target: p95 < 500ms. *(Gate for Phase 5)*

- [ ] **pHash vs vector search for face matching** — Run both approaches against the same labelled face pair dataset (minimum 50 same-person pairs, 50 different-person pairs). Record precision/recall for each. Confirm vector search (MobileFaceNet embeddings + cosine similarity) outperforms pHash-based face matching before committing to the ADR-001 approach. pHash is retained for file reconciliation regardless of outcome. *(Gate for Phase 5)*

- [ ] **`HokedexIngest.processImage` latency** — Time the full Kotlin ingestion call (SHA-256 + pHash + file copy + thumbnail + EXIF write) on a 5MB JPEG. Target: < 300ms. *(Gate for Phase 4)*

- [ ] **Similarity threshold validation** — Against a labelled face pair dataset, sweep cosine similarity thresholds from 0.80 to 0.98 in 0.01 steps. Record false positive rate and false negative rate at each step. Confirm or revise the 0.95 / 0.85 placeholders. *(Gate for Phase 8)*

- [ ] **WAL PRAGMA verification** — On a fresh install, confirm `PRAGMA journal_mode` returns `wal`, `PRAGMA synchronous` returns `1` (NORMAL), and `PRAGMA foreign_keys` returns `1`. Log results. *(Gate for Phase 1)*
