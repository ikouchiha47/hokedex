import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  ToastAndroid,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Fonts } from '../theme/fonts';
import { clearSharedImage } from '../services/share';
import { useApp } from '../AppContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { ModelDownloadService, isModelUnavailableError } from '../services/ModelDownloadService';
import { MomentCaptureService } from '../services/MomentCaptureService';
import { PlaceResolverRegistry } from '../services/place-resolver/PlaceResolverRegistry';
import { RuleRegistry } from '../services/rules/RuleRegistry';
import { resolveCaptureMetadata } from '../services/captureMetadataService';
import { NativeModules } from 'react-native';

const { HokedexML } = NativeModules;

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteT = RouteProp<RootStackParamList, 'ShareIntake'>;

type Phase =
  | { phase: 'checking' }
  | { phase: 'model_unavailable' }
  | { phase: 'detecting' }
  | { phase: 'ready' }
  | { phase: 'saving' };

const downloadService = new ModelDownloadService();

export function ShareIntakeScreen() {
  const { db, category } = useApp();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const insets = useSafeAreaInsets();
  const imageUri = route.params.imageUri;

  const [state, setState] = useState<Phase>({ phase: 'checking' });

  const captureService = new MomentCaptureService(db, new PlaceResolverRegistry(), new RuleRegistry());

  const previewUri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;

  const checkAndDetect = useCallback(async () => {
    setState({ phase: 'checking' });
    const ready = await downloadService.checkReady();
    if (!ready) {
      setState({ phase: 'model_unavailable' });
      return;
    }
    setState({ phase: 'detecting' });
    try {
      await HokedexML.detect(imageUri, category.id);
    } catch (e) {
      if (isModelUnavailableError(e)) {
        setState({ phase: 'model_unavailable' });
        return;
      }
      // Detection errors don't block the UI — we still show the actions
    }
    setState({ phase: 'ready' });
  }, [imageUri, category.id]);

  // Re-check every time screen comes into focus (e.g. back from Settings after download)
  useFocusEffect(
    useCallback(() => {
      checkAndDetect();
    }, [checkAndDetect]),
  );

  async function handleSaveAsMoment() {
    setState({ phase: 'saving' });
    try {
      const meta = await resolveCaptureMetadata();
      await captureService.capture({
        note: null,
        occurredAt: Date.now(),
        entryIds: [],
        newPeople: [],
        source: 'gallery',
        type: 'photo',
        photoUri: imageUri,
        latitude: meta.latitude,
        longitude: meta.longitude,
        placeName: meta.placeName,
        weatherTemp: meta.weatherTemp,
        weatherCondition: meta.weatherCondition,
      });
      await clearSharedImage();
      ToastAndroid.show('Saved as moment', ToastAndroid.SHORT);
      navigation.navigate('Tabs', { screen: 'Moments' } as any);
    } catch (e) {
      console.warn('[ShareIntake] save failed:', e);
      ToastAndroid.show('Save failed', ToastAndroid.SHORT);
      setState({ phase: 'ready' });
    }
  }

  function handleAddContact() {
    navigation.replace('SearchResult', { preloadedImageUri: imageUri });
  }

  function handleDownload() {
    navigation.navigate('Settings', {});
  }

  async function handleDiscard() {
    await clearSharedImage();
    navigation.goBack();
  }

  const isBusy =
    state.phase === 'checking' ||
    state.phase === 'detecting' ||
    state.phase === 'saving';

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={handleDiscard} style={styles.backBtn}>
          <MaterialIcons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Photo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />

        {isBusy && (
          <View style={styles.centreCard}>
            <ActivityIndicator color="#7c3aed" size="large" />
            <Text style={styles.statusText}>
              {state.phase === 'saving' ? 'Saving…' : 'Checking…'}
            </Text>
          </View>
        )}

        {state.phase === 'model_unavailable' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="cloud-download" size={28} color="#7c3aed" />
              <Text style={styles.cardTitle}>Face model not downloaded</Text>
            </View>
            <Text style={styles.cardBody}>
              Download the face detection model to identify and tag people. You can save this photo as a moment now and annotate later.
            </Text>
            <View style={styles.actions}>
              <Pressable style={styles.btnPrimary} onPress={handleSaveAsMoment}>
                <MaterialIcons name="bookmark-add" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>Save as moment</Text>
              </Pressable>
              <Pressable style={styles.btnSecondary} onPress={handleDownload}>
                <MaterialIcons name="download" size={16} color="#aaa" />
                <Text style={styles.btnSecondaryText}>Download model → Settings</Text>
              </Pressable>
              <Pressable style={styles.btnGhost} onPress={handleDiscard}>
                <Text style={styles.btnGhostText}>Discard</Text>
              </Pressable>
            </View>
          </View>
        )}

        {state.phase === 'ready' && (
          <View style={styles.card}>
            <View style={styles.actions}>
              <Pressable style={styles.btnPrimary} onPress={handleSaveAsMoment}>
                <MaterialIcons name="bookmark-add" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>Save as moment</Text>
              </Pressable>
              <Pressable style={styles.btnSecondary} onPress={handleAddContact}>
                <MaterialIcons name="person-search" size={16} color="#aaa" />
                <Text style={styles.btnSecondaryText}>Add contact</Text>
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
});
