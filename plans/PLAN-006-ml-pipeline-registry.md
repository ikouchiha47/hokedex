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
- Adding a new category requires only: new model specs + new pipeline class + one registration line
- `HokedexMLModule` is a thin dispatcher with no category-specific logic

---

## Type Hierarchy

```kotlin
sealed class MLResult

sealed class DetectionResult : MLResult() {
    object NoSubject : DetectionResult()
    data class MultiSubject(val crops: List<BoundingBox>) : DetectionResult()
    data class LowConfidence(val crop: BoundingBox, val confidence: Float) : DetectionResult()
    data class Success(val crop: BoundingBox) : DetectionResult()
}

data class TextResult(
    val fullText: String,
    val blocks: List<TextBlock>,
) : MLResult()
```

---

## Pipeline Interface Hierarchy

```kotlin
interface MLPipeline<out R : MLResult> {
    fun detect(context: Context, imageUri: String): R
    fun close()
}

interface EmbeddablePipeline<out R : MLResult> : MLPipeline<R> {
    fun embed(context: Context, imageUri: String): FloatArray
    fun embedCrop(context: Context, imageUri: String, x: Float, y: Float, width: Float, height: Float): FloatArray
}

PeoplePipeline : EmbeddablePipeline<DetectionResult>
OcrPipeline    : MLPipeline<TextResult>
```

---

## Registry

```kotlin
object MLRegistry {
    private val factories = mutableMapOf<String, () -> MLPipeline<*>>()
    private val instances = mutableMapOf<String, MLPipeline<*>>()

    fun <R : MLResult> register(categoryId: String, factory: () -> MLPipeline<R>)

    @Suppress("UNCHECKED_CAST")
    fun <R : MLResult> get(categoryId: String): MLPipeline<R>?

    fun closeAll()
}
```

Pipelines are constructed lazily on first `get()` — safe if models haven't been downloaded yet.

`HokedexMLModule` guards `embed`/`embedCrop` calls:
```kotlin
val pipeline = MLRegistry.get<MLResult>(categoryId) ?: // reject NOT_SUPPORTED
if (pipeline !is EmbeddablePipeline) // reject NOT_SUPPORTED
```

---

## Architecture Diagram

```
MLResult (sealed)
├── DetectionResult (sealed)
│   ├── NoSubject
│   ├── MultiSubject
│   ├── LowConfidence
│   └── Success
└── TextResult

MLPipeline<R : MLResult>
└── EmbeddablePipeline<R : MLResult>

MLRegistry
├── PeoplePipeline : EmbeddablePipeline<DetectionResult>
└── OcrPipeline    : MLPipeline<TextResult>
```

---

## File Inventory

### New files

| File | Purpose |
|------|---------|
| `MLResult.kt` | `MLResult` sealed class + `DetectionResult` + `TextResult` + `TextBlock` + `TextLine` — single type hierarchy file |
| `MLPipeline.kt` | `MLPipeline<R>` interface |
| `EmbeddablePipeline.kt` | `EmbeddablePipeline<R> : MLPipeline<R>` interface |
| `MLRegistry.kt` | Lazy-factory singleton |
| `PeoplePipeline.kt` | Implements `EmbeddablePipeline<DetectionResult>` |

### Modified files

| File | Change |
|------|--------|
| `DetectionTypes.kt` | Removed — types move to `MLResult.kt` |
| `ModelManager.kt` | `MODEL_SPECS` keyed by categoryId, `downloadModels(categoryId)` overload |
| `HokedexMLModule.kt` | Registry dispatch; `embed`/`embedCrop` guard on `EmbeddablePipeline` |

### Deleted files

| File | Reason |
|------|--------|
| `FaceDetector.kt` | Absorbed into `PeoplePipeline` |
| `FaceEmbedder.kt` | Absorbed into `PeoplePipeline` |
| `DetectionTypes.kt` | Replaced by `MLResult.kt` |

### Kept files

| File | Why |
|------|-----|
| `FaceDetectionStrategy.kt` | Backend-swap interface used inside `PeoplePipeline` |
| `MediaPipeDetector.kt` | Default `FaceDetectionStrategy` impl |
| `MLKitDetector.kt` | Alternate strategy, swap-in ready |

---

## Adding a New Category (Future Reference)

1. Add model specs to `MODEL_SPECS` under new key (if TFLite-based)
2. Write `LandscapePipeline : EmbeddablePipeline<DetectionResult>` (or `MLPipeline<TextResult>` for OCR-like)
3. `MLRegistry.register("landscape") { LandscapePipeline(reactContext) }`
4. Done
