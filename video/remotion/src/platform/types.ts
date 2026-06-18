export type FontSource =
  | { type: 'google'; family: string; weights?: number[] }
  | { type: 'url';    family: string; url: string; weight?: number; style?: string }
  | { type: 'file';   family: string; path: string; weight?: number; style?: string };

export type VideoConfig = {
  bgColor?:              string;
  transitionFillColor?:  string;
  accentColor?:          string;
  fontFamily?:           string;
  fonts?:                FontSource[];
};

export type TextSegment = { text: string; accent?: boolean };

export type TextLine = {
  text?: string;
  accent?: boolean;
  parts?: TextSegment[];
  enter?: 'slide-up' | 'slide-left' | 'slide-right' | 'slam';
};

export type ElementSpec = {
  element: string;
  w: number;
  h: number;
  data: unknown;
};

export type SceneElement = {
  id: string;
  element: string;
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  data: unknown;
  effects?: Effect[];
};

export type Effect =
  | {
      type: 'core:pop-in';
      overshoot?: number;
      spring?: { damping?: number; stiffness?: number };
    }
  | {
      type: 'core:bloom';
      color: string;
      delay?: number;
      duration?: number;
      maxScale?: number;
      maxBlur?: number;
      peakAt?: number;
    }
  | {
      type: 'core:tap-ring';
      color?: string;
      count?: number;
      stagger?: number;
      ringDuration?: number;
      maxScale?: number;
      thickness?: number;
    }
  | {
      type: 'core:typewriter';
      unit?: 'char' | 'word';
      speed?: number;
      cursor?: boolean;
      cursorColor?: string;
    };

export type Motion =
  | { type: 'pan';   direction: 'down' | 'up' | 'left' | 'right'; from?: number; to: number;
      startAt?: number; endAt?: number; }
  | { type: 'zoom';  from: number; to: number; origin?: 'center' | 'top' | 'bottom';
      startAt?: number; endAt?: number; }
  | { type: 'slide'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'fade';  from?: number; to?: number }
  | { type: 'cut' };

export type SceneOverlaySpec = {
  type: string;
  [param: string]: unknown;
};

export type MotionOutput = {
  translateX:      number;
  translateY:      number;
  scale:           number;
  rotate:          number;
  transformOrigin: string;
};

// Platform SceneSpec — generic scenes only. Projects extend this with their own scene types.
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
      preset?: string;           // preset id — motion/enter/overlays applied from preset; explicit fields override
      enter?: Motion;
      motion?: Motion | Motion[];
      elements?: SceneElement[];
      overlays?: SceneOverlaySpec[];
      transition?: 'cut' | 'fade';
    }
  | {
      type: 'slideshow';
      duration: number;
      images: string[];
      preset?: string;
      enter?: Motion;
      motion?: Motion | Motion[];
      overlays?: SceneOverlaySpec[];
    };
