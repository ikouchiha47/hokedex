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

export type WeatherData = {
  temp?: number;
  city?: string;
  sceneConfig: WeatherSceneConfig;
  feelsLike?: number;
};
