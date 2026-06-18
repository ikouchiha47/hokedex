import React from 'react';

export type SceneRegistry = {
  register(type: string, component: React.FC<any>): void;
  resolve(type: string): React.FC<any>;
};

export function createSceneRegistry(): SceneRegistry {
  const map = new Map<string, React.FC<any>>();
  return {
    register(type, component) {
      const existing = map.get(type);
      if (existing) {
        if (existing !== component) throw new Error(`duplicate scene registration: ${type}`);
        return;
      }
      map.set(type, component);
    },
    resolve(type) {
      const c = map.get(type);
      if (!c) throw new Error(`unknown scene type: ${type}`);
      return c;
    },
  };
}

// Global default — used by legacy code that calls registerScene/resolveScene directly.
const _default = createSceneRegistry();
export const registerScene = _default.register.bind(_default);
export const resolveScene  = _default.resolve.bind(_default);
