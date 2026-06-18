import React from 'react';

// A SceneOverlay is a fullscreen effect rendered on top of the entire scene.
// Examples: vignette, film grain, lens flare, color grade, chromatic aberration.
// Unlike element effects, overlays have no concept of position — they always fill 1080x1920.
export type SceneOverlayFn = (
  frame: number,
  fps: number,
  params: Record<string, unknown>,
) => React.ReactNode;

export type SceneOverlayRegistry = {
  register(type: string, fn: SceneOverlayFn): void;
  resolve(type: string): SceneOverlayFn | undefined;
};

export function createSceneOverlayRegistry(): SceneOverlayRegistry {
  const map = new Map<string, SceneOverlayFn>();
  return {
    register(type, fn) {
      if (map.has(type)) throw new Error(`duplicate scene overlay registration: ${type}`);
      map.set(type, fn);
    },
    resolve(type) {
      return map.get(type);
    },
  };
}

const _default = createSceneOverlayRegistry();
export const registerSceneOverlay = _default.register.bind(_default);
export const resolveSceneOverlay  = _default.resolve.bind(_default);
