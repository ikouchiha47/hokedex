import React, { useState } from 'react';
import { View, Pressable, Text, TextInput, Modal, StyleSheet } from 'react-native';
import { ACCENT_PALETTE } from '../../theme/accent';

export type ColorPickerSectionProps = {
  currentColor: string | null;
  onColorChange: (hex: string) => void;
};

export function ColorPickerSection({ currentColor, onColorChange }: ColorPickerSectionProps): React.JSX.Element {
  const [modalVisible, setModalVisible] = useState(false);
  const [customHex, setCustomHex] = useState('');

  function applyColor(hex: string): void {
    onColorChange(hex);
  }

  function commitCustom(): void {
    const clean = customHex.startsWith('#') ? customHex : `#${customHex}`;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      applyColor(clean);
      setModalVisible(false);
      setCustomHex('');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {ACCENT_PALETTE.map(hex => (
          <Pressable
            key={hex}
            style={[styles.swatch, { backgroundColor: hex }, currentColor === hex && styles.active]}
            onPress={() => applyColor(hex)}
          />
        ))}
        <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addTxt}>+</Text>
        </Pressable>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Custom color</Text>
            <TextInput
              style={styles.hexInput}
              value={customHex}
              onChangeText={setCustomHex}
              placeholder="#rrggbb"
              placeholderTextColor="#555"
              maxLength={7}
              autoCapitalize="none"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={commitCustom}
            />
            <Pressable style={styles.setBtn} onPress={commitCustom}>
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
  container: {
    paddingVertical: 10,
  },
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
  active: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  addBtn: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    borderWidth: 1.5,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTxt: {
    color: '#aaa',
    fontSize: 18,
    lineHeight: 20,
    includeFontPadding: false,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 24,
    width: 260,
    alignItems: 'center',
    gap: 16,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  hexInput: {
    color: '#fff',
    fontSize: 16,
    borderBottomWidth: 1,
    borderColor: '#444',
    paddingVertical: 6,
    paddingHorizontal: 4,
    width: '100%',
    textAlign: 'center',
    letterSpacing: 2,
  },
  setBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  setBtnTxt: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
