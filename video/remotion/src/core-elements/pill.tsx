import React from 'react';
import { registerElement } from '../core/element-registry';

type PillData = { label: string; emoji: string; color: string };

registerElement('core:pill', {
  render(data: PillData, w: number, h: number) {
    return (
      <div style={{
        width: w, height: h,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 14,
        borderRadius: h,
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 800,
        fontSize: Math.round(h * 0.5),
        color: data.color,
        border: `5px solid ${data.color}`,
        background: 'rgba(10,10,10,0.92)',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
      }}>
        {data.emoji} {data.label}
      </div>
    );
  },
});
