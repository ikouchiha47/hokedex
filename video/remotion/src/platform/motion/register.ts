// Registers platform motion types. Import once at entry point (spec.ts or VideoPlayer).
import { registerMotion } from '../core/motion-registry';
import { computePan, overflowPx } from './pan';
import { computeZoom } from './zoom';

registerMotion('pan', (frame, durationInFrames, motion, imageSize) => {
  if (!imageSize) return {};
  const m = motion as { direction: string; from?: number; to: number; startAt?: number; endAt?: number };
  const f0 = Math.round((m.startAt ?? 0) * durationInFrames);
  const f1 = Math.round((m.endAt   ?? 1) * durationInFrames) - 1;
  const result = computePan(frame, f1 - f0 + 1, m as any, imageSize, f0);
  return { translateX: result.translateX, translateY: result.translateY };
});

registerMotion('zoom', (frame, durationInFrames, motion) => {
  const m = motion as { from: number; to: number; origin?: string; startAt?: number; endAt?: number };
  const f0 = Math.round((m.startAt ?? 0) * durationInFrames);
  const f1 = Math.round((m.endAt   ?? 1) * durationInFrames) - 1;
  const result = computeZoom(frame - f0, f1 - f0 + 1, m as any);
  const originMap: Record<string, string> = {
    top: 'center top', bottom: 'center bottom', center: 'center center',
  };
  return {
    scale:           result.scale,
    transformOrigin: originMap[m.origin ?? 'center'],
  };
});
