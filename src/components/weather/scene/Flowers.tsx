import React from 'react';
import { Circle, Ellipse, Line } from 'react-native-svg';

type FlowerDef = { cx: number; petalColor: string; centerColor: string; size: number };

type Props = { width: number; height: number; groundHeight: number };

function Flower({ cx, cy, petalColor, centerColor, size }: FlowerDef & { cy: number }) {
  const angles = [0, 60, 120, 180, 240, 300];
  const d = size * 1.1;
  const stemTop = cy + size * 0.55;
  const stemBottom = cy + size * 3;

  return (
    <>
      <Line x1={cx} y1={stemTop} x2={cx} y2={stemBottom} stroke="rgba(34,197,94,0.55)" strokeWidth={Math.max(1.2, size * 0.22)} strokeLinecap="round" />
      {angles.map(a => {
        const rad = (a * Math.PI) / 180;
        const px = cx + d * Math.sin(rad);
        const py = cy - d * Math.cos(rad);
        return (
          <Ellipse key={a} cx={px} cy={py} rx={size * 0.65} ry={size * 1.05}
            fill={petalColor} transform={`rotate(${a}, ${px}, ${py})`} opacity={0.95} />
        );
      })}
      <Circle cx={cx} cy={cy} r={size * 0.55} fill={centerColor} />
    </>
  );
}

export function Flowers({ width, height, groundHeight }: Props) {
  const flowerSize = Math.max(4.5, Math.min(width * 0.014, 6.5));
  const flowers: FlowerDef[] = [
    { cx: width * 0.27, petalColor: '#c084fc', centerColor: '#fde68a', size: flowerSize * 0.86 },
    { cx: width * 0.37, petalColor: '#fbbf24', centerColor: '#92400e', size: flowerSize * 1.08 },
    { cx: width * 0.47, petalColor: '#f472b6', centerColor: '#fde68a', size: flowerSize },
    { cx: width * 0.57, petalColor: '#86efac', centerColor: '#fde68a', size: flowerSize * 0.9 },
  ];

  return (
    <>
      {flowers.map((f, i) => (
        <Flower key={i} {...f} cy={height - groundHeight * (0.56 + i * 0.01)} />
      ))}
    </>
  );
}
