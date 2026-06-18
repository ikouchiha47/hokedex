import { Motion, MotionOutput } from '../types';
import { resolveMotion } from '../core/motion-registry';

export const EMPTY_OUTPUT: MotionOutput = {
  translateX:      0,
  translateY:      0,
  scale:           1,
  rotate:          0,
  transformOrigin: 'center center',
};

export function composeMotions(
  motions: Motion | Motion[] | undefined,
  frame: number,
  durationInFrames: number,
  imageSize: { w: number; h: number } | null,
): MotionOutput {
  if (!motions) return EMPTY_OUTPUT;

  const list = Array.isArray(motions) ? motions : [motions];
  const result: MotionOutput = { ...EMPTY_OUTPUT };

  for (const m of list) {
    const fn = resolveMotion(m.type);
    if (!fn) continue;

    const contrib = fn(frame, durationInFrames, m as unknown as Record<string, unknown>, imageSize);
    if (contrib.translateX !== undefined) result.translateX += contrib.translateX;
    if (contrib.translateY !== undefined) result.translateY += contrib.translateY;
    if (contrib.scale      !== undefined) result.scale      *= contrib.scale;
    if (contrib.rotate     !== undefined) result.rotate     += contrib.rotate;
    if (contrib.transformOrigin !== undefined) result.transformOrigin = contrib.transformOrigin;
  }

  return result;
}

export function motionToTransform(m: MotionOutput): string {
  return `translate(${m.translateX}px, ${m.translateY}px) scale(${m.scale}) rotate(${m.rotate}deg)`;
}
