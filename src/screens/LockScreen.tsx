import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Animated,
} from 'react-native';
import { verifyPin } from '../services/pin';
import { Fonts } from '../theme/fonts';

interface Props {
  onUnlocked: () => void;
  onBiometric?: () => void;       // optional — wire up when BiometricPrompt native method exists
  biometricAvailable?: boolean;   // optional — defaults false until native impl is added
}

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30_000;

export function LockScreen({ onUnlocked, onBiometric, biometricAvailable = false }: Props) {
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutBlock, setLockoutBlock] = useState(0); // how many blocks have elapsed
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Countdown timer
  useEffect(() => {
    if (lockoutUntil === null) return;
    const tick = () => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setSecondsLeft(0);
        setAttempts(0);
        setError('');
      } else {
        setSecondsLeft(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;

  const handleDigit = useCallback((digit: string) => {
    if (isLocked) return;
    setPin(prev => (prev.length === PIN_LENGTH ? prev : prev + digit));
    setError('');
  }, [isLocked]);

  const handleDelete = useCallback(() => {
    if (isLocked) return;
    setPin(prev => prev.slice(0, -1));
  }, [isLocked]);

  const handleSubmit = useCallback(async () => {
    if (isLocked || pin.length < PIN_LENGTH) return;
    try {
      const ok = await verifyPin(pin);
      if (ok) {
        onUnlocked();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');
        shake();
        if (newAttempts >= MAX_ATTEMPTS) {
          const newBlock = lockoutBlock + 1;
          setLockoutBlock(newBlock);
          const duration = BASE_LOCKOUT_MS * Math.pow(2, newBlock - 1);
          setLockoutUntil(Date.now() + duration);
          setError('');
        } else {
          setError(`Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? '' : 's'} left.`);
        }
      }
    } catch {
      setError('Verification failed. Try again.');
      shake();
      setPin('');
    }
  }, [isLocked, pin, attempts, lockoutBlock, onUnlocked, shake]);


  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <View style={styles.header}>
        <Text style={styles.title}>hokédex</Text>
        <Text style={styles.subtitle}>Enter your PIN</Text>
      </View>

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < pin.length ? styles.dotFilled : styles.dotEmpty]}
          />
        ))}
      </Animated.View>

      {isLocked ? (
        <Text style={styles.lockoutText}>
          Too many attempts. Try again in {secondsLeft}s.
        </Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <Text style={styles.errorPlaceholder} />
      )}

      <View style={styles.numpad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <NumpadKey key={d} label={d} onPress={() => handleDigit(d)} disabled={isLocked} />
        ))}
        <View style={styles.numpadKey} />
        <NumpadKey label="0" onPress={() => handleDigit('0')} disabled={isLocked} />
        <NumpadKey label="⌫" onPress={handleDelete} disabled={isLocked} />
      </View>

      <View style={styles.unlockSlot}>
        {pin.length >= 4 && (
          <Pressable
            style={({ pressed }) => [styles.unlockBtn, pressed && styles.unlockBtnPressed]}
            onPress={handleSubmit}
            disabled={isLocked}
          >
            <Text style={styles.unlockBtnText}>Unlock</Text>
          </Pressable>
        )}
      </View>

    </View>
  );
}

function NumpadKey({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.numpadKey, pressed && !disabled && styles.numpadKeyPressed]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.numpadKeyText, disabled && styles.numpadKeyDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 28,
    justifyContent: 'center',
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: { alignItems: 'center', marginBottom: 48 },
  title: {
    fontSize: 36,
    color: '#ffffff',
    ...Fonts.grotesk.bold,
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    fontFamily: Fonts.inter.regular,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotFilled: { backgroundColor: '#7c3aed' },
  dotEmpty: { backgroundColor: '#333' },
  error: {
    fontSize: 13,
    color: '#dc2626',
    fontFamily: Fonts.inter.regular,
    minHeight: 18,
    marginBottom: 4,
  },
  errorPlaceholder: { minHeight: 18, marginBottom: 4 },
  lockoutText: {
    fontSize: 13,
    color: '#d97706',
    fontFamily: Fonts.inter.regular,
    minHeight: 18,
    marginBottom: 4,
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
    marginTop: 32,
    marginBottom: 16,
  },
  numpadKey: {
    width: 100,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadKeyPressed: { opacity: 0.4 },
  numpadKeyText: {
    fontSize: 26,
    color: '#ffffff',
    ...Fonts.grotesk.medium,
  },
  numpadKeyDisabled: { color: '#444' },
  unlockSlot: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  unlockBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 10,
    alignItems: 'center',
  },
  unlockBtnPressed: { opacity: 0.7 },
  unlockBtnText: {
    fontSize: 16,
    color: '#ffffff',
    ...Fonts.grotesk.semiBold,
  },
  bioBtn: {
    marginTop: 12,
    paddingVertical: 10,
  },
  bioBtnText: {
    fontSize: 14,
    color: '#7c3aed',
    fontFamily: Fonts.inter.medium,
  },
});
