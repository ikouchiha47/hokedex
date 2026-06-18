import { Preset } from '../presets/types';

export type PresetRegistry = {
  register(id: string, preset: Omit<Preset, 'id'>): void;
  resolve(id: string): Preset;
  list(): Preset[];
};

export function createPresetRegistry(): PresetRegistry {
  const map = new Map<string, Preset>();
  return {
    register(id, preset) {
      if (map.has(id)) throw new Error(`duplicate preset registration: ${id}`);
      map.set(id, { ...preset, id });
    },
    resolve(id) {
      const p = map.get(id);
      if (!p) throw new Error(`unknown preset: ${id}`);
      return p;
    },
    list() {
      return Array.from(map.values());
    },
  };
}

const _default = createPresetRegistry();
export const registerPreset = _default.register.bind(_default);
export const resolvePreset  = _default.resolve.bind(_default);
export const listPresets    = _default.list.bind(_default);
