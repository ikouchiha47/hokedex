/**
 * share.ts — Pure JS bridge for the Android Share Sheet integration.
 *
 * Responsibilities:
 *   - getInitialSharedImage(): ask native for the image path from a cold-launch intent
 *   - clearSharedImage(): tell native to clear the stored path after we've handled it
 *   - onSharedImage(cb): subscribe to hot-launch events, returns an unsubscribe fn
 *
 * No UI, no side-effects beyond bridge calls. Fully testable in isolation.
 */

import { NativeModules, NativeEventEmitter } from 'react-native';

const { HokedexShare } = NativeModules;

const emitter = new NativeEventEmitter(HokedexShare);

const SHARED_IMAGE_EVENT = 'hokedex:sharedImage';

/**
 * Returns the file path of an image shared on cold launch, or null if the app
 * was not launched via the Share Sheet (or if clearSharedImage was already called).
 */
export async function getInitialSharedImage(): Promise<string | null> {
  return HokedexShare.getInitialSharedImage();
}

/**
 * Clears the pending shared image path from native storage.
 * Call this after you have finished handling the shared image.
 */
export async function clearSharedImage(): Promise<void> {
  return HokedexShare.clearSharedImage();
}

/**
 * Subscribe to shared images arriving while the app is already running (hot launch).
 *
 * @param callback - called with the file path of the shared image
 * @returns unsubscribe function — call it in useEffect cleanup
 */
export function onSharedImage(callback: (path: string) => void): () => void {
  const subscription = emitter.addListener(
    SHARED_IMAGE_EVENT,
    (event: { path: string }) => {
      callback(event.path);
    }
  );
  return () => subscription.remove();
}
