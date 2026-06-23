import type { WeatherCondition, WeatherSceneKind, WeatherIntensity, WeatherSceneConfig, WeatherWarning } from '../types/weather';

const WEATHER_LABEL: Record<WeatherSceneKind, string> = {
  clear_day: 'Sunny',
  clear_night: 'Clear',
  partly_cloudy_day: 'Partly Cloudy',
  partly_cloudy_night: 'Partly Cloudy',
  cloudy: 'Cloudy',
  fog: 'Fog',
  rain: 'Raining',
  snow: 'Snowing',
  hail: 'Hail',
  storm: 'Thunderstorm',
};

export function getWeatherLabel(kind: WeatherSceneKind): string {
  return WEATHER_LABEL[kind];
}

export function wmoToCondition(code: number): WeatherCondition {
  if (code === 0) return 'clear';
  if (code >= 1 && code <= 3) return 'partly_cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95 && code <= 99) return 'storm';
  return 'clear';
}

export function determineIntensity(code: number): WeatherIntensity {
  if ((code >= 56 && code <= 57) || (code >= 66 && code <= 67) || (code >= 86 && code <= 99)) return 'heavy';
  if ((code >= 51 && code <= 55) || (code >= 61 && code <= 65) || (code >= 71 && code <= 75) || (code >= 80 && code <= 85)) return 'medium';
  return 'light';
}

export function resolveIsDay(isDayFromApi?: number): boolean {
  if (isDayFromApi !== undefined && isDayFromApi !== null) {
    return isDayFromApi === 1;
  }
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18;
}

export function getWarningFromCode(code: number): WeatherWarning | undefined {
  if (code >= 95 && code <= 99) return 'storm';
  return undefined;
}

export function getFallbackWeatherSceneConfig(): WeatherSceneConfig {
  return mapToSceneConfig('clear', 'light', resolveIsDay(undefined));
}

export function mapToSceneConfig(condition: WeatherCondition, intensity: WeatherIntensity, isDay: boolean, warning?: WeatherWarning): WeatherSceneConfig {
  const base = { condition, intensity, isDay };

  if (condition === 'clear' || condition === 'partly_cloudy') {
    const prefix = condition === 'clear' ? 'clear' : 'partly_cloudy';
    const suffix = isDay ? 'day' : 'night';
    return { ...base, kind: `${prefix}_${suffix}` as WeatherSceneKind, warning };
  }

  return { ...base, kind: condition as WeatherSceneKind, warning };
}
