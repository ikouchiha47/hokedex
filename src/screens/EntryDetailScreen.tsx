import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  ActivityIndicator,
  ToastAndroid,
  NativeModules,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../AppContext';
import { getEntry, deleteEntry } from '../db/queries/entries';
import { listPhotosByEntry, getProfilePhoto, setProfilePhoto, unsetAllProfilePhotos, deletePhoto, countPhotosByEntry } from '../db/queries/photos';
import { listTagsByEntry, addEntryTag, removeEntryTag, upsertTag } from '../db/queries/tags';
import { logEncounter, listEncountersByEntry, deleteEncounter, type Encounter } from '../db/queries/encounters';
import { withTransaction } from '../db/tx';
import { ingestImage } from '../services/ingestion';
import { searchByEmbedding } from '../services/search';
import { accentForEntry } from '../theme/accent';
import { PhotoLightboxModal } from './PhotoLightboxModal';
import { requestCameraPermission, requestGalleryPermission } from '../utils/permissions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Photo } from '../db/types';
import { Fonts } from '../theme/fonts';
import RNFS from 'react-native-fs';

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

  const [entry, setEntry] = useState(getEntry(db, entryId));
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [profilePhoto, setProfilePhotoState] = useState<Photo | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [tagInput, setTagInput] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [sampleResult, setSampleResult] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const meetAnim = useRef(new Animated.Value(1)).current;

  const accent = entry ? accentForEntry(profilePhoto?.original_phash ?? 0) : '#7c3aed';

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const alreadyMet = encounters.some(e => e.occurred_at >= todayStart.getTime());

  function triggerMeetAnim() {
    Animated.sequence([
      Animated.timing(meetAnim, { toValue: 1.25, duration: 100, useNativeDriver: true }),
      Animated.timing(meetAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(meetAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }

  const reload = useCallback(() => {
    const e = getEntry(db, entryId);
    setEntry(e);
    const ps = listPhotosByEntry(db, entryId);
    setPhotos(ps);
    setProfilePhotoState(getProfilePhoto(db, entryId));
    setPhotoCount(countPhotosByEntry(db, entryId));
    setTags(listTagsByEntry(db, entryId));
    setEncounters(listEncountersByEntry(db, entryId));
  }, [db, entryId]);

  useEffect(() => { reload(); }, [reload]);

  async function showSourcePicker(onPick: (uri: string) => void) {
    Alert.alert('Add photo', undefined, [
      {
        text: 'Gallery', onPress: async () => {
          const ok = await requestGalleryPermission();
          if (!ok) { Alert.alert('Permission denied'); return; }
          launchImageLibrary({ mediaType: 'photo', quality: 1 }, r => { if (r.assets?.[0]?.uri) onPick(r.assets[0].uri!); });
        },
      },
      {
        text: 'Camera', onPress: async () => {
          const ok = await requestCameraPermission();
          if (!ok) { Alert.alert('Permission denied'); return; }
          launchCamera({ mediaType: 'photo', quality: 1 }, r => { if (r.assets?.[0]?.uri) onPick(r.assets[0].uri!); });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function addPhoto(uri: string) {
    if (ingesting || !entry) return;
    setIngesting(true);
    try {
      const outcome = await ingestImage(db, { HokedexIngest, HokedexML }, {
        imageUri: uri, collectionRoot, entryId, categoryId: category.id,
        entryNameSlug: slugify(entry.name),
      });
      if (outcome.status === 'reference_only') ToastAndroid.show('No face detected — saved as reference photo.', ToastAndroid.SHORT);
      else if (outcome.status === 'low_confidence_warning') ToastAndroid.show('Low confidence face — saved with warning.', ToastAndroid.SHORT);
      else if (outcome.status === 'needs_face_selection') Alert.alert('Multiple faces detected — only the first was used.');
      reload();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setIngesting(false);
    }
  }

  async function runSample(uri: string) {
    if (!entry) return;
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

  function addTag() {
    const t = tagInput.trim();
    if (!t || tags.some(x => x.name === t)) { setTagInput(''); return; }
    withTransaction(db, tx => {
      const tagId = upsertTag(tx, t);
      addEntryTag(tx, entryId, tagId);
    });
    setTagInput('');
    setTags(listTagsByEntry(db, entryId));
  }

  function removeTag(tagId: string) {
    withTransaction(db, tx => removeEntryTag(tx, entryId, tagId));
    setTags(listTagsByEntry(db, entryId));
  }

  function handleSetProfile(photoId: string) {
    withTransaction(db, tx => {
      unsetAllProfilePhotos(tx, entryId);
      setProfilePhoto(tx, photoId);
    });
    reload();
  }

  function handleRemove(photoId: string) {
    withTransaction(db, tx => deletePhoto(tx, photoId));
    reload();
    if (lightboxIndex !== null) setLightboxIndex(null);
  }

  function handleRemoveAndDelete(photoId: string) {
    const photo = photos.find(p => p.id === photoId);
    withTransaction(db, tx => deletePhoto(tx, photoId));
    if (photo) RNFS.unlink(`${collectionRoot}/${photo.local_path}`).catch(() => {});
    reload();
    if (lightboxIndex !== null) setLightboxIndex(null);
  }

  async function confirmDeleteEntry() {
    Alert.alert(`Delete ${entry?.name}?`, 'This will remove all their photos from Hokédex.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Delete original files?', 'Also delete original files from your device? This cannot be undone.', [
            { text: 'Keep files', onPress: () => { withTransaction(db, tx => deleteEntry(tx, entryId)); navigation.goBack(); } },
            {
              text: 'Delete files', style: 'destructive', onPress: () => {
                photos.forEach(p => RNFS.unlink(`${collectionRoot}/${p.local_path}`).catch(() => {}));
                withTransaction(db, tx => deleteEntry(tx, entryId));
                navigation.goBack();
              },
            },
          ]);
        },
      },
    ]);
  }

  if (!entry) return null;

  const profileUri = profilePhoto ? `file://${collectionRoot}/${profilePhoto.local_path}` : null;
  const lastEncounter = encounters[0];
  const entryNumber = `#${entryId.replace(/\D/g, '').slice(-4).padStart(4, '0')}`;

  return (
    <View style={styles.root}>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── HEADER BAND ── */}
        <View style={[styles.headerBand, { backgroundColor: accent, paddingTop: insets.top + 12 }]}>
          {/* shimmer overlay */}
          <View style={styles.shimmer} pointerEvents="none" />

          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Back">
            <MaterialIcons name="arrow-back" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>

          <Text style={styles.cardNumber}>{entryNumber}</Text>
          <Text style={styles.cardName}>{entry.name}</Text>

          {tags.length > 0 && (
            <View style={styles.typeBadges}>
              {tags.map(tag => (
                <Pressable
                  key={tag.id}
                  style={styles.typeBadge}
                  onLongPress={() => removeTag(tag.id)}
                  delayLongPress={400}
                >
                  <Text style={styles.typeBadgeText}>{tag.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
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

        {/* ── STATS PANEL ── */}
        <View style={styles.statsPanel}>

          {/* Stat boxes */}
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

          {/* Date row */}
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

          {/* Notes / flavor text */}
          <TextInput
            style={[styles.flavorText, { borderLeftColor: accent }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note…"
            placeholderTextColor="#3a3a3a"
            multiline
            textAlignVertical="top"
          />

          {/* Sample result */}
          {sampleResult && (
            <View style={styles.sampleResult}>
              <Text style={styles.sampleResultText}>{sampleResult}</Text>
              <Pressable onPress={() => setSampleResult(null)} hitSlop={8}>
                <MaterialIcons name="close" size={16} color="#666" />
              </Pressable>
            </View>
          )}

          {/* Types / tags */}
          <Text style={styles.sectionLabel}>Types</Text>
          <View style={styles.tagsWrap}>
            {tags.map(tag => (
              <Pressable
                key={tag.id}
                style={[styles.tagChip, { borderColor: accent }]}
                onPress={() => setTagInput(tag.name)}
                onLongPress={() => removeTag(tag.id)}
                delayLongPress={400}
              >
                <Text style={[styles.tagChipText, { color: accent }]}>{tag.name}</Text>
              </Pressable>
            ))}
            <View style={styles.tagInputRow}>
              <TextInput
                style={styles.tagInput}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add type…"
                placeholderTextColor="#333"
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
              <Pressable style={styles.tagAddBtn} onPress={addTag}>
                <MaterialIcons name="add" size={18} color="#555" />
              </Pressable>
            </View>
          </View>

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
                        withTransaction(db, tx => deleteEncounter(tx, enc.id));
                        setEncounters(listEncountersByEntry(db, entryId));
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
              onPress={() => !ingesting && showSourcePicker(addPhoto)}
              disabled={ingesting}
            >
              {ingesting
                ? <ActivityIndicator color="#555" size="small" />
                : <MaterialIcons name="add" size={24} color="#333" />}
            </Pressable>
          </ScrollView>

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
                withTransaction(db, tx => logEncounter(tx, entryId, Date.now()));
                setEncounters(listEncountersByEntry(db, entryId));
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { flex: 1 },

  // Header band
  headerBand: {
    paddingHorizontal: 20,
    paddingBottom: 52,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
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

  // Hero photo
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

  // Stats panel
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

  // Flavor / notes
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

  // Section label
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#333',
    fontFamily: Fonts.inter.medium,
  },

  // Tags
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

  // Encounters
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

  // Photo strip
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

  // Fixed action bar
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
