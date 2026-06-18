import React, { createContext, useContext } from 'react';
import { RegistryBundle, createRegistryBundle } from './registry-bundle';

// Fallback bundle — used if no provider is present (e.g. standalone VideoPlayer usage).
const fallbackBundle = createRegistryBundle();

export const RegistryContext = createContext<RegistryBundle>(fallbackBundle);

export function useRegistry(): RegistryBundle {
  return useContext(RegistryContext);
}
