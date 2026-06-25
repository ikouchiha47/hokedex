---
created: 2026-06-25
status: locked
---

# hokédex — Wireframe Spec (direction-d v5)

## Navigation

**3-tab bottom bar: Home · Moments · People**

Maps is a pivot inside Moments — not a tab. Settings accessible from topbar icon.

---

## Tab: Home (Camera)

Full-screen capture tab. Four modes on mode bar:

| Mode | Viewfinder area | Capture button |
|------|----------------|----------------|
| Photo | Live camera viewfinder, face box + scan line overlay | White circle → auto-saves moment + GPS + weather → navigates to Moments Timeline |
| Local | Dark bg, gallery icon, "Pick from gallery" | Opens system gallery picker → ShareIntakeScreen |
| Voice | Dark bg, mic orb (idle) or animated waveform (recording) | Red mic: tap = toggle hands-free, hold = push-to-talk |
| Contact | New contact form (name, phone, handle, NFC stub, QR stub) | Save Contact → People tab |

Mode bar: mode pills row above, [gallery thumbnail] · [capture btn] · [scan-face btn] below.

---

## ShareIntakeScreen

Shown after Local mode gallery pick.

**State: model ready**
- Photo preview
- Save as Moment (primary)
- Add Contact → SearchResultScreen (secondary)
- Discard (ghost)

**State: model not downloaded**
- Photo preview
- "Face model not downloaded" warning
- Save as Moment (primary)
- Download → Settings (secondary, red outline)
- Discard (ghost)
- On return from Settings: useFocusEffect re-checks → if ready, shows full action set

---

## SearchResultScreen (Add Contact flow)

- Face crop from photo shown as search seed (top)
- Text search bar + image search icon (swap photo)
- "Face matches" section: results ranked by % confidence
- "All contacts" section below
- "Create new contact" row at bottom
- Selecting existing → links photo moment to that person
- Create new → ContactForm inline or new screen

---

## Tab: Moments

### Pivots: Timeline · Calendar · Insights · Map

---

### Moments — Timeline pivot

Instagram-style chronological audit log of your life. Continuous scroll. No "Today" section header — date separators are subtle inline chips (WhatsApp-style) between days.

**Level-based card display** (driven by eventfulness scorer — planned, not yet built):

| Level | Trigger | Card layout |
|-------|---------|-------------|
| 1 — Compact | Single moment in session | Small card: no photo or tiny thumb, note text, chips |
| 2 — Carousel | 2–3 moments in session | Horizontal photo carousel + note + people chips |
| 3 — Big day | 4+ moments in session | Full-width cover photo, count badge (+N), people chips, place |
| 4 — Featured | High face-match rate + many people in session | Hero card: large cover, prominent people avatars, weather, place |

Cards promote/demote as background worker adds more moments to a session (RegroupService re-clusters, FaceProcessingQueue adds face matches).

Layout toggle (top right): list ↔ map pins view.

**Moment detail / show page** (tap any card):
- Full media viewer: photos, video, voice playback, notes
- People chips (tap → person profile)
- Weather + place + time
- Add more: photo / video / voice / note (can add later, not just at capture time)
- Manual group: bundle this moment with another
- Split moment: divide into two
- Edit note

---

### Moments — Calendar pivot

- Calendar grid (month view)
- Days with moments highlighted (dot or fill)
- Upcoming events strip below calendar
- Birthdays pulled from People (person_dates table)
- Planned meetups shown as events
- Recurring events

**Create meetup flow:**
- Title, date/time, people (select from contacts)
- Recurring toggle
- Share link (generates invite)
- Event show page: participants, location, countdown

**Event show page (planned meetup):**
- Title, time, participants with avatar chips
- Live Map: real-time location of participants who shared
- Seamless switch to Bluetooth proximity when nearby (BleProximityModule)
- "Who's here" list updates as people arrive

---

### Moments — Insights pivot

Backward-looking analytics. Replaces what was called "Planner".

- **Activity streak** — social streak + solo streak counter
- **28-day heatmap** — capture frequency
- **Drift alerts** — people not seen in >21 days (configurable)
- **People frequency** — who you see most (bar/line chart, 90-day window)
- **Tag patterns** — what kind of people (character tags) among regulars
- **Places** — where you've been most; like ❤️ / dislike 👎 a place
- **Place history** — chronological list of locations visited

---

### Moments — Map pivot

- OSM tiles (offline-capable after first download)
- All moment pins on life map
- Tap pin → moment card slide-up
- Filter by person (narrows pins)
- Layout toggle on topbar switches between Timeline list and this map view

---

## Tab: People

- Grid of contacts (avatar, name, last seen)
- Tap → Person profile:
  - Moment history (photos + timeline)
  - Special dates (birthday, anniversary) → feeds Calendar
  - "Where we've been together" mini-map
  - Face embedding confidence
  - Insights: frequency, drift status

---

## Onboarding (first launch)

- App name + one-liner
- Permissions section: Camera, Gallery, Microphone, Location (toggle each)
- Face Detection section (separate, optional): "Download face model · 12 MB · can do later in Settings"
  - Toggle ON → download starts inline with progress bar
- Done → PIN setup → app
- Skip → PIN setup → app (permissions requested later on first use)

---

## Settings

- Face model: download / re-download + progress bar
- PIN lock toggle
- Notifications toggle (per-type later)
- App update check

---

## Screens inventory (needed)

| Screen | Status |
|--------|--------|
| HomeScreen (multi-mode) | ✅ exists |
| MomentsScreen (Timeline pivot) | ✅ exists, needs level-card logic |
| MomentDetailScreen | ❌ missing |
| CalendarScreen (pivot) | ❌ missing |
| EventShowScreen (planned meetup) | ❌ missing |
| InsightsScreen | ✅ exists (old encounters schema, needs moments migration) |
| MapScreen (pivot) | ✅ stub exists |
| PeopleScreen | ✅ stub exists |
| PersonProfileScreen | ❌ missing |
| SearchResultScreen | ✅ exists |
| ShareIntakeScreen | ✅ exists, reworked |
| OnboardingScreen | ✅ exists |
| SettingsScreen | ✅ exists |
| LockScreen / PinSetupScreen | ✅ exists |

---

## Wireframe file

`design/direction-d.html` — rewrite pending (start fresh session).

Flows to show:
1. Onboarding
2. Camera Photo → Moments Timeline (level 1, 2, 3, 4 cards on same screen)
3. Local → Intake (model ready) → SearchResult (face + text search)
4. Local → Intake (no model) → Settings → back → Intake ready
5. Voice → recording → Moments
6. Contact mode → People tab
7. Moments Timeline detail: tap card → MomentDetailScreen
8. Calendar → create meetup → EventShowScreen (live map + BT)
9. Insights pivot
10. Map pivot
