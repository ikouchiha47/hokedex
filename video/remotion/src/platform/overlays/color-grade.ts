import React from 'react';
import { registerSceneOverlay } from '../core/scene-overlay-registry';

// Applies a color grade via CSS mix-blend-mode overlay.
// params:
//   tint:      CSS color to blend, default 'transparent'
//   opacity:   0–1 blend strength, default 0.15
//   mode:      CSS mix-blend-mode, default 'color'
//   saturation: 0–2 CSS filter saturate(), default 1
//   contrast:  0–2 CSS filter contrast(), default 1
registerSceneOverlay('core:color-grade', (_frame, _fps, _params): React.ReactNode => {
  // TODO: implement — AbsoluteFill div with backdrop-filter or mix-blend-mode
  return null;
});
