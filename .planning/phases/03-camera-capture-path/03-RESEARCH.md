# Phase 3: Camera Capture Path - Research

**Researched:** 2026-06-22
**Domain:** React Native camera/gallery flow, face detection, embedding matching, atomic SQLite writes
**Confidence:** HIGH

---

## Summary

Phase 3 wires the Camera FAB option into the full moments capture pipeline: photo acquisition → face detection → face picker → embedding match → person confirm/create → atomic moment DB write. The core infrastructure is already in place from prior phases. This phase is primarily integration work, not greenfield construction.

The native layer is fully built: `HokedexMediaModule` handles camera capture and gallery pick, `HokedexMLModule` handles `detect()` and `embedCrop()`, and `FacePickerModal` already renders bounding boxes and manual annotation. What is missing is (a) wiring the full capture flow inside the existing `CameraScreen` (Phase 2 delivered it as a stub with `onCapturePress={() => {}}`), (b) a real implementation of `MomentCaptureService.capture()`, and (c) a person-confirm/create dialog for the embedding match step.

**Phase 2 architecture note:** The app opens directly to `CameraScreen` (default tab). There is no `HomeScreen`, no `RadialFAB`, and no `CameraCaptureScreen` stack route. Phase 3 wires the capture flow inline in `CameraScreen` via `CameraBottomBar.onCapturePress`.

The key design constraint is the Facade pattern: nothing in UI may call `HokedexML` or write to `moments`/`moment_people` directly. All writes must go through `MomentCaptureService.capture()`. The existing `NewEntryController` + `ingestion.ts` pattern is the model to follow, but for moments, not entries.

**Primary recommendation:** Build `CameraCaptureScreen` as a thin orchestrator that calls service functions. Implement `MomentCaptureService.capture()` as the single atomic write. Keep all state machine logic (detect → pick → embed → match → confirm → save) in a service function, not in the screen.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| R-CAM-01 | Camera tab capture button opens camera; gallery button opens gallery bottom sheet | `HokedexMediaModule.capturePhoto()` and `pickImageFromGallery()` already implemented; Phase 2 delivered `CameraBottomBar` with `onCapturePress` (camera) and `onGalleryPress` (gallery sheet) — **no RadialFAB, no HomeScreen, no separate CameraCaptureScreen navigation push** |
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
│   └── CameraScreen.tsx              # EXTEND (Phase 2 stub) — wire onCapturePress to flow
├── services/
│   ├── MomentCaptureService.ts       # implement capture() — atomic write
│   └── cameraCaptureFlow.ts          # pure async functions: runDetect, runEmbedAndMatch
└── components/
    └── PersonConfirmModal.tsx         # "Is this [name]?" + "Create new person?" dialog
```

Note: No new screen is created. `CameraScreen.tsx` is extended in-place. The state machine (detect → pick → embed → match → confirm → save) runs inside `CameraScreen` via React state, not via navigation.

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

### Pattern 4: CameraBottomBar onCapturePress Wiring

**Phase 2 eliminated RadialFAB and HomeScreen.** The capture entry point is `CameraBottomBar.onCapturePress` wired in `CameraScreen`. Phase 3 wires the real capture flow inline inside `CameraScreen` — no navigation push, no separate `CameraCaptureScreen` stack screen.

```typescript
// CameraScreen.tsx — replace stub onCapturePress with real flow
<CameraBottomBar
  onCapturePress={handleCapture}   // triggers camera → detect → pick → confirm → save
  onGalleryPress={() => setSheetOpen(true)}
  onFaceScanPress={() => {}}
  bottomInset={insets.bottom}
