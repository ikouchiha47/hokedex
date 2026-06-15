# ADR-002: Hokédex Community, Identity, Publishing, and Collection Restore Architecture

## Status

Proposed

---

## Context

Hokédex began as a private, local-first catalog for recognizing and organizing people by face. ADR-001 established the core on-device architecture: face detection, embedding generation, SQLite storage, and vector similarity search — all running on-device with no server dependency.

This ADR extends Hokédex in three significant directions that were deferred from ADR-001:

**1. Generalized collection categories**

The original design was face-only (people). The product is expanding to support multiple collectible categories — plants, dogs, birds, people, and any future category. Each category has its own detection and embedding pipeline but shares the same storage, search, and UI infrastructure.

**2. Public profiles without server-side data ownership**

Users should be able to share a curated public Dex page — a snapshot of their collection — via a stable URL. The architecture must avoid owning any meaningful user data on the server. Original images and embeddings must never leave the device. The server receives and serves only pre-rendered HTML with baked-in thumbnails.

**3. Device identity, transfer, and collection restore**

The phone is the user's identity. There are no accounts. A cryptographic keypair establishes claim over a public profile slot. Identity and claim can be transferred to a new device via NFC or local file transfer (e.g. LocalSend). If the user also transfers their collection data, a structured restore workflow reconciles the SQLite database against the file system using content hashes.

---

## Decisions Overview

- Generalize Entry model to support multiple collection categories
- Each category has a dedicated ML pipeline (detector + embedding model)
- Search is always scoped to a single category — no cross-category matching
- Public profile is a static HTML snapshot, generated on-device, published to a thin server
- Server stores only: a short ID, an HTML blob, a public key, and timestamps
- Device identity is an Ed25519 keypair generated on first launch
- Short public ID is derived deterministically from the public key hash
- Write authority is verified by HMAC signature — no auth system required
- Device transfer moves ID + private key + last public snapshot via NFC or LocalSend, passphrase-encrypted
- Key rotation on transfer invalidates the old device's write access
- Collection restore uses relative file paths and SHA-256 content hashes
- Thumbnails carry the original file's SHA-256 in their metadata header for cross-device reconciliation
- Embeddings survive transfer in SQLite — no recomputation required on restore

---

## Part 1: Generalized Collection Categories

### The Entry abstraction

The original Hokédex model used `Person` as the top-level entity. This is replaced by `Entry`, which belongs to a `Category`.

```
Collection
 └── Entry
      ├── category_id        ← People / Dogs / Birds / Plants / ...
      ├── name
      ├── notes
      ├── tags
      ├── photos
      └── embeddings
```

A Category defines:

- Which detector to run (face detector, plant detector, animal detector, etc.)
- Which embedding model to use
- What the similarity thresholds mean for that category
- What metadata fields are relevant (e.g. species for birds, breed for dogs)

Built-in categories at launch: People. Additional categories (Birds, Plants, Dogs) follow as the ML pipelines are validated independently.

---

### Category-scoped ML pipelines

Each category has its own detector and embedding model pair:

```
People
 ├── Detector: MediaPipe Face Detection
 └── Embedder: MobileFaceNet, ArcFace-compatible, 512d float32

Birds
 ├── Detector: MobileNet-based bird localizer
 └── Embedder: Species-specific embedding model (TBD at category launch)

Plants
 ├── Detector: MobileNet-based plant localizer
 └── Embedder: Species-specific embedding model (TBD at category launch)

Dogs
 ├── Detector: Animal detector (MediaPipe or equivalent)
 └── Embedder: Breed/identity embedding model (TBD at category launch)
```

The native ML layer exposes a common interface regardless of category:

```
detect(image, category) → DetectionResult
embed(crop, category)   → float32[]
```

This means the React Native layer and the storage layer are category-agnostic. Only the native ML layer needs to know which model to invoke.

---

### Category-scoped search

Search is always scoped to a single category. A bird embedding must never be compared against a person embedding. The query always carries a `category_id` filter:

```sql
SELECT e.entry_id, MAX(vec_distance_cosine(e.vector, ?)) AS best_score
FROM embeddings e
JOIN entries en ON en.id = e.entry_id
WHERE en.category_id = ?
GROUP BY e.entry_id
ORDER BY best_score DESC
LIMIT 10
```

This is enforced at the query layer, not left to the caller.

---

### Detection states (applies to all categories)

The native ML layer surfaces typed detection states, not binary success/fail. These apply to every category:

**`NO_SUBJECT`**
Nothing detected in the image for the active category.
UX: inform the user, offer crop-and-retry. The image may still be saved as a reference photo with no embedding.

