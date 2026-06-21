import React from 'react';
import Svg, { Ellipse, Line, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const AnimatedLine = Animated.createAnimatedComponent(Line);

const SKY_COLOR = '#0f172a';
const CLOUD_COLOR = '#1e293b';
const RAIN_STROKE = '#93c5fd';
const RAIN_WIDTH = 1.5;
const RAIN_OPACITY = 0.6;
const RAIN_DURATION = 800;
const RAIN_STAGGER = 150;

const LINE_X_FRACS = [0.05, 0.18, 0.3, 0.43, 0.55, 0.67, 0.8, 0.92];
const LINE_LEN = 18;
const LINE_DX = 6;

type Props = { width: number; height: number };

export function RainyScene({ width, height }: Props) {
  const y0 = useSharedValue(-LINE_LEN);
  const y1 = useSharedValue(-LINE_LEN);
  const y2 = useSharedValue(-LINE_LEN);
  const y3 = useSharedValue(-LINE_LEN);
  const y4 = useSharedValue(-LINE_LEN);
  const y5 = useSharedValue(-LINE_LEN);
  const y6 = useSharedValue(-LINE_LEN);
  const y7 = useSharedValue(-LINE_LEN);

  React.useEffect(() => {
    const cfg = { duration: RAIN_DURATION };
    y0.value = withRepeat(withDelay(0 * RAIN_STAGGER, withTiming(height + LINE_LEN, cfg)), -1, false);
    y1.value = withRepeat(withDelay(1 * RAIN_STAGGER, withTiming(height + LINE_LEN, cfg)), -1, false);
    y2.value = withRepeat(withDelay(2 * RAIN_STAGGER, withTiming(height + LINE_LEN, cfg)), -1, false);
    y3.value = withRepeat(withDelay(3 * RAIN_STAGGER, withTiming(height + LINE_LEN, cfg)), -1, false);
    y4.value = withRepeat(withDelay(4 * RAIN_STAGGER, withTiming(height + LINE_LEN, cfg)), -1, false);
    y5.value = withRepeat(withDelay(5 * RAIN_STAGGER, withTiming(height + LINE_LEN, cfg)), -1, false);
    y6.value = withRepeat(withDelay(6 * RAIN_STAGGER, withTiming(height + LINE_LEN, cfg)), -1, false);
    y7.value = withRepeat(withDelay(7 * RAIN_STAGGER, withTiming(height + LINE_LEN, cfg)), -1, false);
  }, [y0, y1, y2, y3, y4, y5, y6, y7, height]);

  const ap0 = useAnimatedProps(() => ({ y1: y0.value, y2: y0.value + LINE_LEN }));
  const ap1 = useAnimatedProps(() => ({ y1: y1.value, y2: y1.value + LINE_LEN }));
  const ap2 = useAnimatedProps(() => ({ y1: y2.value, y2: y2.value + LINE_LEN }));
  const ap3 = useAnimatedProps(() => ({ y1: y3.value, y2: y3.value + LINE_LEN }));
  const ap4 = useAnimatedProps(() => ({ y1: y4.value, y2: y4.value + LINE_LEN }));
  const ap5 = useAnimatedProps(() => ({ y1: y5.value, y2: y5.value + LINE_LEN }));
  const ap6 = useAnimatedProps(() => ({ y1: y6.value, y2: y6.value + LINE_LEN }));
  const ap7 = useAnimatedProps(() => ({ y1: y7.value, y2: y7.value + LINE_LEN }));

  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill={SKY_COLOR} />

      <Ellipse cx={width * 0.3} cy={height * 0.18} rx={80} ry={30} fill={CLOUD_COLOR} />
      <Ellipse cx={width * 0.65} cy={height * 0.12} rx={70} ry={25} fill={CLOUD_COLOR} />

      <AnimatedLine x1={width * LINE_X_FRACS[0]} x2={width * LINE_X_FRACS[0] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap0} />
      <AnimatedLine x1={width * LINE_X_FRACS[1]} x2={width * LINE_X_FRACS[1] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap1} />
      <AnimatedLine x1={width * LINE_X_FRACS[2]} x2={width * LINE_X_FRACS[2] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap2} />
      <AnimatedLine x1={width * LINE_X_FRACS[3]} x2={width * LINE_X_FRACS[3] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap3} />
      <AnimatedLine x1={width * LINE_X_FRACS[4]} x2={width * LINE_X_FRACS[4] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap4} />
      <AnimatedLine x1={width * LINE_X_FRACS[5]} x2={width * LINE_X_FRACS[5] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap5} />
      <AnimatedLine x1={width * LINE_X_FRACS[6]} x2={width * LINE_X_FRACS[6] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap6} />
      <AnimatedLine x1={width * LINE_X_FRACS[7]} x2={width * LINE_X_FRACS[7] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap7} />
    </Svg>
  );
}
