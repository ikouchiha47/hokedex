/**
 * Parse a decimal string that represents a 64-bit integer arriving from a Kotlin native module.
 * The RN bridge cannot transmit Long as a JS number without precision loss, so Kotlin sends
 * large integers as decimal strings. This function is the single parse point.
 *
 * Throws if the value is not a finite number.
 */
export function parseLongFromBridge(value: string, fieldName: string): number {
  const n = Number(value);
  if (isNaN(n) || !isFinite(n)) {
    throw new Error(`Invalid numeric value for "${fieldName}" received from native: ${value}`);
  }
  return n;
}
