// Deterministic accent color per entry derived from pHash.
// Add/reorder only at the end to avoid changing existing entries' colors.
export const ACCENT_PALETTE = [
  '#7c3aed', // violet
  '#db2777', // pink
  '#059669', // emerald
  '#d97706', // amber
  '#2563eb', // blue
  '#dc2626', // red
  '#0891b2', // cyan
  '#65a30d', // lime
  '#9333ea', // purple
  '#ea580c', // orange
  '#0d9488', // teal
  '#be185d', // rose
] as const;

export function accentForEntry(pHash: number, colorTag?: string | null): string {
  if (colorTag && /^#[0-9a-fA-F]{6}$/.test(colorTag)) return colorTag;
  return ACCENT_PALETTE[Math.abs(pHash) % ACCENT_PALETTE.length];
}
