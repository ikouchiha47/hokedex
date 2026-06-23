# hokédex — Moments Redesign Plan

## Vision

The app captures **moments** — instances of being with people. A moment can be a photo (face-detected, people auto-tagged) or a voice/text input (AI-parsed, people linked by name). All moments link to people. People link to each other through shared moments. The home screen shows patterns: streaks, drift, top connections, upcoming dates. The graph is a side-effect of the data, not a feature to build separately.

---

## Schema

### New tables

```sql
-- A moment: one event in time, with optional photo
CREATE TABLE moments (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER NOT NULL,
  occurred_at INTEGER NOT NULL,          -- user-editable, defaults to created_at
  type        TEXT,                      -- AI-inferred: dinner|coffee|work|party|gym|call|other
  note        TEXT,                      -- raw voice/text input if no photo
  photo_uri   TEXT,                      -- nullable — moments can exist without photos
  location    TEXT,                      -- optional freeform or lat/lng json {lat,lng,name}
  source      TEXT NOT NULL,             -- 'camera' | 'voice' | 'manual' | 'gallery' | 'tracking'
  session_id  TEXT,                      -- groups moments from the same 30-min/location window
  eventful_score  REAL,                  -- 0.0–1.0, computed at ingest time
  eventful_type   TEXT,                  -- 'social' | 'outing' | 'tracking' | 'mundane'
  status          TEXT NOT NULL DEFAULT 'logged'  -- 'logged' | 'planned'
);

-- Join table: which people were in which moment
CREATE TABLE moment_people (
  moment_id   TEXT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  person_id   TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  confirmed   INTEGER NOT NULL DEFAULT 1,   -- 0 = AI-suggested, not yet confirmed
  PRIMARY KEY (moment_id, person_id)
);

-- Special dates per person (birthday, anniversary, recurring reminders)
CREATE TABLE person_dates (
  id          TEXT PRIMARY KEY,
  person_id   TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,             -- 'Birthday' | 'Anniversary' | user-defined
  month       INTEGER NOT NULL,          -- 1–12
  day         INTEGER NOT NULL,          -- 1–31
  year        INTEGER,                   -- nullable — recurring if null
  remind_days INTEGER NOT NULL DEFAULT 1 -- days before to notify
);
```

### Existing tables kept

- `entries` — becomes "person". No rename needed yet, migrate incrementally.
  - `name` column is nullable — person records can exist without a name (anonymous face cluster)
  - `display_name` computed: `name ?? 'Person ' || substr(id, 1, 4)` (shown in UI until named)
  - New column: `is_self INTEGER DEFAULT 0` — flags the user's own profile photo anchor
- `photos` — still stores face crops per person for embedding.
- `embeddings` — unchanged.
- `tags` / `entry_tags` — kept, applied to moments via `moment_tags` (new).
- `encounters` — **deprecated** in favour of `moments` + `moment_people`. Keep reading old data, stop writing new encounters.

### New join

```sql
CREATE TABLE moment_tags (
  moment_id TEXT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  tag_id    TEXT NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (moment_id, tag_id)
);
```

---

## EARS Requirements

EARS notation:
- **WHEN** [trigger] **the system SHALL** [behaviour]
- **WHILE** [state] **the system SHALL** [behaviour]
- **IF** [condition] **the system SHALL** [behaviour]
- **WHERE** [feature included] **the system SHALL** [behaviour]

---

### 1. Capture — Camera path

**R-CAM-01**
WHEN the user taps the camera button, the system SHALL open the camera and allow the user to take a photo or select one from the gallery.

**R-CAM-02**
WHEN a photo is captured or selected, the system SHALL run face detection and return all detected faces with bounding boxes.

**R-CAM-03**
IF one face is detected with confidence ≥ threshold, the system SHALL present the face picker so the user can confirm or reject the detected face.

**R-CAM-04**
IF multiple faces are detected, the system SHALL present all detected faces in the face picker so the user can select one or more.

**R-CAM-05**
IF no face is detected, the system SHALL still create a moment with no people linked and inform the user.

**R-CAM-06**
WHEN the user confirms one or more faces in the face picker, the system SHALL run embedding for each confirmed face and match against existing person embeddings.

**R-CAM-07**
IF an embedding match is found above similarity threshold, the system SHALL pre-populate the person link with the matched person and prompt for confirmation.

**R-CAM-08**
IF no embedding match is found, the system SHALL prompt the user to create a new person entry or skip.

**R-CAM-09**
WHEN all people are confirmed or skipped, the system SHALL create one `moments` record and one `moment_people` record per confirmed person atomically.

---

### 2. Capture — Voice / text path

**R-VOICE-01**
WHEN the user taps the voice input button, the system SHALL record voice and transcribe to text on-device.

**R-VOICE-02**
WHEN transcription is complete, the system SHALL pass the text to the AI inference layer to extract: people names, event type, time references.

**R-VOICE-03**
WHEN AI extracts one or more person names, the system SHALL fuzzy-match each name against existing person entries and display candidates for confirmation.

**R-VOICE-04**
IF a name does not match any existing person, the system SHALL offer to create a new person entry with that name.

**R-VOICE-05**
WHEN the user confirms the parsed moment, the system SHALL create the `moments` record with `source = 'voice'` and link all confirmed people.

