import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import type { WeatherData } from '../types/weather';
import type { WeatherApiConfig, WeatherApiRaw } from '../types/weatherApi';
import { DEFAULT_WEATHER_API_CONFIG } from '../types/weatherApi';
import type { WeatherSettings } from '../db/queries/app_settings';
import { getDeviceTimeZone, roundCoordinates } from './weatherPrivacy';
import { wmoToCondition, determineIntensity, resolveIsDay, mapToSceneConfig, getWarningFromCode, getFallbackWeatherSceneConfig } from './weatherScene';

const { HokedexGeocoder } = NativeModules;

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location Permission',
      message: 'Hokédex uses your location to show local weather.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function buildApiUrl(baseUrl: string, latitude: number, longitude: number): string {
  const timezone = encodeURIComponent(getDeviceTimeZone());
  return `${baseUrl}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,is_day&timezone=${timezone}`;
}

export async function getWeather(
  settings?: WeatherSettings,
  apiConfig?: WeatherApiConfig,
): Promise<WeatherData> {
  if (!settings?.enabled) {
    return { sceneConfig: getFallbackWeatherSceneConfig() };
  }

  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    return { sceneConfig: getFallbackWeatherSceneConfig() };
  }

  const config = apiConfig ?? DEFAULT_WEATHER_API_CONFIG;
  const coords: { latitude: number; longitude: number } =
    await HokedexGeocoder.getLocation();

  const { latitude, longitude } = roundCoordinates(coords);
  const url = buildApiUrl(config.url, latitude, longitude);

  const [weatherRes, city] = await Promise.all([
    fetch(url).then(r => r.json()) as Promise<unknown>,
    HokedexGeocoder.getCityName(latitude, longitude) as Promise<string>,
  ]);

  const raw: WeatherApiRaw = config.parseResponse(weatherRes);

  const temp = Math.round(raw.temperature_2m);
  const feelsLike = Math.round(raw.apparent_temperature);
  const condition = wmoToCondition(raw.weather_code);
  const intensity = determineIntensity(raw.weather_code);
  const isDay = resolveIsDay(raw.is_day);
  const warning = getWarningFromCode(raw.weather_code);
  const sceneConfig = mapToSceneConfig(condition, intensity, isDay, warning);

  return { temp, city, sceneConfig, feelsLike };
}
