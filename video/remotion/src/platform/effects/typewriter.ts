import React from 'react';
import { registerEffect, EffectOutput } from '../core/effect-registry';
import { Effect } from '../types';

type Params = Extract<Effect, { type: 'core:typewriter' }>;

registerEffect('core:typewriter', (localFrame, fps, params: Params): EffectOutput => {
  const speed       = params.speed       ?? 12;
  const cursor      = params.cursor      ?? false;
  const cursorColor = params.cursorColor ?? '#9d5cff';

  const revealed  = Math.min(1, (localFrame / fps) * (speed / 12));
  const clipRight = (1 - revealed) * 100;

  const cursorOpacity = cursor
    ? Math.floor((localFrame / Math.round(fps * 0.5))) % 2 === 0 ? 1 : 0
    : 0;

  const contentStyle: React.CSSProperties = {
    clipPath: `inset(0 ${clipRight}% 0 0)`,
    position: 'relative',
  };

  const overlays: React.ReactNode[] = cursor
    ? [
        React.createElement('div', {
          key: 'cursor',
          style: {
            position: 'absolute',
            top: '10%',
            bottom: '10%',
            left: `${revealed * 100}%`,
            width: 3,
            background: cursorColor,
            opacity: cursorOpacity,
            pointerEvents: 'none',
          } as React.CSSProperties,
        }),
      ]
    : [];

  return { contentStyle, overlays };
});
