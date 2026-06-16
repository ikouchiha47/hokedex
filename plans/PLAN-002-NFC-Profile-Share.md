# PLAN-002: NFC Profile Share

## Overview

Two phones running hokédex tap together. The sender's name and profile photo transfer to the receiver. The receiver's app detects whether the incoming person already exists in their collection (by face similarity or name match) and offers a merge or a new entry. Nothing else transfers — no tags, notes, encounters, embeddings, or collection data.

---

## Hypothesis → Validate → Propose → Validate → Refine → Human → Execute Loop

This plan follows the H-V-P-V-R-H-E loop at each phase gate:

1. **Hypothesis** — what we believe the phase must do and why
2. **Validate** — questions to answer before writing code (automated checks, codebase reads, or user input)
3. **Propose** — concrete design: schema, API surface, component tree
4. **Validate** — verify the proposal against existing architecture (run grep, read files, check types)
5. **Refine** — record any changes made during validation
6. **Human in Loop** — explicit checkpoint: show the plan to the user, wait for go-ahead before executing
7. **Execute** — implement, test, ship

Every phase in this document carries its own H-V-P-V-R-H gate. Do not execute a phase without completing its gate.

---

## Scope Constraints

**In scope:**
- `user_profiles` table — user's own name and profile photo (singleton)
- Profile setup screen (first-launch gate) and profile edit screen
- NFC send — broadcast name + compressed profile photo as NDEF payload
- NFC receive — parse NDEF payload, detect duplicates, route to merge or new entry
- Merge screen — side-by-side existing vs incoming, merge or add as new
- `merge.ts` service — pure function, no UI coupling, unit-testable

**Explicitly out of scope:**
- Transferring tags, notes, encounters, encounter history
- Transferring face embeddings (receiver generates their own from the received photo)
- NFC between hokédex and non-hokédex apps
- iOS (NFC background dispatch is different; deferred)
- Bluetooth fallback when NFC is unavailable
- Multiple pending incoming contacts (one at a time only)

---

## Token Budget Guidance

Each phase is executable in isolation. Load only the files listed in "Context to load" for that phase. Cross-phase dependencies are called out explicitly. Do not load the full codebase for any single phase.

---

## Phase A — User Profile

### Hypothesis
The user has no way to represent themselves in the app today. NFC send requires a name and a profile photo that belongs to the sender, not to any entry in their collection. A singleton `user_profiles` table is the simplest correct model — one row, enforced by a CHECK constraint, editable at any time.

### Validate (before proposing)
- [ ] Confirm `schema_migrations` tracks versions as integers — migration 3 is the correct next version
- [ ] Confirm no existing table or column named `user_profiles` in `src/db/sql/migrations/`
- [ ] Confirm `runMigrations` in `runner.ts` will pick up a new `{ version: 3, sql: SQL.migration003 }` entry automatically
- [ ] Confirm photo storage convention: relative path from `collection_root`, same as `photos.local_path`
- [ ] Confirm `AppContext` is the correct gate point for first-launch checks

### Proposal

**Migration 3 — `user_profiles` table**

```sql
-- migration003.sql

-- name: CREATE_USER_PROFILE_TABLE
CREATE TABLE IF NOT EXISTS user_profiles (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  name        TEXT    NOT NULL,
  photo_path  TEXT    NOT NULL,
  updated_at  INTEGER NOT NULL
);
```

`CHECK (id = 1)` enforces singleton at the DB layer. No application-level guard needed.

**`src/db/queries/userProfile.ts`**

```ts
export type UserProfile = { name: string; photo_path: string; updated_at: number };

getProfile(db: DB): UserProfile | null
upsertProfile(tx: Tx, params: UserProfile): void
```

**Screens**

- `ProfileSetupScreen` — shown on first launch if `getProfile` returns null. Name text input + photo picker (camera or gallery). Cannot be dismissed without completing. Saves via `upsertProfile`.
- `ProfileEditScreen` — accessible from `CollectionList` header. Same fields, pre-populated. Save updates the row.

**Nav additions**

```ts
RootStackParamList:
  ProfileSetup: undefined
  ProfileEdit: undefined
```

`AppContext` checks `getProfile` after migrations run. If null → navigate to `ProfileSetup` before rendering `CollectionList`.

