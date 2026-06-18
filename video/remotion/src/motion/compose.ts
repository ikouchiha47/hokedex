import { Motion, MotionOutput } from '../types';
import { computePan } from './pan';
import { computeZoom } from './zoom';

export const EMPTY_OUTPUT: MotionOutput = {
  translateX:      0,
  translateY:      0,
  scale:           1,
  rotate:          0,
  transformOrigin: 'center center',
};

// Resolve startAt/endAt to actual frame range within the scene.
function motionFrameRange(
  m: Extract<Motion, { startAt?: number; endAt?: number }>,
  durationInFrames: number,
): { f0: number; f1: number } {
  const f0 = Math.round((m.startAt ?? 0) * durationInFrames);
  const f1 = Math.round((m.endAt   ?? 1) * durationInFrames) - 1;
  return { f0, f1: Math.max(f0 + 1, f1) };
}

// Compute one motion's contribution at the given frame.
function computeOne(
  m: Motion,
  frame: number,
  durationInFrames: number,
  imageSize: { w: number; h: number } | null,
): Partial<MotionOutput> {
  if (m.type === 'pan') {
    if (!imageSize) return {};
    const { f0, f1 } = motionFrameRange(m, durationInFrames);
    const result = computePan(frame, f1 - f0 + 1, m, imageSize, f0);
    return { translateX: result.translateX, translateY: result.translateY };
  }

  if (m.type === 'zoom') {
    const { f0, f1 } = motionFrameRange(m, durationInFrames);
    const result = computeZoom(frame - f0, f1 - f0 + 1, m);
    const originMap: Record<string, string> = {
      top: 'center top', bottom: 'center bottom', center: 'center center',
    };
    return {
      scale:           result.scale,
      transformOrigin: originMap[m.origin ?? 'center'],
    };
  }

  return {};
}

// Merge all motion contributions into one MotionOutput.
// translateX/Y: additive. scale: multiplicative. transformOrigin: last zoom wins.
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
    const contrib = computeOne(m, frame, durationInFrames, imageSize);
    if (contrib.translateX !== undefined) result.translateX += contrib.translateX;
    if (contrib.translateY !== undefined) result.translateY += contrib.translateY;
    if (contrib.scale      !== undefined) result.scale      *= contrib.scale;
    if (contrib.rotate     !== undefined) result.rotate     += contrib.rotate;
    if (contrib.transformOrigin !== undefined) result.transformOrigin = contrib.transformOrigin;
  }

  return result;
}

// Build a single CSS transform string from a MotionOutput.
export function motionToTransform(m: MotionOutput): string {
  return `translate(${m.translateX}px, ${m.translateY}px) scale(${m.scale}) rotate(${m.rotate}deg)`;
}
