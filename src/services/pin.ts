import { NativeModules } from 'react-native';

const { PinModule } = NativeModules;

if (!PinModule) {
  console.warn('PinModule native module not found — PIN operations will be no-ops');
}

/**
 * Returns true if a PIN has been set.
 */
export function hasPin(): Promise<boolean> {
  return PinModule?.hasPin() ?? Promise.resolve(false);
}

/**
 * Hash and store a new PIN via PBKDF2-SHA256 in EncryptedSharedPreferences.
 */
export function setPin(pin: string): Promise<void> {
  return PinModule?.setPin(pin) ?? Promise.resolve();
}

/**
 * Verify a PIN candidate against the stored hash.
 * Returns true if it matches, false otherwise.
 */
export function verifyPin(pin: string): Promise<boolean> {
  return PinModule?.verifyPin(pin) ?? Promise.resolve(false);
}

/**
 * Remove the stored PIN hash and salt.
 */
export function clearPin(): Promise<void> {
  return PinModule?.clearPin() ?? Promise.resolve();
}

/**
 * Returns true if the device has enrolled biometric hardware available.
 */
export function isBiometricAvailable(): Promise<boolean> {
  return PinModule?.isBiometricAvailable() ?? Promise.resolve(false);
}

/**
 * Get whether biometric unlock is enabled by the user.
 */
export function getBiometricEnabled(): Promise<boolean> {
  return PinModule?.getBiometricEnabled() ?? Promise.resolve(false);
}

/**
 * Set whether biometric unlock is enabled.
 */
export function setBiometricEnabled(enabled: boolean): Promise<void> {
  return PinModule?.setBiometricEnabled(enabled) ?? Promise.resolve();
}
