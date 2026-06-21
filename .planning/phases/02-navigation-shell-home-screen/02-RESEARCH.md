# Phase 2: Navigation Shell & Home Screen - Research

**Researched:** 2026-06-21
**Domain:** React Navigation v7 bottom tabs, SVG/CSS animation in React Native, radial FAB, Lucide icons
**Confidence:** HIGH

---

## Summary

The existing codebase uses `@react-navigation/native` v7.3.3 and `@react-navigation/native-stack` v7.17.5 but does NOT have `@react-navigation/bottom-tabs` installed. Adding the bottom tab navigator requires installing that package and restructuring `RootNavigator.tsx` to nest a tab navigator inside the existing stack navigator.

`lucide-react-native` is NOT installed. Phase 1 is expected to create `src/components/icons/index.ts` as a re-export barrel — Phase 2 consumes that barrel and must not import lucide directly in screens.

`react-native-reanimated` v4.4.1 and `react-native-svg` v15.15.5 are already installed. These are the correct tools for the FAB radial animation and the SVG weather cover respectively. No new animation library is needed.

The design mockup (`design/direction-c.html`) is the authoritative visual spec. All pixel values, colors, and animation transforms are taken directly from it.

**Primary recommendation:** Install `@react-navigation/bottom-tabs` v7.x (matching existing nav v7 suite), wrap the four tab screens in a bottom tab navigator nested inside the existing stack, and build the weather cover as a pure `react-native-svg` + `react-native-reanimated` component with no external dependency.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| R-NAV-01 | 4 bottom tabs: Home · Timeline · People · Planner | @react-navigation/bottom-tabs createBottomTabNavigator |
| R-NAV-02 | + FAB toggles radial arc of 3 capture icons, 200ms collapse/expand | react-native-reanimated useSharedValue + withTiming for translate/scale/opacity |
| R-NAV-03 | Timeline tab header includes map-pin icon button (in-screen toggle, not a tab) | Stack screenOptions headerRight prop or custom header component |
| R-NAV-04 | Memories and Settings NOT in bottom nav; Settings via header icon | Top-level stack handles Settings; tabs contain only the 4 screens |
| R-HOME-01 | Full-bleed animated weather cover — sun/rain/snow/storm, SVG/CSS only | react-native-svg Svg/Circle/Rect + reanimated for pulse/fall animations |
| R-HOME-02 | Event strip: Today/Tomrw label + event title → Planner; hidden if no events in 2 days | Pure RN View, service function returns next event or null |
| R-HOME-03 | "What is on?" center-aligned label when no memory card active | Static Text component, rendered conditionally by service result |
| R-HOME-04 | Memory card when eventful day scorer flags threshold: thumbnail + CTA | Conditional render, scorer is a service pure function |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-navigation/bottom-tabs | ^7.x | Bottom tab navigator | Matches existing nav v7 suite; official package |
| react-native-reanimated | 4.4.1 (already installed) | FAB arc animation, weather pulse | Native driver, works on New Architecture |
| react-native-svg | 15.15.5 (already installed) | Weather SVG elements (sun, raindrops) | Already a dependency, zero install cost |
| lucide-react-native | latest (Phase 1 installs) | Tab icons + FAB icons | Locked decision; consumed via src/components/icons/index.ts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-safe-area-context | ^5.8.0 (already installed) | Tab bar safe area insets | Always; prevents tab bar content under home indicator |

### Not Needed
- `react-native-gesture-handler`: not required for simple Pressable-based FAB
- Any third-party weather or animation library: design calls for SVG/CSS — banned by R-HOME-01

**Installation required:**
```bash
npm install @react-navigation/bottom-tabs
```

No native rebuild required — bottom-tabs is JS-only; it uses already-installed `react-native-screens` and `react-native-safe-area-context`.

---

## Architecture Patterns

### Navigator Structure

```
App.tsx
└── RootNavigator (NavigationContainer + Stack.Navigator)
    ├── TabNavigator (screen: "Tabs") ← new
    │   ├── HomeScreen       (tab: Home)
    │   ├── TimelineScreen   (tab: Timeline)
    │   ├── PeopleScreen     (tab: People)
    │   └── PlannerScreen    (tab: Planner)
    ├── NewEntry             (modal/stack push)
    ├── EntryDetail          (stack push)
    ├── Settings             (stack push — NOT a tab)
    ├── SearchResult
    └── ShareIntake
```