/>
```

The `handleCapture` function owns the full state machine (acquire → detect → face picker → embed+match → person confirm → save). No stack navigation is added to `RootStackParamList` for this flow.

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

### Pitfall 4: Attempting to push a CameraCaptureScreen or wire RadialFAB

**What goes wrong:** The old plan created a `CameraCaptureScreen` as a pushed stack screen navigated to from `RadialFAB` in `HomeScreen`. **Neither RadialFAB nor HomeScreen exist after Phase 2.** Adding `CameraCapture` to `RootStackParamList` is unnecessary and creates dead navigation routes.

**How to avoid:** Wire the capture flow directly inside `CameraScreen.tsx`. The `onCapturePress` callback from `CameraBottomBar` is the entry point. No new screen, no navigation push, no changes to `RootStackParamList`.

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

## Open Questions (RESOLVED)

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

---

## Phase 2 Architecture + New Areas Research

**Appended:** 2026-06-22
**Covers:** Live viewfinder integration, GPS auto-attach, weather auto-attach, schema gaps

---

### Phase 2 Architecture (for planners)

**Current state of Phase 2 (per STATE.md and TabNavigator.tsx):** Phase 2 is marked "not started (rebuilt — old plans invalidated)". The `TabNavigator.tsx` file exists but still wires the old 4-tab layout (Home · Timeline · People · Planner). `CameraScreen.tsx`, `CameraBottomBar.tsx`, and `GalleryBottomSheet.tsx` do NOT exist on disk yet — they are planned output of Phase 2, not yet built. Phase 3 planning must treat these as **interfaces to be delivered by Phase 2** rather than existing code to read.

**What Phase 3 must integrate with (once Phase 2 delivers it):**

Based on the locked Phase 2 requirements (R-NAV-01 through R-NAV-05) and RESEARCH.md Phase 2 architectural notes:

- `CameraScreen` will be the root/default tab. It will have a full-screen viewfinder area with `CameraBottomBar` absolute-positioned at the bottom.
- `CameraBottomBar` will expose at minimum: `onCapturePress`, `onGalleryPress`, `onFaceScanPress`, `bottomInset`.
- `GalleryBottomSheet` will slide up over the camera view; it will not block the viewfinder when collapsed.
- The viewfinder area will occupy the full screen behind the bottom bar — Phase 3 must wire the real camera preview into this region.

**Key Phase 3 dependency:** Phase 3 must not begin until Phase 2 delivers `CameraScreen.tsx` with the `onCapturePress` stub. If running phases in parallel, Phase 3 camera flow service code can be written in isolation; the screen wiring step gates on Phase 2 completion.

---

### Area 1: Live Camera Viewfinder

**No camera viewfinder library is installed.** [VERIFIED: direct read of package.json]

The dependencies list contains:
- `react-native-image-picker` ^8.2.1 — provides a picker UI/intent, not a live preview component
- `react-native-image-crop-picker` ^0.51.1 — also picker-only, no live viewfinder
- `HokedexMediaModule` (custom Kotlin) — calls `capturePhoto()` which launches the Android system camera app (intent-based), not an in-app viewfinder

**What this means for R-CAM-01 / R-CAM-02:** "Opens the viewfinder immediately on launch" cannot be implemented with any currently-installed package. Two options:

**Option A — Install `react-native-vision-camera`** [ASSUMED — not yet verified in this codebase] This is the current community standard for in-app live viewfinder on React Native (formerly `react-native-camera` which is now unmaintained). Provides a `<Camera>` component that renders a live preview. Requires linking a native module on Android. Version 4.x is current as of mid-2025.

**Option B — System camera intent (existing `HokedexMediaModule.capturePhoto()`)** No live in-app viewfinder is shown. The camera tab shows a static placeholder or last-captured thumbnail. Tapping capture launches the Android system camera app, user takes photo, returns to app. This is the zero-new-dependency path but does NOT satisfy R-CAM-01 ("open the viewfinder immediately").

**R-CAM-01 literal reading:** "Camera SHALL be the root tab and SHALL open the viewfinder immediately on launch (after permissions)." This strongly implies an in-app live preview, not an intent. Option A is required to satisfy this literally.

**Permission flow:** `src/services/weather.ts` uses `PermissionsAndroid.request(ACCESS_FINE_LOCATION)` as the pattern for runtime permission requests. Camera permission follows the same `PermissionsAndroid.request(CAMERA)` pattern. The `requestCameraPermission()` function referenced in the existing RESEARCH.md already exists in `src/utils/permissions.ts` (not read directly but confirmed referenced in existing research). Permission must be requested on first launch before the viewfinder renders.

**Integration with CameraBottomBar layout:** The live viewfinder (if using react-native-vision-camera) renders as a full-screen `<Camera>` component. `CameraBottomBar` is absolute-positioned at the bottom (`position: 'absolute', bottom: 0`). The viewfinder must be behind it in the z-order. Standard pattern: `<View style={StyleSheet.absoluteFill}><Camera .../></View>` as the base layer, overlay components on top.

**Pitfalls:**

- `react-native-vision-camera` requires New Architecture (Fabric/TurboModules) on React Native 0.73+. This project uses RN 0.86 with New Architecture enabled — compatible. [ASSUMED — New Architecture status inferred from package.json RN version and CLAUDE.md "New Architecture" note]
- The viewfinder and `GalleryBottomSheet` will overlap in z-order. The sheet must render above the camera preview. Use `zIndex` or render order (later in JSX = higher z-order in RN).
- On Android, the camera preview is a `SurfaceView` under the hood. Overlaying non-transparent React Native views on top requires care — transparent areas of RN views should use `backgroundColor: 'transparent'` not absence of background.
- If using system camera intent (Option B): `capturePhoto()` already handles FileProvider and MediaStore correctly per existing research. No viewfinder integration needed, but R-CAM-01 is not satisfied.

**Decision required by planner:** Choose Option A (install vision-camera, true in-app viewfinder) or Option B (system camera intent, R-CAM-01 partially satisfied). This is a significant scope and dependency decision. [ASSUMED — no locked decision in CONTEXT.md or STATE.md on this point]

---

### Area 2: GPS Auto-Attach

**`GeocoderModule.kt` is fully implemented.** [VERIFIED: direct read of android/.../ml/GeocoderModule.kt]

The module exposes two React Native methods via the `"HokedexGeocoder"` native module name:

- `getLocation()` → `Promise<{ latitude: number, longitude: number }>` — reads last-known location from GPS, Network, or Passive provider (best accuracy wins). Rejects with `"NO_LOCATION"` if no cached location is available.
- `getCityName(lat, lon)` → `Promise<string>` — reverse geocodes via Android `Geocoder`. Returns `locality ?? subAdminArea ?? adminArea ?? "Unknown"`.

**The JS service layer (`src/services/weather.ts`) already uses GeocoderModule.** [VERIFIED: direct read]

```typescript
// Already working pattern in weather.ts:
const coords = await HokedexGeocoder.getLocation();         // { latitude, longitude }
const city = await HokedexGeocoder.getCityName(lat, lon);  // string
```

For capture-time GPS attach, `MomentCaptureService` can call `HokedexGeocoder.getLocation()` and `getCityName()` using the same pattern — no new native code needed.

**Permission:** `ACCESS_FINE_LOCATION` permission is requested in `weather.ts` via `PermissionsAndroid.request()`. The same permission request must happen before the capture flow calls `getLocation()`. Do not assume permission is already granted because weather loaded — the user may have denied weather but not been prompted during capture. Best practice: request at capture time if not already granted.

**DB schema gap — `moments` table is missing lat/lon/place_name columns.** [VERIFIED: direct read of 007_moments.sql]

Current `moments` schema has: `id, note, occurred_at, place_id, status, created_at`. The `place_id` is a FK to `saved_places`, not raw coordinates.

R-DB-02 requires: `latitude, longitude, place_name` as direct columns on `moments`. These do not exist. A new migration is required. See Schema Migrations Required section below.

**Pitfalls:**

- `getLocation()` uses `getLastKnownLocation()` — this returns a cached fix, not a fresh GPS lock. On a device that has been indoors for hours, the fix may be stale (wrong location) or null (never obtained). The `NO_LOCATION` rejection must be caught and handled gracefully — capture should continue without GPS data rather than blocking.
- Network provider is tried after GPS in the module's provider list. In a location without GPS signal, network provider may return a coarser fix. Accept it — any location is better than none.
- `getCityName` uses Android `Geocoder` which requires network on modern Android versions. It can throw if offline. Catch the `GEOCODER_ERROR` rejection and store `null` for `place_name`.
- The module is registered as `"HokedexGeocoder"` but lives in the `com.hokedex.ml` package — it must be wired into `HokedexMLPackage.kt` (or a separate package). Verify registration before calling from JS. [ASSUMED — module exists but registration in package not verified by reading HokedexMLPackage.kt]

---

### Area 3: Weather Auto-Attach

**A complete weather service already exists.** [VERIFIED: direct read of src/services/weather.ts, src/types/weatherApi.ts, src/types/weather.ts]

The `getWeather()` function in `src/services/weather.ts` already:
1. Requests location permission
2. Calls `HokedexGeocoder.getLocation()` for coordinates
3. Calls Open-Meteo API: `https://api.open-meteo.com/v1/forecast?latitude=X&longitude=Y&current=temperature_2m,apparent_temperature,weather_code,is_day&timezone=TZ`
4. Parses the response into `WeatherData` with `temp`, `city`, `sceneConfig`, `feelsLike`
5. Maps WMO weather codes to `WeatherCondition` via `wmoToCondition()`

