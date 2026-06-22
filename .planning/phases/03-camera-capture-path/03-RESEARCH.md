# Phase 3: Camera Capture Path - Research

**Researched:** 2026-06-22
**Domain:** React Native camera/gallery flow, face detection, embedding matching, atomic SQLite writes
**Confidence:** HIGH

---

## Summary

Phase 3 wires the Camera FAB option into the full moments capture pipeline: photo acquisition → face detection → face picker → embedding match → person confirm/create → atomic moment DB write. The core infrastructure is already in place from prior phases. This phase is primarily integration work, not greenfield construction.

The native layer is fully built: `HokedexMediaModule` handles camera capture and gallery pick, `HokedexMLModule` handles `detect()` and `embedCrop()`, and `FacePickerModal` already renders bounding boxes and manual annotation. What is missing is (a) a `CameraCaptureScreen` that orchestrates these pieces for the moments domain, (b) a real implementation of `MomentCaptureService.capture()`, and (c) a person-confirm/create dialog for the embedding match step.

The key design constraint is the Facade pattern: nothing in UI may call `HokedexML` or write to `moments`/`moment_people` directly. All writes must go through `MomentCaptureService.capture()`. The existing `NewEntryController` + `ingestion.ts` pattern is the model to follow, but for moments, not entries.

**Primary recommendation:** Build `CameraCaptureScreen` as a thin orchestrator that calls service functions. Implement `MomentCaptureService.capture()` as the single atomic write. Keep all state machine logic (detect → pick → embed → match → confirm → save) in a service function, not in the screen.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| R-CAM-01 | Camera FAB option opens camera or gallery | `HokedexMediaModule.capturePhoto()` and `pickImageFromGallery()` already implemented; FAB Camera option exists in RadialFAB but has no `onPress` handler yet |
| R-CAM-02 | Photo → face detection → bounding boxes | `HokedexMLModule.detect()` returns `DetectionResult` with normalized `BoundingBox[]`; all 4 result types handled |
| R-CAM-03 | If faces detected → face picker | `FacePickerModal` already handles multi-face display, manual annotation, dismissal |
| R-CAM-04 | No face → moment with source=camera, no people | `insertMoment` + `insertMomentPerson` queries exist; needs `source` column or use note to convey |
| R-CAM-05 | User confirms faces → embed + match | `HokedexMLModule.embedCrop()` + `searchEmbeddingsByVector()` already wired; threshold logic needed |
| R-CAM-06 | Match found → pre-populate + confirm prompt | New UI: "Is this [name]?" confirmation dialog — not yet built |
| R-CAM-07 | No match → create new person or skip | Navigation to `NewEntry` screen or inline create; skip path already handled by existing `onAdd` in FacePickerModal |
| R-CAM-08 | All confirmed/skipped → atomic moment + moment_people | `MomentCaptureService.capture()` stub exists; `insertMoment` + `insertMomentPerson` queries exist; `withTransaction` available |
</phase_requirements>

---

## Standard Stack

### Core
| Library/Module | Version/Location | Purpose | Why Standard |
|----------------|-----------------|---------|--------------|
| `HokedexMediaModule` | `android/.../media/` | Camera capture + gallery pick | Already implemented, used in `NewEntryScreen` |
| `HokedexMLModule` | `android/.../ml/` | Face detect + embed + embedCrop | Already implemented, `detect()`/`embedCrop()` wired |
| `FacePickerModal` | `src/components/FacePickerModal.tsx` | Bounding box UI, manual annotation | Already built for this exact use case |
| `searchEmbeddingsByVector` | `src/db/queries/embeddings.ts` | Cosine similarity match against DB | Already implemented, uses sqlite-vec |
| `MomentCaptureService` | `src/services/MomentCaptureService.ts` | Facade for atomic moment write | Phase 1 stub — needs implementation |
| `withTransaction` | `src/db/tx.ts` | Atomic SQLite writes | Used throughout codebase |
| `insertMoment` | `src/db/queries/moments.ts` | Write moment row | Already implemented |
| `insertMomentPerson` | `src/db/queries/moment_people.ts` | Write moment_people row | Already implemented |

### Supporting
| Library/Module | Purpose | When to Use |
|----------------|---------|-------------|
| `requestCameraPermission` | Android camera permission | Before `capturePhoto()` |
| `requestGalleryPermission` | Android gallery permission | Before `pickImageFromGallery()` |
| `ToastAndroid` | User notification (no face detected) | R-CAM-04 toast |
| `lucide-react-native` | Icons in new UI components | Per CONVENTIONS.md — sole icon library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `HokedexMediaModule` | `react-native-image-picker` (installed) | HokedexMediaModule is the project standard; image-picker is installed but not used for new flows |
| `HokedexMLModule.embedCrop()` | `HokedexMLModule.embed()` | `embedCrop()` is correct for user-selected face crops; `embed()` is for auto-detected single face |

