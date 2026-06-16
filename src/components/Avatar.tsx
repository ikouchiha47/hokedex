import React from 'react';
import { Text, Image } from 'react-native';
import { colorFromId } from './ActivityCalendar';

type Props = {
  size: number;
  photoUri?: string | null;
  name: string;
  id: string;
};

export function Avatar({ size, photoUri, name, id }: Props) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  const bg = colorFromId(id);
  const fontSize = Math.round(size * 0.38);

  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <Text style={{ fontSize, color: '#ffffff', fontFamily: 'SpaceGrotesk', fontWeight: '700', includeFontPadding: false }}>{initial}</Text>
  );
}