### Validate proposal
- [ ] `CHECK (id = 1)` is valid SQLite syntax — confirm with a local SQLite test or docs
- [ ] `upsertProfile` uses `INSERT OR REPLACE` — verify this resets `rowid` safely (it does for INTEGER PRIMARY KEY)
- [ ] `ProfileSetupScreen` gate in `AppContext` does not block DB initialization (migrations run first, then profile check)
- [ ] Photo picker uses same permissions util (`src/utils/permissions.ts`) already used in `NewEntryScreen`

### Refine
Record any changes from validation here before executing.

### Human in Loop ✋
**Gate:** Show migration SQL, query interface, and screen flow to user. Confirm:
- Is `user_profiles` the right name, or should it be `my_profile` / `self`?
- Should profile setup be skippable (allow anonymous NFC receive without a profile)?
- Photo picker — camera only, gallery only, or both?

**Do not execute Phase A until user confirms.**

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-A.1 | **WHERE** the user launches the app for the first time and no `user_profiles` row exists, **THE SYSTEM SHALL** present `ProfileSetupScreen` and SHALL NOT navigate to `CollectionList` until a name and profile photo have been saved. |
| R-A.2 | **THE SYSTEM SHALL** enforce that `user_profiles` contains at most one row via a `CHECK (id = 1)` constraint at the database layer. |
| R-A.3 | **THE SYSTEM SHALL** store `user_profiles.photo_path` as a path relative to `collection_root`, consistent with `photos.local_path` convention. |
| R-A.4 | **WHEN** the user saves a profile photo, **THE SYSTEM SHALL** generate a thumbnail at 80×80px JPEG and store the thumbnail path in `user_profiles.photo_path`. The original SHALL also be retained at full resolution. |
| R-A.5 | **THE SYSTEM SHALL** allow the user to update their name or profile photo at any time from `ProfileEditScreen` without deleting and re-creating the profile row. |
| R-A.6 | **WHERE** a `user_profiles` row already exists on launch, **THE SYSTEM SHALL** navigate directly to `CollectionList` without showing `ProfileSetupScreen`. |

### Deliverables
- `src/db/sql/migrations/migration003.sql`
- `src/db/migrations/003_user_profiles.ts` (loads SQL, exports string)
- `runner.ts` updated: `{ version: 3, sql: SQL.migration003 }`
- `src/db/sql/loader.ts` updated: import + export `migration003`
- `src/db/queries/userProfile.ts`
- `src/screens/ProfileSetupScreen.tsx`
- `src/screens/ProfileEditScreen.tsx`
- `RootNavigator.tsx` updated: `ProfileSetup`, `ProfileEdit` routes
- `AppContext.tsx` updated: profile gate after migrations

### Context to load for execution
- `src/db/migrations/runner.ts`
- `src/db/sql/loader.ts`
- `src/db/sql/migrations/` (existing migrations for reference)
- `src/db/queries/entries.ts` (pattern for query file)
- `src/screens/NewEntryScreen.tsx` (photo picker pattern)
- `src/AppContext.tsx`
- `src/navigation/RootNavigator.tsx`
- This phase section only

---

## Phase B — NFC Send

### Hypothesis
Android NFC P2P (Android Beam) was deprecated in API 29. The correct modern approach is Host Card Emulation (HCE) for send and `ACTION_NDEF_DISCOVERED` for receive. The payload is small enough (name + 80×80 JPEG thumbnail ≈ 7–11KB base64) to fit in a single NDEF message. A Kotlin native module wraps the NFC adapter. The JS side calls `startSharing` / `stopSharing`.

### Validate (before proposing)
- [ ] Confirm Android API level minimum in `build.gradle` — HCE requires API 19+, we target higher
- [ ] Confirm `react-native-nfc-manager` is not already in `package.json`
- [ ] Confirm HCE service approach vs NDEF push — HCE is the right call for modern Android (>= API 29)
- [ ] Measure actual payload size: 80×80 JPEG ~5KB → base64 ~7KB + name + JSON overhead ≈ 8KB total. NFC NDEF max for HCE is device-dependent but typically 32KB+. Confirm this is safe.
- [ ] Confirm `NfcAdapter.getDefaultAdapter(context)` is accessible from a React Native native module (not an Activity method)

### Proposal

**Payload format (NDEF Text record, UTF-8)**

```json
{ "v": 1, "name": "Sarah Connor", "photo": "<base64 JPEG>" }
```

Single NDEF Text record. Version field (`v`) allows future schema changes without breaking old receivers.

**`HokedexNFCModule.kt`**

```kotlin
@ReactMethod fun startSharing(name: String, photoB64: String, promise: Promise)
@ReactMethod fun stopSharing(promise: Promise)
@ReactMethod fun isNFCAvailable(promise: Promise)
```