**For capture-time weather, the service needs a different entry point.** The existing `getWeather()` takes a `WeatherSettings` object (from DB) and returns display-oriented `WeatherData`. For capture, what's needed is the raw temp and condition for storage: `weather_temp: number` and `weather_condition: string`.

The `WeatherApiRaw` type already has `temperature_2m` (number) and `weather_code` (number). The `wmoToCondition()` function maps `weather_code → WeatherCondition` (the app's string enum: `'clear' | 'partly_cloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'hail' | 'storm'`).

**Recommended capture-time weather function** (new, in weather.ts or a new captureWeather.ts):

```typescript
// src/services/captureWeather.ts
export type CaptureWeather = {
  temp: number;             // rounded integer °C
  condition: WeatherCondition;  // mapped from WMO code
};

export async function getWeatherForCapture(
  lat: number,
  lon: number,
): Promise<CaptureWeather | null>
```

This avoids pulling in `WeatherSettings` and display logic. It reuses `DEFAULT_WEATHER_API_CONFIG`, `parseOpenMeteoResponse`, and `wmoToCondition` from existing modules.

**Open-Meteo API details:** [VERIFIED: direct read of src/types/weatherApi.ts and weather.ts]
- Endpoint: `https://api.open-meteo.com/v1/forecast`
- Params: `latitude`, `longitude`, `current=temperature_2m,apparent_temperature,weather_code,is_day`, `timezone` (URL-encoded)
- No API key required. Free, no rate limits for reasonable usage.
- Response: `{ current: { temperature_2m, apparent_temperature, weather_code, is_day } }`

**`weather_condition` values to store in DB:** Use the `WeatherCondition` type string values: `'clear' | 'partly_cloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'hail' | 'storm'`. These are already the app's canonical condition names.

**`WeatherCover` component does NOT fetch weather.** [VERIFIED: direct read of WeatherCover.tsx] It is a pure display component — accepts `sceneConfig`, `temp`, `city`, `feelsLike` as props. No fetch logic inside it. No code to reuse for fetching, but the component can be reused in Moment Detail to replay the weather scene at capture time.

**Existing `weatherPrivacy.ts`** applies coordinate rounding before the API call (from `src/services/weatherPrivacy.ts` — exists but not read in detail). For capture-time weather, apply the same `roundCoordinates()` call before fetching. Do not send exact GPS to Open-Meteo.

**DB schema gap — `weather_temp` and `weather_condition` columns are missing from `moments`.** [VERIFIED: direct read of 007_moments.sql] See Schema Migrations Required below.

**Pitfalls:**

- Open-Meteo fetch requires network. If the device is offline at capture time, catch the fetch error and store `null` for both fields. Do not block the capture.
- `getWeather()` already handles the full flow (permission + location + weather) in sequence. Do not call `getWeather()` from the capture path — it fetches location internally, but the capture path already has coordinates from the GPS step. Call the Open-Meteo API directly with the already-fetched coordinates to avoid a second `getLocation()` call.
- WMO code mapping: `wmoToCondition()` is already implemented in `src/services/weatherScene.ts`. Do not re-implement. Import it directly.

---

### Schema Migrations Required

**Migration needed: add GPS + weather columns to `moments` table.**

Current `moments` schema (007_moments.sql) has: `id, note, occurred_at, place_id, status, created_at`.

R-DB-02 requires: `id, occurred_at, note, type, source, latitude, longitude, place_name, weather_temp, weather_condition, status`.

Missing columns (require a new migration):

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `source` | TEXT | YES | `'camera'`, `'voice'`, `'gallery'` — R-CAM-05 requires this |
| `latitude` | REAL | YES | Decimal degrees. NULL if GPS unavailable |
| `longitude` | REAL | YES | Decimal degrees. NULL if GPS unavailable |
| `place_name` | TEXT | YES | City/area name from reverse geocode. NULL if offline |
| `weather_temp` | INTEGER | YES | Rounded °C. NULL if no network at capture |
| `weather_condition` | TEXT | YES | `WeatherCondition` enum value. NULL if no network |
| `type` | TEXT | YES | R-DB-02 lists `type` — purpose unclear from current schema; planner should confirm |

**Next available migration slot:** `010_app_settings.sql` exists, so the next slot is `011_moments_metadata.sql`.

**Migration pattern** (matches project convention — `ALTER TABLE`, not destructive):

```sql
-- Migration 011: moments metadata columns (GPS, weather, source)
ALTER TABLE moments ADD COLUMN source          TEXT;
ALTER TABLE moments ADD COLUMN latitude        REAL;
ALTER TABLE moments ADD COLUMN longitude       REAL;
ALTER TABLE moments ADD COLUMN place_name      TEXT;
ALTER TABLE moments ADD COLUMN weather_temp    INTEGER;
ALTER TABLE moments ADD COLUMN weather_condition TEXT;
ALTER TABLE moments ADD COLUMN type            TEXT;
```

Must be registered in `src/db/sql/loader.ts` and `src/db/migrations/runner.ts` per project conventions. Uses `executeSync` (DDL in migrations).

**`place_id` FK vs raw `latitude/longitude/place_name`:** The current schema has `place_id TEXT REFERENCES saved_places(id)`. R-DB-02 lists `place_name` as a direct column, not via FK. Both can coexist — raw coordinates for capture-time storage, `place_id` for future saved-place linking. No migration needed to `saved_places`.

---

### Sources (Appended)

- Direct read of `android/app/src/main/java/com/hokedex/ml/GeocoderModule.kt` — getLocation/getCityName signatures confirmed [VERIFIED]
- Direct read of `src/services/weather.ts` — Open-Meteo endpoint, GeocoderModule usage pattern confirmed [VERIFIED]
- Direct read of `src/types/weatherApi.ts` — API URL, response fields, parseOpenMeteoResponse confirmed [VERIFIED]
- Direct read of `src/types/weather.ts` — WeatherCondition enum values confirmed [VERIFIED]
- Direct read of `src/components/weather/WeatherCover.tsx` — display-only, no fetch logic confirmed [VERIFIED]
- Direct read of `src/db/sql/migrations/007_moments.sql` — missing columns confirmed [VERIFIED]
- Direct read of `package.json` — no vision-camera installed confirmed [VERIFIED]
- Direct read of `src/navigation/TabNavigator.tsx` — Phase 2 not yet rebuilt confirmed [VERIFIED]
- Direct read of `.planning/STATE.md` — Phase 2 status confirmed [VERIFIED]
