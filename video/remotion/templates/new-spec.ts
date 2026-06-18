// Template: new video spec.
// Copy to: src/projects/<project>/specs/<name>.ts
// Then add to: src/projects/<project>/index.ts compositions array.
//
// Assets go in: video/remotion/public/<project>/
// Reference as: '<project>/filename.png'

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
    src: '<project>/your-screenshot.png',
    preset: 'ken-burns',
  },
  {
    type: 'lockup',
    duration: 2.5,
    hook: 'your closing hook',
    name: 'your app',
    sub: 'Your tagline here',
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
