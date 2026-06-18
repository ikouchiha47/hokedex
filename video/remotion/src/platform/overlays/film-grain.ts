import React from 'react';
import { registerSceneOverlay } from '../core/scene-overlay-registry';

// Adds animated film grain noise over the scene.
// params:
//   opacity:   0–1, default 0.08
//   size:      grain particle size px, default 1.5
//   animated:  boolean, default true — grain changes each frame
registerSceneOverlay('core:film-grain', (_frame, _fps, _params): React.ReactNode => {
  // TODO: implement — canvas-based or CSS noise texture with per-frame seed
  return null;
});
