/* eslint-disable no-bitwise */

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }

  return () => {
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 0xffffffff;
  };
}

export type CircleBounds = {
  kind: 'circle';
  cx: number;
  cy: number;
  r: number;
};

export type RectBounds = {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Bounds = CircleBounds | RectBounds;

export type GeneratedCloud = {
  base: RectBounds;
  lobes: CircleBounds[];
  opacity: number;
};

function circleDist(a: CircleBounds, b: CircleBounds): number {
  const dx = a.cx - b.cx;
  const dy = a.cy - b.cy;
  return Math.sqrt(dx * dx + dy * dy);
}

export function circlesIntersect(a: CircleBounds, b: CircleBounds, padding = 0): boolean {
  return circleDist(a, b) < a.r + b.r + padding;
}

export function rectsIntersect(a: RectBounds, b: RectBounds, padding = 0): boolean {
  return (
    a.x - padding < b.x + b.width + padding &&
    a.x + a.width + padding > b.x - padding &&
    a.y - padding < b.y + b.height + padding &&
    a.y + a.height + padding > b.y - padding
  );
}

export function circleIntersectsRect(circle: CircleBounds, rect: RectBounds, padding = 0): boolean {
  const closestX = Math.max(rect.x, Math.min(circle.cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.cy, rect.y + rect.height));
  const dx = circle.cx - closestX;
  const dy = circle.cy - closestY;
  return dx * dx + dy * dy < (circle.r + padding) * (circle.r + padding);
}

export function intersectsAny(bounds: Bounds, zones: Bounds[], padding = 0): boolean {
  return zones.some(zone => {
    if (bounds.kind === 'circle' && zone.kind === 'circle') {
      return circlesIntersect(bounds, zone, padding);
    }
    if (bounds.kind === 'circle' && zone.kind === 'rect') {
      return circleIntersectsRect(bounds, zone, padding);
    }
    if (bounds.kind === 'rect' && zone.kind === 'circle') {
      return circleIntersectsRect(zone, bounds, padding);
    }
    if (bounds.kind === 'rect' && zone.kind === 'rect') {
      return rectsIntersect(bounds, zone, padding);
    }
    return false;
  });
}

export function getMoonBounds(width: number, height: number): CircleBounds {
  const r = Math.max(18, Math.min(width * 0.08, 30));
  return {
    kind: 'circle',
    cx: width * 0.72,
    cy: height * 0.32,
    r: r + 12,
  };
}

export function getSunBounds(width: number, height: number): CircleBounds {
  const r = Math.max(22, Math.min(width * 0.1, 36));
  return {
    kind: 'circle',
    cx: width * 0.72,
    cy: height * 0.5,
    r: r + 12,
  };
}

function generateCloudCandidate(rand: () => number, width: number, height: number): GeneratedCloud {
  const baseWidth = lerp(width * 0.14, width * 0.26, rand());
  const baseHeight = lerp(height * 0.032, height * 0.05, rand());

  const x = lerp(width * 0.02, width * 0.72, rand());
  const y = lerp(height * 0.12, height * 0.42, rand());

  const base: RectBounds = {
    kind: 'rect',
    x,
    y,
    width: baseWidth,
    height: baseHeight,
  };

  const lobeCount = 2 + Math.floor(rand() * 3);
  const lobes: CircleBounds[] = [];

  for (let i = 0; i < lobeCount; i += 1) {
    const lobeCx = x + baseWidth * lerp(0.18, 0.82, rand());
    const lobeCy = y - baseHeight * lerp(0.1, 0.6, rand());
    const lobeR = baseHeight * lerp(0.7, 1.3, rand());

    const lobe: CircleBounds = { kind: 'circle', cx: lobeCx, cy: lobeCy, r: lobeR };

    let overlaps = false;
    for (const existing of lobes) {
      if (circlesIntersect(lobe, existing, 4)) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      lobes.push(lobe);
    }
  }

  return { base, lobes, opacity: lerp(0.18, 0.5, rand()) };
}

export function generateClouds(params: {
  seed: string;
  width: number;
  height: number;
  count: number;
  protectedZones: Bounds[];
  allowCelestialOverlap?: boolean;
}): GeneratedCloud[] {
  const rand = seededRandom(params.seed);
  const clouds: GeneratedCloud[] = [];
  const maxAttempts = params.count * 50;
  const allowOverlap = params.allowCelestialOverlap ?? false;

  for (let attempt = 0; clouds.length < params.count && attempt < maxAttempts; attempt += 1) {
    const candidate = generateCloudCandidate(rand, params.width, params.height);

    const allBounds: Bounds[] = [candidate.base, ...candidate.lobes];

    if (!allowOverlap) {
      const hitsZone = allBounds.some(b => intersectsAny(b, params.protectedZones, 4));
      if (hitsZone) continue;
    }

    const hitsOther = clouds.some(cloud => rectsIntersect(candidate.base, cloud.base, 14));
    if (hitsOther) continue;

    clouds.push(candidate);
  }

  return clouds;
}

export function generateMoonCraters(params: {
  width: number;
  height: number;
  seed: string;
  count: number;
}): CircleBounds[] {
  const rand = seededRandom(params.seed);
  const mx = params.width * 0.72;
  const my = params.height * 0.32;
  const moonR = Math.max(18, Math.min(params.width * 0.08, 30));
  const maxDist = moonR * 0.72;

  const craters: CircleBounds[] = [];
  const maxAttempts = params.count * 20;

  for (let attempt = 0; craters.length < params.count && attempt < maxAttempts; attempt += 1) {
    const angle = rand() * Math.PI * 2;
    const dist = rand() * maxDist;
    const cr = lerp(1.8, moonR * 0.18, rand());
    const cx = mx + Math.cos(angle) * dist;
    const cy = my + Math.sin(angle) * dist;
    const crater: CircleBounds = { kind: 'circle', cx, cy, r: cr };

    const distFromCenter = Math.sqrt((cx - mx) ** 2 + (cy - my) ** 2);
    if (distFromCenter + cr > moonR) continue;

    let overlaps = false;
    for (const existing of craters) {
      if (circlesIntersect(crater, existing, 3)) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    craters.push(crater);
  }

  return craters;
}

export type GeneratedStar = {
  fx: number;
  fy: number;
  radius: number;
  twinklePhase: number;
};

export function generateStars(params: {
  seed: string;
  width: number;
  height: number;
  count: number;
  excludeBounds?: CircleBounds;
}): GeneratedStar[] {
  const rand = seededRandom(params.seed);
  const stars: GeneratedStar[] = [];
  const maxAttempts = params.count * 30;

  for (let attempt = 0; stars.length < params.count && attempt < maxAttempts; attempt += 1) {
    const fx = lerp(0.03, 0.97, rand());
    const fy = lerp(0.02, 0.35, rand());
    const radius = lerp(0.8, 2.2, rand());

    if (params.excludeBounds) {
      const starAbs: CircleBounds = { kind: 'circle', cx: fx * params.width, cy: fy * params.height, r: radius };
      if (intersectsAny(starAbs, [params.excludeBounds], 8)) continue;
    }

    let overlaps = false;
    for (const s of stars) {
      const dx = fx - s.fx;
      const dy = fy - s.fy;
      if (Math.sqrt(dx * dx + dy * dy) < 0.03) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    stars.push({ fx, fy, radius, twinklePhase: rand() * Math.PI * 2 });
  }

  return stars;
}

export function generateParticleParams(params: {
  seed: string;
  count: number;
}): Array<{ fx: number; radius?: number; speedFactor?: number }> {
  const rand = seededRandom(params.seed);
  const particles: Array<{ fx: number; radius?: number; speedFactor?: number }> = [];
  const minGap = 1 / (params.count + 1) * 0.6;
  const used: number[] = [];

  for (let i = 0; i < params.count; i += 1) {
    let fx: number;
    let overlap: boolean;
    let attempts = 0;

    do {
      fx = lerp(0.06, 0.94, rand());
      overlap = used.some(u => Math.abs(u - fx) < minGap);
      attempts += 1;
    } while (overlap && attempts < 30);

    used.push(fx);

    particles.push({
      fx,
      radius: lerp(2, 6, rand()),
      speedFactor: lerp(0.7, 1.3, rand()),
    });
  }

  return particles;
}
