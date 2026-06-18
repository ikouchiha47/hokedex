import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

type Props = { hook: string; name: string; sub: string };

export const LockupScene: React.FC<Props> = ({ hook, name, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProgress = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });
  const hookProgress = spring({ frame: frame - 6, fps, config: { damping: 18, stiffness: 200 } });
  const subProgress  = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 200 } });

  const logoScale   = interpolate(logoProgress, [0, 1], [0.7, 1.0]);
  const logoOpacity = interpolate(logoProgress, [0, 0.2], [0, 1]);
  const hookY       = interpolate(hookProgress, [0, 1], [-40, 0]);
  const hookOpacity = interpolate(hookProgress, [0, 0.2], [0, 1]);
  const subY        = interpolate(subProgress,  [0, 1], [40, 0]);
  const subOpacity  = interpolate(subProgress,  [0, 0.2], [0, 1]);

  // glow pulse via opacity modulation
  const glow = 0.3 + 0.4 * Math.sin(frame / 30);

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
      <div style={{
        fontWeight: 700, fontSize: 52, letterSpacing: 3,
        textTransform: 'uppercase', color: '#6b7280',
        transform: `translateY(${hookY}px)`, opacity: hookOpacity,
      }}>
        {hook}
      </div>

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