The tab navigator is a single screen named `"Tabs"` in the root stack. Navigating to Settings is `navigation.navigate('Settings')` from any tab screen — same as any other modal.

### Pattern 1: Bottom Tab Navigator Setup

**What:** createBottomTabNavigator with custom tabBarIcon, tabBarStyle, and headerRight.
**When to use:** Exactly as defined in R-NAV-01/04.

```typescript
// Source: @react-navigation/bottom-tabs official docs
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator<TabParamList>();

export type TabParamList = {
  Home: undefined;
  Timeline: undefined;
  People: undefined;
  Planner: undefined;
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: 'rgba(6,6,14,0.97)',
          borderTopColor: 'rgba(255,255,255,0.06)',
          height: 58,
        },
        tabBarActiveTintColor: '#c0170d',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} /> }}
      />
      {/* ... remaining tabs */}
    </Tab.Navigator>
  );
}
```

### Pattern 2: Radial FAB with Reanimated

**What:** Three child `Pressable` items positioned at center of FAB container, animated to translated positions on press.
**When to use:** R-NAV-02. The mockup specifies exact translate values.

```typescript
// Source: react-native-reanimated docs — useSharedValue + withTiming
import { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

const expanded = useSharedValue(false);

const contactStyle = useAnimatedStyle(() => ({
  transform: [
    { translateX: withTiming(expanded.value ? -58 : 0, { duration: 200 }) },
    { translateY: withTiming(expanded.value ? -30 : 0, { duration: 200 }) },
    { scale: withTiming(expanded.value ? 1 : 0, { duration: 200 }) },
  ],
  opacity: withTiming(expanded.value ? 1 : 0, { duration: 200 }),
}));
// mic: translateX -21, translateY 54
// camera: translateX 22, translateY -30
```

All three options start collapsed at center (scale 0, opacity 0). FAB center `Pressable` toggles `expanded.value`. The + icon rotates 45deg to X on expand (optional but matches common pattern).

### Pattern 3: SVG Weather Cover

**What:** `react-native-svg` Svg element as full-width fixed-height (200px) cover. Animated elements use `Animated.Value` from `react-native` or reanimated `useSharedValue`.
**When to use:** R-HOME-01.

```typescript
// Source: react-native-svg docs
import Svg, { Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated from 'react-native-reanimated';

// Sun: animated Circle with pulsing shadow via Animated style on wrapping View
// Raindrops: array of Animated.Rect elements with staggered translateY animations
// Clouds: semi-transparent Rect/Path elements
```

Weather state (`'sunny' | 'rainy' | 'snow' | 'thunderstorm'`) is a prop to `WeatherCover`. In Phase 2 this is hardcoded/placeholder (static prop). The actual weather API integration is a later phase.

### Pattern 4: Event Strip Service

**What:** Pure function `getNextEvent(db, today): NextEvent | null`.
**When to use:** R-HOME-02. Strip renders only when function returns non-null.

```typescript
// src/services/homeService.ts
export type NextEvent = {
  label: 'Today' | 'Tomrw';
  title: string;
};

export function getNextEvent(db: DB, today: Date): NextEvent | null {
  // query events within next 2 days
  // return null if none found
}
```

HomeScreen calls `getNextEvent`, renders strip conditionally. No if-logic in the component.

### Pattern 5: Timeline Header with Map Pin

**What:** Custom header for Timeline tab with map-pin icon in `headerRight`. Toggle in-screen (local state in TimelineScreen), not a navigation action.
**When to use:** R-NAV-03.

```typescript
// In Tab.Screen options for Timeline:
options={({ navigation }) => ({
  headerShown: true,
  headerRight: () => (
    <Pressable onPress={() => {/* trigger map toggle via ref or context */}}>
      <MapPinIcon color="#fff" size={20} />
    </Pressable>
  ),
  headerStyle: { backgroundColor: '#090a1c' },
  headerTintColor: '#fff',
})}
```

Because the map toggle is in-screen state, the header button should call a callback exposed by TimelineScreen. Use a `useImperativeHandle` ref or a simple context scoped to the tab.

### Recommended File Structure