**R-VOICE-06**
IF the user edits the transcription before confirming, the system SHALL re-run AI inference on the edited text.

---

### 3. Moment — Type inference

**R-TYPE-01**
WHEN a moment is created, the system SHALL infer the event type from: time of day, day of week, note text, and location (if available).

**R-TYPE-02**
The system SHALL suggest the inferred type to the user as a pre-selected chip before saving. The user SHALL be able to change it.

**R-TYPE-03**
WHERE location is available, the system SHALL use it as a signal (e.g. gym coordinates → 'gym', restaurant category → 'dinner').

**R-TYPE-04**
WHEN the user manually sets a type, the system SHALL record it and use it as a training signal for future inference for that user.

---

### 4. Moment — Editing and backdating

**R-EDIT-01**
WHEN viewing a moment, the user SHALL be able to edit: occurred_at, type, note, people linked, and tags.

**R-EDIT-02**
WHEN the user changes occurred_at, the system SHALL recompute all streak and pattern data that references that moment.

**R-EDIT-03**
WHEN the user removes a person from a moment, the system SHALL delete the `moment_people` record and update the person's stats.

---

### 5. Person — Special dates

**R-DATE-01**
WHEN viewing a person's profile, the user SHALL be able to add one or more special dates with a label, month, day, and optional year.

**R-DATE-02**
WHEN a special date is within `remind_days` days, the system SHALL send a local push notification with the person's name and the date label.

**R-DATE-03**
IF a special date has a year set, the system SHALL show the number of years elapsed (e.g. "Aarav's birthday — turning 28").

**R-DATE-04**
The home screen SHALL surface upcoming special dates within the next 7 days in a dedicated section.

---

### 6. Home screen — Patterns

**R-HOME-01**
The home screen SHALL show: current streak (days with at least one logged moment), total moments this week, new people this week, and upcoming special dates.

**R-HOME-02**
WHEN the user has at least 28 days of data, the home screen SHALL show a heatmap of moment frequency over the past 28 days.

**R-HOME-03**
The home screen SHALL show the top 5 most-seen people in the last 30 days, ordered by moment count, with a frequency bar.

**R-HOME-04**
WHEN a person has not appeared in any moment for more than `drift_threshold` days (default 21), the home screen SHALL surface them in a "drifting away" section.

**R-HOME-05**
WHEN the streak is broken (no moment logged by midnight), the system SHALL send a local push notification before midnight as a reminder.

---

### 7. Graph view

**R-GRAPH-01**
WHERE the user has at least 2 people with at least one shared moment, the system SHALL show a graph view with people as nodes and shared moments as edges.

**R-GRAPH-02**
Edge weight SHALL be proportional to the number of shared moments between two people.

**R-GRAPH-03**
WHEN the user taps a node, the system SHALL navigate to that person's profile.

**R-GRAPH-04**
WHEN the user taps an edge, the system SHALL show the list of moments shared by those two people.

---

### 8. Notifications

**R-NOTIF-01**
The system SHALL use local notifications only. No data SHALL leave the device for notification purposes.

**R-NOTIF-02**
WHEN the app is opened for the first time, the system SHALL request notification permission with a clear explanation of what notifications will be sent.

**R-NOTIF-03**
The user SHALL be able to disable individual notification types (streak reminder, drift alert, special dates) from settings.

---

## End-to-End Expectation Tests

These are black-box behavioural tests. They describe what a tester or automated harness observes, not implementation details.

---

### E2E-01 — Camera capture, single face, new person

```
GIVEN  the app is open and the collection has 0 people
WHEN   user taps camera → takes a photo of one person → face detected
AND    face picker shows one face → user taps confirm
AND    no embedding match found → user types name "Aarav" → taps Save
THEN   a new person entry "Aarav" exists in the DB
AND    a moment exists linked to Aarav with source = 'camera'
AND    the home screen streak shows 1
AND    Aarav appears in the people list
```

---

### E2E-02 — Camera capture, single face, existing person

```
GIVEN  "Aarav" exists with a stored embedding
WHEN   user taps camera → takes a photo → Aarav's face detected
AND    face picker shows face → user confirms → embedding matches Aarav above threshold
THEN   user is shown "Is this Aarav?" confirmation
AND    user taps Yes
THEN   a new moment is created linked to existing Aarav (no duplicate person created)
AND    Aarav's moment count increments by 1
```

---

### E2E-03 — Camera capture, multiple faces

```
GIVEN  "Aarav" and "Sneha" both exist with stored embeddings
WHEN   user takes a group photo → 2 faces detected
AND    face picker shows both faces → user confirms both
THEN   one moment is created
AND    two moment_people records exist: moment → Aarav, moment → Sneha
AND    the graph view shows an edge between Aarav and Sneha
```

---

### E2E-04 — Voice capture

```
GIVEN  "Aarav" exists as a person
WHEN   user taps voice button → says "Had dinner with Aarav tonight"
AND    transcription completes → AI extracts: people=["Aarav"], type="dinner", time=evening
THEN   user sees confirmation screen: "Dinner with Aarav — just now"
AND    user taps confirm
THEN   moment created: type="dinner", source="voice", linked to Aarav
AND    home screen total this week increments by 1
```

---

### E2E-05 — No face detected

