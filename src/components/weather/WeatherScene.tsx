import React from 'react';
import Svg, { Defs, RadialGradient, Stop } from 'react-native-svg';
import type { WeatherSceneConfig, WeatherCondition } from '../../types/weather';

import { SkyGradient } from './scene/SkyGradient';
import { Sun } from './scene/Sun';
import { Moon } from './scene/Moon';
import { Cloud } from './scene/Cloud';
import { Rain } from './scene/Rain';
import { Snow } from './scene/Snow';
import { Hail } from './scene/Hail';
import { Lightning } from './scene/Lightning';
import { Ground } from './scene/Ground';
import { Flowers } from './scene/Flowers';
import { Houses } from './scene/Houses';
import { WeatherWarningOverlay } from './scene/WeatherWarningOverlay';

type Props = {
  config: WeatherSceneConfig;
  width: number;
  height: number;
};

function groundHeightFromHeight(height: number): number {
  return Math.max(34, Math.min(height * 0.14, 46));
}

const DAY_GROUND = 'rgba(120,60,0,0.5)';
const NIGHT_GROUND = 'rgba(30,20,40,0.5)';
const STORM_GROUND = 'rgba(10,5,5,0.5)';
const SNOW_GROUND = '#1e3a8a';

type Celestial = 'sun' | 'moon' | 'none';
type CloudConfig = 'none' | 'scattered' | 'overcast';
type RainConfig = 'none' | 'drizzle' | 'rain' | 'storm';
type GroundColor = 'day' | 'night' | 'snow' | 'storm';

type SceneLayout = {
  celestial: Celestial;
  clouds?: CloudConfig;
  rain?: RainConfig;
  snow?: boolean;
  hail?: boolean;
  lightning?: boolean;
  ground: GroundColor;
  flowers?: boolean;
  houses?: boolean;
};

const LAYOUTS: Record<WeatherCondition, (isDay: boolean) => SceneLayout> = {
  clear: (isDay) => ({
    celestial: isDay ? 'sun' : 'moon',
    clouds: 'none',
    ground: isDay ? 'day' : 'night',
    flowers: isDay,
    houses: !isDay,
  }),
  partly_cloudy: (isDay) => ({
    celestial: isDay ? 'sun' : 'moon',
    clouds: 'scattered',
    ground: isDay ? 'day' : 'night',
    flowers: isDay,
    houses: !isDay,
  }),
  cloudy: () => ({
    celestial: 'none',
    clouds: 'overcast',
    ground: 'day',
  }),
  fog: () => ({
    celestial: 'none',
    clouds: 'overcast',
    ground: 'day',
  }),
  drizzle: () => ({
    celestial: 'none',
    clouds: 'overcast',
    rain: 'drizzle',
    ground: 'day',
  }),
  rain: () => ({
    celestial: 'none',
    clouds: 'overcast',
    rain: 'rain',
    ground: 'day',
  }),
  snow: () => ({
    celestial: 'none',
    clouds: 'overcast',
    snow: true,
    ground: 'snow',
  }),
  hail: () => ({
    celestial: 'none',
    clouds: 'overcast',
    hail: true,
    ground: 'snow',
  }),
  storm: () => ({
    celestial: 'none',
    clouds: 'overcast',
    rain: 'storm',
    lightning: true,
    ground: 'storm',
  }),
};

const GROUND_COLORS: Record<GroundColor, string> = {
  day: DAY_GROUND,
  night: NIGHT_GROUND,
  snow: SNOW_GROUND,
  storm: STORM_GROUND,
};

export function WeatherScene({ config, width, height }: Props) {
  const { condition, isDay } = config;
  const layout = LAYOUTS[condition](isDay);
  const gh = groundHeightFromHeight(height);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <RadialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#fde68a" stopOpacity="1" />
          <Stop offset="30%" stopColor="#f59e0b" stopOpacity="1" />
          <Stop offset="70%" stopColor="#f59e0b" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <SkyGradient width={width} height={height} kind={config.kind} />

      {layout.celestial === 'sun' && <Sun width={width} height={height} />}
      {layout.celestial === 'moon' && <Moon width={width} height={height} />}

      {layout.clouds === 'scattered' && <Cloud width={width} height={height} isDay={isDay} count="some" />}
      {layout.clouds === 'overcast' && <Cloud width={width} height={height} isDay={isDay} />}

      {layout.rain === 'drizzle' && <Rain width={width} height={height} count={4} />}
      {layout.rain === 'rain' && <Rain width={width} height={height} />}
      {layout.rain === 'storm' && <Rain width={width} height={height} />}

      {layout.snow && <Snow width={width} height={height} />}
      {layout.hail && <Hail width={width} height={height} />}

      {layout.lightning && <Lightning width={width} height={height} />}

      <Ground width={width} height={height} color={GROUND_COLORS[layout.ground]} />

      {layout.flowers && <Flowers width={width} height={height} groundHeight={gh} />}
      {layout.houses && <Houses width={width} height={height} groundHeight={gh} />}

      {config.warning && <WeatherWarningOverlay width={width} warning={config.warning} />}
    </Svg>
  );
}
