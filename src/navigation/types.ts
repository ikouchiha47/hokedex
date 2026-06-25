import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Moments: undefined;
  People: undefined;
  Maps: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  CollectionList: undefined;
  NewEntry: { prefillImageUri?: string };
  EntryDetail: { entryId: string; prefillImageUri?: string };
  SearchResult: { preloadedImageUri?: string } | undefined;
  Insights: undefined;
  Settings: { onReset?: () => void };
  ShareIntake: { imageUri: string };
};
