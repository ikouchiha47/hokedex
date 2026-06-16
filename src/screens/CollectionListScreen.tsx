import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  Image,
  Alert,
  useWindowDimensions,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { listEntriesByCategory, deleteEntry } from '../db/queries/entries';
import { withTransaction } from '../db/tx';
import { getProfilePhoto } from '../db/queries/photos';
import { listEncountersInRange, getEncounterStats, type EncounterWithName, type EncounterStats } from '../db/queries/encounters';
import { ActivityCalendar, colorFromId } from '../components/ActivityCalendar';
import type { Entry } from '../db/types';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Fonts } from '../theme/fonts';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ACCENT = '#7c3aed';
const MIN_TILE_WIDTH = 72;
const GRID_PADDING = 16;
const CELL_PADDING = 6;

type EntryWithPhoto = Entry & { profilePhotoPath: string | null };

// ── Roast engine ──────────────────────────────────────────────────────────────

function getRoast(stats: EncounterStats, entries: EntryWithPhoto[]): string {
  const now = Date.now();
  const daysSinceLast = stats.last_at
    ? Math.floor((now - stats.last_at) / 86400000)
    : null;

  if (entries.length === 0) return "Nothing here yet. Scared?";

  if (daysSinceLast === null || daysSinceLast > 365)
    return "Over a year. Maybe go outside?";

  if (daysSinceLast > 30)
    return `${daysSinceLast} days since the last one. You okay?`;

  if (stats.total > 10 && stats.unique_people === 1)
    return "Recurring. Bold choice. Bold.";

  if (stats.unique_people > 5 && stats.total > 10)
    return "Busy. Very busy. No judgment.";

  if (daysSinceLast <= 1)
    return "Yesterday? Someone has a schedule.";

  if (stats.unique_people >= entries.length && entries.length > 2)
    return "Diverse portfolio. Respect.";

  return `${stats.total} logged. You're keeping receipts.`;
}

// ─────────────────────────────────────────────────────────────────────────────

