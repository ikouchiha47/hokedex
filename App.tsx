import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  NativeModules,
  StyleSheet,
  StatusBar,
  AppState,
  Linking,
  Pressable,
} from 'react-native';
import { initDatabase } from './src/db/init';
import { getCategory } from './src/db/queries/categories';
import { AppProvider } from './src/AppContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Fonts } from './src/theme/fonts';
import { hasPin } from './src/services/pin';
import { onBackground, onForeground, resetTimer } from './src/services/AppLockManager';
import { getInitialSharedImage, onSharedImage } from './src/services/share';
import { PinSetupScreen } from './src/screens/PinSetupScreen';
import { LockScreen } from './src/screens/LockScreen';
import { checkForUpdate } from './src/services/updateCheck';
import { APK_DOWNLOAD_URL } from './src/config';
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
  const [pendingSharedUri, setPendingSharedUri] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const navigationRef = useRef<import('@react-navigation/native').NavigationContainerRef<import('./src/navigation/RootNavigator').RootStackParamList>>(null);

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

      const [pinExists, sharedUri] = await Promise.all([
        hasPin(),
        getInitialSharedImage(),
      ]);

      if (sharedUri) setPendingSharedUri(sharedUri);

      setBoot({ status: 'locked', db, collectionRoot: root, category, needsSetup: !pinExists });
    } catch (e: unknown) {
      setBoot({ status: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  // Background → foreground lock check
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        onBackground();
      } else if (state === 'active') {
        setBoot(prev => {
          if (prev.status !== 'ready') return prev;
          if (onForeground()) return { ...prev, status: 'locked', needsSetup: false };
          return prev;
        });
      }
    });
    return () => sub.remove();
  }, []);

  // Update check — runs once when app becomes ready
  useEffect(() => {
    if (boot.status !== 'ready') return;
    checkForUpdate()
      .then(info => { if (info.available) setUpdateAvailable(info.latestVersion); })
      .catch(() => {});
  }, [boot.status]);

  // Hot-launch share intent: navigate directly when app already running
  useEffect(() => {
    if (boot.status !== 'ready') return;
    return onSharedImage(path => {
      navigationRef.current?.navigate('ShareIntake', { imageUri: path });
    });
  }, [boot.status]);

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

  if (boot.status === 'ready') {
    return (
      <AppProvider value={{ db: boot.db, collectionRoot: boot.collectionRoot, category: boot.category }}>
        <RootNavigator
          onReset={handleReset}
          navigationRef={navigationRef}
          initialSharedImageUri={pendingSharedUri ?? undefined}
        />
        {updateAvailable && (
          <Pressable
            style={styles.updateBanner}
            onPress={() => Linking.openURL(APK_DOWNLOAD_URL)}
          >
            <Text style={styles.updateText}>↑ {updateAvailable} available — tap to download</Text>
            <Pressable onPress={() => setUpdateAvailable(null)} hitSlop={12}>
              <Text style={styles.updateDismiss}>✕</Text>
            </Pressable>
          </Pressable>
        )}
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
  updateBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#00bfff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  updateText: { fontSize: 13, color: '#000', fontFamily: Fonts.inter.medium, flex: 1 },
  updateDismiss: { fontSize: 14, color: '#000', paddingLeft: 12 },
});
