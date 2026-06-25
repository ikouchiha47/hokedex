import React, { useCallback, useEffect, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

import { checkPermission, requestPermission } from '../../services/permissions/PermissionRegistry';
import { Fonts } from '../../theme/fonts';
import type { ModeProps } from '../../types/capture';

export interface LocalModeHandle {
  openPicker: () => void;
}

export const LocalMode = React.forwardRef<LocalModeHandle, ModeProps>(
  function LocalMode({ onCapture, onReady, onBlocked }, ref) {
    const openPicker = useCallback(() => {
      launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }).then(result => {
        if (result.didCancel || !result.assets?.[0]?.uri) {
          onReady();
          return;
        }
        onCapture({ type: 'local', uri: result.assets[0].uri });
      });
    }, [onCapture, onReady]);

    useEffect(() => {
      let cancelled = false;
      async function init() {
        const already = await checkPermission('gallery');
        if (cancelled) return;
        if (already) {
          openPicker();
          return;
        }
        const granted = await requestPermission('gallery');
        if (cancelled) return;
        if (granted) {
          openPicker();
        } else {
          onBlocked();
        }
      }
      init();
      return () => { cancelled = true; };
    // openPicker identity is stable (useCallback with stable deps); run on every mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({ openPicker }), [openPicker]);

    return (
      <View style={styles.root}>
        <Text style={styles.hint}>Tap to pick a photo</Text>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    ...Fonts.grotesk.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
  },
});
