export const APP_VERSION = '1.5.1';

export const RELEASES_BASE_URL = 'https://github.com/parodevstudios/hokedex/releases';

export const UPDATE_CHECK_URL = 'https://api.github.com/repos/parodevstudios/hokedex/releases/latest';

export const APK_DOWNLOAD_URL = `${RELEASES_BASE_URL}/latest/download/hokedex.apk`;

export function apkUrlForVersion(tag: string): string {
  return `${RELEASES_BASE_URL}/download/${tag}/hokedex.apk`;
}
