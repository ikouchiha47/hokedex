import React from 'react';

const registry = new Map<string, React.FC<any>>();

export function registerScene(type: string, component: React.FC<any>): void {
  if (registry.has(type)) throw new Error(`duplicate scene registration: ${type}`);
  registry.set(type, component);
}

export function resolveScene(type: string): React.FC<any> {
  const c = registry.get(type);
  if (!c) throw new Error(`unknown scene type: ${type}`);
  return c;
}
