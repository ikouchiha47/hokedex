import React from 'react';
import { staticFile } from 'remotion';
import { registerElement } from '../core/element-registry';

type ImageCircleData = { src: string; borderColor?: string };

registerElement('core:image-circle', {
  render(data: ImageCircleData, w: number, h: number) {
    return (
      <div style={{
        width: w, height: h,
        borderRadius: '50%',
        overflow: 'hidden',
        border: data.borderColor ? `3px solid ${data.borderColor}` : 'none',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}>
        <img
          src={staticFile(data.src)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  },
});
