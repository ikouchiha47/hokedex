import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Animated,
} from 'react-native';
import { setPin } from '../services/pin';
import { Fonts } from '../theme/fonts';

type Step = 'enter' | 'confirm';

interface Props {
  onPinSet: () => void;
}

const DOT_COUNT = 4;

export function PinSetupScreen({ onPinSet }: Props) {
  const [step, setStep] = useState<Step>('enter');
  const [first, setFirst] = useState('');
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleDigit = useCallback((digit: string) => {
    setCurrent(prev => {
      if (prev.length === DOT_COUNT) return prev;
      return prev + digit;
    });
    setError('');
  }, []);

  const handleDelete = useCallback(() => {
    setCurrent(prev => prev.slice(0, -1));
    setError('');
  }, []);

  const handleDone = useCallback(async () => {
    if (current.length < DOT_COUNT) {
      setError(`Enter ${DOT_COUNT} digits`);
      shake();
      return;
    }
    if (step === 'enter') {
      setFirst(current);
      setCurrent('');
      setStep('confirm');
    } else {
      // confirm step
      if (current !== first) {
        setError('PINs do not match');
        shake();
        setCurrent('');
        return;
      }
      try {
        await setPin(current);
        onPinSet();
      } catch {
        setError('Failed to save PIN. Try again.');
        shake();
        setCurrent('');
      }
    }
  }, [current, first, step, onPinSet, shake]);

  const title = step === 'enter' ? 'Set your PIN' : 'Confirm your PIN';
  const subtitle =
    step === 'enter'
      ? 'Choose a 4–6 digit PIN to protect your collection.'
      : 'Enter the same PIN again to confirm.';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length: Math.max(DOT_COUNT, current.length) }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < current.length ? styles.dotFilled : styles.dotEmpty]}
          />
        ))}
      </Animated.View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.numpad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <NumpadKey key={d} label={d} onPress={() => handleDigit(d)} />
        ))}
        <View style={styles.numpadKey} />
        <NumpadKey label="0" onPress={() => handleDigit('0')} />
        <NumpadKey label="⌫" onPress={handleDelete} />
      </View>

      <Pressable
        style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
        onPress={handleDone}
      >
        <Text style={styles.doneBtnText}>
          {step === 'confirm' ? 'Confirm PIN' : 'Next'}
        </Text>
      </Pressable>
    </View>
  );
}

function NumpadKey({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.numpadKey, pressed && styles.numpadKeyPressed]}
      onPress={onPress}
    >
      <Text style={styles.numpadKeyText}>{label}</Text>
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
    fontSize: 28,
    color: '#ffffff',
    ...Fonts.grotesk.bold,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    fontFamily: Fonts.inter.regular,
    textAlign: 'center',
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
    marginBottom: 8,
    minHeight: 18,
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
    marginTop: 32,
    marginBottom: 32,
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
  doneBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneBtnPressed: { opacity: 0.7 },
  doneBtnText: {
    fontSize: 16,
    color: '#ffffff',
    ...Fonts.grotesk.semiBold,
  },
});
