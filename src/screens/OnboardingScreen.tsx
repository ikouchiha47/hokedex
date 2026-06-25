import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '../theme/fonts';
import {
  type PermissionId,
  requestPermission,
  checkPermission,
} from '../services/permissions/PermissionRegistry';
import { ALL_PERMISSIONS } from '../features';

type PermissionItem = {
  id: PermissionId;
  label: string;
  sublabel: string;
  dependsOn?: PermissionId;
};

const PERMISSION_META: Record<PermissionId, { label: string; sublabel: string; dependsOn?: PermissionId }> = {
  camera:        { label: 'Camera',             sublabel: 'capture & scan' },
  gallery:       { label: 'Gallery / Files',    sublabel: 'local imports' },
  analysePhotos: { label: 'Analyse past photos', sublabel: '60 days back', dependsOn: 'gallery' },
  voice:         { label: 'Voice',              sublabel: 'press & hold' },
  location:      { label: 'Location',           sublabel: 'geotagged moments' },
};

const ITEMS: PermissionItem[] = ALL_PERMISSIONS.map(id => ({
  id,
  ...PERMISSION_META[id],
}));

type Props = {
  onDone: () => void;
};

export function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [granted, setGranted] = useState<Record<PermissionId, boolean>>(
    () => Object.fromEntries(ALL_PERMISSIONS.map(id => [id, false])) as Record<PermissionId, boolean>,
  );
  const [pending, setPending] = useState<PermissionId | null>(null);

  useEffect(() => {
    async function syncGranted() {
      const results = await Promise.all(ALL_PERMISSIONS.map(id => checkPermission(id)));
      setGranted(Object.fromEntries(ALL_PERMISSIONS.map((id, i) => [id, results[i]])) as Record<PermissionId, boolean>);
    }
    syncGranted();
  }, []);

  const handleToggle = useCallback(async (id: PermissionId, dependsOn?: PermissionId) => {
    if (dependsOn && !granted[dependsOn]) return;

    if (granted[id]) {
      // Can't revoke from within app — just reflect current state
      const current = await checkPermission(id);
      setGranted(prev => ({ ...prev, [id]: current }));
      return;
    }

    setPending(id);
    try {
      const result = await requestPermission(id);
      setGranted(prev => {
        const next = { ...prev, [id]: result };
        // If gallery revoked, clear analysePhotos too
        if (id === 'gallery' && !result) {
          next.analysePhotos = false;
        }
        return next;
      });
    } finally {
      setPending(null);
    }
  }, [granted]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#090a1c" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Onboarding Setup</Text>
          <Text style={styles.subtitle}>change from settings later</Text>
        </View>
        <Pressable style={styles.closeBtn} onPress={() => onDone()} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>PERMISSIONS</Text>

        <View style={styles.card}>
          {ITEMS.map((item, idx) => {
            const isDisabled = !!item.dependsOn && !granted[item.dependsOn];
            const isLast = idx === ITEMS.length - 1;
            return (
              <View key={item.id}>
                <View style={[styles.row, isDisabled && styles.rowDisabled]}>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowLabel, isDisabled && styles.textDisabled]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.rowSublabel, isDisabled && styles.textDisabled]}>
                      {item.sublabel}
                    </Text>
                  </View>
                  <Switch
                    value={granted[item.id]}
                    onValueChange={() => handleToggle(item.id, item.dependsOn)}
                    disabled={isDisabled || pending === item.id}
                    trackColor={{ false: '#2a2a3d', true: '#7c3aed' }}
                    thumbColor={granted[item.id] ? '#ffffff' : '#888899'}
                    ios_backgroundColor="#2a2a3d"
                  />
                </View>
                {!isLast && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        <Text style={styles.hint}>
          You can update these anytime in Settings → Permissions.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Pressable style={styles.skipBtn} onPress={() => onDone()}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <Pressable style={styles.doneBtn} onPress={() => onDone()}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090a1c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    color: '#ffffff',
    ...Fonts.grotesk.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#555577',
    fontFamily: Fonts.inter.regular,
    marginTop: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  closeText: {
    fontSize: 16,
    color: '#555577',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#555577',
    fontFamily: Fonts.inter.medium ?? Fonts.inter.regular,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#13142a',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    color: '#ffffff',
    ...Fonts.grotesk.medium,
  },
  rowSublabel: {
    fontSize: 12,
    color: '#888899',
    fontFamily: Fonts.inter.regular,
    marginTop: 2,
  },
  textDisabled: {
    color: '#555577',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 20,
  },
  hint: {
    fontSize: 12,
    color: '#444466',
    fontFamily: Fonts.inter.regular,
    marginTop: 16,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: '#888899',
    ...Fonts.grotesk.medium,
  },
  doneBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  doneText: {
    fontSize: 15,
    color: '#ffffff',
    ...Fonts.grotesk.semiBold,
  },
});