`startSharing` builds the NDEF message, registers it with `NfcAdapter.setNdefPushMessage` (API < 29) or HCE service (API >= 29), resolves promise when ready. The JS side shows the "hold together" UI immediately after the promise resolves.

**`NFCShareScreen.tsx`**

- Reads `user_profiles` from DB
- Compresses profile photo to 80×80px JPEG in-memory (via `ImageCropPicker` resize or `react-native-image-resizer`)
- Calls `HokedexNFCModule.startSharing(name, photoB64)`
- Shows tap animation
- On unmount, calls `stopSharing()`
- Accessible from `CollectionList` header share icon

**Nav addition**

```ts
RootStackParamList:
  NFCShare: undefined
```

### Validate proposal
- [ ] `NfcAdapter` requires a reference to the current `Activity`, not just `Context` — confirm `ReactApplicationContext.currentActivity` is safe to use here
- [ ] HCE requires `<service>` declaration in `AndroidManifest.xml` and `android.permission.NFC` — list all manifest changes needed
- [ ] Photo compression: confirm `react-native-image-resizer` or `ImageCropPicker` resize option is already in the project or needs adding
- [ ] `stopSharing` must be called even if the user navigates away mid-flow — confirm `useEffect` cleanup handles this

### Refine
Record any changes from validation here before executing.

### Human in Loop ✋
**Gate:** Confirm with user:
- HCE approach approved, or prefer a different NFC strategy?
- Should `NFCShare` be a full screen or a bottom sheet?
- Timeout behaviour: if no tap after 60s, auto-dismiss or stay open?

**Do not execute Phase B until Phase A is complete and user confirms Phase B gate.**

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-B.1 | **WHERE** the user opens `NFCShareScreen`, **THE SYSTEM SHALL** check NFC availability and SHALL display an error message if NFC is not available on the device, rather than silently failing. |
| R-B.2 | **WHEN** the user opens `NFCShareScreen`, **THE SYSTEM SHALL** compress the profile photo to 80×80px JPEG and register an NDEF payload containing `{ v: 1, name, photo: base64 }` with the NFC adapter within 2 seconds. |
| R-B.3 | **WHILE** `NFCShareScreen` is active, **THE SYSTEM SHALL** keep the NFC NDEF payload registered so that any incoming tap is handled without additional user interaction. |
| R-B.4 | **WHEN** the user leaves `NFCShareScreen` (back navigation or dismiss), **THE SYSTEM SHALL** call `stopSharing()` and unregister the NDEF payload. |
| R-B.5 | **THE SYSTEM SHALL** request `android.permission.NFC` at runtime if not already granted before activating the NFC adapter. |
| R-B.6 | **WHERE** the `user_profiles` table contains no row, **THE SYSTEM SHALL** not allow navigation to `NFCShareScreen` and SHALL instead navigate to `ProfileSetupScreen`. |
| R-B.7 | **THE SYSTEM SHALL** declare the `HCE service` and `NFC_NDEF_DISCOVERED` intent filter in `AndroidManifest.xml` as required by Android HCE. |

### Deliverables
- `android/app/src/main/java/com/hokedex/nfc/HokedexNFCModule.kt`
- `android/app/src/main/java/com/hokedex/nfc/HokedexNFCPackage.kt`
- `android/app/src/main/java/com/hokedex/nfc/HokedexHCEService.kt`
- `AndroidManifest.xml` updated: NFC permission, HCE service declaration, intent filter
- `MainApplication.kt` updated: `HokedexNFCPackage` registered
- `src/screens/NFCShareScreen.tsx`
- `RootNavigator.tsx` updated: `NFCShare` route
- `CollectionListScreen.tsx` updated: share icon in header → navigates to `NFCShare`

