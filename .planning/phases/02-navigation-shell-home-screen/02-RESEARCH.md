# Phase 02: Camera-First Nav Shell - Research

**Researched:** 2026-06-22
**Domain:** React Navigation v7 bottom tabs, Reanimated v4 bottom sheet, pivot control, camera layout
**Confidence:** HIGH

---

## Summary

Phase 2 replaces the existing 4-tab navigator (Home · Timeline · People · Planner) with a
new 4-tab navigator (Camera · Moments · People · Maps). The Camera tab becomes the default
(index 0) and shows a full-screen viewfinder layout with an overlaid bottom bar. The
existing `HomeScreen`, `PlannerScreen`, and `TimelineScreen` are either deleted or kept as
stubs renamed for the new tabs. No external dependencies need to be installed — everything
required is already present in `package.json`.

The Gallery bottom sheet must be built with RN's `PanResponder` + `react-native-reanimated`
`useSharedValue`/`useAnimatedStyle` because `@gorhom/bottom-sheet` and
`react-native-gesture-handler` are NOT installed. The pivot (Moments · People · Files) is
built with a `ScrollView` + manual `useState` tab tracking — `react-native-pager-view` is
also not installed.

The Windows 10 Mobile design language calls for flat backgrounds, no card shadows, bold
text labels, and an accent-coloured underline indicator on the active pivot item. This is
fully achievable with core RN `StyleSheet` — no additional styling library needed beyond
what is already in the project.

**Primary recommendation:** Wire the new `TabNavigator` first (plan 02-01), then build the
Camera screen layout and Gallery bottom sheet (plan 02-02). Both plans can proceed in
sequence on the same branch because they touch non-overlapping files.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| R-NAV-01 | 4 bottom tabs: Camera · Moments · People · Maps. Camera is default (index 0). | Tab order is controlled by declaration order in `<Tab.Navigator>`. First declared = default. |
| R-NAV-02 | Camera tab shows full-screen viewfinder. No Home screen. No weather cover. | `HomeScreen` is replaced. Camera tab `headerShown: false` + `tabBarStyle: { display: 'none' }` on the Camera screen hides the tab bar for full-bleed layout. |
| R-NAV-03 | Bottom bar on Camera screen: gallery thumbnail · capture button · face-scan button. Mode labels: video · voice · contact above. | Absolute-positioned `View` at bottom of Camera screen — sits inside the tab content area, outside the tab bar. |
| R-NAV-04 | Settings NOT in bottom nav — accessed via hamburger in top-right. | Settings screen stays in `RootStackParamList`. Tab navigator `screenOptions` removes the Settings tab icon. Each tab screen gets a `headerRight` hamburger. |
| R-NAV-05 | Gallery bottom sheet: tap gallery thumbnail or swipe up. Pivot: Moments · People · Files. Swipe down to collapse. | Built with `PanResponder` + Reanimated `useSharedValue`. No third-party sheet library available. |
</phase_requirements>

---

## Standard Stack

### Core (all already installed — zero new dependencies)

| Library | Installed Version | Purpose | Notes |
|---------|------------------|---------|-------|
| `@react-navigation/bottom-tabs` | 7.18.2 | 4-tab navigator | Already in use; just reconfigure |
| `@react-navigation/native-stack` | 7.17.5 | Root stack (Settings, modals) | Unchanged |
| `react-native-reanimated` | 4.4.1 | Bottom sheet animation | `useSharedValue`, `useAnimatedStyle`, `withSpring` |
| `react-native-safe-area-context` | 5.8.0 | Safe area insets for bottom bar | `useSafeAreaInsets` |
| `lucide-react-native` | 1.21.0 | Icons (via `src/components/icons/index.ts`) | Add `Menu`, `Video`, `Contact`, `Image` if not present |

### NOT Available (do not attempt to use)

| Library | Status | Impact |
|---------|--------|--------|
| `@gorhom/bottom-sheet` | NOT installed | Cannot use — build custom sheet |
| `react-native-gesture-handler` | NOT installed | No `GestureDetector`/`Gesture.Pan()` — use `PanResponder` |
| `react-native-pager-view` | NOT installed | No native page swipe — use `ScrollView` pivot |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended File Structure (new/changed files only)

