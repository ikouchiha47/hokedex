import { type DB } from '@op-engineering/op-sqlite';
import { SQL, parseNamedQueries } from '../sql/loader';

const Q = parseNamedQueries(SQL.queriesAppSettings);

export type WeatherSettings = {
  enabled: boolean;
  precision: string;
};

export async function getSetting(db: DB, key: string): Promise<string | null> {
  const r = await db.execute(Q.GET_SETTING, [key]);
  const row = (r.rows ?? [])[0] as { value: string } | undefined;
  return row?.value ?? null;
}

export async function getWeatherSettings(db: DB): Promise<WeatherSettings> {
  const enabledRaw = await getSetting(db, 'weather_enabled');
  const precision = await getSetting(db, 'weather_location_precision');
  return {
    enabled: enabledRaw !== 'false',
    precision: precision ?? 'coarse',
  };
}

export async function setSettingValue(db: DB, key: string, value: string): Promise<void> {
  await db.execute(Q.UPSERT_SETTING, [key, value, Date.now()]);
}
