import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { Image, ScanFace } from './icons';

const MODE_LABELS = ['VIDEO', 'VOICE', 'CONTACT'];

interface CameraBottomBarProps {
  onGalleryPress: () => void;
  onCapturePress: () => void;
  onFaceScanPress: () => void;
  bottomInset: number;
}

export function CameraBottomBar({
  onGalleryPress,
  onCapturePress,
  onFaceScanPress,
  bottomInset,
}: CameraBottomBarProps) {
  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 12) }]}>
      {/* Mode labels */}
      <View style={styles.modeRow}>
        {MODE_LABELS.map((label) => (
          <Text
            key={label}
            style={[
              styles.modeLabel,
              label === 'VIDEO' && styles.modeLabelActive,
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <Pressable style={styles.sideButton} onPress={onGalleryPress}>
          <Image size={22} color="rgba(255,255,255,0.7)" />
        </Pressable>

        <Pressable style={styles.captureButton} onPress={onCapturePress}>
          <View />
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
  },
  captureButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
