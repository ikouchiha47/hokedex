# Phase 05 — Mock MVP: Full Screen + Card System

**Status:** planning  
**Goal:** Every screen in the wireframe spec (direction-d v5) exists as a navigable, mock-data-backed shell with correct interfaces — ready to replace stubs with real data one screen at a time.

---

## What We Are Keeping (do not touch)

| Thing | Location | Why kept |
|-------|----------|----------|
| DB migration runner | `src/db/migrations/runner.ts` | Solid, no changes needed |
| `insertMoment` / `getMoment` / `listMomentsInRange` | `src/db/queries/moments.ts` | Already has `type`, `latitude`, `place_name`, `weather_*` columns |
| `moment_faces`, `processing_queue` queries | `src/db/queries/moment_faces.ts`, `processing_queue.ts` | Face pipeline intact |
| `moment_groups` / `moment_group_members` | `src/db/queries/moment_groups.ts` | RegroupService uses these |
| `moment_people`, `person_dates` queries | `src/db/queries/moment_people.ts`, `person_dates.ts` | Needed for people + calendar |
| `app_settings` query + `weather_enabled` seed | `src/db/queries/app_settings.ts`, migration 010 | Weather opt-in already seeded |
| `Avatar` component | `src/components/Avatar.tsx` | Used in card headers |
| `ModeBar`, `CameraBottomBar` | `src/components/` | Home screen modes intact |
| `VoiceRecordingView` | `src/components/VoiceRecordingView.tsx` | Used in VoiceMode |
| All 4 mode components | `src/components/modes/` | PhotoMode, VoiceMode, LocalMode, ContactMode |
| `RegroupService`, `FaceProcessingQueue` | `src/services/` | Background workers intact |
| `MomentCaptureService` | `src/services/MomentCaptureService.ts` | Capture path intact |
| `OnboardingScreen`, `LockScreen`, `PinSetupScreen` | `src/screens/` | Keep, extend weather toggle |
| `SettingsScreen` | `src/screens/SettingsScreen.tsx` | Keep, add weather section |
| `ShareIntakeScreen`, `SearchResultScreen` | `src/screens/` | Keep as-is |

---

## Dead Code → Move to `tmp/`

These will be excluded from the build (remove imports in MomentsScreen):

| File | Reason |
|------|--------|
| `src/components/moments/MomentGroupCarousel.tsx` | Replaced by new card system |
| `src/components/moments/MomentLocationCards.tsx` | Replaced by MapScreen pivot |
| `src/screens/CollectionListScreen.tsx` | Old entry list, superseded by PeopleScreen |
| `src/screens/NewEntryScreen.tsx` | Superseded by ContactMode + PersonProfile |
| `src/screens/EntryDetailScreen.tsx` | Superseded by PersonProfileScreen |

Move to `tmp/dead/` — do not delete, they contain logic to reference.

---

## DB Schema Assessment

### Current `moments` table (after all migrations)
```
moments(
  id, note, occurred_at, place_id, source,
  latitude, longitude, place_name,
  weather_temp, weather_condition,
  type TEXT,          ← capture_type lives here already
  status, created_at
)
```

**`type` column = capture_type.** Values to standardise: `'photo' | 'voice' | 'note' | 'local'`.  
Currently inserted as free-text `source` field in some places — migration 013 will enforce this.

### Gap: `audio_uri` missing
Voice moments store no audio path. Migration 013 adds it.

### Gap: `eventfulness_score` missing on `moment_groups`
Required for Level 1–4 card selection. Migration 013 adds it.

### Gap: `capture_type` not enforced
`type` column exists but has no constraint. Migration 013 adds CHECK constraint via new column with rename.

### Insights supportability (current schema)
| Insight | Query basis | Supported now? |
|---------|-------------|----------------|
| Streak | `moments.occurred_at` GROUP BY date | ✅ yes |
| 28-day heatmap | `moments.occurred_at` count by day | ✅ yes |
| People frequency | `moment_people` JOIN `entries` GROUP BY entry_id | ✅ yes |
| Drift alerts | `moment_people` + MAX(occurred_at) WHERE gap > 21d | ✅ yes |
| Tag patterns | `entry_tags` JOIN `tags` WHERE entry in moment_people | ✅ yes |
| Places history | `moments.place_name` + `saved_places` | ✅ yes |
| Social vs solo streak | `moment_people` count > 0 vs = 0 per day | ✅ yes |

**Insights is fully supportable with current schema. No new tables needed.**

### Weather opt-in
`app_settings.weather_enabled` already seeded `'true'` in migration 010.  
Action: flip default to `'false'` in migration 013 seed (opt-in, not opt-out).

---

## Migration 013 — required additions

