// Hokedex SceneSpec — extends the platform set with project-specific scene types.
// Import this (not platform/types) in hokedex specs and registry.

import type {
  SceneSpec as PlatformSceneSpec,
  SceneElement,
  ElementSpec,
  VideoConfig,
  Motion,
  MotionOutput,
  Effect,
  FontSource,
  TextLine,
  SceneOverlaySpec,
} from '../../platform/types';

export type { SceneElement, ElementSpec, VideoConfig, Motion, MotionOutput, Effect, FontSource, TextLine, SceneOverlaySpec };

// Platform screenshot doesn't know about koFinish. Extend it here.
type PlatformScreenshot = Extract<PlatformSceneSpec, { type: 'screenshot' }>;
type HokedexScreenshot  = PlatformScreenshot & {
  koFinish?: { text: string; sub?: string; at: number };
};

type PlatformWithoutScreenshot = Exclude<PlatformSceneSpec, { type: 'screenshot' }>;

export type SceneSpec =
  | PlatformWithoutScreenshot
  | HokedexScreenshot
  | {
      type: 'chips';
      duration: number;
      items: ElementSpec[];
      layout: string;
      stamp?: { text: string; accentWord: string; at: number };
      transition?: 'cut' | 'fade';
    }
  | {
      type: 'lockup';
      duration: number;
      hook: string;
      name: string;
      sub: string;
    };
