# ADR-001: Hokédex Local-First Face Search Architecture

## Status

Accepted

---

## Context

Hokédex is a mobile application that allows users to maintain a private catalog of people and quickly determine whether a person already exists in their collection by sharing or importing an image.

Primary workflow:

1. User shares a screenshot, photo, or image into Hokédex.
2. App extracts a face from the image.
3. App searches the local database for similar faces.
4. User is presented with:

   * Likely Match
   * Possible Matches
   * Create New Entry
5. User may attach additional photos to improve future matching accuracy.

Key requirements:

* Privacy-first
* Offline functionality
* Fast search
* No mandatory accounts
* No backend dependency
* Support multiple photos per person
* Support future import/export functionality

---

## Decision

Hokédex will adopt a local-first architecture.

All images, metadata, embeddings, notes, and search indexes will remain on-device by default.

Face recognition will be performed using:

```
Face Detection
    ↓
Face Embedding Generation
    ↓
Local Vector Similarity Search
```

No server-side face processing will be required for core functionality.

---

## Technology Choices

### Frontend

React Native

Reasoning:

* Cross-platform support
* Share Sheet integration
* Existing ecosystem
* Faster iteration speed

---

### Native ML Layer

Kotlin (Android)

Responsibilities:

* Face detection
* Embedding generation
* Vector search
* Image preprocessing

Reasoning:

* Better ML performance
* Direct access to Android APIs
* Avoid JS bridge bottlenecks for inference

Future:

```
Android → Kotlin
iOS → Swift
```

with a shared React Native interface.

---

### Face Detection

Selected:

* MediaPipe Face Detection

Alternatives Considered:

* YOLO
* RetinaFace

Decision Rationale:

YOLO is designed for object detection rather than identity matching.

The system only requires reliable face localization.

MediaPipe provides:

* Small model size
* Fast inference
* Mobile optimization

---

### Face Embedding Model

Selected:

* MobileFaceNet with ArcFace-compatible 512-dimensional float32 embeddings

Alternatives Considered:

* CLIP
* General-purpose image embeddings
* 128d MobileFaceNet variants

Decision Rationale:

Identity recognition requires face-specific embeddings.

Face embeddings provide significantly better accuracy than generic image embeddings.

512d is preferred over 128d because identity information is distributed across more dimensions, which provides better accuracy headroom — particularly if INT8 quantization is adopted later. This is a one-time model selection decision; changing dimensionality post-launch requires re-embedding the entire collection.

**Storage characteristics at 512d float32:**

```
512 dimensions × 4 bytes × 3,000 embeddings (1,000 persons × ~3 photos)
≈ 6MB
```

This is trivial at MVP scale. Storage becomes a consideration above approximately 10,000 persons with multiple photos each.

**Quantization:**

INT8 quantization (4× storage reduction, faster dot products) is a known future optimization. It is not an MVP concern. If adopted post-MVP, it requires a one-time background re-embedding migration across the entire collection. Accuracy impact has not been internally validated and must be benchmarked against a representative dataset before adoption.

---

### Storage

Selected:

SQLite via op-sqlite

Stores:

```
Persons
Photos
Embeddings
Tags
Notes
```

Reasoning:

* Embedded
* Offline
* Mature ecosystem
* Easy backup/export
* op-sqlite provides JSI-based synchronous access without JS bridge overhead
* op-sqlite has built-in sqlite-vec support for vector similarity search

**iOS note:** op-sqlite must compile SQLite from source on iOS. The system-embedded iOS SQLite cannot load extensions and must not be used.

---

### Vector Search

Selected:

op-sqlite + sqlite-vec, brute-force cosine similarity

Decision Rationale:

sqlite-vec runs on both Android and iOS and is explicitly supported by op-sqlite. Brute-force cosine similarity over all embeddings is acceptable for MVP scale and completes well under 500ms for collections of thousands of entries.

ANN indexing (e.g. HNSW) will be introduced when either of these conditions is met:

* Search latency exceeds 500ms on a mid-range device
* Collection exceeds 5,000 persons

