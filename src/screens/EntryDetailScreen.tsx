import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  ToastAndroid,
  NativeModules,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../AppContext';
import { ingestImage, commitIngest, embedCrop, type PendingIngest } from '../services/ingestion';
import { FacePickerModal } from '../components/FacePickerModal';
import type { BoundingBox } from '../types/ml';
import { searchByEmbedding } from '../services/search';
import { accentForEntry } from '../theme/accent';
import { EntryDetailController } from '../services/EntryDetailController';
import { EntryTagsController } from '../services/EntryTagsController';
import { ColorPickerSection } from './entry-detail/ColorPickerSection';
import { NotesTimelineSection } from './entry-detail/NotesTimelineSection';
import { InfoSection } from './entry-detail/InfoSection';
import { PhotoLightboxModal } from './PhotoLightboxModal';
import { requestCameraPermission } from '../utils/permissions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Photo, Note } from '../db/types';
import type { EntryDetailState } from '../services/EntryDetailController';
import type { TagRow } from '../services/EntryTagsController';
import { Fonts } from '../theme/fonts';

const { HokedexIngest, HokedexML } = NativeModules;

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EntryDetail'>;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'entry';
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, '0');
  const mon = d.toLocaleString('en', { month: 'short' });
  const year = d.getFullYear();
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = (hours % 12 || 12).toString();
  const tzMatch = d.toLocaleTimeString('en', { timeZoneName: 'short' }).match(/([A-Z]{2,5}[+-]?\d*:\d*|[A-Z]{2,5})$/);
  const tz = tzMatch ? tzMatch[1] : '';
  return `${day} ${mon} ${year}, ${h}:${mins} ${ampm}${tz ? ' ' + tz : ''}`;
}

