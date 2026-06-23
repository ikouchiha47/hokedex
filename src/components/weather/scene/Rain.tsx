import React from 'react';
import { Line } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withDelay, withTiming } from 'react-native-reanimated';
import { generateParticleParams } from './procedural';

const AnimatedLine = Animated.createAnimatedComponent(Line);

type Props = { width: number; height: number; count?: number };

const LINE_LEN = 18;
const LINE_DX = 6;
const RAIN_STROKE = '#93c5fd';
const RAIN_WIDTH = 1.5;
const RAIN_OPACITY = 0.6;
const BASE_DURATION = 800;

const STAGGERS = [0, 200, 100, 350, 50, 280, 180, 420];

function RainStreak({ width, height, fx, delayMs, speedFactor }: {
  width: number; height: number; fx: number; delayMs: number; speedFactor: number;
}) {
  const y = useSharedValue(-LINE_LEN);

  React.useEffect(() => {
    const dur = BASE_DURATION / speedFactor;
    y.value = withRepeat(withDelay(delayMs, withTiming(height + LINE_LEN, { duration: dur })), -1, false);
  }, [y, height, delayMs, speedFactor]);

  const ap = useAnimatedProps(() => ({ y1: y.value, y2: y.value + LINE_LEN }));

  return (
    <AnimatedLine
      x1={width * fx}
      x2={width * fx + LINE_DX}
      stroke={RAIN_STROKE}
      strokeWidth={RAIN_WIDTH}
      opacity={RAIN_OPACITY}
      animatedProps={ap}
    />
  );
}

export function Rain({ width, height, count = 8 }: Props) {
  const particles = generateParticleParams({ seed: `rain-${Math.round(width)}-${Math.round(height)}`, count });

  return (
    <>
      {particles.map((p, i) => (
        <RainStreak
          key={i}
          width={width}
          height={height}
          fx={p.fx}
          delayMs={STAGGERS[i % STAGGERS.length]}
          speedFactor={p.speedFactor!}
        />
      ))}
    </>
  );
}
