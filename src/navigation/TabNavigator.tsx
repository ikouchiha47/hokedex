import React from 'react';
import { Pressable } from 'react-native';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Home, Clock, Users, Calendar, Settings, MapPin } from '../components/icons';

import type { TabParamList, RootStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { TimelineScreen } from '../screens/TimelineScreen';
import { PeopleScreen } from '../screens/PeopleScreen';
import { PlannerScreen } from '../screens/PlannerScreen';

const BG_DARK = '#090a1c';
const ACCENT = '#c0170d';
const TAB_BAR_BG = 'rgba(6,6,14,0.97)';
const TAB_BAR_BORDER = 'rgba(255,255,255,0.06)';
const TAB_INACTIVE = 'rgba(255,255,255,0.4)';
const TAB_BAR_HEIGHT = 58;
const ICON_SIZE = 22;
const HEADER_ICON_SIZE = 20;

export const timelineMapRef = React.createRef<{ toggleMap: () => void }>();

function TimelineTabScreen() {
  return <TimelineScreen mapToggleRef={timelineMapRef} />;
}

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: TAB_BAR_BG,
          borderTopColor: TAB_BAR_BORDER,
          height: TAB_BAR_HEIGHT,
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: TAB_INACTIVE,
        headerStyle: { backgroundColor: BG_DARK },
        headerTintColor: '#ffffff',
        headerShown: true,
        headerRight: () => (
          <Pressable
            onPress={() => navigation.navigate('Settings', {})}
            style={{ marginRight: 16 }}
          >
            <Settings color={TAB_INACTIVE} size={HEADER_ICON_SIZE} />
          </Pressable>
        ),
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <Home color={color} size={ICON_SIZE} />,
        }}
      />
      <Tab.Screen
        name="Timeline"
        component={TimelineTabScreen}
        options={{
          tabBarIcon: ({ color }) => <Clock color={color} size={ICON_SIZE} />,
          headerRight: () => (
            <Pressable
              onPress={() => timelineMapRef.current?.toggleMap()}
              style={{ marginRight: 16 }}
            >
              <MapPin color="#ffffff" size={HEADER_ICON_SIZE} />
            </Pressable>
          ),
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
        name="Planner"
        component={PlannerScreen}
        options={{
          tabBarIcon: ({ color }) => <Calendar color={color} size={ICON_SIZE} />,
        }}
      />
    </Tab.Navigator>
  );
}
