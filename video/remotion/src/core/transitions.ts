import { Motion } from '../types';

// Maps enter direction to the CSS gradient direction that sweeps across the stage.
// "slide from right" → gradient flows left-to-right (right edge is the leading edge).
const DIRECTION_TO_CSS: Record<string, string> = {
  right: 'to left',
  left:  'to right',
  up:    'to bottom',
  down:  'to top',
};

// Returns a CSS linear-gradient string oriented to match an enter motion direction.
// fromColor: the leading edge (where the new scene arrives from)
// toColor:   the trailing edge (behind the incoming scene)
//
// Usage in spec.ts:
//   transitionFillColor: directedGradient(enterMotion, '#1a0a2a', '#0a0a0a')
export function directedGradient(
  enter: Motion | undefined,
  fromColor: string,
  toColor: string,
  stop = '55%',
): string {
  const direction =
    enter?.type === 'slide' ? DIRECTION_TO_CSS[enter.direction] ?? 'to bottom'
    : enter?.type === 'pan' ? DIRECTION_TO_CSS[enter.direction] ?? 'to bottom'
    : 'to bottom';

  return `linear-gradient(${direction}, ${fromColor} 0%, ${fromColor} ${stop}, ${toColor} 100%)`;
}

// Compute overlap frames for a given transition type.
// 'cut' = 0, 'fade' = default 8 frames, explicit number = that many frames.
export function overlapFrames(transition: 'cut' | 'fade' | undefined, fps: number): number {
  if (!transition || transition === 'cut') return 0;
  return Math.round(0.27 * fps); // ~8 frames at 30fps
}

// Compute start frame for each scene given overlap.
export function computeSceneStarts(
  durations: number[],  // in frames
  transitions: ('cut' | 'fade' | undefined)[],
  fps: number,
): number[] {
  const starts: number[] = [0];
  for (let i = 0; i < durations.length - 1; i++) {
    const overlap = overlapFrames(transitions[i], fps);
    starts.push(starts[i] + durations[i] - overlap);
  }
  return starts;
}

// Total composition duration accounting for overlaps.
export function totalDuration(
  durations: number[],
  transitions: ('cut' | 'fade' | undefined)[],
  fps: number,
): number {
  const starts = computeSceneStarts(durations, transitions, fps);
  return starts[starts.length - 1] + durations[durations.length - 1];
}
