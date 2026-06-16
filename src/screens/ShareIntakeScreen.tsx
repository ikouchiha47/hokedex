/**
 * ShareIntakeScreen — handles the shared image flow after the Android Share Sheet launches the app.
 *
 * Receives the shared image path via navigation route params ({ imageUri }).
 * On mount: immediately runs face detection on the shared image.
 *
 * R-6.4: SUCCESS      → navigate to SearchResult with the image pre-loaded
 * R-6.5: NO_SUBJECT   → show retry (crop) or save as reference options
 * R-6.6: MULTI_SUBJECT → show face picker grid, then proceed to search with selected crop
 * R-6.7: LOW_CONFIDENCE → show accuracy warning, offer proceed or discard
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Alert,
  NativeModules,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ImageCropPicker from 'react-native-image-crop-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Fonts } from '../theme/fonts';
import { clearSharedImage } from '../services/share';
import { useApp } from '../AppContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { BoundingBox, DetectionResult } from '../types/ml';

const { HokedexML } = NativeModules;

const { width: SCREEN_W } = Dimensions.get('screen');
// 3-column grid: total padding 32 (16×2) + 2 gaps of 8 = 48 taken; remaining divided by 3
const FACE_CELL_SIZE = Math.floor((SCREEN_W - 48) / 3);

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteT = RouteProp<RootStackParamList, 'ShareIntake'>;

type IntakePhase =
  | { phase: 'detecting' }
  | { phase: 'no_subject' }
  | { phase: 'multi_subject'; crops: BoundingBox[] }
  | { phase: 'low_confidence'; confidence: number }
  | { phase: 'navigating' }
  | { phase: 'error'; message: string };

export function ShareIntakeScreen() {
  const { category } = useApp();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const insets = useSafeAreaInsets();

  const [state, setState] = useState<IntakePhase>({ phase: 'detecting' });
  const [activeUri, setActiveUri] = useState(route.params.imageUri);

  const runDetection = useCallback(async (uri: string) => {
    setState({ phase: 'detecting' });
    try {
      const detection: DetectionResult = await HokedexML.detect(uri, category.id);

      if (detection.type === 'NO_SUBJECT') {
        setState({ phase: 'no_subject' });
        return;
      }

      if (detection.type === 'MULTI_SUBJECT') {
        setState({ phase: 'multi_subject', crops: detection.crops });
        return;
      }

      if (detection.type === 'LOW_CONFIDENCE') {
        setState({ phase: 'low_confidence', confidence: detection.confidence });
        return;
      }

      // SUCCESS
      await doNavigateToSearch(uri);
    } catch (e) {
      setState({ phase: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.id]);

  useEffect(() => {
    runDetection(activeUri);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doNavigateToSearch(uri: string) {
    setState({ phase: 'navigating' });
    await clearSharedImage();
    navigation.replace('SearchResult', { preloadedImageUri: uri });
  }

  async function handleRetryWithCrop() {
    try {
      const cropped = await ImageCropPicker.openCropper({
        path: activeUri,
        mediaType: 'photo',
        freeStyleCropEnabled: true,
        cropperToolbarColor: '#1a1a1a',
        cropperStatusBarLight: false,
        cropperActiveWidgetColor: '#7c3aed',
        cropperToolbarWidgetColor: '#ffffff',
      });
      setActiveUri(cropped.path);
      runDetection(cropped.path);
    } catch (e: any) {
      if (e?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', String(e?.message ?? e));
      }
    }
  }

  async function handleSaveAsReference() {
    await clearSharedImage();
    navigation.replace('NewEntry', { prefillImageUri: activeUri });
  }

  // crop param is available for future use (e.g., pre-seeding the crop rect).
  // For now we open a free-style cropper so the user can confirm the face region.
  async function handleSelectCrop(_crop: BoundingBox) {
    try {
      const cropped = await ImageCropPicker.openCropper({
        path: activeUri,
        mediaType: 'photo',
        freeStyleCropEnabled: true,
        cropperToolbarColor: '#1a1a1a',
        cropperStatusBarLight: false,
        cropperActiveWidgetColor: '#7c3aed',
        cropperToolbarWidgetColor: '#ffffff',
      });
      setActiveUri(cropped.path);
      runDetection(cropped.path);
    } catch (e: any) {
      if (e?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', String(e?.message ?? e));
      }
    }
  }

  async function handleProceedDespiteLowConfidence() {
    await doNavigateToSearch(activeUri);
  }

  async function handleDiscard() {
    await clearSharedImage();
    navigation.replace('CollectionList');
  }

  const previewUri = activeUri.startsWith('file://') ? activeUri : `file://${activeUri}`;

  return (
    <View style={[styles.root]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={handleDiscard} style={styles.backBtn} accessibilityLabel="Dismiss">
          <MaterialIcons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Shared photo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Shared image preview */}
        <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />

        {/* DETECTING */}
        {state.phase === 'detecting' && (
          <View style={styles.centreCard}>
            <ActivityIndicator color="#7c3aed" size="large" />
            <Text style={styles.statusText}>Detecting faces…</Text>
          </View>
        )}

        {/* NAVIGATING (brief flash) */}
        {state.phase === 'navigating' && (
          <View style={styles.centreCard}>
            <ActivityIndicator color="#7c3aed" size="large" />
            <Text style={styles.statusText}>Opening results…</Text>
          </View>
        )}

        {/* NO_SUBJECT */}
        {state.phase === 'no_subject' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="face-retouching-off" size={28} color="#888" />
              <Text style={styles.cardTitle}>No face detected</Text>
            </View>
            <Text style={styles.cardBody}>
              The photo doesn't contain a recognisable face. Crop to a face and retry, or save it as a reference photo without search.
            </Text>
            <View style={styles.actions}>
              <Pressable style={styles.btnPrimary} onPress={handleRetryWithCrop}>
                <MaterialIcons name="crop" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>Crop &amp; retry</Text>
              </Pressable>
              <Pressable style={styles.btnSecondary} onPress={handleSaveAsReference}>
                <Text style={styles.btnSecondaryText}>Save as reference photo</Text>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={handleDiscard}>
                <Text style={styles.btnGhostText}>Discard</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* MULTI_SUBJECT */}
        {state.phase === 'multi_subject' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="group" size={28} color="#7c3aed" />
              <Text style={styles.cardTitle}>Multiple faces</Text>
            </View>
            <Text style={styles.cardBody}>Tap the face you want to search for.</Text>
            <View style={styles.cropGrid}>
              {state.crops.map((crop, i) => (
                <Pressable
                  key={i}
                  style={styles.cropCell}
                  onPress={() => handleSelectCrop(crop)}
                  accessibilityLabel={`Face ${i + 1}`}
                >
                  {/* Show full image — user can identify face by position */}
                  <Image source={{ uri: previewUri }} style={styles.cropThumb} resizeMode="cover" />
                  <View style={styles.cropOverlay}>
                    <Text style={styles.cropLabel}>Face {i + 1}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            <Pressable style={[styles.btnGhost, { marginTop: 4 }]} onPress={handleDiscard}>
              <Text style={styles.btnGhostText}>Discard</Text>
            </Pressable>
          </View>
        )}

        {/* LOW_CONFIDENCE */}
        {state.phase === 'low_confidence' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="warning-amber" size={28} color="#eab308" />
              <Text style={styles.cardTitle}>Low accuracy</Text>
            </View>
            <Text style={styles.cardBody}>
              A face was detected with low confidence ({Math.round(state.confidence * 100)}%). Search results may be unreliable.
            </Text>
            <View style={styles.actions}>
              <Pressable style={styles.btnPrimary} onPress={handleProceedDespiteLowConfidence}>
                <Text style={styles.btnPrimaryText}>Proceed anyway</Text>
              </Pressable>
              <Pressable style={styles.btnSecondary} onPress={handleRetryWithCrop}>
                <MaterialIcons name="crop" size={16} color="#aaa" />
                <Text style={styles.btnSecondaryText}>Crop &amp; retry</Text>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={handleDiscard}>
                <Text style={styles.btnGhostText}>Discard</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ERROR */}
        {state.phase === 'error' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="error-outline" size={28} color="#dc2626" />
              <Text style={[styles.cardTitle, { color: '#dc2626' }]}>Detection failed</Text>
            </View>
            <Text style={styles.cardBody}>{state.message}</Text>
            <View style={styles.actions}>
              <Pressable style={styles.btnPrimary} onPress={() => runDetection(activeUri)}>
                <Text style={styles.btnPrimaryText}>Retry</Text>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={handleDiscard}>
                <Text style={styles.btnGhostText}>Discard</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 17, ...Fonts.grotesk.semiBold, color: '#fff' },
  body: { padding: 16, gap: 16, paddingBottom: 40 },
  preview: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    backgroundColor: '#111',
  },
  centreCard: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 32,
  },
  statusText: { fontSize: 15, fontFamily: Fonts.inter.regular, color: '#888' },
  card: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 20,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: { fontSize: 17, ...Fonts.grotesk.semiBold, color: '#fff' },
  cardBody: { fontSize: 14, fontFamily: Fonts.inter.regular, color: '#888', lineHeight: 20 },
  actions: { gap: 10 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 13,
  },
  btnPrimaryText: { fontSize: 15, ...Fonts.grotesk.semiBold, color: '#fff' },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
  },
  btnSecondaryText: { fontSize: 14, fontFamily: Fonts.inter.medium, color: '#aaa' },
  btnGhost: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  btnGhostText: { fontSize: 13, fontFamily: Fonts.inter.regular, color: '#444' },
  cropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cropCell: {
    width: FACE_CELL_SIZE,
    height: FACE_CELL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  cropThumb: {
    width: FACE_CELL_SIZE,
    height: FACE_CELL_SIZE,
  },
  cropOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  cropLabel: { fontSize: 10, fontFamily: Fonts.inter.medium, color: '#ccc' },
});
