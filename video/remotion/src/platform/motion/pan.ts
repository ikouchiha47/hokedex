import { interpolate } from 'remotion';
import { Motion } from '../types';

type PanMotion = Extract<Motion, { type: 'pan' }>;

export function overflowPx(naturalW: number, naturalH: number): number {
  return Math.max(0, naturalH * (1080 / naturalW) - 1920);
}

export type PanResult = {
  translateX: number;
  translateY: number;
};

export function computePan(
  frame: number,
  durationInFrames: number,
  motion: PanMotion,
  imageSize: { w: number; h: number },
  startFrame = 0,
): PanResult {
  const overflow = overflowPx(imageSize.w, imageSize.h);
  const fromPx   = (motion.from ?? 0) * overflow;
  const toPx     = motion.to * overflow;

  const f0 = startFrame;
  const f1 = Math.max(f0 + 1, durationInFrames - 1);

  const travelled = interpolate(
    Math.max(0, frame - f0),
    [0, f1 - f0],
    [fromPx, toPx],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const delta = motion.direction === 'down' || motion.direction === 'right'
    ? -travelled
    : travelled;

  return {
    translateX: motion.direction === 'left' || motion.direction === 'right' ? delta : 0,
    translateY: motion.direction === 'up'   || motion.direction === 'down'  ? delta : 0,
  };
}
