import React, { useState, useEffect } from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, staticFile, delayRender, continueRender } from 'remotion';
import { Motion, SceneElement } from '../types';
import { SceneElementRenderer } from './SceneElement';
import { KOSlam } from '../scene-effects/KOSlam';
import { KOSlamParams } from '../scene-effects/ko-slam';

type Props = {
  src: string;
  enter?: Motion;
  motion?: Motion;
  elements?: SceneElement[];
  koFinish?: KOSlamParams;
  duration?: number;
};

function useImageSize(src: string): { w: number; h: number } | null {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [handle] = useState(() => delayRender(`loading image dimensions: ${src}`));

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      setSize({ w: img.naturalWidth, h: img.naturalHeight });
      continueRender(handle);
    };
    img.onerror = () => continueRender(handle);
    img.src = staticFile(src);
  }, [src, handle]);

  return size;
}

// Given image natural dimensions and stage width (1080), compute how many px
// the image overflows the stage height (1920) when rendered at full width.
function overflowPx(naturalW: number, naturalH: number): number {
  const renderedH = naturalH * (1080 / naturalW);
  return Math.max(0, renderedH - 1920);
}

export const ScreenshotScene: React.FC<Props> = ({ src, enter, motion, elements, koFinish }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const imgSize = useImageSize(src);

  const enterProgress = spring({ frame, fps, config: { damping: 20, stiffness: 180 } });

  // Compute pan translate in pixels
  let panY = 0;
  if (motion?.type === 'pan' && imgSize) {
    const overflow = overflowPx(imgSize.w, imgSize.h);
    const fromPx   = (motion.from ?? 0) * overflow;
    const toPx     = motion.to * overflow;
    const travelled = interpolate(frame, [0, durationInFrames - 1], [fromPx, toPx], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    panY = motion.direction === 'down' ? -travelled : travelled;
  }

  // Compute enter transform
  let imgTransform = `translateY(${panY}px)`;
  let imgOpacity: number = 1;

  if (enter?.type === 'slide' && enter.direction === 'up') {
    const slideY = interpolate(enterProgress, [0, 1], [1920, 0]);
    imgTransform = `translateY(calc(${slideY}px + ${panY}px))`;
  } else if (enter?.type === 'zoom') {
    const scale = interpolate(enterProgress, [0, 1], [enter.from, enter.to]);
    imgTransform = `scale(${scale}) translateY(${panY}px)`;
    imgOpacity = interpolate(frame, [0, 8], [0, 1]);
  }

  // For non-pan scenes, use object-fit cover with positional crop
  const isPan = motion?.type === 'pan';

  return (
    <div style={{ width: 1080, height: 1920, background: '#0a0a0a', overflow: 'hidden', position: 'relative' }}>
      <img
        src={staticFile(src)}
        style={{
          width: 1080,
          height: isPan ? 'auto' : 1920,
          objectFit: isPan ? undefined : 'cover',
          objectPosition: isPan ? undefined : 'top center',
          display: 'block',
          transform: imgTransform,
          opacity: imgOpacity,
        }}
      />

      {elements?.map(el => (
        <SceneElementRenderer key={el.id} el={el} />
      ))}

      {koFinish && <KOSlam {...koFinish} />}
    </div>
  );
};
