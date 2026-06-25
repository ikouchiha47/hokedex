import React, { useEffect, useImperativeHandle } from 'react';

import type { ModeProps } from '../../types/capture';

export interface ContactModeHandle {
  trigger: () => void;
}

export const ContactMode = React.forwardRef<ContactModeHandle, ModeProps>(
  function ContactMode({ onCapture, onReady }, ref) {
    useEffect(() => {
      onReady();
    }, [onReady]);

    useImperativeHandle(
      ref,
      () => ({ trigger: () => onCapture({ type: 'contact' }) }),
      [onCapture],
    );

    return null;
  },
);
