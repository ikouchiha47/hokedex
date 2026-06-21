# hokédex — Requirements

Sourced from `MOMENTS_PLAN.md`. EARS notation throughout.
All decisions listed in the plan's Decisions table are locked — do not reopen them.

---

## P0 — Schema & Data Foundation

### DB Schema

**R-DB-01** — The system SHALL create `moments`, `moment_people`, `person_dates`, `moment_tags`, `saved_places` tables via non-destructive migrations before first app render.

**R-DB-02** — `entries` SHALL gain an `is_self INTEGER DEFAULT 0` column to flag the user's own face anchor.

**R-DB-03** — `encounters` SHALL remain readable but all new writes SHALL go to `moments` + `moment_people` (dual-write period → eventual drop).

**R-DB-04** — Existing `encounters` SHALL be backfilled to `moments` + `moment_people` (one moment per encounter, source = 'gallery').

**R-DB-05** — All SQL lives in `.sql` files under `src/db/sql/`. No raw SQL in TypeScript. One export per query file.

### Conventions

**R-CONV-01** — All place resolvers SHALL implement the `PlaceResolver` interface and self-register with `PlaceResolverRegistry`. No branch-on-type in business logic.

**R-CONV-02** — All smart feature rules SHALL implement the `Rule` interface and self-register with `RuleRegistry`.

**R-CONV-03** — `CalendarProxy` SHALL be the only module that touches `CalendarContract` or any Android cursor API.

**R-CONV-04** — `MomentCaptureService` SHALL be the single entry point for all moment creation flows (camera, voice, gallery, calendar). Callers never invoke `FaceDetector`, `FaceEmbedder`, or `PlaceResolverRegistry` directly.

**R-CONV-05** — All icons SHALL use `lucide-react-native`. No emoji in UI components.

---

## P1 — Navigation & Shell

**R-NAV-01** — The app SHALL have 4 bottom tabs: **Home** · **Timeline** · **People** · **Planner**.

**R-NAV-02** — The + FAB on Home SHALL toggle a radial arc of 3 capture icons (contact / mic / camera) on press. Second press collapses it.

**R-NAV-03** — The Timeline tab header SHALL include a map-pin icon button that opens the map view (not a tab — an in-screen toggle or modal).

**R-NAV-04** — **Memories** and **Settings** SHALL not appear in the bottom nav. Memories is accessed from the Today card or Timeline ✦ marker. Settings from a profile/hamburger icon.

---

## P1 — Home Screen

**R-HOME-01** — Home SHALL show a full-bleed animated weather cover (sun / rain / snow / thunderstorm). Animation is CSS/SVG — no external library.

**R-HOME-02** — Home SHALL show an event strip below the weather cover: "Today: [event] → Planner" or "Tomrw: [event] → Planner". If no events in the next 2 days, the strip is hidden.

**R-HOME-03** — Home SHALL show "What is on?" center-aligned as a label when no memory card is active.

**R-HOME-04** — WHEN the eventful day scorer flags a day above threshold, Home SHALL show a memory card: preview thumbnail + "You had an eventful day — Edit or share."

**R-HOME-05** — Home SHALL surface upcoming special dates within the next 7 days.

**R-HOME-06** — WHEN a person has not appeared in any moment for more than `drift_threshold` days (default 60, user-configurable), Home SHALL surface them in a "drifting away" section.

**R-HOME-07** — WHEN the user has ≥28 days of data, Home SHALL show a heatmap of moment frequency over the past 28 days.

**R-HOME-08** — Home SHALL show the top 5 most-seen people in the last 30 days with a frequency bar.

---

## P1 — Camera Capture Path

**R-CAM-01** — WHEN the user taps the camera FAB option, the system SHALL open the camera for capture or gallery selection.

**R-CAM-02** — WHEN a photo is taken or selected, the system SHALL run face detection and return all detected faces with bounding boxes.

**R-CAM-03** — IF one or more faces are detected, the system SHALL present the face picker for user confirmation.

**R-CAM-04** — IF no face is detected, the system SHALL still create a moment with `source = 'camera'` and no people linked, and notify the user.

**R-CAM-05** — WHEN the user confirms faces, the system SHALL run embedding for each and match against existing person embeddings.

