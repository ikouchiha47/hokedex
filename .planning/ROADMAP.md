# Roadmap: hokédex — Moments Redesign

## Overview

Six phases transforming hokédex from an encounter-logger into a full relationship intelligence app. Phase 1 is the choke point — schema, TypeScript contracts, and service shells must land before any parallel feature work begins. Phases 2–6 build the screens, capture paths, intelligence layer, and background services on top of that foundation.

## Phases

- [ ] **Phase 1: Schema, Interfaces & Conventions Foundation** - DB migrations, TypeScript contracts, service shells (Facade/Registry stubs)
- [ ] **Phase 2: Navigation Shell & Home Screen** - 4-tab nav, weather cover, radial FAB, event strip
- [ ] **Phase 2.1: Proximity & Group Detection (INSERTED)** - GPS geofence → BLE advertise/scan → group session confirmation — parallel with Phases 3–5
- [ ] **Phase 3: Camera Capture Path** - Camera → face detection → face picker → moment saved to DB
- [ ] **Phase 4: Voice Capture, Type Inference & Timeline Feed** - Voice STT → type inference → Timeline chronological feed
- [ ] **Phase 5: People, Planner, Special Dates & Calendar** - People cluster/contacts, Planner streak/heatmap, CalendarProxy
- [ ] **Phase 6: Map, Place Resolvers, Notifications & Gallery** - OSM map, place resolver chain, smart notifications, gallery ingestion, memory generation

## Phase Details

### Phase 1: Schema, Interfaces & Conventions Foundation
**Goal**: All data structures and service contracts agreed and committed. No feature implementation — only SQL migrations, TypeScript types, and empty service shells. Parallel tracks can start once this lands.
**Depends on**: Nothing (first phase)
**Requirements**: R-DB-01, R-DB-02, R-DB-03, R-DB-04, R-DB-05, R-CONV-01, R-CONV-02, R-CONV-03, R-CONV-04, R-CONV-05, R-PROX-01 (schema only)
**Success Criteria** (what must be TRUE):
  1. `yarn tsc --noEmit` passes with zero errors
  2. All 5 new tables present in the DB after migrations run on device
  3. All query files export typed functions (return types explicit, not inferred)
  4. `MomentCaptureService`, `PlaceResolverRegistry`, `RuleRegistry`, `CalendarProxy` are importable shells
**Plans**: 3 plans

Plans:
- [ ] 01-01: DB Migrations — moments, moment_people, person_dates, moment_tags, saved_places, group_sessions tables + query files
- [ ] 01-02: TypeScript Contracts — Moment, MomentPeople, PersonDate, SavedPlace, GroupSession, Rule, PlaceResolver, CalendarEvent types
- [ ] 01-03: Service Shells — MomentCaptureService facade, PlaceResolverRegistry, RuleRegistry, CalendarProxy, ProximityService stubs

### Phase 2: Navigation Shell & Home Screen
**Goal**: 4-tab nav and Home screen are functional with static/placeholder data. All UI uses Lucide icons. FAB radial toggle works. Weather animation visible.
**Depends on**: Phase 1
**Requirements**: R-NAV-01, R-NAV-02, R-NAV-03, R-NAV-04, R-HOME-01, R-HOME-02, R-HOME-03, R-HOME-04
**Success Criteria** (what must be TRUE):
  1. All 4 tabs navigate without crash; each screen renders without blank screen
  2. FAB expands/collapses; 3 Lucide icons visible and labelled (no emoji)
  3. Weather animation visible on Home; sun and rain states both render
  4. Event strip hidden (CalendarProxy stubbed in this phase — no real events yet)
**Plans**: 3 plans

Plans:
- [ ] 02-01: Bottom Tab Navigator — 4 tabs with Lucide icons, Settings in header
- [ ] 02-02: Home Screen — Weather cover SVG animation + event strip + "What is on?" label
- [ ] 02-03: Home Screen — Radial FAB (contact/mic/camera, 200ms arc animation)

