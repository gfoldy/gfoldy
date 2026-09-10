import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { T } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: T.bg },
        headerTitleStyle: { color: T.text, fontWeight: '800' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: T.bg },
        tabBarStyle: { backgroundColor: T.bgElev, borderTopColor: T.border },
        tabBarActiveTintColor: T.gold,
        tabBarInactiveTintColor: T.textFaint,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="split"
        options={{ title: 'Split', tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="people"
        options={{ title: 'People', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="ranks"
        options={{ title: 'Ranks', tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