**R-CAM-06** — IF an embedding match is found above threshold, the system SHALL pre-populate the person link and prompt confirmation ("Is this [name]?").

**R-CAM-07** — IF no embedding match is found, the system SHALL prompt to create a new person or skip.

**R-CAM-08** — WHEN all people are confirmed or skipped, `MomentCaptureService` SHALL atomically create one `moments` record and one `moment_people` record per confirmed person.

---

## P1 — Voice Capture Path

**R-VOICE-01** — WHEN the user taps the mic FAB option, the system SHALL record voice and transcribe on-device using Android SpeechRecognizer.

**R-VOICE-02** — WHEN transcription completes, the system SHALL run rules-based type inference (keyword matching) and ML Kit Entity Extraction to extract: people names, event type, time references.

**R-VOICE-03** — WHEN person names are extracted, the system SHALL fuzzy-match against existing person entries and show candidates for confirmation.

**R-VOICE-04** — IF a name has no match, the system SHALL offer to create a new person entry.

**R-VOICE-05** — IF the user edits the transcription, the system SHALL re-run inference on the edited text.

**R-VOICE-06** — WHEN the user confirms, `MomentCaptureService` SHALL create the moment with `source = 'voice'` and all confirmed people linked.

---

## P1 — Type Inference

**R-TYPE-01** — WHEN a moment is created via voice, the system SHALL infer type from keyword rules (dinner/coffee/gym/work/party/call/other).

**R-TYPE-02** — WHEN a moment is created via camera with no note, the system SHALL run ML Kit Image Labeling and map returned labels to the type enum.

**R-TYPE-03** — The inferred type SHALL be shown as a pre-selected chip before saving. The user SHALL be able to change it.

**R-TYPE-04** — WHERE location is available, it SHALL be used as an additional signal (restaurant category → dinner, gym coordinates → gym).

---

## P1 — Timeline Screen

**R-TL-01** — Timeline SHALL default to a chronological moments feed: photos prominent, carousel max 4 for group shots, person-filterable.

**R-TL-02** — Timeline SHALL have a map-pin icon in the header. Tapping it opens the OSM map view with moment location pins.

**R-TL-03** — Eventful days in the timeline SHALL show a ✦ marker. Tapping it surfaces a "Create memory" action.

**R-TL-04** — The user SHALL be able to filter the timeline by person.

---

## P1 — People Screen

**R-PEOPLE-01** — People SHALL have two sub-views toggled within the tab: **Cluster** and **Contacts**.

**R-PEOPLE-02** — Cluster view SHALL encode: size = frequency (last 30 days), border color = recency (green→amber→red→grey), opacity = relationship health, distance from center = days since last moment.

**R-PEOPLE-03** — Contacts view SHALL be a searchable alphabetical list with name, context, and last seen.

**R-PEOPLE-04** — Tapping any person (either view) SHALL navigate to their profile: photos, moment history, special dates.

---

## P1 — Planner Screen

**R-PLAN-01** — Planner SHALL show: streak count, 28-day heatmap, calendar (tap day → moments from that day), upcoming special dates, drift alerts.

**R-PLAN-02** — The streak counter SHALL show two values: **Social streak** (≥1 other person logged) and **Solo streak** (self-only moments).

**R-PLAN-03** — Streak SHALL reset at device-local midnight.

---

## P1 — Special Dates

**R-DATE-01** — WHEN viewing a person profile, the user SHALL be able to add one or more special dates: label, month, day, optional year.

**R-DATE-02** — WHEN a special date is within `remind_days` days, the system SHALL send a local push notification.

**R-DATE-03** — IF a special date has a year set, the notification SHALL include the number of years elapsed.

**R-DATE-04** — Home SHALL surface upcoming special dates within the next 7 days.

---

## P1 — Smart Notifications (6 scenarios)

**R-NOTIF-01** — All notifications SHALL be local only. No data SHALL leave the device for notification purposes.

**R-NOTIF-02** — On first launch, the system SHALL request notification permission with per-type explanation.

**R-NOTIF-03** — The user SHALL be able to toggle each notification type independently from Settings.

