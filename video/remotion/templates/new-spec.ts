// Template: new video spec for the hokedex project.
// Copy to: src/projects/hokedex/specs/<name>.ts
// Then add to: src/projects/hokedex/index.ts compositions array.
//
// Assets go in: video/remotion/public/hokedex/
// Reference as: 'hokedex/filename.png'

import '../registry';
import { SceneSpec, VideoConfig } from '../types';
import { VideoPlayer } from '../../../platform/VideoPlayer';
import React from 'react';

export const videoConfig: VideoConfig = {
  bgColor:             '#0a0a0a',
  transitionFillColor: '#0a0a0a',
  accentColor:         '#9d5cff',
  fontFamily:          "'Space Grotesk', sans-serif",
  fonts: [
    { type: 'google', family: 'Space Grotesk', weights: [400, 700, 800, 900] },
  ],
};

export const scenes: SceneSpec[] = [
  {
    type: 'text',
    duration: 1.5,
    lines: [
      { text: 'Your hook here', enter: 'slide-up' },
      { text: 'second line',    enter: 'slide-up', accent: true },
    ],
    transition: 'cut',
  },
  {
    type: 'screenshot',
    duration: 3,
    src: 'hokedex/your-screenshot.png',
    preset: 'ken-burns',
  },
  {
    type: 'lockup',
    duration: 2.5,
    hook: "gotta hook 'em all",
    name: 'hokédex',
    sub: 'Free · Android · No account',
  },
];

const FPS = 30;
const totalFrames = scenes.reduce((s, sc) => s + Math.round(sc.duration * FPS), 0);

const Video: React.FC = () => React.createElement(VideoPlayer, { scenes, videoConfig });

// Change id to something unique — shown in Remotion Studio composition list
export const myComposition = {
  id:               'MyNewVideo',
  component:        Video,
  durationInFrames: totalFrames,
  fps:              FPS,
  width:            1080,
  height:           1920,
};
