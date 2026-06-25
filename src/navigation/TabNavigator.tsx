import React from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Camera, Image, Users, Map, Menu } from '../components/icons';

import type { TabParamList, RootStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { MomentsScreen } from '../screens/MomentsScreen';
import { PeopleScreen } from '../screens/PeopleScreen';
import { MapsScreen } from '../screens/MapsScreen';

const BG_DARK = '#090a1c';
const ACCENT = '#c0170d';
const TAB_BAR_BG = 'rgba(6,6,14,0.97)';
const TAB_BAR_BORDER = 'rgba(255,255,255,0.06)';
const TAB_INACTIVE = 'rgba(255,255,255,0.4)';
const TAB_BAR_HEIGHT = 58;
const ICON_SIZE = 22;
const HEADER_ICON_SIZE = 20;

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle:
          route.name === 'Home'
            ? { display: 'none' }
            : {
                backgroundColor: TAB_BAR_BG,
                borderTopColor: TAB_BAR_BORDER,
                height: TAB_BAR_HEIGHT + insets.bottom,
                paddingBottom: insets.bottom,
              },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: TAB_INACTIVE,
        headerStyle: { backgroundColor: BG_DARK },
        headerTintColor: '#ffffff',
        headerRight: () => (
          <Pressable
            onPress={() => navigation.navigate('Settings', {})}
            style={{ marginRight: 16 }}
          >
            <Menu color={TAB_INACTIVE} size={HEADER_ICON_SIZE} />
          </Pressable>
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <Camera color={color} size={ICON_SIZE} />,
        }}
      />
      <Tab.Screen
        name="Moments"
        component={MomentsScreen}
        options={{
          tabBarIcon: ({ color }) => <Image color={color} size={ICON_SIZE} />,
        }}
      />
      <Tab.Screen
        name="People"
        component={PeopleScreen}
        options={{
          tabBarIcon: ({ color }) => <Users color={color} size={ICON_SIZE} />,
        }}
      />
      <Tab.Screen
        name="Maps"
        component={MapsScreen}
        options={{
          tabBarIcon: ({ color }) => <Map color={color} size={ICON_SIZE} />,
        }}
      />
    </Tab.Navigator>
  );
}