### Phase 2.1: Proximity & Group Detection (INSERTED)
**Goal**: GPS geofence detects arrival at a saved_place → BLE advertising + scanning activates automatically → nearby Hokedex devices surface → user confirms → Moment linked. Fully parallel with Phases 3–5 — no UI dependency beyond the Home screen session card stub.
**Depends on**: Phase 1 (group_sessions schema + ProximityService shell)
**Requirements**: R-PROX-01, R-PROX-02, R-PROX-03, R-PROX-04, R-PROX-05, R-PROX-06, R-PROX-07, R-PROX-08
**Success Criteria** (what must be TRUE):
  1. Arriving within 100m of a saved_place triggers a geofence entry event (verified via adb shell)
  2. BLE advertising starts on geofence entry; `venue_id` + `session_token` present in advertisement payload
  3. Two test devices at the same venue detect each other and trigger a local notification
  4. Confirming the prompt creates a `group_sessions` record with `moment_id` linked
  5. BLE stops on geofence exit; `group_sessions.ended_at` set
  6. BLE advertisement payload contains no persistent user identifier
**Plans**: 3 plans

Plans:
- [ ] 02.1-01: GeofenceModule — HokedexGeofenceModule.kt + GeofenceManager.kt + GeofenceBroadcastReceiver.kt; register geofences for saved_places
- [ ] 02.1-02: BleProximityModule — HokedexBleModule.kt + BleProximityManager.kt; venue_id hash, session_token, advertise + scan
- [ ] 02.1-03: ProximityService + group session UI — ProximityService.ts wiring, group_sessions DB queries, Home screen session card, confirmation notification

### Phase 3: Camera Capture Path
**Goal**: Camera → face detection → face picker → person confirm/create → moment saved to DB. E2E-01, E2E-02, E2E-03, E2E-05 pass manually on device.
**Depends on**: Phase 1
**Requirements**: R-CAM-01, R-CAM-02, R-CAM-03, R-CAM-04, R-CAM-05, R-CAM-06, R-CAM-07, R-CAM-08
**Success Criteria** (what must be TRUE):
  1. E2E-01 (single face, new person) works end-to-end on device
  2. E2E-02 (single face, existing person match) works end-to-end on device
  3. E2E-03 (multiple faces, group moment) creates correct moment_people records
  4. E2E-05 (no face detected) creates moment with zero moment_people records
  5. Moment visible in sqlite3 query after capture
**Plans**: 3 plans

Plans:
- [ ] 03-01: Camera Screen + Face Picker — bounding box overlay, face crop cards, confirm/reject
- [ ] 03-02: Embedding Match + Person Link — cosine similarity, "Is this [name]?" confirm, new person flow
- [ ] 03-03: MomentCaptureService camera implementation — atomic DB write (moments + moment_people transaction)

### Phase 4: Voice Capture, Type Inference & Timeline Feed
**Goal**: Voice capture path works. Timeline shows real moments from DB. Type inference fills the type field on moments.
**Depends on**: Phase 1
**Requirements**: R-VOICE-01, R-VOICE-02, R-VOICE-03, R-VOICE-04, R-VOICE-05, R-VOICE-06, R-TYPE-01, R-TYPE-02, R-TYPE-03, R-TYPE-04, R-TL-01, R-TL-02, R-TL-03, R-TL-04
**Success Criteria** (what must be TRUE):
  1. E2E-04 (voice capture — "had dinner with Aarav tonight") passes manually
  2. Timeline shows all moments captured in Phase 3, newest first
  3. Type chips show correct inference (dinner/gym/etc.) for voice inputs
  4. Person filter narrows timeline feed correctly
  5. Map-pin icon visible in Timeline header (wired to placeholder; real map in Phase 6)
**Plans**: 3 plans

