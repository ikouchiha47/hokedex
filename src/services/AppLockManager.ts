/**
 * AppLockManager — pure time-based lifecycle manager.
 * No React, no UI. Tracks when the app was backgrounded and determines
 * whether a lock screen should be shown on foreground.
 *
 * Lock threshold: 60 seconds.
 */

const LOCK_AFTER_MS = 60_000;

let backgroundedAt: number | null = null;

/**
 * Call when the app transitions to the background.
 * Records the current timestamp.
 */
export function onBackground(): void {
  backgroundedAt = Date.now();
}

/**
 * Call when the app returns to the foreground.
 * Returns true if more than 60 seconds have elapsed since backgrounding,
 * meaning the lock screen should be shown.
 * Also resets the background timer.
 */
export function onForeground(): boolean {
  if (backgroundedAt === null) return false;
  const elapsed = Date.now() - backgroundedAt;
  backgroundedAt = null;
  return elapsed > LOCK_AFTER_MS;
}

/**
 * Reset the background timer without checking elapsed time.
 * Call this after a successful unlock.
 */
export function resetTimer(): void {
  backgroundedAt = null;
}

/**
 * Exposed for testing: inject a backgroundedAt timestamp directly.
 * @internal
 */
export function _setBackgroundedAt(ts: number | null): void {
  backgroundedAt = ts;
}
