# hokédex — Requirements

Camera-first redesign. Sourced from MOMENTS_PLAN.md + UX redesign session 2026-06-22.
EARS notation throughout. Locked decisions noted inline.

---

## P0 — Schema & Data Foundation

### DB Schema

**R-DB-01** — The system SHALL create `moments`, `moment_people`, `person_dates`, `moment_tags`, `saved_places` tables via non-destructive migrations before first app render.

**R-DB-02** — `moments` SHALL have columns: `id`, `occurred_at`, `note`, `type`, `source`, `latitude`, `longitude`, `place_name`, `weather_temp`, `weather_condition`, `status`.

**R-DB-03** — `entries` SHALL gain an `is_self INTEGER DEFAULT 0` column to flag the user's own face anchor.

**R-DB-04** — `encounters` SHALL remain readable but all new writes SHALL go to `moments` + `moment_people`.

**R-DB-05** — All SQL lives in `.sql` files under `src/db/sql/`. No raw SQL in TypeScript. One export per query file.

### Conventions

**R-CONV-01** — All place resolvers SHALL implement the `PlaceResolver` interface and self-register with `PlaceResolverRegistry`.

**R-CONV-02** — All smart feature rules SHALL implement the `Rule` interface and self-register with `RuleRegistry`.

**R-CONV-03** — `CalendarProxy` SHALL be the only module that touches `CalendarContract` or any Android cursor API.

**R-CONV-04** — `MomentCaptureService` SHALL be the single entry point for all moment creation flows (camera, voice, gallery, calendar). Callers never invoke `FaceDetector`, `FaceEmbedder`, or `PlaceResolverRegistry` directly.

**R-CONV-05** — All icons SHALL use `lucide-react-native`. No emoji in UI components.

---

## P1 — Navigation & Shell

**R-NAV-01** — The app SHALL have 4 bottom tabs: **Camera** · **Moments** · **People** · **Maps**. Camera is the default tab (root screen).

**R-NAV-02** — The Camera tab SHALL show a full-screen viewfinder by default. No Home screen. No weather cover on launch.

**R-NAV-03** — The bottom bar on the Camera screen SHALL show: [gallery thumbnail] · [capture button] · [face-scan/live-search button]. Above these: [video] · [voice] · [contact] mode labels.

**R-NAV-04** — Settings SHALL NOT appear in the bottom nav. It is accessed via a hamburger icon in the top-right corner on any screen.

**R-NAV-05** — The Gallery bottom sheet SHALL be accessible by tapping the gallery thumbnail on the Camera screen or swiping up from the bottom. It SHALL show a horizontal pivot: **Moments · People · Files**. Swipe down to collapse.

---

## P1 — Camera Screen (Root)

**R-CAM-01** — Camera SHALL be the root tab and SHALL open the viewfinder immediately on launch (after permissions).

**R-CAM-02** — WHEN the user taps capture, the system SHALL take a photo, auto-attach GPS coordinates, request weather data for that location and time, and run face detection — all before presenting the confirm flow.

**R-CAM-03** — WHEN a photo is taken, the system SHALL run face detection and return all detected faces with bounding boxes.

**R-CAM-04** — IF one or more faces are detected, the system SHALL present the face picker for user confirmation.

**R-CAM-05** — IF no face is detected, the system SHALL still create a moment with `source = 'camera'` and no people linked, and notify the user.

**R-CAM-06** — WHEN the user confirms faces, the system SHALL run embedding for each and match against existing person embeddings.

**R-CAM-07** — IF an embedding match is found above threshold, the system SHALL pre-populate the person link and prompt confirmation ("Is this [name]?").

**R-CAM-08** — IF no embedding match is found, the system SHALL prompt to create a new person or skip.

**R-CAM-09** — WHEN all people are confirmed or skipped, `MomentCaptureService` SHALL atomically create one `moments` record (with lat/lng, place_name, weather_temp, weather_condition) and one `moment_people` record per confirmed person.