```
src/
├── navigation/
│   ├── RootNavigator.tsx      # existing — add Tabs screen
│   ├── TabNavigator.tsx       # NEW — createBottomTabNavigator
│   └── types.ts               # TabParamList + updated RootStackParamList
├── screens/
│   ├── HomeScreen.tsx         # NEW
│   ├── TimelineScreen.tsx     # NEW (placeholder)
│   ├── PeopleScreen.tsx       # NEW (placeholder)
│   └── PlannerScreen.tsx      # NEW (placeholder)
├── components/
│   ├── icons/
│   │   └── index.ts           # Phase 1 output — consumed here
│   ├── WeatherCover.tsx       # NEW — SVG weather animation
│   ├── RadialFAB.tsx          # NEW — FAB + 3 radial options
│   └── EventStrip.tsx         # NEW — event strip row
└── services/
    └── homeService.ts         # NEW — getNextEvent, isEventfulDay
```

### Anti-Patterns to Avoid

- **Inline navigation in tabBarIcon:** Never call `navigation.navigate()` from `tabBarIcon`. Use screen `options` with `tabBarButton` only if customizing touch behavior.
- **Decision logic in HomeScreen:** The `if (nextEvent)` check belongs in `homeService.ts`. HomeScreen receives `nextEvent: NextEvent | null` from the service call and renders accordingly.
- **Flowers as emoji:** The mockup HTML uses emoji flowers in the CSS. The project convention is no emoji. Render flowers as SVG Path or simple colored Circle/Ellipse elements.
- **Absolute positioning FAB over tab bar:** The FAB should be inside the HomeScreen content area, not absolutely positioned over the navigator. The design shows it in the capture area, not overlapping the tab bar.
- **Using `react-native` Animated API instead of reanimated:** On New Architecture, use reanimated v4 `useSharedValue`/`withTiming`. The older `Animated.Value` works but does not run on the UI thread natively.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab bar with icon + label | Custom View with Pressable tabs | createBottomTabNavigator | Handles safe area, active state, accessibility, deep link integration |
| Animated value interpolation | Manual lerp/requestAnimationFrame | reanimated withTiming | Runs on UI thread natively, no JS bridge jank |
| SVG rendering | Canvas/image-based weather art | react-native-svg (already installed) | Vector, resolution-independent, supports animation |

---

## Common Pitfalls

### Pitfall 1: bottom-tabs version mismatch
**What goes wrong:** Installing `@react-navigation/bottom-tabs` v6 when everything else is v7 causes peer dependency errors and type incompatibilities.
**Why it happens:** npm may resolve an older version if not pinned.
**How to avoid:** `npm install @react-navigation/bottom-tabs@^7` — match the major version of `@react-navigation/native`.

### Pitfall 2: Tab bar overlapping content
**What goes wrong:** Content at the bottom of a tab screen is hidden behind the tab bar.
**Why it happens:** Tab bar does not automatically add bottom padding to screen content.
**How to avoid:** Wrap screen content in `<SafeAreaView edges={['bottom']}>` from `react-native-safe-area-context`, or use `useSafeAreaInsets()` to add `paddingBottom`.

### Pitfall 3: Reanimated worklet rules violated
**What goes wrong:** Runtime crash "Calling back into JS from a worklet is not allowed" or similar.
**Why it happens:** Accessing non-serializable JS values (closures, class instances) inside a worklet.
**How to avoid:** `useAnimatedStyle` callbacks must reference only shared values and primitive constants. Pass data as derived shared values, not closures over component state.

### Pitfall 4: RootStackParamList missing `Tabs`
**What goes wrong:** TypeScript errors when navigating from a tab screen to a stack screen (e.g. Settings).
**Why it happens:** `Tabs` is not declared in `RootStackParamList`.
**How to avoid:** Add `Tabs: undefined` to `RootStackParamList` before creating `TabNavigator`.

### Pitfall 5: SVG animation using wrong Animated import
**What goes wrong:** `Animated.createAnimatedComponent` from `react-native` does not work with reanimated v4 shared values.
**Why it happens:** Two separate animation systems.
**How to avoid:** Import `Animated` from `react-native-reanimated`, not `react-native`, and use `createAnimatedComponent` from reanimated.

### Pitfall 6: Weather cover height on different screen sizes
**What goes wrong:** Fixed `height: 200` clips or leaves gaps on non-standard devices.
**Why it happens:** Hardcoded pixel value.
**How to avoid:** Use `Dimensions.get('window').width * 0.54` for a proportional height, or use a constant at file top. Do not hardcode in StyleSheet inline.

---

## Code Examples

