import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type PivotTab = 'MOMENTS' | 'PEOPLE' | 'FILES';

const PIVOTS: PivotTab[] = ['MOMENTS', 'PEOPLE', 'FILES'];

const STUB_CONTENT: Record<PivotTab, string> = {
  MOMENTS: 'Moments coming in Phase 4',
  PEOPLE: 'People coming in Phase 5',
  FILES: 'Files coming in Phase 7',
};

export function GalleryPivot() {
  const [activeTab, setActiveTab] = useState<PivotTab>('MOMENTS');

  return (
    <View style={styles.container}>
      <View style={styles.pivotRow}>
        {PIVOTS.map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)}>
            <Text
              style={[
                styles.pivotLabel,
                tab === activeTab && styles.pivotLabelActive,
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.stubText}>{STUB_CONTENT[activeTab]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  pivotRow: {
    flexDirection: 'row',
  },
  pivotLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.4)',
    marginRight: 24,
    paddingBottom: 4,
  },
  pivotLabelActive: {
    color: '#ffffff',
    borderBottomWidth: 2,
    borderBottomColor: '#c0170d',
  },
  stubText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginTop: 24,
    textAlign: 'center',
  },
});
