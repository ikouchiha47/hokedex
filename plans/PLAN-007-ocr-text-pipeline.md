# PLAN-007: OCR Text Pipeline

## Context

OCR fits into the same `MLRegistry` as vision pipelines via `MLPipeline<TextResult>`. It does not implement `EmbeddablePipeline` — there is no embedding operation for text. `TextResult` is part of the `MLResult` sealed hierarchy defined in PLAN-006.

---

## Architecture

```
OcrPipeline : MLPipeline<TextResult>
└── strategy: TextRecognitionStrategy

TextRecognitionStrategy (interface)
├── recognise(context, imageUri): TextResult
└── close()

MLKitTextRecognizer : TextRecognitionStrategy
└── MLKit v2, Latin + Devanagari scripts bundled
```

`OcrPipeline.detect()` delegates to `strategy.recognise()` and returns `TextResult`.

---

## Types (live in `MLResult.kt` alongside `DetectionResult`)

```kotlin
data class TextLine(
    val text: String,
    val boundingBox: BoundingBox,
    val confidence: Float,
)

data class TextBlock(
    val text: String,
    val boundingBox: BoundingBox,
    val script: String?,       // "Latin", "Devanagari" etc — from MLKit v2
    val lines: List<TextLine>,
)

data class TextResult(
    val fullText: String,
    val blocks: List<TextBlock>,
) : MLResult()
```

---

## File Inventory

### New files

| File | Purpose |
|------|---------|
| `TextRecognitionStrategy.kt` | Interface: `recognise(context, imageUri): TextResult`, `close()` |
| `MLKitTextRecognizer.kt` | Implements strategy using MLKit v2, Latin + Devanagari |
| `OcrPipeline.kt` | `MLPipeline<TextResult>`, holds `TextRecognitionStrategy` |

### Modified files

| File | Change |
|------|--------|
| `MLResult.kt` | Add `TextLine`, `TextBlock`, `TextResult` (already planned in PLAN-006) |
| `HokedexMLModule.kt` | `MLRegistry.register("ocr") { OcrPipeline(reactContext) }` in `init`. `recognise` is just `detect()` via registry — no new `@ReactMethod` needed since `detect` already dispatches by categoryId and returns `MLResult` serialized to `WritableMap` |
| `android/app/build.gradle` | Add MLKit text recognition dependencies |

### build.gradle additions

```groovy
implementation 'com.google.android.gms:play-services-mlkit-text-recognition'
implementation 'com.google.android.gms:play-services-mlkit-text-recognition-devanagari'
```

---

## JS-side API

No new native method needed. `detect(imageUri, 'ocr')` returns a `WritableMap` shaped as:

```ts
{
  type: 'TEXT_RESULT',
  fullText: string,
  blocks: [{
    text: string,
    boundingBox: { x, y, width, height },
    script: string | null,
    lines: [{ text: string, boundingBox, confidence: number }]
  }]
}
```

`DetectionResult` maps get `type: 'SUCCESS' | 'NO_SUBJECT'` etc as before. The JS side discriminates on `type`.

---

## TS Service Layer

`src/services/TextLayoutAnalyser.ts` — pure functions, no RN/native dependency:

| Function | Input | Output |
|----------|-------|--------|
| `sortByReadingOrder` | `TextBlock[]` | `TextBlock[]` sorted top→bottom, left→right |
| `groupByProximity` | `TextBlock[], threshold` | `TextBlock[][]` spatially clustered |
| `dominantText` | `TextBlock[]` | `TextBlock` with largest bounding box area |
| `extractColumns` | `TextBlock[]` | `TextBlock[][]` grouped by shared x-range |

---

## Swapping MLKit for TFLite Later

1. Write `TFLiteTextRecognizer : TextRecognitionStrategy`
2. Add model spec to `MODEL_SPECS["ocr"]` in `ModelManager`
3. Change `OcrPipeline` constructor default — nothing else changes

---

## Execution Order

1. `MLResult.kt` — add `TextLine`, `TextBlock`, `TextResult` (extends PLAN-006 work)
2. `TextRecognitionStrategy.kt` — interface
3. `MLKitTextRecognizer.kt` — implementation
4. `OcrPipeline.kt` — pipeline
5. `HokedexMLModule.kt` — register `"ocr"`, update `toWritableMap` to handle `TextResult`
6. `build.gradle` — MLKit dependencies
7. `TextLayoutAnalyser.ts` — TS service layer
