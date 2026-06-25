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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/AppContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Fonts } from './src/theme/fonts';
import { onBackground, onForeground, resetTimer } from './src/services/AppLockManager';
import { onSharedImage } from './src/services/share';
import { PinSetupScreen } from './src/screens/PinSetupScreen';
import { LockScreen } from './src/screens/LockScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { APK_DOWNLOAD_URL } from './src/config';
import { setSettingValue } from './src/db/queries/app_settings';
import { SETTINGS } from './src/constants';
import { defaultBootstrap, type BootstrapResult } from './src/services/appBootstrap';
import type { DB } from '@op-engineering/op-sqlite';
import type { Category } from './src/db/types';

type BootState =
  | { status: 'booting' }
  | { status: 'onboarding'; db: DB; collectionRoot: string; category: Category; needsPinSetup: boolean }
  | { status: 'locked'; db: DB; collectionRoot: string; category: Category; needsSetup: boolean }
  | { status: 'ready'; db: DB; collectionRoot: string; category: Category }
  | { status: 'error'; message: string };

type Props = {
  bootstrap?: () => Promise<BootstrapResult>;
};

export default function App({ bootstrap = defaultBootstrap }: Props) {
  const [boot, setBoot] = useState<BootState>({ status: 'booting' });
  const [pendingSharedUri, setPendingSharedUri] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  const navigationRef = useRef<import('@react-navigation/native').NavigationContainerRef<import('./src/navigation/RootNavigator').RootStackParamList>>(null);

  useEffect(() => {
    run();
  }, []);

  async function run() {
    setBoot({ status: 'booting' });
    try {
      const result = await bootstrap();
      if (result.sharedUri) setPendingSharedUri(result.sharedUri);
      if (!result.onboardingDone) {
        setBoot({ status: 'onboarding', db: result.db, collectionRoot: result.collectionRoot, category: result.category, needsPinSetup: !result.pinExists });
      } else {
        setBoot({ status: 'locked', db: result.db, collectionRoot: result.collectionRoot, category: result.category, needsSetup: !result.pinExists });
      }
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

  // Update check moved to CollectionListScreen notification banner

  // Hot-launch share intent: navigate directly when app already running
  useEffect(() => {
    if (boot.status !== 'ready') return;
    return onSharedImage(path => {
      navigationRef.current?.navigate('ShareIntake', { imageUri: path });
    });
  }, [boot.status]);

  const handleOnboardingDone = useCallback(() => {
    if (boot.status !== 'onboarding') return;
    const { db, collectionRoot, category, needsPinSetup } = boot;
    setSettingValue(db, SETTINGS.ONBOARDING_COMPLETE, 'true')
      .then(() => {
        setBoot({ status: 'locked', db, collectionRoot, category, needsSetup: needsPinSetup });
      })
      .catch(e => {
        console.error('[Onboarding] failed to persist completion, staying on onboarding:', e);
      });
  }, [boot]);

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
    run();
  }, []);

  if (boot.status === 'onboarding') {
    return <SafeAreaProvider><OnboardingScreen onDone={handleOnboardingDone} /></SafeAreaProvider>;
  }

  if (boot.status === 'locked') {
    if (boot.needsSetup) {
      return <SafeAreaProvider><PinSetupScreen onPinSet={handlePinSet} /></SafeAreaProvider>;
    }
    return (
      <SafeAreaProvider>
        <AppProvider value={{ db: boot.db, collectionRoot: boot.collectionRoot, category: boot.category }}>
          <LockScreen onUnlocked={handleUnlocked} />
        </AppProvider>
      </SafeAreaProvider>
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