```
src/
├── navigation/
│   ├── types.ts                    # MODIFY: rename tabs
│   ├── TabNavigator.tsx            # REWRITE: new 4 tabs, Camera default
│   └── RootNavigator.tsx          # MINOR: remove dead screen imports if needed
├── screens/
│   ├── CameraScreen.tsx            # NEW: full-screen viewfinder + bottom bar
│   ├── MomentsScreen.tsx           # NEW stub
│   ├── PeopleScreen.tsx            # KEEP: already a stub, no change needed
│   └── MapsScreen.tsx              # NEW stub
└── components/
    ├── GalleryBottomSheet.tsx      # NEW: PanResponder + Reanimated sheet
    ├── GalleryPivot.tsx            # NEW: Moments · People · Files pivot
    └── CameraBottomBar.tsx         # NEW: gallery · capture · face-scan bar
```

### Pattern 1: Camera Tab as Default with Hidden Tab Bar

The tab bar must be hidden on the Camera screen so the viewfinder fills the full display.
In `@react-navigation/bottom-tabs` v7, set `tabBarStyle: { display: 'none' }` in the
screen's `options`. This is verified in the library source at
`src/unstable/NativeBottomTabView.native.tsx` which checks `tabBarStyle?.display === 'none'`.

```typescript
// Source: verified in node_modules/@react-navigation/bottom-tabs/src/types.tsx
// and src/unstable/NativeBottomTabView.native.tsx
<Tab.Screen
  name="Camera"
  component={CameraScreen}
  options={{
    headerShown: false,
    tabBarStyle: { display: 'none' },  // hides tab bar for full-bleed camera
    tabBarIcon: ({ color }) => <Camera color={color} size={ICON_SIZE} />,
  }}
/>
```

The Camera screen then renders its own bottom control bar as an absolutely-positioned
overlay inside the screen content.

### Pattern 2: TypeScript Tab Param List

`types.ts` must be updated. The existing `TabParamList` references `Home`, `Timeline`,
`People`, `Planner` — rename to the new tabs.

```typescript
// src/navigation/types.ts
import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Camera: undefined;
  Moments: undefined;
  People: undefined;
  Maps: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  NewEntry: { prefillImageUri?: string };
  EntryDetail: { entryId: string; prefillImageUri?: string };
  SearchResult: { preloadedImageUri?: string } | undefined;
  Insights: undefined;
  Settings: { onReset?: () => void };
  ShareIntake: { imageUri: string };
};
```

### Pattern 3: Bottom Sheet with PanResponder + Reanimated v4

Since `react-native-gesture-handler` is not installed, the Gallery bottom sheet uses
RN's built-in `PanResponder` for drag tracking and Reanimated's `useSharedValue` /
`useAnimatedStyle` for smooth animation.

Key implementation notes:
- Sheet has two states: COLLAPSED (translateY = SHEET_HEIGHT) and EXPANDED (translateY = 0)
- `PanResponder.onPanResponderMove` updates the shared value directly
- On release (`onPanResponderRelease`), snap to nearest state using `withSpring`
- Reanimated v4 does NOT have `useAnimatedGestureHandler` — that was removed in v3/v4

```typescript
// Source: react-native-reanimated v4.4.1 — useSharedValue, useAnimatedStyle, withSpring
// all confirmed exported from node_modules/react-native-reanimated/src/index.ts
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { PanResponder, useEffect } from 'react-native';

const SHEET_HEIGHT = 480;
const SNAP_THRESHOLD = 80;

export function GalleryBottomSheet({ visible, onClose }: Props) {
  const translateY = useSharedValue(SHEET_HEIGHT);

  const open = () => { translateY.value = withSpring(0, { damping: 20 }); };
  const close = () => { translateY.value = withSpring(SHEET_HEIGHT, { damping: 20 }); };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
    onPanResponderMove: (_, { dy }) => {
      if (dy > 0) translateY.value = dy;
    },
    onPanResponderRelease: (_, { dy }) => {
      if (dy > SNAP_THRESHOLD) { close(); onClose(); }
      else { open(); }
    },
  });

  useEffect(() => {
    if (visible) open(); else close();
  }, [visible]);

  return (
    <Animated.View style={[styles.sheet, animatedStyle]} {...panResponder.panHandlers}>
      {/* drag handle + GalleryPivot */}
    </Animated.View>
  );
}
```

