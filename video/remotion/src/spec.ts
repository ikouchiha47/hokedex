import { SceneSpec } from './types';

export const scenes: SceneSpec[] = [
  {
    type: 'text',
    duration: 2.5,
    lines: [
      { text: 'I made a',   enter: 'slide-up' },
      { text: 'Pokédex.',   enter: 'slide-up' },
    ],
    transition: 'cut',
  },
  {
    type: 'text',
    duration: 2.5,
    lines: [
      { text: 'for people', enter: 'slide-left' },
      { parts: [{ text: 'I ' }, { text: 'date.', accent: true }], enter: 'slide-right' },
    ],
    transition: 'cut',
  },
  {
    type: 'screenshot',
    duration: 5.0,
    src: 'seed_landing.png',
    crop: 'top',
    enter: 'slide-up',
    transition: 'cut',
  },
  {
    type: 'chips',
    duration: 6.0,
    items: [
      { label: 'Red Flag',      emoji: '🚩', color: '#ef4444' },
      { label: 'Ghost Type',    emoji: '👻', color: '#a78bfa' },
      { label: 'Situationship', emoji: '💛', color: '#facc15' },
      { label: 'Toxic',         emoji: '☣️', color: '#4ade80' },
      { label: 'Hot Mess',      emoji: '🔥', color: '#fb923c' },
      { label: 'NPC',           emoji: '🤖', color: '#9ca3af' },
      { label: 'Main Character',emoji: '🎭', color: '#f472b6' },
      { label: 'Wild Card',     emoji: '🃏', color: '#2dd4bf' },
    ],
    layout: 'radiate',
    stamp: { text: 'everyone has a', accentWord: 'type.', at: 2.0 },
    transition: 'cut',
  },
  {
    type: 'screenshot',
    duration: 5.0,
    src: 'profile.png',
    crop: 'top',
    enter: 'slide-up',
    elements: [
      {
        id: 'red-flag-pill',
        x: 540, y: 705,   // center of the type pill row in stage px
        w: 620, h: 110,
        at: 1.2,
        content: { type: 'pill', label: 'Red Flag', emoji: '🚩', color: '#ef4444' },
        effects: [
          { type: 'pop-in' },
          { type: 'bloom', color: '#ef4444', delay: 0.3, duration: 0.8 },
        ],
      },
    ],
    transition: 'fade',
  },
  {
    type: 'screenshot',
    duration: 4.0,
    src: 'insights2.png',
    crop: 'top',
    enter: 'zoom-in',
    transition: 'cut',
  },
  {
    type: 'lockup',
    duration: 4.5,
    hook: "gotta hook 'em all",
    name: 'hokédex',
    sub: 'Free · Android · No account',
  },
];
