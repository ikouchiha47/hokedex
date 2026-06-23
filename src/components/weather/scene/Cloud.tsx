import React from 'react';
import { Circle, Path } from 'react-native-svg';
import { generateClouds, getMoonBounds, getSunBounds } from './procedural';

type Props = { width: number; height: number; isDay: boolean; count?: 'all' | 'some' };
function cloudPill(x: number, y: number, w: number, h: number): string {
  const r = h / 2;
  return `M${x + r},${y} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - 2 * r} a${r},${r} 0 0 1 -${r},-${r} v-${h - 2 * r} a${r},${r} 0 0 1 ${r},-${r} Z`;
}

export function Cloud({ width, height, isDay, count = 'all' }: Props) {
  const baseColor = isDay ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)';
  const celestialBounds = isDay ? getSunBounds(width, height) : getMoonBounds(width, height);

  const clouds = generateClouds({
    seed: `clouds-${isDay ? 'day' : 'night'}-${Math.round(width)}-${Math.round(height)}`,
    width,
    height,
    count: count === 'some' ? 2 : 5,
    protectedZones: [celestialBounds],
  });

  return (
    <>
      {clouds.map((cloud, i) => (
        <React.Fragment key={i}>
          <Path
            d={cloudPill(cloud.base.x, cloud.base.y, cloud.base.width, cloud.base.height)}
            fill={baseColor.replace('0.16', String(cloud.opacity)).replace('0.08', String(cloud.opacity))}
          />
          {cloud.lobes.map((lobe, j) => (
            <Circle key={j} cx={lobe.cx} cy={lobe.cy} r={lobe.r} fill={`rgba(255,255,255,${cloud.opacity})`} />
          ))}
        </React.Fragment>
      ))}
    </>
  );
}
