import { createSceneRegistry, SceneRegistry } from './scene-registry';

// Only scene registry is per-composition — scenes are bare-string keyed ('screenshot', 'chips')
// and collide when multiple projects load into the same webpack bundle.
// Effects/elements/overlays/presets use 'core:' namespacing and stay as global singletons.
export type RegistryBundle = {
  scenes: SceneRegistry;
};

export function createRegistryBundle(): RegistryBundle {
  return {
    scenes: createSceneRegistry(),
  };
}
