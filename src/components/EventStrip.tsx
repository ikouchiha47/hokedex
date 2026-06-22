import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, useWindowDimensions } from 'react-native';

import { ChevronRight } from './icons';

import type { NextEvent } from '../services/homeService';

const CHEVRON_COLOR = '#6b7280';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

type Props = {
  event: NextEvent | null;
  onPress?: () => void;
};

export function EventStrip({ event, onPress }: Props) {
  if (event === null) return null;
  const { width } = useWindowDimensions();
  const label = event ? `${event.label}` : 'TODAY';
  const title = event ? event.title : 'Nothing planned';
  const labelSize = clamp(width * 0.03, 11, 13);
  const titleSize = clamp(width * 0.038, 14, 16);
  const moreSize = clamp(width * 0.032, 12, 14);
  const iconSize = clamp(width * 0.045, 17, 21);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.dayLabel, { fontSize: labelSize, lineHeight: titleSize + 2 }]}>{label}</Text>
      <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize + 2 }]} numberOfLines={1}>{title}</Text>
      <View style={styles.more}>
        <Text style={[styles.moreText, { fontSize: moreSize, lineHeight: titleSize + 2 }]}>See more</Text>
        <ChevronRight color={CHEVRON_COLOR} size={iconSize} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  dayLabel: {
    fontWeight: '800',
    color: '#c0170d',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  moreText: {
    color: 'rgba(255,255,255,0.4)',
  },
  chevron: {
    marginLeft: 8,
  },
});
