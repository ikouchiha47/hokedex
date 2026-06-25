import React, { useRef, useState, useCallback, useImperativeHandle } from 'react';
import { StyleSheet, ToastAndroid } from 'react-native';
import {
  Camera,
  useCameraDevice,
  usePhotoOutput,
  usePreviewOutput,
  type CameraRef,
} from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';

import { useFeaturePermissions } from '../../services/permissions/useFeaturePermissions';
import type { ModeProps } from '../../types/capture';

export interface PhotoModeHandle {
  capture: () => void;
}

type Props = ModeProps & {
  locationSource: 'gps' | 'network';
  onLocationResolved: (source: 'gps' | 'network') => void;
};

export const PhotoMode = React.forwardRef<PhotoModeHandle, Props>(
  function PhotoMode({ onCapture, onReady, onBlocked, onLocationResolved }, ref) {
    const [isProcessing, setIsProcessing] = useState(false);
    const cameraRef = useRef<CameraRef>(null);
    const isFocused = useIsFocused();
    const device = useCameraDevice('back');

    const photoOutput = usePhotoOutput();
    const previewOutput = usePreviewOutput();

    useFeaturePermissions(
      ['camera', 'location'],
      {
        onSuccess: {
          camera: () => onReady(),
          location: () => onLocationResolved('gps'),
        },
        onFailure: {
          camera: () => onBlocked(),
          location: () => onLocationResolved('network'),
        },
      },
      'photo-mode',
    );

    const capture = useCallback(async () => {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        const photoFile = await photoOutput.capturePhotoToFile({}, {});
        if (!photoFile?.filePath) {
          ToastAndroid.show('Capture failed', ToastAndroid.SHORT);
          return;
        }
        const uri = `file://${photoFile.filePath}`;
        onCapture({ type: 'photo', uri });
      } catch (e) {
        console.warn('[PhotoMode] capture failed:', e);
        ToastAndroid.show('Capture failed', ToastAndroid.SHORT);
      } finally {
        setIsProcessing(false);
      }
    }, [isProcessing, photoOutput, onCapture]);

    useImperativeHandle(ref, () => ({ capture }), [capture]);

    if (!device) return null;

    return (
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        outputs={[previewOutput, photoOutput]}
        isActive={isFocused}
      />
    );
  },
);