export function CollectionListScreen() {
  const { db, collectionRoot, category } = useApp();
  const navigation = useNavigation<Nav>();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const numColumns = Math.max(1, Math.floor((screenWidth - GRID_PADDING * 2) / MIN_TILE_WIDTH));
  const cellWidth = (screenWidth - GRID_PADDING * 2) / numColumns;
  const circleDiameter = cellWidth - CELL_PADDING * 2;

  const [entries, setEntries] = useState<EntryWithPhoto[]>([]);
  const [encounters, setEncounters] = useState<EncounterWithName[]>([]);
  const [stats, setStats] = useState<EncounterStats>({ total: 0, unique_people: 0, last_at: null, first_at: null });
  const [showAll, setShowAll] = useState(false);

  const loadAll = useCallback(() => {
    const rows = listEntriesByCategory(db, category.id);
    const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    const withPhotos: EntryWithPhoto[] = sorted.map(e => {
      const photo = getProfilePhoto(db, e.id);
      return { ...e, profilePhotoPath: photo ? `${collectionRoot}/${photo.local_path}` : null };
    });
    setEntries(withPhotos);

    // 1 year of encounter data for the calendar
    const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    setEncounters(listEncountersInRange(db, yearAgo, Date.now() + 86400000));
    setStats(getEncounterStats(db));
  }, [db, collectionRoot, category.id]);

  useEffect(() => {
    loadAll();
    const unsubscribe = navigation.addListener('focus', loadAll);
    return unsubscribe;
  }, [loadAll, navigation]);

  function purgeAll() {
    Alert.alert(
      'Purge everything?',
      'Deletes all entries from Hokédex. Original files on your device are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge', style: 'destructive', onPress: () => {
            withTransaction(db, tx => {
              entries.forEach(e => deleteEntry(tx, e.id));
            });
            loadAll();
          },
        },
      ],
    );
  }

  const PREVIEW_COUNT = numColumns * 2 - 1; // rows × columns minus the Add tile
  const previewEntries = entries.slice(0, PREVIEW_COUNT);
  const hasMore = entries.length > PREVIEW_COUNT;

  const roast = getRoast(stats, entries);

  // ── Full grid mode (See More) ────────────────────────────────────────────

  if (showAll) {
    type GridItem = { type: 'add' } | { type: 'entry'; data: EntryWithPhoto };
    const items: GridItem[] = [
      { type: 'add' },
      ...entries.map(e => ({ type: 'entry' as const, data: e })),
    ];

    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => setShowAll(false)} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#aaa" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.wordmark}>hok<Text style={styles.accent}>é</Text>dex</Text>
            <Text style={styles.subtitle}>{entries.length} {entries.length === 1 ? 'person' : 'people'} indexed</Text>
          </View>
          <Pressable onPress={purgeAll} style={styles.iconBtn}>
            <MaterialIcons name="delete-sweep" size={22} color="#444" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('SearchResult')} style={styles.iconBtn}>
            <MaterialIcons name="search" size={24} color="#aaa" />
          </Pressable>
        </View>
        <FlatList
          key={numColumns}
          data={items}
          keyExtractor={item => item.type === 'add' ? '__add__' : item.data.id}
          numColumns={numColumns}
          contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.type === 'add') {
              return (
                <Pressable style={[styles.cell, { width: cellWidth }]} onPress={() => navigation.navigate('NewEntry', {})}>
                  <View style={[styles.circle, { width: circleDiameter, height: circleDiameter, borderRadius: circleDiameter / 2 }, styles.addCircle]}>
                    <Text style={styles.addPlus}>+</Text>
                  </View>
                  <Text style={[styles.label, { maxWidth: cellWidth }]} numberOfLines={1}>Add</Text>
                </Pressable>
              );
            }
            const { data } = item;
            return (
              <Pressable style={[styles.cell, { width: cellWidth }]} onPress={() => navigation.navigate('EntryDetail', { entryId: data.id })}>
                <View style={[styles.circle, { width: circleDiameter, height: circleDiameter, borderRadius: circleDiameter / 2 }, styles.personCircle]}>
                  {data.profilePhotoPath
                    ? <Image source={{ uri: `file://${data.profilePhotoPath}` }} style={{ width: circleDiameter, height: circleDiameter, borderRadius: circleDiameter / 2 }} />
                    : <View style={[styles.placeholderCircle, { width: circleDiameter, height: circleDiameter, borderRadius: circleDiameter / 2 }]} />}
                </View>
                <Text style={[styles.label, { maxWidth: cellWidth }]} numberOfLines={1}>{data.name}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    );
  }

  // ── Home view ────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.wordmark}>hok<Text style={styles.accent}>é</Text>dex</Text>
            <Text style={styles.subtitle}>{entries.length} {entries.length === 1 ? 'person' : 'people'} indexed</Text>
          </View>
          <Pressable onPress={purgeAll} style={styles.iconBtn}>
            <MaterialIcons name="delete-sweep" size={22} color="#333" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('SearchResult')} style={styles.iconBtn}>
            <MaterialIcons name="search" size={24} color="#aaa" />
          </Pressable>
        </View>

        {/* ── People strip ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>People</Text>
          <View style={styles.peopleRow}>
            {/* Add tile */}
            <Pressable style={styles.peopleCell} onPress={() => navigation.navigate('NewEntry', {})}>
              <View style={[styles.peopleCircle, styles.addCircle, { width: 56, height: 56, borderRadius: 28 }]}>
                <Text style={styles.addPlus}>+</Text>
              </View>
              <Text style={styles.peopleLabel} numberOfLines={1}>Add</Text>
            </Pressable>

            {/* Preview entries */}
            {previewEntries.map(e => (
              <Pressable key={e.id} style={styles.peopleCell} onPress={() => navigation.navigate('EntryDetail', { entryId: e.id })}>
                <View style={[styles.peopleCircle, { width: 56, height: 56, borderRadius: 28, borderColor: colorFromId(e.id) + '60', borderWidth: 1.5 }]}>
                  {e.profilePhotoPath
                    ? <Image source={{ uri: `file://${e.profilePhotoPath}` }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                    : <View style={[styles.placeholderCircle, { width: 56, height: 56, borderRadius: 28 }]} />}
                </View>
                <Text style={styles.peopleLabel} numberOfLines={1}>{e.name}</Text>
              </Pressable>
            ))}

            {/* See more */}
            {hasMore && (
              <Pressable style={styles.peopleCell} onPress={() => setShowAll(true)}>
                <View style={[styles.peopleCircle, { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1a1a22', borderColor: '#333', borderWidth: 1 }]}>
                  <Text style={{ fontSize: 12, color: '#555', fontFamily: Fonts.inter.medium }}>+{entries.length - PREVIEW_COUNT}</Text>
                </View>
                <Text style={styles.peopleLabel} numberOfLines={1}>More</Text>
              </Pressable>
            )}
          </View>
          {entries.length === 0 && (
            <Text style={styles.emptyHint}>No one yet. Tap + to add someone.</Text>
          )}
        </View>

        {/* ── Activity calendar ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Activity · past year</Text>
          <ActivityCalendar
            encounters={encounters}
            entryColor={colorFromId}
            onDayPress={(items, date) => {
              const names = [...new Set(items.map(i => {
                const e = entries.find(x => x.id === i.entry_id);
                return e?.name ?? 'Unknown';
              }))].join(', ');
              Alert.alert(
                date.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }),
                names,
              );
            }}
          />
        </View>

        {/* ── Roast ── */}
        <View style={[styles.section, styles.roastCard]}>
          <MaterialIcons name="auto-awesome" size={14} color="#555" style={{ marginBottom: 6 }} />
          <Text style={styles.roastText}>{roast}</Text>
        </View>

        {/* ── Footer ── */}
        <Text style={styles.footer}>From Parody Studio with ♥</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 20,
  },
  wordmark: { fontSize: 32, ...Fonts.grotesk.bold, color: '#fff', letterSpacing: -1 },
  accent: { color: ACCENT },
  subtitle: { fontSize: 11, fontFamily: Fonts.inter.regular, color: '#333', marginTop: 1, letterSpacing: 0.2 },
  iconBtn: { padding: 8 },

  section: {
    paddingHorizontal: GRID_PADDING,
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.inter.medium,
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  peopleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  peopleCell: { alignItems: 'center', gap: 4 },
  peopleCircle: {
    backgroundColor: '#1a1a22',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  addCircle: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#2a2a35',
    backgroundColor: 'transparent',
  },
  addPlus: { fontSize: 20, color: '#444', ...Fonts.grotesk.medium },
  placeholderCircle: { backgroundColor: '#1a1a22' },
  peopleLabel: { fontSize: 10, fontFamily: Fonts.inter.regular, color: '#555', maxWidth: 56, textAlign: 'center' },
  emptyHint: { fontSize: 12, fontFamily: Fonts.inter.regular, color: '#2a2a3a', marginTop: 8 },

  // Full grid (showAll mode)
  cell: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: CELL_PADDING },
  circle: { overflow: 'hidden', marginBottom: 6 },
  personCircle: { backgroundColor: '#1a1a1a' },
  label: { fontSize: 11, fontFamily: Fonts.inter.regular, color: '#aaa', textAlign: 'center' },

  roastCard: {
    backgroundColor: '#0d0d12',
    borderWidth: 1,
    borderColor: '#1a1a22',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: GRID_PADDING,
    alignItems: 'flex-start',
  },
  roastText: {
    fontSize: 14,
    fontFamily: Fonts.inter.medium,
    color: '#444',
    lineHeight: 20,
    fontStyle: 'italic',
  },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: Fonts.inter.regular,
    color: '#222',
    marginTop: 8,
    paddingBottom: 8,
  },
});
