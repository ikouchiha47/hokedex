import React from 'react';
import { Path, Rect } from 'react-native-svg';
import type { WeatherWarning } from '../../../types/weather';

type Props = { width: number; warning: WeatherWarning };

const WARNING_COLORS: Record<WeatherWarning, string> = {
  storm: 'rgba(253,230,138,0.18)',
  heat: 'rgba(248,113,113,0.18)',
  flood: 'rgba(96,165,250,0.18)',
  wind: 'rgba(226,232,240,0.18)',
  hail: 'rgba(219,234,254,0.18)',
};

export function WeatherWarningOverlay({ width, warning }: Props) {
  const color = WARNING_COLORS[warning];
  const markerWidth = Math.max(36, Math.min(width * 0.12, 52));

  return (
    <>
      <Rect x={0} y={0} width={width} height={4} fill={color} />
      <Path
        d={`M${width - markerWidth},0 L${width},0 L${width},${markerWidth} Z`}
        fill={color}
      />
    </>
  );
}
