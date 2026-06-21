# hokédex — Moments

## What This Is

A private, on-device relationship intelligence app for Android. It captures moments — instances of being with people (photo, voice, contact, place) — and builds relationship intelligence over time: drift detection, birthday reminders, upcoming events, and proactive nudges. No cloud, no sharing, no pods. Everything lives on the device.

## Core Value

Capture moments as a side effect of living, then surface relationship patterns you'd never notice yourself.

## Requirements

### Validated

- ✓ Face detection (FaceDetector.kt) — existing
- ✓ Face embedding (FaceEmbedder.kt) — existing
- ✓ Local SQLite DB via op-sqlite — existing
- ✓ React Native 0.86, Android-first, New Architecture — existing
- ✓ Collection list screen with entry management — existing
- ✓ App update notification banner — existing

### Active

- [ ] Moments schema (moments, moment_people, person_dates, moment_tags, saved_places)
- [ ] Camera capture path with face detection + person linking
- [ ] Voice capture path with on-device STT + AI type inference
- [ ] Gallery ingestion on first launch (face clustering, EXIF, backfill)
- [ ] Home screen: weather cover, event strip, radial FAB
- [ ] Timeline: chronological moments feed + map pin button
- [ ] People screen: cluster view + contacts list toggle
- [ ] Planner: streak, calendar, upcoming dates, drift alerts
- [ ] Smart notifications (6 scenarios, WorkManager, all on-device)
- [ ] Memory generation (eventful scorer, video render, share sheet)
- [ ] Place resolver (Google Maps share URL → lat/lng → OSM map)
- [ ] Offline OSM tile map with moment pins
- [ ] Calendar integration via CalendarContract (no OAuth)
- [ ] Rules engine (named, versioned, toggleable smart feature rules)

### Natural Verticals (post-MVP, no new architecture needed)

The core Moment model (person + location + note + photo + proximity) covers professional relationship use cases without schema changes beyond `moments.status`:

- **Fitness trainer ↔ client** — planned session moment (status='planned', type='gym') pre-fills workout note; proximity trigger notifies trainer on client arrival; progress photos logged chronologically per client
- **Tutor ↔ student** — planned session with notes; topic tags; progress timeline
- **Therapist ↔ patient** (notes only, no photos) — session log with type='work', private notes per person

These are positioning opportunities post-launch, not features to build now. The data model already supports them.

### Out of Scope

- Cloud sync or backend — privacy is non-negotiable; all data stays on device
- Social sharing / pods — private only; Mastodon deferred indefinitely
- Google Maps SDK — using OSM tiles to avoid API keys and vendor lock-in
- OAuth calendar integration — CalendarContract is sufficient for read-only
- Graph view library — deferred until that track starts
- Memory video music — user adds post-export from social editors

## Context

- **Stack**: React Native 0.86, Android-first, New Architecture, op-sqlite, Kotlin native modules
- **Existing ML**: FaceDetector.kt + FaceEmbedder.kt already wired to RN
- **DB**: op-sqlite at `/sdcard/Android/data/com.hokedex/files/hokedex.db`; WAL mode; migrations via runner.ts
- **Background jobs**: WorkManager pattern established for model downloads — reuse for gallery scan, eventfulness scorer, tile download, calendar sync
- **Primary market**: India (Zomato, Swiggy, Indian English STT) + expansion to Europe (TheFork, Wolt)
- **MOMENTS_PLAN.md**: comprehensive plan with schema, EARS requirements, navigation structure, E2E tests, and all decisions locked

## Constraints

- **Privacy**: No data leaves the device. No analytics, no crash reporting with PII, no cloud APIs that receive user data.
- **Tech stack**: React Native + Kotlin only. No Flutter, no Swift, no server-side code.
- **ML on-device**: All face detection, embedding, STT, type inference runs locally. No cloud ML APIs.
- **No API keys in source**: Maps via OSM (free, no key). STT via Android SpeechRecognizer or Whisper.cpp JNI. Calendar via CalendarContract.
- **Existing conventions**: Table names plural, snake_case columns, SQL in .sql files, no raw SQL in TypeScript, one export per query file.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| encounters → moments migration | Richer schema: type, eventfulness, source, session grouping | — Pending |
| STT: Android SpeechRecognizer first | Zero download cost; swap to Whisper.cpp base if Indian English accuracy insufficient | — Pending |
| Map: OSM tiles via MapLibre | No Google Maps SDK, no API key, offline-capable, universal lat/lng | — Pending |
| Place resolver: HTTP redirect parse | One HEAD request, no API key, works globally via Google Maps short URLs | — Pending |
| Calendar: CalendarContract (READ_CALENDAR) | No OAuth, no Google Cloud project, read-only is enough | — Pending |
| FAB: radial toggle (not hover/inline) | User-specified UX — 3 icons fan in circle on press, collapse on second press | — Pending |
| Icons: Lucide (not emoji) | Engineering standard — scalable, accessible, consistent visual language | — Pending |
| Drift threshold: 21 days default | User-configurable; tighten based on historical contact frequency | — Pending |
| Activity suggestions: Firebase Remote Config | 1M fetches/day free; bundled JSON fallback | — Pending |
| Rules engine: named + versioned units | Each smart feature is a toggleable rule; new features slot in without touching existing logic | — Pending |
| Icons: Lucide (lucide-react-native) | Engineering standard over emoji — scalable, accessible, tree-shakeable | — Pending |
| PlaceResolver: Strategy + Registrar | Polymorphic resolvers (Google, Zomato, TheFork, Nominatim) self-register; no branch-on-type in business logic | — Pending |
| CalendarProxy: Proxy pattern | Single class wraps CalendarContract; no other module touches Android cursor APIs | — Pending |
| MomentCaptureService: Facade pattern | Hides face detection + embedding + DB write + place resolution behind one call | — Pending |
| Constructor injection throughout | No singletons, no static methods; all deps injected at construction for testability | — Pending |

## Code Conventions

See [`.planning/CONVENTIONS.md`](.planning/CONVENTIONS.md) — covers SOLID/Liskov, Strategy, Facade, Proxy, Registrar patterns; TypeScript file structure; Kotlin bridge-only modules; Result types; icon library; testing order.

All GSD executor agents must read CONVENTIONS.md before writing any code.

---
*Last updated: 2026-06-21 after initialization from MOMENTS_PLAN.md*