### Bottom Tabs Installation and Basic Setup
```typescript
// Source: https://reactnavigation.org/docs/bottom-tab-navigator
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

export type TabParamList = {
  Home: undefined;
  Timeline: undefined;
  People: undefined;
  Planner: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
```

### Reanimated Radial Fan (verified pattern)
```typescript
// Source: https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue
import {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';

const DURATION = 200;
const EASING = Easing.out(Easing.ease);

const expanded = useSharedValue(false);

function makeFanStyle(tx: number, ty: number) {
  return useAnimatedStyle(() => ({
    transform: [
      { translateX: withTiming(expanded.value ? tx : 0, { duration: DURATION, easing: EASING }) },
      { translateY: withTiming(expanded.value ? ty : 0, { duration: DURATION, easing: EASING }) },
      { scale: withTiming(expanded.value ? 1 : 0, { duration: DURATION, easing: EASING }) },
    ],
    opacity: withTiming(expanded.value ? 1 : 0, { duration: DURATION }),
  }));
}
// contact: tx=-58, ty=-30
// mic:     tx=-21, ty=54
// camera:  tx=22,  ty=-30
```

Note: `useAnimatedStyle` cannot be called inside a helper function conditionally — extract to individual named calls per option button.

### Raindrop SVG Animation
```typescript
// Each raindrop is an Animated Rect with staggered start delay
import Svg, { Rect } from 'react-native-svg';
import Animated, { useSharedValue, withRepeat, withDelay, withTiming } from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// In a loop over raindrop config array, each gets its own sharedValue
// with withRepeat(withTiming(...), -1) and withDelay(index * stagger, ...)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Animated` API from `react-native` | `react-native-reanimated` v4 `useSharedValue` | RN New Architecture adoption (~2024) | Animations run on UI thread natively; no bridge latency |
| Class-based navigator config | Function-based with typed param lists | React Navigation v6+ | Cleaner types, hooks-based screen options |
| `react-native-vector-icons` (already in deps) | `lucide-react-native` | This project decision | SVG-based, consistent set; vector-icons remains for legacy screens if needed |

---

## Open Questions

1. **Settings header button placement**
   - What we know: R-NAV-04 says Settings via "profile/hamburger icon in header." The mockup shows a hamburger in the top-right of the home screen header area.
   - What's unclear: Should each tab show a Settings header button, or only Home? Is it a `headerRight` inside the tab navigator's `screenOptions`, or per-tab?
   - Recommendation: Add `headerRight` at the Tab.Navigator `screenOptions` level so all tabs show it uniformly. Navigate to the `Settings` stack screen on press.

2. **Weather data source in Phase 2**
   - What we know: Phase 2 goal is "static/placeholder data." R-HOME-01 describes the animation states but not data fetching.
   - What's unclear: Which state should display by default? Should it read device location or use a hardcoded state?
   - Recommendation: Accept a `weatherState: 'sunny' | 'rainy' | 'snow' | 'thunderstorm'` prop. Default to `'sunny'` in Phase 2. Weather service integration is a later phase.

3. **eventful day scorer threshold**
   - What we know: R-HOME-04 mentions a "scorer" but no scorer service exists yet.
   - What's unclear: Does Phase 2 implement the scorer or stub it?
   - Recommendation: Stub it as `isEventfulDay(): boolean` returning `false` in Phase 2. The memory card path renders as if `false` (hidden) until a later phase implements the real scorer.

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `package.json`, `src/navigation/RootNavigator.tsx`, `App.tsx`, `node_modules/@react-navigation/native/package.json` — confirmed installed versions and missing bottom-tabs
- `node_modules/react-native-reanimated/package.json` — v4.4.1 confirmed
- `node_modules/react-native-svg/package.json` — v15.15.5 confirmed
- `design/direction-c.html` — authoritative pixel values, colors, FAB transform values

### Secondary (MEDIUM confidence)
- React Navigation v7 bottom-tabs docs pattern — consistent with v6 API; only major version differences known
- react-native-reanimated v4 API — `useSharedValue`/`withTiming` stable since v3; v4 removes legacy API

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions confirmed from installed node_modules
- Architecture: HIGH — pattern derived directly from existing codebase structure and design file
- FAB transforms: HIGH — exact pixel values from `design/direction-c.html` lines 254–274
- Pitfalls: MEDIUM — derived from known RN/reanimated behavior patterns

**Research date:** 2026-06-21
**Valid until:** 2026-07-21 (stable libraries, 30-day window)