**Installation:** No new packages needed. All dependencies already installed and linked.

---

## Architecture Patterns

### Recommended Structure for Phase 3

```
src/
├── screens/
│   └── CameraCaptureScreen.tsx       # thin orchestrator — no ML calls, no DB calls
├── services/
│   ├── MomentCaptureService.ts       # implement capture() — atomic write
│   └── cameraCaptureFlow.ts          # pure state machine: detect→pick→embed→match→confirm
└── components/
    └── PersonConfirmModal.tsx         # "Is this [name]?" + "Create new person?" dialog
```

### Pattern 1: Thin Screen + Service State Machine

The screen owns local React state (photo URI, modal visibility) but delegates all business logic to `cameraCaptureFlow.ts`. The service returns structured results that the screen renders — no logic in render.

```typescript
// cameraCaptureFlow.ts — pure async function, no RN imports
export type FlowResult =
  | { stage: 'no_face' }
  | { stage: 'needs_confirm'; faces: FaceMatch[] }
  | { stage: 'complete'; momentId: string };

export async function runCameraCapture(
  modules: CameraFlowModules,
  db: DB,
  imageUri: string,
  categoryId: string,
): Promise<FlowResult> { ... }
```

The screen calls `runCameraCapture()`, receives a `FlowResult`, and renders accordingly.

### Pattern 2: MomentCaptureService.capture() — Atomic Write

Follow the existing `withTransaction` pattern from `NewEntryController.commit()`:

```typescript
// MomentCaptureService.ts
async capture(input: CaptureInput): Promise<Result<CaptureResult>> {
  const momentId = generateId();
  const now = Date.now();

  withTransaction(this.db, tx => {
    insertMoment(tx, input.note, input.occurredAt, input.placeId ?? null);
    input.entryIds.forEach(entryId => insertMomentPerson(tx, momentId, entryId));
  });

  return { ok: true, value: { momentId } };
}
```

Note: `insertMoment` currently doesn't accept `id` as a parameter — check its signature and extend if needed. The `withTransaction` callback is synchronous (`tx.executeSync`).

### Pattern 3: Face Match → Person Confirm Flow

The embedding match uses existing `searchEmbeddingsByVector()`. The similarity threshold from `FACES_PLAN.md` is 0.75 (cosine similarity). Results above threshold get a confirmation prompt; below threshold go to create-new-person.

```typescript
// cameraCaptureFlow.ts
const matches = await searchEmbeddingsByVector(db, vectorBuffer, categoryId);
const match = matches[0]; // sorted by best_score desc
if (match && match.best_score >= SIMILARITY_THRESHOLD) {
  // R-CAM-06: show confirm "Is this [name]?"
} else {
  // R-CAM-07: show create/skip
}
```

`float32ToBuffer()` from `ingestion.ts` converts the number[] vector to ArrayBuffer for the query.

### Pattern 4: FAB Camera onPress Wiring

`RadialFAB` currently has `TouchableOpacity` buttons with no `onPress`. The Camera button needs a handler. Per CONVENTIONS.md navigation decisions, the screen to navigate to is `CameraCapture` (add to `RootStackParamList` in `src/navigation/types.ts`).

```typescript
// RadialFAB.tsx — add onPress prop pattern
type Props = {
  onCamera?: () => void;
  onContact?: () => void;
  onVoice?: () => void;
};
```

### Anti-Patterns to Avoid

- **ML calls in screen:** Never call `HokedexML.detect()` or `embedCrop()` directly in a screen component. All ML calls belong in service functions.
- **Direct DB writes in screen:** Never call `insertMoment()` directly in a screen. Only `MomentCaptureService.capture()` may write to moments/moment_people.
- **Duplicate face picker:** Do not create a new face picker component. `FacePickerModal` is the canonical one.
- **Skipping `withTransaction` for multi-row writes:** moment + moment_people must be one transaction (R-CAM-08 "atomically").

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera/gallery acquisition | Custom Kotlin camera module | `HokedexMediaModule.capturePhoto()` / `pickImageFromGallery()` | Already handles FileProvider, MediaStore, cancellation codes |
| Face bounding box UI | New bounding box overlay | `FacePickerModal` | Already handles multi-face, manual draw, loading state |
| Cosine similarity | Custom dot-product function | `searchEmbeddingsByVector()` via sqlite-vec | Already uses sqlite-vec extension; handles float32 binary format |
| float32 serialization | Custom buffer code | `float32ToBuffer()` from `ingestion.ts` | Already correct for sqlite-vec's expected format |
| Transaction management | Manual `BEGIN`/`COMMIT` SQL | `withTransaction()` from `src/db/tx.ts` | Handles rollback on error |