**`MULTI_SUBJECT`**
Multiple subjects detected (e.g. a group photo, multiple plants in frame).
UX: present detected crops as a selectable grid. User picks one. Only the selected subject proceeds to embedding and search.

**`LOW_CONFIDENCE`**
Subject detected below confidence threshold (default: 0.7 per category, configurable).
UX: warn the user that matching accuracy may be reduced. User may proceed or discard.

**`SUCCESS`**
Subject detected cleanly. Proceed to embedding and search.

---

## Part 2: Data Model

### Category

```
Category
--------
id
name                  ← "People", "Birds", "Plants", "Dogs"
detector_model        ← identifier for the native detector to invoke
embedding_model       ← identifier for the native embedder to invoke
embedding_dimensions  ← e.g. 512 for People
similarity_threshold_likely    ← e.g. 0.95
similarity_threshold_possible  ← e.g. 0.85
created_at
```

Categories are seeded at install time. Users cannot create categories in MVP.

---

### Entry (replaces Person)

```
Entry
-----
id
category_id           ← FK to Category
name
notes
is_public             ← boolean, default false; controls inclusion in public profile
created_at
updated_at
```

---

### Photo

```
Photo
-----
id
entry_id
local_path            ← relative path from collection root; never absolute
original_sha256       ← SHA-256 of original file bytes, computed at ingestion
original_phash        ← perceptual hash, fallback for reconciliation after re-encoding
is_profile_photo      ← boolean; designated display image for listings and cards
embedding_id          ← nullable FK to Embedding; null if no subject detected
created_at
```

`local_path` is always relative to the user-defined collection root directory. Absolute paths are never stored. This is what makes the database portable across devices.

`original_sha256` is computed at ingestion time, from the raw file bytes, before any processing. This is the ground truth identifier for the file.

`original_phash` is a perceptual hash computed at ingestion. Used as a fallback during restore reconciliation if the file was re-encoded in transit (e.g. iCloud HEIC conversion, WhatsApp compression). If SHA-256 fails to match but perceptual hash distance is within threshold, the file is surfaced to the user as a probable match for manual confirmation.

---

### Thumbnail

Thumbnails are generated at ingestion and stored separately from originals:

```
/HokedexData/
 ├── images/
 │    └── {year}/
 │         └── {sha256_prefix}_{entry_name}_{original_filename}
 └── thumbnails/
      └── {year}/
           └── {sha256_prefix}_{entry_name}_thumb.jpg
```

The original file's `SHA-256` is embedded in the thumbnail's metadata header at generation time:

- JPEG: EXIF UserComment field → `hokedex:original_sha256={hash}`
- PNG: tEXt chunk → key: `hokedex-original-sha256`, value: `{hash}`

This makes every thumbnail a self-describing artifact. During restore or cross-device reconciliation, the thumbnail alone is sufficient to identify which original file it corresponds to, without needing the original file to be present.

---

### Embedding

```
Embedding
---------
id
entry_id
photo_id
category_id           ← denormalized for query efficiency
vector                ← float32[], dimensionality per category
created_at

Index: (category_id, entry_id)   ← primary search path
Index: (entry_id, photo_id)      ← join path
```

---

### Tag / EntryTag

```
Tag
---
id
name

EntryTag
--------
entry_id
tag_id
```

---

### Workspace

```
Workspace
---------
id
local_id              ← stable UUID generated on first launch
public_short_id       ← derived from public key hash; deterministic
private_key           ← Ed25519 private key, stored in device secure enclave / keystore
public_key            ← Ed25519 public key
collection_root       ← absolute path to the HokedexData directory on this device
last_published_at
created_at
is_shadow             ← true if this workspace was restored from identity transfer
                         without original collection data
```

A device may hold multiple workspaces. Each workspace is a fully isolated local database with its own identity and collection root. Switching workspaces switches the active SQLite database.

`is_shadow` is true when the workspace was created by receiving an identity transfer but no collection data was transferred. The user has claim over the public profile URL but an empty private collection. They may begin rebuilding from scratch or import collection data separately.

---

## Part 3: File System Layout

The collection lives under a single root directory that the user controls. Everything inside this directory uses relative paths. The directory can be moved, copied, or transferred and the database remains valid as long as paths are preserved relative to the root.

