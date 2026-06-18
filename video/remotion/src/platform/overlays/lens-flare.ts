import React from 'react';
import { registerSceneOverlay } from '../core/scene-overlay-registry';

// Simulates a camera lens flare streak across the frame.
// params:
//   x:         0–1080, horizontal origin of flare, default 540
//   y:         0–1920, vertical origin, default 200
//   color:     CSS color, default '#ffffff'
//   intensity: 0–1 peak opacity, default 0.6
//   startAt:   seconds when flare begins, default 0
//   duration:  seconds for full appear+fade, default 0.4
registerSceneOverlay('core:lens-flare', (_frame, _fps, _params): React.ReactNode => {
  // TODO: implement — overlapping semi-transparent divs along a streak axis
  return null;
});
