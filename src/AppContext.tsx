import React, { createContext, useContext } from 'react';
import type { DB } from '@op-engineering/op-sqlite';
import type { Category } from './db/types';

export type AppContextValue = {
  db: DB;
  collectionRoot: string;
  category: Category;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: AppContextValue;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
