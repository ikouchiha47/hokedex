import { interpolate, spring } from 'remotion';
import { registerEffect, EffectOutput } from '../core/effect-registry';
import { Effect } from '../types';

type Params = Extract<Effect, { type: 'core:pop-in' }>;

registerEffect('core:pop-in', (localFrame, fps, params: Params): EffectOutput => {
  const overshoot  = params.overshoot          ?? 2.2;
  const damping    = params.spring?.damping    ?? 14;
  const stiffness  = params.spring?.stiffness  ?? 260;

  const progress = spring({ frame: Math.max(0, localFrame), fps, config: { damping, stiffness } });
  const scale    = localFrame < 0 ? overshoot : interpolate(progress, [0, 1], [overshoot, 1.0]);
  const opacity  = localFrame < 0 ? 0         : interpolate(progress, [0, 0.15], [0, 1]);

  return { contentStyle: { transform: `scale(${scale})`, opacity } };
});
