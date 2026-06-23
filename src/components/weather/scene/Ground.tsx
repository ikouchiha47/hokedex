import React from 'react';
import { Rect } from 'react-native-svg';

type Props = { width: number; height: number; color?: string };

export function Ground({ width, height, color = 'rgba(120,60,0,0.5)' }: Props) {
  const groundHeight = Math.max(34, Math.min(height * 0.14, 46));
  return (
    <Rect x={0} y={height - groundHeight} width={width} height={groundHeight} fill={color} />
  );
}
