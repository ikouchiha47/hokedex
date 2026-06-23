# PLAN-004 — Weather Scene Composition

## Problem

The home weather header currently maps clear weather to `sunny` regardless of local day/night state. The art is also implemented as whole scene files, which makes it hard to reuse pieces like clouds, rain, snow, hail, lightning, and warning overlays across different conditions.

The weather UI should be generic. It must not special-case Bengaluru or any other city.

## Goals

- Use weather data plus day/night data to choose the correct visual scene.
- Prefer Open-Meteo `is_day` for day/night because it is calculated for the fetched weather coordinates.
- Fall back to local device time when weather data or `is_day` is unavailable.
- Compose scenes from reusable SVG/animated primitives instead of duplicating whole scene files.
- Keep `WeatherCover` responsible only for layout and text overlay.
- Keep weather mapping as pure TypeScript logic that can be unit tested.

## Non-goals

- No city-specific day/night rules.
- No hardcoded device-specific dimensions.
- No native Android changes for day/night logic.
- No external weather provider change unless Open-Meteo cannot supply required fields.

## Target file structure

```text
src/components/weather/
  WeatherCover.tsx
  WeatherScene.tsx
  scene/
    SkyGradient.tsx
    Sun.tsx
    Moon.tsx
    Cloud.tsx
    Rain.tsx
    Snow.tsx
    Hail.tsx
    Lightning.tsx
    Ground.tsx
    Flowers.tsx
    WeatherWarningOverlay.tsx
src/services/
  weather.ts
  weatherScene.ts
src/types/
  weather.ts
```

## Types

```ts
export type WeatherCondition =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'hail'
  | 'storm';

export type WeatherSceneKind =
  | 'clear_day'
  | 'clear_night'
  | 'partly_cloudy_day'
  | 'partly_cloudy_night'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'hail'
  | 'storm';

export type WeatherIntensity = 'light' | 'medium' | 'heavy';

export type WeatherWarning =
  | 'storm'
  | 'heat'
  | 'flood'
  | 'wind'
  | 'hail';

export type WeatherSceneConfig = {
  kind: WeatherSceneKind;
  condition: WeatherCondition;
  intensity: WeatherIntensity;
  isDay: boolean;
  warning?: WeatherWarning;
};
```

## Data Rules

### Open-Meteo request

Request current fields:

```text
temperature_2m,apparent_temperature,weather_code,is_day
```

### Day/night resolution

1. If Open-Meteo returns `is_day`, use it.
2. Otherwise use local device time.
3. Generic local fallback rule:

```ts
const hour = new Date().getHours();
const isDay = hour >= 6 && hour < 18;
```

This fallback is intentionally generic and approximate. It is only used when provider data is unavailable.

### WMO mapping

- `0` -> `clear`
- `1..3` -> `partly_cloudy`
- `45, 48` -> `fog`
- `51..57` -> `drizzle`
- `61..67, 80..82` -> `rain`
- `71..77, 85, 86` -> `snow`
- `66, 67` may imply freezing rain; render as `hail` only if a later provider field supports hail/freezing distinction clearly.
- `95..99` -> `storm`

Scene kind rules:

- `clear + day` -> `clear_day`
- `clear + night` -> `clear_night`
- `partly_cloudy + day` -> `partly_cloudy_day`
- `partly_cloudy + night` -> `partly_cloudy_night`
- Other conditions use condition-based scenes independent of day/night, but their sky palette may still use `isDay`.

## Component Responsibilities

### `WeatherCover`

- Owns responsive width/height and weather text overlay.
- Receives `sceneConfig` or raw weather data.
- Does not decide weather condition rules.

### `WeatherScene`

- Receives `WeatherSceneConfig`, `width`, and `height`.
- Chooses composed primitive layers.
- Keeps all coordinates responsive from width/height.

### Scene primitives

- `SkyGradient`: renders day/night/storm/rain palettes.
- `Sun`: renders sun core, rays, and optional pulse glow.
- `Moon`: renders moon, soft glow, and optional stars.
- `Cloud`: reusable cloud/pill shapes with opacity/scale variants.
- `Rain`: reusable animated/static rain streaks.
- `Snow`: reusable flakes.
- `Hail`: reusable larger icy particles.
- `Lightning`: storm bolts.
- `Ground`: bottom ground band.
- `Flowers`: reusable flower row with size/spacing props.
- `WeatherWarningOverlay`: subtle visual badges/overlays for severe weather warnings.

## Implementation Checklist

- [ ] Add shared weather types in `src/types/weather.ts`.
- [ ] Add `src/services/weatherScene.ts` with pure mapping functions.
- [ ] Update `src/services/weather.ts` to request `is_day`.
- [ ] Return weather data with condition, isDay, intensity, and scene config.
- [ ] Add scene primitive components under `src/components/weather/scene/`.
- [ ] Add `WeatherScene.tsx` compositor.
- [ ] Replace direct `SunnyScene` rendering in `WeatherCover` with `WeatherScene`.
- [ ] Preserve existing rain/snow/thunderstorm look while migrating to primitives.
- [ ] Add night visual: dark gradient, moon, stars, optional night clouds.
- [ ] Add unit tests for WMO-to-scene mapping and day/night fallback.

## Validation

- TypeScript: `npx tsc --noEmit`
- Targeted lint:

```bash
npx eslint "src/services/weather.ts" "src/services/weatherScene.ts" "src/components/weather/**/*.tsx" "src/types/weather.ts"
```

- Manual checks on device:
  - Clear day renders sun.
  - Clear night renders moon/stars.
  - Partly cloudy day/night share clouds but use different sky bodies.
  - Rain/snow/storm still render precipitation correctly.
  - Weather text remains readable over all scenes.
  - Event strip and FAB layout remain unchanged.

## Open Questions

- Should severe weather warnings come only from WMO current weather code, or should we add Open-Meteo warning endpoints later?
- Should local fallback day/night use fixed `6..18`, or should we later compute sunrise/sunset from lat/lon if provider data is unavailable?
