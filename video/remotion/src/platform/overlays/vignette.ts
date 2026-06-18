import React from 'react';
import { registerSceneOverlay } from '../core/scene-overlay-registry';

// Darkens edges of the frame, drawing attention to the center.
// params:
//   intensity: 0–1, default 0.5  — how dark the outer edge gets
//   color:     CSS color, default '#000000'
//   shape:     'ellipse' | 'rect', default 'ellipse'
registerSceneOverlay('core:vignette', (_frame, _fps, _params): React.ReactNode => {
  // TODO: implement — return a radial-gradient AbsoluteFill div
  return null;
});
