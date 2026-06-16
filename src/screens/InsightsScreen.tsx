import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import {
  getRegularEncounters,
  getTagPatternAmongRegulars,
  getEncounterStats,
  type RegularEncounter,
  type TagPattern,
  type EncounterStats,
} from '../db/queries/encounters';
import { colorFromId } from '../components/ActivityCalendar';
import { Fonts } from '../theme/fonts';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Mode = 'person' | 'tag';

const ACCENT = '#7c3aed';
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
const FETCH_LIMIT = 100;
const PAGE_SIZE = 10;
const LIST_ROW_HEIGHT = 65;
const LIST_VISIBLE_ROWS = 5;

function formatRelative(ms: number): string {
  const d = Math.floor((Date.now() - ms) / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function InsightsScreen() {
  const { db } = useApp();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const [regulars, setRegulars] = useState<RegularEncounter[]>([]);
  const [tagPatterns, setTagPatterns] = useState<TagPattern[]>([]);
  const [stats, setStats] = useState<EncounterStats>({ total: 0, unique_people: 0, last_at: null, first_at: null });
  const [mode, setMode] = useState<Mode>('person');
  const [tagView, setTagView] = useState<'bars' | 'list'>('bars');
  const [listPage, setListPage] = useState(0);

  const load = useCallback(() => {
    const since = Date.now() - NINETY_DAYS;
    setStats(getEncounterStats(db));
    // Fetch FETCH_LIMIT + 1 to detect if more data exists beyond the buffer
    setRegulars(getRegularEncounters(db, since, FETCH_LIMIT + 1));
    setTagPatterns(getTagPatternAmongRegulars(db, since, FETCH_LIMIT + 1));
    setListPage(0);
  }, [db]);

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [load, navigation]);

  useEffect(() => { setListPage(0); }, [mode]);

  const rawData = mode === 'person' ? regulars : tagPatterns;
  // If we fetched FETCH_LIMIT + 1 items, there's more data beyond the buffer
  const hasMore = rawData.length > FETCH_LIMIT;
  const sourceData = rawData.slice(0, FETCH_LIMIT);
  // Graph always shows the fixed 100-point buffer
  const graphData = sourceData;
  const listTotalPages = Math.ceil(sourceData.length / PAGE_SIZE);
  const listPageSlice = sourceData.slice(listPage * PAGE_SIZE, (listPage + 1) * PAGE_SIZE);

  const lineData = mode === 'person'
    ? (graphData as RegularEncounter[]).map((r) => ({
        value: r.encounter_count,
        label: r.name.split(' ')[0].slice(0, 6) + (r.name.split(' ')[0].length > 6 ? '…' : ''),
        dataPointColor: colorFromId(r.id),
      }))
    : [];

  const maxValue = Math.max(...lineData.map(d => d.value), 1);
  const totalChartWidth = Math.max(screenWidth - 64, lineData.length * 52);
  const hasData = sourceData.length > 0;
  const empty = rawData.length === 0 && stats.total === 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#aaa" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>patterns, because you have them</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}>

        {empty && (
          <View style={styles.emptyCard}>
            <MaterialIcons name="insights" size={36} color="#333" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Nothing to judge yet</Text>
            <Text style={styles.emptyBody}>Log a few encounters and come back. The patterns will reveal themselves.</Text>
          </View>
        )}

        {!empty && (
          <View style={styles.section}>
            {/* Mode selector */}
            <View style={styles.modeRow}>
              <Pressable
                style={[styles.modeBtn, mode === 'person' && styles.modeBtnActive]}
                onPress={() => setMode('person')}
              >
                <Text style={[styles.modeBtnText, mode === 'person' && styles.modeBtnTextActive]}>By Person</Text>
              </Pressable>
              <Pressable
                style={[styles.modeBtn, mode === 'tag' && styles.modeBtnActive]}
                onPress={() => setMode('tag')}
              >
                <Text style={[styles.modeBtnText, mode === 'tag' && styles.modeBtnTextActive]}>By Tag</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>
              {mode === 'person' ? 'Encounter frequency · 90 days' : 'Tag frequency · 90 days'}
            </Text>
            <Text style={styles.sectionCaption}>
              {mode === 'person'
                ? `${sourceData.length}${hasMore ? '+' : ''} people · last 90 days`
                : `${sourceData.length}${hasMore ? '+' : ''} tags · last 90 days`}
            </Text>

            {hasData && mode === 'tag' && (
              <View style={styles.chartCard}>
                {/* view toggle */}
                <View style={styles.chartToggleRow}>
                  <Pressable onPress={() => setTagView('bars')} style={[styles.chartToggleBtn, tagView === 'bars' && styles.chartToggleBtnActive]}>
                    <MaterialIcons name="bar-chart" size={22} color={tagView === 'bars' ? '#fff' : '#444'} />
                  </Pressable>
                  <Pressable onPress={() => setTagView('list')} style={[styles.chartToggleBtn, tagView === 'list' && styles.chartToggleBtnActive]}>
                    <MaterialIcons name="view-list" size={22} color={tagView === 'list' ? '#fff' : '#444'} />
                  </Pressable>
                </View>

                {tagView === 'bars' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.vBarChart}>
                    {(graphData as TagPattern[]).map(t => {
                      const pct = t.people_count / Math.max(...(graphData as TagPattern[]).map(x => x.people_count), 1);
                      const color = colorFromId(t.name);
                      return (
                        <View key={t.name} style={styles.vBarCol}>
                          <Text style={styles.vBarCount}>{t.people_count}</Text>
                          <View style={styles.vBarTrack}>
                            <View style={[styles.vBarFill, { height: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
                          </View>
                          <Text style={styles.vBarLabel} numberOfLines={2}>{t.name}</Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
                )}

                {tagView === 'list' && (
                  <View style={styles.tagBarsWrap}>
                    {(graphData as TagPattern[]).map(t => (
                      <View key={t.name} style={styles.tagRow}>
                        <Text style={styles.tagLabel} numberOfLines={1}>{t.name}</Text>
                        <View style={styles.tagBarBg}>
                          <View style={[styles.tagBarFill, { width: `${(t.people_count / Math.max(...(graphData as TagPattern[]).map(x => x.people_count), 1)) * 100}%`, backgroundColor: colorFromId(t.name) }]} />
                        </View>
                        <Text style={styles.tagCount}>{t.people_count}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {hasData && mode === 'person' && lineData.length > 0 && (
              <View style={styles.chartCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={lineData}
                    width={totalChartWidth}
                    height={200}
                    color={ACCENT}
                    thickness={2}
                    dataPointsRadius={5}
                    hideRules={false}
                    rulesColor="#1a1a22"
                    rulesType="solid"
                    xAxisColor="#1a1a22"
                    yAxisColor="#1a1a22"
                    yAxisTextStyle={styles.axisLabel}
                    xAxisLabelTextStyle={styles.axisLabel}
                    noOfSections={4}
                    maxValue={maxValue + 1}
                    curved
                    hideDataPoints={false}
                    backgroundColor="transparent"
                    customDataPoint={(_: unknown, index: number) => (
                      <View style={[styles.dataPoint, { backgroundColor: lineData[index]?.dataPointColor ?? ACCENT }]} />
                    )}
                  />
                </ScrollView>
              </View>
            )}

            {/* Detail list — fixed-height container, internally scrollable */}
            {hasData && (
              <ScrollView
                style={styles.listContainer}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {mode === 'person' && (listPageSlice as RegularEncounter[]).map(r => (
                  <Pressable key={r.id} style={styles.row} onPress={() => navigation.navigate('EntryDetail', { entryId: r.id })}>
                    <View style={[styles.dot, { backgroundColor: colorFromId(r.id) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{r.name}</Text>
                      <Text style={styles.rowMeta}>last seen {formatRelative(r.last_seen)}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{r.encounter_count}×</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={18} color="#444" />
                  </Pressable>
                ))}

              </ScrollView>
            )}

            {/* Pagination — only when data exceeds the 100-point graph buffer */}
            {hasMore && listTotalPages > 1 && (
              <View style={styles.paginationRow}>
                <Pressable
                  style={[styles.pageBtn, listPage === 0 && styles.pageBtnDisabled]}
                  onPress={() => setListPage(p => Math.max(0, p - 1))}
                  disabled={listPage === 0}
                >
                  <MaterialIcons name="chevron-left" size={20} color={listPage === 0 ? '#2a2a38' : '#aaa'} />
                </Pressable>
                <Text style={styles.pageLabel}>{listPage + 1} / {listTotalPages}</Text>
                <Pressable
                  style={[styles.pageBtn, listPage >= listTotalPages - 1 && styles.pageBtnDisabled]}
                  onPress={() => setListPage(p => Math.min(listTotalPages - 1, p + 1))}
                  disabled={listPage >= listTotalPages - 1}
                >
                  <MaterialIcons name="chevron-right" size={20} color={listPage >= listTotalPages - 1 ? '#2a2a38' : '#aaa'} />
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ── Coming soon ── */}
        <View style={[styles.section, styles.comingSoonCard]}>
          <View style={styles.comingSoonHeader}>
            <MaterialIcons name="science" size={16} color="#555" />
            <Text style={styles.comingSoonLabel}>May happen in the future</Text>
          </View>
          <View style={styles.futureItem}>
            <Text style={styles.futureIcon}>📝</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.futureName}>Notes per encounter</Text>
              <Text style={styles.futureDesc}>Write what happened. The red flags. The vibes. Whatever you need to remember.</Text>
            </View>
          </View>
          <View style={styles.futureItem}>
            <Text style={styles.futureIcon}>🧠</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.futureName}>AI pattern analyser</Text>
              <Text style={styles.futureDesc}>Feed it your notes and encounter history. It will tell you what you already know but refuse to admit.</Text>
            </View>
          </View>
          <View style={styles.futureItem}>
            <Text style={styles.futureIcon}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.futureName}>Compatibility score</Text>
              <Text style={styles.futureDesc}>Based on tag overlap, encounter frequency, and vibes. Meaningless but compelling.</Text>
            </View>
          </View>
          <View style={[styles.futureItem, { borderBottomWidth: 0 }]}>
            <Text style={styles.futureIcon}>🚩</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.futureName}>Red flag density map</Text>
              <Text style={styles.futureDesc}>How many red flags per person. Visualised. So you can see the pattern clearly and ignore it anyway.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20 },
  iconBtn: { padding: 10 },
  title: { fontSize: 28, ...Fonts.grotesk.bold, color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 11, fontFamily: Fonts.inter.regular, color: '#666', marginTop: 1 },

  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 15, fontFamily: Fonts.inter.medium, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  sectionCaption: { fontSize: 12, fontFamily: Fonts.inter.regular, color: '#555', marginBottom: 12, fontStyle: 'italic' },

  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#1e1e2c', backgroundColor: '#0d0d12' },
  modeBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  modeBtnText: { fontSize: 12, fontFamily: Fonts.inter.medium, color: '#555' },
  modeBtnTextActive: { color: '#fff' },

  chartCard: { backgroundColor: '#0d0d12', borderRadius: 12, borderWidth: 1, borderColor: '#1a1a22', padding: 16, marginBottom: 16 },
  axisLabel: { fontSize: 9, color: '#444' },
  dataPoint: { width: 10, height: 10, borderRadius: 5 },

  listContainer: { maxHeight: LIST_ROW_HEIGHT * LIST_VISIBLE_ROWS, marginBottom: 12 },

  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 },
  pageBtn: { padding: 4 },
  pageBtnDisabled: { opacity: 0.3 },
  pageLabel: { fontSize: 12, fontFamily: Fonts.inter.medium, color: '#555' },

  emptyCard: { marginTop: 60, alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.inter.medium, color: '#666', marginBottom: 8 },
  emptyBody: { fontSize: 13, fontFamily: Fonts.inter.regular, color: '#555', textAlign: 'center', lineHeight: 20 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowName: { fontSize: 14, fontFamily: Fonts.inter.medium, color: '#ddd' },
  rowMeta: { fontSize: 11, fontFamily: Fonts.inter.regular, color: '#555', marginTop: 2 },
  badge: { backgroundColor: '#1a1a28', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontFamily: Fonts.inter.medium, color: ACCENT },

  chartToggleRow: { flexDirection: 'row', gap: 6, alignSelf: 'flex-end', marginBottom: 12 },
  chartToggleBtn: { padding: 6, borderRadius: 8, backgroundColor: '#1a1a22' },
  chartToggleBtnActive: { backgroundColor: ACCENT },

  vBarChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingVertical: 8, minWidth: '100%' },
  vBarCol: { alignItems: 'center', width: 52 },
  vBarTrack: { width: 30, height: 160, backgroundColor: '#1a1a22', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  vBarFill: { width: '100%', borderRadius: 6 },
  vBarCount: { fontSize: 10, color: '#666', fontFamily: Fonts.inter.regular, marginBottom: 4, height: 16 },
  vBarLabel: { fontSize: 9, color: '#555', fontFamily: Fonts.inter.regular, textAlign: 'center', marginTop: 6, lineHeight: 12, height: 24, overflow: 'hidden' },

  tagBarsWrap: { marginTop: 4 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tagLabel: { fontSize: 12, fontFamily: Fonts.inter.medium, color: '#888', width: 80 },
  tagBarBg: { flex: 1, height: 6, backgroundColor: '#1a1a22', borderRadius: 3, overflow: 'hidden' },
  tagBarFill: { height: 6, backgroundColor: ACCENT, borderRadius: 3 },
  tagCount: { fontSize: 11, fontFamily: Fonts.inter.regular, color: '#555', width: 20, textAlign: 'right' },

  comingSoonCard: { backgroundColor: '#0c0c12', borderWidth: 1, borderColor: '#1e1e2c', borderRadius: 12, padding: 16, marginTop: 8 },
  comingSoonHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  comingSoonLabel: { fontSize: 10, fontFamily: Fonts.inter.medium, color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  futureItem: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#161620' },
  futureIcon: { fontSize: 20, lineHeight: 26 },
  futureName: { fontSize: 13, fontFamily: Fonts.inter.medium, color: '#888', marginBottom: 3 },
  futureDesc: { fontSize: 12, fontFamily: Fonts.inter.regular, color: '#555', lineHeight: 18 },
});