### Pattern 4: Windows 10 Mobile Pivot Control

No native swipe between pivot sections — this is a stub scaffold phase. Implement as a
tab-strip with accent underline. Full swipe paging is deferred to a later phase.

```typescript
// GalleryPivot.tsx
const SECTIONS = ['Moments', 'People', 'Files'] as const;
type Section = typeof SECTIONS[number];
const ACCENT = '#c0170d';

function GalleryPivot() {
  const [active, setActive] = useState<Section>('Moments');

  return (
    <View>
      <View style={styles.pivotStrip}>
        {SECTIONS.map(section => (
          <Pressable key={section} onPress={() => setActive(section)} style={styles.pivotTab}>
            <Text style={[styles.pivotLabel, active === section && styles.pivotLabelActive]}>
              {section.toUpperCase()}
            </Text>
            {active === section && <View style={styles.accentUnderline} />}
          </Pressable>
        ))}
      </View>
      <View style={styles.content}>
        <Text style={styles.stubText}>{active} — coming soon</Text>
      </View>
    </View>
  );
}

// Key style values
// accentUnderline: { height: 2, backgroundColor: ACCENT, borderRadius: 1 }
// pivotLabel inactive: color: 'rgba(255,255,255,0.45)', fontWeight: '600'
// pivotLabelActive: color: '#ffffff'
// No border lines between tabs — spacing + contrast only
```

### Pattern 5: Camera Bottom Bar Layout

The bottom bar is an absolutely-positioned view inside the Camera screen's root `View`
(which is `flex: 1`). It sits above the safe area bottom inset. The tab bar is hidden
via `tabBarStyle: { display: 'none' }` so there is no overlap.

```
CameraScreen root (flex: 1, backgroundColor: '#000')
├── ViewfinderPlaceholder (flex: 1, dark bg + text placeholder)
└── CameraBottomBar (position: 'absolute', bottom: insets.bottom, left: 0, right: 0)
    ├── Mode labels row:  [Video]  [Voice]  [Contact]   <- small caps text, centered
    └── Icon row:  [Gallery thumb]  [Capture btn]  [FaceScan icon]
                    flexDirection: 'row', justifyContent: 'space-around'
```

`CameraBottomBar` receives `onGalleryPress`, `onCapturePress`, `onFaceScanPress` as props.
Mode label taps are internal state only (no navigation at this phase).

### Anti-Patterns to Avoid

- **`tabBarVisible: false`:** This is the React Navigation v5 API. In v7, it does nothing.
  Use `tabBarStyle: { display: 'none' }`.
- **Registering Settings as a tab:** R-NAV-04 forbids it. Settings stays in root stack only.
- **Importing lucide-react-native directly:** R-CONV-05 requires all icon imports go
  through `src/components/icons/index.ts`. New icons must be added there first.
- **`useAnimatedGestureHandler`:** Removed in Reanimated v3/v4. Do not use.
- **Inline mode-switching logic in CameraScreen:** Mode state (video/voice/contact) belongs
  in a hook or the `CameraBottomBar` component, not spread across the screen.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab navigation | Custom animated tab switcher | `@react-navigation/bottom-tabs` v7 | Handles Android back, TypeScript types, accessibility |
| Safe area padding | Hardcoded pixel offsets | `useSafeAreaInsets()` | Bottom inset varies by device (gesture nav vs button nav) |
| Spring animations | Custom easing | `withSpring` from Reanimated | Correct physics, interruptible mid-gesture |

---

## Common Pitfalls