```
GIVEN  user takes a photo of a landscape (no people)
WHEN   face detection returns NO_SUBJECT
THEN   system creates a moment with no people linked
AND    user is shown "No face detected — moment saved without people"
AND    moment exists in DB with photo_uri set and zero moment_people records
```

---

### E2E-06 — Special date reminder

```
GIVEN  "Sneha" has birthday set to July 3
AND    today is July 2
WHEN   midnight passes on July 1 (1 day before, remind_days = 1)
THEN   a local push notification fires: "Sneha's Birthday is tomorrow"
AND    the home screen upcoming dates section shows Sneha's birthday
```

---

### E2E-07 — Drift alert

```
GIVEN  "Rohan" was last seen in a moment 22 days ago
AND    drift_threshold = 21 days
WHEN   the home screen is loaded
THEN   Rohan appears in the "drifting away" section
AND    a push notification was sent at day 21 saying "You haven't seen Rohan in 3 weeks"
```

---

### E2E-08 — Streak

```
GIVEN  user has logged at least one moment every day for 5 consecutive days
WHEN   home screen loads on day 6
THEN   streak counter shows 5
WHEN   user logs a moment on day 6
THEN   streak counter shows 6
WHEN   user does NOT log anything on day 7
THEN   streak counter resets to 0 on day 8
AND    a reminder notification was sent on day 7 before midnight
```

---

### E2E-09 — Graph edge

```
GIVEN  moments exist: [moment-1: Aarav+Sneha], [moment-2: Aarav+Sneha], [moment-3: Aarav+Rohan]
WHEN   user opens graph view
THEN   three nodes visible: Aarav, Sneha, Rohan
AND    edge Aarav–Sneha has weight 2
AND    edge Aarav–Rohan has weight 1
AND    no edge between Sneha and Rohan
```

---

### E2E-10 — Backdate a moment

```
GIVEN  user creates a moment today with occurred_at = 10 days ago
THEN   the heatmap cell for 10 days ago increments
AND    the streak is NOT affected (streak only counts today forward)
AND    the moment appears in the person's timeline at the correct historical position
```

---

## Migration plan

1. **Write new migrations** — add `moments`, `moment_people`, `person_dates`, `moment_tags` tables. Non-destructive: old tables stay.
2. **Backfill** — convert existing `encounters` to `moments` + `moment_people` records. Each encounter becomes one moment linked to one person.
3. **Dual-write period** — new capture writes to `moments` only. Old encounter queries read from both until backfill confirmed complete.
4. **Remove encounters** — once all clients are on new schema version, drop `encounters` reads and eventually the table.

---

## Navigation structure (locked)

| Tab | Name | Core job |
|-----|------|----------|
| 1 | **Home** | Full-bleed animated weather cover (sun/rain/snow/thunderstorm SVG). Event strip: "Today: [event] → Planner" or "Tomrw: [event] → Planner" or hidden if nothing. "What is on?" center label. Single + FAB in center — press to fan 3 icons in circular arc (📞 contact / 🎙 mic / 📷 camera), toggle on/off. Memory card surfaces here if eventful day detected. |
| 2 | **Timeline** | Map default — moments as location pins. Toggle to list: Instagram-style feed, photos prominent, carousel max 4 for group shots. Person-filterable. |
| 3 | **People** | Two sub-views toggled within tab: **Cluster** (relationship intelligence — proximity=recency, opacity=drift, size=frequency, border=health) and **Contacts** (phone-style searchable list, alphabetical, name + context + last seen). Tap any person → profile + timeline + dates. |
| 4 | **Planner** | Streak, heatmap, calendar (tap day → moments from that day), upcoming dates, drift alerts |

**Overflow (not in bottom nav):**
- Memories — accessed from Today card or Timeline ✦ marker
- Settings — hamburger or profile icon top-right

No sharing / pods — private only. Mastodon integration deferred indefinitely.

---

## Gallery ingestion (onboarding + backfill)

**Goal:** on first launch, scan the device photo library to bootstrap relationship history automatically. Solves the cold start problem — app starts full, not empty.

### Pipeline

1. **Filter pass** — reject screenshots (UI chrome detected), memes (text-heavy images via OCR heuristic), blurry/dark/low-res (below quality threshold)
2. **Face detection** — run existing `FaceDetector.kt` over accepted photos
3. **Face clustering** — group embeddings across photos into person clusters (DBSCAN or similar)
4. **User confirms clusters** — "These 47 photos seem to be the same person — who is this?" → creates person entry
5. **EXIF extraction** — pull `DateTimeOriginal` + GPS coordinates per photo → populate `occurred_at` and `location`
6. **Moment creation** — one moment per photo (or per day+people group), linked to confirmed people

### Technical notes

- Runs in a **WorkManager background job** — same pattern as model download retry
- Progress reported via `DeviceEventEmitter` → `NotificationBanner` in Today screen
- Chunked: process 50 photos at a time, checkpoint progress so it survives app restart
- Requires `READ_MEDIA_IMAGES` permission (Android 13+) or `READ_EXTERNAL_STORAGE` (≤12)
- Quality filter threshold: configurable, default rejects bottom 20% by sharpness + exposure
- Meme/screenshot filter: if >40% of image area is text (detected via ML Kit text recognition), reject

