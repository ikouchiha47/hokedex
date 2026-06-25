# Phase 02 — Navigation Shell + Home Screen: Feature Check

## Plan 02-01 + 02-02

### Artifacts

**02-01:**
- [PASS] src/navigation/types.ts — exists, contains "Camera:"
- [PASS] src/navigation/TabNavigator.tsx — exists, contains `display: 'none'`
- [PASS] src/screens/CameraScreen.tsx — exists
- [PASS] src/screens/MomentsScreen.tsx — exists
- [PASS] src/screens/MapsScreen.tsx — exists
- [PASS] src/components/icons/index.ts — exists, contains "Menu,"

**02-02:**
- [PASS] src/screens/CameraScreen.tsx — exists, contains "CameraBottomBar"
- [PASS] src/components/CameraBottomBar.tsx — exists
- [FAIL] src/components/GalleryBottomSheet.tsx — FILE NOT FOUND (deleted in 03-03 per plan)
- [FAIL] src/components/GalleryPivot.tsx — FILE NOT FOUND (deleted in 03-03 per plan)

### Truths

**02-01:**
- [PASS] TabParamList has Camera, Moments, People, Maps keys
- [PASS] Camera tab headerShown false (no header)
- [PASS] Settings referenced in TabNavigator (hamburger navigates to Settings)
- [PASS] Tab bar hidden on Camera tab via `display: 'none'` in tabBarStyle

**02-02:**
- [PASS] Camera screen fills full screen — headerShown false on Camera tab, no gap
- [PASS] CameraBottomBar renders gallery/capture/face-scan buttons (in CameraBottomBar.tsx)
- [FAIL] GalleryBottomSheet.tsx — no longer exists; deleted in plan 03-03
- [FAIL] GalleryPivot.tsx — no longer exists; deleted in plan 03-03
- [FAIL] Swiping down collapses GalleryBottomSheet — component deleted, behaviour unverifiable

### Key Links

**02-01:**
- [PASS] src/navigation/TabNavigator.tsx → CameraScreen via `component={CameraScreen}`
- [PASS] src/navigation/TabNavigator.tsx → types.ts via `TabParamList`

**02-02:**
- [PASS] src/screens/CameraScreen.tsx → CameraBottomBar.tsx via `onGalleryPress`
- [FAIL] src/screens/CameraScreen.tsx → GalleryBottomSheet.tsx via `isOpen` — component deleted in 03-03; no `isOpen` in CameraScreen
- [FAIL] src/components/GalleryBottomSheet.tsx → GalleryPivot.tsx via `GalleryPivot` — file deleted

## Summary

**PASS: 12 / FAIL: 5**

### All FAILs

| # | Check | Detail |
|---|-------|--------|
| 1 | `src/components/GalleryBottomSheet.tsx` | File not found — intentionally deleted in plan 03-03 |
| 2 | `src/components/GalleryPivot.tsx` | File not found — intentionally deleted in plan 03-03 |
| 3 | GalleryBottomSheet `contains: "PanResponder"` | File deleted; unverifiable |
| 4 | CameraScreen `isOpen` prop link to GalleryBottomSheet | Component removed in 03-03 |
| 5 | GalleryBottomSheet → GalleryPivot key link | Both files deleted in 03-03 |

**Note:** All 5 FAILs trace to a single cause — GalleryBottomSheet and GalleryPivot were created in 02-02 and subsequently intentionally deleted in 03-03 (plan 03-03 explicitly deletes them and removes their references from CameraScreen). These are expected deletions, not regressions. The 02-02 UX intent (gallery bottom sheet) was superseded by the queue-first capture redesign.
