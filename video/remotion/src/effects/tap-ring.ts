import React from 'react';
import { interpolate } from 'remotion';
import { registerEffect, EffectOutput } from '../core/effect-registry';
import { Effect } from '../types';

type Params = Extract<Effect, { type: 'core:tap-ring' }>;

registerEffect('core:tap-ring', (localFrame, fps, params: Params, size): EffectOutput => {
  const count        = params.count        ?? 5;
  const stagger      = params.stagger      ?? 0.4;
  const ringDuration = params.ringDuration ?? 0.5;
  const maxScale     = params.maxScale     ?? 2.6;
  const thickness    = params.thickness    ?? 3;
  const color        = params.color        ?? '#9d5cff';
  const ringFrames   = Math.round(ringDuration * fps);

  const overlays: React.ReactNode[] = [];

  for (let i = 0; i < count; i++) {
    const ringStart = Math.round(i * stagger * fps);
    const ringLocal = localFrame - ringStart;
    if (ringLocal < 0 || ringLocal > ringFrames) continue;

    const p       = ringLocal / ringFrames;
    const scale   = interpolate(p, [0, 1],          [1.0, maxScale]);
    const opacity = interpolate(p, [0, 0.15, 1],    [0.9, 0.7, 0]);

    overlays.push(
      React.createElement('div', {
        key: i,
        style: {
          position: 'absolute',
          inset: 0,
          borderRadius: size.h,
          border: `${thickness}px solid ${color}`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          opacity,
          pointerEvents: 'none',
        } as React.CSSProperties,
      }),
    );
  }

  return { overlays };
});
