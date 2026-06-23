import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import { Image as ImageIcon, ScanFace } from './icons';
import { Fonts } from '../theme/fonts';

type CaptureMode = 'photo' | 'voice' | 'contact' | 'local';

const MODE_LABELS: { key: CaptureMode; label: string }[] = [
  { key: 'photo', label: 'PHOTO' },
  { key: 'voice', label: 'VOICE' },
  { key: 'contact', label: 'CONTACT' },
  { key: 'local', label: 'LOCAL' },
];

export type { CaptureMode };

interface CameraBottomBarProps {
  onGalleryPress: () => void;
  onCapturePress: () => void;
  onFaceScanPress: () => void;
  onModeChange: (mode: CaptureMode) => void;
  activeMode: CaptureMode;
  bottomInset: number;
  isProcessing: boolean;
  lastPhotoUri?: string | null;
}

function GalleryButton({
  onPress,
  lastPhotoUri,
}: {
  onPress: () => void;
  lastPhotoUri?: string | null;
}) {
  const thumbOpacity = useSharedValue(0);
  const thumbScale = useSharedValue(0.8);
  const iconOpacity = useSharedValue(1);
  const prevUri = useRef<string | null>(null);

  useEffect(() => {
    if (!lastPhotoUri || lastPhotoUri === prevUri.current) return;
    prevUri.current = lastPhotoUri;

    // Snap thumbnail in
    thumbOpacity.value = 1;
    thumbScale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) });
    iconOpacity.value = withTiming(0, { duration: 100 });

    // After 1.5s, fade thumbnail out and restore icon
    thumbOpacity.value = withDelay(
      1500,
      withTiming(0, { duration: 300 }),
    );
    thumbScale.value = withDelay(
      1500,
      withSequence(
        withTiming(1.05, { duration: 150 }),
        withTiming(0.8, { duration: 200 }),
      ),
    );
    iconOpacity.value = withDelay(
      1700,
      withTiming(1, { duration: 200 }),
    );
  }, [lastPhotoUri, thumbOpacity, thumbScale, iconOpacity]);

  const thumbStyle = useAnimatedStyle(() => ({
    opacity: thumbOpacity.value,
    transform: [{ scale: thumbScale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
  }));

  return (
    <Pressable style={styles.sideButton} onPress={onPress}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.thumbContainer, thumbStyle]}>
        {lastPhotoUri && (
          <Animated.Image
            source={{ uri: lastPhotoUri }}
            style={styles.thumb}
          />
        )}
      </Animated.View>
      <Animated.View style={iconStyle}>
        <ImageIcon size={22} color="rgba(255,255,255,0.7)" />
      </Animated.View>
    </Pressable>
  );
}

export function CameraBottomBar({
  onGalleryPress,
  onCapturePress,
  onFaceScanPress,
  onModeChange,
  activeMode,
  bottomInset,
  isProcessing,
  lastPhotoUri,
}: CameraBottomBarProps) {
  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <View style={styles.modeRow}>
        {MODE_LABELS.map(({ key, label }) => (
          <Pressable key={key} onPress={() => onModeChange(key)}>
            <Text
              style={[
                styles.modeLabel,
                Fonts.grotesk.medium,
                key === activeMode && styles.modeLabelActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.actionRow}>
        <GalleryButton onPress={onGalleryPress} lastPhotoUri={lastPhotoUri} />

        <Pressable style={styles.captureButton} onPress={onCapturePress}>
          {isProcessing ? (
            <ActivityIndicator size="small" color="#090a1c" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </Pressable>

        <Pressable style={styles.sideButton} onPress={onFaceScanPress}>
          <ScanFace size={22} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9,10,28,0.85)',
    paddingTop: 12,
    paddingBottom: 12,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 16,
  },
  modeLabelActive: {
    color: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 10,
  },
  sideButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  captureButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 0,
    height: 0,
  },
});