---

## Common Pitfalls

### Pitfall 1: `insertMoment` does not accept an `id` parameter

**What goes wrong:** The current `insertMoment` signature in `src/db/queries/moments.ts` generates its own ID internally. `MomentCaptureService.capture()` needs to return `momentId`, so it needs to know the ID before or during the write.

**How to avoid:** Either (a) extend `insertMoment` to accept an optional `id` param and generate if not provided, or (b) generate the ID in the service, pass it to `insertMoment`, and update the SQL accordingly. Option (b) is consistent with how `insertMomentPerson` works.

**Check this:** Read `src/db/sql/queries/moments.sql` and `src/db/queries/moments.ts` to verify current signature before writing service code.

### Pitfall 2: `withTransaction` callback is synchronous — no async allowed inside

**What goes wrong:** Embedding and ML calls are async. Attempting `await` inside `withTransaction`'s callback will silently not wait.

**How to avoid:** Complete all async work (detect, embedCrop, searchEmbeddingsByVector) before entering `withTransaction`. Pass the resolved values in as parameters.

### Pitfall 3: `float32ToBuffer` lives in `ingestion.ts` — do not duplicate

**What goes wrong:** Writing a new buffer serialization function in the service layer that differs from ingestion.ts.

**How to avoid:** Import `float32ToBuffer` from `ingestion.ts`. If it needs to be shared, move it to a utility module — but do not duplicate.

### Pitfall 4: RadialFAB has no prop interface — direct navigation call missing

**What goes wrong:** The Camera button in `RadialFAB` has no `onPress`, so R-CAM-01 cannot be wired without modifying `RadialFAB.tsx`.

**How to avoid:** Add `onCamera`, `onContact`, `onVoice` optional callback props to `RadialFAB` and pass them from `HomeScreen`. Navigation call goes in `HomeScreen`, not in `RadialFAB`.

### Pitfall 5: `moments` table has no `source` column

**What goes wrong:** R-CAM-04 says to create a moment with `source = 'camera'`. The current `moments` schema (007_moments.sql) has no `source` column.

**How to avoid:** Either (a) add a migration `010_moments_source.sql` adding a nullable `source TEXT` column, or (b) encode source in the `status` field (current values: `'logged'`). Option (a) is cleaner and matches the requirement literally. The planner must decide — this is a schema gap.

### Pitfall 6: `searchEmbeddingsByVector` returns entry_id — must join entries for name display

**What goes wrong:** R-CAM-06 requires "Is this [name]?" but `VectorSearchRow` only has `entry_id` and `best_score`, not the entry name.

**How to avoid:** After getting match results, call `getEntry(db, match.entry_id)` to fetch the name. This is a sync read (existing `getEntry` uses `executeSync`).

### Pitfall 7: Permission must be checked before camera, not after

**What goes wrong:** `HokedexMediaModule.capturePhoto()` can be called without camera permission on some Android versions and will either crash or silently fail.

**How to avoid:** Call `requestCameraPermission()` (already in `src/utils/permissions.ts`) before calling `capturePhoto()`. Pattern is established in `NewEntryScreen.showSourcePicker()`.

---

## Code Examples

Verified from codebase (source: direct file reads):

### Acquire Photo (Camera)
```typescript
// Pattern from NewEntryScreen.tsx — already working
const ok = await requestCameraPermission();
if (!ok) { Alert.alert('Permission denied'); return; }
const result = await NativeModules.HokedexMedia.capturePhoto();
// result: { tempPath: string, contentUri: string }
setPhotoUri(result.tempPath);
```

### Detect Faces
```typescript
// HokedexMLModule returns DetectionResult
const detection: DetectionResult = await HokedexML.detect(imageUri, categoryId);
// categoryId must be 'people' — module rejects others
```

### Embed a Selected Crop
```typescript
// embedCrop from ingestion.ts — wraps HokedexML.embedCrop
import { embedCrop } from '../services/ingestion';
const vector = await embedCrop({ HokedexML }, {
  imageUri,
  selectedCrop: crop, // BoundingBox: { x, y, width, height } normalized 0-1
  categoryId,
});
```

