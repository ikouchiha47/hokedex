import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { WeatherCover } from '../components/weather/WeatherCover';
import { EventStrip } from '../components/EventStrip';
import { RadialFAB } from '../components/RadialFAB';
import { getNextEvent, isEventfulDay } from '../services/homeService';

import type { TabParamList } from '../navigation/types';

const BG_COLOR = '#090a1c';
const MEMORY_CARD_BG = '#1a1b2e';
const MEMORY_PROMPT = 'You had an eventful day — Edit or share.';
const WHAT_IS_ON_LABEL = 'What is on?';
const THUMBNAIL_BG = '#374151';
const MEMORY_TEXT_COLOR = '#e5e7eb';
const WHAT_IS_ON_COLOR = '#9ca3af';
const EVENT_STRIP_MARGIN_TOP = -20;
const EVENT_STRIP_MARGIN_H = 16;

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

  const nextEvent = getNextEvent(new Date());
  const eventful = isEventfulDay();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <WeatherCover weatherState="sunny" />

      <View style={styles.eventStripWrapper}>
        <EventStrip
          event={nextEvent}
          onPress={() => navigation.navigate('Planner')}
        />
      </View>

      <View style={styles.main}>
        {eventful ? (
          <View style={styles.memoryCard}>
            <View style={styles.thumbnail} />
            <Text style={styles.memoryPrompt}>{MEMORY_PROMPT}</Text>
          </View>
        ) : (
          <Text style={styles.whatIsOn}>{WHAT_IS_ON_LABEL}</Text>
        )}
      </View>

      <RadialFAB />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_COLOR },
  content: { flexGrow: 1 },
  eventStripWrapper: {
    marginHorizontal: EVENT_STRIP_MARGIN_H,
    marginTop: EVENT_STRIP_MARGIN_TOP,
  },
  main: {
    paddingHorizontal: 20,
    paddingTop: 24,
    flex: 1,
  },
  whatIsOn: {
    fontSize: 18,
    color: WHAT_IS_ON_COLOR,
    textAlign: 'center',
    marginTop: 40,
  },
  memoryCard: {
    backgroundColor: MEMORY_CARD_BG,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: THUMBNAIL_BG,
  },
  memoryPrompt: {
    flex: 1,
    marginLeft: 12,
    color: MEMORY_TEXT_COLOR,
    fontSize: 13,
  },
});
