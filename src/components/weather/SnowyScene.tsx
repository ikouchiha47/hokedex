import React from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SKY_COLOR = '#0c1445';
const SNOWFLAKE_COLOR = '#e2e8f0';
const GROUND_COLOR = '#1e3a8a';
const GROUND_HEIGHT = 28;

const FLAKE_X_FRACS = [0.1, 0.28, 0.45, 0.6, 0.75, 0.9];
const FLAKE_RADII = [3, 4, 5, 3, 4, 5];
const FLAKE_DURATIONS = [3000, 3800, 4400, 3200, 5000, 3600];
const SWAY_AMOUNT = 10;
const SWAY_DURATION = 2000;

type Props = { width: number; height: number };

export function SnowyScene({ width, height }: Props) {
  const cy0 = useSharedValue(-10);
  const cy1 = useSharedValue(-10);
  const cy2 = useSharedValue(-10);
  const cy3 = useSharedValue(-10);
  const cy4 = useSharedValue(-10);
  const cy5 = useSharedValue(-10);

  const cx0 = useSharedValue(width * FLAKE_X_FRACS[0]);
  const cx1 = useSharedValue(width * FLAKE_X_FRACS[1]);
  const cx2 = useSharedValue(width * FLAKE_X_FRACS[2]);
  const cx3 = useSharedValue(width * FLAKE_X_FRACS[3]);
  const cx4 = useSharedValue(width * FLAKE_X_FRACS[4]);
  const cx5 = useSharedValue(width * FLAKE_X_FRACS[5]);

  React.useEffect(() => {
    const target = height + 10;
    cy0.value = withRepeat(withTiming(target, { duration: FLAKE_DURATIONS[0], easing: Easing.linear }), -1, false);
    cy1.value = withRepeat(withTiming(target, { duration: FLAKE_DURATIONS[1], easing: Easing.linear }), -1, false);
    cy2.value = withRepeat(withTiming(target, { duration: FLAKE_DURATIONS[2], easing: Easing.linear }), -1, false);
    cy3.value = withRepeat(withTiming(target, { duration: FLAKE_DURATIONS[3], easing: Easing.linear }), -1, false);
    cy4.value = withRepeat(withTiming(target, { duration: FLAKE_DURATIONS[4], easing: Easing.linear }), -1, false);
    cy5.value = withRepeat(withTiming(target, { duration: FLAKE_DURATIONS[5], easing: Easing.linear }), -1, false);

    const base0 = width * FLAKE_X_FRACS[0];
    const base1 = width * FLAKE_X_FRACS[1];
    const base2 = width * FLAKE_X_FRACS[2];
    const base3 = width * FLAKE_X_FRACS[3];
    const base4 = width * FLAKE_X_FRACS[4];
    const base5 = width * FLAKE_X_FRACS[5];

    cx0.value = withRepeat(withTiming(base0 + SWAY_AMOUNT, { duration: SWAY_DURATION }), -1, true);
    cx1.value = withRepeat(withTiming(base1 - SWAY_AMOUNT, { duration: SWAY_DURATION }), -1, true);
    cx2.value = withRepeat(withTiming(base2 + SWAY_AMOUNT, { duration: SWAY_DURATION }), -1, true);
    cx3.value = withRepeat(withTiming(base3 - SWAY_AMOUNT, { duration: SWAY_DURATION }), -1, true);
    cx4.value = withRepeat(withTiming(base4 + SWAY_AMOUNT, { duration: SWAY_DURATION }), -1, true);
    cx5.value = withRepeat(withTiming(base5 - SWAY_AMOUNT, { duration: SWAY_DURATION }), -1, true);
  }, [cy0, cy1, cy2, cy3, cy4, cy5, cx0, cx1, cx2, cx3, cx4, cx5, width, height]);

  const ap0 = useAnimatedProps(() => ({ cy: cy0.value, cx: cx0.value }));
  const ap1 = useAnimatedProps(() => ({ cy: cy1.value, cx: cx1.value }));
  const ap2 = useAnimatedProps(() => ({ cy: cy2.value, cx: cx2.value }));
  const ap3 = useAnimatedProps(() => ({ cy: cy3.value, cx: cx3.value }));
  const ap4 = useAnimatedProps(() => ({ cy: cy4.value, cx: cx4.value }));
  const ap5 = useAnimatedProps(() => ({ cy: cy5.value, cx: cx5.value }));

  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill={SKY_COLOR} />

      <AnimatedCircle r={FLAKE_RADII[0]} fill={SNOWFLAKE_COLOR} animatedProps={ap0} />
      <AnimatedCircle r={FLAKE_RADII[1]} fill={SNOWFLAKE_COLOR} animatedProps={ap1} />
      <AnimatedCircle r={FLAKE_RADII[2]} fill={SNOWFLAKE_COLOR} animatedProps={ap2} />
      <AnimatedCircle r={FLAKE_RADII[3]} fill={SNOWFLAKE_COLOR} animatedProps={ap3} />
      <AnimatedCircle r={FLAKE_RADII[4]} fill={SNOWFLAKE_COLOR} animatedProps={ap4} />
      <AnimatedCircle r={FLAKE_RADII[5]} fill={SNOWFLAKE_COLOR} animatedProps={ap5} />

      <Rect x={0} y={height - GROUND_HEIGHT} width={width} height={GROUND_HEIGHT} fill={GROUND_COLOR} />
    </Svg>
  );
}
