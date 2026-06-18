import React from 'react';

// A SceneOverlay is a fullscreen effect rendered on top of the entire scene.
// Examples: vignette, film grain, lens flare, color grade, chromatic aberration.
// Unlike element effects, overlays have no concept of position — they always fill 1080x1920.
export type SceneOverlayFn = (
  frame: number,
  fps: number,
  params: Record<string, unknown>,
) => React.ReactNode;

const registry = new Map<string, SceneOverlayFn>();

export function registerSceneOverlay(type: string, fn: SceneOverlayFn): void {
  if (registry.has(type)) throw new Error(`duplicate scene overlay registration: ${type}`);
  registry.set(type, fn);
}

export function resolveSceneOverlay(type: string): SceneOverlayFn | undefined {
  return registry.get(type);
}
