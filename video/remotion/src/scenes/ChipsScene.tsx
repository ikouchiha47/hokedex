import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ChipItem } from '../types';
import { radiatePositions } from '../layout';

const STAGE_CX = 540;
const STAGE_CY = 960;

type Props = {
  items: ChipItem[];
  stamp?: { text: string; accentWord: string; at: number };
};

export const ChipsScene: React.FC<Props> = ({ items, stamp }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slots = radiatePositions(items.map(c => c.label));

  const stampStartFrame = stamp ? Math.round(stamp.at * fps) : 9999;
  const stampProgress = spring({ frame: frame - stampStartFrame, fps, config: { damping: 16, stiffness: 220 } });
  const stampScale = interpolate(stampProgress, [0, 1], [1.2, 1.0]);
  const stampOpacity = frame >= stampStartFrame ? interpolate(stampProgress, [0, 0.2], [0, 1]) : 0;

  return (
    <div style={{ width: 1080, height: 1920, background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>

      {items.map((chip, i) => {
        const slot = slots[i];
        const chipCX = slot.x + slot.w / 2;
        const chipCY = slot.y + slot.h / 2;

        // Each chip starts at stage center (540, 960) and flies to its slot.
        // Offset = center of slot relative to stage center.
        const targetOffsetX = chipCX - STAGE_CX;
        const targetOffsetY = chipCY - STAGE_CY;

        const STAGGER_FRAMES = Math.round(i * 0.07 * fps);
        const chipProgress = spring({
          frame: frame - STAGGER_FRAMES,
          fps,
          config: { damping: 16, stiffness: 200 },
        });

        const x = interpolate(chipProgress, [0, 1], [0, targetOffsetX]);
        const y = interpolate(chipProgress, [0, 1], [0, targetOffsetY]);
        const scale = interpolate(chipProgress, [0, 1], [0, 1]);
        const opacity = interpolate(chipProgress, [0, 0.15], [0, 1]);

        return (
          <div key={i} style={{
            position: 'absolute',
            // Place at stage center, then offset via transform
            left: STAGE_CX - slot.w / 2,
            top:  STAGE_CY - slot.h / 2,
            width: slot.w,
            height: slot.h,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12,
            borderRadius: 100,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: 40,
            color: chip.color,
            border: `2.5px solid ${chip.color}`,
            background: 'rgba(255,255,255,0.04)',
            whiteSpace: 'nowrap',
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
            transformOrigin: 'center center',
            opacity,
          }}>
            {chip.emoji} {chip.label}
          </div>
        );
      })}

      {stamp && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
          background: 'rgba(10,10,10,0.88)',
          opacity: stampOpacity,
          transform: `scale(${stampScale})`,
          transformOrigin: 'center center',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 800,
          fontSize: 140,
          lineHeight: 0.92,
          letterSpacing: -5,
          textAlign: 'center',
          color: '#fff',
          pointerEvents: 'none',
        }}>
          <span>{stamp.text}</span>
          <span style={{ color: '#9d5cff' }}>{stamp.accentWord}</span>
        </div>
      )}
    </div>
  );
};
