import React from 'react';
import { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { generateParticleParams } from './procedural';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = { width: number; height: number };

const BASE_DURATIONS = [3600, 4400, 5000, 3200, 5600, 4000];
const SWAY_AMOUNT = 10;
const SWAY_DURATION = 2000;
const SNOWFLAKE_COLOR = '#e2e8f0';

function Flake({ width, height, fx, radius, duration, swayDir }: {
  width: number; height: number; fx: number; radius: number; duration: number; swayDir: number;
}) {
  const cy = useSharedValue(-10);
  const cx = useSharedValue(width * fx);

  React.useEffect(() => {
    cy.value = withRepeat(withTiming(height + 10, { duration, easing: Easing.linear }), -1, false);
    cx.value = withRepeat(withTiming(width * fx + swayDir * SWAY_AMOUNT, { duration: SWAY_DURATION }), -1, true);
  }, [cy, cx, width, height, fx, duration, swayDir]);

  const ap = useAnimatedProps(() => ({ cy: cy.value, cx: cx.value }));

  return <AnimatedCircle r={radius} fill={SNOWFLAKE_COLOR} animatedProps={ap} />;
}

export function Snow({ width, height }: Props) {
  const particles = generateParticleParams({ seed: `snow-${Math.round(width)}-${Math.round(height)}`, count: 6 });

  return (
    <>
      {particles.map((p, i) => (
        <Flake
          key={i}
          width={width}
          height={height}
          fx={p.fx}
          radius={(p.radius ?? 3) + 1}
          duration={BASE_DURATIONS[i % BASE_DURATIONS.length] * (p.speedFactor ?? 1)}
          swayDir={i % 2 === 0 ? 1 : -1}
        />
      ))}
    </>
  );
}
