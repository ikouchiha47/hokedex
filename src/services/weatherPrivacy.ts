export const COARSE_COORDINATE_STEP = 0.25;

export function roundCoordinate(value: number, step = COARSE_COORDINATE_STEP): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

export function roundCoordinates(coords: { latitude: number; longitude: number }): { latitude: number; longitude: number } {
  return {
    latitude: roundCoordinate(coords.latitude),
    longitude: roundCoordinate(coords.longitude),
  };
}

export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
