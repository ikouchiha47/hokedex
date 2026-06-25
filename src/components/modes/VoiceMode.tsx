import React, { useImperativeHandle, useRef } from 'react';
import {
  VoiceRecordingView,
  type VoiceRecordingViewHandle,
} from '../VoiceRecordingView';
import { useFeaturePermissions } from '../../services/permissions/useFeaturePermissions';
import type { ModeProps } from '../../types/capture';

export interface VoiceModeHandle {
  onPressIn: () => void;
  onPressOut: () => void;
  onStop: () => void;
}

type Props = ModeProps & {
  onRecordingStateChange: (isRecording: boolean) => void;
};

export const VoiceMode = React.forwardRef<VoiceModeHandle, Props>(
  function VoiceMode({ onCapture, onReady, onBlocked, onRecordingStateChange }, ref) {
    const voiceRef = useRef<VoiceRecordingViewHandle>(null);

    useFeaturePermissions(
      ['voice'],
      {
        onSuccess: { voice: () => onReady() },
        onFailure: { voice: () => onBlocked() },
      },
      'voice-mode',
    );

    useImperativeHandle(
      ref,
      () => ({
        onPressIn: () => voiceRef.current?.onPressIn(),
        onPressOut: () => voiceRef.current?.onPressOut(),
        onStop: () => voiceRef.current?.onStop(),
      }),
      [],
    );

    return (
      <VoiceRecordingView
        ref={voiceRef}
        onRecordingStateChange={onRecordingStateChange}
        onSave={uri => onCapture({ type: 'voice', uri })}
        onDiscard={() => {}}
      />
    );
  },
);
