import React from 'react';
import { Circle, Line } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = { width: number; height: number };

export function Sun({ width, height }: Props) {
  const sunCoreRadius = Math.max(32, Math.min(width * 0.095, 46));
  const innerSunRadius = sunCoreRadius * 0.76;
  const minGlowRadius = sunCoreRadius * 2;
  const maxGlowRadius = sunCoreRadius * 2.55;
  const rayInner = sunCoreRadius * 1.35;
  const rayOuter = sunCoreRadius * 1.7;
  const sx = width * 0.68;
  const sy = height * 0.36;
  const glowR = useSharedValue(minGlowRadius);

  React.useEffect(() => {
    glowR.value = withRepeat(
      withTiming(maxGlowRadius, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [glowR, maxGlowRadius]);

  const glowProps = useAnimatedProps(() => ({ r: glowR.value }));

  return (
    <>
      <AnimatedCircle cx={sx} cy={sy} fill="url(#sunGrad)" animatedProps={glowProps} />
      <Circle cx={sx} cy={sy} r={sunCoreRadius} fill="#f59e0b" />
      <Circle cx={sx} cy={sy} r={innerSunRadius} fill="#fde68a" />
      <Line x1={sx} y1={sy-rayOuter} x2={sx} y2={sy-rayInner} stroke="rgba(253,230,138,0.5)" strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={sx+rayInner} y1={sy} x2={sx+rayOuter} y2={sy} stroke="rgba(253,230,138,0.5)" strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={sx-rayOuter} y1={sy} x2={sx-rayInner} y2={sy} stroke="rgba(253,230,138,0.5)" strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={sx+rayInner*0.72} y1={sy-rayInner*0.72} x2={sx+rayOuter*0.72} y2={sy-rayOuter*0.72} stroke="rgba(253,230,138,0.4)" strokeWidth={1} strokeLinecap="round" />
      <Line x1={sx-rayInner*0.72} y1={sy-rayInner*0.72} x2={sx-rayOuter*0.72} y2={sy-rayOuter*0.72} stroke="rgba(253,230,138,0.4)" strokeWidth={1} strokeLinecap="round" />
    </>
  );
}
