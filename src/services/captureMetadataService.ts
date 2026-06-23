import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { getWeatherForCapture, type CaptureWeather } from './captureWeather';

const { HokedexGeocoder } = NativeModules;

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location Permission',
      message: 'Hokédex uses your location to attach place and weather to moments.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export type CaptureMetadata = {
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
  weatherTemp: number | null;
  weatherCondition: string | null;
};

export async function resolveCaptureMetadata(): Promise<CaptureMetadata> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    return { latitude: null, longitude: null, placeName: null, weatherTemp: null, weatherCondition: null };
  }

  let lat: number | null = null;
  let lon: number | null = null;
  try {
    const coords: { latitude: number; longitude: number } = await HokedexGeocoder.getLocation();
    lat = coords.latitude;
    lon = coords.longitude;
  } catch {
    return { latitude: null, longitude: null, placeName: null, weatherTemp: null, weatherCondition: null };
  }

  const [placeName, weather] = await Promise.all([
    getCityNameSafe(lat, lon),
    getWeatherForCapture(lat, lon),
  ]);

  return {
    latitude: lat,
    longitude: lon,
    placeName,
    weatherTemp: weather?.temp ?? null,
    weatherCondition: weather?.condition ?? null,
  };
}

async function getCityNameSafe(lat: number, lon: number): Promise<string | null> {
  try {
    return (await HokedexGeocoder.getCityName(lat, lon)) as string;
  } catch {
    return null;
  }
}
