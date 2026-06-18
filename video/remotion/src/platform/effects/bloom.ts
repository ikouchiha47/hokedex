import React from 'react';
import { interpolate } from 'remotion';
import { registerEffect, EffectOutput } from '../core/effect-registry';
import { Effect } from '../types';

type Params = Extract<Effect, { type: 'core:bloom' }>;

registerEffect('core:bloom', (localFrame, fps, params: Params, size): EffectOutput => {
  const delay    = params.delay    ?? 0.2;
  const duration = params.duration ?? 0.8;
  const maxScale = params.maxScale ?? 3.8;
  const maxBlur  = params.maxBlur  ?? 80;
  const peakAt   = params.peakAt   ?? 0.15;
  const t        = localFrame / fps;

  if (t < delay) return {};

  const p       = Math.min(1, (t - delay) / duration);
  const scale   = interpolate(p, [0, 1],          [1.0, maxScale]);
  const opacity = interpolate(p, [0, peakAt, 1],  [0, 1, 0]);
  const blur    = interpolate(p, [0, 1],           [8, maxBlur]);

  return {
    underlays: [
      React.createElement('div', {
        key: 'bloom',
        style: {
          position: 'absolute',
          inset: 0,
          borderRadius: size.h,
          background: params.color,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          opacity,
          filter: `blur(${blur}px)`,
          pointerEvents: 'none',
        } as React.CSSProperties,
      }),
    ],
  };
});
