import type { WeatherCondition } from '../types/weather';
import type { WeatherApiRaw } from '../types/weatherApi';
import { DEFAULT_WEATHER_API_CONFIG } from '../types/weatherApi';
import { roundCoordinates } from './weatherPrivacy';
import { wmoToCondition } from './weatherScene';

export type CaptureWeather = {
  temp: number;
  condition: WeatherCondition;
};

export async function getWeatherForCapture(
  lat: number,
  lon: number,
): Promise<CaptureWeather | null> {
  try {
    const { latitude, longitude } = roundCoordinates({ latitude: lat, longitude: lon });
    const url = `${DEFAULT_WEATHER_API_CONFIG.url}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`;
    const res = await fetch(url);
    const json = await res.json();
    const raw: WeatherApiRaw = DEFAULT_WEATHER_API_CONFIG.parseResponse(json);
    return {
      temp: Math.round(raw.temperature_2m),
      condition: wmoToCondition(raw.weather_code),
    };
  } catch {
    return null;
  }
}
