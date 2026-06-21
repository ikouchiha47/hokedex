import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BG_COLOR = '#090a1c';

type Props = {
  mapToggleRef?: React.RefObject<{ toggleMap: () => void } | null>;
};

export function TimelineScreen({ mapToggleRef }: Props) {
  const [mapVisible, setMapVisible] = React.useState(false);

  React.useImperativeHandle(mapToggleRef, () => ({
    toggleMap: () => setMapVisible(prev => !prev),
  }));

  return (
    <View style={styles.root}>
      <Text style={styles.label}>Timeline</Text>
      <Text style={styles.sub}>{mapVisible ? 'Map ON' : 'Map OFF'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#ffffff', fontSize: 16 },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 },
});
