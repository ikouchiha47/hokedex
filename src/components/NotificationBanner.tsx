import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Fonts } from '../theme/fonts';

type DownloadNotification = {
  type: 'download';
  message: string;
  progress: number; // 0-100
};

type UpdateNotification = {
  type: 'update';
  version: string;
  onTap: () => void;
  onDismiss: () => void;
};

export type BannerNotification = DownloadNotification | UpdateNotification;

type Props = {
  notification: BannerNotification | null;
};

export function NotificationBanner({ notification }: Props) {
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const visible = notification !== null;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -80,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    if (notification?.type === 'download') {
      Animated.timing(progressAnim, {
        toValue: notification.progress / 100,
        duration: 120,
        useNativeDriver: false,
      }).start();
    }
    if (notification?.type === 'download' && notification.progress === 100) {
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [notification]);

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      {notification?.type === 'download' && (
        <>
          <View style={styles.barTrack}>
            <Animated.View style={[
              styles.barFill,
              { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]} />
          </View>
          <Text style={styles.message}>{notification.message} {notification.progress}%</Text>
        </>
      )}
      {notification?.type === 'update' && (
        <Pressable style={styles.updateRow} onPress={notification.onTap}>
          <MaterialIcons name="system-update" size={14} color="#7c3aed" />
          <Text style={styles.updateText}>
            {notification.version} available. Tap to download.
          </Text>
          <Pressable onPress={notification.onDismiss} hitSlop={12}>
            <MaterialIcons name="close" size={14} color="#555" />
          </Pressable>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: '#0a0a0a',
  },
  barTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1a1a2e',
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#7c3aed',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  message: {
    fontSize: 11,
    fontFamily: Fonts.inter.regular,
    color: '#444',
    textAlign: 'center',
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d0d18',
    borderWidth: 1,
    borderColor: '#1e1e2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  updateText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.inter.medium,
    color: '#888',
  },
});
