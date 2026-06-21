import React from 'react';
import Svg, { Circle, Ellipse, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SKY_COLOR = '#1a1035';
const SUN_COLOR = '#f59e0b';
const CLOUD_COLOR = 'rgba(255,255,255,0.15)';
const GROUND_COLOR = '#312e81';
const GROUND_HEIGHT = 30;
const SUN_RADIUS_MIN = 36;
const SUN_RADIUS_MAX = 42;
const PULSE_DURATION = 2000;

type Props = { width: number; height: number };

export function SunnyScene({ width, height }: Props) {
  const sunR = useSharedValue(SUN_RADIUS_MIN);

  React.useEffect(() => {
    sunR.value = withRepeat(
      withTiming(SUN_RADIUS_MAX, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [sunR]);

  const sunProps = useAnimatedProps(() => ({
    r: sunR.value,
  }));

  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill={SKY_COLOR} />

      <Ellipse cx={width * 0.15} cy={height * 0.25} rx={40} ry={18} fill={CLOUD_COLOR} />
      <Ellipse cx={width * 0.75} cy={height * 0.2} rx={50} ry={20} fill={CLOUD_COLOR} />
      <Ellipse cx={width * 0.85} cy={height * 0.3} rx={30} ry={14} fill={CLOUD_COLOR} />

      <AnimatedCircle cx={width / 2} cy={height * 0.38} fill={SUN_COLOR} animatedProps={sunProps} />

      <Rect x={0} y={height - GROUND_HEIGHT} width={width} height={GROUND_HEIGHT} fill={GROUND_COLOR} />
    </Svg>
  );
}
