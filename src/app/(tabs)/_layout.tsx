/**
 * Layout des 5 onglets principaux de Junix Pulse.
 * Navigation : Aujourd'hui | Tâches | Calendrier | Personnes | Pulse
 */
import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Surface,
  Primary,
  OnSurface,
  Outline,
  Tertiary,
} from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconName;
  iconFocused: IoniconName;
}

const TABS: TabConfig[] = [
  {
    name: 'index',
    title: "Aujourd'hui",
    icon: 'sunny-outline',
    iconFocused: 'sunny',
  },
  {
    name: 'tasks',
    title: 'Tâches',
    icon: 'checkmark-circle-outline',
    iconFocused: 'checkmark-circle',
  },
  {
    name: 'calendar',
    title: 'Calendrier',
    icon: 'calendar-outline',
    iconFocused: 'calendar',
  },
  {
    name: 'people',
    title: 'Personnes',
    icon: 'people-outline',
    iconFocused: 'people',
  },
  {
    name: 'pulse',
    title: 'Pulse',
    icon: 'pulse-outline',
    iconFocused: 'pulse',
  },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Surface.low,
          borderTopColor: Outline.variant,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 60 + insets.bottom : 64,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Primary.default,
        tabBarInactiveTintColor: OnSurface.disabled,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter-Medium',
          marginTop: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={focused ? 26 : 24}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
