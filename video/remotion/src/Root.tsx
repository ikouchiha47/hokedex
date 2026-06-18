import React from 'react';
import { Composition, Series } from 'remotion';
import { scenes } from './spec';
import { SceneRegistry } from './registry';

const FPS = 30;
const totalFrames = scenes.reduce((sum, s) => sum + Math.round(s.duration * FPS), 0);

const HokedexShort: React.FC = () => (
  <Series>
    {scenes.map((scene, i) => {
      const Scene = SceneRegistry[scene.type];
      return (
        <Series.Sequence key={i} durationInFrames={Math.round(scene.duration * FPS)}>
          <Scene {...scene} />
        </Series.Sequence>
      );
    })}
  </Series>
);

export const Root: React.FC = () => (
  <Composition
    id="HokedexShort"
    component={HokedexShort}
    durationInFrames={totalFrames}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
