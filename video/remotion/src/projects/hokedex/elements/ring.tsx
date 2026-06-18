import React from 'react';
import { registerElement } from '../../../platform/core/element-registry';

type RingData = { color: string };

registerElement('core:ring', {
  render(data: RingData, w: number, h: number) {
    return (
      <div style={{
        width: w, height: h,
        borderRadius: '50%',
        background: 'transparent',
        border: `3px solid ${data.color}`,
        boxSizing: 'border-box',
      }} />
    );
  },
});
