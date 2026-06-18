import { interpolate } from 'remotion';
import { Motion } from '../types';

type SlideMotion = Extract<Motion, { type: 'slide' }>;

export type SlideResult = {
  translateX: number;
  translateY: number;
};

// Returns CSS translate values for a slide enter motion.
// progress: 0 = fully off-screen, 1 = fully on-screen (pass spring progress or linear t)
export function computeSlide(progress: number, motion: SlideMotion): SlideResult {
  const dist = interpolate(progress, [0, 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return {
    translateX: motion.direction === 'right' ?  dist * 1080
              : motion.direction === 'left'  ? -dist * 1080
              : 0,
    translateY: motion.direction === 'up'    ?  dist * 1920
              : motion.direction === 'down'  ? -dist * 1920
              : 0,
  };
}

// Ease-out cubic — no spring bounce.
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}

// Returns slide result driven by ease-out over settleDuration frames.
export function computeSlideEased(
  frame: number,
  motion: SlideMotion,
  settleDuration: number,
): SlideResult {
  const t        = frame / Math.max(1, settleDuration);
  const progress = easeOutCubic(t);
  return computeSlide(progress, motion);
}
