import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { TextLine } from '../types';

const PURPLE = '#9d5cff';
const WHITE = '#ffffff';

export const TextScene: React.FC<{ lines: TextLine[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{
      width: 1080, height: 1920,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 80px',
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      {lines.map((line, i) => {
        const startFrame = i * 4;
        const progress = spring({ frame: frame - startFrame, fps, config: { damping: 18, stiffness: 200 } });
        const y = interpolate(progress, [0, 1], [120, 0]);
        const opacity = interpolate(progress, [0, 0.3], [0, 1]);

        const content = line.parts
          ? line.parts.map((seg, j) => (
              <span key={j} style={{ color: seg.accent ? PURPLE : WHITE }}>{seg.text}</span>
            ))
          : <span style={{ color: line.accent ? PURPLE : WHITE }}>{line.text}</span>;

        return (
          <span key={i} style={{
            display: 'block',
            fontWeight: 800,
            fontSize: 168,
            lineHeight: 0.9,
            letterSpacing: -6,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            transform: `translateY(${y}px)`,
            opacity,
          }}>
            {content}
          </span>
        );
      })}
    </div>
  );
};
