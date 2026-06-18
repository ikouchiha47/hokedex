// ── Video-level config ────────────────────────────────────────────────────────
//
// Set once per video in spec.ts. Controls global aesthetics like background
// color and transition fill. Agents should set these to match the project's
// visual identity — don't leave them as defaults.

export type FontSource =
  | { type: 'google'; family: string; weights?: number[] }
  | { type: 'url';    family: string; url: string; weight?: number; style?: string }
  | { type: 'file';   family: string; path: string; weight?: number; style?: string };

export type VideoConfig = {
  bgColor?:              string;       // stage background,              default '#0a0a0a'
  // Any valid CSS background value — color, gradient, etc.
  // Use directedGradient() from core/transitions.ts to auto-orient to enter direction.
  transitionFillColor?:  string;       // fade/wipe fill,                default bgColor
  accentColor?:          string;       // brand accent used by effects,  default '#9d5cff'
  fontFamily?:           string;       // CSS font-family string,        default 'Space Grotesk, sans-serif'
  fonts?:                FontSource[]; // fonts to load before rendering
};

// ── Text ─────────────────────────────────────────────────────────────────────

export type TextSegment = { text: string; accent?: boolean };

export type TextLine = {
  text?: string;
  accent?: boolean;
  parts?: TextSegment[];
  enter?: 'slide-up' | 'slide-left' | 'slide-right' | 'slam';
};

// ── Element — the unit of renderable content ──────────────────────────────────
//
// ElementSpec: used in layout scenes (ChipsScene). Positioned by the layout engine.
// SceneElement: used in screenshot overlays. Positioned by the author (x, y, at).
//
// Both reference elements by namespaced string ('core:pill', 'core:circle', etc).
// Size always comes from the spec — never from a registry default.

export type ElementSpec = {
  element: string;   // 'core:pill', 'core:circle', etc
  w: number;
  h: number;
  data: unknown;
};

export type SceneElement = {
  id: string;
  element: string;
  x: number;        // center-x in stage px (0–1080)
  y: number;        // center-y in stage px (0–1920)
  w: number;
  h: number;
  at: number;       // seconds after scene start when element appears
  data: unknown;
  effects?: Effect[];
};

// ── Effects ───────────────────────────────────────────────────────────────────
//
// Every parameter that controls visual output must be exposed here.
// No magic numbers inside effect implementations — defaults live here as
// documented fallbacks, not hidden constants.
//
// Effect types are namespaced ('core:pop-in') so project effects can be
// registered alongside core effects without collision.

export type Effect =
  | {
      type: 'core:pop-in';
      overshoot?: number;              // scale multiplier at t=0,       default 2.2
      spring?: {
        damping?: number;              // default 14
        stiffness?: number;            // default 260
      };
    }
  | {
      type: 'core:bloom';
      color: string;                   // glow color
      delay?: number;                  // seconds before bloom starts,    default 0.2
      duration?: number;               // seconds for full expand+fade,   default 0.8
      maxScale?: number;               // peak size multiplier,           default 3.8
      maxBlur?: number;                // px blur at peak,                default 80
      peakAt?: number;                 // 0–1 progress when opacity peaks, default 0.15
    }
  | {
      type: 'core:tap-ring';
      color?: string;                  // ring stroke color,              default '#9d5cff'
      count?: number;                  // number of rings,                default 5
      stagger?: number;                // seconds between rings,          default 0.4
      ringDuration?: number;           // seconds per ring expand+fade,   default 0.5
      maxScale?: number;               // ring size at end,               default 2.6
      thickness?: number;              // border-width px,                default 3
    }
  | {
      type: 'core:typewriter';
      unit?: 'char' | 'word';          // reveal granularity,             default 'char'
      speed?: number;                  // units per second,               default 12
      cursor?: boolean;                // show blinking cursor,           default false
      cursorColor?: string;            // default '#9d5cff'
    };

// ── Motion ────────────────────────────────────────────────────────────────────
//
// All motion is expressed in normalized terms — no raw pixels, no percentages
// tied to a specific image size.
//
// pan.to / pan.from: fraction of scrollable overflow (0 = start edge, 1 = full overflow)
// zoom.from / zoom.to: scale multipliers (1.0 = natural size)
// slide.direction: which edge the scene enters from
// fade.from / fade.to: opacity (0–1), defaults to 0→1 or 1→0

export type Motion =
  | { type: 'pan';   direction: 'down' | 'up' | 'left' | 'right'; from?: number; to: number }
  | { type: 'zoom';  from: number; to: number; origin?: 'center' | 'top' | 'bottom' }
  | { type: 'slide'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'fade';  from?: number; to?: number }
  | { type: 'cut' };

// ── Scenes ────────────────────────────────────────────────────────────────────

export type SceneSpec =
  | {
      type: 'text';
      duration: number;
      lines: TextLine[];
      fontSize?: number;
      transition?: 'cut' | 'fade';
    }
  | {
      type: 'screenshot';
      duration: number;
      src: string;
      enter?: Motion;
      motion?: Motion;
      elements?: SceneElement[];
      koFinish?: { text: string; sub?: string; at: number };
    }
  | {
      type: 'chips';
      duration: number;
      items: ElementSpec[];
      layout: 'radiate' | 'radial-spoke';
      stamp?: { text: string; accentWord: string; at: number };
      transition?: 'cut' | 'fade';
    }
  | {
      type: 'slideshow';
      duration: number;
      images: string[];
      enter?: Motion;
      motion?: Motion;
    }
  | {
      type: 'lockup';
      duration: number;
      hook: string;
      name: string;
      sub: string;
    };