Cosine similarity is the standard metric for ArcFace-style embeddings. L2 distance produces different threshold ranges and is not a drop-in substitute.

---

## Data Model

### Person

```
Person
------
id
name
notes
created_at
updated_at
```

### Photo

```
Photo
-----
id
person_id
local_path           ← path to original file on device; not a copy
is_profile_photo     ← boolean; the designated display image for listings and cards
embedding_id         ← nullable FK to Embedding; null if no face was detected
created_at
```

### Embedding

```
Embedding
---------
id
person_id
photo_id
vector               ← 512d float32
created_at

Index: (person_id, photo_id)   ← hot query path; required from day one
```

### Tag

```
Tag
---
id
name
```

### PersonTag

```
PersonTag
---------
person_id
tag_id
```

---

## Identity Model

Identity is represented by a Person.

Photos are supporting evidence.

Decision:

```
Person
 ├── Photo A (profile, has embedding)
 ├── Photo B (has embedding)
 ├── Photo C (reference only, no embedding)
 └── Embeddings (one per face-detected photo)
```

NOT

```
Photo
 └── Person
```

Reasoning:

People may have:

* Different hairstyles
* Different lighting
* Different ages
* Different camera quality

Multiple photos increase matching accuracy.

**A Person with zero embeddings is a valid state.** A person may be created with only reference photos (screenshots, logos, name cards, context images) where no face was detected. They appear in listings, are searchable by name and tag, but cannot be matched by face. This is intentional, not a degraded state.

Photos serve two distinct purposes:

```
Photo
 ├── Display purpose (always) — listing thumbnail, person card
 └── Matching purpose (sometimes) — source of embedding, only when face detected
```

These are independent concerns. A photo without an embedding is first-class.

---

## Embedding Aggregation Strategy

Each photo that contains a detected face produces one embedding. Multiple embeddings are stored per person.

**Decision: per-photo embeddings with max similarity aggregation at query time.**

At search time, cosine similarity is computed between the query embedding and every embedding in the database. For each person, their highest-scoring embedding is taken as their representative score.

```sql
SELECT person_id, MAX(similarity) AS best_score
FROM embeddings
-- vec_distance_cosine via sqlite-vec
GROUP BY person_id
ORDER BY best_score DESC
LIMIT 10
```

Rationale:

The correct identity question is: "does this face match *any* known photo of this person?" Max similarity answers this directly.

New photos added to a person improve matching immediately with no recomputation.

Query cost scales with total embedding count, not person count. At MVP scale this is acceptable.

**Centroid averaging was considered and rejected.** Averaging embeddings from varied photos (different lighting, age, hairstyle) produces a centroid that may not closely resemble any real photo, degrading accuracy. ArcFace-style embeddings do not average cleanly. The recomputation write path on every photo addition is also an unnecessary complexity for MVP.

---

## Face Detection States

The native ML layer must surface detection results as typed states, not binary success/fail. Three states are defined:

**`NO_FACE`**

No face found in the image.

UX: inform the user no face was detected. Offer the option to retry with a different crop. The image may still be saved to a person as a reference photo — no embedding will be generated.

**`MULTI_FACE`**

Multiple faces detected in the image.

UX: present all detected face crops as a selectable grid. The user taps the face they care about. Only the selected face proceeds to embedding generation and search. This is a first-class interaction, not an error — group photos and screenshots are common share-sheet inputs.

**`LOW_CONFIDENCE`**

A face was detected below the confidence threshold (default: 0.7).

UX: warn the user that matching accuracy may be reduced. Allow the user to proceed or discard. If the user proceeds, the embedding is generated and flagged.

---

## Share Sheet Workflow

```
Instagram
WhatsApp
Photos
Browser
Gallery
      ↓
Share
      ↓
Hokédex
      ↓
Face Detection
      ├── NO_FACE → save as reference photo (no embedding)
      ├── MULTI_FACE → face picker UI → selected face proceeds
      ├── LOW_CONFIDENCE → accuracy warning → user proceeds or discards
      └── SUCCESS → embedding generation → face search
```

The share sheet is considered a primary entry point.

---

## Matching Strategy

The system will not use binary matching.

