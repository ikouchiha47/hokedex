import React from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CollectionListScreen } from '../screens/CollectionListScreen';
import { NewEntryScreen } from '../screens/NewEntryScreen';
import { EntryDetailScreen } from '../screens/EntryDetailScreen';
import { SearchResultScreen } from '../screens/SearchResultScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ShareIntakeScreen } from '../screens/ShareIntakeScreen';

export type RootStackParamList = {
  CollectionList: undefined;
  NewEntry: { prefillImageUri?: string };
  EntryDetail: { entryId: string; prefillImageUri?: string };
  SearchResult: { preloadedImageUri?: string } | undefined;
  Insights: undefined;
  Settings: { onReset?: () => void };
  ShareIntake: { imageUri: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  onReset?: () => void;
  navigationRef?: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
  initialSharedImageUri?: string;
};

export function RootNavigator({ onReset, navigationRef, initialSharedImageUri }: Props = {}) {
  const initialRoute: keyof RootStackParamList = initialSharedImageUri ? 'ShareIntake' : 'CollectionList';

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0a0a0a' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="CollectionList">
            {props => <CollectionListScreen {...props} onReset={onReset} />}
          </Stack.Screen>
          <Stack.Screen name="NewEntry" component={NewEntryScreen} />
          <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
          <Stack.Screen name="SearchResult" component={SearchResultScreen} />
          <Stack.Screen name="Insights" component={InsightsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen
            name="ShareIntake"
            component={ShareIntakeScreen}
            initialParams={initialSharedImageUri ? { imageUri: initialSharedImageUri } : undefined}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
