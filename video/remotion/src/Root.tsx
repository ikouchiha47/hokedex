import React from 'react';
import { Composition } from 'remotion';
import { compositions } from './projects/hokedex';

export const Root: React.FC = () => (
  <>
    {compositions.map(c => (
      <Composition
        key={c.id}
        id={c.id}
        component={c.component}
        durationInFrames={c.durationInFrames}
        fps={c.fps}
        width={c.width}
        height={c.height}
      />
    ))}
  </>
);
