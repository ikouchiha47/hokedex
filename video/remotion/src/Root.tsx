import React from 'react';
import { Composition, Series } from 'remotion';
import { scenes } from './spec';
import { TextScene } from './scenes/TextScene';
import { ScreenshotScene } from './scenes/ScreenshotScene';
import { ChipsScene } from './scenes/ChipsScene';
import { LockupScene } from './scenes/LockupScene';

const FPS = 30;

const totalFrames = scenes.reduce((sum, s) => sum + Math.round(s.duration * FPS), 0);

const HokedexShort: React.FC = () => (
  <Series>
    {scenes.map((scene, i) => {
      const durationInFrames = Math.round(scene.duration * FPS);
      return (
        <Series.Sequence key={i} durationInFrames={durationInFrames}>
          {scene.type === 'text' && <TextScene lines={scene.lines} />}
          {scene.type === 'screenshot' && (
            <ScreenshotScene
              src={scene.src}
              crop={scene.crop}
              enter={scene.enter}
              elements={scene.elements}
            />
          )}
          {scene.type === 'chips' && (
            <ChipsScene items={scene.items} stamp={scene.stamp} />
          )}
          {scene.type === 'lockup' && (
            <LockupScene hook={scene.hook} name={scene.name} sub={scene.sub} />
          )}
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
