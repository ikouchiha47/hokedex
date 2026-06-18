import React from 'react';
import { Composition, Series, AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { scenes, videoConfig } from './spec';
import { resolveScene } from './core/scene-registry';
import { overlapFrames } from './core/transitions';
import { useFonts } from './core/fonts';

const FPS = 30;

// Renders a colored overlay that fades in (direction='out') or fades out (direction='in')
// over FADE_FRAMES frames. Fill color comes from videoConfig.transitionFillColor.
type FadeOverlayProps = { durationInFrames: number; direction: 'in' | 'out'; fillColor: string };

const FadeOverlay: React.FC<FadeOverlayProps> = ({ durationInFrames, direction, fillColor }) => {
  const frame   = useCurrentFrame();
  const fadeLen = overlapFrames('fade', FPS);

  const opacity = direction === 'in'
    ? interpolate(frame, [0, fadeLen], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(frame, [durationInFrames - fadeLen, durationInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: fillColor, opacity, pointerEvents: 'none' }} />
  );
};

const HokedexShort: React.FC = () => {
  useFonts(videoConfig.fonts);
  const fillColor = videoConfig.transitionFillColor ?? videoConfig.bgColor ?? '#0a0a0a';

  return (
    <Series>
      {scenes.map((scene, i) => {
        const Scene          = resolveScene(scene.type);
        const sceneDuration  = Math.round(scene.duration * FPS);
        const transition     = (scene as any).transition as 'cut' | 'fade' | undefined;
        const prevTransition = i > 0 ? ((scenes[i - 1] as any).transition as 'cut' | 'fade' | undefined) : undefined;

        return (
          <Series.Sequence key={i} durationInFrames={sceneDuration}>
            <AbsoluteFill style={{ background: videoConfig.bgColor ?? '#0a0a0a' }}>
              <Scene {...scene} />
              {prevTransition === 'fade' && (
                <FadeOverlay durationInFrames={sceneDuration} direction="in" fillColor={fillColor} />
              )}
              {transition === 'fade' && (
                <FadeOverlay durationInFrames={sceneDuration} direction="out" fillColor={fillColor} />
              )}
            </AbsoluteFill>
          </Series.Sequence>
        );
      })}
    </Series>
  );
};

const totalFrames = scenes.reduce((sum, s) => sum + Math.round(s.duration * FPS), 0);

export const Root: React.FC = () => (
  <Composition
    id="HokedexShort"
    component={HokedexShort}
    durationInFrames={totalFrames}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