```
HokedexData/
 ├── hokedex.db              ← SQLite database (portable, relative paths only)
 ├── images/
 │    ├── 2024/
 │    │    ├── abc123_sarah_headshot.jpg
 │    │    └── def456_sarah_ref.jpg
 │    └── 2025/
 │         └── ghi789_golden_warbler.jpg
 └── thumbnails/
      ├── 2024/
      │    ├── abc123_sarah_headshot_thumb.jpg
      │    └── def456_sarah_ref_thumb.jpg
      └── 2025/
           └── ghi789_golden_warbler_thumb.jpg
```

The filename convention encodes enough information for manual recovery:

```
{sha256_first8}_{entry_name_slug}_{original_filename}
```

This means even if the database is lost, a user can identify what each file was from the filename alone.

---

## Part 4: Device Identity and Public Profile

### Identity model

There are no user accounts. The phone is the identity.

On first launch, Hokédex generates an Ed25519 keypair and stores it in the device's secure enclave (Android Keystore / iOS Secure Enclave). This keypair is the user's cryptographic identity.

```
First launch
    ↓
Generate Ed25519 keypair
    ├── private_key → secure enclave (never leaves without explicit export)
    └── public_key  → stored in Workspace table + registered with server on first publish
```

The short public ID is derived deterministically from the public key:

```
short_id = base58(SHA-256(public_key))[0:8]
```

The same keypair always produces the same short ID. No server-side registration is required to know what your public URL will be.

Public profile URL:

```
dex.app/u/{short_id}
```

---

### The publishing server

The server is a minimal content-addressed store. It holds no user data beyond what is necessary to serve the public profile.

Server slot structure:

```
Slot
----
short_id              ← derived from public key hash
public_key            ← current active Ed25519 public key for this slot
html_blob             ← pre-rendered profile page, generated on-device
last_published_at
expires_at            ← TTL; reset on each publish
```

No user table. No personal data. No original images. No embeddings. No names unless the user put them in the public profile themselves.

The server's responsibilities are:

- Verify publish signature
- Store HTML blob against short ID
- Serve HTML blob at public URL
- Expire slots that have not been republished within TTL (90 days, renewable)

---

### Publish flow

The app generates the public profile HTML entirely on-device, then POSTs it to the server:

```
User triggers publish
    ↓
App selects all Entries where is_public = true
    ↓
For each public entry:
    generate thumbnail (200×200px, EXIF stripped)
    embed thumbnail as base64 in HTML
    include: name, category, tags, notes (if user chose to include)
    exclude: original images, embeddings, private notes
    ↓
App signs payload with private_key (Ed25519 signature over SHA-256 of blob)
    ↓
POST {short_id, html_blob, signature, public_key} to server
    ↓
Server verifies signature against stored public_key
    ↓
Server overwrites slot with new blob
    ↓
Public URL is live
```

The data that leaves the device:

```
Leaves device         Does not leave device
─────────────────     ──────────────────────────────
HTML blob             Original images
Low-res thumbnails    Embeddings
Public entry names    Private entries (is_public=false)
Public tags           Private notes
Short ID              Local file paths
Ed25519 signature     Full collection structure
Public key            SQLite database
```

---

### Public profile: timeline choice

When a user publishes for the first time on a new device (shadow mode after identity transfer), they are offered:

```
Your Dex page has existing entries from your previous device.

[Continue timeline]     [Start fresh]
```

**Continue timeline** — new entries append to the existing public snapshot. Visual history is preserved. The public URL remains the same.

**Start fresh** — the existing snapshot is replaced. A fresh timeline begins at the same URL. The user's old public entries are no longer visible.

This choice affects only the public profile. The private collection is always empty on a new device regardless.

---

### TTL and renewal

Public profiles expire 90 days after the last publish unless renewed. Renewal is triggered by any publish action — adding a new public entry, editing the profile, or explicitly refreshing from the app. The URL does not change on renewal.

If a profile expires, the URL returns a tombstone page rather than a 404:

```
This Dex page has been inactive.
The collector may republish at any time.
```

This prevents broken links from being indistinguishable from invalid URLs.

---

## Part 5: Device Transfer

### What transfers

Identity transfer moves the minimum necessary to establish claim on the new device:

```
Transfer package
├── local_id              ← stable workspace UUID
├── private_key           ← Ed25519 private key (exported from secure enclave)
├── public_key            ← Ed25519 public key
└── public_profile_snapshot  ← last published HTML (for timeline continuity choice)
```

What does not transfer:

```
Does not transfer
─────────────────
Original images
SQLite database
Embeddings
Private entries
Notes
Thumbnails
```

The private collection is intentionally not included in the identity transfer package. The new device starts in shadow mode — identity intact, private collection empty.

