import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  Alert,
  useWindowDimensions,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { listEntriesByCategory, deleteEntry } from '../db/queries/entries';
import { getProfilePhoto } from '../db/queries/photos';
import type { Entry } from '../db/types';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Fonts } from '../theme/fonts';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MIN_TILE_WIDTH = 88;
const GRID_PADDING = 16;
const CELL_PADDING = 8;
const ACCENT = '#7c3aed';

type EntryWithPhoto = Entry & { profilePhotoPath: string | null };

type GridItem =
  | { type: 'add' }
  | { type: 'entry'; data: EntryWithPhoto };

export function CollectionListScreen() {
  const { db, collectionRoot, category } = useApp();
  const navigation = useNavigation<Nav>();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const numColumns = Math.max(1, Math.floor((screenWidth - GRID_PADDING * 2) / MIN_TILE_WIDTH));
  const cellWidth = (screenWidth - GRID_PADDING * 2) / numColumns;
  const circleDiameter = cellWidth - CELL_PADDING * 2;

  const [entries, setEntries] = useState<EntryWithPhoto[]>([]);

  const loadEntries = useCallback(() => {
    const rows = listEntriesByCategory(db, category.id);
    const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    const withPhotos: EntryWithPhoto[] = sorted.map(e => {
      const photo = getProfilePhoto(db, e.id);
      const absPath = photo ? `${collectionRoot}/${photo.local_path}` : null;
      return { ...e, profilePhotoPath: absPath };
    });
    setEntries(withPhotos);
  }, [db, collectionRoot, category.id]);

  useEffect(() => {
    loadEntries();
    const unsubscribe = navigation.addListener('focus', loadEntries);
    return unsubscribe;
  }, [loadEntries, navigation]);

  function purgeAll() {
    Alert.alert(
      'Purge everything?',
      'Deletes all entries from Hokédex. Original files on your device are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge', style: 'destructive', onPress: () => {
            entries.forEach(e => deleteEntry(db, e.id));
            loadEntries();
          },
        },
      ],
    );
  }

  const items: GridItem[] = [
    { type: 'add' },
    ...entries.map(e => ({ type: 'entry' as const, data: e })),
  ];

  const renderItem = ({ item }: { item: GridItem }) => {
    if (item.type === 'add') {
      return (
        <Pressable
          style={[styles.cell, { width: cellWidth }]}
          onPress={() => navigation.navigate('NewEntry', {})}
          accessibilityLabel="Add person"
        >
          <View style={[styles.circle, { width: circleDiameter, height: circleDiameter, borderRadius: circleDiameter / 2 }, styles.addCircle]}>
            <Text style={styles.addPlus}>+</Text>
          </View>
          <Text style={[styles.label, { maxWidth: cellWidth }]} numberOfLines={1}>Add</Text>
        </Pressable>
      );
    }

    const { data } = item;
    return (
      <Pressable
        style={[styles.cell, { width: cellWidth }]}
        onPress={() => navigation.navigate('EntryDetail', { entryId: data.id })}
        accessibilityLabel={data.name}
      >
        <View style={[styles.circle, { width: circleDiameter, height: circleDiameter, borderRadius: circleDiameter / 2 }, styles.personCircle]}>
          {data.profilePhotoPath ? (
            <Image
              source={{ uri: `file://${data.profilePhotoPath}` }}
              style={{ width: circleDiameter, height: circleDiameter, borderRadius: circleDiameter / 2 }}
            />
          ) : (
            <View style={[styles.placeholderCircle, { width: circleDiameter, height: circleDiameter, borderRadius: circleDiameter / 2 }]} />
          )}
        </View>
        <Text style={[styles.label, { maxWidth: cellWidth }]} numberOfLines={1}>{data.name}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.wordmark}>
            hok<Text style={styles.accent}>é</Text>dex
          </Text>
          <Text style={styles.subtitle}>
            {entries.length} {entries.length === 1 ? 'person' : 'people'} indexed
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={purgeAll} style={styles.iconBtn} accessibilityLabel="Purge all">
            <MaterialIcons name="delete-sweep" size={24} color="#444" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('SearchResult')} style={styles.iconBtn} accessibilityLabel="Face search">
            <MaterialIcons name="search" size={26} color="#aaa" />
          </Pressable>
        </View>
      </View>


      {entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No people yet. Tap + to add someone.</Text>
        </View>
      ) : null}

      <FlatList
        key={numColumns}
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.type === 'add' ? '__add__' : item.data.id}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
    paddingTop: 12,
    paddingBottom: 24,
  },
  wordmark: {
    fontSize: 34,
    ...Fonts.grotesk.bold,
    color: '#ffffff',
    letterSpacing: -1,
  },
  accent: {
    color: ACCENT,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Fonts.inter.regular,
    color: '#444',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: { padding: 8 },
  grid: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 32,
  },
  cell: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: CELL_PADDING,
  },
  circle: {
    overflow: 'hidden',
    marginBottom: 6,
  },
  addCircle: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  personCircle: { backgroundColor: '#1a1a1a' },
  placeholderCircle: { backgroundColor: '#222' },
  addPlus: {
    fontSize: 24,
    color: '#555',
    ...Fonts.grotesk.medium,
    lineHeight: 28,
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts.inter.regular,
    color: '#aaa',
    textAlign: 'center',
  },
  emptyState: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts.inter.regular,
    color: '#555',
    textAlign: 'center',
  },
});
