import React from 'react';
import { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import type { WeatherSceneKind } from '../../../types/weather';

type Props = { width: number; height: number; kind: WeatherSceneKind };

const PALETTES: Record<string, { stops: [string, string, string] }> = {
  clear_day: { stops: ['#1a3a6e', '#2d6abf', '#f59e0b'] },
  clear_night: { stops: ['#05051a', '#0d0d2b', '#1a1a3e'] },
  partly_cloudy_day: { stops: ['#1e3a6e', '#3b6abf', '#7a9ecb'] },
  partly_cloudy_night: { stops: ['#08081e', '#12123a', '#1e1e40'] },
  cloudy: { stops: ['#1a1a2e', '#2d3561', '#3d4a6b'] },
  fog: { stops: ['#1e1e2e', '#3a3a4e', '#5a5a6e'] },
  drizzle: { stops: ['#1a202e', '#2d3a50', '#4a5a70'] },
  rain: { stops: ['#0f172a', '#1a1a30', '#2d3a50'] },
  snow: { stops: ['#0c1445', '#1a2050', '#2d3565'] },
  hail: { stops: ['#0c1028', '#1a1a38', '#2a2a48'] },
  storm: { stops: ['#030712', '#0a0a1e', '#1a0a0a'] },
};

export function SkyGradient({ width, height, kind }: Props) {
  const palette = PALETTES[kind] ?? PALETTES.snow;
  return (
    <>
      <Defs>
        <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.stops[0]} />
          <Stop offset="0.5" stopColor={palette.stops[1]} />
          <Stop offset="1" stopColor={palette.stops[2]} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#skyGrad)" />
    </>
  );
}
