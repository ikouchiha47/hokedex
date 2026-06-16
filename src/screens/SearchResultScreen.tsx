import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  NativeModules,
  ToastAndroid,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ImageCropPicker from 'react-native-image-crop-picker';
import { useApp } from '../AppContext';
import { getEntry, listEntriesByCategory } from '../db/queries/entries';
import { getProfilePhoto, setProfilePhoto, unsetAllProfilePhotos } from '../db/queries/photos';
import { logEncounter } from '../db/queries/encounters';
import { withTransaction } from '../db/tx';
import { searchByEmbedding, type SearchResult } from '../services/search';
import { searchEmbeddingsByVector } from '../db/queries/embeddings';
import { ingestImage } from '../services/ingestion';
import { requestCameraPermission, requestGalleryPermission } from '../utils/permissions';
import type { RootStackParamList } from '../navigation/RootNavigator';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '../theme/fonts';

const { HokedexML, HokedexIngest } = NativeModules;

type Nav = NativeStackNavigationProp<RootStackParamList>;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'entry';
}

export function SearchResultScreen() {
  const { db, collectionRoot, category } = useApp();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [searching, setSearching] = useState(false);
  const [attaching, setAttaching] = useState<string | null>(null); // entryId being attached
  const [searchedUri, setSearchedUri] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [rawScores, setRawScores] = useState<Array<{ entryId: string; score: number }>>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [showEntryPicker, setShowEntryPicker] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  // encounter confirmation: entryId pending confirmation, with toggle state
  const [pendingEncounter, setPendingEncounter] = useState<{ entryId: string; logIt: boolean } | null>(null);

  const nameResults = nameQuery.trim().length > 0
    ? listEntriesByCategory(db, category.id).filter(e =>
        e.name.toLowerCase().includes(nameQuery.toLowerCase())
      )
    : [];

  async function pickAndSearch(source: 'gallery' | 'camera') {
    const ok = source === 'gallery' ? await requestGalleryPermission() : await requestCameraPermission();
    if (!ok) { Alert.alert('Permission denied'); return; }
    try {
      const original = source === 'gallery'
        ? await ImageCropPicker.openPicker({ mediaType: 'photo', cropping: false })
        : await ImageCropPicker.openCamera({ mediaType: 'photo', cropping: false });

      const cropped = await ImageCropPicker.openCropper({
        path: original.path,
        mediaType: 'photo',
        freeStyleCropEnabled: true,
        includeBase64: false,
      });

      const fullFrame =
        cropped.cropRect != null &&
        Math.abs(cropped.cropRect.x) < 4 &&
        Math.abs(cropped.cropRect.y) < 4 &&
        Math.abs(cropped.cropRect.width - original.width) < 4 &&
        Math.abs(cropped.cropRect.height - original.height) < 4;

      runSearch(fullFrame ? original.path : cropped.path);
    } catch (e: any) {
      if (e?.code !== 'E_PICKER_CANCELLED') Alert.alert('Error', String(e?.message ?? e));
    }
  }

  function showSourcePicker() {
    Alert.alert('Search by photo', undefined, [
      { text: 'Gallery', onPress: () => pickAndSearch('gallery') },
      { text: 'Camera', onPress: () => pickAndSearch('camera') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function runSearch(uri: string) {
    setSearching(true);
    setResult(null);
    setSearchedUri(uri);
    try {
      const detection = await HokedexML.detect(uri, category.id);
      if (detection.type === 'NO_SUBJECT') {
        Alert.alert('No face detected', 'Try a clearer photo with a visible face.');
        return;
      }
      const embedding: number[] = await HokedexML.embed(uri, category.id);
      const buf = new ArrayBuffer(embedding.length * 4);
      new Float32Array(buf).set(embedding);
      const rows = await searchEmbeddingsByVector(db, buf, category.id);
      setRawScores(rows.map(row => ({ entryId: row.entry_id, score: row.best_score })));
      const r = await searchByEmbedding(db, embedding, category);
      setResult(r);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }

  async function attachPhoto(entryId: string, withEncounter = false) {
    if (!searchedUri || attaching) return;
    const entry = getEntry(db, entryId);
    if (!entry) return;
    setAttaching(entryId);
    try {
      const outcome = await ingestImage(db, { HokedexIngest, HokedexML }, {
        imageUri: searchedUri,
        collectionRoot,
        entryId,
        categoryId: category.id,
        entryNameSlug: slugify(entry.name),
      });
      const existing = getProfilePhoto(db, entryId);
      try {
        withTransaction(db, tx => {
          if (!existing) {
            unsetAllProfilePhotos(tx, entryId);
            setProfilePhoto(tx, outcome.photoId);
          }
          if (withEncounter) logEncounter(tx, entryId, Date.now());
        });
      } catch (postErr) {
        console.error('[Search] post-attach writes failed:', postErr);
      }
      if (outcome.status === 'reference_only') {
        ToastAndroid.show('No face — saved as reference photo.', ToastAndroid.SHORT);
      } else {
        ToastAndroid.show(`Photo attached to ${entry.name}.`, ToastAndroid.SHORT);
      }
      navigation.navigate('EntryDetail', { entryId });
    } catch (e) {
      console.error('[Search] attachPhoto failed:', e);
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setAttaching(null);
      setPendingEncounter(null);
    }
  }

  function profileUri(entryId: string): string | null {
    const p = getProfilePhoto(db, entryId);
    return p ? `file://${collectionRoot}/${p.local_path}` : null;
  }

  function entryName(entryId: string): string {
    return getEntry(db, entryId)?.name ?? '(unknown)';
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Back">
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Search</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.pickBtn} onPress={showSourcePicker} disabled={searching}>
          {searching ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.pickBtnText}>Pick photo to search</Text>
          )}
        </Pressable>

        {/* Name search */}
        <View style={styles.nameSearchRow}>
          <MaterialIcons name="person-search" size={18} color="#444" />
          <TextInput
            style={styles.nameSearchInput}
            value={nameQuery}
            onChangeText={setNameQuery}
            placeholder="Search by name…"
            placeholderTextColor="#333"
            returnKeyType="search"
          />
          {nameQuery.length > 0 && (
            <Pressable onPress={() => setNameQuery('')}>
              <MaterialIcons name="close" size={16} color="#444" />
            </Pressable>
          )}
        </View>

        {nameResults.map(e => {
          const uri = profileUri(e.id);
          return (
            <Pressable
              key={e.id}
              style={styles.possibleCard}
              onPress={() => navigation.navigate('EntryDetail', { entryId: e.id })}
            >
              {uri
                ? <Image source={{ uri }} style={styles.possibleAvatar} />
                : <View style={[styles.possibleAvatar, styles.avatarPlaceholder]} />}
              <Text style={styles.possibleName}>{e.name}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#444" />
            </Pressable>
          );
        })}

        {searchedUri && (
          <View style={styles.searchedPhotoRow}>
            <Image source={{ uri: searchedUri.startsWith('file://') ? searchedUri : `file://${searchedUri}` }} style={styles.searchedThumb} />
            <View style={styles.searchedMeta}>
              <Text style={styles.searchedLabel}>Searching for</Text>
              <Pressable style={styles.changeBtn} onPress={showSourcePicker}>
                <Text style={styles.changeBtnText}>Change photo</Text>
              </Pressable>
            </View>
          </View>
        )}

        {rawScores.length > 0 && (
          <Pressable style={styles.debugToggle} onPress={() => setShowDebug(v => !v)}>
            <Text style={styles.debugToggleText}>
              {showDebug ? 'Hide' : 'Show'} raw scores ({rawScores.length} entries)
            </Text>
          </Pressable>
        )}
        {showDebug && rawScores.map(s => (
          <View key={s.entryId} style={styles.debugRow}>
            <Text style={styles.debugName} numberOfLines={1}>{entryName(s.entryId)}</Text>
            <Text style={[
              styles.debugScore,
              s.score >= 0.55 ? styles.debugScoreGreen : s.score >= 0.35 ? styles.debugScoreYellow : styles.debugScoreRed,
            ]}>
              {(s.score * 100).toFixed(1)}%
            </Text>
          </View>
        ))}

        {result && result.tier === 'no_match' && (
          <View style={styles.noMatch}>
            <Text style={styles.noMatchText}>No one recognised</Text>
            <View style={styles.noMatchActions}>
              <Pressable style={styles.createBtn} onPress={() => navigation.navigate('NewEntry', { prefillImageUri: searchedUri ?? undefined })}>
                <Text style={styles.createBtnText}>Create new</Text>
              </Pressable>
              <Pressable style={styles.createBtn} onPress={() => setShowEntryPicker(true)}>
                <Text style={styles.createBtnText}>Add to existing</Text>
              </Pressable>
            </View>
          </View>
        )}

        {showEntryPicker && searchedUri && !pendingEncounter && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Pick entry to attach to</Text>
            {listEntriesByCategory(db, category.id).map(e => {
              const uri = profileUri(e.id);
              return (
                <Pressable
                  key={e.id}
                  style={styles.possibleCard}
                  onPress={() => {
                    setShowEntryPicker(false);
                    setPendingEncounter({ entryId: e.id, logIt: false });
                  }}
                >
                  {uri
                    ? <Image source={{ uri }} style={styles.possibleAvatar} />
                    : <View style={[styles.possibleAvatar, styles.avatarPlaceholder]} />}
                  <Text style={styles.possibleName}>{e.name}</Text>
                  <MaterialIcons name="chevron-right" size={20} color="#444" />
                </Pressable>
              );
            })}
            <Pressable onPress={() => setShowEntryPicker(false)}>
              <Text style={[styles.sectionLabel, { color: '#444', marginTop: 4 }]}>Cancel</Text>
            </Pressable>
          </View>
        )}

        {pendingEncounter && !attaching && (
          <View style={styles.encounterConfirm}>
            <Text style={styles.encounterConfirmLabel}>
              Also log an encounter with {entryName(pendingEncounter.entryId)}?
            </Text>
            <Pressable
              style={styles.encounterToggleRow}
              onPress={() => setPendingEncounter(p => p ? { ...p, logIt: !p.logIt } : p)}
            >
              <View style={[styles.toggle, pendingEncounter.logIt && styles.toggleOn]}>
                <View style={[styles.toggleThumb, pendingEncounter.logIt && styles.toggleThumbOn]} />
              </View>
              <Text style={styles.encounterToggleText}>
                {pendingEncounter.logIt ? 'Yes, log encounter' : 'No, just attach photo'}
              </Text>
            </Pressable>
            <View style={styles.encounterConfirmBtns}>
              <Pressable
                style={styles.confirmCancelBtn}
                onPress={() => setPendingEncounter(null)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.confirmGoBtn}
                onPress={() => attachPhoto(pendingEncounter.entryId, pendingEncounter.logIt)}
              >
                <Text style={styles.confirmGoText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        )}

        {result && result.tier === 'likely' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Likely match</Text>
            <Pressable
              style={styles.likelyCard}
              onPress={() => navigation.navigate('EntryDetail', { entryId: result.match.entryId })}
            >
              {profileUri(result.match.entryId) ? (
                <Image source={{ uri: profileUri(result.match.entryId)! }} style={styles.likelyAvatar} />
              ) : (
                <View style={[styles.likelyAvatar, styles.avatarPlaceholder]} />
              )}
              <View style={styles.likelyInfo}>
                <Text style={styles.likelyName}>{entryName(result.match.entryId)}</Text>
                <Text style={styles.likelihoodPct}>{Math.round(result.match.similarity * 100)}% match</Text>
              </View>
              {searchedUri && (
                <Pressable
                  style={styles.attachBtn}
                  onPress={() => attachPhoto(result.match.entryId)}
                  disabled={!!attaching}
                >
                  {attaching === result.match.entryId ? (
                    <ActivityIndicator size="small" color="#7c3aed" />
                  ) : (
                    <Text style={styles.attachBtnText}>Attach this photo</Text>
                  )}
                </Pressable>
              )}
            </Pressable>

            {result.alternatives.length > 0 && (
              <View style={[styles.section, { marginTop: 8 }]}>
                <Text style={styles.sectionLabel}>Also possible</Text>
                {result.alternatives.map(alt => (
                  <Pressable
                    key={alt.entryId}
                    style={styles.possibleCard}
                    onPress={() => navigation.navigate('EntryDetail', { entryId: alt.entryId })}
                  >
                    {profileUri(alt.entryId) ? (
                      <Image source={{ uri: profileUri(alt.entryId)! }} style={styles.possibleAvatar} />
                    ) : (
                      <View style={[styles.possibleAvatar, styles.avatarPlaceholder]} />
                    )}
                    <Text style={styles.possibleName}>{entryName(alt.entryId)}</Text>
                    <Text style={styles.possiblePct}>{Math.round(alt.similarity * 100)}%</Text>
                    {searchedUri && (
                      <Pressable
                        style={styles.attachBtnSmall}
                        onPress={() => attachPhoto(alt.entryId)}
                        disabled={!!attaching}
                      >
                        {attaching === alt.entryId ? (
                          <ActivityIndicator size="small" color="#7c3aed" />
                        ) : (
                          <MaterialIcons name="add-a-photo" size={18} color="#7c3aed" />
                        )}
                      </Pressable>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {result && result.tier === 'possible' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Possible matches</Text>
            {result.candidates.map(c => (
              <Pressable
                key={c.entryId}
                style={styles.possibleCard}
                onPress={() => navigation.navigate('EntryDetail', { entryId: c.entryId })}
              >
                {profileUri(c.entryId) ? (
                  <Image source={{ uri: profileUri(c.entryId)! }} style={styles.possibleAvatar} />
                ) : (
                  <View style={[styles.possibleAvatar, styles.avatarPlaceholder]} />
                )}
                <Text style={styles.possibleName}>{entryName(c.entryId)}</Text>
                <Text style={styles.possiblePct}>{Math.round(c.similarity * 100)}%</Text>
                {searchedUri && (
                  <Pressable
                    style={styles.attachBtnSmall}
                    onPress={() => attachPhoto(c.entryId)}
                    disabled={!!attaching}
                  >
                    {attaching === c.entryId ? (
                      <ActivityIndicator size="small" color="#7c3aed" />
                    ) : (
                      <MaterialIcons name="add-a-photo" size={18} color="#7c3aed" />
                    )}
                  </Pressable>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const AVATAR_LARGE = 80;
const AVATAR_SMALL = 44;

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
  body: { padding: 16, gap: 20 },
  pickBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pickBtnText: { fontSize: 16, ...Fonts.grotesk.semiBold, color: '#fff' },
  noMatch: { alignItems: 'center', gap: 16, paddingVertical: 24 },
  noMatchText: { fontSize: 18, ...Fonts.grotesk.medium, color: '#666' },
  noMatchActions: { flexDirection: 'row', gap: 10 },
  createBtn: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createBtnText: { fontSize: 14, ...Fonts.grotesk.medium, color: '#ccc' },
  searchedPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 10,
  },
  searchedThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  searchedMeta: { flex: 1, gap: 8 },
  searchedLabel: { fontSize: 12, fontFamily: Fonts.inter.regular, color: '#555' },
  changeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  changeBtnText: { fontSize: 12, fontFamily: Fonts.inter.medium, color: '#aaa' },
  nameSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  nameSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.inter.regular,
    color: '#fff',
    padding: 0,
  },
  debugToggle: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  debugToggleText: { fontSize: 12, fontFamily: Fonts.inter.medium, color: '#666' },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  debugName: { flex: 1, fontSize: 12, fontFamily: Fonts.inter.regular, color: '#777' },
  debugScore: { fontSize: 13, fontFamily: Fonts.inter.medium },
  debugScoreGreen: { color: '#22c55e' },
  debugScoreYellow: { color: '#eab308' },
  debugScoreRed: { color: '#ef4444' },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: Fonts.inter.medium,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  likelyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 16,
    gap: 16,
  },
  likelyAvatar: { width: AVATAR_LARGE, height: AVATAR_LARGE, borderRadius: AVATAR_LARGE / 2, backgroundColor: '#222' },
  avatarPlaceholder: { backgroundColor: '#222' },
  likelyInfo: { flex: 1, gap: 4 },
  likelyName: { fontSize: 18, ...Fonts.grotesk.semiBold, color: '#fff' },
  likelihoodPct: { fontSize: 14, fontFamily: Fonts.inter.regular, color: '#7c3aed' },
  attachBtn: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#7c3aed',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 44,
    alignItems: 'center',
  },
  attachBtnText: { fontSize: 11, fontFamily: Fonts.inter.medium, color: '#7c3aed' },
  attachBtnSmall: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  possibleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  possibleAvatar: { width: AVATAR_SMALL, height: AVATAR_SMALL, borderRadius: AVATAR_SMALL / 2 },
  possibleName: { flex: 1, fontSize: 15, ...Fonts.grotesk.medium, color: '#ddd' },
  possiblePct: { fontSize: 13, fontFamily: Fonts.inter.regular, color: '#666' },
  encounterConfirm: {
    backgroundColor: '#0f0f14',
    borderWidth: 1,
    borderColor: '#1e1e2a',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  encounterConfirmLabel: {
    fontSize: 14,
    fontFamily: Fonts.inter.medium,
    color: '#aaa',
  },
  encounterToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#222',
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: '#7c3aed' },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#555',
  },
  toggleThumbOn: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
  encounterToggleText: {
    fontSize: 13,
    fontFamily: Fonts.inter.regular,
    color: '#666',
  },
  encounterConfirmBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmCancelText: { fontSize: 14, fontFamily: Fonts.inter.medium, color: '#555' },
  confirmGoBtn: {
    flex: 1,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmGoText: { fontSize: 14, fontFamily: Fonts.inter.medium, color: '#fff' },
});
