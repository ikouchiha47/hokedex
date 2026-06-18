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

export type EffectRegistry = {
  register(name: string, fn: EffectFn<any>): void;
  resolve(name: string): EffectFn;
};

export function createEffectRegistry(): EffectRegistry {
  const map = new Map<string, EffectFn>();
  return {
    register(name, fn) {
      if (map.has(name)) throw new Error(`duplicate effect registration: ${name}`);
      map.set(name, fn);
    },
    resolve(name) {
      const fn = map.get(name);
      if (!fn) throw new Error(`unknown effect: ${name}`);
      return fn;
    },
  };
}

const _default = createEffectRegistry();
export const registerEffect = _default.register.bind(_default);
export const resolveEffect  = _default.resolve.bind(_default);
