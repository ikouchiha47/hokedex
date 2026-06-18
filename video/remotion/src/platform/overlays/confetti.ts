import React from 'react';
import { interpolate } from 'remotion';
import { registerSceneOverlay } from '../core/scene-overlay-registry';

// params:
//   count:    number of pieces, default 80
//   origin:   'top' | 'sides' | 'corners', default 'sides'
//   colors:   string[], default rainbow set
//   startAt:  seconds into scene, default 0
//   duration: seconds the burst lasts, default 2.5
//   gravity:  fall speed multiplier, default 1.0
//   spread:   horizontal spread 0–1, default 0.8

const DEFAULT_COLORS = ['#ff4081', '#ffeb3b', '#00bcd4', '#76ff03', '#ff6d00', '#e040fb', '#ffffff'];

// Deterministic pseudo-random from seed
function rand(seed: number): number {
  const x = Math.sin(seed + 1) * 43758.5453;
  return x - Math.floor(x);
}

type Piece = {
  startX: number;   // 0–1 of stage width
  startY: number;   // 0–1 of stage height (can be negative = above frame)
  velX:   number;   // horizontal drift, -1 to 1
  color:  string;
  size:   number;   // px
  rot0:   number;   // initial rotation degrees
  rotV:   number;   // rotation velocity degrees/s
  shape:  'rect' | 'circle';
  delay:  number;   // stagger offset 0–1
};

function buildPieces(
  count: number,
  origin: string,
  colors: string[],
  spread: number,
): Piece[] {
  return Array.from({ length: count }, (_, i) => {
    const r = (n: number) => rand(i * 17 + n);

    const color = colors[Math.floor(r(0) * colors.length)];
    const size  = 10 + r(1) * 14;
    const shape = r(2) < 0.4 ? 'circle' : 'rect';
    const rot0  = r(3) * 360;
    const rotV  = (r(4) - 0.5) * 720;
    const delay = r(5) * 0.4;                 // stagger up to 0.4s

    let startX: number;
    let startY: number;
    let velX:   number;

    if (origin === 'top') {
      startX = 0.1 + r(6) * 0.8;
      startY = -0.05;
      velX   = (r(7) - 0.5) * spread;
    } else if (origin === 'corners') {
      const left = i % 2 === 0;
      startX = left ? r(6) * 0.15 : 0.85 + r(6) * 0.15;
      startY = r(7) * 0.1;
      velX   = left ? r(8) * spread * 0.5 : -r(8) * spread * 0.5;
    } else {
      // sides — shoot in from left and right edges
      const left = i % 2 === 0;
      startX = left ? -0.05 : 1.05;
      startY = 0.1 + r(6) * 0.5;
      velX   = left ? r(7) * spread : -r(7) * spread;
    }

    return { startX, startY, velX, color, size, rot0, rotV, shape, delay };
  });
}

registerSceneOverlay('core:confetti', (frame, fps, params): React.ReactNode => {
  const count    = (params.count    as number)   ?? 80;
  const origin   = (params.origin   as string)   ?? 'sides';
  const colors   = (params.colors   as string[]) ?? DEFAULT_COLORS;
  const startAt  = (params.startAt  as number)   ?? 0;
  const duration = (params.duration as number)   ?? 2.5;
  const gravity  = (params.gravity  as number)   ?? 1.0;
  const spread   = (params.spread   as number)   ?? 0.8;

  const startFrame = Math.round(startAt * fps);
  const endFrame   = startFrame + Math.round(duration * fps);
  const t = (frame - startFrame) / fps;   // seconds since burst started

  if (frame < startFrame || frame > endFrame + fps * 0.5) return null;

  const pieces = buildPieces(count, origin, colors, spread);

  const nodes = pieces.map((p, i) => {
    const pt = Math.max(0, t - p.delay);
    if (pt <= 0) return null;

    const fallProgress = pt / duration;
    const x = (p.startX + p.velX * pt) * 1080;
    const y = (p.startY + 0.18 * gravity * pt * pt) * 1920;  // gravity arc; tune with gravity param (default 1.0, lower = slower)

    const opacity = interpolate(fallProgress, [0, 0.1, 0.7, 1.0], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });

    const rotation = p.rot0 + p.rotV * pt;
    const borderRadius = p.shape === 'circle' ? '50%' : '2px';

    return React.createElement('div', {
      key: i,
      style: {
        position:     'absolute',
        left:         x - p.size / 2,
        top:          y - p.size / 2,
        width:        p.size,
        height:       p.shape === 'rect' ? p.size * 0.5 : p.size,
        background:   p.color,
        borderRadius,
        opacity,
        transform:    `rotate(${rotation}deg)`,
        pointerEvents: 'none',
      } as React.CSSProperties,
    });
  });

  return React.createElement('div', {
    style: { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' } as React.CSSProperties,
  }, ...nodes);
});
