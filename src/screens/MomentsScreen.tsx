import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useApp } from '../AppContext';
import { getSetting, setSettingValue } from '../db/queries/app_settings';
import { listGroups, listMembersByGroup } from '../db/queries/moment_groups';
import { getMoment } from '../db/queries/moments';
import { listFacesByMoment } from '../db/queries/moment_faces';
import { regroup, getRegroupStatus, onRegroupStatusChange } from '../services/RegroupService';
import { MomentGroupCarousel, type MomentGroup, type MomentThumbnail } from '../components/moments/MomentGroupCarousel';
import { MomentLocationCards } from '../components/moments/MomentLocationCards';
import { MomentCaptureService } from '../services/MomentCaptureService';
import { PlaceResolverRegistry } from '../services/place-resolver/PlaceResolverRegistry';
import { RuleRegistry } from '../services/rules/RuleRegistry';
import { List, MapPin } from '../components/icons';

const BG_COLOR = '#090a1c';
const ACCENT = '#c0170d';

type LayoutMode = 'carousel' | 'location';

export function MomentsScreen() {
  const { db } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [groups, setGroups] = useState<MomentGroup[]>([]);
  const [layout, setLayout] = useState<LayoutMode>('carousel');
  const [loading, setLoading] = useState(true);
  const [regroupSpinner, setRegroupSpinner] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const captureService = useRef(new MomentCaptureService(
    db,
    new PlaceResolverRegistry(),
    new RuleRegistry(),
  )).current;

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, []),
  );

  useEffect(() => {
    const unsub = onRegroupStatusChange(status => {
      setRegroupSpinner(status === 'running' || status === 'queued');
      if (status === 'idle') {
        loadGroups();
      }
    });
    cleanupRef.current = unsub;
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    getSetting(db, 'moments_layout').then(val => {
      if (val === 'carousel' || val === 'location') {
        setLayout(val);
      }
    });
  }, [db]);

  async function loadGroups() {
    setLoading(true);
    try {
      const groupRows = await listGroups(db);
      const hydrated: MomentGroup[] = [];

      for (const g of groupRows) {
        const members = await listMembersByGroup(db, g.id);
        const moments: MomentThumbnail[] = [];

        for (const m of members) {
          const moment = await getMoment(db, m.moment_id);
          if (!moment) continue;
          const faces = await listFacesByMoment(db, m.moment_id);
          moments.push({
            id: moment.id,
            note: moment.note,
            placeName: moment.place_name,
            faceCount: faces.length,
          });
        }

        hydrated.push({
          id: g.id,
          label: g.label,
          startedAt: g.started_at,
          endedAt: g.ended_at,
          moments,
        });
      }

      setGroups(hydrated);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleLayout = useCallback(() => {
    const next: LayoutMode = layout === 'carousel' ? 'location' : 'carousel';
    setLayout(next);
    setSettingValue(db, 'moments_layout', next);
  }, [layout, db]);

  const handleRegroup = useCallback(() => {
    regroup(db);
  }, [db]);

  const handleFaceChipPress = useCallback(async (face: { faceId: string; entryId: string | null; momentId: string }) => {
    if (face.entryId) {
      navigation.navigate('EntryDetail', { entryId: face.entryId });
    } else {
      navigation.navigate('NewEntry', {});
    }
  }, [navigation]);

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Pressable style={styles.toggleBtn} onPress={handleToggleLayout}>
          {layout === 'carousel' ? (
            <List size={16} color="#ffffff" />
          ) : (
            <MapPin size={16} color="#ffffff" />
          )}
          <Text style={styles.toggleText}>
            {layout === 'carousel' ? 'Carousel' : 'Locations'}
          </Text>
        </Pressable>

        <Pressable style={styles.regroupBtn} onPress={handleRegroup} disabled={regroupSpinner}>
          {regroupSpinner ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.regroupText}>Re-group</Text>
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No moments yet</Text>
        </View>
      ) : (
        <ScrollView style={styles.list}>
          {groups.map(g => (
            layout === 'carousel' ? (
              <MomentGroupCarousel key={g.id} group={g} onFaceChipPress={handleFaceChipPress} />
            ) : (
              <MomentLocationCards key={g.id} group={g} onFaceChipPress={handleFaceChipPress} />
            )
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  toggleText: {
    color: '#ffffff',
    fontSize: 13,
  },
  regroupBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    minWidth: 80,
    alignItems: 'center',
  },
  regroupText: {
    color: '#ffffff',
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
  },
  list: {
    flex: 1,
    paddingTop: 12,
  },
});
