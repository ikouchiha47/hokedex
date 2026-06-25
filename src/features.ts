import type { PermissionId } from './services/permissions/PermissionRegistry';

export const FEATURE_PERMISSIONS = {
  camera:  ['camera', 'gallery', 'voice', 'location'] as PermissionId[],
  moments: ['gallery']            as PermissionId[],
  maps:    ['location']           as PermissionId[],
  voice:   ['voice']              as PermissionId[],
} as const;

export type FeatureId = keyof typeof FEATURE_PERMISSIONS;

export const ALL_PERMISSIONS: PermissionId[] = [
  ...new Set(Object.values(FEATURE_PERMISSIONS).flat()),
] as PermissionId[];
