// Template: bootstrap a new project.
//
// Steps:
// 1. mkdir -p src/projects/<yourproject>/{elements,scenes,scene-effects,specs,presets}
// 2. Copy this file to src/projects/<yourproject>/specs/main.ts
// 3. Create src/projects/<yourproject>/registry.ts  (see below)
// 4. Create src/projects/<yourproject>/index.ts     (see below)
// 5. Add assets to public/<yourproject>/
// 6. Register in Root.tsx or add a separate Root file
//
// ── registry.ts ──────────────────────────────────────────────────────────────
//
// import '../../platform/registry';
// import '../../platform/effects/index';
// import '../../platform/motion/register';
// import '../../platform/overlays/index';
// import '../../platform/presets/index';
// import { registerScene } from '../../platform/core/scene-registry';
// import { MyScreenshotScene } from './scenes/MyScreenshotScene';
// import './elements/index';
//
// registerScene('screenshot', MyScreenshotScene);
//
// ── index.ts ─────────────────────────────────────────────────────────────────
//
// import { mainComposition } from './specs/main';
// export const compositions = [mainComposition];
//
// ── types.ts ─────────────────────────────────────────────────────────────────
//
// import type { SceneSpec as PlatformSceneSpec, ... } from '../../platform/types';
// export type { VideoConfig, Motion, ElementSpec, SceneElement, Effect, FontSource };
// export type SceneSpec = PlatformSceneSpec | { type: 'myproject:custom'; ... };
//
// ─────────────────────────────────────────────────────────────────────────────

import '../registry';   // replace with your own registry import
import { SceneSpec, VideoConfig } from '../types';  // replace with your types
import { VideoPlayer } from '../../../platform/VideoPlayer';
import React from 'react';

export const videoConfig: VideoConfig = {
  bgColor:    '#0a0a0a',
  accentColor: '#your-brand-color',
  fonts: [
    { type: 'google', family: 'Your Font', weights: [400, 700, 800] },
  ],
};

export const scenes: SceneSpec[] = [
  // your scenes here
];

const FPS = 30;
const totalFrames = scenes.reduce((s, sc) => s + Math.round(sc.duration * FPS), 0);

const Video: React.FC = () => React.createElement(VideoPlayer, { scenes, videoConfig });

export const mainComposition = {
  id:               'MyProjectMain',
  component:        Video,
  durationInFrames: totalFrames,
  fps:              FPS,
  width:            1080,
  height:           1920,
};
