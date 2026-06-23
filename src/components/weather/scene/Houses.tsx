import React from 'react';
import { Rect, Polygon } from 'react-native-svg';

type Props = { width: number; height: number; groundHeight: number };

export function Houses({ width, height, groundHeight }: Props) {
  const houseScale = Math.max(12, Math.min(width * 0.04, 20));
  const groundY = height - groundHeight;

  const houses = [
    { cx: width * 0.22, hw: houseScale * 1.1, hh: houseScale * 1.2, lit: true },
    { cx: width * 0.42, hw: houseScale * 0.9, hh: houseScale * 0.95, lit: false },
    { cx: width * 0.62, hw: houseScale * 1.0, hh: houseScale * 1.1, lit: false },
  ];

  return (
    <>
      {houses.map((h, i) => {
        const x = h.cx - h.hw;
        const y = groundY - h.hh;
        const roofHeight = h.hw * 0.6;
        const windowSize = h.hw * 0.28;
        const winX = h.cx - windowSize / 2;
        const winY = y + h.hh * 0.35;

        return (
          <React.Fragment key={i}>
            <Rect x={x} y={y} width={h.hw * 2} height={h.hh} fill="#1a1a2e" rx={1} />
            <Polygon
              points={`${h.cx - h.hw * 1.2},${y} ${h.cx},${y - roofHeight} ${h.cx + h.hw * 1.2},${y}`}
              fill="#0f0f1a"
            />
            {h.lit && (
              <>
                <Rect x={winX} y={winY} width={windowSize} height={windowSize * 1.1} fill="#facc15" opacity={0.7} rx={0.5} />
                <Rect x={winX} y={winY} width={windowSize} height={windowSize * 1.1} fill="#fef08a" opacity={0.3} rx={0.5} />
              </>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
