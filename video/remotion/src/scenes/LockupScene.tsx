import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

type Props = { hook: string; name: string; sub: string };

const LOGO_SETTLE  = 0.45; // seconds before words start
const WORD_STAGGER = 0.32; // seconds between each word — enough for spring to settle

export const LockupScene: React.FC<Props> = ({ hook, name, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = hook.split(' ');

  const logoFrame   = 0;
  const wordsStart  = Math.round(LOGO_SETTLE * fps);
  const lastWordAt  = wordsStart + Math.round((words.length - 1) * WORD_STAGGER * fps);
  const subFrame    = lastWordAt + Math.round(0.35 * fps);

  const logoProgress = spring({ frame: frame - logoFrame, fps, config: { damping: 14, stiffness: 180 } });
  const subProgress  = spring({ frame: frame - subFrame,  fps, config: { damping: 18, stiffness: 200 } });

  const logoScale   = interpolate(logoProgress, [0, 1], [0.7, 1.0]);
  const logoOpacity = interpolate(logoProgress, [0, 0.2], [0, 1]);
  const subY        = interpolate(subProgress,  [0, 1], [40, 0]);
  const subOpacity  = interpolate(subProgress,  [0, 0.2], [0, 1]);

  const glow     = 0.3 + 0.4 * Math.sin(frame / 30);
  const nameHtml = name.replace('é', '<span style="color:#9d5cff">é</span>');

  return (
    <div style={{
      width: 1080, height: 1920,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 36,
      fontFamily: "'Space Grotesk', sans-serif",
    }}>

      {/* Hook words slam in one by one after logo settles */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        {words.map((word, i) => {
          const wordFrame = wordsStart + Math.round(i * WORD_STAGGER * fps);
          const p = spring({
            frame: frame - wordFrame,
            fps,
            config: { damping: 28, stiffness: 400 },
          });
          // clamp at 1.0 — prevents spring from bouncing below normal size
          const scale   = frame < wordFrame ? 3.5 : Math.max(1.0, interpolate(p, [0, 1], [3.5, 1.0]));
          const opacity = frame < wordFrame ? 0   : interpolate(p, [0, 0.08], [0, 1]);

          return (
            <span key={i} style={{
              display: 'inline-block',
              fontWeight: 700,
              fontSize: 52,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#6b7280',
              transform: `scale(${scale})`,
              transformOrigin: 'center bottom',
              opacity,
            }}>
              {word}
            </span>
          );
        })}
      </div>

      {/* Logo */}
      <div style={{
        fontWeight: 800, fontSize: 160, letterSpacing: -6, lineHeight: 1,
        color: '#fff',
        transform: `scale(${logoScale})`,
        opacity: logoOpacity,
        textShadow: `0 0 ${40 + glow * 60}px rgba(124,58,237,${glow})`,
      }}
        dangerouslySetInnerHTML={{ __html: nameHtml }}
      />

      <div style={{
        fontSize: 40, color: 'rgba(255,255,255,0.3)',
        transform: `translateY(${subY}px)`, opacity: subOpacity,
      }}>
        {sub}
      </div>
    </div>
  );
};
