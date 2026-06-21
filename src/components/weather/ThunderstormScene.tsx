import React from 'react';
import Svg, { Ellipse, Line, Path, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withDelay,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const SKY_COLOR = '#030712';
const CLOUD_COLOR = '#111827';
const RAIN_STROKE = '#60a5fa';
const RAIN_WIDTH = 2;
const RAIN_OPACITY = 0.7;
const RAIN_DURATION = 600;
const RAIN_STAGGER = 100;
const LIGHTNING_COLOR = '#fde68a';

const LINE_X_FRACS = [0.04, 0.14, 0.25, 0.36, 0.47, 0.58, 0.68, 0.78, 0.87, 0.95];
const LINE_LEN = 22;
const LINE_DX = 8;

type Props = { width: number; height: number };

export function ThunderstormScene({ width, height }: Props) {
  const y0 = useSharedValue(-LINE_LEN);
  const y1 = useSharedValue(-LINE_LEN);
  const y2 = useSharedValue(-LINE_LEN);
  const y3 = useSharedValue(-LINE_LEN);
  const y4 = useSharedValue(-LINE_LEN);
  const y5 = useSharedValue(-LINE_LEN);
  const y6 = useSharedValue(-LINE_LEN);
  const y7 = useSharedValue(-LINE_LEN);
  const y8 = useSharedValue(-LINE_LEN);
  const y9 = useSharedValue(-LINE_LEN);

  const flashOpacity = useSharedValue(0);

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
    y8.value = withRepeat(withDelay(8 * RAIN_STAGGER, withTiming(height + LINE_LEN, cfg)), -1, false);
    y9.value = withRepeat(withDelay(9 * RAIN_STAGGER, withTiming(height + LINE_LEN, cfg)), -1, false);

    flashOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 400 }),
        withDelay(3520, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [y0, y1, y2, y3, y4, y5, y6, y7, y8, y9, flashOpacity, height]);

  const ap0 = useAnimatedProps(() => ({ y1: y0.value, y2: y0.value + LINE_LEN }));
  const ap1 = useAnimatedProps(() => ({ y1: y1.value, y2: y1.value + LINE_LEN }));
  const ap2 = useAnimatedProps(() => ({ y1: y2.value, y2: y2.value + LINE_LEN }));
  const ap3 = useAnimatedProps(() => ({ y1: y3.value, y2: y3.value + LINE_LEN }));
  const ap4 = useAnimatedProps(() => ({ y1: y4.value, y2: y4.value + LINE_LEN }));
  const ap5 = useAnimatedProps(() => ({ y1: y5.value, y2: y5.value + LINE_LEN }));
  const ap6 = useAnimatedProps(() => ({ y1: y6.value, y2: y6.value + LINE_LEN }));
  const ap7 = useAnimatedProps(() => ({ y1: y7.value, y2: y7.value + LINE_LEN }));
  const ap8 = useAnimatedProps(() => ({ y1: y8.value, y2: y8.value + LINE_LEN }));
  const ap9 = useAnimatedProps(() => ({ y1: y9.value, y2: y9.value + LINE_LEN }));

  const lightningProps = useAnimatedProps(() => ({ opacity: flashOpacity.value }));

  const bx = width / 2;
  const by = height * 0.1;
  const boltPath = `M${bx - 8},${by} L${bx + 4},${by + 30} L${bx - 4},${by + 30} L${bx + 8},${by + 60}`;

  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill={SKY_COLOR} />

      <Ellipse cx={width * 0.35} cy={height * 0.15} rx={90} ry={32} fill={CLOUD_COLOR} />
      <Ellipse cx={width * 0.7} cy={height * 0.1} rx={75} ry={28} fill={CLOUD_COLOR} />

      <AnimatedLine x1={width * LINE_X_FRACS[0]} x2={width * LINE_X_FRACS[0] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap0} />
      <AnimatedLine x1={width * LINE_X_FRACS[1]} x2={width * LINE_X_FRACS[1] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap1} />
      <AnimatedLine x1={width * LINE_X_FRACS[2]} x2={width * LINE_X_FRACS[2] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap2} />
      <AnimatedLine x1={width * LINE_X_FRACS[3]} x2={width * LINE_X_FRACS[3] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap3} />
      <AnimatedLine x1={width * LINE_X_FRACS[4]} x2={width * LINE_X_FRACS[4] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap4} />
      <AnimatedLine x1={width * LINE_X_FRACS[5]} x2={width * LINE_X_FRACS[5] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap5} />
      <AnimatedLine x1={width * LINE_X_FRACS[6]} x2={width * LINE_X_FRACS[6] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap6} />
      <AnimatedLine x1={width * LINE_X_FRACS[7]} x2={width * LINE_X_FRACS[7] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap7} />
      <AnimatedLine x1={width * LINE_X_FRACS[8]} x2={width * LINE_X_FRACS[8] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap8} />
      <AnimatedLine x1={width * LINE_X_FRACS[9]} x2={width * LINE_X_FRACS[9] + LINE_DX} stroke={RAIN_STROKE} strokeWidth={RAIN_WIDTH} opacity={RAIN_OPACITY} animatedProps={ap9} />

      <AnimatedPath d={boltPath} fill={LIGHTNING_COLOR} animatedProps={lightningProps} />
    </Svg>
  );
}
