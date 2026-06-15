import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  NativeModules,
  ToastAndroid,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useApp } from '../AppContext';
import { insertEntry, deleteEntry } from '../db/queries/entries';
import { setProfilePhoto, unsetAllProfilePhotos } from '../db/queries/photos';
import { saveEntryTags } from '../db/queries/tags';
import { ingestImage } from '../services/ingestion';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '../theme/fonts';
import { requestCameraPermission, requestGalleryPermission } from '../utils/permissions';

const { HokedexIngest, HokedexML } = NativeModules;

const PRESET_TAGS = [
  { label: 'Ghost Type',      color: '#735797' }, // ghosts you
  { label: 'Red Flag',        color: '#C22E28' },
  { label: 'Toxic',           color: '#A33EA1' },
  { label: 'Hot Mess',        color: '#EE8130' },
  { label: 'Ice Queen/King',  color: '#96D9D6' },
  { label: 'Main Character',  color: '#F95587' },
  { label: 'Mind Games',      color: '#6F35FC' },
  { label: 'Situationship',   color: '#F7D02C' },
  { label: 'Clingy',          color: '#6390F0' },
  { label: 'Painfully Normal',color: '#A8A77A' },
  { label: 'Too Good',        color: '#D685AD' },
  { label: 'Wild Card',       color: '#7AC74C' },
  { label: 'High Maintenance',color: '#E2BF65' },
  { label: 'Dark Academia',   color: '#705746' },
  { label: 'NPC',             color: '#B7B7CE' },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'entry';
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function NewEntryScreen() {
  const { db, collectionRoot, category } = useApp();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'NewEntry'>>();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(route.params?.prefillImageUri ?? null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [nameError, setNameError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [saving, setSaving] = useState(false);

  function showSourcePicker() {
    Alert.alert('Add photo', undefined, [
      {
        text: 'Gallery', onPress: async () => {
          const ok = await requestGalleryPermission();
          if (!ok) { Alert.alert('Permission denied'); return; }
          launchImageLibrary({ mediaType: 'photo', quality: 1 }, r => { if (r.assets?.[0]?.uri) setPhotoUri(r.assets[0].uri!); });
        },
      },
      {
        text: 'Camera', onPress: async () => {
          const ok = await requestCameraPermission();
          if (!ok) { Alert.alert('Permission denied'); return; }
          launchCamera({ mediaType: 'photo', quality: 1 }, r => { if (r.assets?.[0]?.uri) setPhotoUri(r.assets[0].uri!); });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function toggleTag(label: string) {
    setSelectedTags(prev =>
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    );
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (!t || selectedTags.includes(t)) { setCustomTag(''); return; }
    setSelectedTags(prev => [...prev, t]);
    setCustomTag('');
  }

  async function save() {
    let valid = true;
    if (!name.trim()) { setNameError('Name is required.'); valid = false; }
    else setNameError('');
    if (!photoUri) { setPhotoError('Add at least one photo.'); valid = false; }
    else setPhotoError('');
    if (!valid) return;

    setSaving(true);
    try {
      const entryId = generateId();
      const now = Date.now();
      insertEntry(db, {
        id: entryId,
        category_id: category.id,
        name: name.trim(),
        notes: null,
        is_public: 0,
        created_at: now,
        updated_at: now,
      });

      let outcome;
      try {
        outcome = await ingestImage(db, { HokedexIngest, HokedexML }, {
          imageUri: photoUri!,
          collectionRoot,
          entryId,
          categoryId: category.id,
          entryNameSlug: slugify(name.trim()),
        });
      } catch (ingestErr) {
        try { deleteEntry(db, entryId); } catch (_) {}
        throw ingestErr;
      }

      unsetAllProfilePhotos(db, entryId);
      setProfilePhoto(db, outcome.photoId);
      if (selectedTags.length > 0) saveEntryTags(db, entryId, selectedTags);

      if (outcome.status === 'reference_only') {
        ToastAndroid.show('No face detected — saved as reference photo.', ToastAndroid.SHORT);
      } else if (outcome.status === 'low_confidence_warning') {
        ToastAndroid.show('Low confidence face — saved with warning.', ToastAndroid.SHORT);
      } else if (outcome.status === 'needs_face_selection') {
        ToastAndroid.show('Multiple faces detected — only the first was used.', ToastAndroid.SHORT);
      }

      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Back">
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>New person</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* Photo + Name row */}
        <View style={styles.topRow}>
          <Pressable onPress={showSourcePicker} accessibilityLabel="Add photo">
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoThumb} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlus}>+</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.nameCol}>
            <Text style={styles.nameLabel}>Name</Text>
            <TextInput
              style={[styles.nameInput, nameError ? styles.inputError : null]}
              value={name}
              onChangeText={t => { setName(t); setNameError(''); }}
              placeholder="Enter name"
              placeholderTextColor="#444"
              autoFocus
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
            {photoError ? <Text style={styles.errorText}>{photoError}</Text> : null}
          </View>
        </View>

        {/* Type tags */}
        <Text style={styles.sectionLabel}>Type</Text>
        <View style={styles.tagsWrap}>
          {PRESET_TAGS.map(tag => {
            const active = selectedTags.includes(tag.label);
            return (
              <Pressable
                key={tag.label}
                style={[styles.tagChip, { borderColor: tag.color }, active && { backgroundColor: tag.color + '33' }]}
                onPress={() => toggleTag(tag.label)}
              >
                <Text style={[styles.tagLabel, { color: active ? tag.color : '#555' }]}>{tag.label}</Text>
              </Pressable>
            );
          })}
          {/* selected custom tags */}
          {selectedTags.filter(t => !PRESET_TAGS.find(p => p.label === t)).map(t => (
            <Pressable
              key={t}
              style={[styles.tagChip, { borderColor: '#7c3aed', backgroundColor: '#7c3aed33' }]}
              onPress={() => toggleTag(t)}
            >
              <Text style={[styles.tagLabel, { color: '#a78bfa' }]}>{t} ✕</Text>
            </Pressable>
          ))}
        </View>

        {/* Custom tag input */}
        <View style={styles.customTagRow}>
          <TextInput
            style={styles.customTagInput}
            value={customTag}
            onChangeText={setCustomTag}
            placeholder="Add custom type…"
            placeholderTextColor="#333"
            onSubmitEditing={addCustomTag}
            returnKeyType="done"
          />
          <Pressable style={styles.customTagBtn} onPress={addCustomTag}>
            <Text style={styles.customTagBtnText}>+</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
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
    paddingTop: 12,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 17, ...Fonts.grotesk.semiBold, color: '#fff' },
  body: {
    padding: 20,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  photoThumb: {
    width: 110,
    height: 110,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
  },
  photoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 10,
    backgroundColor: '#111',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlus: { fontSize: 28, color: '#555', ...Fonts.grotesk.medium },
  nameCol: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    paddingTop: 4,
  },
  nameLabel: {
    fontSize: 12,
    fontFamily: Fonts.inter.medium,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  nameInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: Fonts.inter.regular,
    color: '#fff',
  },
  inputError: { borderColor: '#dc2626' },
  errorText: { fontSize: 12, fontFamily: Fonts.inter.regular, color: '#dc2626', alignSelf: 'center' },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontFamily: Fonts.inter.medium,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignSelf: 'stretch',
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagLabel: {
    fontSize: 12,
    fontFamily: Fonts.inter.medium,
  },
  customTagRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 8,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: Fonts.inter.regular,
    color: '#fff',
  },
  customTagBtn: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTagBtnText: { fontSize: 20, color: '#888', lineHeight: 24 },
  saveBtn: {
    marginTop: 8,
    width: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 16, ...Fonts.grotesk.semiBold, color: '#fff' },
});