### Context to load for execution
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/com/hokedex/MainApplication.kt`
- `android/app/src/main/java/com/hokedex/ml/HokedexMLModule.kt` (native module pattern)
- `src/screens/CollectionListScreen.tsx`
- `src/db/queries/userProfile.ts` (from Phase A)
- This phase section only

---

## Phase C — NFC Receive

### Hypothesis
The receiver side handles `ACTION_NDEF_DISCOVERED` in `MainActivity`, parses the JSON payload, saves the received photo to a temp file, runs face embedding, compares against existing entries, and routes to either `NFCMergeScreen` or `NewEntryScreen` (prefilled). All ML runs on the receiver's device — embeddings are never transferred.

### Validate (before proposing)
- [ ] Confirm `MainActivity.kt` currently has no `onNewIntent` override — safe to add one
- [ ] Confirm `searchByEmbedding` in `src/services/search.ts` accepts a raw `number[]` vector and can be called with an already-computed embedding (so we don't re-detect, just compare)
- [ ] Confirm fuzzy name match strategy: Levenshtein ≤ 2 OR case-insensitive substring. Confirm `listEntriesByCategory` returns all entries for a given category so we can do the fuzzy check in JS
- [ ] Confirm temp file path: `{collection_root}/tmp/nfc_incoming_{timestamp}.jpg` — confirm this dir is writable and cleaned up after use
- [ ] Confirm `embed()` native call takes a file URI (not base64) — so we must write the base64 photo to disk before embedding

### Proposal

**`MainActivity.kt` — NFC intent handling**

```kotlin
override fun onNewIntent(intent: Intent) {
  super.onNewIntent(intent)
  if (NfcAdapter.ACTION_NDEF_DISCOVERED == intent.action) {
    val rawMessages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES)
    // parse first NDEF Text record → emit RN event "NFCIncoming" with payload string
    reactInstanceManager.currentReactContext
      ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      ?.emit("NFCIncoming", payloadString)
  }
}
```

**`src/screens/NFCReceiveScreen.tsx`** (listens for `NFCIncoming` event)

Flow:
1. Parse JSON payload `{ v, name, photo }`
2. Validate `v === 1` (reject unknown versions with user-facing error)
3. Write `photo` base64 to `{collection_root}/tmp/nfc_{ts}.jpg`
4. Call `HokedexMLModule.embed(tempFileUri, 'people')` → `number[]`
5. Call `searchByEmbedding(db, vector, peopleCategory)` → `SearchResult`
6. Run fuzzy name match against `listEntriesByCategory(db, 'people')`
7. Collect candidates:
   - `tier === 'likely'` entries → face match candidates
   - fuzzy name matches → name match candidates
   - deduplicate by `entryId`
8. If candidates exist → navigate to `NFCMergeScreen`
9. If no candidates → navigate to `NewEntry` with `{ prefillName: name, prefillImageUri: tempFileUri }`
10. Delete temp file after navigation (or after merge/create completes)

**Nav additions**

```ts
RootStackParamList:
  NFCReceive: undefined   -- listens for NFCIncoming event, no params needed
  NFCMerge: {
    incomingName: string;
    incomingPhotoUri: string;
    candidates: Array<{
      entryId: string;
      entryName: string;
      profilePhotoPath: string | null;
      similarity: number | null;       -- null if name-only match
      matchReason: 'face' | 'name' | 'face_and_name';
    }>;
  }
