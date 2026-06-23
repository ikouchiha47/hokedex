import {
  seededRandom,
  circlesIntersect,
  rectsIntersect,
  circleIntersectsRect,
  intersectsAny,
  generateClouds,
  generateMoonCraters,
  generateStars,
  generateParticleParams,
  getMoonBounds,
  getSunBounds,
  lerp,
} from '../procedural';

describe('seededRandom', () => {
  test('same seed produces same sequence', () => {
    const r1 = seededRandom('abc');
    const r2 = seededRandom('abc');
    const seq1 = Array.from({ length: 10 }, () => r1());
    const seq2 = Array.from({ length: 10 }, () => r2());
    expect(seq1).toEqual(seq2);
  });

  test('different seeds produce different sequences', () => {
    const r1 = seededRandom('abc');
    const r2 = seededRandom('xyz');
    const seq1 = Array.from({ length: 10 }, () => r1());
    const seq2 = Array.from({ length: 10 }, () => r2());
    expect(seq1).not.toEqual(seq2);
  });

  test('outputs values between 0 and 1', () => {
    const r = seededRandom('test');
    for (let i = 0; i < 100; i += 1) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('lerp', () => {
  test('lerp at 0 returns start', () => expect(lerp(5, 15, 0)).toBe(5));
  test('lerp at 1 returns end', () => expect(lerp(5, 15, 1)).toBe(15));
  test('lerp at 0.5 returns midpoint', () => expect(lerp(5, 15, 0.5)).toBe(10));
});

describe('circlesIntersect', () => {
  test('overlapping circles return true', () => {
    expect(circlesIntersect({ kind: 'circle', cx: 0, cy: 0, r: 5 }, { kind: 'circle', cx: 4, cy: 0, r: 5 })).toBe(true);
  });

  test('nearby circles within radius sum return true', () => {
    expect(circlesIntersect({ kind: 'circle', cx: 0, cy: 0, r: 5 }, { kind: 'circle', cx: 9, cy: 0, r: 5 })).toBe(true);
  });

  test('distant circles return false', () => {
    expect(circlesIntersect({ kind: 'circle', cx: 0, cy: 0, r: 5 }, { kind: 'circle', cx: 20, cy: 0, r: 5 })).toBe(false);
  });

  test('padding prevents near misses', () => {
    expect(circlesIntersect({ kind: 'circle', cx: 0, cy: 0, r: 5 }, { kind: 'circle', cx: 12, cy: 0, r: 5 }, 3)).toBe(true);
  });
});

describe('rectsIntersect', () => {
  test('overlapping rects return true', () => {
    const a = { kind: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
    const b = { kind: 'rect' as const, x: 5, y: 5, width: 10, height: 10 };
    expect(rectsIntersect(a, b)).toBe(true);
  });

  test('separated rects return false', () => {
    const a = { kind: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
    const b = { kind: 'rect' as const, x: 20, y: 0, width: 10, height: 10 };
    expect(rectsIntersect(a, b)).toBe(false);
  });

  test('padding extends detection area', () => {
    const a = { kind: 'rect' as const, x: 0, y: 0, width: 10, height: 10 };
    const b = { kind: 'rect' as const, x: 13, y: 0, width: 10, height: 10 };
    expect(rectsIntersect(a, b, 5)).toBe(true);
  });
});

describe('circleIntersectsRect', () => {
  test('circle overlaps rect', () => {
    expect(
      circleIntersectsRect({ kind: 'circle', cx: 5, cy: 5, r: 10 }, { kind: 'rect', x: 0, y: 0, width: 20, height: 20 }),
    ).toBe(true);
  });

  test('circle outside rect returns false', () => {
    expect(
      circleIntersectsRect({ kind: 'circle', cx: 50, cy: 50, r: 5 }, { kind: 'rect', x: 0, y: 0, width: 20, height: 20 }),
    ).toBe(false);
  });
});

describe('intersectsAny', () => {
  test('returns true if bounds intersects any zone', () => {
    const zones = [
      { kind: 'circle' as const, cx: 0, cy: 0, r: 10 },
    ];
    expect(intersectsAny({ kind: 'circle', cx: 5, cy: 5, r: 10 }, zones)).toBe(true);
  });

  test('returns false if no zone is hit', () => {
    const zones = [
      { kind: 'circle' as const, cx: 0, cy: 0, r: 5 },
    ];
    expect(intersectsAny({ kind: 'circle', cx: 50, cy: 50, r: 5 }, zones)).toBe(false);
  });
});

describe('getMoonBounds', () => {
  test('returns circle at expected center', () => {
    const bounds = getMoonBounds(390, 280);
    expect(bounds.kind).toBe('circle');
    expect(bounds.cx).toBeCloseTo(390 * 0.72);
    expect(bounds.cy).toBeCloseTo(280 * 0.32);
  });
});

describe('getSunBounds', () => {
  test('returns circle at expected center', () => {
    const bounds = getSunBounds(390, 280);
    expect(bounds.kind).toBe('circle');
    expect(bounds.cx).toBeCloseTo(390 * 0.72);
  });
});

describe('generateClouds', () => {
  test('is deterministic for same params', () => {
    const a = generateClouds({
      seed: 'test-390-280',
      width: 390,
      height: 280,
      count: 2,
      protectedZones: [getMoonBounds(390, 280)],
    });
    const b = generateClouds({
      seed: 'test-390-280',
      width: 390,
      height: 280,
      count: 2,
      protectedZones: [getMoonBounds(390, 280)],
    });
    expect(a).toEqual(b);
  });

  test('clouds avoid moon protected zone', () => {
    const moon = getMoonBounds(390, 280);
    const clouds = generateClouds({
      seed: 'night-cloud-test',
      width: 390,
      height: 280,
      count: 3,
      protectedZones: [moon],
    });

    for (const cloud of clouds) {
      for (const lobe of cloud.lobes) {
        expect(circlesIntersect(moon, lobe, 0)).toBe(false);
      }
    }
  });

  test('cloud bases do not collide with each other', () => {
    const clouds = generateClouds({
      seed: 'overcast-test',
      width: 390,
      height: 280,
      count: 4,
      protectedZones: [],
    });

    for (let i = 0; i < clouds.length; i += 1) {
      for (let j = i + 1; j < clouds.length; j += 1) {
        expect(rectsIntersect(clouds[i].base, clouds[j].base, 12)).toBe(false);
      }
    }
  });

  test('allows overlap when allowCelestialOverlap is true', () => {
    const moon = getMoonBounds(390, 280);
    const clouds = generateClouds({
      seed: 'overlap-allowed',
      width: 390,
      height: 280,
      count: 2,
      protectedZones: [moon],
      allowCelestialOverlap: true,
    });
    expect(clouds.length).toBeGreaterThanOrEqual(1);
  });

  test('respects count parameter (may produce fewer due to collision avoidance)', () => {
    const clouds = generateClouds({
      seed: 'count-test',
      width: 500,
      height: 400,
      count: 5,
      protectedZones: [],
    });
    expect(clouds.length).toBeGreaterThanOrEqual(2);
    expect(clouds.length).toBeLessThanOrEqual(5);
  });
});

describe('generateMoonCraters', () => {
  test('all craters are inside the moon disk', () => {
    const craters = generateMoonCraters({
      width: 390,
      height: 280,
      seed: 'moon-test',
      count: 5,
    });

    const mx = 390 * 0.72;
    const my = 280 * 0.32;
    const moonR = Math.max(18, Math.min(390 * 0.08, 30));

    for (const crater of craters) {
      const dist = Math.sqrt((crater.cx - mx) ** 2 + (crater.cy - my) ** 2);
      expect(dist + crater.r).toBeLessThanOrEqual(moonR + 1);
    }
  });

  test('craters do not overlap each other', () => {
    const craters = generateMoonCraters({
      width: 390,
      height: 280,
      seed: 'no-overlap',
      count: 6,
    });

    for (let i = 0; i < craters.length; i += 1) {
      for (let j = i + 1; j < craters.length; j += 1) {
        expect(circlesIntersect(craters[i], craters[j], 2)).toBe(false);
      }
    }
  });

  test('is deterministic', () => {
    const a = generateMoonCraters({ width: 390, height: 280, seed: 'abc', count: 5 });
    const b = generateMoonCraters({ width: 390, height: 280, seed: 'abc', count: 5 });
    expect(a).toEqual(b);
  });
});

describe('generateStars', () => {
  test('places stars in upper portion of scene', () => {
    const stars = generateStars({
      seed: 'star-test',
      width: 390,
      height: 280,
      count: 20,
    });

    for (const star of stars) {
      expect(star.fy).toBeGreaterThanOrEqual(0);
      expect(star.fy).toBeLessThanOrEqual(0.35);
      expect(star.fx).toBeGreaterThanOrEqual(0);
      expect(star.fx).toBeLessThanOrEqual(1);
    }
  });

  test('is deterministic', () => {
    const a = generateStars({ seed: 'stars', width: 390, height: 280, count: 10 });
    const b = generateStars({ seed: 'stars', width: 390, height: 280, count: 10 });
    expect(a).toEqual(b);
  });

  test('avoids excludeBounds zone', () => {
    const moon = getMoonBounds(390, 280);
    const stars = generateStars({
      seed: 'stars-avoid',
      width: 390,
      height: 280,
      count: 15,
      excludeBounds: moon,
    });

    for (const star of stars) {
      const dx = (star.fx * 390) - moon.cx;
      const dy = (star.fy * 280) - moon.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeGreaterThan(moon.r + 4);
    }
  });
});

describe('generateParticleParams', () => {
  test('is deterministic', () => {
    const a = generateParticleParams({ seed: 'rain', count: 8 });
    const b = generateParticleParams({ seed: 'rain', count: 8 });
    expect(a).toEqual(b);
  });

  test('produces correct count', () => {
    const particles = generateParticleParams({ seed: 'particles', count: 6 });
    expect(particles.length).toBe(6);
  });

  test('all fx values are between 0.06 and 0.94', () => {
    const particles = generateParticleParams({ seed: 'fx-test', count: 8 });
    for (const p of particles) {
      expect(p.fx).toBeGreaterThanOrEqual(0.06);
      expect(p.fx).toBeLessThanOrEqual(0.94);
    }
  });
});