### Search for Matching Person
```typescript
import { float32ToBuffer } from '../services/ingestion';
import { searchEmbeddingsByVector } from '../db/queries/embeddings';

const queryVector = float32ToBuffer(vector); // number[] → ArrayBuffer
const matches = await searchEmbeddingsByVector(db, queryVector, categoryId);
// matches[0].best_score is cosine similarity (higher = better match)
// threshold: 0.75 per FACES_PLAN.md
const SIMILARITY_THRESHOLD = 0.75;
```

### Atomic Moment Write
```typescript
import { withTransaction } from '../db/tx';
import { insertMoment } from '../db/queries/moments';
import { insertMomentPerson } from '../db/queries/moment_people';

withTransaction(db, tx => {
  const momentId = insertMoment(tx, note, occurredAt, placeId);
  confirmedEntryIds.forEach(entryId => insertMomentPerson(tx, momentId, entryId));
});
// Note: verify insertMoment returns the generated id — currently unclear from types
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `react-native-image-picker` (installed but legacy) | `HokedexMediaModule` (custom Kotlin) | Use HokedexMedia — it handles FileProvider + MediaStore correctly for this Android version |
| Inline ML calls in screen (SearchResultScreen pattern) | Service function wrapping ML calls | New screens must follow service pattern; SearchResultScreen is a legacy exception |

---

## Open Questions

1. **`moments` table `source` column**
   - What we know: schema has no `source` column; R-CAM-04 requires `source = 'camera'`
   - What's unclear: whether to add migration or use status field
   - Recommendation: Add `010_moments_source.sql` with `ALTER TABLE moments ADD COLUMN source TEXT` — cleanest, matches requirement

2. **`insertMoment` return value**
   - What we know: current signature generates ID internally and does not return it
   - What's unclear: whether the service can/should know the moment ID before the transaction
   - Recommendation: Refactor `insertMoment(tx, id, note, occurredAt, placeId)` to accept id as first param (callee generates it); update SQL. This matches `insertMomentPerson` pattern.

3. **R-CAM-07 "create new person" flow**
   - What we know: tapping "no match" should let user create a new person or skip; `NewEntry` screen exists
   - What's unclear: whether to navigate to `NewEntryScreen` (which creates an `entries` row) or show an inline name prompt (which only creates an entry if the user confirms the moment)
   - Recommendation: Inline name prompt inside `CameraCaptureScreen` — navigating away loses the capture context. Create the entry atomically with the moment inside `MomentCaptureService.capture()`.

4. **Multiple faces in one photo**
   - What we know: `DetectionResult.MULTI_SUBJECT` returns an array of crops; `FacePickerModal` shows all and lets user select one at a time
   - What's unclear: whether to loop the embed→match→confirm flow for each face, or collect all selections then confirm all at once
   - Recommendation: Loop face by face (one at a time through the picker), accumulate confirmed `entryId` list, then call `MomentCaptureService.capture()` once at the end.

---

## Sources

### Primary (HIGH confidence)
- Direct read of `src/services/MomentCaptureService.ts` — stub interface confirmed
- Direct read of `android/.../ml/HokedexMLModule.kt` — detect/embed/embedCrop signatures confirmed
- Direct read of `android/.../media/HokedexMediaModule.kt` — capturePhoto/pickImageFromGallery confirmed
- Direct read of `src/components/FacePickerModal.tsx` — full component functionality confirmed
- Direct read of `src/services/ingestion.ts` — embedCrop, float32ToBuffer, commitIngest confirmed
- Direct read of `src/db/queries/moments.ts` — insertMoment signature confirmed
- Direct read of `src/db/queries/moment_people.ts` — insertMomentPerson signature confirmed
- Direct read of `src/db/queries/embeddings.ts` — searchEmbeddingsByVector confirmed
- Direct read of `src/db/sql/migrations/007_moments.sql` — schema confirmed (no source column)
- Direct read of `.planning/CONVENTIONS.md` — SOLID, facade, transaction patterns
- Direct read of `.planning/STATE.md` — phase decisions and locked choices

### Secondary (MEDIUM confidence)
- `FACES_PLAN.md` — similarity threshold 0.75 stated; this is a design document, not a code constant

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules read directly from source
- Architecture: HIGH — patterns derived from existing working code (NewEntryController, ingestion.ts)
- Pitfalls: HIGH — schema gap (#5) verified by reading SQL migration; async-in-transaction (#2) is a known op-sqlite constraint
- Open questions: MEDIUM — recommended resolutions are opinions, not verified decisions

**Research date:** 2026-06-22
**Valid until:** 2026-07-22 (stable codebase, no fast-moving dependencies)