Instead, cosine similarity scores are mapped to tiers:

```
Similarity Score (cosine)

>= 0.95
Likely Match

0.85 – 0.95
Possible Match

< 0.85
No Match → Create New Entry prompt
```

**These thresholds are placeholders.** They must be validated against a real evaluation dataset before shipping. Appropriate values vary by model variant, quantization level, and demographic distribution. The cosine similarity metric is specified here; L2-based thresholds are not equivalent and must not be substituted directly.

---

## Duplicate Prevention

If no likely match is found:

```
Top Candidate List

1. Sarah (91%)
2. Emily (88%)
3. Jessica (85%)

[Create New Person]
```

Users must explicitly confirm creation.

Reasoning:

Reduces duplicate entries.

---

## Privacy Model

Default policy:

* No cloud storage
* No account requirement
* No image upload
* No server-side processing

All matching occurs on-device.

**Image file handling:**

Hokédex stores the file path (`local_path`) to original images. It does not copy images into its own storage. The original file remains in its original location (camera roll, downloads, etc.) and belongs to the user.

If the file at `local_path` is moved or deleted externally, the app displays a placeholder gracefully. This is not an error state.

**Deletion behaviour:**

When a user deletes a photo from within Hokédex, they are prompted:

> *"Remove from Hokédex only, or also delete from your device?"*

This follows the established pattern of messaging and gallery apps. The user's choice is respected.

On person deletion, the cascade is:

```
Delete Person
    → Embeddings: always deleted (Hokédex-derived data, no standalone value)
    → PersonTags: always deleted
    → Photo rows: always deleted
    → Original image files: user choice per the deletion prompt
```

Benefits:

* Faster operation
* Lower infrastructure cost
* Strong privacy guarantees
* User retains control of original media

---

## Future Considerations

### Export

Allow encrypted export:

```
Persons
Photos (bundled image files, not paths)
Embeddings
Tags
```

for backup and migration.

**Path portability note:** `local_path` values are not meaningful across devices or after factory reset. The export format must bundle the actual image files, not references to them. Exported embeddings remain valid as long as the model and dimensionality are unchanged.

---

### Merge Entries

Users may accidentally create duplicates.

Future feature:

```
Merge Person A
      +
Merge Person B
      ↓
Single Person Record
```

Note: merging persons requires re-attributing all embeddings from both persons to the merged record. Per-person max similarity scores must be re-evaluated post-merge. This is more involved than a metadata merge and should be designed accordingly.

---

### Quantization Upgrade Path

If INT8 quantization is adopted post-MVP:

* All existing embeddings must be regenerated — this is a full collection migration, not an incremental update
* A background re-embedding job is required
* Similarity thresholds must be re-validated after migration, as quantization shifts the score distribution

---

### Cross Device Sync

Not included in MVP.

Possible future options:

* End-to-end encrypted sync
* User-controlled backup files
* Self-hosted sync

---

## Consequences

### Positive

* Strong privacy posture
* Minimal infrastructure cost
* Offline support
* Fast search
* Simple deployment
* User retains full control of original media

### Negative

* Larger device storage usage (embeddings stored per photo, not per person)
* No automatic cross-device sync
* Matching quality depends on local photos and detected face quality
* Native ML maintenance required per platform
* Persons with no detected face photos cannot be matched by face (by design)
* Search latency scales with total embedding count, not person count — embedding-per-person ratio should be monitored as collections grow

---

## MVP Scope

Included:

* Share image via share sheet
* Face detection with typed failure states (NO_FACE, MULTI_FACE, LOW_CONFIDENCE)
* Face search via cosine similarity
* Create person
* Multiple photos per person
* Reference photos without embeddings
* Profile photo designation per person
* Tags
* Notes
* Local storage
* Path-based image references with graceful placeholder fallback
* Deletion prompt for original media

Excluded:

* Cloud backend
* Accounts
* Social integrations
* Automatic syncing
* Analytics
* Recommendation systems
* INT8 quantization
* ANN indexing
* Merge entries
* Export / import

The MVP objective is to validate whether users find value in maintaining a searchable face-indexed personal collection.
