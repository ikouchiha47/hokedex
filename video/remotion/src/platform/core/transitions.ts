import { Motion } from '../types';

const DIRECTION_TO_CSS: Record<string, string> = {
  right: 'to left',
  left:  'to right',
  up:    'to bottom',
  down:  'to top',
};

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

export function overlapFrames(transition: 'cut' | 'fade' | undefined, fps: number): number {
  if (!transition || transition === 'cut') return 0;
  return Math.round(0.27 * fps);
}

export function computeSceneStarts(
  durations: number[],
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

export function totalDuration(
  durations: number[],
  transitions: ('cut' | 'fade' | undefined)[],
  fps: number,
): number {
  const starts = computeSceneStarts(durations, transitions, fps);
  return starts[starts.length - 1] + durations[durations.length - 1];
}
