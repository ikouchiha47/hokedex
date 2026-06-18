import './registry';
import './core-elements/index';
import './effects/index';
import { SceneSpec, VideoConfig } from './types';

export const videoConfig: VideoConfig = {
  bgColor:             '#0a0a0a',
  transitionFillColor: '#0a0a0a',
  accentColor:         '#9d5cff',
  fontFamily:          "'Space Grotesk', sans-serif",
  fonts: [
    { type: 'google', family: 'Space Grotesk', weights: [400, 600, 700, 800, 900] },
  ],
};

export const scenes: SceneSpec[] = [
  {
    type: 'text',
    duration: 1.2,
    lines: [
      { text: 'I made a',   enter: 'slide-up' },
      { text: 'Pokédex.',   enter: 'slide-up' },
    ],
    transition: 'cut',
  },
  {
    type: 'text',
    duration: 1.2,
    lines: [
      { text: 'for people', enter: 'slide-left' },
      { parts: [{ text: 'I ' }, { text: 'date.', accent: true }], enter: 'slide-right' },
    ],
    transition: 'cut',
  },
  {
    type: 'screenshot',
    duration: 3.5,
    src: 'seed_landing.png',
    enter: { type: 'slide', direction: 'up' },
    elements: [
      {
        id: 'circle-1',
        element: 'core:circle',
        x: 408, y: 834, w: 160, h: 163,
        at: 0.5,
        data: { color: '#9d5cff' },
        effects: [{ type: 'core:tap-ring', count: 5, stagger: 0.4, color: '#9d5cff' }],
      },
    ],
    koFinish: { text: 'DEXED.', at: 2.8 },
  },
  {
    type: 'chips',
    duration: 4.2,
    items: [
      { element: 'core:pill', w: 260, h: 80, data: { label: 'Red Flag',      emoji: '🚩', color: '#ef4444' } },
      { element: 'core:pill', w: 280, h: 80, data: { label: 'Ghost Type',    emoji: '👻', color: '#a78bfa' } },
      { element: 'core:pill', w: 320, h: 80, data: { label: 'Situationship', emoji: '💛', color: '#facc15' } },
      { element: 'core:pill', w: 220, h: 80, data: { label: 'Toxic',         emoji: '☣️', color: '#4ade80' } },
      { element: 'core:pill', w: 260, h: 80, data: { label: 'Hot Mess',      emoji: '🔥', color: '#fb923c' } },
      { element: 'core:pill', w: 200, h: 80, data: { label: 'NPC',           emoji: '🤖', color: '#9ca3af' } },
      { element: 'core:pill', w: 220, h: 80, data: { label: 'Delulu',        emoji: '🌀', color: '#f472b6' } },
      { element: 'core:pill', w: 260, h: 80, data: { label: 'Wild Card',     emoji: '🃏', color: '#2dd4bf' } },
    ],
    layout: 'radial-spoke',
    stamp: { text: 'everyone has a', accentWord: 'type.', at: 3.0 },
    transition: 'cut',
  },
  // Profile — slide in with pill overlay
  {
    type: 'screenshot',
    duration: 2.5,
    src: 'profile.png',
    enter: { type: 'slide', direction: 'up' },
    elements: [
      {
        id: 'red-flag-pill',
        element: 'core:pill',
        x: 540, y: 705,
        w: 620, h: 110,
        at: 1.2,
        data: { label: 'Red Flag', emoji: '🚩', color: '#ef4444' },
        effects: [
          { type: 'core:pop-in' },
          { type: 'core:bloom', color: '#ef4444', delay: 0.3, duration: 0.8 },
        ],
      },
    ],
  },
  // Profile — pan down to reveal full page
  {
    type: 'screenshot',
    duration: 2.0,
    src: 'profile.png',
    motion: { type: 'pan', direction: 'down', to: 0.85 },
  },
  // Search intro text
  {
    type: 'text',
    duration: 2.0,
    lines: [
      { text: 'Search for',      enter: 'slide-up' },
      { text: 'familiar faces',  enter: 'slide-up', accent: true },
    ],
    transition: 'cut',
  },
  // Search screen — slide up, no pan
  {
    type: 'screenshot',
    duration: 1.2,
    src: 'search.png',
    enter: { type: 'slide', direction: 'up' },
  },
  // Insights — slide in from right, then each image pans down
  {
    type: 'slideshow',
    duration: 4.4,
    images: ['insights2.png', 'insights3.png'],
    enter: { type: 'slide', direction: 'right' },
    motion: { type: 'pan', direction: 'down', to: 0.9 },
  },
  {
    type: 'lockup',
    duration: 2.5,
    hook: "gotta hook 'em all",
    name: 'hokédex',
    sub: 'Free · Android · No account',
  },
];
