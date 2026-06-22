---
phase: 02-navigation-shell-home-screen
plan: "01"
subsystem: ui
tags: [react-navigation, bottom-tabs, lucide-react-native]
requires:
  - phase: 01-schema-interfaces-conventions
    provides: project conventions, types pattern, lucide-react-native setup
provides:
  - Camera-first 4-tab navigator with tab bar hidden on Camera tab
  - Stub screens for Camera, Moments, and Maps tabs
  - Menu icon in icon barrel for hamburger header
affects: [03-camera-capture-path, 04-moments-tab, 05-people-tab, 06-maps-tab]

tech-stack:
  added: []
  patterns:
    - Tab navigator uses screenOptions function to conditionally hide tab bar per route
    - All icons imported from single barrel export (src/components/icons/index.ts)
    - Stub screens follow consistent pattern (full dark bg, centred text label)

key-files:
  created:
    - src/screens/CameraScreen.tsx
    - src/screens/MomentsScreen.tsx
    - src/screens/MapsScreen.tsx
  modified:
    - src/navigation/types.ts
    - src/navigation/TabNavigator.tsx
    - src/components/icons/index.ts

key-decisions:
  - "Camera tab is first route (default initial route) with tabBarStyle: { display: 'none' } per-route, not globally"
  - "Menu icon replaces Settings icon in header hamburger (lucide-react-native naming)"
  - "Image icon for Moments tab, Map icon for Maps tab — consistent with lucide naming"
  - "No changes to RootNavigator.tsx needed — it already renders TabNavigator via Tabs stack screen"

requirements-completed:
  - R-NAV-01
  - R-NAV-02
  - R-NAV-04
  - R-CONV-05

duration: 2 min
completed: 2026-06-22
---

# Phase 2 Plan 1: Camera-First Navigation Shell

**Rebuilt tab navigator with Camera as default tab, 4-tab routing (Camera · Moments · People · Maps), stub screens for camera/moments/maps, and Settings accessible via header hamburger instead of a bottom tab.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-22T17:10:24Z
- **Completed:** 2026-06-22T17:12:38Z
- **Tasks:** 2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- TabParamList renamed from Home/Timeline/People/Planner to Camera/Moments/People/Maps
- Camera tab set as first/default route with tab bar hidden (`display: 'none'`)
- New stub screens: CameraScreen (full dark bg, centred "Camera" label), MomentsScreen, MapsScreen
- Header hamburger (Menu icon) on all non-Camera tabs navigates to Settings
- Image, Map, and Menu icons added to barrel export in `src/components/icons/index.ts`
- Removed timelineMapRef, TimelineTabScreen wrapper, and all old screen imports (HomeScreen, TimelineScreen, PlannerScreen)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename TabParamList + add Menu icon** - `c666b2f` (feat)
2. **Task 2: Rebuild TabNavigator + create stub screens** - `96fc2a2` (feat)

## Files Created/Modified

- `src/navigation/types.ts` - TabParamList now has Camera, Moments, People, Maps keys
- `src/navigation/TabNavigator.tsx` - Completely rewritten: camera-first, tab bar hidden on Camera, header hamburger for Settings
- `src/components/icons/index.ts` - Added Image, Map, Menu icons
- `src/screens/CameraScreen.tsx` - New stub screen (full dark bg, centred "Camera" label)
- `src/screens/MomentsScreen.tsx` - New stub screen (full dark bg, centred "Moments" label)
- `src/screens/MapsScreen.tsx` - New stub screen (full dark bg, centred "Maps" label)

## Decisions Made

- Camera tab is first route (default initial route) with `tabBarStyle: { display: 'none' }` applied per-route via `screenOptions` function — not globally
- Menu icon from lucide-react-native used for header hamburger instead of the previous Settings icon
- Image icon for Moments tab, Map icon for Maps tab — both added to barrel export
- RootNavigator.tsx required no changes — it already renders TabNavigator via the Tabs stack screen

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- ✅ `npx tsc --noEmit` — zero new type errors (only pre-existing error in HomeScreen.tsx referencing old "Planner" key)
- ✅ `cd android && ./gradlew assembleRelease --no-build-cache` — BUILD SUCCESSFUL
- ⏭️ On-device verification skipped (headless execution)

## Issues Encountered

None.

## Next Phase Readiness

- Navigation shell complete with correct tab identities (Camera · Moments · People · Maps)
- Camera tab is default route with tab bar hidden — ready for 03-camera-capture-path
- Moments, People, Maps tabs have stub screens — ready for their respective phases
- HomeScreen.tsx still references old TabParamList keys (has type error with "Planner") — will be addressed when the Home screen is removed in a subsequent cleanup

---

## Self-Check: PASSED

All 6 modified/created files exist on disk. Both task commits verified in git log. TabParamList contains exactly Camera/Moments/People/Maps keys.

---

*Phase: 02-navigation-shell-home-screen*
*Completed: 2026-06-22*
