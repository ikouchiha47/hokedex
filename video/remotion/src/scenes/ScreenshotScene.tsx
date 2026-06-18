import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, staticFile } from 'remotion';
import { SceneElement } from '../types';
import { SceneElementRenderer } from './SceneElement';

type Props = {
  src: string;
  crop?: 'top' | 'middle' | 'bottom';
  enter?: 'slide-up' | 'zoom-in' | 'cut';
  elements?: SceneElement[];
};

export const ScreenshotScene: React.FC<Props> = ({ src, crop = 'top', enter = 'cut', elements }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = spring({ frame, fps, config: { damping: 20, stiffness: 180 } });

  const objectPosition =
    crop === 'top'    ? 'top center' :
    crop === 'bottom' ? 'bottom center' :
    'center center';

  let imgTransform = 'none';
  let imgOpacity: number = 1;

  if (enter === 'slide-up') {
    const y = interpolate(enterProgress, [0, 1], [1920, 0]);
    imgTransform = `translateY(${y}px)`;
  } else if (enter === 'zoom-in') {
    const scale = interpolate(enterProgress, [0, 1], [1.12, 1.0]);
    imgTransform = `scale(${scale})`;
    imgOpacity = interpolate(frame, [0, 8], [0, 1]);
  }

  return (
    <div style={{ width: 1080, height: 1920, background: '#0a0a0a', overflow: 'hidden', position: 'relative' }}>
      <img
        src={staticFile(src)}
        style={{
          width: 1080,
          height: 1920,
          objectFit: 'cover',
          objectPosition,
          display: 'block',
          transform: imgTransform,
          opacity: imgOpacity,
        }}
      />

      {/* Elements layer — rendered on top, each owns its own position + effects */}
      {elements?.map(el => (
        <SceneElementRenderer key={el.id} el={el} />
      ))}
    </div>
  );
};
