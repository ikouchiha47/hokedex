import { ElementRenderer } from './element';

export type ElementRegistry = {
  register(name: string, renderer: ElementRenderer): void;
  resolve(name: string): ElementRenderer;
};

export function createElementRegistry(): ElementRegistry {
  const map = new Map<string, ElementRenderer>();
  return {
    register(name, renderer) {
      if (map.has(name)) throw new Error(`duplicate element registration: ${name}`);
      map.set(name, renderer);
    },
    resolve(name) {
      const r = map.get(name);
      if (!r) throw new Error(`unknown element: ${name}`);
      return r;
    },
  };
}

const _default = createElementRegistry();
export const registerElement = _default.register.bind(_default);
export const resolveElement  = _default.resolve.bind(_default);