function formatDateShort(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`;
}

export function EntryDetailScreen() {
  const { db, collectionRoot, category } = useApp();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { entryId } = route.params;
  const insets = useSafeAreaInsets();

  const controller = new EntryDetailController(db, entryId, collectionRoot);
  const tagsController = new EntryTagsController(db, entryId);

  const [state, setState] = useState<EntryDetailState | null>(() => controller.load());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [facePicker, setFacePicker] = useState<{
    pending: PendingIngest;
    imageUri: string;
    crops: BoundingBox[];
  } | null>(null);
  const [faceEmbedding, setFaceEmbedding] = useState(false);
  const [sampleResult, setSampleResult] = useState<string | null>(null);
  const meetAnim = useRef(new Animated.Value(1)).current;

  const reload = useCallback(() => {
    setState(controller.load());
  }, [db, entryId, collectionRoot]);

  useEffect(() => { reload(); }, [reload]);

  if (!state) return null;

  const { entry, photos, profilePhoto, photoCount, tags, encounters, colorTag, entryNotes } = state;

  const accent = accentForEntry(profilePhoto?.original_phash ?? 0, colorTag);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const alreadyMet = encounters.some(e => e.occurred_at >= todayStart.getTime());
  const profileUri = profilePhoto ? `file://${collectionRoot}/${profilePhoto.local_path}` : null;
  const lastEncounter = encounters[0];
  const entryNumber = `#${entryId.replace(/\D/g, '').slice(-4).padStart(4, '0')}`;

  function triggerMeetAnim() {
    Animated.sequence([
      Animated.timing(meetAnim, { toValue: 1.25, duration: 100, useNativeDriver: true }),
      Animated.timing(meetAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(meetAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }

  function showSourcePicker() {
    Alert.alert('Add photo', undefined, [
      {
        text: 'Gallery', onPress: async () => {
          try {
            const result = await NativeModules.HokedexMedia.pickImageFromGallery();
            await addPhoto(result.tempPath, result.contentUri);
          } catch (e: any) {
            if (e?.code !== 'PICKER_CANCELLED') Alert.alert('Error', 'Could not open gallery.');
          }
        },
      },
      {
        text: 'Camera', onPress: async () => {
          const ok = await requestCameraPermission();
          if (!ok) { Alert.alert('Permission denied'); return; }
          try {
            const result = await NativeModules.HokedexMedia.capturePhoto();
            await addPhoto(result.tempPath, result.contentUri);
          } catch (e: any) {
            if (e?.code !== 'CAMERA_CANCELLED') Alert.alert('Error', 'Could not open camera.');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function addPhoto(uri: string, originalPath: string | null = null) {
    if (ingesting) return;
    setIngesting(true);
    try {
      const pending = await ingestImage({ HokedexIngest, HokedexML }, {
        imageUri: uri, originalPath, collectionRoot, entryId, categoryId: category.id,
        entryNameSlug: slugify(entry.name),
      });
      if (pending.detection.type !== 'NO_SUBJECT') {
        const det = pending.detection;
        const crops: BoundingBox[] = det.type === 'MULTI_SUBJECT'
          ? (det as any).crops
          : [(det as any).crop];
        setFacePicker({ pending, imageUri: uri, crops });
        return;
      }
      await commitIngest(db, entryId, pending, collectionRoot);
      ToastAndroid.show('No face detected — saved as reference photo.', ToastAndroid.SHORT);
      reload();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setIngesting(false);
    }
  }

  async function runSample(uri: string) {
    try {
      const detection = await HokedexML.detect(uri, category.id);
      if (detection.type === 'NO_SUBJECT') { setSampleResult('No face detected'); return; }
      const emb: number[] = await HokedexML.embed(uri, category.id);
      const result = await searchByEmbedding(db, emb, category);
      if (result.tier === 'likely' && result.match.entryId === entryId) {
        setSampleResult(`Match — ${Math.round(result.match.similarity * 100)}%`);
      } else if (result.tier === 'possible' && result.candidates.some(c => c.entryId === entryId)) {
        const c = result.candidates.find(x => x.entryId === entryId)!;
        setSampleResult(`Possible match — ${Math.round(c.similarity * 100)}%`);
      } else {
        setSampleResult('No match');
      }
    } catch {
      setSampleResult('Error running sample');
    }
  }

  function handleSetProfile(photoId: string) {
    controller.setProfilePhoto(photoId);
    reload();
  }

  function handleRemove(photoId: string) {
    controller.removePhoto(photoId);
    reload();
    if (lightboxIndex !== null) setLightboxIndex(null);
  }

  function handleRemoveAndDelete(photoId: string) {
    const photo = photos.find(p => p.id === photoId);
    if (photo) controller.removeAndDeletePhoto(photoId, photo.local_path);
    else controller.removePhoto(photoId);
    reload();
    if (lightboxIndex !== null) setLightboxIndex(null);
  }

  async function confirmDeleteEntry() {
    Alert.alert(`Delete ${entry.name}?`, 'This will remove all their photos from Hokédex.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Delete original files?', 'Also delete original files from your device? This cannot be undone.', [
            {
              text: 'Keep files', onPress: () => {
                controller.deleteEntry(true, []);
                navigation.goBack();
              },
            },
            {
              text: 'Delete files', style: 'destructive', onPress: () => {
                controller.deleteEntry(false, photos.map(p => p.local_path));
                navigation.goBack();
              },
            },
          ]);
        },
      },
    ]);
  }

  async function handleFaceSelect(crop: BoundingBox) {
    if (!facePicker) return;
    setFaceEmbedding(true);
    try {
      const vector = await embedCrop({ HokedexML }, {
        imageUri: facePicker.imageUri,
        selectedCrop: crop,
        categoryId: category.id,
      });
      await commitIngest(db, entryId, facePicker.pending, collectionRoot, vector);
    } catch (e) {
      console.error('[EntryDetail] face embed failed:', e);
    } finally {
      setFaceEmbedding(false);
      setFacePicker(null);
      reload();
    }
  }

  async function handleFaceAdd() {
    if (!facePicker) return;
    try {
      await commitIngest(db, entryId, facePicker.pending, collectionRoot);
    } catch (e) {
      console.error('[EntryDetail] commit failed:', e);
    } finally {
      setFacePicker(null);
      reload();
    }
  }

  function handleFaceDismiss() {
    setFacePicker(null);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'android' ? 'height' : 'padding'}>
      {facePicker && (
        <FacePickerModal
          visible
          imageUri={facePicker.imageUri}
          crops={facePicker.crops}
          onSelect={handleFaceSelect}
          onAdd={handleFaceAdd}
          onDismiss={handleFaceDismiss}
          loading={faceEmbedding}
        />
      )}
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── HEADER BAND ── */}
        <View style={[styles.headerBand, { backgroundColor: accent, paddingTop: insets.top + 12 }]}>
          <View style={styles.shimmer} pointerEvents="none" />
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Back">
            <MaterialIcons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <Text style={styles.cardNumber}>{entryNumber}</Text>
          <Text style={styles.cardName}>{entry.name}</Text>
        </View>

        {/* ── PHOTO HERO ── */}
        <View style={styles.heroWrap}>
          <View style={[styles.heroGlow, { backgroundColor: accent + '55' }]} />
          {profileUri ? (
            <Image source={{ uri: profileUri }} style={[styles.heroPhoto, { borderColor: accent }]} />
          ) : (
            <View style={[styles.heroPhoto, styles.heroPlaceholder, { borderColor: accent }]}>
              <Text style={[styles.heroInitial, { color: accent }]}>
                {(entry.name.trim()[0] ?? '?').toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* ── COLOR PICKER ── */}
        <ColorPickerSection
          currentColor={colorTag}
          onColorChange={hex => {
            controller.setColor(hex);
            reload();
          }}
        />

        {/* ── STATS PANEL ── */}
        <View style={styles.statsPanel}>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: accent }]}>{encounters.length}</Text>
              <Text style={styles.statLabel}>Encounters</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: accent }]}>{photoCount}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <View>
              <Text style={styles.dateLabel}>First met</Text>
              <Text style={styles.dateValue}>{formatDateShort(entry.created_at)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.dateLabel}>Last seen</Text>
              <Text style={styles.dateValue}>
                {lastEncounter ? formatDateShort(lastEncounter.occurred_at) : '—'}
              </Text>
            </View>
          </View>

          {sampleResult && (
            <View style={styles.sampleResult}>
              <Text style={styles.sampleResultText}>{sampleResult}</Text>
              <Pressable onPress={() => setSampleResult(null)} hitSlop={8}>
                <MaterialIcons name="close" size={16} color="#666" />
              </Pressable>
            </View>
          )}

          <InfoSection
            controller={tagsController}
            tags={tags as TagRow[]}
            onTagsChange={reload}
          />

          {/* Encounters */}
          <Text style={styles.sectionLabel}>Recent encounters</Text>
          {encounters.length === 0 ? (
            <Text style={styles.encounterEmpty}>No encounters logged yet.</Text>
          ) : (
            <View style={styles.encounterList}>
              {encounters.slice(0, 5).map(enc => (
                <View key={enc.id} style={styles.encounterRow}>
                  <View style={[styles.encounterDot, { backgroundColor: accent }]} />
                  <Text style={styles.encounterDate}>{formatDate(enc.occurred_at)}</Text>
                  <Pressable
                    onPress={() => {
                      try {
                        controller.deleteEncounter(enc.id);
                        reload();
                      } catch (e) {
                        console.error('[EntryDetail] deleteEncounter failed:', e);
                      }
                    }}
                    hitSlop={8}
                  >
                    <MaterialIcons name="close" size={14} color="#2a2a2a" />
                  </Pressable>
                </View>
              ))}
              {encounters.length > 5 && (
                <Text style={styles.encounterMore}>+{encounters.length - 5} more</Text>
              )}
            </View>
          )}

          {/* Photo strip */}
          <Text style={styles.sectionLabel}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
            {photos.map((photo, index) => (
              <Pressable
                key={photo.id}
                style={styles.stripThumb}
                onPress={() => setLightboxIndex(index)}
                onLongPress={() => {
                  Alert.alert('Photo', undefined, [
                    { text: 'Set as profile photo', onPress: () => handleSetProfile(photo.id) },
                    { text: 'Remove from Hokédex', onPress: () => handleRemove(photo.id) },
                    {
                      text: 'Remove and delete file', style: 'destructive', onPress: () => {
                        Alert.alert('Delete file', 'This cannot be undone.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => handleRemoveAndDelete(photo.id) },
                        ]);
                      },
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
                delayLongPress={400}
              >
                <Image source={{ uri: `file://${collectionRoot}/${photo.local_path}` }} style={styles.stripThumbImg} />
              </Pressable>
            ))}
            <Pressable
              style={styles.stripAddBtn}
              onPress={() => !ingesting && showSourcePicker()}
              disabled={ingesting}
            >
              {ingesting
                ? <ActivityIndicator color="#555" size="small" />
                : <MaterialIcons name="add" size={24} color="#333" />}
            </Pressable>
          </ScrollView>

          {/* ── NOTES TIMELINE ── */}
          <NotesTimelineSection
            entryId={entryId}
            notes={entryNotes}
            onAddNote={(body, location) => {
              controller.addNote(body, location);
              reload();
            }}
            onDeleteNote={noteId => {
              controller.deleteNote(noteId);
              reload();
            }}
          />

        </View>
      </ScrollView>

      {/* ── FIXED ACTION BAR ── */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
        <Animated.View style={[{ flex: 1 }, { transform: [{ scale: meetAnim }] }]}>
          <Pressable
            style={[styles.meetBtn, alreadyMet ? styles.meetBtnDone : { backgroundColor: accent }]}
            disabled={alreadyMet}
            onPress={() => {
              try {
                triggerMeetAnim();
                controller.logEncounter();
                reload();
              } catch (e) {
                console.error('[EntryDetail] logEncounter failed:', e);
                Alert.alert('Error', 'Failed to log encounter.');
              }
            }}
          >
            <MaterialIcons name={alreadyMet ? 'check' : 'bolt'} size={18} color={alreadyMet ? '#444' : '#fff'} />
            <Text style={[styles.meetBtnText, { color: alreadyMet ? '#444' : '#fff' }]}>
              {alreadyMet ? 'Met today' : 'Met them'}
            </Text>
          </Pressable>
        </Animated.View>

        <Pressable style={styles.deleteBtn} onPress={confirmDeleteEntry}>
          <MaterialIcons name="delete-outline" size={20} color="#dc2626" />
        </Pressable>
      </View>

      {lightboxIndex !== null && (
        <PhotoLightboxModal
          photos={photos.map(p => ({ id: p.id, localPath: p.local_path }))}
          initialIndex={lightboxIndex}
          collectionRoot={collectionRoot}
          onClose={() => setLightboxIndex(null)}
          onSetProfile={handleSetProfile}
          onRemove={handleRemove}
          onRemoveAndDelete={handleRemoveAndDelete}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { flex: 1 },

  headerBand: {
    paddingHorizontal: 20,
    paddingBottom: 52,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFill,
    opacity: 0.06,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardNumber: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 4,
    fontFamily: Fonts.inter.medium,
  },
  cardName: {
    fontSize: 30,
    ...Fonts.grotesk.bold,
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  typeBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#fff',
    textTransform: 'uppercase',
    fontFamily: Fonts.inter.medium,
  },

  heroWrap: {
    alignItems: 'center',
    marginTop: -64,
    marginBottom: 8,
    zIndex: 2,
  },
  heroGlow: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    opacity: 0.15,
  },
  heroPhoto: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    backgroundColor: '#1a1a1a',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitial: {
    fontSize: 44,
    ...Fonts.grotesk.bold,
  },

  statsPanel: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 14,
  },
  statRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    ...Fonts.grotesk.bold,
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#444',
    textTransform: 'uppercase',
    marginTop: 2,
    fontFamily: Fonts.inter.medium,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#3a3a3a',
    fontFamily: Fonts.inter.medium,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 12,
    color: '#666',
    fontFamily: Fonts.inter.regular,
  },

  flavorText: {
    backgroundColor: '#111',
    borderLeftWidth: 3,
    borderRadius: 4,
    padding: 12,
    fontSize: 13,
    fontStyle: 'italic',
    color: '#777',
    fontFamily: Fonts.inter.regular,
    minHeight: 48,
    lineHeight: 20,
  },

  sampleResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  sampleResultText: { flex: 1, fontSize: 14, fontFamily: Fonts.inter.medium, color: '#fff' },

  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#333',
    fontFamily: Fonts.inter.medium,
  },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tagChip: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagChipText: { fontSize: 11, fontFamily: Fonts.inter.medium },
  tagInputRow: { flexDirection: 'row', gap: 6 },
  tagInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 12,
    fontFamily: Fonts.inter.regular,
    color: '#fff',
    minWidth: 100,
  },
  tagAddBtn: {
    width: 32,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  encounterEmpty: { fontSize: 12, color: '#2a2a2a', fontFamily: Fonts.inter.regular },
  encounterList: { gap: 4 },
  encounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: '#111',
    borderRadius: 6,
  },
  encounterDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
  encounterDate: { flex: 1, fontSize: 11, color: '#555', fontFamily: Fonts.inter.regular },
  encounterMore: { fontSize: 11, color: '#2a2a2a', fontFamily: Fonts.inter.regular },

  photoStrip: { marginHorizontal: -4 },
  stripThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginHorizontal: 4,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  stripThumbImg: { width: '100%', height: '100%' },
  stripAddBtn: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginHorizontal: 4,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#161616',
  },
  meetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 13,
  },
  meetBtnDone: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  meetBtnText: {
    fontSize: 15,
    ...Fonts.grotesk.semiBold,
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1a0a0a',
    borderWidth: 1,
    borderColor: '#2a1010',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
