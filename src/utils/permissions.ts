import { PermissionsAndroid, Platform } from 'react-native';

export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  // READ_MEDIA_IMAGES is Android 13+; READ_EXTERNAL_STORAGE for older
  const perm = (PermissionsAndroid.PERMISSIONS as Record<string, string>).READ_MEDIA_IMAGES
    ?? PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const result = await PermissionsAndroid.request(perm as never);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
