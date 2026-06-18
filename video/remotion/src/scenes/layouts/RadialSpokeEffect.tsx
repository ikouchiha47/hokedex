import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ElementSpec } from '../../types';
import { resolveElement } from '../../core/element-registry';

const STAGE_CX = 540;
const STAGE_CY = 960;
const CENTER_R = 32;

const MIN_RADIUS = 240;
const MAX_RADIUS = 460;

function spokeRadius(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  const t = x - Math.floor(x);
  return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
}

function shuffleIndices(n: number): number[] {
  const rank = new Array(n);
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = (i * 13 + 5) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  arr.forEach((chipIdx, staggerPos) => { rank[chipIdx] = staggerPos; });
  return rank;
}

const SPOKE_STAGGER  = 0.30;
const SPOKE_DRAW_DUR = 0.55;

type Props = {
  items: ElementSpec[];
  stamp?: { text: string; accentWord: string; at: number };
};

// Layout needs spoke color — reads from data.color if present, falls back to accent
function spokeColor(item: ElementSpec): string {
  const d = item.data as Record<string, unknown>;
  return typeof d?.color === 'string' ? d.color : '#9d5cff';
}

export const RadialSpokeEffect: React.FC<Props> = ({ items, stamp }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const n = items.length;
  const angles     = items.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2);
  const staggerRank = useMemo(() => shuffleIndices(n), [n]);

  const stampStartFrame = stamp ? Math.round(stamp.at * fps) : 99999;
  const stampProgress   = spring({ frame: frame - stampStartFrame, fps, config: { damping: 16, stiffness: 220 } });
  const stampOpacity    = frame >= stampStartFrame ? interpolate(stampProgress, [0, 0.2], [0, 1]) : 0;
  const stampScale      = interpolate(stampProgress, [0, 1], [1.2, 1.0]);

  return (
    <div style={{ width: 1080, height: 1920, background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>

      {items.map((item, i) => {
        const angle   = angles[i];
        const radius  = spokeRadius(i);
        const chipCX  = STAGE_CX + radius * Math.cos(angle);
        const chipCY  = STAGE_CY + radius * Math.sin(angle);
        const spokeDeg = (angle * 180) / Math.PI;
        const color   = spokeColor(item);

        const spokeStartFrame = Math.round(staggerRank[i] * SPOKE_STAGGER * fps);
        const chipStartFrame  = spokeStartFrame + Math.round(SPOKE_DRAW_DUR * fps);

        const spokeP     = spring({ frame: frame - spokeStartFrame, fps, config: { damping: 30, stiffness: 120 } });
        const spokeScale = frame < spokeStartFrame ? 0 : interpolate(spokeP, [0, 1], [0, 1]);

        const chipP      = spring({ frame: frame - chipStartFrame, fps, config: { damping: 14, stiffness: 180 } });
        const chipScale  = frame < chipStartFrame ? 0 : interpolate(chipP, [0, 1], [0, 1]);
        const chipOpacity = frame < chipStartFrame ? 0 : interpolate(chipP, [0, 0.15], [0, 1]);

        const renderer = resolveElement(item.element);

        return (
          <React.Fragment key={i}>
            {/* Spoke line */}
            <div style={{
              position: 'absolute',
              left: STAGE_CX + CENTER_R * Math.cos(angle),
              top:  STAGE_CY + CENTER_R * Math.sin(angle) - 1,
              width: radius - CENTER_R,
              height: 2,
              background: `${color}55`,
              transformOrigin: 'left center',
              transform: `rotate(${spokeDeg}deg) scaleX(${spokeScale})`,
            }} />

            {/* Element at spoke tip */}
            <div style={{
              position: 'absolute',
              left: chipCX,
              top:  chipCY,
              width: item.w,
              height: item.h,
              transform: `translate(-50%, -50%) scale(${chipScale})`,
              transformOrigin: 'center center',
              opacity: chipOpacity,
            }}>
              {renderer.render(item.data, item.w, item.h)}
            </div>
          </React.Fragment>
        );
      })}

      {/* Black circle gap at center — sits above spoke roots */}
      <div style={{
        position: 'absolute',
        left: STAGE_CX - CENTER_R,
        top:  STAGE_CY - CENTER_R,
        width: CENTER_R * 2,
        height: CENTER_R * 2,
        borderRadius: CENTER_R * 2,
        background: '#0a0a0a',
      }} />

      {stamp && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
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
