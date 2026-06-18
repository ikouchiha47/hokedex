import { interpolate } from 'remotion';
import { Motion } from '../types';
import { computePan, overflowPx, PanResult } from './pan';
import { computeZoom, ZoomResult } from './zoom';

// Ken Burns: simultaneous pan + zoom, classic documentary/photo animation.
// Expressed as a single motion combining both axes.
// In spec: use motion/pan for simple pan, motion/zoom for simple zoom,
// or KenBurnsMotion for the combined effect.

export type KenBurnsMotion = {
  type:   'ken-burns';
  pan:    Extract<Motion, { type: 'pan' }>;
  zoom:   Extract<Motion, { type: 'zoom' }>;
};

export type KenBurnsResult = PanResult & ZoomResult;

export function computeKenBurns(
  frame: number,
  durationInFrames: number,
  motion: KenBurnsMotion,
  imageSize: { w: number; h: number },
  startFrame = 0,
): KenBurnsResult {
  return {
    ...computePan(frame, durationInFrames, motion.pan, imageSize, startFrame),
    ...computeZoom(frame, durationInFrames, motion.zoom),
  };
}
