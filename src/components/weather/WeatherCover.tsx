import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import type { WeatherSceneConfig } from '../../types/weather';

import { WeatherScene } from './WeatherScene';
import { getFallbackWeatherSceneConfig, getWeatherLabel } from '../../services/weatherScene';

const COVER_HEIGHT_RATIO = 0.72;
const MIN_COVER_HEIGHT = 250;
const MAX_COVER_HEIGHT = 320;

type Props = {
  sceneConfig?: WeatherSceneConfig;
  width?: number;
  height?: number;
  temp?: number;
  city?: string;
  feelsLike?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function WeatherCover({
  sceneConfig,
  width,
  height,
  temp,
  city,
  feelsLike,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const coverWidth = width ?? windowWidth;
  const coverHeight = height ?? Math.round(clamp(coverWidth * COVER_HEIGHT_RATIO, MIN_COVER_HEIGHT, MAX_COVER_HEIGHT));
  const showInfo = temp !== undefined && city;

  const horizontalPadding = clamp(coverWidth * 0.045, 18, 26);
  const bottomPadding = clamp(coverWidth * 0.03, 12, 18);
  const topPadding = clamp(coverWidth * 0.05, 18, 24);
  const tempFontSize = clamp(coverWidth * 0.13, 44, 58);
  const cityFontSize = clamp(coverWidth * 0.04, 14, 17);
  const descFontSize = clamp(coverWidth * 0.032, 12, 14);

  const config = sceneConfig ?? getFallbackWeatherSceneConfig();
  const label = getWeatherLabel(config.kind);

  return (
    <View style={{ width: coverWidth, height: coverHeight }}>
      <View style={[styles.scene, { width: coverWidth, height: coverHeight }]}>
        <WeatherScene config={config} width={coverWidth} height={coverHeight} />
      </View>

      {showInfo && (
        <View
          style={[
            styles.infoOverlay,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: bottomPadding,
              paddingTop: topPadding,
            },
          ]}
        >
          <Text style={[styles.temp, { fontSize: tempFontSize, lineHeight: tempFontSize + 4 }]}>{temp}°C</Text>
          <View style={styles.infoRight}>
            <Text style={[styles.city, { fontSize: cityFontSize, lineHeight: cityFontSize + 4 }]}>{city}</Text>
            <Text style={[styles.desc, { fontSize: descFontSize, lineHeight: descFontSize + 4 }]}>
              {label}{feelsLike !== undefined ? ` · feels like ${feelsLike}°C` : ''}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9,10,28,0.2)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  temp: {
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  infoRight: {
    alignItems: 'flex-end',
  },
  city: {
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  desc: {
    color: 'rgba(255,255,255,0.55)',
  },
});