Plans:
- [ ] 04-01: Voice Capture + STT — Android SpeechRecognizer integration, editable transcription
- [ ] 04-02: Type Inference + Person Extraction — keyword rules, ML Kit Entity Extraction, fuzzy name match
- [ ] 04-03: Timeline Feed — chronological feed from DB, photo carousel, person filter, eventful-day ✦ marker

### Phase 5: People, Planner, Special Dates & Calendar
**Goal**: People cluster + contacts work. Planner shows real streak/heatmap. Special dates notify correctly. Calendar integration reads device calendar via CalendarProxy.
**Depends on**: Phase 1
**Requirements**: R-PEOPLE-01, R-PEOPLE-02, R-PEOPLE-03, R-PEOPLE-04, R-PLAN-01, R-PLAN-02, R-PLAN-03, R-DATE-01, R-DATE-02, R-DATE-03, R-DATE-04, R-CAL-01, R-CAL-02, R-CAL-03, R-CAL-04, R-CAL-05
**Success Criteria** (what must be TRUE):
  1. People cluster renders with correct visual encoding (size, border color, opacity, distance)
  2. E2E-06 (special date reminder notification) passes manually
  3. E2E-07 (drift alert in Planner) passes manually
  4. E2E-08 (streak counter — social + solo) passes manually
  5. Calendar events appear in Home event strip after READ_CALENDAR permission granted
**Plans**: 4 plans

Plans:
- [ ] 05-01: People Screen — cluster view (force-directed visual encoding) + contacts list + person profile
- [ ] 05-02: Special Dates — add/edit/delete on person profile, WorkManager daily notification job
- [ ] 05-03: Planner Screen — streak counter, 28-day heatmap, calendar grid, drift alerts
- [ ] 05-04: Calendar Integration — HokedexCalendarModule.kt + CalendarReader.kt + CalendarProxy impl + event strip wiring

### Phase 6: Map, Place Resolvers, Notifications & Gallery
**Goal**: Full feature completeness. OSM map with moment pins. Place resolver chain handles all supported URLs. All 6 smart notification scenarios fire. Gallery ingestion bootstraps relationship history. Memory editor generates shareable video.
**Depends on**: Phase 1
**Requirements**: R-MAP-01, R-MAP-02, R-MAP-03, R-MAP-04, R-MAP-05, R-PLACE-01, R-PLACE-02, R-PLACE-03, R-PLACE-04, R-NOTIF-01, R-NOTIF-02, R-NOTIF-03, R-GAL-01, R-GAL-02, R-GAL-03, R-GAL-04, R-GAL-05, R-GAL-06, R-GAL-07, R-GAL-08, R-MEM-01, R-MEM-02, R-MEM-03, R-MEM-04, R-MEM-05, R-MEM-06, R-SUGGEST-01, R-SUGGEST-02, R-SUGGEST-03, R-SUGGEST-04
**Success Criteria** (what must be TRUE):
  1. OSM map renders with moment pins; works offline after first tile download
  2. Google Maps short URL resolves to lat/lng and pre-fills moment capture
  3. All 6 notification scenarios fire correctly on device
  4. Gallery ingestion completes and creates moments from existing device photos
  5. Memory editor generates a shareable MP4
**Plans**: 5 plans

Plans:
- [ ] 06-01: OSM Map View — react-native-maplibre-gl, tile download WorkManager job, moment pins
- [ ] 06-02: Place Resolver Chain — GoogleMapsResolver, ZomatoResolver, TheForkResolver, NominatimFallback + share intent receiver
- [ ] 06-03: Smart Notifications — all 6 scenarios, eventful day scorer, WorkManager schedule, per-type settings toggle
- [ ] 06-04: Gallery Ingestion — WorkManager chunked scan, quality/meme filter, face clustering, EXIF extraction, cluster naming UI
- [ ] 06-05: Memory Generation — eventful day scorer → draft trigger, session grouping, memory editor, Canvas video, MP4 export
