import React, { useState, useEffect } from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, staticFile, delayRender, continueRender } from 'remotion';
import { Motion, SceneElement } from '../types';
import { SceneElementRenderer } from './SceneElement';
import { KOSlam } from '../scene-effects/KOSlam';
import { KOSlamParams } from '../scene-effects/ko-slam';
import { computePan, computeZoom, computeSlide } from '../motion';

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
    img.onload = () => { setSize({ w: img.naturalWidth, h: img.naturalHeight }); continueRender(handle); };
    img.onerror = () => continueRender(handle);
    img.src = staticFile(src);
  }, [src, handle]);

  return size;
}

export const ScreenshotScene: React.FC<Props> = ({ src, enter, motion, elements, koFinish }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const imgSize = useImageSize(src);

  const enterSpring = spring({ frame, fps, config: { damping: 20, stiffness: 180 } });

  // Pan
  const pan = (motion?.type === 'pan' && imgSize)
    ? computePan(frame, durationInFrames, motion, imgSize)
    : { translateX: 0, translateY: 0 };

  // Enter
  let enterTranslateY = 0;
  let enterScale      = 1;
  let imgOpacity      = 1;

  if (enter?.type === 'slide') {
    const slide  = computeSlide(enterSpring, enter);
    enterTranslateY = slide.translateY;
  } else if (enter?.type === 'zoom') {
    const zoom   = computeZoom(frame, durationInFrames, enter);
    enterScale   = zoom.scale;
    imgOpacity   = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  }

  const totalTranslateY = enterTranslateY + pan.translateY;
  const totalTranslateX = pan.translateX;

  const imgTransform = `translate(${totalTranslateX}px, ${totalTranslateY}px) scale(${enterScale})`;
  const isPan        = motion?.type === 'pan';

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
          transformOrigin: enter?.type === 'zoom' ? (enter as any).origin ?? 'center center' : 'center center',
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
