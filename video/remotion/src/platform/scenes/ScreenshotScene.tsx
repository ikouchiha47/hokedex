import React, { useState, useEffect } from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, staticFile, delayRender, continueRender } from 'remotion';
import { Motion, SceneElement } from '../types';
import { SceneElementRenderer } from './SceneElement';
import { computeSlide, composeMotions, motionToTransform } from '../motion';

type Props = {
  src: string;
  enter?: Motion;
  motion?: Motion | Motion[];
  elements?: SceneElement[];
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

export const ScreenshotScene: React.FC<Props> = ({ src, enter, motion, elements }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const imgSize = useImageSize(src);

  const enterSpring = spring({ frame, fps, config: { damping: 20, stiffness: 180 } });
  const composed = composeMotions(motion, frame, durationInFrames, imgSize ?? null);

  let enterTranslateY = 0;
  let imgOpacity      = 1;

  if (enter?.type === 'slide') {
    enterTranslateY = computeSlide(enterSpring, enter).translateY;
  } else if (enter?.type === 'zoom') {
    imgOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  }

  const finalTransform = motionToTransform({
    ...composed,
    translateY: composed.translateY + enterTranslateY,
  });

  const motionList = Array.isArray(motion) ? motion : (motion ? [motion] : []);
  const isPan = motionList.some(m => m.type === 'pan');

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
          transform: finalTransform,
          transformOrigin: composed.transformOrigin,
          opacity: imgOpacity,
        }}
      />

      {elements?.map(el => (
        <SceneElementRenderer key={el.id} el={el} />
      ))}
    </div>
  );
};
