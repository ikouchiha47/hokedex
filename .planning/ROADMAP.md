# Roadmap: hokédex — Camera-First Redesign

## Overview

Camera-first redesign. The app opens to a full-screen viewfinder. Four tabs: Camera · Moments · People · Maps. Gallery lives as a bottom sheet on Camera. No Home screen. No RadialFAB. Moments capture weather + GPS automatically. Every moment is a rich object: photos, people, location, weather, notes.

Phase 1 (schema) is complete. Phase 2 rebuilds the nav shell around the new structure. Phases 3–6 build the capture path, moments tab, people tab, and maps tab. Phase 7 closes with gallery ingestion, memory generation, and advanced features.

## Design Language

Windows 10 Mobile-inspired: flat, gradient backgrounds, bold typography, accent color underlines on active pivot items, implicit borders (spacing + contrast, not lines), no card shadows, colors used for state not decoration.

## Phases

- [x] **Phase 1: Schema, Interfaces & Conventions Foundation** ✓ 2026-06-22
- [ ] **Phase 2: Camera-First Nav Shell** - Camera as root tab, 4-tab nav (Camera · Moments · People · Maps), Gallery bottom sheet scaffold, camera bottom bar
- [ ] **Phase 3: Camera Capture Path** - Full viewfinder, capture → face detection → GPS + weather auto-attach → moment saved
- [ ] **Phase 4: Moments Tab + Moment Detail** - Today · Calendar · Planner pivot; Moment Detail page with weather, location, people, split moment
- [ ] **Phase 5: People Tab + Voice Capture** - Cluster view, person profile with moments + map, voice STT capture path
- [ ] **Phase 6: Maps Tab + Calendar + Place Resolver** - Life map (OSM, all moment pins), calendar integration, share intent resolver
- [ ] **Phase 7: Gallery Ingestion, Memory Generation & Intelligence** - Device photo scan, memory editor, smart notifications, proximity detection

## Phase Details

### Phase 1: Schema, Interfaces & Conventions Foundation
**Goal**: All data structures and service contracts agreed and committed.
**Depends on**: Nothing
**Requirements**: R-DB-01, R-DB-02, R-DB-03, R-DB-04, R-DB-05, R-CONV-01, R-CONV-02, R-CONV-03, R-CONV-04, R-CONV-05, R-PROX-01 (schema only)
**Status**: ✓ Complete 2026-06-22
**Plans**: 3 plans

Plans:
- [x] 01-01: DB Migrations
- [x] 01-02: TypeScript Contracts
- [x] 01-03: Service Shells

### Phase 2: Camera-First Nav Shell
**Goal**: App opens to full-screen viewfinder. 4-tab nav (Camera · Moments · People · Maps) renders without crash. Gallery bottom sheet opens and closes. Camera bottom bar shows gallery thumbnail, capture button, face-scan button. All stub screens in place. No Home screen. No RadialFAB.
**Depends on**: Phase 1
**Requirements**: R-NAV-01, R-NAV-02, R-NAV-03, R-NAV-04, R-NAV-05
**Success Criteria**:
  1. App opens to full-screen camera viewfinder (or permission prompt) — no Home screen
  2. All 4 tabs navigate without crash; each renders a non-blank stub
  3. Gallery bottom sheet opens on gallery thumbnail tap and closes on swipe-down
  4. Gallery pivot shows 3 sections: Moments · People · Files (stub content)
  5. Camera bottom bar shows gallery icon · capture button · face-scan icon with mode labels (video · voice · contact)
**Plans**: 2 plans

Plans:
- [ ] 02-01: Tab Navigator + stub screens (Camera · Moments · People · Maps, Settings hamburger)
- [ ] 02-02: Camera screen layout + Gallery bottom sheet scaffold (Moments · People · Files pivot, open/close gesture)

### Phase 3: Camera Capture Path
**Goal**: Full camera capture flow on device. Viewfinder live. Capture → GPS + weather auto-attach → face detection → face picker → person confirm/create → moment saved. E2E-01 through E2E-05 pass manually.
**Depends on**: Phase 2
**Requirements**: R-CAM-01, R-CAM-02, R-CAM-03, R-CAM-04, R-CAM-05, R-CAM-06, R-CAM-07, R-CAM-08, R-CAM-09, R-CAM-10
**Success Criteria**:
  1. E2E-01 (single face, new person) works end-to-end including GPS + weather attached
  2. E2E-02 (single face, existing match) works including metadata
  3. E2E-03 (multiple faces, group moment) creates correct moment_people records
  4. E2E-05 (no face) creates moment with GPS + weather, zero moment_people
  5. Moment row visible in sqlite3 with lat/lon, weather_temp, weather_condition populated
  6. Voice mode accessible from camera bottom bar — records and creates moment
**Plans**: 4 plans

Plans:
- [ ] 03-01: Live viewfinder + camera bottom bar (gallery thumbnail, capture button, face-scan, mode switcher)
- [ ] 03-02: GPS + weather auto-attach service (location, Open-Meteo, GeocoderModule for place name, DB migration for new columns)
- [ ] 03-03: Face detection → confirm flow → MomentCaptureService.capture() atomic write with all metadata
- [ ] 03-04: Voice mode capture branch — GPS + weather attach, source=voice moment save (R-CAM-10 gap closure)

