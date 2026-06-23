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
import { GalleryBottomSheet } from '../components/GalleryBottomSheet';
import { FacePickerModal } from '../components/FacePickerModal';
import { PersonConfirmModal } from '../components/PersonConfirmModal';
import { useApp } from '../AppContext';
import { resolveCaptureMetadata, type CaptureMetadata } from '../services/captureMetadataService';
import { runDetect, runEmbedAndMatch, type MatchResult } from '../services/cameraCaptureFlow';
import { MomentCaptureService } from '../services/MomentCaptureService';
import { PlaceResolverRegistry } from '../services/place-resolver/PlaceResolverRegistry';
import { RuleRegistry } from '../services/rules/RuleRegistry';
import type { BoundingBox } from '../types/ml';

const { HokedexML } = NativeModules;

const BG_COLOR = '#090a1c';

export function CameraScreen() {
  const [sheetOpen, setSheetOpen] = useState(false);
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

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [savedMomentId, setSavedMomentId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<CaptureMetadata | null>(null);
  const [faces, setFaces] = useState<BoundingBox[]>([]);
  const [facePickerVisible, setFacePickerVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [confirmedEntryIds, setConfirmedEntryIds] = useState<string[]>([]);
  const [newPeople, setNewPeople] = useState<{ name: string }[]>([]);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalMode, setConfirmModalMode] = useState<'confirm_match' | 'create_or_skip'>('confirm_match');
  const [currentMatch, setCurrentMatch] = useState<MatchResult | null>(null);

  const addToConfirmed = useCallback((entryId: string) => {
    setConfirmedEntryIds(prev => [...prev, entryId]);
  }, []);

  const addNewPerson = useCallback((name: string) => {
    setNewPeople(prev => [...prev, { name }]);
  }, []);

  const processNextFace = useCallback(() => {
    const nextIdx = currentFaceIndex + 1;
    if (nextIdx >= faces.length) {
      setFacePickerVisible(false);
    } else {
      setCurrentFaceIndex(nextIdx);
    }
  }, [currentFaceIndex, faces.length]);

  const handleFaceSelected = useCallback(async (crop: BoundingBox) => {
    if (!photoUri) return;
    setFacePickerVisible(false);
    setIsProcessing(true);
    try {
      const match = await runEmbedAndMatch(
        { HokedexML },
        db,
        photoUri,
        crop,
        'people',
      );
      setCurrentMatch(match);
      if (match.stage === 'match') {
        setConfirmModalMode('confirm_match');
        setConfirmModalVisible(true);
      } else {
        setConfirmModalMode('create_or_skip');
        setConfirmModalVisible(true);
      }
    } catch (e) {
      console.warn('[CameraScreen] embed/match failed:', e);
      ToastAndroid.show('Face processing failed', ToastAndroid.SHORT);
      processNextFace();
    } finally {
      setIsProcessing(false);
    }
  }, [photoUri, db, processNextFace]);

  const handleConfirmMatch = useCallback((_entryIdOrName: string) => {
    if (currentMatch?.stage === 'match') {
      addToConfirmed(currentMatch.entryId);
    }
    setConfirmModalVisible(false);
    setCurrentMatch(null);
    processNextFace();
  }, [currentMatch, addToConfirmed, processNextFace]);

  const handleReject = useCallback(() => {
    setConfirmModalVisible(false);
    setConfirmModalMode('create_or_skip');
    setConfirmModalVisible(true);
  }, []);

  const handleCreatePerson = useCallback((name: string) => {
    addNewPerson(name);
    setConfirmModalVisible(false);
    setCurrentMatch(null);
    processNextFace();
  }, [addNewPerson, processNextFace]);

  const handleSkipFace = useCallback(() => {
    setConfirmModalVisible(false);
    setCurrentMatch(null);
    processNextFace();
  }, [processNextFace]);

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
      setPhotoUri(uri);
      setIsProcessing(true);
      try {
        const [meta, detectedFaces] = await Promise.all([
          resolveCaptureMetadata(),
          runDetect({ HokedexML }, uri, 'people'),
        ]);
        setMetadata(meta);
        if (detectedFaces.length === 0) {
          const saveResult = await captureService.capture({
            note: null,
            occurredAt: Date.now(),
            entryIds: [],
            source: 'gallery',
            latitude: meta.latitude,
            longitude: meta.longitude,
            placeName: meta.placeName,
            weatherTemp: meta.weatherTemp,
            weatherCondition: meta.weatherCondition,
          });
          if (saveResult.ok) {
            ToastAndroid.show('Moment saved (no people)', ToastAndroid.SHORT);
          } else {
            ToastAndroid.show('Failed to save moment', ToastAndroid.SHORT);
          }
          setPhotoUri(null);
        } else {
          setFaces(detectedFaces);
          setCurrentFaceIndex(0);
          setConfirmedEntryIds([]);
          setNewPeople([]);
          setFacePickerVisible(true);
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
        return;
      }
      const uri = `file://${photoFile.filePath}`;
      setPhotoUri(uri);
      setLastPhotoUri(uri);

      // Save moment immediately — thumbnail shows, spinner stops
      const meta = await resolveCaptureMetadata();
      setMetadata(meta);
      const saveResult = await captureService.capture({
        note: null,
        occurredAt: Date.now(),
        entryIds: [],
        source: 'camera',
        latitude: meta.latitude,
        longitude: meta.longitude,
        placeName: meta.placeName,
        weatherTemp: meta.weatherTemp,
        weatherCondition: meta.weatherCondition,
      });
      setIsProcessing(false);

      if (!saveResult.ok) {
        ToastAndroid.show('Failed to save moment', ToastAndroid.SHORT);
        setPhotoUri(null);
        return;
      }
      setSavedMomentId(saveResult.value.momentId);

      // Face detection runs in background — doesn't block the shutter
      runDetect({ HokedexML }, uri, 'people').then(detectedFaces => {
        if (detectedFaces.length === 0) {
          setPhotoUri(null);
          return;
        }
        setFaces(detectedFaces);
        setCurrentFaceIndex(0);
        setConfirmedEntryIds([]);
        setNewPeople([]);
        setFacePickerVisible(true);
      }).catch(e => {
        console.warn('[CameraScreen] background face detect failed:', e);
      });
    } catch (e) {
      console.warn('[CameraScreen] capture failed:', e);
      ToastAndroid.show('Capture failed', ToastAndroid.SHORT);
      setIsProcessing(false);
    }
  }, [captureMode, isProcessing, photoOutput, captureService]);

  const handleDonePicking = useCallback(async () => {
    setFacePickerVisible(false);
    const total = confirmedEntryIds.length + newPeople.length;
    if (total > 0 && savedMomentId) {
      setIsProcessing(true);
      try {
        await captureService.addPeopleToMoment(savedMomentId, confirmedEntryIds, newPeople);
      } catch (e) {
        console.warn('[CameraScreen] addPeopleToMoment failed:', e);
      } finally {
        setIsProcessing(false);
      }
    }
    setPhotoUri(null);
    setFaces([]);
    setConfirmedEntryIds([]);
    setNewPeople([]);
    setSavedMomentId(null);
  }, [captureService, confirmedEntryIds, newPeople, savedMomentId]);

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

      <GalleryBottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />

      {facePickerVisible && photoUri && (
        <FacePickerModal
          visible={facePickerVisible}
          imageUri={photoUri}
          crops={faces}
          onSelect={handleFaceSelected}
          onAdd={handleDonePicking}
          onDismiss={() => setFacePickerVisible(false)}
        />
      )}

      <PersonConfirmModal
        visible={confirmModalVisible}
        mode={confirmModalMode}
        name={currentMatch?.stage === 'match' ? currentMatch.name : undefined}
        onConfirm={confirmModalMode === 'create_or_skip' ? handleCreatePerson : handleConfirmMatch}
        onReject={handleReject}
        onSkip={handleSkipFace}
        onDismiss={() => setConfirmModalVisible(false)}
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