### EARS requirements

**R-GAL-01**
WHEN the user launches the app for the first time and grants photo library permission, the system SHALL start a background gallery scan job.

**R-GAL-02**
WHILE the gallery scan is running, the system SHALL show progress in the Today screen notification banner.

**R-GAL-03**
WHEN the scan identifies a face cluster with ≥3 photos, the system SHALL present the cluster to the user for naming before creating a person entry.

**R-GAL-04**
IF the user declines to name a cluster, the system SHALL skip it and create moments without a person link for those photos.

**R-GAL-05**
WHEN a photo has valid EXIF date and GPS data, the system SHALL use them as `occurred_at` and `location` on the created moment.

**R-GAL-06**
IF EXIF date is missing, the system SHALL use the file modification date as a fallback `occurred_at`.

**R-GAL-07**
WHEN a photo is rejected by the quality or meme filter, the system SHALL NOT create a moment for it and SHALL NOT surface it to the user.

**R-GAL-08**
WHEN the gallery scan completes, the system SHALL show a summary: "X moments imported, Y people identified."

---

## Memories — recap generation & smart notifications

### What it is

Proactive, on-device detection of "eventful moments" → auto-group photos by people → generate a short animated video recap → surface it at the right time with the right message. No backend render. No mandatory action from the user — the nudge is contextual, not nagging.

---

### Anonymous person IDs

Face clusters created during gallery ingestion (or camera capture) get a UUID immediately — name is **not required**. The person record exists and links to moments before the user has named them.

- Display name falls back to: "Person A", "Person B" (deterministic from UUID prefix) until named
- User can name at any time from People screen or person profile
- Unnamed people appear in the cluster with a `?` avatar
- Embedding matching still works — if an unnamed cluster later matches a named person, they can be merged
- This means moments can be fully populated (people linked, EXIF date, location) with zero user input on first launch

---

### Temporal grouping hierarchy

Photos and moments are grouped at multiple time grains. Each grain is a different kind of memory.

| Grain | Window | What it represents | Memory type |
|-------|--------|--------------------|-------------|
| Session | 30 min – 2 hrs, same location cluster | One outing / one event | Short clip (10–30s) |
| Day | Same calendar date | A full day | Day recap (30–60s) |
| Week | Within 7 days | A week with someone | Weekly summary |
| Month | Within 30 days | A month of a relationship | Monthly recap |
| Year | Within 365 days | A year with someone | Annual highlight reel |

Grouping is hierarchical — sessions roll up into days, days into weeks, etc. The eventful day scorer operates at **session** and **day** grain. Longer recaps (weekly, monthly, annual) are user-initiated from Timeline, not proactively pushed.

EXIF location coordinates are used to detect same-location clustering within a session (photos taken within ~500m of each other = same outing).

---

### Eventfulness classification (multi-dimensional)

Not all photo bursts are the same kind of event. The scorer produces a **type** alongside a score.

| Type | Signals | Behaviour |
|------|---------|-----------|
| **Social** | ≥2 distinct faces, location variety, time of day = evening/weekend | Memory candidate → notify, offer recap |
| **Personal tracking** | Solo photos, consistent framing, recurring (gym, food log, mirror selfie) | Track as personal series — do NOT push as social memory. Surface in a "Your progress" view later. |
| **Outing** | Single person + location movement + duration > 1hr | Light memory candidate |
| **Mundane** | No faces, no location change, single photo | Score 0 — ignore |

