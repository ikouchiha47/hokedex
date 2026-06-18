import { ElementRenderer } from './element';

const registry = new Map<string, ElementRenderer>();

export function registerElement(name: string, renderer: ElementRenderer): void {
  if (registry.has(name)) {
    throw new Error(`duplicate element registration: ${name}`);
  }
  registry.set(name, renderer);
}

export function resolveElement(name: string): ElementRenderer {
  const r = registry.get(name);
  if (!r) {
    throw new Error(`unknown element: ${name}`);
  }
  return r;
}
