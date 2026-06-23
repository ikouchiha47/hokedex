import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image, MapPin, Users } from 'lucide-react-native';
import { Clock } from '../icons';

export type MomentGroup = {
  id: string;
  label: string | null;
  startedAt: number;
  endedAt: number;
  moments: MomentThumbnail[];
};

export type MomentThumbnail = {
  id: string;
  note: string | null;
  photoUri?: string | null;
  placeName?: string | null;
  faceCount: number;
};

export type FaceChip = {
  faceId: string;
  entryId: string | null;
  momentId: string;
};

type Props = {
  group: MomentGroup;
  onFaceChipPress: (face: FaceChip) => void;
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function MomentGroupCarousel({ group, onFaceChipPress }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Clock size={14} color="#ffffff" />
        <Text style={styles.headerText}>
          {formatDate(group.startedAt)}
          {group.startedAt !== group.endedAt ? ` — ${formatDate(group.endedAt)}` : ''}
        </Text>
        <Text style={styles.count}>{group.moments.length} photos</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {group.moments.map(moment => (
          <View key={moment.id} style={styles.thumb}>
            <View style={styles.thumbPlaceholder}>
              <Image size={24} color="rgba(255,255,255,0.3)" />
            </View>
            {moment.placeName && (
              <View style={styles.locationBadge}>
                <MapPin size={10} color="#ffffff" />
                <Text style={styles.locationText} numberOfLines={1}>{moment.placeName}</Text>
              </View>
            )}
            {moment.faceCount > 0 && (
              <Pressable style={styles.faceChip} onPress={() => onFaceChipPress({ faceId: '', entryId: null, momentId: moment.id })}>
                <Users size={10} color="#ffffff" />
                <Text style={styles.faceChipText}>{moment.faceCount}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
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
  scroll: {
    paddingLeft: 16,
  },
  thumb: {
    width: 100,
    height: 120,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  locationText: {
    color: '#ffffff',
    fontSize: 9,
    maxWidth: 60,
  },
  faceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(192,23,13,0.8)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  faceChipText: {
    color: '#ffffff',
    fontSize: 9,
  },
});
