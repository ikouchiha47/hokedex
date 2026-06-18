import React from 'react';
import { registerElement } from '../../../platform/core/element-registry';

type CircleData = { color: string };

registerElement('core:circle', {
  render(data: CircleData, w: number, h: number) {
    return (
      <div style={{
        width: w, height: h,
        borderRadius: '50%',
        background: data.color + '33',
        border: `3px solid ${data.color}`,
        boxSizing: 'border-box',
      }} />
    );
  },
});
