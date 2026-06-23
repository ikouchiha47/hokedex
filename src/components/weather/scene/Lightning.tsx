import React from 'react';
import { Path } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withSequence, withTiming, withDelay } from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = { width: number; height: number };

export function Lightning({ width, height }: Props) {
  const flashOpacity = useSharedValue(0);

  React.useEffect(() => {
    flashOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 400 }),
        withDelay(3520, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [flashOpacity]);

  const lightningProps = useAnimatedProps(() => ({ opacity: flashOpacity.value }));

  const bx = width / 2;
  const by = height * 0.1;
  const boltPath = `M${bx - 8},${by} L${bx + 4},${by + 30} L${bx - 4},${by + 30} L${bx + 8},${by + 60}`;

  return (
    <AnimatedPath d={boltPath} fill="#fde68a" animatedProps={lightningProps} />
  );
}
