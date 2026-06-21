import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { Plus, User, Mic, Camera } from './icons';

const ANIMATION_DURATION = 200;
const EASING = Easing.out(Easing.quad);

// Translate targets (dx, dy) from center when expanded
// Source: design/direction-c.html FAB arc coordinates
const CONTACT_TX = -58;
const CONTACT_TY = -30;
const MIC_TX = -21;
const MIC_TY = 54;
const CAMERA_TX = 22;
const CAMERA_TY = -30;

const FAB_BG = '#c0170d';
const OPTION_BG = '#1a1b2e';
const OPTION_LABEL_COLOR = '#e5e7eb';
const FAB_SIZE = 56;
const OPTION_SIZE = 44;
const ICON_SIZE_FAB = 24;
const ICON_SIZE_OPTION = 20;

export function RadialFAB() {
  const [open, setOpen] = useState(false);

  const contactX = useSharedValue(0);
  const contactY = useSharedValue(0);
  const contactOpacity = useSharedValue(0);

  const micX = useSharedValue(0);
  const micY = useSharedValue(0);
  const micOpacity = useSharedValue(0);

  const cameraX = useSharedValue(0);
  const cameraY = useSharedValue(0);
  const cameraOpacity = useSharedValue(0);

  function handleToggle() {
    const nextOpen = !open;
    setOpen(nextOpen);

    const cfg = { duration: ANIMATION_DURATION, easing: EASING };

    contactX.value = withTiming(nextOpen ? CONTACT_TX : 0, cfg);
    contactY.value = withTiming(nextOpen ? CONTACT_TY : 0, cfg);
    contactOpacity.value = withTiming(nextOpen ? 1 : 0, cfg);

    micX.value = withTiming(nextOpen ? MIC_TX : 0, cfg);
    micY.value = withTiming(nextOpen ? MIC_TY : 0, cfg);
    micOpacity.value = withTiming(nextOpen ? 1 : 0, cfg);

    cameraX.value = withTiming(nextOpen ? CAMERA_TX : 0, cfg);
    cameraY.value = withTiming(nextOpen ? CAMERA_TY : 0, cfg);
    cameraOpacity.value = withTiming(nextOpen ? 1 : 0, cfg);
  }

  const contactStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: contactX.value },
      { translateY: contactY.value },
    ],
    opacity: contactOpacity.value,
  }));

  const micStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: micX.value },
      { translateY: micY.value },
    ],
    opacity: micOpacity.value,
  }));

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: cameraX.value },
      { translateY: cameraY.value },
    ],
    opacity: cameraOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Option: Contact */}
      <Animated.View style={[styles.option, contactStyle]}>
        <TouchableOpacity
          style={styles.optionBtn}
          onPress={() => {
            // TODO Phase 3: open contact capture flow
          }}
        >
          <User size={ICON_SIZE_OPTION} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.optionLabel}>Contact</Text>
      </Animated.View>

      {/* Option: Voice */}
      <Animated.View style={[styles.option, micStyle]}>
        <TouchableOpacity
          style={styles.optionBtn}
          onPress={() => {
            // TODO Phase 4: open voice capture flow
          }}
        >
          <Mic size={ICON_SIZE_OPTION} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.optionLabel}>Voice</Text>
      </Animated.View>

      {/* Option: Camera */}
      <Animated.View style={[styles.option, cameraStyle]}>
        <TouchableOpacity
          style={styles.optionBtn}
          onPress={() => {
            // TODO Phase 3: open camera capture flow
          }}
        >
          <Camera size={ICON_SIZE_OPTION} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.optionLabel}>Camera</Text>
      </Animated.View>

      {/* Main FAB button */}
      <TouchableOpacity style={styles.fab} onPress={handleToggle} activeOpacity={0.85}>
        <Plus size={ICON_SIZE_FAB} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    marginBottom: 24,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: FAB_BG,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  option: {
    position: 'absolute',
    alignItems: 'center',
  },
  optionBtn: {
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    borderRadius: OPTION_SIZE / 2,
    backgroundColor: OPTION_BG,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  optionLabel: {
    color: OPTION_LABEL_COLOR,
    fontSize: 10,
    marginTop: 4,
  },
});
