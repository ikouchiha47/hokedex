import React from 'react';
import { ChipItem } from '../types';
import { RadiateEffect } from './layouts/RadiateEffect';
import { RadialSpokeEffect } from './layouts/RadialSpokeEffect';

type ChipEffect = React.FC<{
  items: ChipItem[];
  stamp?: { text: string; accentWord: string; at: number };
}>;

// Add new layouts here only. ChipsScene never changes again.
const LayoutRegistry: Record<string, ChipEffect> = {
  'radiate':      RadiateEffect,
  'radial-spoke': RadialSpokeEffect,
};

type Props = {
  items: ChipItem[];
  layout: string;
  stamp?: { text: string; accentWord: string; at: number };
};

export const ChipsScene: React.FC<Props> = ({ items, layout, stamp }) => {
  const Effect = LayoutRegistry[layout];
  if (!Effect) throw new Error(`Unknown chip layout: ${layout}`);
  return <Effect items={items} stamp={stamp} />;
};
