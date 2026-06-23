import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ToastAndroid,
  NativeModules,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  usePreviewOutput,
  type CameraRef,
} from 'react-native-vision-camera';

import { CameraBottomBar, type CaptureMode } from '../components/CameraBottomBar';
import { requestGalleryPermission } from '../utils/permissions';
import { useApp } from '../AppContext';
import { resolveCaptureMetadata } from '../services/captureMetadataService';
import { MomentCaptureService } from '../services/MomentCaptureService';
import { PlaceResolverRegistry } from '../services/place-resolver/PlaceResolverRegistry';
import { RuleRegistry } from '../services/rules/RuleRegistry';

const { HokedexML } = NativeModules;

const BG_COLOR = '#090a1c';

export function CameraScreen() {
  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cameraRef = useRef<CameraRef>(null);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput();
  const previewOutput = usePreviewOutput();
  const { db } = useApp();

  const captureService = useRef(new MomentCaptureService(
    db,
    new PlaceResolverRegistry(),
    new RuleRegistry(),
  )).current;

  const [isProcessing, setIsProcessing] = useState(false);

  const handleCapture = useCallback(async () => {
    if (isProcessing) return;

    if (captureMode === 'local') {
      const granted = await requestGalleryPermission();
      if (!granted) {
        ToastAndroid.show('Gallery permission denied', ToastAndroid.SHORT);
        return;
      }
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
      if (result.didCancel || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setLastPhotoUri(uri);
      setIsProcessing(true);
      try {
        const meta = await resolveCaptureMetadata();
        const saveResult = await captureService.capture({
          note: null,
          occurredAt: Date.now(),
          entryIds: [],
          source: 'gallery',
          photoUri: uri,
          latitude: meta.latitude,
          longitude: meta.longitude,
          placeName: meta.placeName,
          weatherTemp: meta.weatherTemp,
          weatherCondition: meta.weatherCondition,
        });
        if (saveResult.ok) {
          ToastAndroid.show('Moment saved', ToastAndroid.SHORT);
        } else {
          ToastAndroid.show('Failed to save moment', ToastAndroid.SHORT);
        }
      } catch (e) {
        console.warn('[CameraScreen] local pick failed:', e);
        ToastAndroid.show('Failed to process photo', ToastAndroid.SHORT);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (captureMode === 'voice') {
      try {
        const meta = await resolveCaptureMetadata();
        const result = await captureService.capture({
          note: null,
          occurredAt: Date.now(),
          entryIds: [],
          newPeople: [],
          source: 'voice',
          type: 'voice',
          latitude: meta.latitude,
          longitude: meta.longitude,
          placeName: meta.placeName,
          weatherTemp: meta.weatherTemp,
          weatherCondition: meta.weatherCondition,
        });
        if (result.ok) {
          ToastAndroid.show('Voice moment saved', ToastAndroid.SHORT);
        } else {
          ToastAndroid.show('Failed to save voice moment', ToastAndroid.SHORT);
        }
      } catch (e) {
        console.warn('[CameraScreen] voice capture failed:', e);
        ToastAndroid.show('Voice capture failed', ToastAndroid.SHORT);
      }
      return;
    }

    setIsProcessing(true);
    try {
      const photoFile = await photoOutput.capturePhotoToFile({}, {});
      if (!photoFile?.filePath) {
        ToastAndroid.show('Capture failed', ToastAndroid.SHORT);
        setIsProcessing(false);
        return;
      }
      const uri = `file://${photoFile.filePath}`;
      setLastPhotoUri(uri);

      const meta = await resolveCaptureMetadata();
      const saveResult = await captureService.capture({
        note: null,
        occurredAt: Date.now(),
        entryIds: [],
        source: 'camera',
        photoUri: uri,
        latitude: meta.latitude,
        longitude: meta.longitude,
        placeName: meta.placeName,
        weatherTemp: meta.weatherTemp,
        weatherCondition: meta.weatherCondition,
      });

      if (saveResult.ok) {
        ToastAndroid.show('Moment saved', ToastAndroid.SHORT);
      } else {
        ToastAndroid.show('Failed to save moment', ToastAndroid.SHORT);
      }
    } catch (e) {
      console.warn('[CameraScreen] capture failed:', e);
      ToastAndroid.show('Capture failed', ToastAndroid.SHORT);
    } finally {
      setIsProcessing(false);
    }
  }, [captureMode, isProcessing, photoOutput, captureService]);

  if (!hasPermission) {
    requestPermission();
    return null;
  }

  if (!device) {
    return null;
  }

  return (
    <View style={styles.root}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        outputs={[previewOutput, photoOutput]}
        isActive={isFocused && captureMode !== 'local'}
      />

      <CameraBottomBar
        onGalleryPress={() => navigation.navigate('CollectionList')}
        onCapturePress={handleCapture}
        onFaceScanPress={() => {}}
        onModeChange={setCaptureMode}
        activeMode={captureMode}
        bottomInset={insets.bottom}
        isProcessing={isProcessing}
        lastPhotoUri={lastPhotoUri}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
});
