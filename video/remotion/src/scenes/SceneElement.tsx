import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneElement as SceneElementType } from '../types';
import { resolveElement } from '../core/element-registry';
import { resolveEffect, EffectOutput } from '../core/effect-registry';

type Props = { el: SceneElementType };

function mergeEffectOutputs(outputs: EffectOutput[]): {
  contentStyle: React.CSSProperties;
  underlays: React.ReactNode[];
  overlays: React.ReactNode[];
} {
  const contentStyle: React.CSSProperties = {};
  const underlays: React.ReactNode[] = [];
  const overlays: React.ReactNode[] = [];

  for (const out of outputs) {
    if (out.contentStyle) Object.assign(contentStyle, out.contentStyle);
    if (out.underlays)    underlays.push(...out.underlays);
    if (out.overlays)     overlays.push(...out.overlays);
  }

  return { contentStyle, underlays, overlays };
}

export const SceneElementRenderer: React.FC<Props> = ({ el }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = Math.round(el.at * fps);
  const localFrame = frame - startFrame;
  const size       = { w: el.w, h: el.h };

  // Run all registered effects — each gets localFrame relative to its own birth
  const effectOutputs: EffectOutput[] = (el.effects ?? []).map(effect => {
    try {
      return resolveEffect(effect.type)(localFrame, fps, effect, size);
    } catch {
      // Unknown effect — skip gracefully rather than crash the render
      return {};
    }
  });

  const { contentStyle, underlays, overlays } = mergeEffectOutputs(effectOutputs);

  // If no pop-in effect, still handle visibility before el.at
  const defaultVisibility: React.CSSProperties =
    !el.effects?.some(e => e.type === 'core:pop-in') && localFrame < 0
      ? { opacity: 0 }
      : {};

  const renderer = resolveElement(el.element);

  return (
    <div style={{
      position: 'absolute',
      left:   el.x - el.w / 2,
      top:    el.y - el.h / 2,
      width:  el.w,
      height: el.h,
      overflow: 'visible',
    }}>
      {underlays}

      <div style={{
        position: 'absolute', inset: 0,
        transformOrigin: 'center center',
        ...defaultVisibility,
        ...contentStyle,
      }}>
        {renderer.render(el.data, el.w, el.h)}
      </div>

      {overlays}
    </div>
  );
};
