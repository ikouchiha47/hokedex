import { roundCoordinate, roundCoordinates, COARSE_COORDINATE_STEP } from '../weatherPrivacy';

describe('roundCoordinate', () => {
  test('rounds positive latitude to nearest step', () => {
    expect(roundCoordinate(12.9716)).toBe(13);
  });

  test('rounds positive longitude to nearest step', () => {
    expect(roundCoordinate(77.5946)).toBe(77.5);
  });

  test('rounds negative coordinate', () => {
    expect(roundCoordinate(-33.8688)).toBe(-33.75);
  });

  test('uses custom step', () => {
    expect(roundCoordinate(12.9716, 1)).toBe(13);
    expect(roundCoordinate(12.3, 1)).toBe(12);
  });

  test('keeps exact multiples unchanged', () => {
    expect(roundCoordinate(10)).toBe(10);
    expect(roundCoordinate(10.25)).toBe(10.25);
    expect(roundCoordinate(10.5)).toBe(10.5);
  });

  test('returns same value for zero step', () => {
    expect(roundCoordinate(12.345, 0)).toBe(12.345);
  });

  test('handles very small values', () => {
    expect(roundCoordinate(0.001)).toBe(0);
  });
});

describe('roundCoordinates', () => {
  test('rounds both latitude and longitude', () => {
    const result = roundCoordinates({ latitude: 12.9716, longitude: 77.5946 });
    expect(result.latitude).toBe(13);
    expect(result.longitude).toBe(77.5);
  });
});

describe('COARSE_COORDINATE_STEP', () => {
  test('default step is 0.25', () => {
    expect(COARSE_COORDINATE_STEP).toBe(0.25);
  });
});
