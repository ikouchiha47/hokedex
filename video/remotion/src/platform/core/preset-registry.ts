import { Preset } from '../presets/types';

const registry = new Map<string, Preset>();

export function registerPreset(id: string, preset: Omit<Preset, 'id'>): void {
  if (registry.has(id)) throw new Error(`duplicate preset registration: ${id}`);
  registry.set(id, { ...preset, id });
}

export function resolvePreset(id: string): Preset {
  const p = registry.get(id);
  if (!p) throw new Error(`unknown preset: ${id}`);
  return p;
}

export function listPresets(): Preset[] {
  return Array.from(registry.values());
}
