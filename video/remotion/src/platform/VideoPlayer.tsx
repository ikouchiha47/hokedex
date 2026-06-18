import React from 'react';
import { Series, AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { resolveScene as resolveSceneComponent } from './core/scene-registry';
import { resolveSceneOverlay } from './core/scene-overlay-registry';
import { resolvePreset } from './core/preset-registry';
import { overlapFrames } from './core/transitions';
import { useFonts } from './core/fonts';
import { VideoConfig, SceneOverlaySpec } from './types';

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

// Renders all scene overlays for a single scene frame.
const SceneOverlays: React.FC<{ overlays: SceneOverlaySpec[] }> = ({ overlays }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      {overlays.map((spec, i) => {
        const fn = resolveSceneOverlay(spec.type);
        if (!fn) return null;
        const node = fn(frame, fps, spec as Record<string, unknown>);
        return node ? React.cloneElement(node as React.ReactElement, { key: i }) : null;
      })}
    </>
  );
};

// Merge preset fields with explicit scene fields.
// Explicit fields always win; preset fills gaps.
function applyPreset(scene: any): any {
  if (!scene.preset) return scene;
  try {
    const preset = resolvePreset(scene.preset);
    return {
      enter:   preset.enter,
      motion:  preset.motion,
      overlays: preset.overlays,
      duration: preset.duration ?? scene.duration,
      ...scene,  // explicit scene fields override preset
    };
  } catch {
    return scene;  // unknown preset — render scene as-is
  }
}

type Props = {
  scenes: any[];
  videoConfig: VideoConfig;
};

export const VideoPlayer: React.FC<Props> = ({ scenes, videoConfig }) => {
  useFonts(videoConfig.fonts);
  const fillColor = videoConfig.transitionFillColor ?? videoConfig.bgColor ?? '#0a0a0a';

  return (
    <Series>
      {scenes.map((rawScene, i) => {
        const scene          = applyPreset(rawScene);
        const Scene          = resolveSceneComponent(scene.type);
        const sceneDuration  = Math.round(scene.duration * FPS);
        const transition     = scene.transition as 'cut' | 'fade' | undefined;
        const prevTransition = i > 0 ? scenes[i - 1].transition as 'cut' | 'fade' | undefined : undefined;
        const overlays: SceneOverlaySpec[] = scene.overlays ?? [];

        return (
          <Series.Sequence key={i} durationInFrames={sceneDuration}>
            <AbsoluteFill style={{ background: videoConfig.bgColor ?? '#0a0a0a' }}>
              <Scene {...scene} />
              {overlays.length > 0 && <SceneOverlays overlays={overlays} />}
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
