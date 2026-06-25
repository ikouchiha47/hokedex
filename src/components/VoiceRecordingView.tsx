import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Fonts } from '../theme/fonts';

type RecordState = 'idle' | 'deciding' | 'holding' | 'handsfree' | 'saving';

const DECIDE_MS = 250;
const MIN_RECORD_MS = 500;
const BAR_COUNT = 24;

export interface VoiceRecordingViewHandle {
  onPressIn: () => void;
  onPressOut: () => void;
  onStop: () => void;
}

interface Props {
  onRecordingStateChange: (isRecording: boolean) => void;
  onSave: (audioUri: string | null) => void;
  onDiscard: () => void;
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export const VoiceRecordingView = React.forwardRef<VoiceRecordingViewHandle, Props>(
  ({ onRecordingStateChange, onSave, onDiscard }, ref) => {
    const [recordState, setRecordState] = useState<RecordState>('idle');
    const [duration, setDuration] = useState(0);
    const [bars] = useState(() =>
      Array.from({ length: BAR_COUNT }, () => Math.random() * 0.5 + 0.15),
    );

    const stateRef = useRef<RecordState>('idle');
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const decideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startTimeRef = useRef(0);

    const dotScale = useSharedValue(1);
    const dotOpacity = useSharedValue(0);

    const updateState = useCallback(
      (next: RecordState) => {
        stateRef.current = next;
        setRecordState(next);
        onRecordingStateChange(next === 'holding' || next === 'handsfree');
      },
      [onRecordingStateChange],
    );

    const startRecording = useCallback(() => {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current);
      }, 100);
      // TODO: VoiceRecordingService.start() once audio library is added
    }, []);

    const stopRecording = useCallback(() => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // TODO: return VoiceRecordingService.stop() — returns file URI
      return null as string | null;
    }, []);

    useEffect(() => {
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (decideTimerRef.current) clearTimeout(decideTimerRef.current);
      };
    }, []);

    useEffect(() => {
      const isRec = recordState === 'holding' || recordState === 'handsfree';
      if (isRec) {
        dotOpacity.value = 1;
        dotScale.value = withRepeat(
          withSequence(
            withTiming(1.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        );
      } else {
        cancelAnimation(dotScale);
        cancelAnimation(dotOpacity);
        dotScale.value = withTiming(1, { duration: 200 });
        dotOpacity.value = withTiming(0, { duration: 200 });
      }
    }, [recordState, dotScale, dotOpacity]);

    const dotAnimStyle = useAnimatedStyle(() => ({
      transform: [{ scale: dotScale.value }],
      opacity: dotOpacity.value,
    }));

    const handlePressIn = useCallback(() => {
      if (stateRef.current !== 'idle') return;
      updateState('deciding');
      decideTimerRef.current = setTimeout(() => {
        if (stateRef.current !== 'deciding') return;
        startRecording();
        updateState('holding');
      }, DECIDE_MS);
    }, [updateState, startRecording]);

    const handlePressOut = useCallback(() => {
      if (stateRef.current === 'deciding') {
        clearTimeout(decideTimerRef.current!);
        startRecording();
        updateState('handsfree');
        return;
      }
      if (stateRef.current === 'holding') {
        const elapsed = Date.now() - startTimeRef.current;
        stopRecording();
        if (elapsed < MIN_RECORD_MS) {
          setDuration(0);
          updateState('idle');
          return;
        }
        updateState('saving');
      }
    }, [updateState, startRecording, stopRecording]);

    const handleStop = useCallback(() => {
      if (stateRef.current !== 'handsfree') return;
      stopRecording();
      updateState('saving');
    }, [updateState, stopRecording]);

    React.useImperativeHandle(ref, () => ({
      onPressIn: handlePressIn,
      onPressOut: handlePressOut,
      onStop: handleStop,
    }));

    const isRec = recordState === 'holding' || recordState === 'handsfree';

    return (
      <View style={styles.root}>
        <View style={styles.dotRow}>
          <Animated.View style={[styles.dot, dotAnimStyle]} />
          {isRec && <Text style={styles.recLabel}>REC</Text>}
        </View>

        <Text style={styles.timer}>{formatDuration(duration)}</Text>

        <View style={styles.waveform}>
          {bars.map((h, i) => (
            <View
              key={i}
              style={[styles.bar, { height: `${h * 100}%`, opacity: isRec ? 1 : 0.3 }]}
            />
          ))}
        </View>

        {recordState === 'idle' && (
          <Text style={styles.hint}>tap for hands-free · hold to record</Text>
        )}
        {recordState === 'handsfree' && (
          <Text style={styles.hint}>tap stop when done</Text>
        )}
        {recordState === 'deciding' && (
          <ActivityIndicator color="#7c3aed" size="small" />
        )}

        {recordState === 'saving' && (
          <View style={styles.saveOverlay}>
            <Text style={styles.saveTitle}>Save recording?</Text>
            <Text style={styles.saveDuration}>{formatDuration(duration)}</Text>
            <View style={styles.saveActions}>
              <Pressable
                style={styles.saveBtn}
                onPress={() => {
                  onSave(null);
                  setDuration(0);
                  updateState('idle');
                }}
              >
                <Text style={styles.saveBtnText}>Save as Moment</Text>
              </Pressable>
              <Pressable
                style={styles.discardBtn}
                onPress={() => {
                  setDuration(0);
                  updateState('idle');
                  onDiscard();
                }}
              >
                <Text style={styles.discardBtnText}>Discard</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090a1c',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#dc2626',
  },
  recLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#dc2626',
    fontFamily: Fonts.inter.medium,
  },
  timer: {
    fontSize: 52,
    color: '#ffffff',
    ...Fonts.grotesk.bold,
    letterSpacing: -2,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    gap: 3,
    paddingHorizontal: 32,
    width: '100%',
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    backgroundColor: '#7c3aed',
    minHeight: 4,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
    fontFamily: Fonts.inter.regular,
  },
  saveOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9,10,28,0.97)',
    padding: 32,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  saveTitle: {
    fontSize: 18,
    color: '#ffffff',
    ...Fonts.grotesk.semiBold,
  },
  saveDuration: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Fonts.inter.regular,
  },
  saveActions: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  saveBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    color: '#ffffff',
    ...Fonts.grotesk.semiBold,
  },
  discardBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  discardBtnText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    fontFamily: Fonts.inter.regular,
  },
});
