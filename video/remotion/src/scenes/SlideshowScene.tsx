import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, staticFile } from 'remotion';

type Props = {
  images: string[];
  duration: number;
  crop?: 'top' | 'middle' | 'bottom';
};

const CROP_POSITION: Record<string, string> = {
  top:    '0%',
  middle: '50%',
  bottom: '100%',
};

export const SlideshowScene: React.FC<Props> = ({ images, duration, crop = 'top' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const n = images.length;
  const slotFrames = Math.round((duration / n) * fps); // frames per image
  const swipeDur   = Math.round(0.35 * fps);           // swipe transition duration

  const objectPosition = CROP_POSITION[crop] ?? '50%';

  return (
    <div style={{ width: 1080, height: 1920, background: '#000', position: 'relative', overflow: 'hidden' }}>
      {images.map((src, i) => {
        const slotStart = i * slotFrames;
        const slotEnd   = slotStart + slotFrames;

        // Only render images near the current frame for perf
        if (frame < slotStart - swipeDur || frame > slotEnd + swipeDur) return null;

        // Slide out to the left when this slot ends
        const slideOutStart = slotEnd - swipeDur;
        const slideOutX = i < n - 1
          ? interpolate(frame, [slideOutStart, slotEnd], [0, -1080], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          : 0;

        // Slide in from the right when this slot starts (skip first image)
        const slideInX = i > 0
          ? interpolate(frame, [slotStart - swipeDur, slotStart], [1080, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          : 0;

        const translateX = slideInX + slideOutX;

        return (
          <div key={i} style={{
            position: 'absolute',
            inset: 0,
            transform: `translateX(${translateX}px)`,
          }}>
            <img
              src={staticFile(src)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `50% ${objectPosition}`,
                display: 'block',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
