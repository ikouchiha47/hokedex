import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { RadialFAB } from '../components/RadialFAB';

const BG_COLOR = '#090a1c';
const WHAT_IS_ON_LABEL = 'What is on?';

export function HomeScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.whatIsOn}>{WHAT_IS_ON_LABEL}</Text>
      <RadialFAB />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_COLOR },
  content: { flexGrow: 1, paddingBottom: 24, alignItems: 'center', justifyContent: 'center' },
  whatIsOn: { fontSize: 18, color: '#9ca3af', textAlign: 'center', marginBottom: 32 },
});
