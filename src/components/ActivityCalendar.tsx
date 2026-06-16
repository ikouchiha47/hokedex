import React, { useMemo, useRef, useState } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Fonts } from '../theme/fonts';

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export type CalendarEncounter = {
  entry_id: string;
  occurred_at: number;
};

type DayCell = {
  date: Date;
  isFuture: boolean;
  items: CalendarEncounter[];
};

type Props = {
  encounters: CalendarEncounter[];
  entryColor: (entryId: string) => string;
  onDayPress?: (items: CalendarEncounter[], date: Date) => void;
};

// deterministic hue from any string
export function colorFromId(id: string): string {
  let h = 5381;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) + h) ^ id.charCodeAt(i);
    h = h & 0x7fffffff;
  }
  return `hsl(${h % 360}, 65%, 58%)`;
}

function buildGrid(year: number, encounters: CalendarEncounter[]) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const isCurrentYear = year === today.getFullYear();

  const byDate: Record<string, CalendarEncounter[]> = {};
  for (const enc of encounters) {
    const d = new Date(enc.occurred_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    (byDate[key] ??= []).push(enc);
  }

  let anchor: Date;
  let end: Date;

  if (isCurrentYear) {
    // Rolling 52 weeks ending today
    end = new Date(today);
    anchor = new Date();
    anchor.setHours(0, 0, 0, 0);
    anchor.setDate(anchor.getDate() - anchor.getDay()); // this week's Sunday
    anchor.setDate(anchor.getDate() - 51 * 7);          // 52 weeks back
  } else {
    // Full calendar year Jan 1 → Dec 31
    anchor = new Date(year, 0, 1);
    anchor.setDate(anchor.getDate() - anchor.getDay());
    anchor.setHours(0, 0, 0, 0);
    end = new Date(year, 11, 31, 23, 59, 59);
  }

  const weeksArr: DayCell[][] = [];
  const monthLabelArr: { col: number; label: string }[] = [];
  let seenMonth = -1;
  let col = 0;
  const cursor = new Date(anchor);

  while (cursor <= end) {
    const week: DayCell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(cursor);
      d.setDate(d.getDate() + dow);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      week.push({
        date: new Date(d),
        isFuture: d > today,
        items: byDate[key] ?? [],
      });
    }
    weeksArr.push(week);

    const m = cursor.getMonth();
    if (m !== seenMonth) {
      monthLabelArr.push({ col, label: MONTH_NAMES[m] });
      seenMonth = m;
    }
    cursor.setDate(cursor.getDate() + 7);
    col++;
  }

  return { weeks: weeksArr, monthLabels: monthLabelArr };
}

export function ActivityCalendar({ encounters, entryColor, onDayPress }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  // Allow navigating back to the earliest year with data, or at most 5 years back
  const minYear = useMemo(() => {
    if (encounters.length === 0) return currentYear - 5;
    let mn = currentYear;
    for (const e of encounters) {
      const y = new Date(e.occurred_at).getFullYear();
      if (y < mn) mn = y;
    }
    return Math.min(mn, currentYear - 5);
  }, [encounters, currentYear]);

  const { weeks, monthLabels } = useMemo(
    () => buildGrid(year, encounters),
    [year, encounters],
  );

  const gridWidth = weeks.length * STEP;

  return (
    <View style={{ overflow: 'hidden' }}>
      {/* Year selector */}
      <View style={styles.yearRow}>
        <Pressable
          onPress={() => setYear(y => Math.max(y - 1, minYear))}
          style={styles.yearBtn}
          disabled={year <= minYear}
        >
          <MaterialIcons name="chevron-left" size={18} color={year <= minYear ? '#1e1e28' : '#888'} />
        </Pressable>
        <Text style={styles.yearLabel}>{year}</Text>
        <Pressable
          onPress={() => setYear(y => Math.min(y + 1, currentYear))}
          style={styles.yearBtn}
          disabled={year >= currentYear}
        >
          <MaterialIcons name="chevron-right" size={18} color={year >= currentYear ? '#1e1e28' : '#888'} />
        </Pressable>
      </View>

      {/* Month row */}
      <View style={{ height: 16, marginBottom: 2, paddingLeft: 28 }}>
        {monthLabels.map(({ col, label }) => (
          <Text
            key={`${col}-${label}`}
            style={[styles.monthLabel, { left: col * STEP }]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.bodyRow}>
        {/* Day-of-week labels */}
        <View style={styles.dowCol}>
          {DOW_LABELS.map((l, i) => (
            <Text key={i} style={styles.dowLabel}>{l}</Text>
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={() => scrollRef.current?.scrollToEnd({ animated: false })}
          style={{ flex: 1 }}
        >
          <View style={styles.grid}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekCol}>
                {week.map((cell, di) => {
                  const count = cell.items.length;
                  let bg = '#1a1a22';
                  let opacity = 1;

                  if (cell.isFuture) {
                    bg = '#0f0f14';
                  } else if (count > 0) {
                    bg = entryColor(cell.items[0].entry_id);
                    opacity = Math.min(0.35 + count * 0.25, 1);
                  }

                  return (
                    <Pressable
                      key={di}
                      style={[styles.cell, { backgroundColor: bg, opacity }]}
                      onPress={() => count > 0 && onDayPress?.(cell.items, cell.date)}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  yearBtn: { padding: 4 },
  yearLabel: {
    fontSize: 12,
    fontFamily: Fonts.inter.medium,
    color: '#444',
    minWidth: 36,
    textAlign: 'center',
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 9,
    color: '#3a3a4a',
    fontFamily: Fonts.inter.regular,
  },
  bodyRow: { flexDirection: 'row', flex: 1 },
  dowCol: { width: 28 },
  dowLabel: {
    height: STEP,
    lineHeight: STEP,
    fontSize: 9,
    color: '#2a2a3a',
    fontFamily: Fonts.inter.regular,
  },
  grid: { flexDirection: 'row' },
  weekCol: { flexDirection: 'column', marginRight: GAP },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 2,
    marginBottom: GAP,
  },
});
