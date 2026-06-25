import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { checkPermission, requestPermission } from './PermissionRegistry';
import type { PermissionId } from './PermissionRegistry';

type Handlers = Partial<Record<PermissionId, () => void>>;

type Options = {
  onSuccess?: Handlers;
  onFailure?: Handlers;
};

export function useFeaturePermissions(
  permissions: readonly PermissionId[],
  handlers: Options = {},
  key?: string,
) {
  const permKey = key ?? permissions.join(',');

  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => {
      let cancelled = false;

      async function check() {
        for (const id of permissions) {
          if (cancelled) break;

          const already = await checkPermission(id);
          if (already) {
            handlers.onSuccess?.[id]?.();
            continue;
          }

          const granted = await requestPermission(id);
          if (granted) {
            handlers.onSuccess?.[id]?.();
          } else {
            handlers.onFailure?.[id]?.();
          }
        }
      }

      check();
      return () => { cancelled = true; };
    // permKey changing re-runs the effect for the new mode's permissions
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permKey]),
  );
}
