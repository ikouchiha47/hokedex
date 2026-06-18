import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { SceneElement as SceneElementType, ContentState } from '../types';
import { resolveElement } from '../core/element-registry';
import { bloomValues } from '../effects/bloom';

type Props = { el: SceneElementType };

export const SceneElementRenderer: React.FC<Props> = ({ el }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = Math.round(el.at * fps);
  const localFrame = frame - startFrame;

  const hasPopIn = el.effects?.some(e => e.type === 'pop-in') ?? false;

  const popProgress = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 14, stiffness: 260 },
  });
  const popScale   = !hasPopIn ? 1 : localFrame < 0 ? 2.2 : interpolate(popProgress, [0, 1], [2.2, 1.0]);
  const popOpacity = localFrame < 0 ? 0 : hasPopIn
    ? interpolate(popProgress, [0, 0.15], [0, 1])
    : Math.min(1, localFrame / 3);

  let bloom = { scale: 1, opacity: 0, blur: 0 };
  let bloomColor = 'transparent';
  const tapRings: React.ReactNode[] = [];

  for (const effect of el.effects ?? []) {
    if (effect.type === 'bloom') {
      bloom = bloomValues(frame, startFrame, fps, effect.delay, effect.duration);
      bloomColor = effect.color;
    }

    if (effect.type === 'tap-ring') {
      const count     = effect.count   ?? 5;
      const stagger   = effect.stagger ?? 0.4;
      const ringColor = effect.color   ?? '#9d5cff';

      for (let t = 0; t < count; t++) {
        const ringStart = startFrame + Math.round(t * stagger * fps);
        const ringLocal = frame - ringStart;
        if (ringLocal < 0) continue;
        const p       = Math.min(1, ringLocal / Math.round(0.5 * fps));
        const scale   = interpolate(p, [0, 1], [1.0, 2.6]);
        const opacity = interpolate(p, [0, 0.15, 1], [0.9, 0.7, 0]);
        tapRings.push(
          <div key={t} style={{
            position: 'absolute', inset: 0,
            borderRadius: el.h,
            border: `3px solid ${ringColor}`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            opacity,
            pointerEvents: 'none',
          }} />
        );
      }
    }
  }

  const renderer = resolveElement(el.element);

  return (
    <div style={{
      position: 'absolute',
      left: el.x - el.w / 2,
      top:  el.y - el.h / 2,
      width: el.w,
      height: el.h,
      overflow: 'visible',
    }}>
      {/* Bloom layer */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: el.h,
        background: bloomColor,
        transform: `scale(${bloom.scale})`,
        transformOrigin: 'center center',
        opacity: bloom.opacity,
        filter: `blur(${bloom.blur}px)`,
        pointerEvents: 'none',
      }} />

      {/* Tap rings */}
      {tapRings}

      {/* Content */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: `scale(${popScale})`,
        transformOrigin: 'center center',
        opacity: popOpacity,
      }}>
        {renderer.render(el.data, el.w, el.h)}
      </div>
    </div>
  );
};
