import { interpolate } from 'remotion';
import { Motion } from '../types';

type ZoomMotion = Extract<Motion, { type: 'zoom' }>;

export type ZoomResult = {
  scale: number;
  transformOrigin: string;
};

export function computeZoom(
  frame: number,
  durationInFrames: number,
  motion: ZoomMotion,
): ZoomResult {
  const scale = interpolate(
    frame,
    [0, durationInFrames - 1],
    [motion.from, motion.to],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const originMap: Record<string, string> = {
    top:    'center top',
    bottom: 'center bottom',
    center: 'center center',
  };

  return {
    scale,
    transformOrigin: originMap[motion.origin ?? 'center'],
  };
}
