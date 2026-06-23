export type WeatherApiRaw = {
  temperature_2m: number;
  apparent_temperature: number;
  weather_code: number;
  is_day?: number;
};

export type WeatherApiConfig = {
  url: string;
  parseResponse: (json: unknown) => WeatherApiRaw;
};

export function parseOpenMeteoResponse(json: unknown): WeatherApiRaw {
  const root = json as Record<string, unknown>;
  const current = root.current as Record<string, unknown>;
  return {
    temperature_2m: current.temperature_2m as number,
    apparent_temperature: current.apparent_temperature as number,
    weather_code: current.weather_code as number,
    is_day: current.is_day as number | undefined,
  };
}

export const DEFAULT_WEATHER_API_CONFIG: WeatherApiConfig = {
  url: 'https://api.open-meteo.com/v1/forecast',
  parseResponse: parseOpenMeteoResponse,
};