**How personal tracking is detected:**
- Same face (user's own, matched via profile photo or dominant face) appearing consistently
- Low people diversity (same 0–1 people across many photos)
- Similar framing / aspect ratio across sessions (heuristic)
- Recurring time pattern (e.g. 7am every weekday → gym)

Personal tracking photos are tagged `source = 'tracking'` on the moment record. They don't appear in the main Timeline feed by default — they get their own view (deferred to later version).

---

### Memory generation pipeline

1. **Eventful day scorer** (runs every 2–3 hours via WorkManager)
   - Score = weighted sum of: photo count in last N hours, unique people detected, location changes, moment type variety
   - Threshold configurable internally; starts at: ≥3 photos OR ≥2 people OR ≥1 special date match
2. **Face grouping** (best effort)
   - If user has a profile photo → use as anchor; all other faces compared against it to identify "user is in this photo"
   - Group remaining faces by embedding similarity (DBSCAN, same as gallery ingestion)
   - Output: clusters per person, with confidence score
   - User can reorder / merge / split clusters before generating
3. **Video generation** (on-device only)
   - Android WebGL via a WebView if enabled; otherwise fall back to still-frame slideshow with crossfade (Canvas API)
   - Ken Burns effect (pan + zoom) on each photo
   - Transitions: crossfade, slide — no complex compositing
   - Duration: auto (2–4s per photo, max 60s total) or user-trimmed
   - Music: deferred. User can add from social app editors post-export. No in-app music for now.
4. **Output**: MP4 exported to device gallery + shareable via standard Android share sheet

---

### Smart notification system

Notifications are **contextual nudges**, not mechanical reminders. Message and timing adapt to signals.

#### Signal sources

| Signal | How collected |
|--------|--------------|
| Photo burst | ≥2 photos within 30 min window |
| Location moving | GPS delta > threshold while app backgrounded |
| Location stationary | No GPS movement for 2–3 hrs |
| Special date match | `person_dates` table — birthday/anniversary today |
| Time of day | Device clock; bucketed by region heuristic |
| Last moment logged | Time since most recent `moments` record |
| User history | Past engagement rate with nudges (collect, don't act on yet) |

#### Notification scenarios

**S-NOTIF-01 — Photo burst detected**
> Trigger: ≥2 photos within 30 min
> Message: "Seems like an eventful day. Make more memories."
> Action: Opens Today screen

**S-NOTIF-02 — Moving + special date**
> Trigger: Location moving + today is a birthday or anniversary in `person_dates`
> Message: "Looks like you're out on [Name]'s birthday. Want some ideas?"
> Action: Opens activity suggestion sheet

**S-NOTIF-03 — Special date + user historically active**
> Trigger: Birthday/anniversary + user has logged ≥3 moments on this person's past birthday dates
> Message: "It's [Name]'s birthday. Planning something?"
> Action: Opens capture or activity suggestion

**S-NOTIF-04 — Idle + location off**
> Trigger: No moments logged, no location signal, 2–3 hrs inactive
> Time bucketed message (device clock, no region DB yet — use UTC offset):
> - Morning (6–11): "How's your morning going?"
> - Afternoon (11–17): "How's your day going?"
> - Evening (17–22): "How was your day?"
> - Late (22+): silent — no notification
> Action: Opens voice capture directly

**S-NOTIF-05 — End of day recap**
> Trigger: 10 PM device time, eventful day score above threshold, no more photo activity in last 2 hrs
> Message: "You had a good day. Want to make a memory?"
> Action: Opens memory editor with pre-grouped photos

**S-NOTIF-06 — Memory ready**
> Trigger: Background job finished generating a draft memory video
> Message: "Your [date] memory is ready. Tap to edit or share."
> Action: Opens memory editor

---

### Activity suggestion feature

When the app suggests "want some ideas?" it opens a **suggestion sheet**, not a search screen.

#### Structure

- Static curated list, maintained in-app (JSON config, updatable via config fetch later)
- Categories: **Party / Chill / Food / Culture / Outdoor**
- Each suggestion has: label, query template per platform, deeplink scheme

#### Platforms (user picks one or more)

| Platform | How |
|----------|-----|
| Google Maps | `https://maps.google.com/?q={query}+near+me` |
| Google Search | `https://www.google.com/search?q={query}` |
| Instagram | `instagram://explore/search?q={query}` (deeplink, fallback to web) |
| Zomato | `zomato://search?q={query}` (deeplink, fallback to web) |

Query is constructed from: category + occasion + (location city if available).

Example: birthday + food + Bengaluru → "birthday dinner restaurants Bengaluru"

#### EARS

**R-SUGGEST-01**
WHEN the activity suggestion sheet opens, the system SHALL show ≥3 category options relevant to the detected occasion.

**R-SUGGEST-02**
WHEN the user selects a category and platform, the system SHALL construct the query and open the platform via deeplink or web fallback.

**R-SUGGEST-03**
WHERE location is available, the system SHALL append the city name to the query.

**R-SUGGEST-04**
WHERE location is unavailable, the system SHALL omit location from the query and NOT use "near me."

---

### Memory editor screen

Accessed from: Today card, Timeline eventful-day marker (✦), or notification tap.

- Fullscreen video preview (auto-plays, looping)
- Top overlay: **Edit** | **Share** buttons
- Edit mode:
  - Photo strip at bottom — drag to reorder, tap to remove
  - Face group chips — tap to filter to one person's photos
  - Trim handle on timeline
- Share: Android share sheet → any installed app

---

### Where it surfaces in the app

| Location | How |
|----------|-----|
| **Today screen** | Card appears when draft memory exists: "You had an eventful day — [preview thumbnail]. Edit or share." |
| **Timeline calendar** | Eventful days get a ✦ marker; tap → day view has "Create memory" at top |
| **Notifications** | System notifications for S-NOTIF-01 through S-NOTIF-06 above |

---

## Parallel tracks (post interface lock)

| Track | Owns | Depends on |
|-------|------|------------|
| DB | migrations, moment/person_dates/moment_people queries | Schema only |
| ML | face detection unchanged, embedding unchanged | Nothing new |
| AI inference | type inference, voice parsing, name extraction | moment types contract |
| Camera flow | updated capture → moment creation | DB queries + ML |
| Voice flow | voice input → AI parse → moment creation | AI inference + DB |
| Gallery ingestion | WorkManager job, filter pass, face clustering, EXIF extraction | ML + DB queries + permissions |
| Today screen | weather, mood check-in, capture entry point, memory card, banner | DB queries |
| Timeline screen | chronological feed, calendar grid (✦ markers), map view, person filter | DB queries |
| People screen | cluster, list, person profile, special dates | DB queries |
| Planner screen | streak, drift alerts, upcoming dates, heatmap | DB queries |
| Smart notifications | eventful day scorer, all 6 notification scenarios, WorkManager schedule | moment queries + person_dates + location |
| Memory generation | face grouping, WebGL/Canvas video render, memory editor, share sheet | ML + DB + gallery |
| Activity suggestions | static category list, query builder, deeplink resolver | person_dates + location |

---

## Calendar integration

Read upcoming events from the device calendar to pre-fill moments and trigger contextual nudges.

### Approach
Android `CalendarContract` content provider — no OAuth, no Google Cloud project, no API keys. Requires `READ_CALENDAR` permission. Works with any calendar synced to the device (Google Calendar, Samsung, etc.). Read-only.

### Flow
1. On first launch (alongside gallery + location permission): ask for `READ_CALENDAR` — optional, skippable
2. Background job polls `CalendarContract.Events` for events in the next 7 days
3. After an event end time passes: nudge the user — "How was [event title]? Want to log it?"
4. Moment pre-filled: `type` inferred from event title, `occurred_at` = event start, `people` matched from attendee names against existing person entries, `location` from event location field

### EARS

**R-CAL-01**
WHEN the user grants `READ_CALENDAR` permission, the system SHALL read upcoming events for the next 7 days and store them locally for nudge scheduling.

**R-CAL-02**
WHEN a calendar event's end time passes, the system SHALL send a local notification: "[Event title] — want to log a moment?"

**R-CAL-03**
WHEN the user taps the calendar nudge, the system SHALL open moment capture pre-filled with: inferred type, occurred_at = event start, people matched from attendee names, location from event location field.

**R-CAL-04**
IF the user dismisses the nudge, the system SHALL NOT re-notify for that event.

**R-CAL-05**
WHERE location is present in the calendar event, the system SHALL attempt to resolve it to lat/lng via Nominatim and pre-fill the moment location.

---

## Place resolver — share sheet + location sources

All place sources resolve to `{lat, lng, name}` and are stored on the moment. Display is always OSM.

### Resolver map

| Source | Region | Method |
|--------|--------|--------|
| Google Maps share URL | Global | HTTP HEAD → follow redirect → parse `@lat,lng` from final URL |
| Zomato share URL | India | Parse restaurant slug → scrape page for coordinates |
| Swiggy share URL | India | Parse URL → scrape for coordinates |
| TheFork / Iens share URL | Europe | Parse restaurant ID from URL → TheFork public page for lat/lng |
| Wolt share URL | Northern/Eastern EU | Parse URL → scrape coordinates |
| OpenTable share URL | UK/Global | Parse URL → scrape coordinates |
| Manual search | Global | Nominatim (OSM) free text search → lat/lng |
| EXIF GPS | Global | Already lat/lng — no resolution needed |
| Calendar event location | Global | Nominatim reverse geocode of location string |

### Saved places

```sql
CREATE TABLE saved_places (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  category    TEXT,             -- 'restaurant' | 'cafe' | 'gym' | 'bar' | other
  source      TEXT NOT NULL,    -- 'zomato' | 'google_maps' | 'thefork' | 'manual' | 'exif'
  source_url  TEXT,             -- original share URL for reference
  last_visited_at INTEGER,
  visit_count INTEGER NOT NULL DEFAULT 1
);
```

Saved places surface as quick-picks when logging a moment ("You've been here before").

### EARS

**R-PLACE-01**
WHEN the app receives a share intent containing a supported URL, the system SHALL resolve it to `{lat, lng, name}` and open moment capture pre-filled with the location.

**R-PLACE-02**
WHEN a place is used in a moment, the system SHALL upsert it into `saved_places` and increment `visit_count`.

**R-PLACE-03**
WHEN the user is logging a moment, the system SHALL suggest recently visited places as quick-picks before the user types.

**R-PLACE-04**
IF URL resolution fails (network error or unrecognised format), the system SHALL fall back to a manual text search via Nominatim.

---

## Map — offline tile strategy

The map view shows moment locations as pins on a map. No Google Maps SDK. OSM tiles, downloaded on device.

### Library
`react-native-maps` with **MapLibre** provider (OSM tiles via `@rnmapbox/maps` or `react-native-maplibre-gl`). Tile source: OpenStreetMap raster tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) cached locally via the library's built-in tile cache.

### First-launch flow
1. App requests `ACCESS_FINE_LOCATION` on first open (same prompt as gallery permission)
2. On grant: get current lat/lng, download tiles for zoom levels 10–15 centred on that location (~5–10MB per city area)
3. Download runs as a WorkManager background job, same pattern as gallery scan
4. Tiles stored in app's internal files dir — survives across sessions
5. If permission denied: map view shows placeholder ("Enable location to view map") — moments still record location from EXIF GPS, map just can't render until permission granted

### Tile caching rules
- Cache invalidation: 30 days (OSM tiles don't change often for city-level detail)
- On new city detected (GPS > 50km from last cached centre): download tiles for new area
- User can manually trigger re-download from Settings

### EARS

**R-MAP-01**
WHEN the user grants location permission for the first time, the system SHALL download OSM tiles for zoom 10–15 centred on the current location in a background job.

**R-MAP-02**
WHEN the user opens the map view and tiles are not yet downloaded, the system SHALL show a download progress indicator and render tiles as they arrive.

**R-MAP-03**
WHEN the user's GPS position is more than 50km from the centre of the cached tile area, the system SHALL queue a background tile download for the new area.

**R-MAP-04**
WHEN location permission is denied, the map view SHALL display a prompt to enable location and SHALL NOT show a blank map or crash.

---

## Decisions (closed)

| # | Question | Answer |
|---|----------|--------|
| 1 | Streak reset timezone | Device-local midnight |
| 2 | Drift threshold | 2 months default, user-configurable. Can tighten intelligently based on historical contact frequency. |
| 3 | STT | On-device only. See STT model options below. |
| 4 | AI type inference | Rules-based first (see below). Lightweight model in v2. |
| 5 | Gallery cluster threshold | ≥5 photos = surface for naming. Size encodes frequency. Border color encodes recency: green → amber → red → grey. |
| 6 | Quality filter threshold | Fixed internally. Not in settings for v1. |
| 7 | Solo moment streak | Two separate streaks: **Social** (≥1 other person) and **Solo** (self only). Long-term: introvert / extrovert / ambivert classification from ratio. |
| 8 | Smart notifications | Opt-in on first launch. Per-type toggle in Settings afterwards. |
| 9 | Eventful day score threshold | Internal only — not exposed to user. Tuned over time. |
| 10 | Activity suggestions list | Remote fetch via **Firebase Remote Config** (1M fetches/day free tier). Bundled fallback JSON in app. |
| 11 | Memory video duration | Max 60s. Three style presets: **Energetic** (30s, fast cuts), **Calm** (60s, slow Ken Burns), **Musical** (BPM-selectable, cut on beat). |
| 12 | Time-of-day bucketing | When location on: derive local time from GPS timezone. When off: use device timezone (UTC offset). No region question on setup. |
| 13 | User profile photo | Ask on first launch: take selfie / upload / skip. If skipped, face grouping runs without anchor. User can link their anonymous face cluster later from Settings. |
| 14 | Graph view library | Deferred. |

---

## STT — on-device model options

All on-device, no cloud. Ranked by accuracy vs size tradeoff for Android:

| Model | Size | Accuracy | Notes |
|-------|------|----------|-------|
| **Android SpeechRecognizer API** | 0MB (system) | Good for clear speech | Free, no download, uses Google's on-device model if installed. Requires `RECORD_AUDIO`. Offline capable on Pixel/modern devices. Start here. |
| **Whisper.cpp (tiny.en)** | ~75MB | Better than Android API for accented/noisy speech | OpenAI Whisper ported to C++ via JNI. tiny.en = English only. Fast enough for real-time on modern Android. Use if Android API accuracy is insufficient. |
| **Whisper.cpp (base)** | ~140MB | Multilingual, handles Indian English well | Better for mixed-language input (Hinglish). Worth the size if user base is India-primary. |
| **Vosk** | ~50MB | Decent, lightweight | Good offline STT, simpler integration than Whisper.cpp, slightly lower accuracy. |
| **ML Kit Smart Reply / Entity Extraction** | ~5MB | Not STT — but extracts structured data from text post-transcription | Useful on top of whichever STT you pick. |

**Recommendation**: Start with Android SpeechRecognizer (zero download cost). If accuracy on Indian English / noisy environments is a problem, swap in Whisper.cpp (base) — the 140MB is justified given the app is ML-heavy anyway and Indian English handling is significantly better.

---

## AI type inference — v1 approach

Rules-based keyword matching on voice transcription + ML Kit Image Labeling. No model needed for v1.

### Text rules

| Keywords | Type |
|----------|------|
| dinner, lunch, brunch, restaurant, ate, eating, food | `dinner` |
| coffee, cafe, tea, brew | `coffee` |
| gym, workout, run, jog, yoga, exercise, weights | `gym` |
| meeting, standup, sprint, office, work, zoom, teams, client | `work` |
| party, birthday, celebrate, drinks, bar, pub, club | `party` |
| called, phoned, video call, facetime, rang | `call` |

First match wins. No match → `other`. User can override.

ML Kit **Entity Extraction** (on-device, free) additionally parses: dates, times, addresses from text → populates `occurred_at` and `location` from phrases like "had dinner last Tuesday at Toit."

### Image labels (ML Kit Image Labeling)

Returns labels like `Food`, `Restaurant`, `Gym`, `Sport`, `Drink`. Mapped to same type enum. Used when no text note exists.

### v2 upgrade

Quantized **MiniLM** or **DistilBERT** (~25–66MB). Input = voice transcript + image labels concatenated. Only when rules-based coverage gaps are measured in production.

---

## People cluster — visual encoding

| Dimension | Encodes | Values |
|-----------|---------|--------|
| **Size** | Frequency (last 30 days) | Large ≥8× · Medium 3–7× · Small 1–2× |
| **Border color** | Recency | Green (seen recently) → Amber (cooling) → Red (near drift) → Grey (drifted) |
| **Opacity** | Relationship health (frequency × recency) | 1.0 → 0.3 |
| **Distance from center** | Days since last moment | Closer = more recent |

---

## Proximity & Group Detection

Passive, tiered approach: GPS geofence detects venue arrival → BLE activates only at the venue → nearby Hokedex devices surface each other → user confirms → Moment co-created or linked. No WhatsApp required. No server required. Both sides need only to have opted in.

### Tier model

```
GPS geofence (50–100m radius around saved_place)
    → arrival detected
    → BLE advertising + scanning starts automatically
    → nearby Hokedex device found (same venue_id in advertisement)
    → "Looks like [name] is here too — add to this moment?"
    → user confirms → moment_people record created / group session linked
    → on departure (geofence exit) → BLE stops, session ends
```

### BLE advertisement payload

Fits in a standard BLE advertisement packet (≤31 bytes):

| Field | Value | Notes |
|-------|-------|-------|
| `venue_id` | 8 bytes | SHA-256 of quantised lat/lng (±50m grid) — same for all devices at same venue |
| `session_token` | 8 bytes | Random, generated per session. Rotates on each new group session. No persistent user ID in payload. |

Devices at the same venue see the same `venue_id`. If two devices match on `venue_id` within the BLE scan window, the app surfaces a confirmation prompt. `session_token` is used for deduplication only (prevents double-prompting the same pair).

### Schema

```sql
CREATE TABLE group_sessions (
  id           TEXT PRIMARY KEY,
  venue_id     TEXT NOT NULL,          -- quantised lat/lng hash
  beacon_token TEXT NOT NULL,          -- ephemeral, per session
  started_at   INTEGER NOT NULL,
  ended_at     INTEGER,                -- null while active
  moment_id    TEXT REFERENCES moments(id) ON DELETE SET NULL
);
```

`group_sessions` links to a `moments` record once the user confirms the group. Until then it is a candidate session. A session with no confirmed participants and no `moment_id` after `ended_at` is discarded.

### Android APIs

| Concern | API | Notes |
|---------|-----|-------|
| Venue arrival | `GeofencingClient` (Google Play Services Geofencing API) | Registers geofences around `saved_places`. Low battery — OS delivers arrival/exit events. |
| BLE advertising | `BluetoothLeAdvertiser` | Broadcasts `venue_id` + `session_token`. Requires `BLUETOOTH_ADVERTISE` permission (Android 12+). |
| BLE scanning | `BluetoothLeScanner` | Scans for matching `venue_id` in nearby advertisements. Requires `BLUETOOTH_SCAN` + `ACCESS_FINE_LOCATION`. |
| Background job | `WorkManager` | Starts BLE advertise/scan worker on geofence entry event. Stops worker on exit. |
| Proximity confirmation | Local notification | "Aarav is nearby at [venue]. Add to moment?" — opens group confirmation sheet. |

### Kotlin modules

- `HokedexGeofenceModule.kt` — registers / removes geofences for saved_places; receives entry/exit intents from `GeofenceBroadcastReceiver.kt`
- `HokedexBleModule.kt` — starts/stops BLE advertising and scanning; reports nearby devices to RN via `DeviceEventEmitter`
- Both are bridge-only; logic in `GeofenceManager.kt` and `BleProximityManager.kt`

### Privacy controls

- Opt-in per session — not always-on by default
- BLE advertisement contains no persistent user ID — only the ephemeral `session_token`
- `venue_id` is a quantised hash — reveals only "I am in this 100m² grid cell", not exact GPS
- Session auto-expires: BLE stops on geofence exit or after `MAX_SESSION_DURATION` (4 hours default)
- User can stop any active session from the Home screen session card

### EARS requirements

**R-PROX-01**
WHEN the user opts in to proximity detection and a `saved_place` is within 50–100m, the system SHALL register a geofence for that place via `GeofencingClient`.

**R-PROX-02**
WHEN the device enters a registered geofence, the system SHALL start a `WorkManager` job that begins BLE advertising with `{venue_id, session_token}` and BLE scanning for matching `venue_id` advertisements.

**R-PROX-03**
WHEN a BLE scan detects an advertisement with a matching `venue_id`, the system SHALL create a `group_sessions` record and send a local notification: "[Name] is nearby at [venue] — add to a moment?"

**R-PROX-04**
WHEN the user confirms the proximity prompt, the system SHALL create or update a `moments` record linking both people and set `group_sessions.moment_id`.

**R-PROX-05**
WHEN the device exits the geofence OR the session exceeds `MAX_SESSION_DURATION`, the system SHALL stop BLE advertising and scanning and set `group_sessions.ended_at`.

**R-PROX-06**
WHILE a group session is active, the system SHALL show a session card on the Home screen: "[N] people nearby at [venue]" with an option to end the session.

**R-PROX-07**
IF the user has not opted in to proximity detection, the system SHALL NOT register any geofence or start BLE advertising or scanning.

**R-PROX-08**
The BLE advertisement payload SHALL NOT contain any persistent user identifier. Only `venue_id` (quantised lat/lng hash) and `session_token` (ephemeral, per-session random bytes) SHALL be broadcast.

---

## Open questions (remaining)

1. Graph view library — deferred until that track starts.
2. Intelligent drift threshold: what signals tighten/widen it?
3. Memory video BPM selection UI: slider, presets, or auto-detect from device music?
4. Firebase Remote Config vs Firestore for activity suggestions — Remote Config is simpler (key-value JSON), Firestore allows per-category updates. Which?
5. Whisper.cpp integration: JNI wrapper exists (whispercpp Android) — evaluate build complexity before committing.
6. Proximity opt-in UX: per-session toggle on Home screen, or a global setting with per-venue override?
7. BLE range tuning: 50m too wide for dense urban areas (multiple restaurants in one block)? Consider tightening to 20m + requiring `venue_id` match.
