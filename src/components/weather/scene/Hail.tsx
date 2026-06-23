import React from 'react';
import { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withDelay, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { generateParticleParams } from './procedural';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = { width: number; height: number };

const BASE_DURATION = 1200;
const HAIL_STAGGER = 120;
const HAIL_COLOR = '#dbeafe';

function Hailstone({ width, height, fx, radius, delayMs, speedFactor }: {
  width: number; height: number; fx: number; radius: number; delayMs: number; speedFactor: number;
}) {
  const cy = useSharedValue(-radius);

  React.useEffect(() => {
    const dur = BASE_DURATION / speedFactor;
    cy.value = withRepeat(
      withDelay(delayMs, withTiming(height + radius, { duration: dur, easing: Easing.linear })),
      -1,
      false,
    );
  }, [cy, delayMs, height, radius, speedFactor]);

  const ap = useAnimatedProps(() => ({ cy: cy.value }));

  return <AnimatedCircle cx={width * fx} r={radius} fill={HAIL_COLOR} opacity={0.85} animatedProps={ap} />;
}

export function Hail({ width, height }: Props) {
  const particles = generateParticleParams({ seed: `hail-${Math.round(width)}-${Math.round(height)}`, count: 7 });

  return (
    <>
      {particles.map((p, i) => (
        <Hailstone
          key={i}
          width={width}
          height={height}
          fx={p.fx}
          radius={(p.radius ?? 4) + 1}
          delayMs={i * HAIL_STAGGER}
          speedFactor={p.speedFactor ?? 1}
        />
      ))}
    </>
  );
}
