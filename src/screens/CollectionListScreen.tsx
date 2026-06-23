import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  Alert,
  Animated,
  Vibration,
  useWindowDimensions,
  StyleSheet,
  StatusBar,
  NativeModules,
  NativeEventEmitter,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { CollectionController, type EntryWithPhoto } from '../services/CollectionController';
import type { EncounterStats } from '../db/queries/encounters';
import { accentForEntry } from '../theme/accent';
import { ActivityCalendar, colorFromId } from '../components/ActivityCalendar';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Fonts } from '../theme/fonts';
import { NotificationBanner, type BannerNotification } from '../components/NotificationBanner';
import { checkForUpdate } from '../services/updateCheck';
import { apkUrlForVersion } from '../config';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ACCENT = '#7c3aed';
const MIN_TILE_WIDTH = 72;
const GRID_PADDING = 16;
const CELL_PADDING = 6;

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (n < 1000000) return Math.floor(n / 1000) + 'K';
  if (n < 10000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  return Math.floor(n / 1000000) + 'M';
}

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

const SMASH_TAPS = 5;
const SMASH_WINDOW_MS = 1500;
const SMASH_COOLDOWN_MS = 5 * 60 * 1000;

type SmashablePhotoProps = {
  entryId: string;
  photoPath: string | null;
  name: string;
  diameter: number;
  accentColor: string;
  onPress: () => void;
  onSmash: (entryId: string) => void;
};

