import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Check, User, UserX, X } from './icons';

type Mode = 'confirm_match' | 'create_or_skip';

type Props = {
  visible: boolean;
  mode: Mode;
  name?: string;
  onConfirm: (entryIdOrName: string) => void;
  onReject: () => void;
  onSkip: () => void;
  onDismiss: () => void;
};

export function PersonConfirmModal({
  visible,
  mode,
  name,
  onConfirm,
  onReject,
  onSkip,
  onDismiss,
}: Props) {
  const [newName, setNewName] = useState('');

  const handleConfirm = () => {
    if (mode === 'create_or_skip') {
      if (newName.trim()) {
        onConfirm(newName.trim());
        setNewName('');
      }
    } else {
      onConfirm('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {mode === 'confirm_match' ? (
            <>
              <Text style={styles.title}>Is this {name}?</Text>
              <View style={styles.row}>
                <Pressable style={styles.primaryBtn} onPress={handleConfirm}>
                  <Check size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Confirm</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={onReject}>
                  <UserX size={16} color="#ccc" />
                  <Text style={styles.secondaryBtnText}>Not them</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>New person</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter name"
                placeholderTextColor="#666"
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <View style={styles.row}>
                <Pressable style={styles.primaryBtn} onPress={handleConfirm}>
                  <User size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Create</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={onSkip}>
                  <X size={16} color="#ccc" />
                  <Text style={styles.secondaryBtnText}>Skip</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: '#ccc',
    fontSize: 14,
  },
});
