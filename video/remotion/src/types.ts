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

export type Effect =
  | { type: 'pop-in'; overshoot?: number }
  | { type: 'bloom'; color: string; delay?: number; duration?: number }
  | { type: 'tap-ring'; count?: number; stagger?: number; color?: string }
  | { type: 'typewriter'; speed?: number };

// ── ContentState — computed by renderer from effects, passed down ─────────────

export type ContentState = {
  borderWidth: number;
  boxShadow: string;
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
