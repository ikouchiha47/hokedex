import React, { useMemo, useRef } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native';
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

export function ActivityCalendar({ encounters, entryColor, onDayPress }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const byDate: Record<string, CalendarEncounter[]> = {};
    for (const enc of encounters) {
      const d = new Date(enc.occurred_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      (byDate[key] ??= []).push(enc);
    }

    // Start from Sunday 52 weeks ago
    const anchor = new Date();
    anchor.setHours(0, 0, 0, 0);
    anchor.setDate(anchor.getDate() - anchor.getDay()); // this week's Sunday
    anchor.setDate(anchor.getDate() - 51 * 7);          // go back 51 more weeks

    const weeksArr: DayCell[][] = [];
    const monthLabelArr: { col: number; label: string }[] = [];
    let seenMonth = -1;
    let col = 0;
    const cursor = new Date(anchor);

    while (cursor <= today) {
      const week: DayCell[] = [];
      for (let dow = 0; dow < 7; dow++) {
        const d = new Date(cursor);
        d.setDate(d.getDate() + dow);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const nowDay = new Date(); nowDay.setHours(23,59,59,999);
        week.push({
          date: new Date(d),
          isFuture: d > nowDay,
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
  }, [encounters]);

  const gridWidth = weeks.length * STEP;

  return (
    <View>
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
          style={{ width: gridWidth }}
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
                    opacity = 1;
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
  monthLabel: {
    position: 'absolute',
    fontSize: 9,
    color: '#3a3a4a',
    fontFamily: Fonts.inter.regular,
  },
  bodyRow: { flexDirection: 'row' },
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
