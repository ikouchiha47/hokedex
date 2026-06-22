import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraBottomBar } from '../components/CameraBottomBar';
import { GalleryBottomSheet } from '../components/GalleryBottomSheet';

const BG_COLOR = '#090a1c';

export function CameraScreen() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={styles.viewfinder}>
        <Text style={styles.viewfinderLabel}>Viewfinder — Phase 3</Text>
      </View>

      <CameraBottomBar
        onGalleryPress={() => setSheetOpen(true)}
        onCapturePress={() => {}}
        onFaceScanPress={() => {}}
        bottomInset={insets.bottom}
      />

      <GalleryBottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  viewfinder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG_COLOR,
  },
  viewfinderLabel: {
    color: 'rgba(255,255,255,0.15)',
    fontSize: 12,
  },
});
