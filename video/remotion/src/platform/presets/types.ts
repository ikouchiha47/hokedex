import { Motion } from '../types';

// A SceneOverlay spec — references a registered overlay by type + passes params.
// All visual parameters must be explicit here; no magic defaults inside overlay impls.
export type SceneOverlaySpec = {
  type: string;              // namespaced: 'core:vignette', 'myproject:glitch'
  [param: string]: unknown;  // overlay-specific params
};

// A Preset is a reusable, named bundle of camera + atmosphere config.
// It can be applied to any screenshot/slideshow scene via the `preset` field.
// All fields are optional — a preset that only sets motion is valid.
export type Preset = {
  id:          string;
  name:        string;
  description?: string;
  thumbnail?:  string;          // path relative to public/ for UI preview
  category?:   string;          // 'cinematic' | 'social' | 'dramatic' | etc.
  duration?:   number;          // suggested scene duration in seconds
  enter?:      Motion;          // how the clip enters the stage
  motion?:     Motion[];        // camera movements (compose additively)
  overlays?:   SceneOverlaySpec[]; // fullscreen atmosphere effects
};