**R-CAM-10** — The Camera screen SHALL support a **voice** capture mode: tap the voice label to switch to voice recording. Voice capture follows the same metadata-attach flow (GPS + weather auto-attached).

**R-CAM-11** — The face-scan button SHALL trigger live face recognition against the people DB and surface matching person cards — for quickly finding and tagging people from the camera view.

---

## P1 — Gallery Bottom Sheet

**R-GAL-SHEET-01** — The Gallery bottom sheet SHALL have three pivot sections: **Moments · People · Files**.

**R-GAL-SHEET-02** — Moments pivot SHALL show a chronological feed of moment cards: date, weather icon + temp, place name, photo thumbnail(s), people chips. Tapping a card opens Moment Detail.

**R-GAL-SHEET-03** — People pivot SHALL show the person cluster and contacts list (same as People tab but in capture context for quick tagging).

**R-GAL-SHEET-04** — Files pivot SHALL show a flat grid of all photos on device — a basic gallery without intelligence applied.

**R-GAL-SHEET-05** — The Gallery bottom sheet SHALL support filter chips: events · location · people. Applying a filter narrows the Moments pivot.

**R-GAL-SHEET-06** — The Gallery bottom sheet SHALL have a search bar that searches across moment notes, people names, and place names.

---

## P1 — Moment Detail Page

**R-MOD-01** — Tapping any moment card SHALL open the Moment Detail page full-screen.

**R-MOD-02** — Moment Detail SHALL show in this order: date + weather (icon + temp + condition) + place name header; photo(s) scrollable; map snippet showing the capture location; people chips (named if matched, "Unknown" if not); notes (editable inline); type chip; tags.

**R-MOD-03** — Moment Detail SHALL have a **Split moment** action that lets the user divide photos between two sibling moments. Split creates two `moments` records linked by a `sibling_id` field.

**R-MOD-04** — Moment Detail SHALL let the user reassign people: add, remove, rename an unknown face, or re-link a face to a different person.

**R-MOD-05** — Tapping the map snippet SHALL expand to the Maps tab filtered to that moment's location.

**R-MOD-06** — Moment Detail SHALL show a "Where they went" section IF the moment has GPS and adjacent moments within the same day also have GPS — rendering a mini path on the map snippet.

---

## P1 — Moments Tab (Timeline)

**R-MOM-01** — The Moments tab SHALL have a horizontal pivot with three sections: **Today · Calendar · Planner**.

**R-MOM-02** — **Today section** SHALL show: current weather (city, temp, condition icon); today's moments (photo thumbs, people chips, time); upcoming calendar events for today/tomorrow; streak count.

**R-MOM-03** — **Calendar section** SHALL show a calendar grid. Tapping a day shows moments from that day with their linked calendar events. Days with moments show a dot indicator.

**R-MOM-04** — **Planner section** SHALL show: upcoming/recurring events the user has added manually; intelligent suggestions extracted from moment notes and face matches (e.g. "dinner with Aarav appears weekly — want a reminder?"); streak counter (social + solo); 28-day heatmap; drift alerts (person not seen in >60 days).

**R-MOM-05** — The system SHALL extract recurring patterns from moment descriptions and suggest recurring event reminders. User can confirm or dismiss.

**R-MOM-06** — Eventful days in Calendar section SHALL show a ✦ marker. Tapping it surfaces a "Create memory" action.

**R-MOM-07** — The user SHALL be able to filter the Moments tab by person (applies across all three pivot sections).

---

## P1 — People Tab

**R-PEOPLE-01** — People tab SHALL have two sub-views: **Cluster** and **Contacts**.

**R-PEOPLE-02** — Cluster view SHALL encode: size = frequency (last 30 days), border color = recency (green→amber→red→grey), opacity = relationship health, distance from center = days since last moment.

**R-PEOPLE-03** — Contacts view SHALL be a searchable alphabetical list with name, context, last seen, and moment count.

**R-PEOPLE-04** — Tapping any person SHALL navigate to their profile: photos from moments, moment history, special dates, shared locations on map.

