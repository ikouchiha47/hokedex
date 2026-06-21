import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

import { ChevronRight } from './icons';

import type { NextEvent } from '../services/homeService';

const STRIP_BG = '#1a1b2e';
const TEXT_COLOR = '#ffffff';
const CHEVRON_COLOR = '#6b7280';
const ICON_SIZE = 16;

type Props = {
  event: NextEvent | null;
  onPress?: () => void;
};

export function EventStrip({ event, onPress }: Props) {
  if (event === null) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.label}>
        {event.label}: {event.title}
      </Text>

      <View style={styles.chevron}>
        <ChevronRight color={CHEVRON_COLOR} size={ICON_SIZE} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STRIP_BG,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  label: {
    flex: 1,
    color: TEXT_COLOR,
    fontSize: 14,
  },
  chevron: {
    marginLeft: 8,
  },
});
