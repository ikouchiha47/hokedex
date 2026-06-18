import React, { useState, useEffect } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, staticFile, delayRender, continueRender } from 'remotion';
import { Motion } from '../types';

type Props = {
  images: string[];
  duration: number;
  enter?: Motion;
  motion?: Motion;
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

function overflowPx(naturalW: number, naturalH: number): number {
  return Math.max(0, naturalH * (1080 / naturalW) - 1920);
}

// How many frames the spring-based enter takes to settle (>99% complete)
const ENTER_SETTLE_FRAMES = 18;

export const SlideshowScene: React.FC<Props> = ({ images, duration, enter, motion }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imgSizes = useImageSizes(images);

  const n          = images.length;
  const slotFrames = Math.round((duration / n) * fps);
  const swipeDur   = Math.round(0.35 * fps);

  // Enter slide: ease-out, no bounce. Completes in ENTER_SETTLE_FRAMES frames.
  const enterT = interpolate(frame, [0, ENTER_SETTLE_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
  });
  let innerTranslateX = 0;
  let innerTranslateY = 0;
  if (enter?.type === 'slide') {
    const dist = 1 - enterT;
    if (enter.direction === 'right') innerTranslateX =  dist * 1080;
    if (enter.direction === 'left')  innerTranslateX = -dist * 1080;
    if (enter.direction === 'up')    innerTranslateY =  dist * 1920;
    if (enter.direction === 'down')  innerTranslateY = -dist * 1920;
  }

  // Pan starts only after the enter animation has settled
  const panStartFrame = enter?.type === 'slide' ? ENTER_SETTLE_FRAMES : 0;

  return (
    // Outer shell: fixed size, black bg, clips the slide-in
    <div style={{ width: 1080, height: 1920, background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
      {/* Inner wrapper: slides in */}
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

          // Pan: starts after enter settles, local to each slot
          let panY = 0;
          const size = imgSizes[i];
          if (motion?.type === 'pan' && size) {
            const overflow  = overflowPx(size.w, size.h);
            const fromPx    = (motion.from ?? 0) * overflow;
            const toPx      = motion.to * overflow;
            const panFrame0 = Math.max(slotStart, panStartFrame);
            const panFrame1 = slotEnd - 1;
            const localFrame = Math.max(0, frame - panFrame0);
            const totalPanFrames = Math.max(1, panFrame1 - panFrame0);
            const travelled = interpolate(localFrame, [0, totalPanFrames], [fromPx, toPx], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            panY = motion.direction === 'down' ? -travelled : travelled;
          }

          const isPan = motion?.type === 'pan';

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
                  transform: `translateY(${panY}px)`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
