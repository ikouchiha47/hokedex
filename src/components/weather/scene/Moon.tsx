import React from 'react';
import { Circle, Line } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withDelay, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { generateStars, generateMoonCraters, getMoonBounds, type GeneratedStar } from './procedural';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

type Props = { width: number; height: number };

const MOON_SX = 0.72;
const MOON_SY = 0.32;
const MOON_RADIUS_RATIO = 0.08;
const CRATER_FILL = 'rgba(148,163,184,0.28)';

const SHOOTING_TRAIL_RATIO = 0.075;
const SHOOTING_DURATION = 3200;
const SHOOTING_IDLE = 12000;

function TwinklingStar({ width, height, star }: { width: number; height: number; star: GeneratedStar }) {
  const opacity = useSharedValue(0.4 + star.twinklePhase % 0.4);

  React.useEffect(() => {
    const base = 0.4 + (Math.sin(star.twinklePhase) * 0.3);
    opacity.value = withRepeat(
      withTiming(base + 0.3, { duration: 2500 + star.twinklePhase * 800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [opacity, star.twinklePhase]);

  const ap = useAnimatedProps(() => ({ opacity: opacity.value }));

  return (
    <AnimatedCircle
      cx={width * star.fx}
      cy={height * star.fy}
      r={star.radius}
      fill="rgba(255,255,255,0.7)"
      animatedProps={ap}
    />
  );
}

function ShootingStar({ width, height }: { width: number; height: number }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: SHOOTING_DURATION, easing: Easing.out(Easing.cubic) }),
        withDelay(SHOOTING_IDLE, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [progress]);

  const trailLen = Math.min(width, height) * SHOOTING_TRAIL_RATIO;
  const p0 = { x: -trailLen, y: height * 0.26 };
  const p1 = { x: width * 0.44, y: -height * 0.08 };
  const p2 = { x: width + trailLen, y: height * 0.06 };

  const ap = useAnimatedProps(() => ({
    x1: (() => {
      const t = progress.value;
      const mt = 1 - t;
      const headX = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
      const tangentX = 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
      const tangentY = 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
      const len = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
      return headX - (tangentX / len) * trailLen;
    })(),
    y1: (() => {
      const t = progress.value;
      const mt = 1 - t;
      const headY = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
      const tangentX = 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
      const tangentY = 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
      const len = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
      return headY - (tangentY / len) * trailLen;
    })(),
    x2: (() => {
      const t = progress.value;
      const mt = 1 - t;
      return mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
    })(),
    y2: (() => {
      const t = progress.value;
      const mt = 1 - t;
      return mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
    })(),
    opacity: progress.value < 0.18 ? progress.value / 0.18 : Math.max(0, 1 - progress.value),
  }));

  return (
    <AnimatedLine
      stroke="rgba(255,255,255,0.88)"
      strokeWidth={1.15}
      strokeLinecap="round"
      animatedProps={ap}
    />
  );
}

export function Moon({ width, height }: Props) {
  const moonR = Math.max(18, Math.min(width * MOON_RADIUS_RATIO, 30));
  const mx = width * MOON_SX;
  const my = height * MOON_SY;

  const craters = generateMoonCraters({
    width,
    height,
    seed: `moon-${Math.round(width)}-${Math.round(height)}`,
    count: 7,
  });

  const stars = generateStars({
    seed: `night-${Math.round(width)}-${Math.round(height)}`,
    width,
    height,
    count: 22,
    excludeBounds: getMoonBounds(width, height),
  });

  return (
    <>
      {stars.map((star, i) => (
        <TwinklingStar key={i} width={width} height={height} star={star} />
      ))}

      <ShootingStar width={width} height={height} />

      <Circle cx={mx} cy={my} r={moonR} fill="#e2e8f1" />

      {craters.map((crater, i) => (
        <Circle key={i} cx={crater.cx} cy={crater.cy} r={crater.r} fill={CRATER_FILL} />
      ))}
    </>
  );
}
