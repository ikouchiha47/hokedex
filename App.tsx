import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  NativeModules,
  StyleSheet,
  StatusBar,
  AppState,
} from 'react-native';
import { initDatabase } from './src/db/init';
import { getCategory } from './src/db/queries/categories';
import { AppProvider } from './src/AppContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Fonts } from './src/theme/fonts';
import { hasPin } from './src/services/pin';
import { onBackground, onForeground, resetTimer } from './src/services/AppLockManager';
import { PinSetupScreen } from './src/screens/PinSetupScreen';
import { LockScreen } from './src/screens/LockScreen';
import type { DB } from '@op-engineering/op-sqlite';
import type { Category } from './src/db/types';

const { HokedexIngest } = NativeModules;

type BootState =
  | { status: 'booting' }
  | { status: 'locked'; db: DB; collectionRoot: string; category: Category; needsSetup: boolean }
  | { status: 'ready'; db: DB; collectionRoot: string; category: Category }
  | { status: 'error'; message: string };

export default function App() {
  const [boot, setBoot] = useState<BootState>({ status: 'booting' });
  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    setBoot({ status: 'booting' });
    try {
      const root: string = await HokedexIngest.getCollectionRoot();
      const db = await initDatabase(root);
      const category = getCategory(db, 'people');
      if (!category) throw new Error('People category not seeded — run migrations.');
      const pinExists = await hasPin();
      setBoot({ status: 'locked', db, collectionRoot: root, category, needsSetup: !pinExists });
    } catch (e: unknown) {
      setBoot({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  // AppState listener: background → foreground lock check
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        onBackground();
      } else if (state === 'active') {
        setBoot(prev => {
          if (prev.status !== 'ready') return prev;
          const shouldLock = onForeground();
          if (shouldLock) {
            return { ...prev, status: 'locked', needsSetup: false };
          }
          return prev;
        });
      }
    });
    return () => sub.remove();
  }, []);

  const handlePinSet = useCallback(() => {
    setBoot(prev => {
      if (prev.status !== 'locked') return prev;
      resetTimer();
      return { status: 'ready', db: prev.db, collectionRoot: prev.collectionRoot, category: prev.category };
    });
  }, []);

  const handleUnlocked = useCallback(() => {
    setBoot(prev => {
      if (prev.status !== 'locked') return prev;
      resetTimer();
      return { status: 'ready', db: prev.db, collectionRoot: prev.collectionRoot, category: prev.category };
    });
  }, []);

  const handleReset = useCallback(() => {
    bootstrap();
  }, []);

  if (boot.status === 'ready') {
    return (
      <AppProvider value={{ db: boot.db, collectionRoot: boot.collectionRoot, category: boot.category }}>
        <RootNavigator onReset={handleReset} />
      </AppProvider>
    );
  }

  if (boot.status === 'locked') {
    if (boot.needsSetup) {
      return <PinSetupScreen onPinSet={handlePinSet} />;
    }
    return (
      <AppProvider value={{ db: boot.db, collectionRoot: boot.collectionRoot, category: boot.category }}>
        <LockScreen onUnlocked={handleUnlocked} />
      </AppProvider>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <View style={styles.wordmark}>
        <Text style={styles.logo}>hokédex</Text>
        <Text style={styles.tagline}>your private face index</Text>
      </View>
      <View style={styles.status}>
        {boot.status === 'booting' && (
          <View style={styles.row}>
            <ActivityIndicator color="#7c3aed" size="small" />
            <Text style={styles.statusText}>initialising…</Text>
          </View>
        )}
        {boot.status === 'error' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>boot failed</Text>
            <Text style={styles.errorMessage}>{boot.message}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'space-between',
    paddingTop: 120,
    paddingBottom: 60,
    paddingHorizontal: 28,
  },
  wordmark: { alignItems: 'flex-start' },
  logo: { fontSize: 42, ...Fonts.grotesk.bold, color: '#ffffff', letterSpacing: -1.5 },
  tagline: { fontSize: 14, fontFamily: Fonts.inter.regular, color: '#555', marginTop: 6, letterSpacing: 0.3 },
  status: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { fontSize: 14, color: '#888', fontFamily: Fonts.inter.regular },
  errorBox: { backgroundColor: '#1a0a0a', borderLeftWidth: 3, borderLeftColor: '#dc2626', paddingVertical: 12, paddingHorizontal: 16, gap: 6 },
  errorTitle: { fontSize: 13, color: '#dc2626', ...Fonts.grotesk.semiBold },
  errorMessage: { fontSize: 12, color: '#888', fontFamily: Fonts.inter.regular },
});