```

`NFCReceive` is not a screen the user navigates to manually — it is mounted always (or as a background listener in `AppContext`) so that incoming taps are handled even when the app is in the foreground on any screen.

### Validate proposal
- [ ] Confirm `DeviceEventManagerModule` approach for emitting from Kotlin is the same pattern used by `HokedexMLModule` (or adjust to match existing bridge pattern)
- [ ] Confirm `searchByEmbedding` can accept a pre-computed `number[]` without re-running `detect` first — check `src/services/search.ts` signature
- [ ] Confirm fuzzy name match: Levenshtein implementation in JS (no native dep needed for short strings) or simple `includes` / `toLowerCase` comparison
- [ ] Confirm `NewEntry` screen already accepts `prefillImageUri` and `prefillName` — check `RootStackParamList` in `RootNavigator.tsx`
- [ ] Temp file cleanup: confirm delete happens after the downstream screen (NFCMerge or NewEntry) completes, not immediately after navigation

### Refine
Record any changes from validation here before executing.

### Human in Loop ✋
**Gate:** Confirm with user:
- Should the app handle incoming NFC taps when on any screen, or only when `NFCShareScreen` is active on the receiver side too?
- If both face match AND name match point to different entries — show both candidates or only the highest-confidence one?
- Should version mismatch (`v !== 1`) show an error or silently ignore?

**Do not execute Phase C until Phase B is complete and user confirms Phase C gate.**

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-C.1 | **WHEN** the device receives an NFC tap with a valid hokédex NDEF payload (`v === 1`), **THE SYSTEM SHALL** parse the payload and begin duplicate detection within 1 second of the tap, regardless of which screen is currently active. |
| R-C.2 | **THE SYSTEM SHALL** write the received base64 photo to a temp file before calling `embed()`, and SHALL delete the temp file after the downstream flow (merge or new entry) completes. |
| R-C.3 | **WHEN** face similarity search returns `tier === 'likely'` for the received photo, **THE SYSTEM SHALL** treat the matched entry as a face-match candidate for merge. |
| R-C.4 | **WHEN** the received name matches an existing entry name with Levenshtein distance ≤ 2 (case-insensitive), **THE SYSTEM SHALL** treat that entry as a name-match candidate for merge. |
| R-C.5 | **WHEN** one or more merge candidates exist, **THE SYSTEM SHALL** navigate to `NFCMergeScreen` with the candidate list, ordered by descending similarity score (face matches first, then name-only matches). |
| R-C.6 | **WHEN** no merge candidates exist, **THE SYSTEM SHALL** navigate to `NewEntryScreen` with `incomingName` and `incomingPhotoUri` prefilled. |
| R-C.7 | **WHEN** the received payload has `v !== 1`, **THE SYSTEM SHALL** display a user-facing error: "This profile was shared from a newer version of hokédex. Please update the app." and SHALL NOT attempt to parse the payload further. |
| R-C.8 | **THE SYSTEM SHALL** handle the case where `embed()` fails (e.g. no face detected in received photo) by skipping face-similarity search and falling back to name-only duplicate detection. |

### Deliverables
- `android/app/src/main/java/com/hokedex/MainActivity.kt` updated: `onNewIntent` NFC handler
- `src/screens/NFCReceiveScreen.tsx` (or background listener in `AppContext`)
- `src/utils/levenshtein.ts` — pure function, unit-testable
- `RootNavigator.tsx` updated: `NFCMerge` route, `NFCReceive` if screen-based
- `src/services/__tests__/levenshtein.test.ts`

### Context to load for execution
- `android/app/src/main/java/com/hokedex/MainActivity.kt`
- `src/services/search.ts`
- `src/db/queries/entries.ts`
- `src/AppContext.tsx`
- `src/navigation/RootNavigator.tsx`
- This phase section only

---

## Phase D — Merge Screen and Merge Service

### Hypothesis
The merge screen shows the incoming profile (name + photo) on the left and the candidate entry (name + profile photo + match reason) on the right. The user picks **Merge** or **Add as new**. If multiple candidates exist, they are shown as a scrollable list on the right side, one selected at a time. Merge calls `mergeIncomingPhoto` — a pure service function that adds the received photo to the existing entry via the existing ingestion pipeline.

### Validate (before proposing)
- [ ] Confirm `ingestion.ts` can accept an existing `entryId` and add a photo to it (not just create a new entry) — read the current signature
- [ ] Confirm the existing ingestion pipeline handles: copy file → SHA-256 + pHash → thumbnail → insert `Photo` row → `embed()` → insert `Embedding` row
- [ ] Confirm `is_profile_photo` on the merged photo defaults to `false` — user can manually change it later from `EntryDetailScreen`
- [ ] Confirm no cascade delete issues: merging adds a photo to an existing entry, does not delete the incoming temp file until after `Photo` row is inserted

### Proposal

**`src/services/merge.ts`**

```ts
export async function mergeIncomingPhoto(
  db: DB,
  entryId: string,
  incomingPhotoUri: string,  // absolute path to temp file
  incomingName: string,
  options: { updateName: boolean }
): Promise<void>
```

Internally:
1. Run existing ingestion pipeline: copy → hash → thumbnail → Photo row → embed → Embedding row, all against `entryId`
2. If `options.updateName === true` → call `updateEntryName(tx, { id: entryId, name: incomingName, updated_at: Date.now() })`
3. Delete temp file

**`NFCMergeScreen.tsx`**

Layout:
```
┌─────────────────────────────────────────┐
│  INCOMING          │  EXISTING           │
│  [photo]           │  [photo]  ← scrolls │
│  name              │  name               │
│  "Just tapped you" │  similarity / reason│
├─────────────────────────────────────────┤
│  [ Merge into existing ]                │
│  [ Add as new person ]                  │
│  [ Cancel ]                             │
└─────────────────────────────────────────┘
```

- If multiple candidates: right side is a horizontal scroll of candidate cards, one highlighted at a time
- "Merge into existing" → calls `mergeIncomingPhoto(db, selectedCandidate.entryId, ...)`
- "Add as new person" → navigates to `NewEntryScreen` prefilled (same as no-candidate flow)
- "Cancel" → discards temp file, goes back

**Name update option** — shown as a checkbox below merge button: "Also update their name to [incomingName]". Default off. Only shown if `incomingName !== existingEntry.name`.

### Validate proposal
- [ ] Confirm `ingestion.ts` signature accepts `entryId` parameter or needs a new overload
- [ ] Confirm `updateEntryName` in `entries.ts` exists and is the right function to call
- [ ] Confirm temp file is not deleted by `NFCReceiveScreen` before `mergeIncomingPhoto` completes
- [ ] Confirm the "Add as new" path from merge screen correctly passes `incomingPhotoUri` to `NewEntryScreen` without the temp file being deleted prematurely

### Refine
Record any changes from validation here before executing.

### Human in Loop ✋
**Gate:** Confirm with user:
- Is the side-by-side layout right, or do you want something different?
- Should "update name" default to on or off?
- After merge, where does the user land — `EntryDetailScreen` for the merged entry, or back to `CollectionList`?

**Do not execute Phase D until Phase C is complete and user confirms Phase D gate.**

### EARS Requirements

| ID | Requirement |
|----|-------------|
| R-D.1 | **WHEN** `NFCMergeScreen` is presented with multiple candidates, **THE SYSTEM SHALL** display them ordered by descending similarity score, with face-match candidates shown before name-only match candidates. |
| R-D.2 | **WHEN** the user selects "Merge into existing", **THE SYSTEM SHALL** run the full ingestion pipeline (copy, hash, thumbnail, Photo row, embed, Embedding row) for the incoming photo against the selected existing entry. |
| R-D.3 | **THE SYSTEM SHALL** set `is_profile_photo = false` on the merged photo by default. |
| R-D.4 | **WHEN** the user selects "Also update their name" and confirms merge, **THE SYSTEM SHALL** update the existing entry's name to `incomingName` and update `updated_at` to the current timestamp. |
| R-D.5 | **WHEN** the user selects "Add as new person", **THE SYSTEM SHALL** navigate to `NewEntryScreen` with `incomingName` and `incomingPhotoUri` prefilled, identical to the no-candidate path from Phase C. |
| R-D.6 | **WHEN** the user selects "Cancel", **THE SYSTEM SHALL** delete the incoming temp file and navigate back to `CollectionList` without creating or modifying any entry. |
| R-D.7 | **WHEN** merge completes successfully, **THE SYSTEM SHALL** delete the incoming temp file and navigate to `EntryDetailScreen` for the merged entry. |
| R-D.8 | **WHERE** the ingestion pipeline fails during merge (e.g. embed fails), **THE SYSTEM SHALL** still save the photo and thumbnail as `reference_only` (no embedding), and SHALL inform the user with a non-blocking toast: "Photo saved, but face match may be limited." |
| R-D.9 | **THE SYSTEM SHALL** expose `mergeIncomingPhoto` as a pure exported function in `src/services/merge.ts`, with no direct UI imports, so it is unit-testable without rendering any component. |

### Deliverables
- `src/services/merge.ts`
- `src/services/__tests__/merge.test.ts`
- `src/screens/NFCMergeScreen.tsx`
- `RootNavigator.tsx` updated: `NFCMerge` route confirmed

### Context to load for execution
- `src/services/ingestion.ts`
- `src/db/queries/entries.ts`
- `src/db/queries/photos.ts`
- `src/db/queries/embeddings.ts`
- `src/screens/EntryDetailScreen.tsx` (navigation target after merge)
- `src/navigation/RootNavigator.tsx`
- This phase section only

---

## Phase Execution Order and Dependencies

```
Phase A (user_profiles) ──► Phase B (NFC send) ──► Phase C (NFC receive) ──► Phase D (merge)
```

No phase can begin until the previous phase has passed its Human in Loop gate and all deliverables are confirmed.

---

## Open Questions

1. **NFC availability gate**: If NFC is hardware-absent (some budget Android devices), should the share icon be hidden entirely or shown with a "NFC not available" error on tap?
2. **Simultaneous incoming taps**: If two people tap simultaneously from the same sender, only one should be processed. Is this an edge case to handle now or defer?
3. **Photo compression library**: Does the project already have `react-native-image-resizer`, or should compression happen in the Kotlin native module (using Android `Bitmap.compress`)?
4. **`NewEntryScreen` prefill**: Currently `RootStackParamList.NewEntry` has `prefillImageUri?: string`. A `prefillName` param needs to be added — confirm no existing callers break.
5. **Temp directory cleanup**: Should a startup cleanup pass delete orphaned tmp files from previous incomplete NFC sessions?