function SmashablePhoto({ entryId, photoPath, name, diameter, accentColor, onPress, onSmash }: SmashablePhotoProps): React.JSX.Element {
  const tapTimestamps = useRef<number[]>([]);
  const lastSmashedAt = useRef<number>(0);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chargeAnim = useRef(new Animated.Value(0)).current;

  function handleTap(): void {
    const now = Date.now();

    if (navTimer.current) clearTimeout(navTimer.current);

    if (now - lastSmashedAt.current < SMASH_COOLDOWN_MS) {
      onPress();
      return;
    }

    const recent = tapTimestamps.current.filter(t => now - t < SMASH_WINDOW_MS);
    recent.push(now);
    tapTimestamps.current = recent;

    const progress = Math.min(recent.length / SMASH_TAPS, 1);
    Animated.timing(chargeAnim, { toValue: progress, duration: 80, useNativeDriver: false }).start();

    if (recent.length >= SMASH_TAPS) {
      tapTimestamps.current = [];
      lastSmashedAt.current = now;
      Animated.sequence([
        Animated.timing(chargeAnim, { toValue: 1, duration: 60, useNativeDriver: false }),
        Animated.timing(chargeAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]).start();
      Vibration.vibrate(80);
      onSmash(entryId);
      return;
    }

    // No combo yet — navigate if no further tap arrives within 250ms
    navTimer.current = setTimeout(() => {
      tapTimestamps.current = [];
      Animated.timing(chargeAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();
      onPress();
    }, 250);
  }

  const ringColor = chargeAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['rgba(234,179,8,0)', 'rgba(234,179,8,0.7)', 'rgba(234,179,8,1)'],
  });

  return (
    <Pressable onPress={handleTap}>
      {/* Static accent border — always visible */}
      <View style={{ width: diameter, height: diameter, borderRadius: diameter / 2, borderWidth: 2, borderColor: accentColor + '80', alignItems: 'center', justifyContent: 'center' }}>
        {/* Animated charge ring overlaid via absolute */}
        <Animated.View style={{ position: 'absolute', top: -2, left: -2, width: diameter, height: diameter, borderRadius: diameter / 2, borderWidth: 2, borderColor: ringColor }} />
        <View style={{ width: diameter - 4, height: diameter - 4, borderRadius: (diameter - 4) / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {photoPath
            ? <Image source={{ uri: `file://${photoPath}` }} style={{ width: diameter - 4, height: diameter - 4, borderRadius: (diameter - 4) / 2 }} />
            : <Text style={{ fontSize: Math.round(diameter * 0.38), color: '#fff', fontFamily: 'SpaceGrotesk' }}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

const { HokedexML } = NativeModules;

export function CollectionListScreen({ onReset }: { onReset?: () => void } = {}) {
  const { db, collectionRoot, category } = useApp();
  const navigation = useNavigation<Nav>();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const controller = new CollectionController(db, collectionRoot, category.id);

  const numColumns = Math.max(1, Math.floor((screenWidth - GRID_PADDING * 2) / MIN_TILE_WIDTH));
  const cellWidth = (screenWidth - GRID_PADDING * 2) / numColumns;
  const circleDiameter = cellWidth - CELL_PADDING * 2;

  const [entries, setEntries] = useState<EntryWithPhoto[]>([]);
  const [encounters, setEncounters] = useState([] as ReturnType<CollectionController['load']>['encounters']);
  const [stats, setStats] = useState<ReturnType<CollectionController['load']>['stats']>({ total: 0, unique_people: 0, last_at: null, first_at: null });
  const [showAll, setShowAll] = useState(false);

  const [banner, setBanner] = useState<BannerNotification | null>(null);

  useEffect(() => {
    HokedexML.checkModelsReady().then((ready: boolean) => {
      if (!ready) {
        setBanner({ type: 'download', message: 'Downloading face models…', progress: 0 });
        const emitter = new NativeEventEmitter(HokedexML);
        const progressSub = emitter.addListener('hokedex:modelProgress', ({ percent }: { percent: number }) => {
          setBanner({ type: 'download', message: 'Downloading face models…', progress: percent });
        });
        const doneSub = emitter.addListener('hokedex:modelReady', () => {
          setBanner({ type: 'download', message: 'Downloading face models…', progress: 100 });
          setTimeout(() => setBanner(null), 800);
          progressSub.remove();
          doneSub.remove();
        });
        HokedexML.downloadModels().catch(() => {
          progressSub.remove();
          doneSub.remove();
          setBanner(null);
        });
      } else {
        checkForUpdate()
          .then(info => {
            if (info.available) {
              setBanner({
                type: 'update',
                version: info.latestVersion,
                onTap: () => Linking.openURL(apkUrlForVersion(info.latestVersion)),
                onDismiss: () => setBanner(null),
              });
            }
          })
          .catch(() => {});
      }
    });
  }, []);

  const loadAll = useCallback(() => {
    const state = controller.load();
    setEntries(state.entries);
    setEncounters(state.encounters);
    setStats(state.stats);
  }, [db, collectionRoot, category.id]);

  useEffect(() => {
    loadAll();
    const unsubscribe = navigation.addListener('focus', loadAll);
    return unsubscribe;
  }, [loadAll, navigation]);

  function handleSmash(entryId: string): void {
    controller.logEncounter(entryId);
    loadAll();
  }

  function purgeAll() {
    Alert.alert(
      'Purge everything?',
      'Deletes all entries from Hokédex. Original files on your device are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge', style: 'destructive', onPress: () => {
            controller.purgeAll(entries);
            loadAll();
          },
        },
      ],
    );
  }

  const MAX_PREVIEW = 11;
  const hasMore = entries.length > MAX_PREVIEW;
  const previewEntries = hasMore ? entries.slice(0, MAX_PREVIEW - 1) : entries.slice(0, MAX_PREVIEW);

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
          </View>
          <Pressable onPress={purgeAll} style={styles.iconBtn}>
            <MaterialIcons name="delete-sweep" size={22} color="#444" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Insights')} style={styles.iconBtn}>
            <MaterialIcons name="auto-graph" size={22} color="#aaa" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('SearchResult')} style={styles.iconBtn}>
            <MaterialIcons name="search" size={24} color="#aaa" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings', { onReset })} style={styles.iconBtn}>
            <MaterialIcons name="settings" size={22} color="#aaa" />
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
              <Pressable style={[styles.cell, { width: cellWidth }]}>
                <SmashablePhoto
                  entryId={data.id}
                  photoPath={data.profilePhotoPath}
                  name={data.name}
                  diameter={circleDiameter}
                  accentColor={accentForEntry(0, data.colorTag)}
                  onPress={() => navigation.navigate('EntryDetail', { entryId: data.id })}
                  onSmash={handleSmash}
                />
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
          </View>
          <Pressable onPress={purgeAll} style={styles.iconBtn}>
            <MaterialIcons name="delete-sweep" size={22} color="#444" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Insights')} style={styles.iconBtn}>
            <MaterialIcons name="auto-graph" size={22} color="#aaa" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('SearchResult')} style={styles.iconBtn}>
            <MaterialIcons name="search" size={24} color="#aaa" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings', { onReset })} style={styles.iconBtn}>
            <MaterialIcons name="settings" size={22} color="#aaa" />
          </Pressable>
        </View>

        <NotificationBanner notification={banner} />

        {/* ── Body count ── */}
        <View style={styles.bodyCountWrap}>
          <Text style={styles.bodyCountLabel}>BODY COUNT</Text>
          <View style={styles.bodyCountCircle}>
            <Text style={styles.bodyCountNumber}>{formatCount(entries.length)}</Text>
          </View>
        </View>

        {/* ── People grid (3 cols) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>People</Text>
          <View style={styles.peopleGrid}>
            {/* Add tile */}
            <Pressable style={[styles.peopleCell, { width: cellWidth }]} onPress={() => navigation.navigate('NewEntry', {})}>
              <View style={[styles.peopleCircle, styles.addCircle, { width: circleDiameter, height: circleDiameter, borderRadius: circleDiameter / 2 }]}>
                <Text style={styles.addPlus}>+</Text>
              </View>
              <Text style={[styles.peopleLabel, { maxWidth: cellWidth }]} numberOfLines={1}>Add</Text>
            </Pressable>

            {/* Preview entries */}
            {previewEntries.map(e => (
              <Pressable key={e.id} style={[styles.peopleCell, { width: cellWidth }]}>
                <SmashablePhoto
                  entryId={e.id}
                  photoPath={e.profilePhotoPath}
                  name={e.name}
                  diameter={circleDiameter}
                  accentColor={accentForEntry(0, e.colorTag)}
                  onPress={() => navigation.navigate('EntryDetail', { entryId: e.id })}
                  onSmash={handleSmash}
                />
                <Text style={[styles.peopleLabel, { maxWidth: cellWidth }]} numberOfLines={1}>{e.name}</Text>
              </Pressable>
            ))}

            {/* Empty placeholder slots */}
            {!hasMore && Array.from({ length: MAX_PREVIEW - previewEntries.length }).map((_, i) => (
              <Pressable key={`empty-${i}`} style={[styles.peopleCell, { width: cellWidth }]} onPress={() => navigation.navigate('NewEntry', {})}>
                <View style={[styles.peopleCircle, { width: circleDiameter, height: circleDiameter, borderRadius: circleDiameter / 2, backgroundColor: '#0d0d10', borderColor: '#141418', borderWidth: 1 }]} />
              </Pressable>
            ))}

            {/* Show More › */}
            {hasMore && (
              <Pressable style={[styles.peopleCell, { width: cellWidth }]} onPress={() => setShowAll(true)}>
                <View style={[styles.peopleCircle, { width: circleDiameter, height: circleDiameter, borderRadius: circleDiameter / 2, backgroundColor: '#111118', borderColor: '#1e1e2c', borderWidth: 1 }]}>
                  <Text style={styles.showMoreCount}>+{entries.length - (MAX_PREVIEW - 1)}</Text>
                  <Text style={styles.showMoreLabel}>more</Text>
                </View>
                <Text style={[styles.peopleLabel, { maxWidth: cellWidth }]} numberOfLines={1}>See all</Text>
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
  wordmark: { fontSize: 42, ...Fonts.grotesk.bold, color: '#fff', letterSpacing: -1.5 },
  accent: { color: ACCENT },
  bodyCountWrap: { alignItems: 'center', paddingVertical: 24 },
  bodyCountLabel: { fontSize: 10, fontFamily: Fonts.inter.medium, color: '#444', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  bodyCountCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#00bfff', justifyContent: 'center', alignItems: 'center' },
  bodyCountNumber: { fontSize: 36, ...Fonts.grotesk.bold, color: '#fff' },
  iconBtn: { padding: 10 },

  section: {
    paddingHorizontal: GRID_PADDING,
    marginBottom: 48,
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: Fonts.inter.medium,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  peopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  peopleCell: { alignItems: 'center', gap: 4 },
  peopleCircle: {
    backgroundColor: '#1a1a22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircle: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#2a2a35',
    backgroundColor: 'transparent',
  },
  addPlus: { fontSize: 28, color: '#444', ...Fonts.grotesk.medium },
  placeholderCircle: { backgroundColor: '#1a1a22' },
  peopleLabel: { fontSize: 11, fontFamily: Fonts.inter.regular, color: '#555', textAlign: 'center' },
  showMoreCount: { fontSize: 16, fontFamily: Fonts.inter.medium, color: '#333' },
  showMoreLabel: { fontSize: 10, fontFamily: Fonts.inter.regular, color: '#2a2a38' },
  emptyHint: { fontSize: 12, fontFamily: Fonts.inter.regular, color: '#2a2a3a', marginTop: 8 },

  // Full grid (showAll mode)
  cell: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: CELL_PADDING },
  circle: { marginBottom: 6 },
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