If the user wants to restore their private collection, that is a separate, explicit operation (see Part 6).

---

### Transfer mechanism

Transfer is via NFC tap or LocalSend file share. Both are local, device-to-device, with no server involvement.

The transfer package is encrypted with a passphrase the user sets immediately before transfer. The passphrase is communicated out-of-band — verbally, since the user is physically present for both NFC and deliberate LocalSend.

```
Old device
    ↓
User initiates transfer in app
    ↓
User sets transfer passphrase
    ↓
App exports transfer package, encrypts with passphrase
    ↓
Transfer via NFC tap or LocalSend
    ↓
New device receives encrypted package
    ↓
User enters passphrase
    ↓
Package decrypted, identity imported
    ↓
New device generates new keypair
    ↓
New device signs key rotation request with old private_key
    ↓
Server updates slot: old public_key → new public_key
    ↓
Old private_key is now invalid for writes
    ↓
Old device's copy of old private_key can no longer publish
```

---

### Key rotation

Key rotation is the mechanism that invalidates the old device after transfer. It requires no server-side session or auth system:

```
Key rotation request
{
  short_id,
  new_public_key,
  signature: sign(new_public_key, old_private_key)
}
```

The server verifies the signature against the currently stored public key for that slot. If valid, it replaces the stored public key with the new one. All future publish requests must be signed with the new private key. The old key is permanently invalid for this slot.

The old device is not notified. It will discover its key no longer works the next time it attempts to publish. This is acceptable — the transfer was deliberate and the old device's publish attempts are simply rejected.

---

### Multiple workspaces

If a user wants a fresh identity rather than a transfer:

```
Workspace A (original)
├── local_id_A, keypair_A
└── public profile at dex.app/u/A

Workspace B (new identity)
├── local_id_B, keypair_B  ← generated fresh on new workspace creation
└── public profile at dex.app/u/B (empty initially)
```

The two workspaces are fully isolated. Separate SQLite databases, separate collection roots, separate public URLs, separate keypairs. Workspace A's slot expires via TTL if never published to again. There is no server-side relationship between workspaces.

The user manages workspaces from the app. Switching workspaces is equivalent to switching the active database and identity context.

---

## Part 6: Collection Restore

Collection restore is a separate operation from identity transfer. It is triggered when the user has access to their old collection data (transferred via LocalSend, USB, external drive, or any file transfer method they control) and wants to restore it on a new device.

---

### Restore prerequisites

The user must provide the `HokedexData/` directory — the collection root from their old device. The SQLite database and the images directory travel together. Thumbnails are optional for restore but useful for reconciliation.

---

### Restore workflow

```
User opens Hokédex on new device
    ↓
"Restore collection" → user selects HokedexData/ directory
    ↓
App sets collection root to selected directory
    ↓
App opens hokedex.db from root
    ↓
App walks all Photo rows
    ↓
For each photo, resolve relative local_path against new root
    ↓
For each resolved path:
    if file exists:
        compute SHA-256 of file bytes
        compare against stored original_sha256
        ✓ match    → confirmed, linked
        ✗ mismatch → file changed in transit; check original_phash
            pHash distance within threshold → probable match, surface for user confirmation
            pHash distance outside threshold → treat as missing
    if file missing:
        check thumbnails/ for thumbnail with matching SHA-256 in metadata header
        found → show thumbnail as placeholder, mark original as missing
        not found → show generic placeholder
    ↓
Reconciliation summary shown to user:
    ✓ {n} photos confirmed
    ⚠ {n} probable matches awaiting confirmation
    ✗ {n} photos missing (placeholder shown)
    ↓
User confirms, collection loads
    ↓
Embeddings already present in SQLite — no recomputation needed
    ↓
Collection is immediately searchable
```

The critical property: embeddings survive the transfer inside SQLite. The expensive ML computation (face detection, embedding generation) does not need to be repeated. The collection is fully searchable the moment the database loads, even before missing photos are resolved.

---

### SHA-256 as the content identity

SHA-256 is computed from the raw file bytes at ingestion time, before any processing. This is the ground truth identifier. It is:

- Deterministic: same bytes → same hash, on any platform (Android, iOS, Linux)
- Platform-independent: no OS-specific behaviour affects the hash
- Stable: stored in the Photo row and in the thumbnail header

The only scenario where SHA-256 fails to match is if the file bytes changed between ingestion and restore — HEIC→JPEG conversion by iCloud, recompression by WhatsApp, EXIF stripping by some gallery apps. This is why `original_phash` exists as a fallback.

---

### Thumbnail as a self-describing artifact