### Pitfall 1: Tab Bar Visible Behind Camera Viewfinder

**What goes wrong:** The tab bar renders below the camera view, creating a black stripe or
clipping the viewfinder to less than full screen.

**Why it happens:** Default bottom-tabs renders the tab bar at all times unless explicitly
hidden per-screen.

**How to avoid:** Set `tabBarStyle: { display: 'none' }` in Camera screen's `options` in
`TabNavigator`. Verified in `@react-navigation/bottom-tabs` v7 source:
`NativeBottomTabView.native.tsx` checks `currentOptions.tabBarStyle?.display === 'none'`.

**Warning signs:** Camera screen does not fill full height; coloured bar visible at bottom.

### Pitfall 2: TypeScript Errors from Stale TabParamList References

**What goes wrong:** After renaming tabs in `types.ts`, existing screens that reference
`TabParamList['Home']` or `BottomTabNavigationProp<TabParamList>` with old key names fail
to compile.

**Why it happens:** `HomeScreen.tsx` imports `TabParamList` and uses it. `TabNavigator.tsx`
references `Home`, `Timeline`, `Planner` by name.

**How to avoid:** Before editing `types.ts`, grep for all files importing `TabParamList`.
Files currently affected: `HomeScreen.tsx`, `TabNavigator.tsx`, `types.ts`.

### Pitfall 3: PanResponder Conflicts with ScrollView Inside Bottom Sheet

**What goes wrong:** The pivot content area cannot scroll — the sheet's `PanResponder`
intercepts the touch before the `ScrollView` receives it.

**Why it happens:** `onMoveShouldSetPanResponder: () => true` captures all vertical moves.

**How to avoid:** Only claim the responder when the `ScrollView` is at `scrollOffset === 0`
AND `dy > dx` (vertical drag). In this stub phase, content does not scroll, so defer this.
Leave a `TODO` comment flagging the conflict for a future phase.

### Pitfall 4: Reanimated v4 API Changes

**What goes wrong:** Code written for Reanimated v2/v3 (e.g., `useAnimatedGestureHandler`,
`withDecay` from worklet context) silently fails or throws in v4.

**Why it happens:** v4 has breaking changes from v2/v3. Most Stack Overflow answers and
blog posts target older versions.

**How to avoid:** Only use APIs confirmed exported from
`node_modules/react-native-reanimated/src/index.ts`: `useSharedValue`, `useAnimatedStyle`,
`withSpring`, `withTiming`, `runOnJS`. Do not use `useAnimatedGestureHandler`.

### Pitfall 5: Menu Icon Not Exported from Icons Index

**What goes wrong:** `<Menu />` icon import from `src/components/icons/index.ts` fails
because `Menu` is not currently in the export list.

**Why it happens:** R-CONV-05 requires all icons go through the index. `Menu` was never
needed before.

**How to avoid:** In plan 02-01, add `Menu` to `src/components/icons/index.ts` before
using it in `TabNavigator.tsx`. Verify it exists in lucide-react-native 1.21.0.

---

## Code Examples

### Full TabNavigator Skeleton

