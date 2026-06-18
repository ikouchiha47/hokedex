// A segment is a run of text within a line — allows mixed colors on one line
// ── Text ─────────────────────────────────────────────────────────────────────

export type TextSegment = { text: string; accent?: boolean };

export type TextLine = {
  text?: string;
  accent?: boolean;
  parts?: TextSegment[];   // mixed colors on one line
  enter?: 'slide-up' | 'slide-left' | 'slide-right' | 'slam';
};

// ── Chips ────────────────────────────────────────────────────────────────────

export type ChipItem = {
  label: string;
  emoji: string;
  color: string;
};

// ── Effects — applied centered on a parent element ───────────────────────────

export type Effect =
  | { type: 'pop-in'; overshoot?: number }
  | {
      type: 'bloom';
      color: string;
      delay?: number;    // seconds after element appears (default 0.2)
      duration?: number; // seconds for bloom to expand + fade (default 0.8)
    }
  | { type: 'typewriter'; speed?: number };

// ── ContentState — computed by renderer from all effects, passed to content ──

export type ContentState = {
  borderWidth: number;
  boxShadow: string;
};

// ── Element content ──────────────────────────────────────────────────────────

export type ElementContent =
  | { type: 'pill'; label: string; emoji: string; color: string }
  | { type: 'text'; value: string; fontSize?: number; color?: string };

// ── Element — positioned in stage px, effects attached ───────────────────────

export type SceneElement = {
  id: string;
  x: number;       // center-x in stage px (0–1080)
  y: number;       // center-y in stage px (0–1920)
  w: number;       // width in stage px
  h: number;       // height in stage px
  at: number;      // seconds after scene start when element appears
  content: ElementContent;
  effects?: Effect[];
};

// ── Scenes ───────────────────────────────────────────────────────────────────

export type SceneSpec =
  | {
      type: 'text';
      duration: number;
      lines: TextLine[];
      transition?: 'cut' | 'fade';
    }
  | {
      type: 'screenshot';
      duration: number;
      src: string;
      crop?: 'top' | 'middle' | 'bottom';
      enter?: 'slide-up' | 'zoom-in' | 'cut';
      elements?: SceneElement[];
      transition?: 'cut' | 'fade';
    }
  | {
      type: 'chips';
      duration: number;
      items: ChipItem[];
      layout: 'radiate' | 'radial-spoke';
      stamp?: { text: string; accentWord: string; at: number };
      transition?: 'cut' | 'fade';
    }
  | {
      type: 'slideshow';
      duration: number;
      images: string[];
      crop?: 'top' | 'middle' | 'bottom';
      transition?: 'cut' | 'fade';
    }
  | {
      type: 'lockup';
      duration: number;
      hook: string;
      name: string;
      sub: string;
    };