Every thumbnail carries the original file's SHA-256 in its metadata header:

```
JPEG thumbnail
EXIF UserComment: hokedex:original_sha256=abc123def456...

PNG thumbnail
tEXt chunk key:   hokedex-original-sha256
tEXt chunk value: abc123def456...
```

This means:

- During restore, thumbnails can be matched to Photo rows even without the originals
- During reconciliation, a found thumbnail is sufficient to display a recognizable image in the collection
- The thumbnail is useful without the database (manual recovery) and useful without the original (graceful degradation)

---

### Post-restore states

After reconciliation, a Photo row is in one of three states:

```
CONFIRMED
    Original file found, SHA-256 verified.
    Full resolution available.

PROBABLE
    Original file found, SHA-256 mismatch, pHash within threshold.
    User prompted to confirm link. Treated as CONFIRMED after confirmation.

MISSING
    Original file not found.
    Thumbnail shown if available, generic placeholder otherwise.
    Embedding still present and active — entry remains searchable by face.
    User may re-import the original at any time to restore full resolution.
```

A MISSING photo does not remove the entry from search results. The embedding is intact. The entry is just displayed with a placeholder image until the original is re-linked.

---

## Part 7: Consequences

### Positive

- No user accounts at any layer — the keypair is the identity
- Server owns nothing meaningful — HTML blob with thumbnails is the extent of stored data
- Embeddings survive device transfer without recomputation — restore is fast
- Public profile is a curated snapshot — private collection is never exposed
- Multiple categories share the same infrastructure — adding a new category is an ML pipeline addition, not an architectural change
- Key rotation on transfer cleanly invalidates old device write access
- SHA-256 + pHash dual-hash strategy handles both exact and approximate file reconciliation
- Thumbnail metadata header makes thumbnails self-describing and useful without their originals

### Negative

- Loss of device without backup of HokedexData/ means loss of private collection permanently
- Loss of transfer package without key rotation means old device can still publish until TTL expires (last-write-wins)
- Public profile URL expires after 90 days of inactivity — users who stop using the app lose their public URL
- pHash fallback during restore requires user confirmation — cannot be automated without risk of false links
- Each category requires a separately validated ML pipeline — new categories are not cheap to add
- Shadow mode after identity transfer means the private collection must be rebuilt or restored separately — two-step process for full restoration

---

## MVP Scope for ADR-002

### Included

- Entry model with category support (People category only at launch)
- Category-scoped ML pipeline interface in native layer
- Typed detection states: NO_SUBJECT, MULTI_SUBJECT, LOW_CONFIDENCE, SUCCESS
- is_public flag per Entry
- Public profile generation: on-device HTML with base64 thumbnails
- Thin publishing server: signature verification, blob storage, TTL, key rotation endpoint
- Ed25519 keypair generation on first launch
- Deterministic short_id from public key hash
- Identity transfer package: encrypted, passphrase-protected, NFC or LocalSend
- Key rotation on transfer
- Shadow mode workspace state
- Timeline continuity choice on first publish from shadow mode
- Relative path storage in Photo rows
- SHA-256 and pHash computed and stored at ingestion
- SHA-256 embedded in thumbnail metadata header
- Collection restore workflow with reconciliation summary
- Multiple workspace support

### Excluded

- Additional categories beyond People (Birds, Plants, Dogs — post-MVP)
- Community discovery features (finding other collectors with shared entries)
- Cross-device Bluetooth/local-network collection comparison
- Badges and milestones
- Collection export as a shareable archive (distinct from restore transfer)
- Automated sync of any kind
- Analytics

---

## Open Questions

**Thumbnail size for public profile:** 200×200px is proposed. Needs validation against HTML blob size targets — a profile with 100 public entries at 200×200 JPEG (est. ~15KB each base64-encoded) produces roughly a 1.5MB HTML blob. This may need to drop to 100×100px or use lazy-loaded external URLs for larger collections.

**pHash threshold for reconciliation:** the Hamming distance threshold for treating a pHash match as a probable link has not been set. Needs empirical testing against a sample of re-encoded images (HEIC→JPEG, WhatsApp compression, etc.) before the restore workflow ships.

**TTL duration:** 90 days is proposed. The right value depends on observed publish frequency from real users. Too short and casual users lose their URL; too long and orphaned slots accumulate on the server.

**Category similarity thresholds:** the 0.95 / 0.85 thresholds defined in ADR-001 apply to People (ArcFace embeddings). Each new category will need independently validated thresholds. These must not be assumed to transfer across embedding models.
