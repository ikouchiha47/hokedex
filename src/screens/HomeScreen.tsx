import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ToastAndroid } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type { ModeKey, CaptureResult } from '../types/capture';

import { ModeBar } from '../components/ModeBar';
import { PhotoMode, type PhotoModeHandle } from '../components/modes/PhotoMode';
import { VoiceMode, type VoiceModeHandle } from '../components/modes/VoiceMode';
import { LocalMode, type LocalModeHandle } from '../components/modes/LocalMode';
import { ContactMode, type ContactModeHandle } from '../components/modes/ContactMode';

import { useApp } from '../AppContext';
import { resolveCaptureMetadata } from '../services/captureMetadataService';
import { MomentCaptureService } from '../services/MomentCaptureService';
import { PlaceResolverRegistry } from '../services/place-resolver/PlaceResolverRegistry';
import { RuleRegistry } from '../services/rules/RuleRegistry';

const NOOP = () => {};
const BG_COLOR = '#090a1c';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const [activeMode, setActiveMode] = useState<ModeKey>('photo');
  const [ready, setReady] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<'gps' | 'network'>('network');

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const { db } = useApp();
  const captureService = useRef(
    new MomentCaptureService(db, new PlaceResolverRegistry(), new RuleRegistry()),
  ).current;

  const photoRef = useRef<PhotoModeHandle>(null);
  const voiceRef = useRef<VoiceModeHandle>(null);
  const localRef = useRef<LocalModeHandle>(null);
  const contactRef = useRef<ContactModeHandle>(null);

  const handleModeChange = useCallback((mode: ModeKey) => {
    setReady(false);
    setActiveMode(mode);
  }, []);

  const handleReady = useCallback(() => setReady(true), []);
  const handleBlocked = useCallback(() => setReady(false), []);

  const handleCapture = useCallback(
    async (result: CaptureResult) => {
      if (result.type === 'photo') {
        setLastPhotoUri(result.uri);
        try {
          const meta = await resolveCaptureMetadata();
          await captureService.capture({
            note: null,
            occurredAt: Date.now(),
            entryIds: [],
            newPeople: [],
            source: 'camera',
            type: 'photo',
            photoUri: result.uri,
            latitude: meta.latitude,
            longitude: meta.longitude,
            placeName: meta.placeName,
            weatherTemp: meta.weatherTemp,
            weatherCondition: meta.weatherCondition,
          });
        } catch (e) {
          console.warn('[HomeScreen] photo save failed:', e);
          ToastAndroid.show('Save failed', ToastAndroid.SHORT);
        }
        navigation.navigate('Tabs', { screen: 'Moments' } as any);
      } else if (result.type === 'local') {
        setLastPhotoUri(result.uri);
        navigation.navigate('ShareIntake', { imageUri: result.uri });
      } else if (result.type === 'voice') {
        try {
          const meta = await resolveCaptureMetadata();
          await captureService.capture({
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
          ToastAndroid.show('Voice moment saved', ToastAndroid.SHORT);
        } catch (e) {
          console.warn('[HomeScreen] voice save failed:', e);
          ToastAndroid.show('Voice capture failed', ToastAndroid.SHORT);
        }
      } else if (result.type === 'contact') {
        navigation.navigate('NewEntry', {});
      }
    },
    [captureService, navigation],
  );

  const modeProps = { onCapture: handleCapture, onReady: handleReady, onBlocked: handleBlocked };

  const captureHandlers = {
    photo: {
      onCapturePressIn: NOOP,
      onCapturePressOut: () => photoRef.current?.capture(),
      onCaptureStop: NOOP,
    },
    voice: {
      onCapturePressIn: () => voiceRef.current?.onPressIn(),
      onCapturePressOut: () => voiceRef.current?.onPressOut(),
      onCaptureStop: () => voiceRef.current?.onStop(),
    },
    local: {
      onCapturePressIn: NOOP,
      onCapturePressOut: () => localRef.current?.openPicker(),
      onCaptureStop: NOOP,
    },
    contact: {
      onCapturePressIn: NOOP,
      onCapturePressOut: () => contactRef.current?.trigger(),
      onCaptureStop: NOOP,
    },
  };

  const handlers = captureHandlers[activeMode];

  return (
    <View style={styles.root}>
      {activeMode === 'photo' && (
        <PhotoMode
          ref={photoRef}
          {...modeProps}
          locationSource={locationSource}
          onLocationResolved={setLocationSource}
        />
      )}

      {activeMode === 'voice' && (
        <VoiceMode
          ref={voiceRef}
          {...modeProps}
          onRecordingStateChange={setVoiceRecording}
        />
      )}

      {activeMode === 'local' && (
        <LocalMode ref={localRef} {...modeProps} />
      )}

      {activeMode === 'contact' && (
        <ContactMode ref={contactRef} {...modeProps} />
      )}

      <ModeBar
        activeMode={activeMode}
        onModeChange={handleModeChange}
        ready={ready}
        onCapturePressIn={handlers.onCapturePressIn}
        onCapturePressOut={handlers.onCapturePressOut}
        onCaptureStop={handlers.onCaptureStop}
        showStop={voiceRecording}
        bottomInset={insets.bottom}
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