**R-PEOPLE-05** — Person profile SHALL show a "Where we've been together" mini-map using moment GPS data filtered to that person.

---

## P1 — Maps Tab (Life Map)

**R-MAPS-01** — Maps tab SHALL show an OSM map with all moments as pins. This is the user's life geography view — distinct from the map snippet inside Moment Detail.

**R-MAPS-02** — Pins SHALL cluster at zoom-out. Tapping a cluster expands it. Tapping a pin shows a moment card that slides up from the bottom.

**R-MAPS-03** — Maps tab SHALL have a filter bar: by person, by date range, by moment type. Filtering updates pins in real-time.

**R-MAPS-04** — "Where with [person]" filter SHALL be accessible from the People tab profile page and from the Maps filter bar — shows only moments containing that person.

**R-MAPS-05** — WHEN location permission is denied, Maps SHALL show a prompt to enable it and SHALL NOT crash.

**R-MAPS-06** — WHEN the user's GPS position is >50km from the cached tile centre, the system SHALL queue a background tile download for the new area.

---

## P1 — Special Dates

**R-DATE-01** — WHEN viewing a person profile, the user SHALL be able to add special dates: label, month, day, optional year.

**R-DATE-02** — WHEN a special date is within `remind_days` days, the system SHALL send a local push notification.

**R-DATE-03** — IF a special date has a year set, the notification SHALL include years elapsed.

**R-DATE-04** — Today section SHALL surface upcoming special dates within the next 7 days.

---

## P1 — Voice Capture

**R-VOICE-01** — WHEN the user switches to voice mode on the Camera screen, the system SHALL record voice and transcribe on-device using Android SpeechRecognizer.

**R-VOICE-02** — WHEN transcription completes, the system SHALL run rules-based type inference and ML Kit Entity Extraction to extract: people names, event type, time references.

**R-VOICE-03** — WHEN person names are extracted, the system SHALL fuzzy-match against existing person entries and show candidates for confirmation.

**R-VOICE-04** — IF a name has no match, the system SHALL offer to create a new person entry.

**R-VOICE-05** — IF the user edits the transcription, the system SHALL re-run inference on the edited text.

**R-VOICE-06** — WHEN the user confirms, `MomentCaptureService` SHALL create the moment with `source = 'voice'`, auto-attached GPS and weather, and all confirmed people linked.

---

## P1 — Type Inference

**R-TYPE-01** — WHEN a moment is created via voice, the system SHALL infer type from keyword rules (dinner/coffee/gym/work/party/call/other).

**R-TYPE-02** — WHEN a moment is created via camera with no note, the system SHALL run ML Kit Image Labeling and map labels to the type enum.

**R-TYPE-03** — The inferred type SHALL be shown as a pre-selected chip before saving. The user SHALL be able to change it.

**R-TYPE-04** — WHERE location is available, it SHALL be used as an additional signal (restaurant → dinner, gym coordinates → gym).

---

## P1 — Smart Notifications

**R-NOTIF-01** — All notifications SHALL be local only. No data leaves the device.

**R-NOTIF-02** — On first launch, the system SHALL request notification permission with per-type explanation.

**R-NOTIF-03** — The user SHALL be able to toggle each notification type independently from Settings.

**S-NOTIF-01** — Photo burst (≥2 photos within 30 min): "Seems like an eventful day." → Today section.

**S-NOTIF-02** — Location moving + special date today: "Looks like you're out on [Name]'s birthday." → activity suggestion.

**S-NOTIF-03** — Special date + historically active: "It's [Name]'s birthday. Planning something?" → capture or suggestion.

**S-NOTIF-04** — Idle + no location signal 2–3 hrs: time-bucketed message → voice capture.

**S-NOTIF-05** — 10 PM, eventful day above threshold: "You had a good day. Want to make a memory?" → memory editor.

**S-NOTIF-06** — Background memory finished: "Your [date] memory is ready." → memory editor.

---

## P1 — Proximity & Group Detection

**R-PROX-01** — WHEN opted in and a `saved_place` is within 50–100m, the system SHALL register a geofence via `GeofencingClient`.

