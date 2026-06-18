// Bloom — a filled, blurred copy of the element shape that expands and fades.
// Same concept as bloom in game engines/VFX: bright surface emits light that
// bleeds outward, softens, dissolves. Source element stays sharp underneath.

import { interpolate } from 'remotion';

export type BloomState = {
  scale: number;
  opacity: number;
  blur: number;   // px — increases as bloom expands (gets softer at the edges)
};

export function bloomValues(
  frame: number,
  startFrame: number,
  fps: number,
  delay = 0.2,
  duration = 0.8,
): BloomState {
  const t = (frame - startFrame) / fps;

  if (t < delay) return { scale: 1, opacity: 0, blur: 0 };

  const p = Math.min(1, (t - delay) / duration);

  return {
    scale:   interpolate(p, [0, 1], [1.0, 3.8]),
    opacity: interpolate(p, [0, 0.06, 1], [0, 1, 0]),
    blur:    interpolate(p, [0, 1], [8, 80]),
  };
}
