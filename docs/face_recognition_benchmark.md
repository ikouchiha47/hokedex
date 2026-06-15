# Face Recognition Benchmark — June 2026

## Problem

Search only matched the exact same image. Different photos of the same person scored too low to cross the similarity threshold.

## Test Images

All four images are the same person.

| Key | File | Description |
|---|---|---|
| blue_hair | IMG_20260611_001224001.jpg | Blue hair, glasses, pink room |
| yellow_hair | IMG_20260514_191227888.jpg | Yellow hair, glasses, indoor warm light |
| green_kurta | Screenshot_20260420-143844.png | Green kurta, flower backdrop, yellow light |
| full_body | Screenshot_20260420-143824.png | Full body standing shot, green shirt |

## Root Cause 1 — Thresholds Too High

The `categories` table was seeded with:
- `similarity_threshold_likely = 0.95`
- `similarity_threshold_possible = 0.85`

For ArcFace/MobileFaceNet cosine similarity, same-person different photos typically score 0.40–0.75. Only the exact same image scores 0.95+. Fixed to `0.55 / 0.35`, applied on every app launch via `updateCategoryThresholds()` in `initDatabase()`.

## Root Cause 2 — No Letterbox Padding Before Embedding

`FaceEmbedder.kt` was doing:
```kotlin
val scaled = Bitmap.createScaledBitmap(raw, 160, 160, true)
```

This squashes the face to 160×160 regardless of aspect ratio, distorting facial geometry before the model sees it. FaceNet expects a face that fills the frame at natural proportions, padded if necessary.

The correct pipeline:
1. Detect face with landmark alignment
2. Crop the detected region
3. **Letterbox-pad** to 160×160 with neutral gray (128,128,128) — scale to fit, fill remainder with gray
4. Normalise pixels to [-1, 1]
5. Run inference

## Model Comparison

Tested with Python / DeepFace / RetinaFace detector on raw images (no preprocessing fix):

| Model | blue vs yellow (SAME) | green vs full_body (SAME) | blue vs green (DIFF) |
|---|---|---|---|
| ArcFace | ✓ MATCH (dist 0.39) | ✗ NO MATCH (dist 0.71) | ✗ NO MATCH |
| Facenet512 | ✗ NO MATCH (dist 0.39) | ✗ NO MATCH | ✗ NO MATCH |
| VGG-Face | ✓ MATCH (dist 0.46) | ✗ NO MATCH | ✓ MATCH (false positive) |

Amit's pair failed across all models on raw images because the full-body shot face is only 161×214px extracted — too small and unaligned.

## After Letterbox Padding Fix

Same test re-run with: detect → align → letterbox pad to 160×160 gray → embed (detector=skip on padded image):

| Model | blue vs yellow (SAME) | green kurta vs full body (SAME) | blue vs green kurta (SAME) |
|---|---|---|---|
| ArcFace | ✓ MATCH (dist 0.48, thresh 0.68) | ✓ MATCH (dist 0.67, thresh 0.68) | ✗ **FALSE NEGATIVE** (dist 0.70) |
| Facenet512 | ✗ NO MATCH | ✗ NO MATCH | ✗ NO MATCH |

**ArcFace with letterbox padding matches two of three same-person pairs.** The blue hair vs green kurta pair is a false negative — distance 0.70 just above the 0.68 threshold. This is caused by large appearance variation: different lighting, hair colour, and camera angle between the two images.

**Mitigation**: store multiple reference embeddings per person. The search uses `MIN(distance)` across all embeddings for an entry — more reference photos means more chances to match under varied conditions.

## Conclusion

- **Model**: ArcFace is correct. Facenet512's threshold of 0.30 is too tight for real-world variation.
- **Fix needed in `FaceEmbedder.kt`**: replace `createScaledBitmap` with detect → align → letterbox pad to 160×160 gray.
- **App thresholds**: `likely=0.55`, `possible=0.35` — correct for ArcFace cosine similarity.
- **Screenshot matching**: will always be lower quality due to small face size in frame. Encourage real photos.
