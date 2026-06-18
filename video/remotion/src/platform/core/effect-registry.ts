import React from 'react';

export type EffectOutput = {
  contentStyle?: React.CSSProperties;
  underlays?: React.ReactNode[];
  overlays?: React.ReactNode[];
};

export type EffectFn<P = unknown> = (
  localFrame: number,
  fps: number,
  params: P,
  size: { w: number; h: number },
) => EffectOutput;

const registry = new Map<string, EffectFn>();

export function registerEffect(name: string, fn: EffectFn<any>): void {
  if (registry.has(name)) throw new Error(`duplicate effect registration: ${name}`);
  registry.set(name, fn);
}

export function resolveEffect(name: string): EffectFn {
  const fn = registry.get(name);
  if (!fn) throw new Error(`unknown effect: ${name}`);
  return fn;
}
