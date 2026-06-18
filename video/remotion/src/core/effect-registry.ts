import React from 'react';

export type EffectOutput = {
  contentStyle?: React.CSSProperties;  // transform/opacity applied to element wrapper
  underlays?: React.ReactNode[];       // rendered behind element (bloom glow)
  overlays?: React.ReactNode[];        // rendered in front of element (rings, etc.)
};

// localFrame: frames since this effect started (0 = birth frame)
// fps: from useVideoConfig
// params: the effect spec object from the scene
// size: element w/h in stage px
export type EffectFn<P = unknown> = (
  localFrame: number,
  fps: number,
  params: P,
  size: { w: number; h: number },
) => EffectOutput;

const registry = new Map<string, EffectFn>();

export function registerEffect(name: string, fn: EffectFn): void {
  if (registry.has(name)) throw new Error(`duplicate effect registration: ${name}`);
  registry.set(name, fn);
}

export function resolveEffect(name: string): EffectFn {
  const fn = registry.get(name);
  if (!fn) throw new Error(`unknown effect: ${name}`);
  return fn;
}