### Phase 4: Moments Tab + Moment Detail
**Goal**: Moments tab has working Today · Calendar · Planner pivot with real data. Today shows live weather, today's moments, upcoming events. Moment detail page shows full rich view. Planner shows streak + heatmap + drift alerts.
**Depends on**: Phase 3
**Requirements**: R-MOM-01, R-MOM-02, R-MOM-03, R-MOM-04, R-MOM-05, R-MOM-06, R-MOM-07, R-MOD-01, R-MOD-02, R-MOD-03, R-MOD-04, R-MOD-05, R-MOD-06, R-DATE-01, R-DATE-02, R-DATE-03, R-DATE-04
**Success Criteria**:
  1. Today section shows current weather (city + temp + condition), today's moments, next event
  2. Calendar section renders grid; tapping a day shows moments from that day
  3. Planner section shows streak (social + solo), 28-day heatmap, drift alerts
  4. Moment detail opens from any moment card — shows weather, location, people chips, map snippet, notes, type
  5. Split moment creates two sibling moment records
  6. Recurring pattern suggestion appears after 3 moments with same note pattern
**Plans**: 3 plans

Plans:
- [ ] 04-01: Moments tab pivot shell — Today · Calendar · Planner with real DB queries
- [ ] 04-02: Moment Detail page — full rich view, split moment, reassign people, "where they went" path
- [ ] 04-03: Planner section — streak counter, heatmap, drift alerts, recurring pattern detection + suggestion

### Phase 5: People Tab + Voice Capture
**Goal**: People tab shows cluster + contacts. Person profile has moment history and shared location mini-map. Voice capture path works end-to-end.
**Depends on**: Phase 3
**Requirements**: R-PEOPLE-01, R-PEOPLE-02, R-PEOPLE-03, R-PEOPLE-04, R-PEOPLE-05, R-VOICE-01, R-VOICE-02, R-VOICE-03, R-VOICE-04, R-VOICE-05, R-VOICE-06, R-TYPE-01, R-TYPE-02, R-TYPE-03, R-TYPE-04
**Success Criteria**:
  1. Cluster view renders with correct visual encoding (size, border color, opacity, distance from center)
  2. Person profile shows moment photos, last seen, special dates, "Where we've been together" mini-map
  3. E2E-04 (voice: "had dinner with Aarav tonight") passes — moment created, Aarav linked
  4. Type inference correct for dinner, gym, call types
**Plans**: 3 plans

Plans:
- [ ] 05-01: People tab — cluster view + contacts list + navigation to profile
- [ ] 05-02: Person profile — moment history, special dates, "where we've been" mini-map
- [ ] 05-03: Voice capture — STT, type inference, person name extraction + fuzzy match, MomentCaptureService

### Phase 6: Maps Tab + Calendar + Place Resolver
**Goal**: Maps tab shows OSM life map. Filter by person works. Calendar events appear in Today section. Share intent from Google Maps resolves to a moment.
**Depends on**: Phase 4
**Requirements**: R-MAPS-01, R-MAPS-02, R-MAPS-03, R-MAPS-04, R-MAPS-05, R-MAPS-06, R-CAL-01, R-CAL-02, R-CAL-03, R-CAL-04, R-PLACE-01, R-PLACE-02, R-PLACE-03, R-PLACE-04
**Success Criteria**:
  1. OSM map renders with all moment pins; works offline after first tile download
  2. Tapping a pin slides up the moment card
  3. Filter by person narrows pins correctly
  4. Calendar events appear in Moments tab Today section after READ_CALENDAR granted
  5. Google Maps share intent resolves to lat/lng and pre-fills capture
**Plans**: 3 plans

Plans:
- [ ] 06-01: Maps tab — OSM map, moment pins, cluster, filter bar, pin → moment card slide-up
- [ ] 06-02: Calendar integration — CalendarProxy impl, event strip in Today, event-end notification nudge
- [ ] 06-03: Place resolver chain — GoogleMapsResolver, Nominatim fallback, share intent receiver

### Phase 7: Gallery Ingestion, Memory Generation & Intelligence
**Goal**: Full feature completeness. Device gallery scanned. Memory editor generates shareable video. All 6 smart notification scenarios fire. Proximity detection works between two devices.
**Depends on**: Phase 4
**Requirements**: R-GAL-01, R-GAL-02, R-GAL-03, R-GAL-04, R-GAL-05, R-MEM-01, R-MEM-02, R-MEM-03, R-MEM-04, R-MEM-05, R-NOTIF-01, R-NOTIF-02, R-NOTIF-03, S-NOTIF-01, S-NOTIF-02, S-NOTIF-03, S-NOTIF-04, S-NOTIF-05, S-NOTIF-06, R-PROX-01, R-PROX-02, R-PROX-03, R-PROX-04, R-PROX-05, R-PROX-06, R-PROX-07, R-PROX-08, R-SUGGEST-01, R-SUGGEST-02, R-SUGGEST-03, R-SUGGEST-04
**Success Criteria**:
  1. Gallery ingestion creates moments from device photos with EXIF GPS
  2. Memory editor generates shareable MP4 (max 60s, 3 presets)
  3. All 6 notification scenarios fire correctly on device
  4. Proximity detection: two test devices at same venue detect each other
**Plans**: 4 plans

Plans:
- [ ] 07-01: Gallery ingestion — WorkManager scan, quality/meme filter, face clustering, EXIF extraction
- [ ] 07-02: Memory generation — eventful day scorer, session grouping, memory editor, MP4 export
- [ ] 07-03: Smart notifications — all 6 scenarios, WorkManager schedule, per-type Settings toggle
- [ ] 07-04: Proximity detection + activity suggestions — GeofenceModule, BleProximityModule, suggestion sheet
