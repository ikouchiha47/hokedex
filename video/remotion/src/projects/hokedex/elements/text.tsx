import React from 'react';
import { registerElement } from '../../../platform/core/element-registry';

type TextData = { value: string; fontSize?: number; color?: string; fontWeight?: number };

registerElement('core:text', {
  render(data: TextData, w: number, h: number) {
    return (
      <div style={{
        width: w, height: h,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: data.fontWeight ?? 800,
        fontSize: data.fontSize ?? Math.round(h * 0.5),
        color: data.color ?? '#ffffff',
        textAlign: 'center',
      }}>
        {data.value}
      </div>
    );
  },
});
