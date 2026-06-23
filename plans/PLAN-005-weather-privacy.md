# PLAN-005: Privacy-Preserving Weather

## Part 1: Local Weather Setting

Add a user-facing toggle in Settings to enable/disable weather. When weather is disabled:
- Home screen still shows the procedural fallback weather scene.
- App does not request location permission.
- App does not call Open-Meteo.
- App does not show temp/city/feels-like.

## Part 2: Coarse Location

When weather is enabled, the app still gets cached GPS location locally (exact coordinates stay on device). Coordinates are rounded to 0.25° granularity before being used in:
- The Open-Meteo API URL.
- The reverse geocoder city lookup.

## Part 3: Local Timezone

Use `Intl.DateTimeFormat().resolvedOptions().timeZone` to get the device timezone.
Send `timezone=<encoded timezone>` to Open-Meteo so weather timestamps align with local time.

## Part 4: Configurable API URL and Response Parser

The weather fetch URL and response-to-WeatherData parsing logic must be injectable/configurable rather than hardcoded in weather.ts.

## Behavior Summary

- **Default**: weather enabled.
- **Enabled**: App requests cached location (exact GPS stays local). Coordinates rounded before API call. Reverse geocode also uses rounded coords. API receives device timezone.
- **Disabled**: No location permission request. No network request. Fallback procedural scene only.
- **Bangalore example**: Device timezone returns `Asia/Kolkata` on a correctly configured phone. Open-Meteo receives rounded Bangalore-area coordinates, not exact GPS.

## Coordinate Rounding

Pure function:

```
roundCoordinate(value: number, step = 0.25): number
```

Examples:
- `12.9716 -> 13.00`
- `77.5946 -> 77.50`

0.25° = roughly 25-30 km granularity. Protects exact location while keeping weather reasonably local.

## Files to Add

### `src/db/sql/migrations/010_app_settings.sql`

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES ('weather_enabled', 'true', ?);
INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES ('weather_location_precision', 'coarse', ?);
```

### `src/db/sql/queries/app_settings.sql`

```sql
-- name: GetSetting :one
SELECT value FROM app_settings WHERE key = ?;
-- name: UpsertSetting :exec
INSERT INTO app_settings (key, value, updated_at)
VALUES (?, ?, ?)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = excluded.updated_at;
```

### `src/db/queries/app_settings.ts`

Exports:
- `type WeatherSettings = { enabled: boolean; precision: string }`
- `async function getSetting(db: DB, key: string): Promise<string | null>`
- `async function getWeatherSettings(db: DB): Promise<WeatherSettings>`
- `async function setSettingValue(db: DB, key: string, value: string): Promise<void>`

### `src/services/weatherPrivacy.ts`

Exports:
- `const COARSE_COORDINATE_STEP = 0.25`
- `function roundCoordinate(value: number, step = COARSE_COORDINATE_STEP): number`
- `function roundCoordinates(coords: { latitude: number; longitude: number }): { latitude: number; longitude: number }`
- `function getDeviceTimeZone(): string` — uses `Intl.DateTimeFormat().resolvedOptions().timeZone` with `'UTC'` fallback.

### `src/services/__tests__/weatherPrivacy.test.ts`

Tests for:
- Positive coordinate rounding
- Negative coordinate rounding
- Bounds
- Custom step
- Timezone returns non-empty string (or mocked value)

### `src/types/weatherApi.ts`

Exports:
- `type WeatherApiConfig = { url: string; parseResponse: (json: unknown) => WeatherApiRaw }`
- `type WeatherApiRaw = { temperature_2m: number; apparent_temperature: number; weather_code: number; is_day?: number }`
- `const DEFAULT_WEATHER_API_CONFIG: WeatherApiConfig` — pointing to Open-Meteo with current response shape.
- `function parseOpenMeteoResponse(json: unknown): WeatherApiRaw`

## Files to Modify

### `src/db/sql/loader.ts`

Add imports:
```
import migration010 from './migrations/010_app_settings.sql';
import queriesAppSettings from './queries/app_settings.sql';
```

Add to `SQL` export:
```
migration010,
queriesAppSettings,
```

### `src/db/migrations/runner.ts`

Add to `MIGRATIONS` array:
```
{ version: 10, sql: SQL.migration010 },
```

### `src/services/weather.ts`

Changes:
- Import `getDeviceTimeZone`, `roundCoordinates` from `./weatherPrivacy`
- Import `WeatherSettings` from `../db/queries/app_settings`
- Import `WeatherApiConfig`, `DEFAULT_WEATHER_API_CONFIG` from `../types/weatherApi`
- Accept `settings: WeatherSettings` and optional `apiConfig?: WeatherApiConfig` parameter.
- Early return fallback if `!settings.enabled`.
- Round coordinates before API call and reverse geocode.
- Add `timezone` param to URL.
- Use configurable URL and parser instead of hardcoded values.
- Return `WeatherData` with optional `temp` and `city`.

### `src/types/weather.ts`

Update `WeatherData` to accept optional temp/city:
```ts
export type WeatherData = {
  temp?: number;
  city?: string;
  sceneConfig: WeatherSceneConfig;
  feelsLike?: number;
};
```

### `src/screens/HomeScreen.tsx`

Changes:
- Import `useApp` from `../AppContext`.
- Import `getWeatherSettings` from `../db/queries/app_settings`.
- Import `getFallbackWeatherSceneConfig` from `../services/weatherScene`.
- Pass DB settings to weather service.
- Handle cancelled/cleanup.
- If disabled, use fallback config and show no temp/city.

### `src/screens/SettingsScreen.tsx`

Changes:
- Import `Switch` from `react-native`.
- Import `useApp`, `getWeatherSettings`, `setSettingValue`.
- Load and display weather toggle state.
- Add Weather section in JSX.
- Handle toggle: optimistic update with revert on failure.
- Add relevant styles.

## No Changes

- `WeatherCover.tsx`
- `GeocoderModule.kt`
- `weatherScene.ts` (unless specifically needed)
- All other scene files

## Test Plan

Run:
```
npx tsc --noEmit
npx eslint <all modified files>
npx jest --selectProjects services
```

## Verification Checklist

- Fresh install/default DB: Weather toggle is on. Weather card loads weather. API URL uses rounded coordinates.
- Toggle off then restart: No location permission prompt. No Open-Meteo request. Weather card shows fallback scene without 0°C.
- Toggle on then restart: Location permission requested if not already granted. API uses device timezone and rounded coordinates.
- Configurable API: Passing a custom URL and parseResponse function overrides the defaults.
- Bangalore scenario: getDeviceTimeZone() returns Asia/Kolkata on correctly configured device. API receives rounded Bangalore-area lat/lon.

## Key Design Decisions

- Settings stored in SQLite rather than AsyncStorage. App already depends on local DB. Avoids adding a new storage dependency.
- Coordinate rounding in TypeScript. Simpler, testable, no native change. Can be moved to Kotlin later if stricter privacy boundary is needed.
- WeatherApiConfig separates fetch URL and parsing logic from weather.ts. Allows overriding without modifying weather.ts.
- Settings screen uses optimistic toggle with DB write and revert on failure. Standard UX pattern.
