import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BG_COLOR = '#090a1c';

export function MomentsScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.label}>Moments</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#ffffff', fontSize: 18 },
});
