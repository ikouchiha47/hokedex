# PLAN-006: ML Pipeline Registry

## Problem

`blaze_face_full_range.tflite` is loaded twice into separate `MediaPipeFaceDetector` instances:

1. `FaceDetector` → `MediaPipeDetector` constructor loads it
2. `FaceEmbedder.init` → loads it again independently for pre-crop

Both are held as `lazy` vals in `HokedexMLModule`. When `embed` is called, both `detector` and `embedder` are alive with duplicate model buffers in memory.

The current structure also has no room for new categories (landscape, scene, etc.) — `HokedexMLModule` hardcodes `if (categoryId != "people")` guards and directly instantiates `FaceDetector` / `FaceEmbedder`.

---

## Goal

A category-scoped pipeline architecture where:
- Each model is loaded **once** per runtime lifetime
- Adding a new category (landscape, scene, etc.) requires only: new model specs + new pipeline class + one registration line
- `HokedexMLModule` is a thin dispatcher with no category-specific logic

---

## Architecture

```
MLRegistry (object)
├── register(categoryId, pipeline)
├── get(categoryId): MLPipeline?
└── closeAll()

MLPipeline (interface)
├── detect(context, imageUri): DetectionResult
├── embed(context, imageUri): FloatArray
├── embedCrop(context, imageUri, x, y, w, h): FloatArray
└── close()

PeoplePipeline : MLPipeline
├── detector: MediaPipeFaceDetector   ← single instance, shared between detect + embedCrop
└── interpreter: TFLite Interpreter   ← facenet_512.tflite

LandscapePipeline : MLPipeline        ← future
ScenePipeline : MLPipeline            ← future
```

### Why shared detector inside PeoplePipeline

`FaceEmbedder` currently creates its own `MediaPipeFaceDetector` to crop faces before running FaceNet. By merging all people-specific logic into `PeoplePipeline`, the single pipeline constructor creates the detector once and passes the same instance to both the `detect()` and `embedCrop()` code paths. No registry-level sharing needed — the pipeline boundary is the right scope.

---

## File Inventory

### New files

| File | Purpose |
|------|---------|
| `MLPipeline.kt` | Interface: `detect`, `embed`, `embedCrop`, `close` |
| `MLRegistry.kt` | `object` singleton — `register`, `get`, `closeAll` |
| `PeoplePipeline.kt` | Merges `FaceDetector` + `FaceEmbedder`; owns shared detector + interpreter |

### Modified files

| File | Change |
|------|--------|
| `ModelManager.kt` | Model specs keyed by `categoryId` (`Map<String, List<ModelSpec>>`). Add `modelsReady(categoryId)` and `downloadModels(categoryId, ...)` overloads alongside the existing all-models variants |
| `HokedexMLModule.kt` | Replace `detector`/`embedder` lazy vals + `people` guards with `MLRegistry.get(categoryId)` dispatch. Init: `MLRegistry.register("people", PeoplePipeline(reactContext))` |

### Deleted files

| File | Reason |
|------|--------|
| `FaceDetector.kt` | Logic absorbed into `PeoplePipeline` |
| `FaceEmbedder.kt` | Logic absorbed into `PeoplePipeline` |

### Unchanged files

| File | Why kept |
|------|---------|
| `FaceDetectionStrategy.kt` | Still useful for MediaPipe/MLKit swap inside `PeoplePipeline` |
| `DetectionTypes.kt` | `BoundingBox`, `DetectionResult` — shared types, no change |
| `MediaPipeDetector.kt` | `PeoplePipeline` uses it as the `FaceDetectionStrategy` impl |
| `MLKitDetector.kt` | Alternative strategy, untouched |
| `ModelManager.kt` (download logic) | Only the spec structure changes, download mechanics stay |
| `ModelDownloadWorker.kt` | Unchanged |

---

## Interface Contracts

### `MLPipeline.kt`
```kotlin
interface MLPipeline {
    fun detect(context: Context, imageUri: String): DetectionResult
    fun embed(context: Context, imageUri: String): FloatArray
    fun embedCrop(context: Context, imageUri: String, x: Float, y: Float, width: Float, height: Float): FloatArray
    fun close()
}
```

### `MLRegistry.kt`
```kotlin
object MLRegistry {
    fun register(categoryId: String, pipeline: MLPipeline)
    fun get(categoryId: String): MLPipeline?   // null = category not supported
    fun closeAll()
}
```

### `ModelManager` category-scoped spec map
```kotlin
val MODEL_SPECS: Map<String, List<ModelSpec>> = mapOf(
    "people" to listOf(
        ModelSpec("blaze_face_full_range.tflite", url = "..."),
        ModelSpec("facenet_512.tflite",           url = "..."),
    ),
    // "landscape" to listOf(...),
)

fun modelsReady(context: Context, categoryId: String): Boolean
fun downloadModels(context: Context, categoryId: String, onProgress, onDone, onError)
// existing all-models variants kept for backward compat during transition
```

### `HokedexMLModule` dispatch pattern (after)
```kotlin
// init (lazy, on first call)
MLRegistry.register("people", PeoplePipeline(reactContext))

// detect / embed / embedCrop all follow this pattern:
val pipeline = MLRegistry.get(categoryId)
    ?: return promise.reject("NOT_SUPPORTED", "No pipeline for '$categoryId'")
executor.execute {
    try { promise.resolve(pipeline.detect(context, imageUri).toWritableMap()) }
    catch (e: Exception) { promise.reject("DETECTION_ERROR", e.message, e) }
}
```

---

## Adding a New Category (Future Reference)

1. Add model specs to `MODEL_SPECS` in `ModelManager.kt` under the new key
2. Write `LandscapePipeline : MLPipeline` (or `ScenePipeline`, etc.)
3. In `HokedexMLModule`, add one line: `MLRegistry.register("landscape", LandscapePipeline(reactContext))`
4. Done — no other files change

---

## Execution Order

All work is in `android/app/src/main/java/com/hokedex/ml/`. No JS, DB, migrations, or UI changes.

1. `MLPipeline.kt` — new interface (no dependencies)
2. `MLRegistry.kt` — new singleton (depends on `MLPipeline`)
3. `ModelManager.kt` — add category-keyed spec map + overloads (no dependencies on new files)
4. `PeoplePipeline.kt` — implement `MLPipeline`; absorb `FaceDetector` + `FaceEmbedder` (depends on `MLPipeline`, `ModelManager`, `MediaPipeDetector`)
5. `HokedexMLModule.kt` — wire `MLRegistry` + `PeoplePipeline`; remove old lazy vals
6. Delete `FaceDetector.kt`, `FaceEmbedder.kt`

Steps 1–3 have no inter-dependencies and can be written in parallel. Step 4 requires all three. Steps 5–6 require step 4.
