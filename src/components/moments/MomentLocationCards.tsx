import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Clock, MapPin, Users } from 'lucide-react-native';
import type { MomentGroup, MomentThumbnail, FaceChip } from './MomentGroupCarousel';

type LocationCluster = {
  location: string;
  moments: MomentThumbnail[];
};

type Props = {
  group: MomentGroup;
  onFaceChipPress: (face: FaceChip) => void;
};

function clusterByLocation(moments: MomentThumbnail[]): LocationCluster[] {
  const map = new Map<string, MomentThumbnail[]>();
  for (const m of moments) {
    const key = m.placeName ?? `${m.id}`;
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([location, ms]) => ({ location, moments: ms }));
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function MomentLocationCards({ group, onFaceChipPress }: Props) {
  const clusters = clusterByLocation(group.moments);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Clock size={14} color="#ffffff" />
        <Text style={styles.headerText}>{formatDate(group.startedAt)}</Text>
        <Text style={styles.count}>{group.moments.length} photos</Text>
      </View>

      {clusters.map((cluster, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.locationName}>{cluster.location}</Text>
            <Text style={styles.photoCount}>{cluster.moments.length}</Text>
          </View>
          <View style={styles.thumbRow}>
            {cluster.moments.slice(0, 5).map(moment => (
              <View key={moment.id} style={styles.thumb}>
                <View style={styles.thumbInner} />
                {moment.faceCount > 0 && (
                  <Pressable style={styles.faceChip} onPress={() => onFaceChipPress({ faceId: '', entryId: null, momentId: moment.id })}>
                    <Users size={10} color="#ffffff" />
                    <Text style={styles.faceChipText}>{moment.faceCount}</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  headerText: {
    color: '#ffffff',
    fontSize: 13,
    flex: 1,
  },
  count: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  photoCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 6,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  thumbInner: {
    flex: 1,
  },
  faceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(192,23,13,0.8)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  faceChipText: {
    color: '#ffffff',
    fontSize: 8,
  },
});
