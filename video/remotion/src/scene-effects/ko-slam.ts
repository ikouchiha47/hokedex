// KO Slam — fullscreen vignette + word slam.
// Used as a scene-level overlay (not an element effect).
// Params flow through the koFinish spec field on screenshot scenes.

export type KOSlamParams = {
  text: string;
  sub?: string;
  at: number;       // seconds after scene start when slam triggers
  // All visual params below have defaults but are fully overridable
  fontSize?:       number;   // main text size px,          default 200
  subFontSize?:    number;   // sub text size px,           default 52
  glowColor?:      string;   // text shadow color,          default '#9d5cff'
  vignetteOpacity?: number;  // max vignette opacity,       default 0.75
  vignetteColor?:  string;   // default 'rgba(0,0,0,…)'
  subLetterSpacing?: number; // default 8
};
