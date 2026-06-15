import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
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

  const accent = entry ? accentForEntry(profilePhoto?.original_phash ?? 0) : '#7c3aed';

  const reload = useCallback(() => {
    const e = getEntry(db, entryId);
    setEntry(e);
    const ps = listPhotosByEntry(db, entryId);
    setPhotos(ps);
    setProfilePhotoState(getProfilePhoto(db, entryId));
    setPhotoCount(countPhotosByEntry(db, entryId));
    setTags(listTagsByEntry(db, entryId));
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
    const tagId = upsertTag(db, t);
    addEntryTag(db, entryId, tagId);
    setTagInput('');
    setTags(listTagsByEntry(db, entryId));
  }

  function removeTag(tagId: string) {
    removeEntryTag(db, entryId, tagId);
    setTags(listTagsByEntry(db, entryId));
  }

  function handleSetProfile(photoId: string) {
    unsetAllProfilePhotos(db, entryId);
    setProfilePhoto(db, photoId);
    reload();
  }

  function handleRemove(photoId: string) {
    deletePhoto(db, photoId);
    reload();
    if (lightboxIndex !== null) setLightboxIndex(null);
  }

  function handleRemoveAndDelete(photoId: string) {
    const photo = photos.find(p => p.id === photoId);
    deletePhoto(db, photoId);
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
            { text: 'Keep files', onPress: () => { deleteEntry(db, entryId); navigation.goBack(); } },
            {
              text: 'Delete files', style: 'destructive', onPress: () => {
                photos.forEach(p => RNFS.unlink(`${collectionRoot}/${p.local_path}`).catch(() => {}));
                deleteEntry(db, entryId);
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
  const avatarSize = 56;

  return (
    <View style={styles.root}>
      {/* Header strip */}
      <View style={[styles.headerStrip, { backgroundColor: accent + '22', paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityLabel="Back">
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerContent}>
          <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, borderColor: accent }]}>
            {profileUri ? (
              <Image source={{ uri: profileUri }} style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }} />
            ) : (
              <View style={[styles.avatarPlaceholder, { borderRadius: avatarSize / 2 }]} />
            )}
          </View>
          <Text style={styles.entryName} numberOfLines={1}>{entry.name}</Text>
        </View>
        <Pressable onPress={confirmDeleteEntry} style={styles.iconBtn} accessibilityLabel="Delete entry">
          <MaterialIcons name="delete-outline" size={22} color="#888" />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Stats */}
        <Text style={styles.stats}>
          {photoCount} photo{photoCount !== 1 ? 's' : ''} · {formatDate(entry.created_at)}
        </Text>

        {/* Tags */}
        <View style={styles.tagsSection}>
          <View style={styles.tagsWrap}>
            {tags.map(tag => (
              <Pressable
                key={tag.id}
                style={[styles.tagChip, { borderColor: accent }]}
                onPress={() => setTagInput(tag.name)}
                onLongPress={() => removeTag(tag.id)}
                delayLongPress={400}
              >
                <Text style={[styles.tagLabel, { color: accent }]}>{tag.name}</Text>
              </Pressable>
            ))}
          </View>
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
              <MaterialIcons name="add" size={20} color="#888" />
            </Pressable>
          </View>
        </View>

        {/* Notes */}
        <TextInput
          style={styles.notes}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes…"
          placeholderTextColor="#333"
          multiline
        />

        {/* Sample result */}
        {sampleResult && (
          <View style={styles.sampleResult}>
            <Text style={styles.sampleResultText}>{sampleResult}</Text>
            <Pressable onPress={() => setSampleResult(null)}>
              <MaterialIcons name="close" size={16} color="#666" />
            </Pressable>
          </View>
        )}

        {/* Action bar */}
        <View style={styles.actionBar}>
          <Pressable style={styles.actionBtn} onPress={() => showSourcePicker(runSample)}>
            <Text style={styles.actionBtnText}>Sample</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, ingesting && styles.actionBtnDisabled]} onPress={() => !ingesting && showSourcePicker(addPhoto)} disabled={ingesting}>
            {ingesting ? <ActivityIndicator color="#fff" size="small" /> : <MaterialIcons name="add-a-photo" size={18} color="#ccc" />}
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => photos.length > 0 && setLightboxIndex(0)}>
            <Text style={styles.actionBtnText}>All photos</Text>
          </Pressable>
        </View>

        {/* Photo grid */}
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <Pressable
              key={photo.id}
              style={styles.photoCell}
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
              <Image source={{ uri: `file://${collectionRoot}/${photo.local_path}` }} style={styles.photoThumb} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

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

const THUMB_SIZE = '33.33%';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  headerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { borderWidth: 2, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  avatarPlaceholder: { flex: 1, backgroundColor: '#222' },
  entryName: { flex: 1, fontSize: 20, ...Fonts.grotesk.bold, color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  stats: { fontSize: 12, fontFamily: Fonts.inter.regular, color: '#555' },
  tagsSection: { gap: 8 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagLabel: { fontSize: 12, fontFamily: Fonts.inter.medium },
  tagInputRow: { flexDirection: 'row', gap: 8 },
  tagInput: {
    flex: 1,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: Fonts.inter.regular,
    color: '#fff',
  },
  tagAddBtn: {
    width: 36,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notes: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: Fonts.inter.regular,
    color: '#ccc',
    minHeight: 60,
    textAlignVertical: 'top',
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
  actionBar: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { fontSize: 14, ...Fonts.grotesk.medium, color: '#ccc' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  photoCell: { width: THUMB_SIZE, aspectRatio: 1 },
  photoThumb: { width: '100%', height: '100%', backgroundColor: '#111' },
});
