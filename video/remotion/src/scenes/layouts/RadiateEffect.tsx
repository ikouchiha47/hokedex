import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ElementSpec } from '../../types';
import { resolveElement } from '../../core/element-registry';
import { radiatePositions } from '../../layout';

type Props = {
  items: ElementSpec[];
  stamp?: { text: string; accentWord: string; at: number };
};

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = (i * 7 + 3) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const RadiateEffect: React.FC<Props> = ({ items, stamp }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slots = radiatePositions(items.map(it => ({ w: it.w, h: it.h })));

  const staggerOrder = useMemo(() => {
    const order = shuffleIndices(items.length);
    const rank  = new Array(items.length);
    order.forEach((chipIdx, r) => { rank[chipIdx] = r; });
    return rank;
  }, [items.length]);

  const stampStartFrame = stamp ? Math.round(stamp.at * fps) : 99999;
  const stampProgress   = spring({ frame: frame - stampStartFrame, fps, config: { damping: 16, stiffness: 220 } });
  const stampScale      = interpolate(stampProgress, [0, 1], [1.2, 1.0]);
  const stampOpacity    = frame >= stampStartFrame ? interpolate(stampProgress, [0, 0.2], [0, 1]) : 0;

  return (
    <div style={{ width: 1080, height: 1920, background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
      {items.map((item, i) => {
        const slot          = slots[i];
        const staggerFrames = Math.round(staggerOrder[i] * 0.09 * fps);
        const p             = spring({ frame: frame - staggerFrames, fps, config: { damping: 14, stiffness: 240 } });
        const scale         = interpolate(p, [0, 1], [1.45, 1.0]);
        const opacity       = interpolate(p, [0, 0.12], [0, 1]);
        const renderer      = resolveElement(item.element);

        return (
          <div key={i} style={{
            position: 'absolute',
            left: slot.x, top: slot.y,
            width: slot.w, height: slot.h,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            opacity,
          }}>
            {renderer.render(item.data, slot.w, slot.h)}
          </div>
        );
      })}

      {stamp && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          background: 'rgba(10,10,10,0.88)',
          opacity: stampOpacity,
          transform: `scale(${stampScale})`,
          transformOrigin: 'center center',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 800, fontSize: 140, lineHeight: 0.92, letterSpacing: -5,
          textAlign: 'center', color: '#fff', pointerEvents: 'none',
        }}>
          <span>{stamp.text}</span>
          <span style={{ color: '#9d5cff' }}>{stamp.accentWord}</span>
        </div>
      )}
    </div>
  );
};
