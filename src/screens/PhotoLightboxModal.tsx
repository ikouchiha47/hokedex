import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Image,
  Pressable,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  Alert,
} from 'react-native';
import { Fonts } from '../theme/fonts';

type Props = {
  photos: Array<{ id: string; localPath: string }>;
  initialIndex: number;
  collectionRoot: string;
  onClose: () => void;
  onSetProfile: (photoId: string) => void;
  onRemove: (photoId: string) => void;
  onRemoveAndDelete: (photoId: string) => void;
};

export function PhotoLightboxModal({
  photos,
  initialIndex,
  collectionRoot,
  onClose,
  onSetProfile,
  onRemove,
  onRemoveAndDelete,
}: Props) {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const listRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [sheetPhoto, setSheetPhoto] = useState<string | null>(null);

  function showSheet(photoId: string) {
    setSheetPhoto(photoId);
  }

  function handleSetProfile() {
    if (sheetPhoto) { onSetProfile(sheetPhoto); setSheetPhoto(null); }
  }

  function handleRemove() {
    if (sheetPhoto) { onRemove(sheetPhoto); setSheetPhoto(null); }
  }

  function handleRemoveAndDelete() {
    if (!sheetPhoto) return;
    const id = sheetPhoto;
    setSheetPhoto(null);
    Alert.alert(
      'Delete file',
      'Remove from Hokédex and delete the original file? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onRemoveAndDelete(id) },
      ],
    );
  }

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <FlatList
          ref={listRef}
          data={photos}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
          onMomentumScrollEnd={e => {
            setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth));
          }}
          keyExtractor={p => p.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={{ width: screenWidth, height: screenHeight, justifyContent: 'center' }}
              onLongPress={() => showSheet(item.id)}
              delayLongPress={400}
            >
              <Image
                source={{ uri: `file://${collectionRoot}/${item.localPath}` }}
                style={{ width: screenWidth, height: screenHeight }}
                resizeMode="contain"
              />
            </Pressable>
          )}
        />

        <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        {photos.length > 1 && (
          <Text style={styles.counter}>{currentIndex + 1} / {photos.length}</Text>
        )}
      </View>

      {sheetPhoto && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSheetPhoto(null)}>
          <Pressable style={styles.sheetOverlay} onPress={() => setSheetPhoto(null)} />
          <View style={styles.sheet}>
            <Pressable style={styles.sheetItem} onPress={handleSetProfile}>
              <Text style={styles.sheetItemText}>Set as profile photo</Text>
            </Pressable>
            <Pressable style={styles.sheetItem} onPress={handleRemove}>
              <Text style={styles.sheetItemText}>Remove from Hokédex</Text>
            </Pressable>
            <Pressable style={styles.sheetItem} onPress={handleRemoveAndDelete}>
              <Text style={[styles.sheetItemText, { color: '#dc2626' }]}>Remove and delete file</Text>
            </Pressable>
            <Pressable style={[styles.sheetItem, { borderTopWidth: 1, borderTopColor: '#222' }]} onPress={() => setSheetPhoto(null)}>
              <Text style={[styles.sheetItemText, { color: '#666' }]}>Cancel</Text>
            </Pressable>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    padding: 8,
  },
  closeText: { fontSize: 20, color: '#fff' },
  counter: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    fontSize: 13,
    fontFamily: Fonts.inter.regular,
    color: '#aaa',
  },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 32,
  },
  sheetItem: { paddingVertical: 16, paddingHorizontal: 20 },
  sheetItemText: { fontSize: 16, fontFamily: Fonts.inter.regular, color: '#fff' },
});