```sql
-- capture_type with enforced enum (replaces free-text `type`)
ALTER TABLE moments ADD COLUMN capture_type TEXT
  CHECK(capture_type IN ('photo','voice','note','local'));

-- copy existing type values
UPDATE moments SET capture_type = type WHERE type IS NOT NULL;

-- voice audio path
ALTER TABLE moments ADD COLUMN audio_uri TEXT;

-- eventfulness score on groups (null = not yet scored)
ALTER TABLE moment_groups ADD COLUMN eventfulness_score REAL;

-- planned meetups (EventShowScreen)
CREATE TABLE IF NOT EXISTS planned_events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  occurs_at   INTEGER NOT NULL,
  place_name  TEXT,
  latitude    REAL,
  longitude   REAL,
  recurring   INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS planned_event_people (
  event_id  TEXT NOT NULL REFERENCES planned_events(id) ON DELETE CASCADE,
  entry_id  TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  rsvp      TEXT NOT NULL DEFAULT 'invited',
  PRIMARY KEY (event_id, entry_id)
);

-- flip weather default to opt-in
UPDATE app_settings SET value = 'false'
  WHERE key = 'weather_enabled';
```

---

## Navigation — what needs to change

### Current `RootStackParamList` (types.ts)
Missing: `MomentDetail`, `PersonProfile`, `Calendar`, `PlannedEvent`, `Insights` (exists but not linked).

### New param list
```typescript
// TabParamList — 3 tabs only (Maps removed as tab, it's a pivot)
type TabParamList = {
  Home: undefined;
  Moments: undefined;
  People: undefined;
};

// RootStackParamList additions
type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  MomentDetail:   { momentId: string };         // NEW
  PersonProfile:  { entryId: string };           // NEW
  PlannedEvent:   { eventId: string };           // NEW
  SearchResult:   { preloadedImageUri?: string };
  ShareIntake:    { imageUri: string };
  Settings:       { onReset?: () => void };
  Insights:       undefined;
  // removed: CollectionList, NewEntry, EntryDetail (dead)
};
```

---

## Card Design System — `src/components/cards/`

### Shared interfaces
```typescript
// CardPerson — minimal shape needed to render avatar + name
export interface CardPerson {
  entryId: string;
  name: string;
  photoUri?: string | null;
}

// CardLocation — only present when GPS was on or user added manually
export interface CardLocation {
  placeName: string;
  // lat/lng optional — used only for map pin, not displayed in card
  latitude?: number;
  longitude?: number;
}

// CardFooterProps — identical across all 4 card types
export interface CardFooterProps {
  momentId: string;
  timestamp: number;        // occurred_at
  durationMs?: number;      // endedAt - startedAt for groups
  location?: CardLocation;  // absent = pin not shown
  onDelete?: () => void;
  onNotePress?: () => void;
}
```

### Components to build

```
src/components/cards/
├── CardShell.tsx           — outer border + border-radius + optional accent prop
├── CardHeader.tsx          — avatar icon (red=moment, blue=voice/note) + who + time range
├── CardFooter.tsx          — heart · notes · [location if present] · × + timestamp line
│
├── body/
│   ├── TextBody.tsx        — text content + optional "…See More" truncation
│   ├── PhotoBody.tsx       — horizontal photo strip (level 2, 2–3 photos)
│   ├── CoverBody.tsx       — full-width cover image + "+N moments" badge (level 3)
│   ├── HeroBody.tsx        — hero bg + avatar row overlay + title (level 4)
│   └── VoiceBody.tsx       — transcript text + waveform bars + play/pause
│
├── MomentCard.tsx          — CardShell + CardHeader(red) + <body by level> + CardFooter
├── VoiceCard.tsx           — CardShell + CardHeader(blue/mic) + VoiceBody + CardFooter
├── NotesCard.tsx           — CardShell + CardHeader(blue/note) + TextBody + CardFooter
└── PlanCard.tsx            — CardShell + PlanEventBg + title + CardFooter (no header)
```

### `getCardLevel` service (not a component)
```typescript
// src/services/cards/getCardLevel.ts
// Pure function — no DB, no RN imports. Testable in isolation.
export type CardLevel = 1 | 2 | 3 | 4;

export function getCardLevel(group: {
  momentCount: number;
  photoCount: number;
  peopleCount: number;
  eventfulness_score: number | null;
}): CardLevel {
  // Stub logic for MVP — replace with real scorer later
  if (group.eventfulness_score !== null) {
    if (group.eventfulness_score >= 0.85) return 4;
    if (group.eventfulness_score >= 0.6)  return 3;
    if (group.eventfulness_score >= 0.3)  return 2;
    return 1;
  }
  // Fallback heuristics
  if (group.peopleCount >= 4 && group.photoCount >= 3) return 4;
  if (group.momentCount >= 4)                           return 3;
  if (group.photoCount >= 2)                            return 2;
  return 1;
}
```

### `TimelineItem` — discriminated union fed to FlatList
```typescript
export type TimelineItem =
  | { kind: 'day_chip';  date: string }
  | { kind: 'moment';    group: MomentGroupViewModel; level: CardLevel }
  | { kind: 'voice';     moment: MomentViewModel }
  | { kind: 'note';      moment: MomentViewModel }
  | { kind: 'plan';      event: PlannedEventViewModel }
```

---

## Screens — full inventory

