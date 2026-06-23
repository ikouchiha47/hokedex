import { wmoToCondition, determineIntensity, resolveIsDay, mapToSceneConfig, getWeatherLabel, getWarningFromCode, getFallbackWeatherSceneConfig } from '../weatherScene';

describe('wmoToCondition', () => {
  test('code 0 → clear', () => {
    expect(wmoToCondition(0)).toBe('clear');
  });

  test('codes 1-3 → partly_cloudy', () => {
    expect(wmoToCondition(1)).toBe('partly_cloudy');
    expect(wmoToCondition(2)).toBe('partly_cloudy');
    expect(wmoToCondition(3)).toBe('partly_cloudy');
  });

  test('codes 45, 48 → fog', () => {
    expect(wmoToCondition(45)).toBe('fog');
    expect(wmoToCondition(48)).toBe('fog');
  });

  test('drizzle codes', () => {
    [51, 53, 55, 56, 57].forEach(c => expect(wmoToCondition(c)).toBe('drizzle'));
  });

  test('rain codes', () => {
    [61, 63, 65, 66, 67, 80, 81, 82].forEach(c => expect(wmoToCondition(c)).toBe('rain'));
  });

  test('snow codes', () => {
    [71, 73, 75, 77, 85, 86].forEach(c => expect(wmoToCondition(c)).toBe('snow'));
  });

  test('storm codes 95-99', () => {
    [95, 96, 99].forEach(c => expect(wmoToCondition(c)).toBe('storm'));
  });

  test('unknown code defaults to clear', () => {
    expect(wmoToCondition(999)).toBe('clear');
  });
});

describe('determineIntensity', () => {
  test('light codes', () => {
    [0, 1, 2, 3, 45, 48].forEach(c => expect(determineIntensity(c)).toBe('light'));
  });

  test('medium codes', () => {
    [51, 53, 55, 61, 63, 65, 71, 73, 75, 80, 81, 85].forEach(c => expect(determineIntensity(c)).toBe('medium'));
  });

  test('heavy codes', () => {
    [56, 57, 66, 67, 86, 95, 96, 99].forEach(c => expect(determineIntensity(c)).toBe('heavy'));
  });
});

describe('resolveIsDay', () => {
  test('1 from API → true', () => {
    expect(resolveIsDay(1)).toBe(true);
  });

  test('0 from API → false', () => {
    expect(resolveIsDay(0)).toBe(false);
  });

  test('undefined falls back to device hour', () => {
    const result = resolveIsDay(undefined);
    const hour = new Date().getHours();
    expect(result).toBe(hour >= 6 && hour < 18);
  });
});

describe('mapToSceneConfig', () => {
  test('clear + day → clear_day', () => {
    const config = mapToSceneConfig('clear', 'light', true);
    expect(config.kind).toBe('clear_day');
    expect(config.condition).toBe('clear');
    expect(config.isDay).toBe(true);
  });

  test('clear + night → clear_night', () => {
    const config = mapToSceneConfig('clear', 'light', false);
    expect(config.kind).toBe('clear_night');
    expect(config.isDay).toBe(false);
  });

  test('partly_cloudy + day → partly_cloudy_day', () => {
    expect(mapToSceneConfig('partly_cloudy', 'medium', true).kind).toBe('partly_cloudy_day');
  });

  test('partly_cloudy + night → partly_cloudy_night', () => {
    expect(mapToSceneConfig('partly_cloudy', 'medium', false).kind).toBe('partly_cloudy_night');
  });

  test('rain uses condition as kind regardless of isDay', () => {
    const day = mapToSceneConfig('rain', 'heavy', true);
    const night = mapToSceneConfig('rain', 'heavy', false);
    expect(day.kind).toBe('rain');
    expect(night.kind).toBe('rain');
  });

  test('storm uses condition as kind', () => {
    expect(mapToSceneConfig('storm', 'heavy', true).kind).toBe('storm');
  });

  test('snow uses condition as kind', () => {
    expect(mapToSceneConfig('snow', 'medium', true).kind).toBe('snow');
  });

  test('fog uses condition as kind', () => {
    expect(mapToSceneConfig('fog', 'light', true).kind).toBe('fog');
  });

  test('preserves warning in scene config', () => {
    const config = mapToSceneConfig('storm', 'heavy', false, 'storm');
    expect(config.warning).toBe('storm');
  });
});

describe('getWarningFromCode', () => {
  test('storm WMO codes produce storm warning', () => {
    expect(getWarningFromCode(95)).toBe('storm');
    expect(getWarningFromCode(99)).toBe('storm');
  });

  test('non-storm WMO codes do not produce warning', () => {
    expect(getWarningFromCode(0)).toBeUndefined();
    expect(getWarningFromCode(999)).toBeUndefined();
  });
});

describe('getFallbackWeatherSceneConfig', () => {
  test('uses local day/night fallback without city-specific rules', () => {
    const config = getFallbackWeatherSceneConfig();
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;
    expect(config.condition).toBe('clear');
    expect(config.isDay).toBe(isDay);
    expect(config.kind).toBe(isDay ? 'clear_day' : 'clear_night');
  });
});

describe('getWeatherLabel', () => {
  test('clear_day → Sunny', () => {
    expect(getWeatherLabel('clear_day')).toBe('Sunny');
  });

  test('clear_night → Clear', () => {
    expect(getWeatherLabel('clear_night')).toBe('Clear');
  });

  test('partly_cloudy_day → Partly Cloudy', () => {
    expect(getWeatherLabel('partly_cloudy_day')).toBe('Partly Cloudy');
  });

  test('rain → Raining', () => {
    expect(getWeatherLabel('rain')).toBe('Raining');
  });

  test('storm → Thunderstorm', () => {
    expect(getWeatherLabel('storm')).toBe('Thunderstorm');
  });
});
