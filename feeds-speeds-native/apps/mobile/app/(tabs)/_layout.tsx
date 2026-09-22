import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { T, shadow } from '../../src/theme';

// expo-router v57 types the header/tab style options as Animated styles and the
// icon `color` as a nullable ColorValue; cast at these boundaries.
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
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.textFaint,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Calculator', headerShown: false, tabBarIcon: icon('calculator-outline') }} />
      <Tabs.Screen name="tools" options={{ title: 'My Tools', tabBarIcon: icon('construct-outline') }} />
      <Tabs.Screen name="reference" options={{ title: 'Reference', tabBarIcon: icon('book-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
