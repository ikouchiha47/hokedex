import React from 'react';
import { registerSceneOverlay } from '../core/scene-overlay-registry';

// Animated light leak — colored blobs that sweep across the frame.
// params:
//   color:     CSS color, default '#ff9933'
//   opacity:   0–1 peak opacity, default 0.25
//   direction: 'left' | 'right' | 'top' | 'bottom', default 'right'
//   startAt:   seconds, default 0
//   duration:  seconds, default 1.2
registerSceneOverlay('core:light-leak', (_frame, _fps, _params): React.ReactNode => {
  // TODO: implement — animated gradient div translating across the stage
  return null;
});
