import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';

import { SunnyScene } from './SunnyScene';
import { RainyScene } from './RainyScene';
import { SnowyScene } from './SnowyScene';
import { ThunderstormScene } from './ThunderstormScene';

export type WeatherState = 'sunny' | 'rainy' | 'snowy' | 'thunderstorm';

const WINDOW_WIDTH = Dimensions.get('window').width;
const COVER_HEIGHT = Math.round(WINDOW_WIDTH * 0.54);

type Props = {
  weatherState?: WeatherState;
  width?: number;
  height?: number;
};

export function WeatherCover({ weatherState = 'sunny', width = WINDOW_WIDTH, height = COVER_HEIGHT }: Props) {
  return (
    <View style={[styles.container, { width, height }]}>
      {weatherState === 'sunny' && <SunnyScene width={width} height={height} />}
      {weatherState === 'rainy' && <RainyScene width={width} height={height} />}
      {weatherState === 'snowy' && <SnowyScene width={width} height={height} />}
      {weatherState === 'thunderstorm' && <ThunderstormScene width={width} height={height} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
