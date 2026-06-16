import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import RNFS from 'react-native-fs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useApp } from '../AppContext';
import { clearPin, verifyPin, setPin } from '../services/pin';
import { Fonts } from '../theme/fonts';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = NativeStackScreenProps<RootStackParamList, 'Settings'>['route'];

const RESET_PHRASE = 'delete my collection';

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { onReset } = route.params ?? {};
  const { collectionRoot } = useApp();

  // Change PIN state
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [currentPIN, setCurrentPIN] = useState('');
  const [newPIN1, setNewPIN1] = useState('');
  const [newPIN2, setNewPIN2] = useState('');
  const [pinError, setPinError] = useState('');

  // Reset state
  const [showReset, setShowReset] = useState(false);
  const [resetPhrase, setResetPhrase] = useState('');


  const handleChangePIN = useCallback(async () => {
    setPinError('');
    if (currentPIN.length < 4) { setPinError('Enter your current PIN'); return; }
    if (newPIN1.length < 4) { setPinError('New PIN must be 4–6 digits'); return; }
    if (newPIN1 !== newPIN2) { setPinError('New PINs do not match'); return; }
    const ok = await verifyPin(currentPIN);
    if (!ok) { setPinError('Current PIN is incorrect'); return; }
    await setPin(newPIN1);
    setShowChangePIN(false);
    setCurrentPIN('');
    setNewPIN1('');
    setNewPIN2('');
    Alert.alert('PIN changed', 'Your PIN has been updated.');
  }, [currentPIN, newPIN1, newPIN2]);

  const handleReset = useCallback(async () => {
    if (resetPhrase !== RESET_PHRASE) {
      Alert.alert('Incorrect phrase', `Type exactly: ${RESET_PHRASE}`);
      return;
    }
    Alert.alert(
      'Are you absolutely sure?',
      'This will permanently delete your entire collection. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearPin();
              const dbPath = `${collectionRoot}/hokedex.db`;
              for (const p of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
                if (await RNFS.exists(p)) await RNFS.unlink(p);
              }
              onReset?.();
            } catch (e: unknown) {
              Alert.alert('Reset failed', e instanceof Error ? e.message : String(e));
            }
          },
        },
      ],
    );
  }, [resetPhrase, collectionRoot]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Back">
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Change PIN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change PIN</Text>
          {!showChangePIN ? (
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              onPress={() => setShowChangePIN(true)}
            >
              <Text style={styles.actionBtnText}>Change PIN</Text>
            </Pressable>
          ) : (
            <View style={styles.form}>
              <Text style={styles.inputLabel}>Current PIN</Text>
              <TextInput
                style={styles.pinInput}
                value={currentPIN}
                onChangeText={setCurrentPIN}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                placeholderTextColor="#555"
                placeholder="••••"
              />
              <Text style={styles.inputLabel}>New PIN</Text>
              <TextInput
                style={styles.pinInput}
                value={newPIN1}
                onChangeText={setNewPIN1}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                placeholderTextColor="#555"
                placeholder="••••"
              />
              <Text style={styles.inputLabel}>Confirm new PIN</Text>
              <TextInput
                style={styles.pinInput}
                value={newPIN2}
                onChangeText={setNewPIN2}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                placeholderTextColor="#555"
                placeholder="••••"
              />
              {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}
              <View style={styles.formButtons}>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  onPress={handleChangePIN}
                >
                  <Text style={styles.actionBtnText}>Save new PIN</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
                  onPress={() => { setShowChangePIN(false); setPinError(''); setCurrentPIN(''); setNewPIN1(''); setNewPIN2(''); }}
                >
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Reset */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger zone</Text>
          {!showReset ? (
            <Pressable
              style={({ pressed }) => [styles.dangerBtn, pressed && styles.dangerBtnPressed]}
              onPress={() => setShowReset(true)}
            >
              <Text style={styles.dangerBtnText}>Reset app &amp; delete collection</Text>
            </Pressable>
          ) : (
            <View style={styles.form}>
              <Text style={styles.resetWarning}>
                This will permanently delete your entire collection and reset the app.
                {'\n\n'}Type <Text style={styles.resetPhraseBold}>{RESET_PHRASE}</Text> to confirm.
              </Text>
              <TextInput
                style={styles.resetInput}
                value={resetPhrase}
                onChangeText={setResetPhrase}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#555"
                placeholder={RESET_PHRASE}
              />
              <View style={styles.formButtons}>
                <Pressable
                  style={({ pressed }) => [styles.dangerBtn, pressed && styles.dangerBtnPressed]}
                  onPress={handleReset}
                >
                  <Text style={styles.dangerBtnText}>Delete everything</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
                  onPress={() => { setShowReset(false); setResetPhrase(''); }}
                >
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginRight: 8 },
  pageTitle: { fontSize: 20, color: '#ffffff', ...Fonts.grotesk.semiBold },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60, gap: 32 },
  section: {
    gap: 12,
  },
  dangerSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#888',
    fontFamily: Fonts.inter.semiBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dangerTitle: { color: '#dc2626' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowLabel: { fontSize: 15, color: '#ffffff', fontFamily: Fonts.inter.regular },
  actionBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnPressed: { opacity: 0.7 },
  actionBtnText: { fontSize: 15, color: '#ffffff', ...Fonts.grotesk.semiBold },
  dangerBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#dc2626',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  dangerBtnPressed: { opacity: 0.7 },
  dangerBtnText: { fontSize: 15, color: '#dc2626', ...Fonts.grotesk.semiBold },
  ghostBtn: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  ghostBtnPressed: { opacity: 0.5 },
  ghostBtnText: { fontSize: 14, color: '#888', fontFamily: Fonts.inter.regular },
  form: { gap: 8 },
  formButtons: { flexDirection: 'row', gap: 8, marginTop: 8 },
  inputLabel: { fontSize: 12, color: '#888', fontFamily: Fonts.inter.regular, marginTop: 4 },
  pinInput: {
    backgroundColor: '#111',
    color: '#fff',
    fontFamily: Fonts.inter.regular,
    fontSize: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222',
    letterSpacing: 4,
  },
  resetInput: {
    backgroundColor: '#111',
    color: '#fff',
    fontFamily: Fonts.inter.regular,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a1010',
  },
  resetWarning: {
    fontSize: 13,
    color: '#888',
    fontFamily: Fonts.inter.regular,
    lineHeight: 20,
    marginBottom: 8,
  },
  resetPhraseBold: { color: '#dc2626', fontFamily: Fonts.inter.semiBold },
  errorText: { fontSize: 13, color: '#dc2626', fontFamily: Fonts.inter.regular },
});
