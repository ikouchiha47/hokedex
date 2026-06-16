import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CollectionListScreen } from '../screens/CollectionListScreen';
import { NewEntryScreen } from '../screens/NewEntryScreen';
import { EntryDetailScreen } from '../screens/EntryDetailScreen';
import { SearchResultScreen } from '../screens/SearchResultScreen';
import { InsightsScreen } from '../screens/InsightsScreen';

export type RootStackParamList = {
  CollectionList: undefined;
  NewEntry: { prefillImageUri?: string };
  EntryDetail: { entryId: string; prefillImageUri?: string };
  SearchResult: undefined;
  Insights: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <SafeAreaProvider>
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="CollectionList"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="CollectionList" component={CollectionListScreen} />
        <Stack.Screen name="NewEntry" component={NewEntryScreen} />
        <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
        <Stack.Screen name="SearchResult" component={SearchResultScreen} />
        <Stack.Screen name="Insights" component={InsightsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}
