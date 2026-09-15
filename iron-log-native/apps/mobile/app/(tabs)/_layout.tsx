import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { T, shadow } from '../../src/theme';

// expo-router v57 types the header/tab style options as Animated styles and the
// icon `color` as a nullable ColorValue; cast at these boundaries (runtime is
// unaffected).
const icon = (name: React.ComponentProps<typeof Ionicons>['name']) =>
  (p: { color: unknown; size: number }) =>
    <Ionicons name={name} color={p.color as string} size={p.size} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: T.bg } as any,
        headerTitleStyle: { color: T.text, fontFamily: 'Manrope_700Bold', fontWeight: '800' } as any,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: T.bg } as any,
        tabBarStyle: { backgroundColor: T.bgElev, borderTopColor: T.border, ...shadow } as any,
        tabBarActiveTintColor: T.gold,
        tabBarInactiveTintColor: T.textFaint,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', headerShown: false, tabBarIcon: icon('today-outline') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('stats-chart-outline') }} />
      <Tabs.Screen name="split" options={{ title: 'Split', tabBarIcon: icon('barbell-outline') }} />
      <Tabs.Screen name="people" options={{ title: 'People', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="ranks" options={{ title: 'Ranks', tabBarIcon: icon('trophy-outline') }} />
    </Tabs>
  );
}
