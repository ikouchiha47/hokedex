import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  withSequence,
} from 'react-native-reanimated';
import { Plus, User, Mic, Camera } from './icons';

const ANIMATION_DURATION = 220;
const EASING = Easing.out(Easing.quad);

const FAB_BG = '#c0170d';
const OPTION_BG = 'rgba(255,255,255,0.08)';
const OPTION_BORDER = 'rgba(255,255,255,0.14)';
const OPTION_LABEL_COLOR = 'rgba(255,255,255,0.6)';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function RadialFAB() {
  const [open, setOpen] = useState(false);
  const { width } = useWindowDimensions();
  const fabSize = clamp(width * 0.17, 62, 72);
  const optionSize = clamp(width * 0.12, 44, 52);
  const spread = fabSize * 1.55;
  const ringSize = fabSize + 16;
  const iconSizeFab = clamp(fabSize * 0.42, 26, 30);
  const iconSizeOption = clamp(optionSize * 0.42, 18, 22);
  const labelSize = clamp(width * 0.022, 8, 10);
  const glowScale = useSharedValue(1.15);
  const glowOpacity = useSharedValue(0.5);

  const contactX = useSharedValue(0);
  const contactY = useSharedValue(0);
  const contactOpacity = useSharedValue(0);
  const contactScale = useSharedValue(0);

  const micX = useSharedValue(0);
  const micY = useSharedValue(0);
  const micOpacity = useSharedValue(0);
  const micScale = useSharedValue(0);

  const cameraX = useSharedValue(0);
  const cameraY = useSharedValue(0);
  const cameraOpacity = useSharedValue(0);
  const cameraScale = useSharedValue(0);

  React.useEffect(() => {
    glowScale.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.quad) });
    glowOpacity.value = withSequence(
      withTiming(1, { duration: 160, easing: EASING }),
      withTiming(0.55, { duration: 520, easing: Easing.out(Easing.quad) }),
    );
  }, [glowOpacity, glowScale]);

  function handleToggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    const cfg = { duration: ANIMATION_DURATION, easing: EASING };

    contactX.value = withTiming(nextOpen ? -spread : 0, cfg);
    contactY.value = withTiming(nextOpen ? spread * 0.48 : 0, cfg);
    contactOpacity.value = withTiming(nextOpen ? 1 : 0, cfg);
    contactScale.value = withTiming(nextOpen ? 1 : 0, cfg);

    cameraX.value = withTiming(nextOpen ? spread : 0, cfg);
    cameraY.value = withTiming(nextOpen ? spread * 0.48 : 0, cfg);
    cameraOpacity.value = withTiming(nextOpen ? 1 : 0, cfg);
    cameraScale.value = withTiming(nextOpen ? 1 : 0, cfg);

    micX.value = withTiming(0, cfg);
    micY.value = withTiming(nextOpen ? spread : 0, cfg);
    micOpacity.value = withTiming(nextOpen ? 1 : 0, cfg);
    micScale.value = withTiming(nextOpen ? 1 : 0, cfg);
  }

  const contactStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: contactX.value },
      { translateY: contactY.value },
      { scale: contactScale.value },
    ],
    opacity: contactOpacity.value,
  }));

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cameraX.value },
      { translateY: cameraY.value },
      { scale: cameraScale.value },
    ],
    opacity: cameraOpacity.value,
  }));

  const micStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: micX.value },
      { translateY: micY.value },
      { scale: micScale.value },
    ],
    opacity: micOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={[styles.container, { width: fabSize, height: fabSize }]}>
      <Animated.View style={[styles.option, contactStyle]}>
        <TouchableOpacity style={[styles.optionBtn, { width: optionSize, height: optionSize, borderRadius: optionSize / 2 }]}>
          <User size={iconSizeOption} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={[styles.optionLabel, { fontSize: labelSize }]}>Contact</Text>
      </Animated.View>

      <Animated.View style={[styles.option, cameraStyle]}>
        <TouchableOpacity style={[styles.optionBtn, { width: optionSize, height: optionSize, borderRadius: optionSize / 2 }]}>
          <Camera size={iconSizeOption} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={[styles.optionLabel, { fontSize: labelSize }]}>Camera</Text>
      </Animated.View>

      <Animated.View style={[styles.option, micStyle]}>
        <TouchableOpacity style={[styles.optionBtn, { width: optionSize, height: optionSize, borderRadius: optionSize / 2 }]}>
          <Mic size={iconSizeOption} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={[styles.optionLabel, { fontSize: labelSize }]}>Voice</Text>
      </Animated.View>

      <Animated.View style={[styles.glowOuter, glowStyle, { width: fabSize * 2.1, height: fabSize * 2.1, borderRadius: fabSize * 1.05 }]} />
      <Animated.View style={[styles.glowMid, glowStyle, { width: fabSize * 1.55, height: fabSize * 1.55, borderRadius: fabSize * 0.775 }]} />
      <View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
        <TouchableOpacity style={[styles.fab, { width: fabSize, height: fabSize, borderRadius: fabSize / 2 }]} onPress={handleToggle} activeOpacity={0.85}>
          <Plus size={iconSizeFab} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Tight wrap around the FAB button; overflow visible so options expand outside
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glowOuter: {
    position: 'absolute',
    backgroundColor: 'rgba(192,23,13,0.06)',
  },
  glowMid: {
    position: 'absolute',
    backgroundColor: 'rgba(232,55,42,0.09)',
  },
  ring: {
    backgroundColor: 'rgba(192,23,13,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fab: {
    backgroundColor: FAB_BG,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    zIndex: 10,
  },
  option: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 9,
  },
  optionBtn: {
    backgroundColor: OPTION_BG,
    borderWidth: 1,
    borderColor: OPTION_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  optionLabel: {
    color: OPTION_LABEL_COLOR,
    marginTop: 3,
  },
});
