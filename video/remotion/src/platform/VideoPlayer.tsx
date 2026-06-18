import React from 'react';
import { Series, AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { resolveScene } from './core/scene-registry';
import { overlapFrames } from './core/transitions';
import { useFonts } from './core/fonts';
import { VideoConfig } from './types';

const FPS = 30;

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

type Props = {
  // any[] — projects define their own SceneSpec union on top of platform's
  scenes: any[];
  videoConfig: VideoConfig;
};

export const VideoPlayer: React.FC<Props> = ({ scenes, videoConfig }) => {
  useFonts(videoConfig.fonts);
  const fillColor = videoConfig.transitionFillColor ?? videoConfig.bgColor ?? '#0a0a0a';

  return (
    <Series>
      {scenes.map((scene, i) => {
        const Scene          = resolveScene(scene.type);
        const sceneDuration  = Math.round(scene.duration * FPS);
        const transition     = scene.transition as 'cut' | 'fade' | undefined;
        const prevTransition = i > 0 ? scenes[i - 1].transition as 'cut' | 'fade' | undefined : undefined;

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
