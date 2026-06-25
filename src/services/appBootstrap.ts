import { NativeModules } from 'react-native';
import { initDatabase } from '../db/init';
import { wipeStagingDir } from './ingestion';
import { getCategory } from '../db/queries/categories';
import { getSetting } from '../db/queries/app_settings';
import { resetStalledJobs } from '../db/queries/processing_queue';
import { hasPin } from './pin';
import { getInitialSharedImage } from './share';
import { SETTINGS, CATEGORY_ID } from '../constants';
import type { DB } from '@op-engineering/op-sqlite';
import type { Category } from '../db/types';

export type BootstrapResult = {
  db: DB;
  collectionRoot: string;
  category: Category;
  pinExists: boolean;
  onboardingDone: boolean;
  sharedUri: string | null;
};

export async function defaultBootstrap(): Promise<BootstrapResult> {
  const { HokedexIngest } = NativeModules;
  const root: string = await HokedexIngest.getCollectionRoot();
  await wipeStagingDir(root);
  const db = await initDatabase(root);
  await resetStalledJobs(db);

  const category = getCategory(db, CATEGORY_ID.PEOPLE);
  if (!category) throw new Error('People category not seeded — run migrations.');

  const [pinExists, sharedUri, onboardingDone] = await Promise.all([
    hasPin(),
    getInitialSharedImage(),
    getSetting(db, SETTINGS.ONBOARDING_COMPLETE),
  ]);

  return {
    db,
    collectionRoot: root,
    category,
    pinExists: !!pinExists,
    onboardingDone: !!onboardingDone,
    sharedUri,
  };
}
