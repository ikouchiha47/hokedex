import React, { useEffect } from 'react';
import { View, PanResponder, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { GalleryPivot } from './GalleryPivot';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;
const CLOSED_Y = SHEET_HEIGHT;
const OPEN_Y = 0;

interface GalleryBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GalleryBottomSheet({ isOpen, onClose }: GalleryBottomSheetProps) {
  const translateY = useSharedValue(CLOSED_Y);

  useEffect(() => {
    translateY.value = withSpring(isOpen ? OPEN_Y : CLOSED_Y, {
      damping: 20,
      stiffness: 200,
    });
  }, [isOpen, translateY]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8,
    onPanResponderMove: (_, gs) => {
      if (gs.dy > 0) {
        translateY.value = gs.dy;
      }
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 80) {
        translateY.value = withSpring(CLOSED_Y, { damping: 20 });
        onClose();
      } else {
        translateY.value = withSpring(OPEN_Y, { damping: 20 });
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.sheet, animatedStyle]}
      {...panResponder.panHandlers}
    >
      <View style={styles.dragHandle} />

      <GalleryPivot />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#0e0f23',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dragHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 12,
  },
});