**R-PROX-02** — WHEN entering a geofence, the system SHALL start BLE advertising `{venue_id, session_token}` and scanning.

**R-PROX-03** — WHEN a matching BLE advertisement is detected, the system SHALL create a `group_sessions` record and notify the user.

**R-PROX-04** — WHEN the user confirms, the system SHALL link both people in a moment.

**R-PROX-05** — WHEN exiting the geofence or session exceeds 4 hours, BLE stops and `ended_at` is set.

**R-PROX-06** — WHILE a session is active, Today section SHALL show a session card.

**R-PROX-07** — IF not opted in, no geofence or BLE SHALL be registered.

**R-PROX-08** — BLE payload SHALL NOT contain any persistent user identifier.

---

## P2 — Gallery Ingestion (Device Photos)

**R-GAL-01** — WHEN the user grants photo library permission, the system SHALL start a background gallery scan (WorkManager, chunked 50 photos).

**R-GAL-02** — WHEN a face cluster with ≥5 photos is identified, the system SHALL present it for naming.

**R-GAL-03** — WHEN a photo has EXIF date + GPS, the system SHALL use them as `occurred_at` and `location`.

**R-GAL-04** — IF EXIF date is missing, file modification date is used as fallback.

**R-GAL-05** — Photos rejected by quality filter (bottom 20% sharpness/exposure) or meme filter (>40% text area) SHALL NOT create moments.

---

## P2 — Calendar Integration

**R-CAL-01** — WHEN `READ_CALENDAR` permission is granted, the system SHALL read upcoming events for the next 7 days via `CalendarProxy`.

**R-CAL-02** — WHEN a calendar event's end time passes, the system SHALL notify: "[Event] — want to log a moment?"

**R-CAL-03** — WHEN the user taps the nudge, the system SHALL open camera capture pre-filled with event context.

**R-CAL-04** — IF dismissed, the system SHALL NOT re-notify for that event.

---

## P2 — Place Resolver

**R-PLACE-01** — WHEN receiving a share intent with a supported URL (Google Maps, Zomato, TheFork, Wolt), the system SHALL resolve it to `{lat, lng, name}` and open capture pre-filled.

**R-PLACE-02** — WHEN a place is used, the system SHALL upsert to `saved_places` and increment `visit_count`.

**R-PLACE-03** — WHEN logging a moment, the system SHALL suggest recently visited places.

**R-PLACE-04** — IF resolution fails, the system SHALL fall back to Nominatim.

---

## P2 — Memory Generation

**R-MEM-01** — The eventful day scorer SHALL run every 2–3 hours via WorkManager.

**R-MEM-02** — WHEN score is above threshold, the system SHALL draft a memory grouping photos into sessions.

**R-MEM-03** — The memory editor SHALL show: video preview, photo strip, face group chips, trim handle.

**R-MEM-04** — WHEN the user taps Share, the system SHALL export MP4 and open the share sheet.

**R-MEM-05** — Video duration max 60s. Three presets: Energetic / Calm / Musical.

---

## P2 — Activity Suggestions

**R-SUGGEST-01** — WHEN the activity suggestion sheet opens, the system SHALL show ≥3 category options relevant to the occasion.

**R-SUGGEST-02** — WHEN the user selects a category + platform, the system SHALL construct a query and open via deeplink.

**R-SUGGEST-03** — WHERE location is available, the system SHALL append city name.

**R-SUGGEST-04** — Suggestion list SHALL use Firebase Remote Config with a bundled JSON fallback.

---

## Non-functional

**R-NF-01** — No data leaves the device. No analytics, no cloud ML APIs, no PII in crash reporting.

**R-NF-02** — All ML runs on-device: face detection, embedding, STT, type inference.

**R-NF-03** — All background jobs use WorkManager. Jobs survive app restart.

**R-NF-04** — Migrations use `executeSync` (DDL only). All other DB calls use async `execute`.

**R-NF-05** — App targets Android 13+ as primary.
