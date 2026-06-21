# hokédex — Code Conventions

These conventions govern all code written for this project. GSD executor agents must follow them exactly. They are derived from the `react-style-expert`, `backend-architect`, and `typescript-style-expert` agent definitions, plus project-specific decisions.

---

## Design Patterns

### SOLID + Liskov Substitution

Every rule and resolver is **substitutable**. The engine/registry calls only the interface — never a concrete class. Any `Rule` implementation can replace another without the caller knowing.

```ts
// WRONG
if (type === 'drift') { runDriftRule(moment); }

// RIGHT
const rule = RuleRegistry.get(type); // returns Rule interface
rule.evaluate(moment);
```

### Polymorphism — PlaceResolver

`PlaceResolver` is an interface. Concrete impls: `GoogleMapsResolver`, `ZomatoResolver`, `TheForkResolver`, `NominatimFallback`. The registry picks the right one at runtime; callers never branch on type.

```ts
interface PlaceResolver {
  canHandle(url: string): boolean;
  resolve(url: string): Promise<ResolvedPlace>;
}
```

### Strategy — Runtime Selection

No `if/switch` on resolver or rule type in business logic. Strategy selection happens once in the registry lookup; the rest of the code is polymorphic.

```ts
// PlaceResolverRegistry.resolve(url)
//   → finds first resolver where canHandle(url) === true
//   → calls resolver.resolve(url)
//   → never branches on resolver type again
```

### Facade — MomentCaptureService

`MomentCaptureService` is the single entry point for the capture flow. It hides face detection, embedding, DB write, and place resolution behind one clean call. Callers pass inputs and receive a `Moment` — they never touch `FaceDetector`, `FaceEmbedder`, or `PlaceResolverRegistry` directly.

```ts
// callers do this:
const moment = await MomentCaptureService.capture({ photo, location, contacts });

// NOT this:
const faces = FaceDetector.detect(photo);
const embeddings = FaceEmbedder.embed(faces);
const place = await PlaceResolverRegistry.resolve(location.shareUrl);
await MomentsRepository.insert({ faces, embeddings, place });
```

### Proxy — CalendarProxy

`CalendarProxy` wraps `CalendarContract` (Android API). No other module imports `CalendarContract` or touches Android cursor APIs directly. This isolates all platform coupling in one place and makes the calendar integration mockable in tests.

```ts
interface CalendarProvider {
  getUpcomingEvents(windowDays: number): Promise<CalendarEvent[]>;
}

class CalendarProxy implements CalendarProvider {
  // internal: calls NativeModules.CalendarModule which wraps CalendarContract
}
```

### Registrar — Self-registering Rules and Resolvers

Rules and resolvers register themselves. The engine/registry never hardcodes a list.

```ts
// rules/drift.ts
RuleRegistry.register({
  id: 'drift-v1',
  version: 1,
  enabled: true,
  evaluate: (moment) => { ... },
});

// rules/birthday.ts
RuleRegistry.register({ id: 'birthday-nudge-v1', ... });

// RulesEngine.ts — no list of rules, just runs the registry
RuleRegistry.all().filter(r => r.enabled).forEach(r => r.evaluate(moment));
```

---

## TypeScript / React Native

### File Structure (every screen and component)

```ts
// 1. React + RN imports
import React, { useState, useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

// 2. Third-party
import { Camera } from 'react-native-camera';

// 3. Internal — services, queries, types
import { MomentCaptureService } from '@/services/MomentCaptureService';
import type { Moment } from '@/types/moments';

// 4. Icons (Lucide — never emoji)
import { MapPin, Mic, Camera as CameraIcon } from 'lucide-react-native';

// 5. Types / interfaces
interface Props {
  onCapture: (moment: Moment) => void;
}

// 6. Constants
const FAB_EXPAND_DURATION_MS = 200;

// 7. Component
export const CaptureScreen: React.FC<Props> = ({ onCapture }) => {
  // hooks (router → state → custom hooks → computed → callbacks → effects)
  const [expanded, setExpanded] = useState(false);

  const handleCapture = useCallback(async () => { ... }, [onCapture]);

  return ( ... );
};

// 8. Styles — always at the bottom
const styles = StyleSheet.create({ ... });
```

### Rules

- **No decision logic in components.** Any `if` that isn't pure rendering belongs in a service.
- **One export per query file.** `src/db/queries/moments.ts` exports one function.
- **No raw SQL in TypeScript.** All SQL lives in `src/db/sql/*.sql`, loaded via the registry.
- **No magic strings.** All string constants at file top or in `src/constants/`.
- **Icons: Lucide only.** Import from `lucide-react-native`. Never use emoji as UI elements.
- **Blank line between every logically distinct block** — imports, types, constants, component body sections.
- **Props interface: required first, then optional with defaults, then HTML/RN attrs.**
- **One `useEffect` per concern** — never mix data fetch + event listener + analytics in one effect.
- **Async DB calls use `execute`.** DDL migrations only use `executeSync`.

### Result types over null/undefined

```ts
// WRONG
async function findPerson(id: string): Promise<Person | null>

// RIGHT
type Result<T> = { ok: true; value: T } | { ok: false; error: string };
async function findPerson(id: string): Promise<Result<Person>>
```

---

## Kotlin

### One class per file. Native modules are bridge-only.

```kotlin
// HokedexCalendarModule.kt — bridge only
@ReactMethod
fun getUpcomingEvents(windowDays: Int, promise: Promise) {
    CalendarReader(reactApplicationContext).getUpcomingEvents(windowDays, promise)
}

// CalendarReader.kt — real logic lives here, unit-testable
class CalendarReader(private val context: Context) {
    fun getUpcomingEvents(windowDays: Int, promise: Promise) { ... }
}
```

### Constructor injection — no singletons, no static methods

```kotlin
// WRONG
class MomentProcessor {
    fun process() {
        val db = DatabaseSingleton.getInstance()
    }
}

// RIGHT
class MomentProcessor(
    private val db: SQLiteDatabase,
    private val faceEmbedder: FaceEmbedder,
) {
    fun process(photo: Bitmap): ProcessedMoment { ... }
}
```

### No business logic in `MainActivity.kt`

Permission results, deep link routing only. Everything else is delegated to a module.

---

## Testing Order

1. **Unit** — pure functions and service methods with no RN/Android deps
2. **Integration** — real in-memory SQLite + real service layer, stubbed native modules only
3. **E2E** — full device test last, after all unit and integration layers pass

Never mock the DB in integration tests. If a mock DB and real DB diverge, the test is worthless.

---

## Icons

Use `lucide-react-native` exclusively.

```ts
import { MapPin, Mic, Camera, Users, Calendar, Plus } from 'lucide-react-native';

// Size and color via props — never hardcoded inline
<MapPin size={20} color={colors.accent} />
```

Never use emoji as UI elements. Emoji are for user-generated content only.

---

## Comments

Write no comments by default. Only add one when the WHY is non-obvious: a hidden constraint, a subtle invariant, a workaround for a specific Android/op-sqlite bug. If removing the comment wouldn't confuse a future reader, don't write it.

---

*These conventions are enforced during plan-phase and checked by gsd-verifier after each phase.*