**S-NOTIF-01** — Photo burst (≥2 photos within 30 min): "Seems like an eventful day. Make more memories." → Today screen.

**S-NOTIF-02** — Location moving + special date today: "Looks like you're out on [Name]'s birthday. Want some ideas?" → activity suggestion sheet.

**S-NOTIF-03** — Special date + user historically active on this date: "It's [Name]'s birthday. Planning something?" → capture or activity suggestion.

**S-NOTIF-04** — Idle + no location signal (2–3 hrs): time-bucketed message (Morning/Afternoon/Evening). Silent after 10 PM. → voice capture.

**S-NOTIF-05** — 10 PM, eventful day score above threshold, no photo activity last 2 hrs: "You had a good day. Want to make a memory?" → memory editor.

**S-NOTIF-06** — Background memory video finished: "Your [date] memory is ready." → memory editor.

---

## P2 — Gallery Ingestion

**R-GAL-01** — WHEN the user grants photo library permission on first launch, the system SHALL start a background gallery scan (WorkManager job, chunked 50 photos).

**R-GAL-02** — WHILE the scan runs, the system SHALL show progress in the notification banner.

**R-GAL-03** — WHEN the scan identifies a face cluster with ≥5 photos, the system SHALL present it for naming.

**R-GAL-04** — IF the user declines to name a cluster, the system SHALL skip it and create moments without person links.

**R-GAL-05** — WHEN a photo has EXIF date + GPS, the system SHALL use them as `occurred_at` and `location`.

**R-GAL-06** — IF EXIF date is missing, the system SHALL use file modification date as fallback `occurred_at`.

**R-GAL-07** — Photos rejected by quality filter (bottom 20% by sharpness + exposure) or meme filter (>40% text area) SHALL NOT create moments.

**R-GAL-08** — WHEN the scan completes, the system SHALL show a summary banner: "X moments imported, Y people identified."

---

## P2 — Calendar Integration

**R-CAL-01** — WHEN the user grants `READ_CALENDAR` permission, the system SHALL read upcoming events for the next 7 days via `CalendarContract` through `CalendarProxy`.

**R-CAL-02** — WHEN a calendar event's end time passes, the system SHALL send a local notification: "[Event title] — want to log a moment?"

**R-CAL-03** — WHEN the user taps the calendar nudge, the system SHALL open moment capture pre-filled with: inferred type, occurred_at = event start, people matched from attendee names, location from event field.

**R-CAL-04** — IF the user dismisses the nudge, the system SHALL NOT re-notify for that event.

**R-CAL-05** — WHERE location is in the calendar event, the system SHALL attempt to resolve it via Nominatim and pre-fill moment location.

---

## P2 — Place Resolver

**R-PLACE-01** — WHEN the app receives a share intent with a supported URL (Google Maps, Zomato, Swiggy, TheFork, Wolt, OpenTable), the system SHALL resolve it to `{lat, lng, name}` via the matching `PlaceResolver` and open moment capture pre-filled.

**R-PLACE-02** — WHEN a place is used in a moment, the system SHALL upsert it to `saved_places` and increment `visit_count`.

**R-PLACE-03** — WHEN the user is logging a moment, the system SHALL suggest recently visited places from `saved_places` as quick-picks.

**R-PLACE-04** — IF resolution fails, the system SHALL fall back to Nominatim free-text search.

---

## P2 — Offline OSM Map

**R-MAP-01** — WHEN the user grants location permission for the first time, the system SHALL download OSM tiles for zoom 10–15 centred on current location via a WorkManager background job.

**R-MAP-02** — WHEN the map view is open and tiles are downloading, the system SHALL show download progress and render tiles as they arrive.

**R-MAP-03** — WHEN the user's GPS position is >50km from the cached tile centre, the system SHALL queue a background tile download for the new area.

**R-MAP-04** — WHEN location permission is denied, the map view SHALL display a prompt to enable location and SHALL NOT crash.

**R-MAP-05** — Moment locations SHALL be rendered as pins on the OSM map. Tapping a pin SHALL open that moment.

---

## P2 — Memory Generation

**R-MEM-01** — The eventful day scorer SHALL run every 2–3 hours via WorkManager. Score = weighted sum of: photo count, unique people detected, location changes, moment type variety.

