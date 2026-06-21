import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Image,
  Pressable,
  Text,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  GestureResponderEvent,
} from 'react-native';
import type { BoundingBox } from '../types/ml';
import { Fonts } from '../theme/fonts';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  visible: boolean;
  imageUri: string;
  crops: BoundingBox[];
  onSelect: (crop: BoundingBox) => void;
  onAdd: () => void;
  onDismiss: () => void;
  loading?: boolean;
};

export function FacePickerModal({ visible, imageUri, crops: initialCrops, onSelect, onAdd, onDismiss, loading = false }: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [crops, setCrops] = useState<BoundingBox[]>(initialCrops);
  const [drawMode, setDrawMode] = useState(false);
  const [drawing, setDrawing] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const imageWrapRef = useRef<View>(null);
  const [wrapOffset, setWrapOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const displayW = screenW;
  const displayH = imageSize ? Math.round(displayW * (imageSize.height / imageSize.width)) : screenH * 0.7;
  const offsetY = imageSize ? Math.max(0, (screenH - displayH) / 2 - 60) : 0;

  function dismissCrop(index: number) {
    setCrops(prev => prev.filter((_, i) => i !== index));
  }

  function enterDrawMode() {
    imageWrapRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
      setWrapOffset({ x: px, y: py });
    });
    setDrawMode(true);
    setDrawing(null);
  }

  function onDrawStart(e: GestureResponderEvent) {
    const lx = e.nativeEvent.pageX - wrapOffset.x;
    const ly = e.nativeEvent.pageY - wrapOffset.y;
    setDrawing({ startX: lx, startY: ly, endX: lx, endY: ly });
  }

  function onDrawMove(e: GestureResponderEvent) {
    if (!drawing) return;
    setDrawing(prev => prev && { ...prev, endX: e.nativeEvent.pageX - wrapOffset.x, endY: e.nativeEvent.pageY - wrapOffset.y });
  }

  function onDrawEnd() {
    if (!drawing) return;
    const left   = Math.min(drawing.startX, drawing.endX);
    const top    = Math.min(drawing.startY, drawing.endY);
    const right  = Math.max(drawing.startX, drawing.endX);
    const bottom = Math.max(drawing.startY, drawing.endY);

    if (right - left < 20 || bottom - top < 20) {
      setDrawing(null);
      return;
    }

    const box: BoundingBox = {
      x: left / displayW,
      y: top / displayH,
      width: (right - left) / displayW,
      height: (bottom - top) / displayH,
    };
    setDrawing(null);
    setDrawMode(false);
    onSelect(box);
  }

  const drawRect = drawing ? {
    left:   Math.min(drawing.startX, drawing.endX),
    top:    Math.min(drawing.startY, drawing.endY),
    width:  Math.abs(drawing.endX - drawing.startX),
    height: Math.abs(drawing.endY - drawing.startY),
  } : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.header}>
          <View style={styles.pill}>
            <MaterialIcons name="info-outline" size={14} color="#666" />
            <Text style={styles.pillText}>
              {drawMode
                ? 'Drag to draw a box around the face'
                : crops.length === 0
                  ? 'No face detected. Use Annotate to draw a box.'
                  : 'Tap a face to select it'}
            </Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onDismiss} disabled={loading}>
            <MaterialIcons name="close" size={18} color="#888" />
          </Pressable>
        </View>

        <View
          ref={imageWrapRef}
          style={[styles.imageWrap, { width: displayW, height: displayH, marginTop: offsetY }]}
          onStartShouldSetResponder={() => drawMode}
          onMoveShouldSetResponder={() => drawMode}
          onResponderGrant={onDrawStart}
          onResponderMove={onDrawMove}
          onResponderRelease={onDrawEnd}
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width: displayW, height: displayH }}
            resizeMode="contain"
            onLoad={e => {
              const { width, height } = e.nativeEvent.source;
              setImageSize({ width, height });
            }}
          />

          {!drawMode && imageSize && crops.map((crop, i) => (
            <View
              key={i}
              style={[
                styles.cropBox,
                {
                  left:   crop.x      * displayW,
                  top:    crop.y      * displayH,
                  width:  crop.width  * displayW,
                  height: crop.height * displayH,
                },
              ]}
            >
              <Pressable
                style={styles.cropTapArea}
                onPress={() => !loading && onSelect(crop)}
              />
              <Pressable style={styles.dismissBtn} onPress={() => dismissCrop(i)}>
                <Text style={styles.dismissText}>✕</Text>
              </Pressable>
            </View>
          ))}

          {/* Live draw rect */}
          {drawMode && drawRect && (
            <View style={[styles.drawRect, drawRect]} pointerEvents="none" />
          )}

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Embedding face…</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.annotateBtn} onPress={drawMode ? () => setDrawMode(false) : enterDrawMode} disabled={loading}>
            <Text style={styles.annotateBtnText}>Annotate</Text>
          </Pressable>
          <Pressable style={styles.skipBtn} onPress={onAdd} disabled={loading}>
            <Text style={styles.skipBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    width: '100%',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  pillText: {
    color: '#999',
    fontSize: 13,
    fontFamily: Fonts.inter.regular,
    flexShrink: 1,
  },
  imageWrap: {
    position: 'relative',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#7c3aed',
    borderRadius: 4,
  },
  cropTapArea: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  dismissBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: '#fff',
    fontSize: 10,
    lineHeight: 12,
    fontFamily: Fonts.inter.medium,
  },
  drawRect: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.inter.regular,
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
  },
  annotateBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7c3aed',
    borderRadius: 8,
  },
  annotateBtnText: {
    color: '#a78bfa',
    fontSize: 15,
    fontFamily: Fonts.inter.medium,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
  },
  skipBtnText: {
    color: '#888',
    fontSize: 15,
    fontFamily: Fonts.inter.medium,
  },
});
