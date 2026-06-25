import { PermissionsAndroid, Platform } from 'react-native';

export type PermissionGateResult = 'granted' | 'denied' | 'unavailable';

export type PermissionId =
  | 'camera'
  | 'gallery'
  | 'analysePhotos'
  | 'voice'
  | 'location';

export type PermissionState = Record<PermissionId, boolean>;

async function requestAndroid(permission: string): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(permission as never);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function checkAndroid(permission: string): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return PermissionsAndroid.check(permission as never);
}

export async function requestPermission(id: PermissionId): Promise<boolean> {
  switch (id) {
    case 'camera':
      return requestAndroid(PermissionsAndroid.PERMISSIONS.CAMERA);

    case 'gallery':
    case 'analysePhotos': {
      const perm = (PermissionsAndroid.PERMISSIONS as Record<string, string>).READ_MEDIA_IMAGES
        ?? PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      return requestAndroid(perm);
    }

    case 'voice':
      return requestAndroid(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

    case 'location':
      return requestAndroid(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

    default:
      return false;
  }
}

export async function checkPermission(id: PermissionId): Promise<boolean> {
  switch (id) {
    case 'camera':
      return checkAndroid(PermissionsAndroid.PERMISSIONS.CAMERA);

    case 'gallery':
    case 'analysePhotos': {
      const perm = (PermissionsAndroid.PERMISSIONS as Record<string, string>).READ_MEDIA_IMAGES
        ?? PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      return checkAndroid(perm);
    }

    case 'voice':
      return checkAndroid(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

    case 'location':
      return checkAndroid(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

    default:
      return false;
  }
}

export async function checkAllPermissions(): Promise<PermissionState> {
  const [camera, gallery, voice, location] = await Promise.all([
    checkPermission('camera'),
    checkPermission('gallery'),
    checkPermission('voice'),
    checkPermission('location'),
  ]);
  return {
    camera,
    gallery,
    analysePhotos: gallery,
    voice,
    location,
  };
}