```typescript
// src/navigation/TabNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Clock, Users, MapPin, Menu } from '../components/icons';
import type { TabParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const BG_DARK = '#090a1c';
const ACCENT = '#c0170d';
const TAB_BAR_BG = 'rgba(6,6,14,0.97)';
const TAB_BAR_BORDER = 'rgba(255,255,255,0.06)';
const TAB_INACTIVE = 'rgba(255,255,255,0.4)';
const TAB_BAR_HEIGHT = 58;
const ICON_SIZE = 22;
const HEADER_ICON_SIZE = 20;

export function TabNavigator() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const hamburger = () => (
    <Pressable onPress={() => navigation.navigate('Settings', {})} style={{ marginRight: 16 }}>
      <Menu color={TAB_INACTIVE} size={HEADER_ICON_SIZE} />
    </Pressable>
  );

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: TAB_BAR_BG,
          borderTopColor: TAB_BAR_BORDER,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: TAB_INACTIVE,
        headerStyle: { backgroundColor: BG_DARK },
        headerTintColor: '#ffffff',
        headerShown: true,
        headerRight: hamburger,
      }}
    >
      <Tab.Screen name="Camera" component={CameraScreen}
        options={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ color }) => <Camera color={color} size={ICON_SIZE} />,
        }}
      />
      <Tab.Screen name="Moments" component={MomentsScreen}
        options={{ tabBarIcon: ({ color }) => <Clock color={color} size={ICON_SIZE} /> }}
      />
      <Tab.Screen name="People" component={PeopleScreen}
        options={{ tabBarIcon: ({ color }) => <Users color={color} size={ICON_SIZE} /> }}
      />
      <Tab.Screen name="Maps" component={MapsScreen}
        options={{ tabBarIcon: ({ color }) => <MapPin color={color} size={ICON_SIZE} /> }}
      />
    </Tab.Navigator>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact on Phase 2 |
|--------------|------------------|-------------------|
| `tabBarVisible: false` (RN Navigation v5) | `tabBarStyle: { display: 'none' }` (v7) | Must use v7 API |
| `useAnimatedGestureHandler` (Reanimated v2/v3) | `PanResponder` + `useSharedValue` (v4) | No gesture handler library available |
| Home screen as default tab | Camera screen as default tab (index 0) | First `<Tab.Screen>` declared = default |
| `RadialFAB` + Weather cover | Removed | HomeScreen deleted, no FAB |

---

## Open Questions

1. **CollectionList screen:** Registered in `RootStackParamList` and imported in
   `RootNavigator.tsx`. With `HomeScreen` removed, nothing navigates to it. Keep the
   registration (it's harmless) but confirm whether the import can be removed to avoid
   dead-code lint warnings. Recommendation: keep for now, mark as deferred.

2. **Camera permission prompt:** R-NAV-02 says "full-screen viewfinder (or permission
   prompt)". Neither `react-native-camera` nor `@react-native-camera/camera` is installed.
   The stub uses a dark `View` with "Camera — coming soon" text. No permission request
   needed at this phase.

3. **Menu icon availability:** `Menu` is not currently in `src/components/icons/index.ts`.
   Lucide 1.21.0 should include it, but verify the exact export name before using it.
   Alternative if missing: use `AlignJustify` or `MoreVertical` from the same library.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@react-navigation/bottom-tabs/src/types.tsx` — `tabBarStyle` option verified
- `node_modules/@react-navigation/bottom-tabs/src/unstable/NativeBottomTabView.native.tsx` — `display: 'none'` logic confirmed in source
- `node_modules/react-native-reanimated/src/index.ts` — `useSharedValue`, `useAnimatedStyle`, `withSpring`, `withTiming` exports confirmed; `GoBackGesture` (only gesture export, no PanGesture class)
- `package.json` — exact installed versions: bottom-tabs 7.18.2, reanimated 4.4.1; confirmed absence of gesture-handler, pager-view, gorhom/bottom-sheet
- `src/navigation/types.ts` — current `TabParamList` and `RootStackParamList` shapes
- `src/navigation/TabNavigator.tsx` — existing tab wiring, constants, patterns
- `src/navigation/RootNavigator.tsx` — stack structure, screen registrations
- `src/components/icons/index.ts` — confirmed icon exports; `Menu` NOT currently exported

### Secondary (MEDIUM confidence)
- `src/screens/HomeScreen.tsx` — confirms `RadialFAB`, `WeatherCover` present (deleted in this phase)
- `src/screens/PeopleScreen.tsx` — confirmed already a minimal stub (no changes needed for tab rename)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules with exact versions
- Architecture: HIGH — patterns verified against installed library source code
- Pitfalls: HIGH — verified against library source (tabBarStyle v7, Reanimated v4 exports)
- Bottom sheet approach: MEDIUM — PanResponder + Reanimated pattern is well-established but
  not tested against a running build; the scroll-conflict pitfall is a known issue flagged
  as deferred for a future phase

**Research date:** 2026-06-22
**Valid until:** 2026-07-22
