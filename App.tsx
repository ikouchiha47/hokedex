import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  NativeModules,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { initDatabase } from './src/db/init';
import { getCategory } from './src/db/queries/categories';
import { AppProvider } from './src/AppContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Fonts } from './src/theme/fonts';
import { getInitialSharedImage, onSharedImage } from './src/services/share';
import type { DB } from '@op-engineering/op-sqlite';
import type { Category } from './src/db/types';

const { HokedexIngest } = NativeModules;

type BootState =
  | { status: 'booting' }
  | { status: 'ready'; db: DB; collectionRoot: string; category: Category }
  | { status: 'error'; message: string };

export default function App() {
  const [boot, setBoot] = useState<BootState>({ status: 'booting' });
  // Shared image URI waiting to be handled (cold or hot launch)
  const [pendingSharedUri, setPendingSharedUri] = useState<string | null>(null);
  // Navigation container ref used for imperative navigation (hot-launch share intents)
  const navigationRef = useRef<import('@react-navigation/native').NavigationContainerRef<import('./src/navigation/RootNavigator').RootStackParamList>>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const root: string = await HokedexIngest.getCollectionRoot();
        const db = await initDatabase(root);
        const category = getCategory(db, 'people');
        if (!category) throw new Error('People category not seeded — run migrations.');

        // Check for a shared image from cold launch
        const sharedUri = await getInitialSharedImage();
        if (sharedUri) setPendingSharedUri(sharedUri);

        setBoot({ status: 'ready', db, collectionRoot: root, category });
      } catch (e: unknown) {
        setBoot({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    }
    bootstrap();
  }, []);

  // Subscribe to hot-launch shared image events (app already running)
  useEffect(() => {
    if (boot.status !== 'ready') return;
    const unsubscribe = onSharedImage((path) => {
      // Navigate directly if the navigator is ready
      navigationRef.current?.navigate('ShareIntake', { imageUri: path });
    });
    return unsubscribe;
  }, [boot.status]);

  if (boot.status === 'ready') {
    return (
      <AppProvider value={{ db: boot.db, collectionRoot: boot.collectionRoot, category: boot.category }}>
        <RootNavigator
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
});