### Screens to keep (wire to new navigation)
| Screen | File | Changes |
|--------|------|---------|
| `HomeScreen` | `screens/HomeScreen.tsx` | None — modes intact |
| `OnboardingScreen` | `screens/OnboardingScreen.tsx` | Add weather toggle + network warning |
| `SettingsScreen` | `screens/SettingsScreen.tsx` | Add weather section with warning |
| `ShareIntakeScreen` | `screens/ShareIntakeScreen.tsx` | None |
| `SearchResultScreen` | `screens/SearchResultScreen.tsx` | None |
| `LockScreen` / `PinSetupScreen` | `screens/` | None |

### Screens to rewrite
| Screen | File | What changes |
|--------|------|--------------|
| `MomentsScreen` | `screens/MomentsScreen.tsx` | Replace carousel with TimelineFeed + 4 pivots |
| `PeopleScreen` | `screens/PeopleScreen.tsx` | Rewrite from stub to real grid |
| `InsightsScreen` | `screens/InsightsScreen.tsx` | Rewrite from old encounters schema to moments schema |

### Screens to create (new files)
| Screen | File | Mock data ok? |
|--------|------|---------------|
| `MomentDetailScreen` | `screens/MomentDetailScreen.tsx` | ✅ mock |
| `PersonProfileScreen` | `screens/PersonProfileScreen.tsx` | ✅ mock |
| `CalendarScreen` | `screens/CalendarScreen.tsx` | ✅ mock |
| `PlannedEventScreen` | `screens/PlannedEventScreen.tsx` | ✅ mock |
| `MapsScreen` (pivot) | `screens/MapsScreen.tsx` | Already stub — wire to pivot |

### Pivot wiring inside MomentsScreen
MomentsScreen owns 4 pivots. Each pivot renders its own sub-component:
```
MomentsScreen
├── pivot = 'timeline'  → <TimelineFeed />
├── pivot = 'calendar'  → <CalendarPivot />   (new, navigates to CalendarScreen)
├── pivot = 'insights'  → <InsightsPivot />   (wraps InsightsScreen content)
└── pivot = 'map'       → <MapPivot />        (wraps MapsScreen content)
```

---

## Weather — Opt-in with network warning

### Onboarding addition (OnboardingScreen)
New section below Face Detection:
```
Weather · optional
  [cloud-sun icon]  Attach weather to moments
                    Sends a network request to Open-Meteo (open-source,
                    no API key, no tracking) when a moment is captured.
  [toggle OFF]
```

### Settings addition (SettingsScreen)
New row under a "Data" section:
```
Weather
  [cloud-sun icon]  Attach weather to moments     [toggle]
                    Network: Open-Meteo · no key · no tracking
```

### Implementation
- Read/write via `getSetting(db, 'weather_enabled')` — already in `app_settings`
- `MomentCaptureService` already accepts weather params — just gate the fetch behind this flag
- No new DB work needed

---

## Build order

**Serial (each blocks the next):**
1. Migration 013 — `capture_type`, `audio_uri`, `eventfulness_score`, `planned_events`
2. Navigation types rewrite — `types.ts` + `TabNavigator.tsx`
3. Card interfaces — `src/components/cards/types.ts` + `getCardLevel` service

**Parallel after step 3:**

| Track A | Track B | Track C |
|---------|---------|---------|
| `CardShell`, `CardHeader`, `CardFooter` | `MomentDetailScreen` (mock) | `PersonProfileScreen` (mock) |
| `body/` components (Text, Photo, Cover, Hero, Voice) | `CalendarScreen` + `PlannedEventScreen` (mock) | `PeopleScreen` rewrite |
| `MomentCard`, `VoiceCard`, `NotesCard`, `PlanCard` | `InsightsPivot` rewrite | `MapPivot` wire-up |
| `DayChip`, `TimelineFeed` | — | — |
| `MomentsScreen` rewrite | — | — |

**Serial after parallel:**
4. Wire weather toggle into Onboarding + Settings
5. Move dead files to `tmp/dead/`
6. Smoke-test: navigate every screen, check no crashes

---

## Mock data contract

Every new screen must accept an optional `__mockData` prop (or use a `USE_MOCK` flag from `src/constants.ts`). This lets the screen render without DB in dev/Storybook. Real DB calls are in a service hook that the screen calls — screens never call DB directly.

```typescript
// Pattern every new screen follows:
function MomentDetailScreen({ route }) {
  const { momentId } = route.params;
  const data = useMomentDetail(momentId); // hook — returns mock if __DEV__ + no DB
  return <MomentDetailView data={data} />;
}
```

Interfaces returned by service hooks are the stable contract. DB implementation behind them can be swapped.

---

## Open questions (need answers before track A starts)

1. **Voice playback** — does `audio_uri` store a file:// path or content:// URI? Android audio recorder output format?
2. **Photos on moments** — `photos` table links to `entries`, not to `moments`. How are moment photos stored currently? (via `source` field pointing to photo path? or a separate `moment_photos` join table needed in migration 013?)
3. **Face match %** — `moment_faces` has no `confidence` score column. Do we need one for SearchResultScreen's "85% match" display?
