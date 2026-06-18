import { MotionOutput } from '../types';

// A motion handler receives frame context and the raw motion spec object.
// It returns a partial MotionOutput — only the fields it affects.
// translateX/Y are additive, scale is multiplicative, transformOrigin: last wins.
export type MotionFn = (
  frame: number,
  durationInFrames: number,
  motion: Record<string, unknown>,
  imageSize: { w: number; h: number } | null,
) => Partial<MotionOutput>;

const registry = new Map<string, MotionFn>();

export function registerMotion(type: string, fn: MotionFn): void {
  if (registry.has(type)) throw new Error(`duplicate motion registration: ${type}`);
  registry.set(type, fn);
}

export function resolveMotion(type: string): MotionFn | undefined {
  return registry.get(type);
}
