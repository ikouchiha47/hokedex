import { UPDATE_CHECK_URL, APP_VERSION } from '../config';

export type UpdateInfo = {
  available: boolean;
  latestVersion: string;
  currentVersion: string;
};

function parseVersion(tag: string): number[] {
  return tag.replace(/^v/, '').split('.').map(Number);
}

function isNewer(latest: string, current: string): boolean {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lv = l[i] ?? 0;
    const cv = c[i] ?? 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const res = await fetch(UPDATE_CHECK_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json() as { tag_name?: string };
  const latestVersion: string = data.tag_name ?? '';
  return {
    available: isNewer(latestVersion, APP_VERSION),
    latestVersion,
    currentVersion: APP_VERSION,
  };
}
