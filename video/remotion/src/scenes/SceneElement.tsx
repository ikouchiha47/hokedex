import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { SceneElement as SceneElementType, ElementContent, ContentState } from '../types';
import { bloomValues } from '../effects/bloom';

// ── Content renderer — only knows about ContentState ─────────────────────────

const renderContent = (content: ElementContent, w: number, h: number, state: ContentState) => {
  if (content.type === 'pill') {
    return (
      <div style={{
        width: w, height: h,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 14,
        borderRadius: h,
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 800,
        fontSize: 56,
        color: content.color,
        border: `${state.borderWidth}px solid ${content.color}`,
        boxShadow: state.boxShadow,
        background: 'rgba(10,10,10,0.92)',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
      }}>
        {content.emoji} {content.label}
      </div>
    );
  }

  if (content.type === 'text') {
    return (
      <div style={{
        width: w, height: h,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 800,
        fontSize: content.fontSize ?? 48,
        color: content.color ?? '#fff',
      }}>
        {content.value}
      </div>
    );
  }

  return null;
};

// ── Element renderer — computes ContentState from effects ─────────────────────

type Props = { el: SceneElementType };

export const SceneElementRenderer: React.FC<Props> = ({ el }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = Math.round(el.at * fps);
  const localFrame = frame - startFrame;

  // Pop-in
  const popProgress = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 14, stiffness: 260 },
  });
  const popScale   = localFrame < 0 ? 2.2 : interpolate(popProgress, [0, 1], [2.2, 1.0]);
  const popOpacity = localFrame < 0 ? 0   : interpolate(popProgress, [0, 0.15], [0, 1]);

  // Default ContentState
  let contentState: ContentState = { borderWidth: 5, boxShadow: 'none' };

  // Bloom state
  let bloom = { scale: 1, opacity: 0, blur: 0 };
  let bloomColor = 'transparent';

  for (const effect of el.effects ?? []) {
    if (effect.type === 'bloom') {
      bloom = bloomValues(frame, startFrame, fps, effect.delay, effect.duration);
      bloomColor = effect.color;
    }
  }

  return (
    <div style={{
      position: 'absolute',
      left: el.x - el.w / 2,
      top:  el.y - el.h / 2,
      width: el.w,
      height: el.h,
      overflow: 'visible',
    }}>
      {/* Bloom layer — filled pill shape, blurred, expands and fades */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: el.h,
        background: bloomColor,
        transform: `scale(${bloom.scale})`,
        transformOrigin: 'center center',
        opacity: bloom.opacity,
        filter: `blur(${bloom.blur}px)`,
        pointerEvents: 'none',
      }} />

      {/* Content — sharp, on top of bloom */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: `scale(${popScale})`,
        transformOrigin: 'center center',
        opacity: popOpacity,
      }}>
        {renderContent(el.content, el.w, el.h, contentState)}
      </div>
    </div>
  );
};
