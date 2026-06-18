import React, { useState, useEffect } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, staticFile, delayRender, continueRender } from 'remotion';
import { Motion } from '../types';
import { composeMotions, motionToTransform, computeSlideEased } from '../motion';

type Props = {
  images: string[];
  duration: number;
  enter?: Motion;
  motion?: Motion | Motion[];
};

function useImageSizes(srcs: string[]): Array<{ w: number; h: number } | null> {
  const [sizes, setSizes] = useState<Array<{ w: number; h: number } | null>>(srcs.map(() => null));
  const [handle] = useState(() => delayRender(`loading slideshow image dimensions`));

  useEffect(() => {
    let loaded = 0;
    const results: Array<{ w: number; h: number } | null> = srcs.map(() => null);

    srcs.forEach((src, i) => {
      const img = new window.Image();
      img.onload = () => {
        results[i] = { w: img.naturalWidth, h: img.naturalHeight };
        loaded++;
        if (loaded === srcs.length) { setSizes([...results]); continueRender(handle); }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === srcs.length) { setSizes([...results]); continueRender(handle); }
      };
      img.src = staticFile(src);
    });
  }, [handle]);

  return sizes;
}

const ENTER_SETTLE_FRAMES = 18;

export const SlideshowScene: React.FC<Props> = ({ images, duration, enter, motion }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imgSizes = useImageSizes(images);

  const n          = images.length;
  const slotFrames = Math.round((duration / n) * fps);
  const swipeDur   = Math.round(0.35 * fps);

  let innerTranslateX = 0;
  let innerTranslateY = 0;
  if (enter?.type === 'slide') {
    const slide = computeSlideEased(frame, enter, ENTER_SETTLE_FRAMES);
    innerTranslateX = slide.translateX;
    innerTranslateY = slide.translateY;
  }

  const panStartFrame = enter?.type === 'slide' ? ENTER_SETTLE_FRAMES : 0;

  return (
    <div style={{ width: 1080, height: 1920, background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${innerTranslateX}px, ${innerTranslateY}px)` }}>
        {images.map((src, i) => {
          const slotStart = i * slotFrames;
          const slotEnd   = slotStart + slotFrames;

          if (frame < slotStart - swipeDur || frame > slotEnd + swipeDur) return null;

          const slideOutX = i < n - 1
            ? interpolate(frame, [slotEnd - swipeDur, slotEnd], [0, -1080], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            : 0;
          const slideInX = i > 0
            ? interpolate(frame, [slotStart - swipeDur, slotStart], [1080, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            : 0;
          const translateX = slideInX + slideOutX;

          const size = imgSizes[i];
          const slotLocalFrame = frame - slotStart;
          const adjustedMotion = i === 0 && panStartFrame > 0
            ? (Array.isArray(motion) ? motion : motion ? [motion] : []).map(m =>
                m.type === 'pan' ? { ...m, startAt: panStartFrame / slotFrames } : m
              )
            : motion;
          const composed = composeMotions(adjustedMotion, slotLocalFrame, slotFrames, size ?? null);

          const motionList = Array.isArray(motion) ? motion : (motion ? [motion] : []);
          const isPan = motionList.some(m => m.type === 'pan');

          return (
            <div key={i} style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: `translateX(${translateX}px)` }}>
              <img
                src={staticFile(src)}
                style={{
                  width: 1080,
                  height: isPan ? 'auto' : '100%',
                  objectFit: isPan ? undefined : 'cover',
                  objectPosition: isPan ? undefined : '50% 0%',
                  display: 'block',
                  transform: motionToTransform(composed),
                  transformOrigin: composed.transformOrigin,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
