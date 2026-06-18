import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { KOSlamParams } from './ko-slam';

export const KOSlam: React.FC<KOSlamParams> = ({
  text, sub, at,
  fontSize        = 200,
  subFontSize     = 52,
  glowColor       = '#9d5cff',
  vignetteOpacity = 0.75,
  vignetteColor   = 'rgba(0,0,0,1)',
  subLetterSpacing = 8,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = Math.round(at * fps);
  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const vigOpacity = Math.min(vignetteOpacity, localFrame / Math.round(0.2 * fps) * vignetteOpacity);

  const textP     = spring({ frame: localFrame, fps, config: { damping: 22, stiffness: 500 } });
  const textScale = Math.max(1, interpolate(textP, [0, 1], [6.0, 1.0]));
  const textOpacity = interpolate(Math.min(1, localFrame / 3), [0, 1], [0, 1]);

  const subStart   = Math.round(0.4 * fps);
  const subOpacity = Math.min(1, Math.max(0, (localFrame - subStart) / Math.round(0.3 * fps)));

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
      pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, transparent 0%, ${vignetteColor} 100%)`,
        opacity: vigOpacity,
      }} />

      <div style={{
        position: 'relative',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 900,
        fontSize,
        letterSpacing: -8,
        color: '#fff',
        textTransform: 'uppercase',
        transform: `scale(${textScale})`,
        transformOrigin: 'center center',
        opacity: textOpacity,
        textShadow: `0 0 60px ${glowColor}cc, 0 0 120px ${glowColor}80`,
      }}>
        {text}
      </div>

      {sub && (
        <div style={{
          position: 'relative',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          fontSize: subFontSize,
          letterSpacing: subLetterSpacing,
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
          opacity: subOpacity,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
};