**R-MEM-02** — WHEN the score is above threshold, the system SHALL draft a memory by grouping photos into sessions (30-min + same-location cluster).

**R-MEM-03** — The memory editor SHALL show: fullscreen video preview (looping), photo strip at bottom (drag to reorder, tap to remove), face group chips for per-person filter, trim handle.

**R-MEM-04** — WHEN the user taps Share, the system SHALL export an MP4 to device gallery and open the Android share sheet.

**R-MEM-05** — Video duration SHALL be max 60s. Three presets: **Energetic** (30s, fast cuts), **Calm** (60s, Ken Burns), **Musical** (BPM-selectable).

**R-MEM-06** — Moments classified as `eventful_type = 'tracking'` (personal tracking photos: solo, recurring framing, consistent time) SHALL NOT appear in the social Timeline feed and SHALL NOT trigger memory generation.

---

## P2 — Activity Suggestions

**R-SUGGEST-01** — WHEN the activity suggestion sheet opens, the system SHALL show ≥3 category options relevant to the occasion (Party / Chill / Food / Culture / Outdoor).

**R-SUGGEST-02** — WHEN the user selects a category + platform (Google Maps, Google Search, Instagram, Zomato), the system SHALL construct a query and open the platform via deeplink or web fallback.

**R-SUGGEST-03** — WHERE location is available, the system SHALL append city name to the query.

**R-SUGGEST-04** — The suggestion list SHALL be fetched from Firebase Remote Config (1M fetches/day free) with a bundled JSON fallback.

---

## P1 — Proximity & Group Detection

**R-PROX-01** — WHEN the user opts in to proximity detection and a `saved_place` is within 50–100m, the system SHALL register a geofence for that place via `GeofencingClient`.

**R-PROX-02** — WHEN the device enters a registered geofence, the system SHALL start a `WorkManager` job that begins BLE advertising with `{venue_id, session_token}` and BLE scanning for matching `venue_id` advertisements.

**R-PROX-03** — WHEN a BLE scan detects an advertisement with a matching `venue_id`, the system SHALL create a `group_sessions` record and send a local notification: "[Name] is nearby at [venue] — add to a moment?"

**R-PROX-04** — WHEN the user confirms the proximity prompt, the system SHALL create or update a `moments` record linking both people and set `group_sessions.moment_id`.

**R-PROX-05** — WHEN the device exits the geofence OR the session exceeds `MAX_SESSION_DURATION` (default 4 hours), the system SHALL stop BLE advertising and scanning and set `group_sessions.ended_at`.

**R-PROX-06** — WHILE a group session is active, Home SHALL show a session card: "[N] people nearby at [venue]" with an option to end the session.

**R-PROX-07** — IF the user has not opted in to proximity detection, the system SHALL NOT register any geofence or start BLE advertising or scanning.

**R-PROX-08** — The BLE advertisement payload SHALL NOT contain any persistent user identifier. Only `venue_id` (quantised lat/lng hash) and `session_token` (ephemeral, per-session random bytes) SHALL be broadcast.

---

## P3 — Graph View

**R-GRAPH-01** — WHERE ≥2 people share at least one moment, the system SHALL show a graph: people as nodes, shared moments as edges.

**R-GRAPH-02** — Edge weight SHALL be proportional to shared moment count.

**R-GRAPH-03** — Tapping a node SHALL navigate to that person's profile.

**R-GRAPH-04** — Tapping an edge SHALL show moments shared by those two people.

*(Graph view library TBD — deferred until this track starts.)*

---

## Non-functional

**R-NF-01** — No data leaves the device. No analytics, no crash reporting with PII, no cloud ML APIs.

**R-NF-02** — All ML runs on-device: face detection, embedding, STT (SpeechRecognizer → Whisper.cpp base if accuracy insufficient), type inference (rules-based → MiniLM in v2).

**R-NF-03** — All background jobs use WorkManager. Jobs survive app restart. Progress reported via DeviceEventEmitter.

**R-NF-04** — Migrations use `executeSync` (DDL only). All other DB calls use async `execute`.

**R-NF-05** — App targets Android 13+ as primary; minimum SDK to be confirmed by build requirements.
