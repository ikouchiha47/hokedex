import React, { useState } from 'react';
import { View, Pressable, Text, Modal, StyleSheet } from 'react-native';
import ColorPicker from 'react-native-wheel-color-picker';
import { ACCENT_PALETTE } from '../../theme/accent';

export type ColorPickerSectionProps = {
  currentColor: string | null;
  onColorChange: (hex: string) => void;
};

export function ColorPickerSection({ currentColor, onColorChange }: ColorPickerSectionProps): React.JSX.Element {
  const [modalVisible, setModalVisible] = useState(false);
  const [pickedColor, setPickedColor] = useState(currentColor ?? '#7c3aed');

  function commitColor(): void {
    onColorChange(pickedColor);
    setModalVisible(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {ACCENT_PALETTE.map(hex => (
          <Pressable
            key={hex}
            style={[styles.swatch, { backgroundColor: hex }, currentColor === hex && styles.active]}
            onPress={() => onColorChange(hex)}
          />
        ))}
        <Pressable style={styles.addBtn} onPress={() => {
          setPickedColor(currentColor ?? '#7c3aed');
          setModalVisible(true);
        }}>
          <Text style={styles.addTxt}>+</Text>
        </Pressable>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Pick a color</Text>
            <View style={styles.wheelWrap}>
              <ColorPicker
                color={pickedColor}
                onColorChange={setPickedColor}
                thumbSize={30}
                sliderSize={30}
                noSnap
                row={false}
                swatches={false}
              />
            </View>
            <View style={styles.previewRow}>
              <View style={[styles.previewSwatch, { backgroundColor: pickedColor }]} />
              <Text style={styles.previewHex}>{pickedColor}</Text>
            </View>
            <Pressable style={styles.setBtn} onPress={commitColor}>
              <Text style={styles.setBtnTxt}>Set color</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const SWATCH = 26;

const styles = StyleSheet.create({
  container: { paddingVertical: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
  },
  active: { borderWidth: 2, borderColor: '#fff' },
  addBtn: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    borderWidth: 1.5,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTxt: { color: '#aaa', fontSize: 18, lineHeight: 20, includeFontPadding: false },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: 300,
    alignItems: 'center',
    gap: 16,
  },
  sheetTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  wheelWrap: { width: 240, height: 260 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewSwatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#444' },
  previewHex: { color: '#aaa', fontSize: 13, fontFamily: 'monospace' },
  setBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  setBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
